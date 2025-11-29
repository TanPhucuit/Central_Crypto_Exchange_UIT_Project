import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LineChart, Line, BarChart, Bar, AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { FiArrowLeft, FiTrendingUp, FiTrendingDown, FiCalendar } from 'react-icons/fi';
import './PnLAnalyticsPage.css';

const PnLAnalyticsPage = () => {
  const navigate = useNavigate();
  const [viewMode, setViewMode] = useState('daily'); // 'daily' or 'weekly'

  // Mock daily PnL data (30 days)
  const dailyData = Array.from({ length: 30 }, (_, i) => ({
    date: `${i + 1}/10`,
    pnl: Math.random() * 2000 - 500,
    cumulative: 0,
    trades: Math.floor(Math.random() * 10) + 1,
    winRate: Math.random() * 100,
  }));

  // Calculate cumulative
  dailyData.forEach((item, index) => {
    item.cumulative = index === 0 
      ? item.pnl 
      : dailyData[index - 1].cumulative + item.pnl;
  });

  // Mock weekly PnL data (12 weeks)
  const weeklyData = Array.from({ length: 12 }, (_, i) => ({
    week: `T${i + 1}`,
    pnl: Math.random() * 5000 - 1000,
    cumulative: 0,
    trades: Math.floor(Math.random() * 50) + 10,
    winRate: Math.random() * 100,
  }));

  // Calculate cumulative
  weeklyData.forEach((item, index) => {
    item.cumulative = index === 0 
      ? item.pnl 
      : weeklyData[index - 1].cumulative + item.pnl;
  });

  const currentData = viewMode === 'daily' ? dailyData : weeklyData;
  const xKey = viewMode === 'daily' ? 'date' : 'week';

  // Stats
  const totalPnL = currentData[currentData.length - 1]?.cumulative || 0;
  const avgPnL = totalPnL / currentData.length;
  const winningDays = currentData.filter(d => d.pnl > 0).length;
  const losingDays = currentData.filter(d => d.pnl < 0).length;
  const winRate = (winningDays / currentData.length) * 100;

  return (
    <div className="pnl-analytics-page">
      {/* Header */}
      <div className="page-header">
        <button className="btn-back" onClick={() => navigate(-1)}>
          <FiArrowLeft /> Quay lại
        </button>
        <div>
          <h1>📊 Phân Tích PnL</h1>
          <p className="text-secondary">Lãi lỗ tích lũy theo thời gian</p>
        </div>
      </div>

      {/* View Mode Toggle */}
      <div className="view-toggle">
        <button 
          className={`toggle-btn ${viewMode === 'daily' ? 'active' : ''}`}
          onClick={() => setViewMode('daily')}
        >
          <FiCalendar /> Theo Ngày
        </button>
        <button 
          className={`toggle-btn ${viewMode === 'weekly' ? 'active' : ''}`}
          onClick={() => setViewMode('weekly')}
        >
          <FiCalendar /> Theo Tuần
        </button>
      </div>

      {/* Stats Cards */}
      <div className="stats-grid">
        <div className="stat-card glass-card">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Tổng PnL</div>
            <div className={`stat-value ${totalPnL >= 0 ? 'positive' : 'negative'}`}>
              {totalPnL >= 0 ? '+' : ''}{totalPnL.toFixed(2)} USDT
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Trung bình {viewMode === 'daily' ? 'Ngày' : 'Tuần'}</div>
            <div className={`stat-value ${avgPnL >= 0 ? 'positive' : 'negative'}`}>
              {avgPnL >= 0 ? '+' : ''}{avgPnL.toFixed(2)} USDT
            </div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon success">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">{viewMode === 'daily' ? 'Ngày' : 'Tuần'} Lãi</div>
            <div className="stat-value success">{winningDays}</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon danger">
            <FiTrendingDown />
          </div>
          <div className="stat-content">
            <div className="stat-label">{viewMode === 'daily' ? 'Ngày' : 'Tuần'} Lỗ</div>
            <div className="stat-value danger">{losingDays}</div>
          </div>
        </div>

        <div className="stat-card glass-card">
          <div className="stat-icon">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Tỷ Lệ Thắng</div>
            <div className="stat-value">{winRate.toFixed(1)}%</div>
          </div>
        </div>
      </div>

      {/* Cumulative PnL Chart */}
      <div className="chart-section glass-card">
        <h3>📈 Lãi Lỗ Tích Lũy</h3>
        <ResponsiveContainer width="100%" height={350}>
          <AreaChart data={currentData}>
            <defs>
              <linearGradient id="colorPnL" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#05c46b" stopOpacity={0.3}/>
                <stop offset="95%" stopColor="#05c46b" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(20, 20, 40, 0.95)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Area 
              type="monotone" 
              dataKey="cumulative" 
              stroke="#05c46b" 
              strokeWidth={3}
              fill="url(#colorPnL)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Daily/Weekly PnL Bar Chart */}
      <div className="chart-section glass-card">
        <h3>📊 PnL {viewMode === 'daily' ? 'Hàng Ngày' : 'Hàng Tuần'}</h3>
        <ResponsiveContainer width="100%" height={350}>
          <BarChart data={currentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(20, 20, 40, 0.95)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Bar dataKey="pnl" fill="#6366f1">
              {currentData.map((entry, index) => (
                <rect 
                  key={`bar-${index}`}
                  fill={entry.pnl >= 0 ? '#05c46b' : '#ff3838'}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Win Rate Chart */}
      <div className="chart-section glass-card">
        <h3>🎯 Tỷ Lệ Thắng Theo Thời Gian</h3>
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={currentData}>
            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.1)" />
            <XAxis dataKey={xKey} stroke="#888" />
            <YAxis stroke="#888" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'rgba(20, 20, 40, 0.95)', 
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '8px'
              }}
              labelStyle={{ color: '#fff' }}
            />
            <Line 
              type="monotone" 
              dataKey="winRate" 
              stroke="#6366f1" 
              strokeWidth={2}
              dot={{ fill: '#6366f1', r: 4 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Data Table */}
      <div className="data-table-section glass-card">
        <h3>📋 Chi Tiết</h3>
        <div className="table-wrapper">
          <table className="pnl-table">
            <thead>
              <tr>
                <th>{viewMode === 'daily' ? 'Ngày' : 'Tuần'}</th>
                <th>PnL</th>
                <th>Tích Lũy</th>
                <th>Giao Dịch</th>
                <th>Tỷ Lệ Thắng</th>
              </tr>
            </thead>
            <tbody>
              {currentData.map((item, index) => (
                <tr key={index}>
                  <td>{item[xKey]}</td>
                  <td className={item.pnl >= 0 ? 'positive' : 'negative'}>
                    {item.pnl >= 0 ? '+' : ''}{item.pnl.toFixed(2)}
                  </td>
                  <td className={item.cumulative >= 0 ? 'positive' : 'negative'}>
                    {item.cumulative >= 0 ? '+' : ''}{item.cumulative.toFixed(2)}
                  </td>
                  <td>{item.trades}</td>
                  <td>{item.winRate.toFixed(1)}%</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default PnLAnalyticsPage;
