import React, { useState, useEffect, useMemo } from 'react';
import { FiPieChart, FiArrowUpCircle, FiArrowDownCircle, FiX } from 'react-icons/fi';
import LivePriceChart from '../../components/LivePriceChart/LivePriceChart';
import { useAuth } from '../../hooks/useAuth';
import { walletAPI, tradingAPI } from '../../services/api';
import cryptoWebSocket from '../../services/cryptoWebSocket';
import binanceAPI from '../../services/binanceAPI';
import './SpotTradingPage.css';

const SUPPORTED_PAIRS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin', icon: '₿', price: 0 },
  { symbol: 'ETH/USDT', name: 'Ethereum', icon: 'Ξ', price: 0 },
  { symbol: 'BNB/USDT', name: 'BNB', icon: '◇', price: 0 },
  { symbol: 'SOL/USDT', name: 'Solana', icon: '◎', price: 0 },
  { symbol: 'XRP/USDT', name: 'Ripple', icon: '✦', price: 0 },
  { symbol: 'ADA/USDT', name: 'Cardano', icon: '◈', price: 0 },
];

const formatNumber = (value, fractionDigits = 2) =>
  Number(value || 0).toLocaleString('vi-VN', {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  });

const resolveAssetSymbol = (symbol = '', pair = '') => {
  if (!symbol) return pair;
  if (symbol.includes('/')) return symbol;
  return `${symbol.toUpperCase()}/USDT`;
};

const matchesAssetSymbol = (symbol = '', base, pair) => {
  if (!symbol) return false;
  return symbol.toUpperCase() === base.toUpperCase() || symbol.toUpperCase() === pair.toUpperCase();
};

