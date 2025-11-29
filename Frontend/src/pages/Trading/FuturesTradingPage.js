import React, { useState, useEffect, useMemo, useRef } from 'react';
import { createPortal } from 'react-dom';
import { FiTrendingUp, FiAlertTriangle, FiArrowUpCircle, FiArrowDownCircle } from 'react-icons/fi';
import LivePriceChart from '../../components/LivePriceChart/LivePriceChart';
import { useAuth } from '../../hooks/useAuth';
import { walletAPI, tradingAPI } from '../../services/api';
import cryptoWebSocket from '../../services/cryptoWebSocket';
import binanceAPI from '../../services/binanceAPI';
import './FuturesTradingPage.css';

const SUPPORTED_PAIRS = [
  { symbol: 'BTC/USDT', name: 'Bitcoin' },
  { symbol: 'ETH/USDT', name: 'Ethereum' },
  { symbol: 'BNB/USDT', name: 'BNB' },
  { symbol: 'SOL/USDT', name: 'Solana' },
  { symbol: 'XRP/USDT', name: 'Ripple' },
  { symbol: 'ADA/USDT', name: 'Cardano' }
];

const MAX_LEVERAGE = 5;

const formatNumber = (value, digits = 2) =>
  Number(value || 0).toLocaleString('vi-VN', {
    minimumFractionDigits: digits,
    maximumFractionDigits: digits,
  });

const FuturesTradingPage = () => {
  const { userId } = useAuth();
  const [selectedPair, setSelectedPair] = useState(SUPPORTED_PAIRS[0].symbol);
  const [side, setSide] = useState('long');
  const [margin, setMargin] = useState('');
  const [leverage, setLeverage] = useState(2);
  const [futureWallet, setFutureWallet] = useState(null);
  const [priceTickers, setPriceTickers] = useState({});
  const [openPositions, setOpenPositions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [closingId, setClosingId] = useState(null);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [activeTab, setActiveTab] = useState('trading');
  const [futureHistory, setFutureHistory] = useState([]);
  // debug offset (px) to nudge the positions card left/right relative to sidebar
  // fixed default at +48 per request
  const [positionsOffset, setPositionsOffset] = useState(48);
  const positionsRef = useRef(null);

  const activeTicker = priceTickers[selectedPair];
  const activePrice = activeTicker?.price || 0;
  const walletBalance = parseFloat(futureWallet?.balance || 0);
  const positionPreview = margin && activePrice ? (parseFloat(margin) * leverage) / activePrice : 0;

  // Subscribe to websocket tickers
  useEffect(() => {
    const unsubscribers = SUPPORTED_PAIRS.map(({ symbol }) => {
      const normalized = symbol.replace('/', '').toUpperCase();
      return cryptoWebSocket.subscribe(normalized, (ticker) => {
        setPriceTickers((prev) => ({
          ...prev,
          [symbol]: {
            price: ticker.price,
            changePercent: ticker.changePercent24h,
            high: ticker.high24h,
            low: ticker.low24h,
            volume: ticker.volume24h,
          },
        }));
      });
    });

    return () => {
      unsubscribers.forEach((unsubscribe) => unsubscribe && unsubscribe());
    };
  }, []);

  // Bootstrap initial prices
  useEffect(() => {
    let cancelled = false;
    const fetchInitial = async () => {
      const prices = await Promise.all(
        SUPPORTED_PAIRS.map(async ({ symbol }) => {
          const res = await binanceAPI.getCurrentPrice(symbol.replace('/', ''));
          return { symbol, price: res };
        })
      );
      if (cancelled) return;
      setPriceTickers((prev) => {
        const next = { ...prev };
        prices.forEach(({ symbol, price }) => {
          if (price) {
            next[symbol] = { ...(next[symbol] || {}), price };
          }
        });
        return next;
      });
    };

    fetchInitial();
    return () => {
      cancelled = true;
    };
  }, []);

  const loadFutureWallet = async () => {
    if (!userId) return;
    try {
      const response = await walletAPI.getWalletByType(userId, 'future');
      if (response.success && response.data) {
        setFutureWallet(response.data);
      } else {
        setFutureWallet(null);
      }
    } catch (err) {
      console.error('Failed to load future wallet', err);
      setFutureWallet(null);
    }
  };

  const createFutureWallet = async () => {
    if (!userId) {
      setError('Bạn cần đăng nhập để tạo ví Futures');
      return;
    }
    try {
      setLoading(true);
      const res = await walletAPI.createWallet(userId, 'future');
      if (res && res.success && res.data) {
        await loadFutureWallet();
        setSuccess('Đã tạo ví Futures');
      } else {
        setError(res?.message || 'Không thể tạo ví Futures');
      }
    } catch (e) {
      console.error('Failed to create future wallet', e);
      setError('Lỗi khi tạo ví Futures');
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3000);
    }
  };

  const loadOpenPositions = async () => {
    if (!userId) return;
    try {
      const response = await tradingAPI.getOpenFutures(userId);
      if (response.success && Array.isArray(response.data)) {
        // Normalize numeric fields and compute position_size when missing
        const normalized = response.data.map((order) => {
          const entry_price = parseFloat(order.entry_price || 0);
          const marginAmt = parseFloat(order.margin || 0);
          const lev = parseInt(order.leverage || leverage) || leverage;
          const position_size = parseFloat(order.position_size) || (marginAmt * lev);
          return { ...order, entry_price, margin: marginAmt, leverage: lev, position_size };
        });
        setOpenPositions(normalized);
      } else {
        setOpenPositions([]);
      }
    } catch (err) {
      console.error('Failed to load futures orders', err);
      setOpenPositions([]);
    }
  };

  useEffect(() => {
    loadFutureWallet();
    loadOpenPositions();
    // also load history when wallet available
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    const loadHistory = async () => {
      if (!futureWallet || !userId) return;
      try {
        const res = await tradingAPI.getFutureHistory(userId, futureWallet.wallet_id);
        if (res && res.success && Array.isArray(res.data)) {
          setFutureHistory(res.data);
        } else if (Array.isArray(res)) {
          setFutureHistory(res);
        } else {
          setFutureHistory([]);
        }
      } catch (err) {
        console.error('Failed to load future history', err);
        setFutureHistory([]);
      }
    };

    loadHistory();
  }, [futureWallet, userId]);

  const handleSubmit = async () => {
    if (!futureWallet) {
      setError('Bạn chưa có ví Futures để giao dịch');
      return;
    }

    if (!margin || parseFloat(margin) <= 0) {
      setError('Vui lòng nhập số tiền ký quỹ hợp lệ');
      return;
    }

    if (!activePrice) {
      setError('Không thể lấy giá thị trường');
      return;
    }

    if (parseFloat(margin) > walletBalance) {
      setError('Số dư Futures không đủ');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      // send base asset symbol (e.g. 'BTC') to match properties table
      const symbolToSend = selectedPair.includes('/') ? selectedPair.split('/')[0] : selectedPair;
      const res = await tradingAPI.openFuturePosition({
        userId,
        walletId: futureWallet.wallet_id,
        symbol: symbolToSend,
        side,
        margin: parseFloat(margin),
        entryPrice: activePrice,
        leverage,
      });
      console.log('openFuturePosition response', res);

      setSuccess('Đã mở vị thế thành công');
      setMargin('');
      await loadFutureWallet();
      await loadOpenPositions();
    } catch (err) {
      console.error('Open future error:', err);
      const msg = err?.message || err?.error || (err && typeof err === 'string' ? err : null) || 'Không thể mở vị thế';
      setError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => setSuccess(null), 3500);
    }
  };

  const handleClosePosition = async (order) => {
    const markPrice = priceTickers[order.symbol]?.price;
    if (!markPrice) {
      setError('Không thể lấy giá mark để đóng lệnh');
      return;
    }
    try {
      setClosingId(order.future_order_id);
      await tradingAPI.closeFuturePosition({
        orderId: order.future_order_id,
        userId,
        exitPrice: markPrice,
      });
      setSuccess('Đã đóng vị thế');
      await loadFutureWallet();
      await loadOpenPositions();
    } catch (err) {
      setError(err?.message || 'Không thể đóng vị thế');
    } finally {
      setClosingId(null);
      setTimeout(() => setSuccess(null), 3500);
    }
  };

  const calculatePnL = (order) => {
    // Find a matching ticker key for the order symbol (e.g. order.symbol='BTC' -> 'BTC/USDT')
    const findPairKey = () => {
      const found = SUPPORTED_PAIRS.find(p => p.symbol.split('/')[0] === order.symbol);
      return found ? found.symbol : `${order.symbol}/USDT`;
    };

    const pairKey = findPairKey();
    const markPrice = priceTickers[pairKey]?.price;
    if (!markPrice) return { pnl: 0, pnlPercent: 0 };

    const entry = parseFloat(order.entry_price || 0);
    const size = parseFloat(order.position_size || 0);
    const marginAmount = parseFloat(order.margin || 0);

    // Profit formula per spec:
    // For long: profit = ((markPrice - entry) / entry) * size
    // For short: profit = ((entry - markPrice) / entry) * size
    let profit = 0;
    if (entry > 0) {
      if (order.side === 'long') {
        profit = ((markPrice - entry) / entry) * size;
      } else {
        profit = ((entry - markPrice) / entry) * size;
      }
    }
    const pnlPercent = marginAmount ? (profit / marginAmount) * 100 : 0;
    return { pnl: profit, pnlPercent };
  };

  const pendingPositions = openPositions.map((order) => {
    const { pnl, pnlPercent } = calculatePnL(order);
    return { ...order, pnl, pnlPercent };
  });

  // Set inline styles on the positions panel at runtime based on real sidebar position.
  useEffect(() => {
    const el = positionsRef.current;
    if (!el) return;

    const update = () => {
      try {
        const sidebar = document.querySelector('.sidebar');
        const sidebarRect = sidebar ? sidebar.getBoundingClientRect() : null;
        const sidebarRight = sidebarRect ? Math.round(sidebarRect.right) : 250; // fallback
        const offset = Number(positionsOffset) || 0;
        const leftPx = sidebarRight + offset;
        // Compute top based on tabs/header so the panel does not cover top tabs
        const tabsEl = document.querySelector('.tabs') || document.querySelector('.trading-pair-header') || document.querySelector('header');
        const tabsRect = tabsEl ? tabsEl.getBoundingClientRect() : null;
        const topPx = tabsRect ? Math.ceil(tabsRect.bottom) + 12 : 110; // dynamic top offset
        const rightGap = 24;

        el.style.setProperty('position', 'fixed', 'important');
        el.style.setProperty('left', `${leftPx}px`, 'important');
        el.style.setProperty('top', `${topPx}px`, 'important');
        // set right gap instead of explicit width so the card stretches to fill available space
        el.style.setProperty('right', `${rightGap}px`, 'important');
        el.style.setProperty('z-index', '9999', 'important');
        // set a height and allow internal scrolling so user can scroll through old positions
        const bottomGap = 24;
        const heightPx = Math.max(window.innerHeight - topPx - bottomGap, 200);
        el.style.setProperty('height', `${heightPx}px`, 'important');
        el.style.setProperty('overflow-y', 'auto', 'important');
        el.style.setProperty('overflow-x', 'hidden', 'important');
      } catch (e) {
        // ignore
      }
    };

    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, [positionsOffset, activeTab]);

  // coin-grid will be positioned inside the chart card (CSS handles positioning)

  const CoinGridPortal = ({ pairs, selectedPair, onSelect, priceTickers }) => {
    const portalRef = useRef(null);

    useEffect(() => {
      const container = document.createElement('div');
      container.className = 'coin-grid-portal';
      // container styles (left/top/width applied dynamically)
      container.style.position = 'fixed';
      // Let pointer events pass through the container so page/chart can be scrolled.
      // Individual `.coin-card` elements remain clickable via CSS (.coin-card { pointer-events: auto }).
      container.style.pointerEvents = 'none';
      container.style.zIndex = '60';
      document.body.appendChild(container);
      portalRef.current = container;

      // portal container should not intercept pointer events by default

      const update = () => {
        try {
          const chartEl = document.querySelector('.trading-full-width .chart-card');
          const tabsEl = document.querySelector('.tabs') || document.querySelector('.trading-pair-header') || document.querySelector('header');
          const tabsRect = tabsEl ? tabsEl.getBoundingClientRect() : null;
          const topFromTabs = tabsRect ? Math.ceil(tabsRect.bottom) + 12 : 90;
          if (chartEl) {
            const r = chartEl.getBoundingClientRect();
            const left = Math.max(Math.round(r.left + 12), 12);
            const width = Math.max(Math.round(r.width - 24), 280);
            const top = Math.max(Math.round(r.top + 12), topFromTabs);
            container.style.left = `${left}px`;
            container.style.top = `${top}px`;
            container.style.width = `${width}px`;
          }
        } catch (e) {
          // ignore
        }
      };

      // do not add wheel/touch listeners here; use CSS pointer-events so scroll passes through

      update();
      window.addEventListener('resize', update);
      window.addEventListener('scroll', update, true);
      return () => {
        window.removeEventListener('resize', update);
        window.removeEventListener('scroll', update, true);
        // No wheel/touch listeners were attached; avoid referencing undefined handlers
        try {
          if (portalRef.current) document.body.removeChild(portalRef.current);
        } catch (e) {
          // ignore
        }
      };
    }, []);

    if (!portalRef.current) return null;

    return createPortal(
      <div className="coin-grid">
        {pairs.map((pair) => (
          <div
            key={pair.symbol}
            className={`coin-card ${selectedPair === pair.symbol ? 'active' : ''}`}
            onClick={() => onSelect(pair.symbol)}
          >
            <h3>{pair.name}</h3>
            <p>{formatNumber(priceTickers[pair.symbol]?.price || 0)} USDT</p>
          </div>
        ))}
      </div>,
      portalRef.current
    );
  };

  return (
    <div className="futures-trading-page">
      <div className="tabs">
        <button className={activeTab === 'trading' ? 'active' : ''} onClick={() => setActiveTab('trading')}>Giao dịch</button>
        <button className={activeTab === 'positions' ? 'active' : ''} onClick={() => setActiveTab('positions')}>Lệnh đang mở</button>
        <button className={activeTab === 'history' ? 'active' : ''} onClick={() => setActiveTab('history')}>Lịch sử</button>
      </div>

      {activeTab === 'trading' ? (
        <div className="trading-full-width">
          <div className="chart-card" style={{ width: '100%', backgroundColor: '#000' }}>
            <LivePriceChart symbol={selectedPair.replace('/', '')} height={520} />
          </div>
          {/* Render coin selector into a portal so it doesn't get trapped by stacking contexts */}
          {activeTab === 'trading' && (
            <CoinGridPortal
              pairs={SUPPORTED_PAIRS}
              selectedPair={selectedPair}
              onSelect={(s) => setSelectedPair(s)}
              priceTickers={priceTickers}
            />
          )}

          <div className="order-panel-compact">
            <div className="wallet-banner">
              <p className="text-secondary">Số dư khả dụng</p>
              {futureWallet ? (
                <>
                  <h3 className="balance-value">{formatNumber(walletBalance)} USDT</h3>
                  <span className="badge">Đòn bẩy {leverage}x</span>
                </>
              ) : (
                <>
                  <h3 className="balance-value">--</h3>
                  <p className="text-secondary">Chưa có ví Futures</p>
                </>
              )}
            </div>

            <div className="side-switch-compact">
              <button
                className={`btn-buy ${side === 'long' ? 'active' : ''}`}
                onClick={() => setSide('long')}
              >
                Long
              </button>
              <button
                className={`btn-sell ${side === 'short' ? 'active' : ''}`}
                onClick={() => setSide('short')}
              >
                Short
              </button>
            </div>

            <div className="order-field">
              <label>Ký quỹ (USDT)</label>
              <input
                type="number"
                value={margin}
                onChange={(e) => setMargin(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleSubmit();
                  }
                }}
              />
            </div>

            <div className="lever-field">
              <label>Đòn bẩy: <strong>{leverage}x</strong></label>
              <input type="range" min="1" max={MAX_LEVERAGE} value={leverage} onChange={(e) => setLeverage(Number(e.target.value))} />
            </div>

            <div className="order-summary compact">
              <span>Vị thế ước tính</span>
              <strong>{formatNumber(positionPreview || 0)} {selectedPair.split('/')[0]}</strong>
            </div>

            {!futureWallet ? (
              <button className="btn-trade btn-primary" onClick={createFutureWallet} disabled={loading}>
                {loading ? 'Đang xử lý...' : 'Tạo ví Futures'}
              </button>
            ) : (
              <button className="btn-trade btn-primary" onClick={handleSubmit} disabled={loading}>
                {loading ? 'Đang tạo lệnh...' : 'Mở vị thế'}
              </button>
            )}
          </div>
        </div>
      ) : (
        <div className="tab-content">
          {activeTab === 'positions' && (
            <div
              ref={positionsRef}
              className="positions-list glass-card fixed-left"
            >
              <div className="card-header">
                <h3>Lệnh đang mở</h3>
                <div style={{ color: 'var(--text-secondary)', fontSize: 12 }}>Offset: +48 (fixed)</div>
              </div>
              {openPositions.length === 0 ? (
                <p className="text-secondary">Chưa có vị thế Futures nào</p>
              ) : (
                <div className="positions-grid">
                  <div className="positions-strip" style={{ minWidth: '900px' }}>
                    {pendingPositions.map((order) => (
                      <div key={order.future_order_id} className="position-row">
                        <div className="position-cell symbol">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                            <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                              <span className={`tag ${order.side === 'long' ? 'buy' : 'sell'}`}>
                                {order.side === 'long' ? 'Long' : 'Short'}
                              </span>
                              <span className="cell-value">{order.symbol}</span>
                            </div>
                            <div className="opened-sub" style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                              <div style={{ fontWeight: 600, marginBottom: 6 }}>Opened</div>
                              <div>{order.open_ts ? new Date(order.open_ts).toLocaleString('vi-VN') : '--'}</div>
                            </div>
                          </div>
                        </div>


                        <div className="position-cell entry">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="cell-label">Entry</div>
                            <div className="cell-value">${formatNumber(order.entry_price)}</div>
                            <div style={{ height: 6 }} />
                            <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>Kích thước</div>
                            <div style={{ fontWeight: 700 }}>{formatNumber(order.position_size, 4)}</div>
                          </div>
                        </div>

                        <div className="position-cell leverage">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                            <div className="cell-label">Đòn bẩy</div>
                            <div className="cell-value">{order.leverage ? `${order.leverage}x` : '--'}</div>
                            <div style={{ height: 6 }} />
                            <div className="cell-label">Ký quỹ</div>
                            <div className="cell-value">{order.margin ? `${formatNumber(order.margin, 2)} USDT` : '--'}</div>
                          </div>
                        </div>

                        {/* opened moved into symbol cell above */}

                        <div className="position-cell profit">
                          <div style={{ display: 'flex', flexDirection: 'column', gap: 8, alignItems: 'flex-end' }}>
                            <div>
                              <div className="cell-label">Profit</div>
                              {(() => {
                                const { pnl, pnlPercent } = calculatePnL(order);
                                const color = pnl > 0 ? 'var(--success-color)' : pnl < 0 ? 'var(--danger-color)' : 'inherit';
                                return (
                                  <div style={{ display: 'flex', flexDirection: 'row', gap: 8, alignItems: 'center', justifyContent: 'flex-end' }}>
                                    <strong style={{ color }}>{pnl ? `${formatNumber(pnl, 2)} USDT` : '0.00 USDT'}</strong>
                                    <span className="text-secondary" style={{ fontSize: 12, color }}>{pnlPercent ? `${formatNumber(pnlPercent, 2)}%` : ''}</span>
                                  </div>
                                );
                              })()}
                            </div>
                            <div>
                              <button className="btn btn-danger" onClick={() => handleClosePosition(order)} disabled={closingId === order.future_order_id}>
                                {closingId === order.future_order_id ? 'Đang đóng...' : 'Đóng vị thế'}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {activeTab === 'history' && (
            <div className="order-history-card glass-card">
              <div className="card-header"><h3>Lịch sử Futures</h3></div>
              {futureHistory.length === 0 ? (
                <p className="text-secondary">Chưa có lịch sử Futures nào</p>
              ) : (
                <div className="order-history-list">
                  {futureHistory.map((order) => (
                    <div key={order.future_order_id} className="order-history-row">
                      <div>
                        <span className={`tag ${order.side === 'long' ? 'buy' : 'sell'}`}>{order.side === 'long' ? 'Long' : 'Short'}</span>
                        <p>{order.symbol}</p>
                      </div>
                      <div>
                        <strong>{formatNumber(order.position_size, 4)}</strong>
                        <p className="text-secondary">Entry @ {formatNumber(order.entry_price)}</p>
                      </div>
                      <div className="text-right">
                        <span className="text-secondary">{order.open_ts ? new Date(order.open_ts).toLocaleString('vi-VN') : '--'}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}
      {/* Notifications */}
      {(success || error) && (
        <div className={`notification-toast ${success ? 'success' : 'error'}`}>
          {success ? <FiTrendingUp /> : <FiAlertTriangle />}
          <span>{success || error}</span>
          <button onClick={() => { setSuccess(null); setError(null); }}>x</button>
        </div>
      )}
    </div>
  );
};

export default FuturesTradingPage;

