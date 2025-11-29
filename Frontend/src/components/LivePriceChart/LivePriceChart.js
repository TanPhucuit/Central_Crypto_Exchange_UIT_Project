import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ComposedChart, Line, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import cryptoWebSocket from '../../services/cryptoWebSocket';
import binanceAPI from '../../services/binanceAPI';
import './LivePriceChart.css';

const LivePriceChart = React.memo(({ symbol = 'BTCUSDT', height = 400 }) => {
  const [candleData, setCandleData] = useState([]);
  const [currentPrice, setCurrentPrice] = useState(null);
  const [priceChange, setPriceChange] = useState({ value: 0, percent: 0 });
  const [isConnected, setIsConnected] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [timeframe, setTimeframe] = useState('1D');
  // Paging state and windowed view
  const [isHistoryMode, setIsHistoryMode] = useState(false); // true when viewing older pages
  const [viewStartIdx, setViewStartIdx] = useState(0); // start index of visible window in buffer

  const intervalRef = useRef(null);
  const lastPriceRef = useRef(null);
  const mountedRef = useRef(true);
  const initialLoadRef = useRef(true); // Track if this is first load ever

  // STABLE UPDATE FUNCTION - Định nghĩa 1 LẦN DUY NHẤT
  const updateLastCandle = useCallback((price, eventTs) => {
    // Avoid redundant work if price didn't change
    if (lastPriceRef.current === price) return;
    lastPriceRef.current = price;

    setCandleData(prevData => {
      if (!prevData || prevData.length === 0) return prevData;

      const newData = [...prevData];
      const lastIndex = newData.length - 1;
      const lastCandle = newData[lastIndex];
      if (!lastCandle) return prevData;

      // Determine interval based on timeframe
      const dayMs = 24 * 60 * 60 * 1000;
      const intervalMs = timeframe === '1W' ? 7 * dayMs : dayMs;
      const ts = typeof eventTs === 'number' ? eventTs : Date.now();

      // If we've crossed into a new candle interval relative to last candle timestamp
      if (ts >= (lastCandle.timestamp + intervalMs)) {
        const maxLen = timeframe === '1W' ? 52 : timeframe === '1D' ? 90 : 100;
        const nextTs = lastCandle.timestamp + intervalMs;
        const label = new Date(nextTs).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit' });

        const newCandle = {
          time: label,
          timestamp: nextTs,
          open: lastCandle.close,
          high: price,
          low: price,
          close: price,
          volume: 0,
        };

        const appended = [...newData, newCandle];
        // Trim to max length to prevent growth
        return appended.length > maxLen ? appended.slice(appended.length - maxLen) : appended;
      }

      // Otherwise, update only the last candle values
      const newClose = price;
      const newHigh = Math.max(lastCandle.high, price);
      const newLow = Math.min(lastCandle.low, price);

      if (lastCandle.close === newClose && lastCandle.high === newHigh && lastCandle.low === newLow) {
        return prevData; // No visible change
      }

      newData[lastIndex] = {
        ...lastCandle,
        close: newClose,
        high: newHigh,
        low: newLow,
      };
      return newData;
    });
  }, [timeframe]);

  // Load data function - integrate new klines; never blank the chart on failures
  const loadCandleData = async (showLoading = false) => {
    // Only show loading on FIRST load or timeframe change
    if (showLoading && mountedRef.current) {
      setIsLoading(true);
    }

    try {
      const interval = binanceAPI.timeframeToInterval(timeframe);
      const limit = timeframe === '1D' ? 90 : timeframe === '1W' ? 52 : 100;
      const klines = await binanceAPI.getKlines(symbol, interval, limit);

      if (mountedRef.current && Array.isArray(klines)) {
        if (klines.length > 0) {
          if (showLoading) {
            // On initial/timeframe change: replace with fresh data
            setCandleData(klines);
          } else {
            // Periodic refresh: integrate only newer candles
            setCandleData(prev => {
              if (!prev || prev.length === 0) return klines;
              const lastTs = prev[prev.length - 1]?.timestamp ?? 0;
              const additions = klines.filter(k => k.timestamp > lastTs);
              if (additions.length === 0) return prev;
              const combined = [...prev, ...additions];
              const maxLen = timeframe === '1W' ? 52 : timeframe === '1D' ? 90 : 100;
              return combined.length > maxLen ? combined.slice(combined.length - maxLen) : combined;
            });
          }
        }

        // Only fetch stats on initial load
        if (showLoading) {
          const stats = await binanceAPI.get24hStats(symbol);
          if (stats && mountedRef.current) {
            setPriceChange({
              value: stats.priceChange,
              percent: stats.priceChangePercent,
            });
          }

          const price = await binanceAPI.getCurrentPrice(symbol);
          if (price && mountedRef.current) {
            setCurrentPrice(price);
            lastPriceRef.current = price;
          }
        }
      }
    } catch (error) {
      console.error('Error loading candle data:', error);
    } finally {
      if (showLoading && mountedRef.current) {
        setIsLoading(false);
      }
    }
  };

  // Initial load and timeframe change - Show loading
  useEffect(() => {
    mountedRef.current = true;
    initialLoadRef.current = false;

    loadCandleData(true); // Show loading
    setIsHistoryMode(false);
    setViewStartIdx(0);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = null;
      }
    };
  }, [symbol, timeframe]); // Direct deps, no function dep

  // Periodic silent reload - Separate effect
  useEffect(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    const refreshInterval = timeframe === '1D' ? 1200000 : 1800000;

    intervalRef.current = setInterval(() => {
      loadCandleData(false); // Silent reload - NO loading state
    }, refreshInterval);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [symbol, timeframe]); // Keep in sync with data load

  // WebSocket connection - SINGLE STABLE EFFECT (paused in history mode)
  useEffect(() => {
    if (!symbol) return;

    let wsCleanup = null;

    const handlePrice = (data) => {
      if (!mountedRef.current) return;
      if (isHistoryMode) return; // pause live extension while viewing history

      const price = parseFloat(data.price);
      if (isNaN(price)) return;

      setCurrentPrice(price);
      setIsConnected(true);
      updateLastCandle(price, data.timestamp); // Pass timestamp for correct bucketing
    };

    try {
      cryptoWebSocket.connect();
      wsCleanup = cryptoWebSocket.subscribe(symbol, handlePrice);
      setIsConnected(true);
    } catch (error) {
      console.error('WebSocket error:', error);
      setIsConnected(false);
    }

    return () => {
      if (typeof wsCleanup === 'function') {
        wsCleanup();
      } else {
        cryptoWebSocket.unsubscribe(symbol);
      }
      setIsConnected(false);
    };
  }, [symbol, updateLastCandle, isHistoryMode]); // Pause/resume with history mode

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const formatPrice = (price) => {
    if (!price) return '0.00';
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    });
  };

  const isPriceUp = priceChange.percent >= 0;

  // Window sizing and paging helpers
  const windowSize = timeframe === '1W' ? 52 : 90; // constant visible candles
  const pageStep = Math.max(10, Math.floor(windowSize / 3));

  // Compute visible window slice
  const total = candleData?.length || 0;
  const maxStart = Math.max(0, total - windowSize);
  const clampedStart = Math.min(Math.max(0, viewStartIdx), maxStart);
  const visibleData = total > 0 ? candleData.slice(clampedStart, clampedStart + windowSize) : [];

  // Handlers for paging
  const handleLoadOlder = async () => {
    if (!candleData || candleData.length === 0) return;
    setIsHistoryMode(true);
    const interval = binanceAPI.timeframeToInterval(timeframe);
    const newStart = clampedStart - pageStep;

    if (newStart >= 0) {
      setViewStartIdx(newStart);
      return;
    }

    // Need to fetch older data to fulfill left shift
    const earliestTs = candleData[0].timestamp;
    const fetchCount = Math.max(windowSize, pageStep * 2);
    const prev = await binanceAPI.getPreviousKlines(symbol, interval, earliestTs, fetchCount);
    if (prev && prev.length > 0) {
      setCandleData(old => {
        const combined = [...prev, ...old];
        // De-duplicate by timestamp
        const seen = new Set();
        const dedup = [];
        for (const k of combined) {
          if (!seen.has(k.timestamp)) { seen.add(k.timestamp); dedup.push(k); }
        }
        // After prepending, move the window right by prev.length - pageStep to maintain shift amount
        const shiftedStart = Math.max(0, (clampedStart + prev.length) - pageStep);
        setViewStartIdx(shiftedStart);
        return dedup;
      });
    }
  };

  const handleLoadNewer = () => {
    if (!candleData || candleData.length === 0) return;
    const newStart = clampedStart + pageStep;
    if (newStart >= maxStart) {
      // Reached the live end — resume live mode and anchor to end
      setIsHistoryMode(false);
      setViewStartIdx(maxStart);
    } else {
      setIsHistoryMode(true);
      setViewStartIdx(newStart);
    }
  };

  // Render với stable structure - tránh unmount
  return (
    <div className="chart-container" style={{ minHeight: height }}>
      {/* Price header */}
      <div className="chart-header">
        <div className="price-info">
          <h2 className="current-price">${formatPrice(currentPrice)}</h2>
          <span className={`price-change ${isPriceUp ? 'positive' : 'negative'}`}>
            {isPriceUp ? '+' : ''}{priceChange.value?.toFixed(2)} ({isPriceUp ? '+' : ''}{priceChange.percent?.toFixed(2)}%)
          </span>
          <span className={`connection-status ${isConnected ? 'connected' : 'disconnected'}`}>
            {isConnected ? '● Live' : '○ Offline'}
          </span>
        </div>

        {/* Timeframe selector */}
        <div className="timeframe-selector">
          {['1D', '1W'].map((tf) => (
            <button
              key={tf}
              className={`timeframe-btn ${timeframe === tf ? 'active' : ''}`}
              onClick={() => setTimeframe(tf)}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Chart area - ALWAYS render ResponsiveContainer */}
      <div style={{ position: 'relative', height: height - 80 }}>
        {/* Loading overlay */}
        {isLoading && (
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            background: 'rgba(0,0,0,0.5)',
            zIndex: 10
          }}>
            <div className="chart-loading">
              <div className="loading-spinner"></div>
              <p>Đang tải dữ liệu biểu đồ nến...</p>
            </div>
          </div>
        )}

        {/* Chart - Always mounted */}
        {visibleData && visibleData.length > 0 ? (
          <ResponsiveContainer width="100%" height={height - 80}>
            <ComposedChart data={visibleData} margin={{ top: 10, right: 30, left: 10, bottom: 0 }} isAnimationActive={false}>
              <defs>
                <linearGradient id="volumeGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="rgba(90, 200, 250, 0.4)" stopOpacity={0.8} />
                  <stop offset="95%" stopColor="rgba(90, 200, 250, 0.1)" stopOpacity={0.1} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />

              <XAxis
                dataKey="time"
                stroke="rgba(255,255,255,0.5)"
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }}
                tickLine={false}
                axisLine={false}
                allowDuplicatedCategory={false}
              />

              <YAxis
                yAxisId="candle"
                orientation="right"
                domain={['dataMin - 100', 'dataMax + 100']}
                stroke="rgba(255,255,255,0.5)"
                tick={{ fontSize: 11, fill: 'rgba(255,255,255,0.7)' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(value) => `$${value.toFixed(0)}`}
              />

              <Tooltip
                content={({ active, payload }) => {
                  if (active && payload && payload.length > 0) {
                    const data = payload[0].payload;
                    return (
                      <div style={{
                        background: 'rgba(20, 20, 22, 0.98)',
                        border: '1px solid rgba(255, 255, 255, 0.15)',
                        borderRadius: '12px',
                        padding: '12px',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.4)'
                      }}>
                        <div style={{ color: '#fff', fontWeight: '600', marginBottom: '8px' }}>{data.time}</div>
                        <div style={{ color: '#26a69a', padding: '2px 0' }}>Mở: ${formatPrice(data.open)}</div>
                        <div style={{ color: '#5AC8FA', padding: '2px 0' }}>Cao: ${formatPrice(data.high)}</div>
                        <div style={{ color: '#FF9500', padding: '2px 0' }}>Thấp: ${formatPrice(data.low)}</div>
                        <div style={{ color: data.close >= data.open ? '#26a69a' : '#ef5350', padding: '2px 0', fontWeight: '600' }}>
                          Đóng: ${formatPrice(data.close)}
                        </div>
                        <div style={{ color: 'rgba(255,255,255,0.6)', padding: '2px 0', fontSize: '12px' }}>
                          Vol: {(data.volume / 1000).toFixed(2)}K
                        </div>
                      </div>
                    );
                  }
                  return null;
                }}
                cursor={{ stroke: 'rgba(255,255,255,0.2)', strokeWidth: 1 }}
              />

              <Bar yAxisId="candle" dataKey="high" fill="transparent" />
              <Bar yAxisId="candle" dataKey="low" fill="transparent" />
              <Bar yAxisId="candle" dataKey="open" fill="transparent" />
              <Bar yAxisId="candle" dataKey="close" fill="transparent" />

              <Line
                yAxisId="candle"
                type="monotone"
                dataKey="close"
                stroke="transparent"
                isAnimationActive={false}
                dot={(props) => {
                  const { cx, cy, payload, index } = props;
                  if (!payload || !payload.open || !payload.close || !payload.high || !payload.low) return null;

                  const { open, close, high, low } = payload;
                  const isUp = close >= open;
                  const color = isUp ? '#26a69a' : '#ef5350';

                  if (!visibleData || visibleData.length === 0) return null;

                  const dataMax = Math.max(...visibleData.map(d => d.high));
                  const dataMin = Math.min(...visibleData.map(d => d.low));
                  const priceRange = dataMax - dataMin;

                  if (priceRange === 0) return null;
                  const heightRange = height - 40;
                  const pixelPerPrice = heightRange / priceRange;

                  const yHigh = cy - ((high - close) * pixelPerPrice);
                  const yLow = cy + ((close - low) * pixelPerPrice);
                  const yOpen = cy - ((open - close) * pixelPerPrice);

                  const bodyTop = Math.min(cy, yOpen);
                  const bodyHeight = Math.max(Math.abs(cy - yOpen), 2);
                  const barWidth = 8;

                  return (
                    <g key={`candle-${index}`}>
                      <line
                        x1={cx}
                        y1={yHigh}
                        x2={cx}
                        y2={yLow}
                        stroke={color}
                        strokeWidth={1.5}
                      />
                      <rect
                        x={cx - barWidth / 2}
                        y={bodyTop}
                        width={barWidth}
                        height={bodyHeight}
                        fill={color}
                        stroke={color}
                        strokeWidth={1}
                      />
                    </g>
                  );
                }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        ) : (
          <div style={{
            height: '100%',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: 'rgba(255,255,255,0.5)'
          }}>
            {!isLoading && <p>Chưa có dữ liệu biểu đồ</p>}
          </div>
        )}
        {/* Paging controls under chart */}
        <div style={{ position: 'absolute', bottom: 8, left: 12, display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            className="timeframe-btn"
            onClick={handleLoadOlder}
            disabled={isLoading}
            title="Xem nến cũ hơn"
          >
            ←
          </button>
          <button
            className="timeframe-btn"
            onClick={handleLoadNewer}
            disabled={isLoading || (!isHistoryMode && clampedStart >= maxStart)}
            title="Xem nến mới hơn"
          >
            →
          </button>
          <span style={{ marginLeft: 8, fontSize: 12, opacity: 0.7 }}>
            {isHistoryMode ? 'Lịch sử' : 'Live'}
          </span>
        </div>
      </div>

      {/* Footer */}
      <div className="chart-footer">
        <span className="chart-info">
          {visibleData && visibleData.length > 0
            ? `${visibleData.length} nến hiển thị • Cập nhật ${new Date().toLocaleTimeString()}`
            : 'Waiting for data...'
          }
        </span>
      </div>
    </div>
  );
});

export default LivePriceChart;
