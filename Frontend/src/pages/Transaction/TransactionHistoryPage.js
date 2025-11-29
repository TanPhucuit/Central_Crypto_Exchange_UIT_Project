import React from 'react';
import { FiFilter, FiDownload } from 'react-icons/fi';
import './TransactionHistoryPage.css';

const TransactionHistoryPage = () => {
  const transactions = [
    {
      id: 'TX001',
      type: 'spot',
      action: 'buy',
      pair: 'BTC/USDT',
      amount: 0.05,
      price: 45000,
      total: 2250,
      fee: 2.25,
      time: '2024-10-06 10:30:15',
      status: 'completed',
    },
    {
      id: 'TX002',
      type: 'spot',
      action: 'sell',
      pair: 'ETH/USDT',
      amount: 1.5,
      price: 2000,
      total: 3000,
      fee: 3.00,
      time: '2024-10-06 09:15:30',
      status: 'completed',
    },
    {
      id: 'TX003',
      type: 'p2p',
      action: 'buy',
      pair: 'USDT/VND',
      amount: 5000,
      price: 24500,
      total: 122500000,
      fee: 0,
      time: '2024-10-05 14:20:45',
      status: 'completed',
    },
    {
      id: 'TX004',
      type: 'deposit',
      action: 'deposit',
      pair: 'BTC',
      amount: 0.1,
      price: 0,
      total: 0,
      fee: 0,
      time: '2024-10-05 08:45:20',
      status: 'completed',
    },
    {
      id: 'TX005',
      type: 'withdraw',
      action: 'withdraw',
      pair: 'USDT',
      amount: 5000,
      price: 0,
      total: 0,
      fee: 5,
      time: '2024-10-04 16:30:10',
      status: 'pending',
    },
  ];

  const getTypeLabel = (type) => {
    const labels = {
      spot: 'Spot',
      p2p: 'P2P',
      deposit: 'Nạp tiền',
      withdraw: 'Rút tiền',
      transfer: 'Chuyển',
    };
    return labels[type] || type;
  };

  const getActionLabel = (action) => {
    const labels = {
      buy: 'Mua',
      sell: 'Bán',
      deposit: 'Nạp',
      withdraw: 'Rút',
      transfer: 'Chuyển',
    };
    return labels[action] || action;
  };

  return (
    <div className="transaction-history-page">
      <div className="page-header">
        <h1>Lịch sử giao dịch</h1>
        <p className="text-secondary">Xem tất cả các giao dịch của bạn</p>
      </div>

      <div className="controls">
        <div className="filters">
          <select className="filter-select">
            <option value="all">Tất cả loại</option>
            <option value="spot">Spot</option>
            <option value="p2p">P2P</option>
            <option value="deposit">Nạp tiền</option>
            <option value="withdraw">Rút tiền</option>
          </select>

          <select className="filter-select">
            <option value="all">Tất cả trạng thái</option>
            <option value="completed">Hoàn thành</option>
            <option value="pending">Đang xử lý</option>
            <option value="cancelled">Đã hủy</option>
          </select>

          <input
            type="date"
            className="filter-select"
            placeholder="Từ ngày"
          />

          <input
            type="date"
            className="filter-select"
            placeholder="Đến ngày"
          />

          <button className="filter-btn">
            <FiFilter /> Lọc
          </button>
        </div>

        <button className="export-btn">
          <FiDownload /> Xuất Excel
        </button>
      </div>

      <div className="transactions-table">
        <div className="table-header">
          <div className="header-cell">Mã GD</div>
          <div className="header-cell">Loại</div>
          <div className="header-cell">Hành động</div>
          <div className="header-cell">Cặp/Tiền</div>
          <div className="header-cell">Số lượng</div>
          <div className="header-cell">Giá</div>
          <div className="header-cell">Tổng</div>
          <div className="header-cell">Phí</div>
          <div className="header-cell">Thời gian</div>
          <div className="header-cell">Trạng thái</div>
        </div>

        {transactions.map((tx) => (
          <div key={tx.id} className="table-row">
            <div className="table-cell">{tx.id}</div>
            <div className="table-cell">
              <span className="type-badge">{getTypeLabel(tx.type)}</span>
            </div>
            <div className="table-cell">
              <span className={`action-badge ${tx.action}`}>
                {getActionLabel(tx.action)}
              </span>
            </div>
            <div className="table-cell font-medium">{tx.pair}</div>
            <div className="table-cell">{tx.amount}</div>
            <div className="table-cell">
              {tx.price > 0 ? `$${tx.price.toLocaleString()}` : '-'}
            </div>
            <div className="table-cell">
              {tx.total > 0 ? `$${tx.total.toLocaleString()}` : '-'}
            </div>
            <div className="table-cell">{tx.fee > 0 ? `$${tx.fee}` : '-'}</div>
            <div className="table-cell text-secondary">{tx.time}</div>
            <div className="table-cell">
              <span className={`status-badge ${tx.status}`}>
                {tx.status === 'completed' ? 'Hoàn thành' : 'Đang xử lý'}
              </span>
            </div>
          </div>
        ))}
      </div>

      <div className="pagination">
        <button className="page-btn" disabled>Trước</button>
        <button className="page-btn active">1</button>
        <button className="page-btn">2</button>
        <button className="page-btn">3</button>
        <button className="page-btn">Sau</button>
      </div>
    </div>
  );
};

export default TransactionHistoryPage;
