import React, { useState, useEffect } from 'react';
import './MerchantDashboardPage.css';
import { 
  FiUsers, 
  FiDollarSign, 
  FiTrendingUp, 
  FiCheckCircle,
  FiCheck,
  FiClock,
  FiX
} from 'react-icons/fi';
import { merchantAPI, p2pAPI } from '../../services/api';

const MerchantDashboardPage = () => {
  const [stats, setStats] = useState(null);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadDashboardData();
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
    if (order.state === 'matched') return { text: 'Đã thanh toán', class: 'paid', icon: FiCheckCircle };
    if (order.state === 'open') return { text: 'Chờ thanh toán', class: 'waiting', icon: FiClock };
    if (order.state === 'filled') return { text: 'Đã hoàn thành', class: 'completed', icon: FiCheck };
    if (order.state === 'cancelled') return { text: 'Đã hủy', class: 'cancelled', icon: FiX };
    return { text: order.state, class: '', icon: FiClock };
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
                        {order.state === 'matched' ? (
                          <button 
                            className="btn btn-primary btn-small"
                            onClick={() => handleConfirmRelease(order.order_id)}
                            disabled={loading}
                          >
                            <FiCheck /> Xác nhận & Mở khóa
                          </button>
                        ) : order.state === 'filled' ? (
                          <span className="text-muted">Đã hoàn thành</span>
                        ) : order.state === 'cancelled' ? (
                          <span className="text-muted">Đã hủy</span>
                        ) : (
                          <span className="text-muted">Chờ thanh toán</span>
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
    </div>
  );
};

export default MerchantDashboardPage;