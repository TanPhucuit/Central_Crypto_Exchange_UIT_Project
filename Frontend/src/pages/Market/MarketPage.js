import React, { useState } from 'react';
import LivePriceChart from '../../components/LivePriceChart/LivePriceChart';
import './MarketPage.css';

const MarketPage = () => {
  const [selectedCoin, setSelectedCoin] = useState(null);
  
  const markets = [
    { symbol: 'BTC/USDT', price: 45820, change: 2.5, volume: '1.2B', high: 46200, low: 44500 },
    { symbol: 'ETH/USDT', price: 2000, change: -1.2, volume: '856M', high: 2050, low: 1980 },
    { symbol: 'BNB/USDT', price: 300, change: 3.8, volume: '450M', high: 305, low: 290 },
    { symbol: 'SOL/USDT', price: 120, change: 5.2, volume: '320M', high: 125, low: 115 },
    { symbol: 'XRP/USDT', price: 0.52, change: -0.8, volume: '280M', high: 0.54, low: 0.51 },
    { symbol: 'ADA/USDT', price: 0.45, change: 1.5, volume: '150M', high: 0.46, low: 0.44 },
  ];

  const handleTradeClick = (symbol) => {
    setSelectedCoin(symbol);
  };

  return (
    <div className="market-page">
      <div className="page-header">
        <h1>Thị trường</h1>
        <p className="text-secondary">Giá và biểu đồ tiền điện tử</p>
      </div>

      <div className="market-stats">
        <div className="stat-box">
          <div className="stat-label">Tổng vốn hóa</div>
          <div className="stat-value">$1.85T</div>
          <div className="stat-change text-success">+2.3%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Khối lượng 24h</div>
          <div className="stat-value">$98.5B</div>
          <div className="stat-change text-danger">-1.5%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">BTC Dominance</div>
          <div className="stat-value">52.3%</div>
        </div>
        <div className="stat-box">
          <div className="stat-label">Số coins</div>
          <div className="stat-value">10,528</div>
        </div>
      </div>

      <div className="market-table-container">
        <div className="market-filters">
          <button className="filter-btn active">Tất cả</button>
          <button className="filter-btn">Spot</button>
          <button className="filter-btn">Futures</button>
          <button className="filter-btn">Yêu thích</button>
        </div>

        <div className="market-table">
          <div className="table-header">
            <div className="header-cell">Cặp giao dịch</div>
            <div className="header-cell">Giá</div>
            <div className="header-cell">Thay đổi 24h</div>
            <div className="header-cell">Cao 24h</div>
            <div className="header-cell">Thấp 24h</div>
            <div className="header-cell">Khối lượng 24h</div>
            <div className="header-cell">Hành động</div>
          </div>

          {markets.map((market, index) => (
            <div key={index} className="table-row">
              <div className="table-cell">
                <div className="market-symbol">{market.symbol}</div>
              </div>
              <div className="table-cell">
                <div className="market-price">${market.price.toLocaleString()}</div>
              </div>
              <div className="table-cell">
                <div className={`market-change ${market.change >= 0 ? 'positive' : 'negative'}`}>
                  {market.change >= 0 ? '+' : ''}{market.change}%
                </div>
              </div>
              <div className="table-cell">
                <div className="market-value">${market.high.toLocaleString()}</div>
              </div>
              <div className="table-cell">
                <div className="market-value">${market.low.toLocaleString()}</div>
              </div>
              <div className="table-cell">
                <div className="market-volume">${market.volume}</div>
              </div>
              <div className="table-cell">
                <button 
                  className="trade-btn"
                  onClick={() => handleTradeClick(market.symbol)}
                >
                  Giao dịch
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Chart Modal */}
      {selectedCoin && (
        <div className="chart-modal" onClick={() => setSelectedCoin(null)}>
          <div className="chart-modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h2>📊 Biểu đồ nến {selectedCoin}</h2>
              <button 
                className="close-btn"
                onClick={() => setSelectedCoin(null)}
              >
                ✕
              </button>
            </div>
            <div className="modal-body">
              <LivePriceChart 
                symbol={selectedCoin.replace('/', '')} 
                height={500} 
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketPage;
