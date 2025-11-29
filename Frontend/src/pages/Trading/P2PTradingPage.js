import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { p2pAPI, bankAPI } from '../../services/api';
import './P2PTradingPage.css';

const P2PTradingPage = () => {
  const { userId } = useAuth();
  const [activeTab, setActiveTab] = useState('buy'); // buy or sell
  const [merchants, setMerchants] = useState([]);
  const [myOrders, setMyOrders] = useState([]);
  const [myBankAccounts, setMyBankAccounts] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  
  // Order creation modal
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [selectedMerchant, setSelectedMerchant] = useState(null);
  const [orderAmount, setOrderAmount] = useState('');
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');

  useEffect(() => {
    loadMerchants();
    if (userId) {
      loadMyOrders();
      loadMyBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadMerchants = async () => {
    try {
      const response = await p2pAPI.getMerchants();
      if (response.success && response.data) {
        setMerchants(response.data);
      }
    } catch (err) {
      console.error('Error loading merchants:', err);
    }
  };

  const loadMyOrders = async () => {
    try {
      const response = await p2pAPI.getMyOrders(userId);
      if (response.success && response.data) {
        setMyOrders(response.data);
      }
    } catch (err) {
      console.error('Error loading my orders:', err);
    }
  };

  const loadMyBankAccounts = async () => {
    try {
      const response = await bankAPI.getAccounts(userId);
      if (response.success && response.data) {
        setMyBankAccounts(response.data);
      }
    } catch (err) {
      console.error('Error loading bank accounts:', err);
    }
  };

  const handleOpenOrderModal = (merchant) => {
    setSelectedMerchant(merchant);
    setShowOrderModal(true);
    setOrderAmount('');
    setError(null);
  };

  const handleCreateOrder = async () => {
    if (!orderAmount || parseFloat(orderAmount) <= 0) {
      setError('Vui lòng nhập số lượng hợp lệ');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const response = await p2pAPI.createOrder({
        user_id: userId,
        merchant_id: selectedMerchant.user_id,
        type: activeTab, // 'buy' or 'sell'
        unit_numbers: parseFloat(orderAmount)
      });

      if (response.success) {
        setSuccess('Đơn hàng đã được tạo thành công!');
        setShowOrderModal(false);
        loadMyOrders();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Không thể tạo đơn hàng');
      }
    } catch (err) {
      setError('Lỗi khi tạo đơn hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleCancelOrder = async (orderId) => {
    if (!window.confirm('Bạn có chắc muốn hủy đơn hàng này?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await p2pAPI.cancelOrder(orderId, userId);
      
      if (response.success) {
        setSuccess('Đơn hàng đã được hủy');
        loadMyOrders();
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Không thể hủy đơn hàng');
      }
    } catch (err) {
      setError('Lỗi khi hủy đơn hàng: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const handleOpenPaymentModal = (order) => {
    setSelectedOrder(order);
    setShowPaymentModal(true);
    setSelectedBankAccount('');
    setError(null);
  };

  const handleTransferPayment = async () => {
    if (!selectedBankAccount) {
      setError('Vui lòng chọn tài khoản ngân hàng');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      // Get selected bank account info
      const bankAccount = myBankAccounts.find(acc => acc.account_number === selectedBankAccount);
      if (!bankAccount) {
        setError('Không tìm thấy thông tin tài khoản');
        return;
      }

      // Calculate VND amount
      const merchant = merchants.find(m => m.user_id === selectedOrder.merchant_id);
      const vndAmount = selectedOrder.unit_numbers * (merchant?.usdt_price || 24500);

      // Check balance
      if (parseFloat(bankAccount.account_balance) < vndAmount) {
        setError(`Số dư không đủ. Số dư hiện tại: ${parseFloat(bankAccount.account_balance).toLocaleString()} VND, cần: ${vndAmount.toLocaleString()} VND`);
        return;
      }

      // Use order_id instead of p2p_order_id
      const orderId = selectedOrder.order_id || selectedOrder.p2p_order_id;
      if (!orderId) {
        setError('Không tìm thấy ID đơn hàng');
        console.error('Selected order:', selectedOrder);
        return;
      }

      const response = await p2pAPI.transferPayment(orderId, {
        user_id: userId,
        source_account: selectedBankAccount,
        amount: vndAmount
      });

      if (response.success) {
        setSuccess('Đã chuyển khoản thành công! Đang chờ merchant xác nhận...');
        setShowPaymentModal(false);
        loadMyOrders();
        loadMyBankAccounts(); // Reload bank accounts to update balance
        setTimeout(() => setSuccess(null), 3000);
      } else {
        setError(response.message || 'Không thể chuyển khoản');
      }
    } catch (err) {
      setError('Lỗi khi chuyển khoản: ' + (err.response?.data?.message || err.message));
    } finally {
      setLoading(false);
    }
  };

  const getStateColor = (state) => {
    switch(state) {
      case 'open': return '#ffa500';
      case 'matched': return '#2196f3';
      case 'filled': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const getStateText = (state) => {
    switch(state) {
      case 'open': return 'Chờ xử lý';
      case 'matched': return 'Đang xử lý';
      case 'filled': return 'Hoàn thành';
      case 'cancelled': return 'Đã hủy';
      default: return state;
    }
  };

  return (
    <div className="p2p-trading-page">
      <div className="page-header">
        <h1>Giao dịch P2P</h1>
        <p className="text-secondary">Mua bán trực tiếp với Merchant</p>
      </div>

      {error && (
        <div className="alert alert-error">
          <FiAlertCircle /> {error}
          <button onClick={() => setError(null)}><FiX /></button>
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          <FiCheckCircle /> {success}
          <button onClick={() => setSuccess(null)}><FiX /></button>
        </div>
      )}

      <div className="trading-controls">
        <div className="tab-buttons">
          <button
            className={`tab-btn ${activeTab === 'buy' ? 'active' : ''}`}
            onClick={() => setActiveTab('buy')}
          >
            Mua
          </button>
          <button
            className={`tab-btn ${activeTab === 'sell' ? 'active' : ''}`}
            onClick={() => setActiveTab('sell')}
          >
            Bán
          </button>
        </div>

        <div className="filters">
          <button className="filter-btn">
            <FiFilter /> Bộ lọc
          </button>

          <div className="search-box">
            <FiSearch />
            <input type="text" placeholder="Tìm kiếm merchant..." />
          </div>
        </div>
      </div>

      <div className="merchants-list">
        <div className="list-header">
          <div className="header-col">Merchant</div>
          <div className="header-col">Giá USDT (VND)</div>
          <div className="header-col">Hành động</div>
        </div>

        {merchants.length === 0 ? (
          <div className="empty-state">
            <p>Không có merchant nào</p>
          </div>
        ) : (
          merchants.map((merchant) => (
            <div key={merchant.user_id} className="merchant-item">
              <div className="merchant-info">
                <div className="merchant-name">{merchant.fullname || merchant.username}</div>
                <div className="merchant-stats">
                  <span>{merchant.email}</span>
                </div>
              </div>

              <div className="merchant-price">
                <div className="price">{(merchant.usdt_price || 24500).toLocaleString()} VND</div>
              </div>

              <div className="merchant-action">
                <button
                  className={`btn ${activeTab === 'buy' ? 'btn-success' : 'btn-danger'}`}
                  onClick={() => handleOpenOrderModal(merchant)}
                >
                  {activeTab === 'buy' ? 'Mua' : 'Bán'} USDT
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <div className="my-orders-section">
        <h3>Đơn hàng của tôi</h3>
        <div className="orders-list">
          {myOrders.length === 0 ? (
            <div className="empty-state">
              <p>Bạn chưa có đơn hàng nào</p>
            </div>
          ) : (
            myOrders.map((order) => {
              const merchant = merchants.find(m => m.user_id === order.merchant_id);
              const vndAmount = order.unit_numbers * (merchant?.usdt_price || 24500);
              
              return (
                <div key={order.order_id} className="order-item">
                  <div className="order-info">
                    <div className="order-type">
                      <span className={`type-badge ${order.type}`}>
                        {order.type === 'buy' ? 'Mua' : 'Bán'}
                      </span>
                    </div>
                    <div className="order-details">
                      <div>Số lượng: <strong>{order.unit_numbers} USDT</strong></div>
                      <div>Giá trị: <strong>{vndAmount.toLocaleString()} VND</strong></div>
                      <div>Merchant: <strong>{merchant?.username || 'N/A'}</strong></div>
                    </div>
                    <div className="order-state" style={{color: getStateColor(order.state)}}>
                      {getStateText(order.state)}
                    </div>
                  </div>
                  <div className="order-actions">
                    {order.state === 'open' && (
                      <>
                        {order.type === 'buy' && (
                          <button 
                            className="btn btn-primary btn-sm"
                            onClick={() => handleOpenPaymentModal(order)}
                            disabled={loading}
                          >
                            Chuyển tiền
                          </button>
                        )}
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={() => handleCancelOrder(order.order_id)}
                          disabled={loading}
                        >
                          Hủy
                        </button>
                      </>
                    )}
                    {order.state === 'matched' && (
                      <span className="text-info">Đang chờ merchant xác nhận...</span>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Order Creation Modal */}
      {showOrderModal && (
        <div className="modal-overlay" onClick={() => setShowOrderModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>{activeTab === 'buy' ? 'Mua' : 'Bán'} USDT từ {selectedMerchant?.username}</h3>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Giá USDT</label>
                <input 
                  type="text" 
                  value={`${(selectedMerchant?.usdt_price || 24500).toLocaleString()} VND`}
                  disabled 
                  className="form-control"
                />
              </div>
              <div className="form-group">
                <label>Số lượng USDT</label>
                <input 
                  type="number" 
                  value={orderAmount}
                  onChange={(e) => setOrderAmount(e.target.value)}
                  placeholder="Nhập số lượng USDT"
                  className="form-control"
                  min="1"
                  step="0.01"
                />
              </div>
              {orderAmount && (
                <div className="amount-preview">
                  <strong>Tổng thanh toán:</strong> {(parseFloat(orderAmount) * (selectedMerchant?.usdt_price || 24500)).toLocaleString()} VND
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowOrderModal(false)}>
                Hủy
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleCreateOrder}
                disabled={loading || !orderAmount}
              >
                {loading ? 'Đang xử lý...' : 'Tạo đơn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && selectedOrder && (
        <div className="modal-overlay" onClick={() => setShowPaymentModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chuyển tiền thanh toán</h3>
              <button className="modal-close" onClick={() => setShowPaymentModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              <div className="payment-info">
                <p><strong>Đơn hàng:</strong> #{selectedOrder.order_id}</p>
                <p><strong>Số lượng:</strong> {selectedOrder.unit_numbers} USDT</p>
                <p><strong>Số tiền:</strong> {(selectedOrder.unit_numbers * (merchants.find(m => m.user_id === selectedOrder.merchant_id)?.usdt_price || 24500)).toLocaleString()} VND</p>
              </div>
              <div className="form-group">
                <label>Chọn tài khoản ngân hàng của bạn</label>
                <select 
                  value={selectedBankAccount}
                  onChange={(e) => setSelectedBankAccount(e.target.value)}
                  className="form-control"
                >
                  <option value="">-- Chọn tài khoản --</option>
                  {myBankAccounts.map((account) => (
                    <option key={account.account_number} value={account.account_number}>
                      {account.bank_name} - {account.account_number} (Số dư: {parseFloat(account.account_balance).toLocaleString()} VND)
                    </option>
                  ))}
                </select>
              </div>
              {selectedBankAccount && (
                <div className="balance-info" style={{marginTop: '10px', padding: '10px', background: '#f5f5f5', borderRadius: '4px'}}>
                  <p style={{margin: 0}}>
                    <strong>Số dư khả dụng:</strong> {myBankAccounts.find(acc => acc.account_number === selectedBankAccount)?.account_balance ? parseFloat(myBankAccounts.find(acc => acc.account_number === selectedBankAccount).account_balance).toLocaleString() : 0} VND
                  </p>
                </div>
              )}
              <div className="alert alert-info">
                <FiAlertCircle /> Tiền sẽ được chuyển từ tài khoản của bạn đến merchant. Merchant sẽ xác nhận và mở khóa USDT cho bạn.
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                Hủy
              </button>
              <button 
                className="btn btn-primary" 
                onClick={handleTransferPayment}
                disabled={loading || !selectedBankAccount}
              >
                {loading ? 'Đang xử lý...' : 'Xác nhận chuyển tiền'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default P2PTradingPage;
