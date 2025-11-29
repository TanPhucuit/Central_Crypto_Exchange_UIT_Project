import React, { useState, useEffect } from 'react';
import './MerchantP2PPage.css';
import { FiCheck, FiClock, FiCheckCircle, FiX } from 'react-icons/fi';
import { merchantAPI, p2pAPI } from '../../services/api';

const MerchantP2PPage = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    loadOrders();
  }, []);

  const loadOrders = async () => {
    try {
      setLoading(true);
      const response = await merchantAPI.getOrders();
      console.log('Merchant orders:', response);
      setOrders(response.data || []);
    } catch (err) {
      console.error('Failed to load orders:', err);
      setError('Không thể tải danh sách đơn hàng');
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
      loadOrders();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xác nhận đơn hàng');
      setTimeout(() => setError(''), 3000);
    } finally {
      setLoading(false);
    }
  };

  const getPaymentStatus = (order) => {
    // matched = đã thanh toán, open = chờ thanh toán
    if (order.state === 'matched') return { text: 'Đã thanh toán', class: 'paid', icon: FiCheckCircle };
    if (order.state === 'open') return { text: 'Chờ thanh toán', class: 'waiting', icon: FiClock };
    if (order.state === 'filled') return { text: 'Đã hoàn thành', class: 'completed', icon: FiCheck };
    if (order.state === 'cancelled') return { text: 'Đã hủy', class: 'cancelled', icon: FiX };
    return { text: order.state, class: '', icon: FiClock };
  };

  if (loading && orders.length === 0) {
    return (
      <div className="merchant-p2p-page">
        <div className="page-header">
          <h1>Quản lý P2P</h1>
          <p className="text-secondary">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-p2p-page">
      <div className="page-header">
        <h1>Quản lý đơn hàng P2P</h1>
        <p className="text-secondary">Quản lý tất cả đơn hàng P2P của bạn</p>
      </div>

      {error && (
        <div className="alert alert-danger">
          <FiX /> {error}
          <button onClick={() => setError('')} className="alert-close">×</button>
        </div>
      )}
      
      {success && (
        <div className="alert alert-success">
          <FiCheck /> {success}
          <button onClick={() => setSuccess('')} className="alert-close">×</button>
        </div>
      )}

      <div className="orders-table-container">
        <table className="orders-table">
          <thead>
            <tr>
              <th>Mã đơn</th>
              <th>Người dùng</th>
              <th>Loại</th>
              <th>Số lượng</th>
              <th>Tổng tiền</th>
              <th>Trạng thái thanh toán</th>
              <th>Thời gian</th>
              <th>Thao tác</th>
            </tr>
          </thead>
          <tbody>
            {orders.length === 0 ? (
              <tr>
                <td colSpan="8" className="text-center">Không có đơn hàng</td>
              </tr>
            ) : (
              orders.map(order => {
                const paymentStatus = getPaymentStatus(order);
                const StatusIcon = paymentStatus.icon;
                
                return (
                  <tr key={order.order_id}>
                    <td><strong>#{order.order_id}</strong></td>
                    <td>{order.user_username || 'N/A'}</td>
                    <td>
                      <span className={`type-badge ${order.type}`}>
                        {order.type === 'buy' ? 'Mua' : 'Bán'}
                      </span>
                    </td>
                    <td>{order.amount} USDT</td>
                    <td>{parseFloat(order.total).toLocaleString()} VND</td>
                    <td>
                      <span className={`status-badge ${paymentStatus.class}`}>
                        <StatusIcon size={14} /> {paymentStatus.text}
                      </span>
                    </td>
                    <td>{new Date(order.created_at).toLocaleString('vi-VN')}</td>
                    <td>
                      {order.state === 'matched' && (
                        <button 
                          className="btn btn-success btn-small"
                          onClick={() => handleConfirmRelease(order.order_id)}
                          disabled={loading}
                        >
                          <FiCheck /> Xác nhận mở khóa
                        </button>
                      )}
                      {order.state === 'filled' && (
                        <span className="text-success">✓ Đã hoàn thành</span>
                      )}
                      {order.state === 'open' && (
                        <span className="text-muted">Chờ thanh toán</span>
                      )}
                      {order.state === 'cancelled' && (
                        <span className="text-danger">Đã hủy</span>
                      )}
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default MerchantP2PPage;
