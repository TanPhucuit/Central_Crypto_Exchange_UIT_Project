import React, { useState, useEffect } from 'react';
import './MerchantDashboardPage.css';
import {
  FiUsers,
  FiDollarSign,
  FiTrendingUp,
  FiCheckCircle,
  FiCheck,
  FiClock,
  FiX,
  FiAlertCircle
} from 'react-icons/fi';
import { merchantAPI, p2pAPI, bankAPI } from '../../services/api';

const MerchantDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  
  // Payment modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [merchantBankAccounts, setMerchantBankAccounts] = useState([]);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');

  useEffect(() => {
    loadDashboardData();
    loadMerchantBankAccounts();
  }, []);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const merchantId = localStorage.getItem('user_id');

      // Load stats and orders in parallel
      const [statsResponse, ordersResponse] = await Promise.all([
        merchantAPI.getDashboardStats(merchantId),
        merchantAPI.getOrders(merchantId)
      ]);

      console.log('Dashboard stats:', statsResponse);
      console.log('Merchant orders:', ordersResponse);

      setStats(statsResponse.data);
      setOrders(ordersResponse.data || []);
    } catch (err) {
      console.error('Failed to load dashboard data:', err);
      setError('Không thể tải dữ liệu');
    } finally {
      setLoading(false);
    }
  };
  
  const loadMerchantBankAccounts = async () => {
    try {
      const merchantId = localStorage.getItem('user_id');
      const response = await bankAPI.getAccounts(merchantId);
      if (response.success && response.data) {
        setMerchantBankAccounts(response.data);
      }
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
    }
  };

  const handleOpenPaymentModal = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
    setSelectedBankAccount('');
    setError('');
  };
  
  const handleMerchantTransfer = async () => {
    if (!selectedBankAccount) {
      setError('Vui lòng chọn tài khoản ngân hàng');
      return;
    }

    try {
      setLoading(true);
      setError('');
      
      const merchantId = localStorage.getItem('user_id');
      const bankAccount = merchantBankAccounts.find(acc => acc.account_number === selectedBankAccount);
      
      if (!bankAccount) {
        setError('Không tìm thấy thông tin tài khoản');
        return;
      }

      const merchantPrice = selectedOrder.price || 24500;
      const usdtAmount = selectedOrder.amount || 0;
      const vndAmount = usdtAmount * merchantPrice;

      if (parseFloat(bankAccount.account_balance) < vndAmount) {
        setError(`Số dư không đủ. Cần: ${vndAmount.toLocaleString()} VND, có: ${parseFloat(bankAccount.account_balance).toLocaleString()} VND`);
        return;
      }

      const response = await p2pAPI.merchantTransferPayment(selectedOrder.order_id, {
        merchant_id: merchantId,
        source_account: selectedBankAccount,
        amount: vndAmount
      });

      if (response.success) {
        setSuccess('✅ Đã chuyển tiền thành công! Đợi người dùng xác nhận...');
        setShowPaymentModal(false);
        loadDashboardData();
        loadMerchantBankAccounts();
        setTimeout(() => setSuccess(''), 5000);
      } else {
        setError(response.message || 'Không thể chuyển tiền');
      }
    } catch (err) {
      setError('Lỗi khi chuyển tiền: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmRelease = async (orderId) => {
    if (!window.confirm('Xác nhận đã nhận tiền và mở khóa USDT?')) return;

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const merchantId = localStorage.getItem('user_id');
      await p2pAPI.confirmAndRelease(orderId, merchantId);
      setSuccess('Đã mở khóa USDT thành công!');
      loadDashboardData();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      console.error('Confirm error:', err);
      setError(err.response?.data?.message || 'Không thể xác nhận đơn hàng');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (order) => {
    const status = order.state || order.status;
    if (status === 'banked' || status === 'matched') return { text: '✓ Đã chuyển tiền', class: 'paid', icon: FiCheckCircle };
    if (status === 'pending' || status === 'open') return { text: 'Chờ thanh toán', class: 'waiting', icon: FiClock };
    if (status === 'completed' || status === 'filled') return { text: 'Đã hoàn thành', class: 'completed', icon: FiCheck };
    if (status === 'cancelled') return { text: 'Đã hủy', class: 'cancelled', icon: FiX };
    return { text: status || 'N/A', class: '', icon: FiClock };
  };

  const completionRate = stats && stats.total_orders > 0
    ? ((stats.completed_orders / stats.total_orders) * 100).toFixed(1)
    : 0;

  if (loading && orders.length === 0) {
    return (
      <div className="merchant-dashboard-page">
        <div className="page-header">
          <h1>Bảng điều khiển & Quản lý P2P</h1>
          <p className="text-secondary">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-dashboard-page">
      <div className="page-header">
        <h1>Bảng điều khiển & Quản lý P2P</h1>
        <p className="text-secondary">Tổng quan hoạt động và quản lý đơn hàng P2P</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <FiCheck /> {success}
          <button onClick={() => setSuccess('')} className="alert-close">×</button>
        </div>
      )}

      <div className="merchant-stats-grid">
        <div className="merchant-stat-card">
          <div className="stat-icon blue">
            <FiUsers />
          </div>
          <div className="stat-content">
            <div className="stat-label">Tổng đơn hàng</div>
            <div className="stat-value">{stats ? stats.total_orders : 0}</div>
          </div>
        </div>

        <div className="merchant-stat-card">
          <div className="stat-icon green">
            <FiCheckCircle />
          </div>
          <div className="stat-content">
            <div className="stat-label">Đơn hoàn thành</div>
            <div className="stat-value">{stats ? stats.completed_orders : 0}</div>
            <div className="stat-detail text-success">{completionRate}% tỷ lệ</div>
          </div>
        </div>

        <div className="merchant-stat-card">
          <div className="stat-icon purple">
            <FiDollarSign />
          </div>
          <div className="stat-content">
            <div className="stat-label">Tổng khối lượng</div>
            <div className="stat-value">{stats ? parseFloat(stats.total_volume || 0).toLocaleString() : 0} USDT</div>
          </div>
        </div>

        <div className="merchant-stat-card">
          <div className="stat-icon orange">
            <FiTrendingUp />
          </div>
          <div className="stat-content">
            <div className="stat-label">Tỷ lệ hoàn thành</div>
            <div className="stat-value">{completionRate}%</div>
            <div className="stat-detail text-secondary">Tự động tính</div>
          </div>
        </div>
      </div>

      <div className="orders-section">
        <h3>Danh sách đơn hàng P2P</h3>
        {orders.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có đơn hàng nào</p>
          </div>
        ) : (
          <div className="table-responsive">
            <table className="orders-table">
              <thead>
                <tr>
                  <th>Mã đơn</th>
                  <th>Khách hàng</th>
                  <th>Loại</th>
                  <th>Số lượng USDT</th>
                  <th>Số tiền VND</th>
                  <th>Trạng thái thanh toán</th>
                  <th>Ngày tạo</th>
                  <th>Thao tác</th>
                </tr>
              </thead>
              <tbody>
                {orders.map(order => {
                  const paymentStatus = getPaymentStatus(order);
                  return (
                    <tr key={order.order_id}>
                      <td>#{order.order_id}</td>
                      <td>
                        <div className="user-info">
                          <div className="user-name">{order.user_username || order.user_email}</div>
                          {order.user_email && <div className="user-email">{order.user_email}</div>}
                        </div>
                      </td>
                      <td>
                        <span className={`badge badge-${order.type === 'buy' ? 'success' : 'danger'}`}>
                          {order.type === 'buy' ? 'Mua' : 'Bán'}
                        </span>
                      </td>
                      <td className="text-right">{parseFloat(order.amount || 0).toLocaleString()} USDT</td>
                      <td className="text-right">{parseFloat(order.total || 0).toLocaleString()} VND</td>
                      <td>
                        <span className={`payment-status payment-status-${paymentStatus.class}`}>
                          <paymentStatus.icon className="status-icon" />
                          {paymentStatus.text}
                        </span>
                      </td>
                      <td>{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                      <td>
                        {order.state === 'cancelled' ? (
                          <span className="text-danger">Đã hủy</span>
                        ) : (order.state === 'completed' || order.state === 'filled') ? (
                          <span className="text-success">✓ Đã hoàn thành</span>
                        ) : (order.state === 'banked' || order.state === 'matched') ? (
                          order.type === 'buy' ? (
                            <button
                              className="btn btn-success btn-small btn-confirm-release"
                              onClick={() => handleConfirmRelease(order.order_id)}
                              disabled={loading}
                              title="Xác nhận mở khóa USDT"
                            >
                              🔓 Xác nhận mở khóa
                            </button>
                          ) : (
                            <span className="text-info">⏳ Đợi user xác nhận</span>
                          )
                        ) : (order.state === 'pending' || order.state === 'open') ? (
                          order.type === 'sell' ? (
                            <button
                              onClick={() => handleOpenPaymentModal(order)}
                              disabled={loading}
                              title="Chuyển tiền cho user"
                              style={{
                                padding: '10px 20px',
                                fontSize: '14px',
                                fontWeight: '600',
                                color: 'white',
                                background: 'linear-gradient(135deg, #2196F3, #1976D2)',
                                border: 'none',
                                borderRadius: '8px',
                                cursor: loading ? 'not-allowed' : 'pointer',
                                whiteSpace: 'nowrap',
                                boxShadow: '0 4px 12px rgba(33, 150, 243, 0.4)'
                              }}
                            >
                              💳 Chuyển tiền
                            </button>
                          ) : (
                            <span className="text-muted">⏳ Chờ user</span>
                          )
                        ) : (
                          <span className="text-muted">-</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Payment Modal for Sell Orders */}
      {showPaymentModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>💳 Chuyển tiền cho người dùng</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-info" style={{
                background: 'var(--dark-bg)',
                padding: 'var(--spacing-lg)',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--spacing-lg)',
                border: '1px solid var(--border-color)'
              }}>
                <h4 style={{marginBottom: 'var(--spacing-md)', color: 'var(--primary-color)'}}>📋 Thông tin đơn hàng</h4>
                <div style={{display: 'grid', gap: '12px'}}>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Mã đơn:</span>
                    <strong>#{selectedOrder.order_id}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Người dùng:</span>
                    <strong>{selectedOrder.user_username || 'N/A'}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Số lượng USDT:</span>
                    <strong style={{color: 'var(--success-color)'}}>{parseFloat(selectedOrder.amount || 0).toFixed(2)} USDT</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Giá:</span>
                    <strong>{parseFloat(selectedOrder.price || 24500).toLocaleString()} VND/USDT</strong>
                  </div>
                  <div style={{
                    display: 'flex', 
                    justifyContent: 'space-between',
                    paddingTop: '12px',
                    borderTop: '1px solid var(--border-color)',
                    marginTop: '8px'
                  }}>
                    <span style={{color: 'var(--text-secondary)', fontWeight: 600}}>Tổng thanh toán:</span>
                    <strong style={{fontSize: '20px', color: 'var(--primary-color)'}}>
                      {((selectedOrder.amount || 0) * (selectedOrder.price || 24500)).toLocaleString()} VND
                    </strong>
                  </div>
                </div>
              </div>

              <div className="form-group" style={{marginBottom: 'var(--spacing-lg)'}}>
                <label style={{marginBottom: '8px', display: 'block', fontWeight: 600}}>
                  🏦 Chọn tài khoản ngân hàng của bạn
                </label>
                <select 
                  value={selectedBankAccount}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                  className="form-control"
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: 'var(--radius-md)',
                    border: '1px solid var(--border-color)',
                    background: 'var(--dark-bg)',
                    color: 'var(--text-primary)',
                    fontSize: '14px'
                  }}
                >
                  <option value="">-- Chọn tài khoản ngân hàng --</option>
                  {merchantBankAccounts.map((account) => (
                    <option key={account.account_number} value={account.account_number}>
                      {account.bank_name} - {account.account_number} (Số dư: {parseFloat(account.account_balance).toLocaleString()} VND)
                    </option>
                  ))}
                </select>
              </div>

              {selectedBankAccount && (
                <div style={{
                  marginBottom: 'var(--spacing-lg)',
                  padding: '12px',
                  background: 'rgba(5, 196, 107, 0.1)',
                  border: '1px solid var(--success-color)',
                  borderRadius: 'var(--radius-md)'
                }}>
                  <p style={{margin: 0, display: 'flex', alignItems: 'center', gap: '8px'}}>
                    <FiCheckCircle style={{color: 'var(--success-color)'}} />
                    <span>
                      <strong>Số dư khả dụng:</strong> {merchantBankAccounts.find(acc => acc.account_number === selectedBankAccount)?.account_balance ? parseFloat(merchantBankAccounts.find(acc => acc.account_number === selectedBankAccount).account_balance).toLocaleString() : 0} VND
                    </span>
                  </p>
                </div>
              )}

              <div className="alert" style={{
                padding: '12px',
                background: 'rgba(33, 150, 243, 0.1)',
                border: '1px solid #2196f3',
                borderRadius: 'var(--radius-md)',
                display: 'flex',
                gap: '12px',
                alignItems: 'flex-start'
              }}>
                <FiAlertCircle style={{color: '#2196f3', flexShrink: 0, marginTop: '2px'}} />
                <div style={{fontSize: '13px', lineHeight: '1.5'}}>
                  <strong>Quy trình:</strong>
                  <ol style={{margin: '8px 0 0 0', paddingLeft: '20px'}}>
                    <li>Số tiền sẽ được trừ từ tài khoản merchant</li>
                    <li>Tiền được chuyển vào tài khoản người dùng</li>
                    <li>Người dùng xác nhận đã nhận tiền</li>
                    <li>USDT được mở khóa và chuyển vào ví merchant</li>
                  </ol>
                </div>
              </div>
            </div>
            <div className="modal-footer" style={{
              display: 'flex',
              gap: 'var(--spacing-md)',
              justifyContent: 'flex-end',
              padding: 'var(--spacing-lg)',
              borderTop: '1px solid var(--border-color)'
            }}>
              <button 
                className="btn btn-secondary" 
                onClick={() => setShowPaymentModal(false)}
                style={{
                  padding: '12px 24px',
                  borderRadius: 'var(--radius-md)',
                  border: '1px solid var(--border-color)',
                  background: 'transparent',
                  color: 'var(--text-primary)'
                }}
              >
                Hủy
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleMerchantTransfer}
                disabled={loading || !selectedBankAccount}
                style={{
                  padding: '12px 32px',
                  borderRadius: 'var(--radius-md)',
                  background: 'linear-gradient(135deg, #0052ff, #0041cc)',
                  color: 'white',
                  border: 'none',
                  fontWeight: 600,
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                {loading ? '⏳ Đang xử lý...' : '✓ Xác nhận chuyển tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantDashboardPage;