import React, { useState, useEffect } from 'react';
import { FiSearch, FiFilter, FiX, FiCheckCircle, FiAlertCircle } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { p2pAPI, bankAPI } from '../../services/api';
import './P2PTradingPage.css';

const P2PTradingPage = () => {
  const { userId } = useAuth();
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
  const [orderType, setOrderType] = useState('buy'); // buy or sell
  const [userSpotBalance, setUserSpotBalance] = useState(0); // User's spot wallet balance
  
  // Payment modal
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [selectedBankAccount, setSelectedBankAccount] = useState('');

  useEffect(() => {
    loadMerchants();
    if (userId) {
      loadMyOrders();
      loadMyBankAccounts();
      loadUserSpotBalance();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadUserSpotBalance = async () => {
    try {
      const walletAPI = await import('../../services/api').then(m => m.walletAPI);
      const response = await walletAPI.getWallets(userId);
      if (response.success && response.data) {
        const spotWallet = response.data.find(w => w.type === 'spot');
        if (spotWallet) {
          setUserSpotBalance(parseFloat(spotWallet.balance || 0));
        }
      }
    } catch (err) {
      console.error('Error loading spot balance:', err);
    }
  };

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

  const handleOpenOrderModal = (merchant, type = 'buy') => {
    setSelectedMerchant(merchant);
    setOrderType(type);
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
        type: orderType, // 'buy' or 'sell'
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

  const handleConfirmRelease = async (order) => {
    const orderType = order.type || 'buy';
    
    // Different confirmation messages based on order type
    const confirmMessage = orderType === 'sell' 
      ? 'Xác nhận bạn đã nhận đủ tiền từ merchant vào tài khoản ngân hàng?\n\nSau khi xác nhận, USDT sẽ được chuyển vào ví merchant và không thể hoàn tác.'
      : 'Xác nhận bạn đã nhận đủ tiền từ merchant và đồng ý mở khóa USDT?';
    
    if (!window.confirm(confirmMessage)) {
      return;
    }

    try {
      setLoading(true);
      setError(null);
      
      const orderId = order.order_id || order.p2p_order_id;
      
      // For sell orders, we need to pass BOTH user_id and merchant_id
      // User confirms the transaction, but backend needs merchant_id to transfer USDT to merchant wallet
      const merchantId = order.merchant_id;
      
      if (!merchantId) {
        setError('Không tìm thấy thông tin merchant');
        setLoading(false);
        return;
      }
      
      const response = await p2pAPI.confirmAndRelease(orderId, userId, merchantId);
      
      if (response.success) {
        const successMessage = orderType === 'sell'
          ? '✅ Đã xác nhận nhận tiền và mở khóa USDT thành công! USDT đã được chuyển vào ví merchant.'
          : '✅ Đã xác nhận và mở khóa USDT thành công!';
        
        setSuccess(successMessage);
        loadMyOrders();
        setTimeout(() => setSuccess(null), 5000);
      } else {
        setError(response.message || 'Không thể xác nhận');
      }
    } catch (err) {
      setError('Lỗi khi xác nhận: ' + (err.response?.data?.message || err.message));
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

      // Calculate VND amount using merchant_price from order (already included in order data from backend)
      const merchantPrice = selectedOrder.merchant_price || selectedOrder.price || 24500;
      const usdtAmount = selectedOrder.unit_numbers || selectedOrder.amount || 0;
      const vndAmount = usdtAmount * merchantPrice;

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
        setSuccess('✅ Đã chuyển khoản thành công! Đang chờ merchant xác nhận và mở khóa USDT...');
        setShowPaymentModal(false);
        loadMyOrders();
        loadMyBankAccounts(); // Reload bank accounts to update balance
        setTimeout(() => setSuccess(null), 5000);
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
      case 'pending': return '#ffa500';
      case 'banked': return '#2196f3';
      case 'matched': return '#2196f3';
      case 'completed': return '#4caf50';
      case 'filled': return '#4caf50';
      case 'cancelled': return '#f44336';
      default: return '#666';
    }
  };

  const getStateText = (state) => {
    switch(state) {
      case 'open': return 'Chờ xử lý';
      case 'pending': return 'Chờ xử lý';
      case 'banked': return '✓ Đã thanh toán';
      case 'matched': return '✓ Đã thanh toán';
      case 'completed': return 'Hoàn thành';
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

              <div className="merchant-action" style={{
                display: 'flex',
                gap: '8px',
                alignItems: 'center'
              }}>
                <button
                  className="btn btn-success"
                  onClick={() => handleOpenOrderModal(merchant, 'buy')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  🛒 Mua USDT
                </button>
                <button
                  className="btn btn-danger"
                  onClick={() => handleOpenOrderModal(merchant, 'sell')}
                  style={{
                    padding: '10px 20px',
                    fontSize: '14px',
                    fontWeight: 600
                  }}
                >
                  💰 Bán USDT
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
              // Use order data from backend (includes merchant info)
              const merchantPrice = order.merchant_price || order.price || 24500;
              const orderAmount = order.unit_numbers || order.amount || 0;
              const vndAmount = orderAmount * merchantPrice;
              const merchantName = order.merchant_username || order.merchant_fullname || 'N/A';
              
              // Debug log to check order data
              console.log('Order data:', {
                id: order.order_id || order.p2p_order_id,
                state: order.state,
                type: order.type,
                status: order.status
              });
              
              return (
                <div key={order.order_id || order.p2p_order_id} className="order-item">
                  {/* Left: Type Badge */}
                  <div className="order-type">
                    <span className={`type-badge ${order.type || 'buy'}`}>
                      {order.type === 'buy' ? 'MUA' : 'BÁN'}
                    </span>
                  </div>

                  {/* Middle: Order Details */}
                  <div className="order-details-grid">
                    <div className="detail-row">
                      <span className="detail-label">Mã đơn:</span>
                      <span className="detail-value">#{order.order_id || order.p2p_order_id}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Merchant:</span>
                      <span className="detail-value">{merchantName}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Số lượng:</span>
                      <span className="detail-value highlight">{parseFloat(orderAmount).toFixed(2)} USDT</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Giá:</span>
                      <span className="detail-value">{parseFloat(merchantPrice).toLocaleString()} VND/USDT</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Tổng tiền:</span>
                      <span className="detail-value total">{vndAmount.toLocaleString()} VND</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Thời gian:</span>
                      <span className="detail-value text-secondary">{new Date(order.created_at).toLocaleString('vi-VN')}</span>
                    </div>
                  </div>

                  {/* Right: Status & Actions */}
                  <div className="order-right">
                    <div className="order-state" style={{
                      color: getStateColor(order.state),
                      fontWeight: 600,
                      marginBottom: '12px',
                      textAlign: 'center'
                    }}>
                      {getStateText(order.state)}
                    </div>
                    
                    <div className="order-actions">
                      {(order.state === 'pending' || order.state === 'open') && (
                        <>
                          {order.type === 'buy' ? (
                            <button 
                              className="btn btn-primary btn-sm btn-transfer"
                              onClick={() => handleOpenPaymentModal(order)}
                              disabled={loading}
                            >
                              💳 Chuyển tiền
                            </button>
                          ) : (
                            <div className="text-info" style={{
                              fontSize: '13px', 
                              textAlign: 'center', 
                              padding: '12px',
                              background: 'rgba(255, 165, 0, 0.1)',
                              border: '1px solid #ffa500',
                              borderRadius: 'var(--radius-md)',
                              color: '#ffa500',
                              fontWeight: 600
                            }}>
                              ⏳ Đợi merchant chuyển tiền vào tài khoản của bạn
                            </div>
                          )}
                          <button 
                            className="btn btn-danger btn-sm"
                            onClick={() => handleCancelOrder(order.order_id || order.p2p_order_id)}
                            disabled={loading}
                          >
                            ❌ Hủy
                          </button>
                        </>
                      )}
                      {order.state === 'banked' && (
                        <>
                          {order.type === 'buy' ? (
                            // For buy orders: User pays, merchant confirms and releases USDT
                            order.merchant_id === parseInt(userId) ? (
                              // Merchant view: Show confirm button
                              <button 
                                className="btn btn-success btn-sm btn-confirm-release"
                                onClick={() => handleConfirmRelease(order)}
                                disabled={loading}
                              >
                                🔓 Xác nhận mở khóa
                              </button>
                            ) : (
                              // User view: Show waiting status
                              <div className="processing-status" style={{
                                padding: '12px',
                                background: 'rgba(5, 196, 107, 0.1)',
                                border: '1px solid #05c46b',
                                borderRadius: 'var(--radius-md)',
                                textAlign: 'center',
                                color: '#05c46b',
                                fontWeight: 600,
                                fontSize: '14px'
                              }}>
                                ⏳ Đợi merchant xác nhận...
                              </div>
                            )
                          ) : (
                            // For sell orders: Merchant pays, user confirms receipt and releases USDT
                            <button 
                              className="btn btn-success btn-sm btn-confirm-release"
                              onClick={() => handleConfirmRelease(order)}
                              disabled={loading}
                              style={{
                                padding: '12px 24px',
                                fontSize: '14px',
                                fontWeight: 600,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '8px',
                                width: '100%'
                              }}
                            >
                              🔓 Xác nhận đã nhận tiền & Mở khóa USDT
                            </button>
                          )}
                        </>
                      )}
                      {order.state === 'completed' && (
                        <div className="completed-status" style={{
                          padding: '12px',
                          background: 'rgba(5, 196, 107, 0.1)',
                          border: '1px solid #05c46b',
                          borderRadius: 'var(--radius-md)',
                          textAlign: 'center',
                          color: '#05c46b',
                          fontWeight: 600,
                          fontSize: '14px'
                        }}>
                          ✅ Đã hoàn thành
                        </div>
                      )}
                      {order.state === 'cancelled' && (
                        <div className="cancelled-status" style={{
                          padding: '12px',
                          background: 'rgba(239, 83, 80, 0.1)',
                          border: '1px solid #ef5350',
                          borderRadius: 'var(--radius-md)',
                          textAlign: 'center',
                          color: '#ef5350',
                          fontWeight: 600,
                          fontSize: '14px'
                        }}>
                          🚫 Đã hủy
                        </div>
                      )}
                    </div>
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
              <h3>{orderType === 'buy' ? '🛒 Mua USDT từ' : '💰 Bán USDT cho'} {selectedMerchant?.username}</h3>
              <button className="modal-close" onClick={() => setShowOrderModal(false)}>
                <FiX />
              </button>
            </div>
            <div className="modal-body">
              {orderType === 'sell' && (
                <div style={{
                  marginBottom: 'var(--spacing-md)',
                  padding: '12px',
                  background: 'rgba(16, 185, 129, 0.1)',
                  border: '1px solid #10b981',
                  borderRadius: 'var(--radius-md)',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center'
                }}>
                  <span style={{color: 'var(--text-secondary)'}}>Số dư USDT khả dụng (Spot):</span>
                  <strong style={{color: '#10b981', fontSize: '16px'}}>{userSpotBalance.toFixed(2)} USDT</strong>
                </div>
              )}
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
          <div className="modal-content" onClick={(e) => e.stopPropagation()} style={{maxWidth: '600px'}}>
            <div className="modal-header">
              <h3>💳 Xác nhận chuyển khoản</h3>
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
                    <strong>#{selectedOrder.order_id || selectedOrder.p2p_order_id}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Merchant:</span>
                    <strong>{selectedOrder.merchant_username || selectedOrder.merchant_fullname || 'N/A'}</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Số lượng:</span>
                    <strong style={{color: 'var(--success-color)'}}>{parseFloat(selectedOrder.unit_numbers || selectedOrder.amount || 0).toFixed(2)} USDT</strong>
                  </div>
                  <div style={{display: 'flex', justifyContent: 'space-between'}}>
                    <span style={{color: 'var(--text-secondary)'}}>Giá:</span>
                    <strong>{parseFloat(selectedOrder.merchant_price || selectedOrder.price || 24500).toLocaleString()} VND/USDT</strong>
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
                      {((selectedOrder.unit_numbers || selectedOrder.amount || 0) * (selectedOrder.merchant_price || selectedOrder.price || 24500)).toLocaleString()} VND
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
                  {myBankAccounts.map((account) => (
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
                      <strong>Số dư khả dụng:</strong> {myBankAccounts.find(acc => acc.account_number === selectedBankAccount)?.account_balance ? parseFloat(myBankAccounts.find(acc => acc.account_number === selectedBankAccount).account_balance).toLocaleString() : 0} VND
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
                    <li>Số tiền sẽ được trừ từ tài khoản ngân hàng của bạn</li>
                    <li>Tiền được chuyển vào tài khoản merchant</li>
                    <li>Merchant xác nhận đã nhận tiền</li>
                    <li>USDT được mở khóa và chuyển vào Spot Wallet của bạn</li>
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
                onClick={handleTransferPayment}
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

export default P2PTradingPage;