const SpotTradingPage = () => {
  const { userId } = useAuth();
  const [selectedPair, setSelectedPair] = useState(SUPPORTED_PAIRS[0].symbol);
  const [side, setSide] = useState('buy');
  const [amount, setAmount] = useState('');
  const [spotWalletId, setSpotWalletId] = useState(null);
  const [usdtBalance, setUsdtBalance] = useState(0);
  const [holdings, setHoldings] = useState([]);
  const [holdingsLoading, setHoldingsLoading] = useState(false);
  const [openOrders, setOpenOrders] = useState([]);
  const [priceTickers, setPriceTickers] = useState({});
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showAssets, setShowAssets] = useState(false);
  const [spotTab, setSpotTab] = useState('assets');

  const baseAsset = useMemo(() => selectedPair.split('/')[0], [selectedPair]);
  const selectedMeta = useMemo(
    () => SUPPORTED_PAIRS.find((pair) => pair.symbol === selectedPair),
    [selectedPair]
  );
  const activeTicker = priceTickers[selectedPair];
  const activePrice = activeTicker?.price || selectedMeta?.price || 0;
  const coinHolding = useMemo(
    () => holdings.find((asset) => matchesAssetSymbol(asset.symbol, baseAsset, selectedPair)),
    [holdings, baseAsset, selectedPair]
  );
  const coinBalance = coinHolding ? parseFloat(coinHolding.unit_number || 0) : 0;
  const estimatedCost = parseFloat(amount || 0) * activePrice;

  // Subscribe to Binance websocket streams once
  useEffect(() => {
    const unsubscribers = SUPPORTED_PAIRS.map(({ symbol }) => {
      const streamSymbol = symbol.replace('/', '').toUpperCase();
      return cryptoWebSocket.subscribe(streamSymbol, (ticker) => {
        setPriceTickers((prev) => ({
          ...prev,
          [symbol]: {
            price: ticker.price,
            change: ticker.change24h,
            changePercent: ticker.changePercent24h,
            high: ticker.high24h,
            low: ticker.low24h,
            volume: ticker.volume24h,
            timestamp: ticker.timestamp,
          },
        }));
      });
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, []);

  // Fetch initial prices so UI has data before websocket pushes
  useEffect(() => {
    let cancelled = false;
    const bootstrapPrices = async () => {
      try {
        const results = await Promise.all(
          SUPPORTED_PAIRS.map(async ({ symbol }) => {
            const apiSymbol = symbol.replace('/', '');
            const price = await binanceAPI.getCurrentPrice(apiSymbol);
            return { symbol, price };
          })
        );

        if (cancelled) return;
        setPriceTickers((prev) => {
          const next = { ...prev };
          results.forEach(({ symbol, price }) => {
            if (!price) return;
            next[symbol] = {
              ...(next[symbol] || {}),
              price,
            };
          });
          return next;
        });
      } catch (err) {
        console.error('Failed to bootstrap prices', err);
      }
    };

    bootstrapPrices();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadSpotHoldings = async (walletId) => {
    if (!walletId || !userId) return;
    try {
      setHoldingsLoading(true);
      const response = await walletAPI.getWalletWithProperties(userId, walletId);
      if (response.success && response.data) {
        setUsdtBalance(parseFloat(response.data.balance) || 0);
        setHoldings(response.data.properties || []);
      }
    } catch (err) {
      console.error('Failed to load holdings', err);
    } finally {
      setHoldingsLoading(false);
    }
  };

  const loadOpenOrders = async (walletId) => {
    if (!walletId || !userId) {
      setOpenOrders([]);
      return;
    }
    try {
      const response = await tradingAPI.getSpotHistory(userId, walletId);
      if (response.success && Array.isArray(response.data)) {
        setOpenOrders(response.data.slice(0, 5));
      } else {
        setOpenOrders([]);
      }
    } catch (err) {
      console.error('Failed to load spot history', err);
      setOpenOrders([]);
    }
  };

  const loadWallets = async () => {
    if (!userId) return;
    try {
      const response = await walletAPI.getWallets(userId);
      if (response.success && Array.isArray(response.data)) {
        const spotWallet = response.data.find((wallet) => wallet.type === 'spot');
        if (spotWallet) {
          setSpotWalletId(spotWallet.wallet_id);
          setUsdtBalance(parseFloat(spotWallet.balance) || 0);
          loadSpotHoldings(spotWallet.wallet_id);
          loadOpenOrders(spotWallet.wallet_id);
        } else {
          setSpotWalletId(null);
          setUsdtBalance(0);
          setHoldings([]);
          setOpenOrders([]);
        }
      }
    } catch (err) {
      console.error('Failed to load wallets', err);
      setError('Không thể tải dữ liệu ví Spot');
    }
  };

  useEffect(() => {
    loadWallets();
  }, [userId]);

  useEffect(() => {
    if (spotWalletId) {
      loadSpotHoldings(spotWalletId);
      loadOpenOrders(spotWalletId);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spotWalletId]);

  const handlePlaceOrder = async () => {
    if (!userId || !spotWalletId) {
      setError('Bạn chưa có ví Spot để giao dịch');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    if (!activePrice) {
      setError('Không thể lấy giá thị trường. Vui lòng thử lại');
      return;
    }

    if (side === 'buy' && estimatedCost > usdtBalance) {
      setError('Số dư USDT không đủ để mua');
      return;
    }

    if (side === 'sell' && parseFloat(amount) > coinBalance) {
      setError(`Bạn chỉ còn ${formatNumber(coinBalance)} ${baseAsset} để bán`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      const quantity = parseFloat(amount);
      const symbolToSend = baseAsset; // send base asset symbol (e.g., 'BTC') to match properties table
      if (side === 'buy') {
        await tradingAPI.spotBuy(userId, spotWalletId, symbolToSend, quantity, activePrice);
      } else {
        await tradingAPI.spotSell(userId, spotWalletId, symbolToSend, quantity, activePrice);
      }

      setSuccess(side === 'buy' ? 'Đặt lệnh mua thành công' : 'Đặt lệnh bán thành công');
      setAmount('');
      loadSpotHoldings(spotWalletId);
      loadOpenOrders(spotWalletId);
    } catch (err) {
      const msg = err?.message || err?.error || (err && typeof err === 'string' ? err : null) || 'Không thể thực hiện lệnh. Vui lòng thử lại';
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 4000);
    }
  };

  const renderOrderRow = (order) => {
    const side = order.side || order.type || 'buy';
    const typeLabel = side === 'buy' ? 'Mua' : 'Bán';
    const timestamp = order.created_at 
      ? new Date(order.created_at).toLocaleString('vi-VN') 
      : order.ts 
        ? new Date(order.ts).toLocaleString('vi-VN')
        : '--';
    const orderBase = order.symbol?.includes('/') ? order.symbol.split('/')[0] : order.symbol;
    const unitNumbers = order.unit_numbers || order.amount || 0;
    const price = order.index_price || order.price || 0;
    const totalAmount = order.amount_total || (unitNumbers * price);
    
    return (
      <div key={order.transaction_id || order.spot_transaction_id} className="order-history-row">
        <div style={{display: 'flex', alignItems: 'center', gap: '12px'}}>
          <span 
            className={`tag ${side}`}
            style={{
              background: side === 'buy' 
                ? 'linear-gradient(135deg, #10b981, #059669)' 
                : 'linear-gradient(135deg, #ef4444, #dc2626)',
              color: 'white',
              padding: '8px 16px',
              borderRadius: '6px',
              fontWeight: 700,
              fontSize: '14px',
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              boxShadow: side === 'buy' 
                ? '0 2px 8px rgba(16, 185, 129, 0.3)'
                : '0 2px 8px rgba(239, 68, 68, 0.3)'
            }}
          >
            {typeLabel}
          </span>
          <div>
            <p style={{fontSize: '16px', fontWeight: 700}}>{orderBase}</p>
            <p className="text-secondary" style={{fontSize: '13px'}}>Spot</p>
          </div>
        </div>
        <div>
          <p className="text-secondary" style={{fontSize: '12px'}}>Số lượng</p>
          <strong>
            {formatNumber(unitNumbers, 4)} {orderBase}
          </strong>
        </div>
        <div>
          <p className="text-secondary" style={{fontSize: '12px'}}>Giá</p>
          <strong>${formatNumber(price)}</strong>
        </div>
        <div>
          <p className="text-secondary" style={{fontSize: '12px'}}>Tổng tiền</p>
          <strong>{formatNumber(totalAmount, 2)} USDT</strong>
        </div>
        <div className="text-right">
          <p className="text-secondary" style={{fontSize: '12px'}}>Thời gian</p>
          <span className="text-secondary" style={{fontSize: '13px'}}>{timestamp}</span>
        </div>
      </div>
    );
  };

  const assetRows = holdings.map((asset) => {
    // Find icon
    const pairInfo = SUPPORTED_PAIRS.find(p => p.symbol.startsWith(asset.symbol + '/') || p.symbol === asset.symbol);
    const icon = pairInfo ? pairInfo.icon : (asset.symbol === 'USDT' ? '₮' : '○');

    // Find price
    let currentPrice = 0;
    if (asset.symbol === 'USDT') {
      currentPrice = 1;
    } else {
      const pairSymbol = `${asset.symbol}/USDT`;
      currentPrice = priceTickers[pairSymbol]?.price || 0;
    }

    const balance = parseFloat(asset.unit_number || 0);
    const value = currentPrice * balance;
    const avgPrice = parseFloat(asset.average_buy_price || 0);

    let pnl = 0;
    let pnlPercent = 0;

    if (asset.symbol !== 'USDT' && avgPrice > 0 && currentPrice > 0) {
      pnl = (currentPrice - avgPrice) * balance;
      pnlPercent = ((currentPrice - avgPrice) / avgPrice) * 100;
    }

    return (
      <div key={`${asset.wallet_id}-${asset.symbol}`} className="asset-row glass-effect">
        <div className="asset-col-left">
          <div className="asset-icon-wrapper">{icon}</div>
          <div className="asset-details">
            <div className="asset-symbol">{asset.symbol}</div>
            <div className="asset-avg-price">Avg: {formatNumber(avgPrice)}</div>
          </div>
        </div>

        <div className="asset-col-right">
          <div className="asset-balance">{formatNumber(balance, 6)}</div>
          <div className="asset-value-usdt">{value ? `≈ ${formatNumber(value)} USDT` : '--'}</div>
        </div>

        {asset.symbol !== 'USDT' && avgPrice > 0 && (
          <div className={`asset-pnl ${pnl >= 0 ? 'positive' : 'negative'}`}>
            <div className="pnl-value">{pnl >= 0 ? '+' : ''}{formatNumber(pnl)} $</div>
            <div className="pnl-percent">{pnl >= 0 ? '+' : ''}{formatNumber(pnlPercent)}%</div>
          </div>
        )}
      </div>
    );
  });

  // Removed - content moved to main layout

  return (
    <div className="spot-trading-page">
      {/* Toast Notifications */}
      {success && (
        <div className="toast-notification success">
          <div className="toast-content">
            <span className="toast-icon">✓</span>
            <span className="toast-message">{success}</span>
          </div>
        </div>
      )}
      {error && (
        <div className="toast-notification error">
          <div className="toast-content">
            <span className="toast-icon">⚠</span>
            <span className="toast-message">{error}</span>
          </div>
        </div>
      )}
      
      {/* Full-width trading layout so chart can stretch */}
      <div className="trading-full-width">
          <div className="coin-grid">
            {SUPPORTED_PAIRS.map((pair) => (
              <div
                key={pair.symbol}
                className={`coin-card ${selectedPair === pair.symbol ? 'active' : ''}`}
                onClick={() => setSelectedPair(pair.symbol)}
              >
                <h3>{pair.name}</h3>
                <p>{formatNumber(priceTickers[pair.symbol]?.price || 0)} USDT</p>
              </div>
            ))}
          </div>

          <div className="chart-wrapper" style={{ width: '100%' }}>
            <div className="chart-card" style={{ width: '100%', backgroundColor: '#000' }}>
              <LivePriceChart symbol={selectedPair.replace('/', '')} height={520} />
            </div>
          </div>

          <div className="order-panel-compact">{/* compact vertical order panel */}
            <div className="wallet-banner">
              <p className="text-secondary">Số dư khả dụng</p>
              {side === 'buy' ? (
                <h3 className="balance-value">{formatNumber(usdtBalance)} USDT</h3>
              ) : (
                <h3 className="balance-value">{formatNumber(coinBalance, 6)} {baseAsset}</h3>
              )}
            </div>

            <div className="side-switch-compact">
              <button
                className={`btn-buy ${side === 'buy' ? 'active' : ''}`}
                onClick={() => setSide('buy')}
              >
                Mua
              </button>
              <button
                className={`btn-sell ${side === 'sell' ? 'active' : ''}`}
                onClick={() => setSide('sell')}
              >
                Bán
              </button>
            </div>

            <div className="order-field">
              <label>Số lượng ({baseAsset})</label>
              <input
                type="number"
                min="0"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder={`Nhập số ${baseAsset}`}
              />
            </div>

            <div className="order-summary compact">
              <span>Giá hiện tại</span>
              <strong>${formatNumber(activePrice)}</strong>
            </div>

            <div className="order-summary compact">
              <span>Giá trị ước tính</span>
              <strong>{formatNumber(estimatedCost || 0)} USDT</strong>
            </div>

            <div className="balance-info-coin">
              <span className="text-secondary">Số dư {baseAsset}</span>
              <strong>{formatNumber(coinBalance, 6)} {baseAsset}</strong>
            </div>

            <button className="btn-trade btn-primary" onClick={handlePlaceOrder} disabled={loading}>
              {loading ? 'Đang xử lý...' : side === 'buy' ? 'Mua ngay' : 'Bán ngay'}
            </button>
          </div>

          {/* Tabs for assets and history below order panel */}
          <div className="asset-history-container">
            <div className="asset-tabs">
              <button className={spotTab === 'assets' ? 'active' : ''} onClick={() => setSpotTab('assets')}>Tài sản</button>
              <button className={spotTab === 'history' ? 'active' : ''} onClick={() => setSpotTab('history')}>Lịch sử</button>
            </div>

            {spotTab === 'assets' && (
              <div className="assets-list-card">
                {holdingsLoading ? (
                  <p className="text-secondary">Đang tải dữ liệu tài sản...</p>
                ) : holdings.length === 0 ? (
                  <p className="text-secondary">Không có tài sản nào trong ví Spot.</p>
                ) : (
                  <div className="asset-list">{assetRows}</div>
                )}
              </div>
            )}

            {spotTab === 'history' && (
              <div className="order-history-card glass-card">
                {openOrders.length === 0 ? (
                  <p className="text-secondary">Không có lịch sử giao dịch nào.</p>
                ) : (
                  <div className="order-history-list">
                    {openOrders.map((order) => renderOrderRow(order))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      }
      {/* Notifications */}
      {(success || error) && (
        <div className={`notification-toast ${success ? 'success' : 'error'}`}>
          {success ? <FiArrowUpCircle /> : <FiX />}
          <span>{success || error}</span>
          <button onClick={() => { setSuccess(null); setError(null); }}><FiX /></button>
        </div>
      )}
    </div>
  );
};

export default SpotTradingPage;
