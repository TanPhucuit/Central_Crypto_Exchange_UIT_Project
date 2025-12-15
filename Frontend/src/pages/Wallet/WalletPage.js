import React, { useState, useEffect, useMemo } from 'react';
import { FiSend, FiArrowRightCircle, FiClock, FiTrendingUp, FiTrendingDown, FiDollarSign } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { walletAPI, tradingAPI } from '../../services/api';
import cryptoWebSocket from '../../services/cryptoWebSocket';
import binanceAPI from '../../services/binanceAPI';
import APITester from '../../components/APITester/APITester';
import './WalletPage.css';

const WalletPage = () => {
  const { userId } = useAuth();
  const [wallets, setWallets] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [spotWalletId, setSpotWalletId] = useState(null);
  const [holdings, setHoldings] = useState([]);
  const [priceTickers, setPriceTickers] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Transfer Modal State
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [transferData, setTransferData] = useState({
    fromType: 'spot',
    toType: 'future',
    amount: '',
    note: ''
  });
  const [transferLoading, setTransferLoading] = useState(false);
  const [transferMessage, setTransferMessage] = useState({ type: '', text: '' });

  // Toast notification state
  const [toast, setToast] = useState({ show: false, message: '', type: '' });

  // Icon mapping for different crypto symbols
  const iconMap = {
    BTC: '₿',
    ETH: 'Ξ',
    USDT: '₮',
    BNB: 'BNB',
    SOL: 'SOL',
    XRP: 'XRP',
    ADA: 'ADA',
    DOT: 'DOT',
    DOGE: 'Ð',
    AVAX: 'AVAX',
    LTC: 'Ł',
  };

  const formatNumber = (value, fractionDigits = 2) =>
    Number(value || 0).toLocaleString('en-US', {
      minimumFractionDigits: fractionDigits,
      maximumFractionDigits: fractionDigits,
    });

  // Load wallet data on mount
  useEffect(() => {
    if (userId) {
      loadWalletData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (userId && spotWalletId) {
      loadTransactions(spotWalletId);
      loadSpotHoldings(spotWalletId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId, spotWalletId]);

  // Subscribe to WebSocket for held assets
  useEffect(() => {
    if (holdings.length === 0) return;

    const symbolsToSubscribe = holdings
      .map(h => h.symbol)
      .filter(s => s !== 'USDT')
      .map(s => `${s}USDT`);

    // Fetch initial prices
    const fetchInitialPrices = async () => {
      try {
        const results = await Promise.all(
          symbolsToSubscribe.map(async (symbol) => {
            const price = await binanceAPI.getCurrentPrice(symbol);
            return { symbol, price };
          })
        );

        setPriceTickers(prev => {
          const next = { ...prev };
          results.forEach(({ symbol, price }) => {
            if (price) next[symbol] = { price: parseFloat(price) };
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to fetch initial prices', err);
      }
    };

    fetchInitialPrices();

    // Subscribe WS
    const unsubscribers = symbolsToSubscribe.map(symbol => {
      return cryptoWebSocket.subscribe(symbol, (ticker) => {
        setPriceTickers(prev => ({
          ...prev,
          [symbol]: {
            price: parseFloat(ticker.price),
            change: parseFloat(ticker.change24h),
            changePercent: parseFloat(ticker.changePercent24h),
          }
        }));
      });
    });

    return () => {
      unsubscribers.forEach(unsub => unsub && unsub());
    };
  }, [holdings]);

  const loadWalletData = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await walletAPI.getWallets(userId);

      if (response.success && response.data) {
        const spotWallet = response.data.find((wallet) => wallet.type === 'spot');
        setSpotWalletId(spotWallet?.wallet_id || null);

        const formattedWallets = response.data.map((wallet) => {
          const symbol =
            wallet.type === 'spot'
              ? 'USDT'
              : wallet.symbol || (wallet.type ? wallet.type.toUpperCase() : 'WALLET');
          const balance = parseFloat(wallet.balance) || 0;

          return {
            symbol,
            name: symbol,
            balance,
            usdValue: balance, // Initial value, will be updated with total assets calculation
            icon: iconMap[symbol] || symbol.charAt(0),
            wallet_id: wallet.wallet_id,
            type: wallet.type
          };
        });

        setWallets(formattedWallets);
      }
    } catch (err) {
      console.error('Error loading wallets:', err);
      setError(err.message || 'Không thể tải dữ liệu ví');
    } finally {
      setLoading(false);
    }
  };

  const loadSpotHoldings = async (walletId) => {
    try {
      const response = await walletAPI.getWalletWithProperties(userId, walletId);
      if (response.success && response.data) {
        // Filter out USDT from properties list as it's the base currency
        const props = (response.data.properties || []).filter(p => p.symbol !== 'USDT');
        setHoldings(props);
      }
    } catch (err) {
      console.error('Error loading spot holdings:', err);
    }
  };

  const loadTransactions = async (walletId) => {
    if (!walletId) {
      setTransactions([]);
      return;
    }

    try {
      const response = await tradingAPI.getSpotHistory(userId, walletId);

      if (response.success && response.data) {
        const formattedTransactions = response.data.map(tx => ({
          type: tx.side === 'buy' ? 'deposit' : 'withdraw', // Mapping buy/sell to deposit/withdraw for visual simplicity or keep as buy/sell
          side: tx.side,
          symbol: tx.symbol ? tx.symbol.split('/')[0] : 'N/A',
          amount: parseFloat(tx.amount) || 0,
          price: parseFloat(tx.price) || 0,
          time: new Date(tx.timestamp).toLocaleString('vi-VN'),
          status: 'completed',
          transaction_id: tx.transaction_id,
        }));
        setTransactions(formattedTransactions);
      }
    } catch (err) {
      console.error('Error loading transactions:', err);
    }
  };

  // Calculate Total Assets Value
  const totalAssetsValue = useMemo(() => {
    let total = 0;

    // Add USDT balance
    const usdtWallet = wallets.find(w => w.symbol === 'USDT');
    if (usdtWallet) total += usdtWallet.balance;

    // Add Futures balance (assuming 1:1 for now, or fetch if needed)
    const futureWallet = wallets.find(w => w.type === 'future');
    if (futureWallet) total += futureWallet.balance;

    // Add Spot Holdings Value
    holdings.forEach(asset => {
      const pair = `${asset.symbol}USDT`;
      const price = priceTickers[pair]?.price || 0; // Fallback to 0 if no price yet
      // If no live price, try to use average_buy_price as fallback approximation? No, better 0 to avoid misleading.
      // Actually, for total assets, we should use current market value.
      total += (parseFloat(asset.unit_number) * price);
    });

    return total;
    return total;
  }, [wallets, holdings, priceTickers]);

  const handleTransferSubmit = async (e) => {
    e.preventDefault();
    if (!transferData.amount || parseFloat(transferData.amount) <= 0) {
      setTransferMessage({ type: 'error', text: 'Vui lòng nhập số tiền hợp lệ' });
      return;
    }

    try {
      setTransferLoading(true);
      setTransferMessage({ type: '', text: '' });

      const response = await walletAPI.internalTransfer(userId, {
        fromType: transferData.fromType,
        toType: transferData.toType,
        amount: parseFloat(transferData.amount),
        note: transferData.note
      });

      if (response.success) {
        setTransferMessage({ type: 'success', text: 'Chuyển khoản thành công!' });
        setToast({ show: true, message: 'Chuyển khoản thành công!', type: 'success' });
        setTimeout(() => {
          setShowTransferModal(false);
          setTransferMessage({ type: '', text: '' });
          setTransferData({ ...transferData, amount: '', note: '' });
          loadWalletData(); // Reload balances
          setToast({ show: false, message: '', type: '' });
        }, 3000);
      }
    } catch (err) {
      const errorMsg = err.message || 'Chuyển khoản thất bại';
      setTransferMessage({ type: 'error', text: errorMsg });
      setToast({ show: true, message: errorMsg, type: 'error' });
      setTimeout(() => {
        setToast({ show: false, message: '', type: '' });
      }, 3000);
    } finally {
      setTransferLoading(false);
    }
  };

  const switchTransferDirection = () => {
    setTransferData(prev => ({
      ...prev,
      fromType: prev.toType,
      toType: prev.fromType
    }));
  };

  return (
    <div className="wallet-page">
      <div className="page-header">
        <h1>Ví của tôi</h1>
        <p className="text-secondary">Quản lý tài sản và giao dịch</p>
      </div>

      {loading && (
        <div className="loading-message">
          <div className="spinner"></div>
          <p>Đang tải dữ liệu ví...</p>
        </div>
      )}

      {error && (
        <div className="error-message">
          <p>⚠️ {error}</p>
          <button className="btn btn-primary" onClick={loadWalletData}>
            Thử lại
          </button>

          {/* API Connection Tester for debugging */}
          <div style={{ marginTop: '24px' }}>
            <APITester />
          </div>
        </div>
      )}

      {!loading && !error && (
        <>
          <div className="wallet-hero">
            <div className="wallet-hero-info">
              <span className="eyebrow">Tổng tài sản ước tính</span>
              <h2>${formatNumber(totalAssetsValue)} <span className="currency">USDT</span></h2>
              <p className="hero-subtitle">
                {wallets.length > 0 ? `${wallets.length} ví đang hoạt động` : 'Chưa có ví nào được tạo'}
              </p>
              <div className="wallet-stat-row">
                <div>
                  <span className="stat-label">Ví Spot (USDT)</span>
                  <strong>{formatNumber(wallets.find(w => w.symbol === 'USDT')?.balance)}</strong>
                </div>
                <div>
                  <span className="stat-label">Ví Futures</span>
                  <strong>{formatNumber(wallets.find(w => w.type === 'future')?.balance)}</strong>
                </div>
              </div>
            </div>
            <div className="wallet-hero-actions">
              <button className="action-chip">
                <FiArrowRightCircle /> Nạp tiền
              </button>
              <button className="action-chip">
                <FiSend /> Rút tiền
              </button>
              <button className="action-chip">
                <FiSend /> Rút tiền
              </button>
              <button className="action-chip ghost" onClick={() => setShowTransferModal(true)}>
                <FiClock /> Chuyển nội bộ
              </button>
            </div>
          </div>

          <div className="wallet-layout">
            <div className="wallet-assets-panel full-width">
              <div className="panel-header">
                <div>
                  <h3>Danh mục Spot</h3>
                  <p className="panel-sub">Tài sản Crypto đang nắm giữ</p>
                </div>
              </div>

              <div className="asset-table-container">
                <table className="asset-table">
                  <thead>
                    <tr>
                      <th>Tài sản</th>
                      <th className="text-right">Số lượng</th>
                      <th className="text-right">Giá TB</th>
                      <th className="text-right">Giá hiện tại</th>
                      <th className="text-right">Giá trị (USDT)</th>
                      <th className="text-right">Lãi/Lỗ (PnL)</th>
                    </tr>
                  </thead>
                  <tbody>
                    {holdings.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="empty-state">Chưa có tài sản nào</td>
                      </tr>
                    ) : (
                      holdings.map((asset) => {
                        const pair = `${asset.symbol}USDT`;
                        const currentPrice = priceTickers[pair]?.price || 0;
                        const avgPrice = parseFloat(asset.average_buy_price || 0);
                        const balance = parseFloat(asset.unit_number || 0);
                        const value = balance * currentPrice;

                        // PnL Calculation
                        const pnl = (currentPrice - avgPrice) * balance;
                        const pnlPercent = avgPrice > 0 ? ((currentPrice - avgPrice) / avgPrice) * 100 : 0;
                        const isPositive = pnl >= 0;

                        return (
                          <tr key={asset.symbol}>
                            <td className="asset-cell">
                              <div className="asset-icon-wrapper">
                                {iconMap[asset.symbol] || asset.symbol.charAt(0)}
                              </div>
                              <div className="asset-info">
                                <span className="asset-symbol">{asset.symbol}</span>
                                <span className="asset-name">{asset.symbol} Token</span>
                              </div>
                            </td>
                            <td className="text-right font-mono">{formatNumber(balance, 6)}</td>
                            <td className="text-right font-mono">${formatNumber(avgPrice)}</td>
                            <td className="text-right font-mono">
                              {currentPrice > 0 ? `$${formatNumber(currentPrice)}` : <span className="loading-dots">...</span>}
                            </td>
                            <td className="text-right font-mono font-bold">${formatNumber(value)}</td>
                            <td className="text-right">
                              <div className={`pnl-badge ${isPositive ? 'positive' : 'negative'}`}>
                                {isPositive ? <FiTrendingUp /> : <FiTrendingDown />}
                                <span>${formatNumber(Math.abs(pnl))} ({formatNumber(pnlPercent)}%)</span>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>



            <div className="transactions-panel full-width">
              <div className="panel-header">
                <div>
                  <h3>Lịch sử giao dịch Spot</h3>
                </div>
              </div>
              <div className="transactions-table-container">
                <table className="transactions-table">
                  <thead>
                    <tr>
                      <th>Loại</th>
                      <th>Cặp</th>
                      <th>Giá</th>
                      <th>Số lượng</th>
                      <th>Tổng</th>
                      <th>Thời gian</th>
                    </tr>
                  </thead>
                  <tbody>
                    {transactions.length === 0 ? (
                      <tr><td colSpan="6" className="empty-state">Chưa có giao dịch nào</td></tr>
                    ) : (
                      transactions.map(tx => (
                        <tr key={tx.transaction_id}>
                          <td>
                            <span className={`badge ${tx.side === 'buy' ? 'badge-success' : 'badge-danger'}`}>
                              {tx.side === 'buy' ? 'Mua' : 'Bán'}
                            </span>
                          </td>
                          <td>{tx.symbol}/USDT</td>
                          <td>${formatNumber(tx.price)}</td>
                          <td>{formatNumber(tx.amount, 6)}</td>
                          <td>${formatNumber(tx.price * tx.amount)}</td>
                          <td className="text-secondary">{tx.time}</td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div >
        </>
      )}

      {/* Internal Transfer Modal */}
      {
        showTransferModal && (
          <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
            <div className="modal-content glass-card" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Chuyển khoản nội bộ</h3>
                <button className="modal-close" onClick={() => setShowTransferModal(false)}>x</button>
              </div>

              <form onSubmit={handleTransferSubmit} className="transfer-form">
                {transferMessage.text && (
                  <div className={`alert alert-${transferMessage.type}`}>
                    {transferMessage.text}
                  </div>
                )}

                <div className="transfer-direction">
                  <div className={`direction-box ${transferData.fromType}`}>
                    <label>Từ</label>
                    <div className="wallet-type-label">
                      {transferData.fromType === 'spot' ? 'Ví Spot' : 'Ví Futures'}
                    </div>
                    <div className="wallet-balance-mini">
                      Khả dụng: {formatNumber(wallets.find(w => w.type === transferData.fromType)?.balance)} USDT
                    </div>
                  </div>

                  <div className="direction-arrow" onClick={switchTransferDirection}>
                    <FiArrowRightCircle />
                  </div>

                  <div className={`direction-box ${transferData.toType}`}>
                    <label>Đến</label>
                    <div className="wallet-type-label">
                      {transferData.toType === 'spot' ? 'Ví Spot' : 'Ví Futures'}
                    </div>
                  </div>
                </div>

                <div className="form-group">
                  <label>Số lượng (USDT)</label>
                  <div className="input-group">
                    <input
                      type="number"
                      className="form-input"
                      placeholder="0.00"
                      value={transferData.amount}
                      onChange={e => setTransferData({ ...transferData, amount: e.target.value })}
                      min="0"
                      step="0.01"
                    />
                    <span className="input-suffix">USDT</span>
                  </div>
                </div>

                <div className="modal-actions">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>Hủy</button>
                  <button type="submit" className="btn btn-primary" disabled={transferLoading}>
                    {transferLoading ? 'Đang xử lý...' : 'Xác nhận chuyển'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )
      }

      {/* Toast Notification */}
      {toast.show && (
        <div className={`toast-notification ${toast.type}`}>
          <div className="toast-content">
            <span>{toast.message}</span>
          </div>
        </div>
      )}
    </div >
  );
};

export default WalletPage;
