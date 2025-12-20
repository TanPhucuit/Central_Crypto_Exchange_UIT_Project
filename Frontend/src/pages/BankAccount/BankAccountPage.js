import React, { useState, useEffect } from 'react';
import { FiPlus, FiEdit2, FiTrash2, FiSend } from 'react-icons/fi';
import { useAuth } from '../../hooks/useAuth';
import { bankAPI } from '../../services/api';
import './BankAccountPage.css';

const initialTransferData = {
  fromAccount: '',
  toAccount: '',
  amount: '',
  note: '',
};

const initialAccountData = {
  bank_name: '',
  account_number: '',
  account_name: '',
  branch: '',
};

const BankAccountPage = () => {
  const { userId } = useAuth();
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [transactionsLoading, setTransactionsLoading] = useState(false);
  const [showTransferModal, setShowTransferModal] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [transferData, setTransferData] = useState(initialTransferData);
  const [newAccountData, setNewAccountData] = useState(initialAccountData);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [lookupLoading, setLookupLoading] = useState(false);

  const handleLookupAccount = async (accountNumber, bankName) => {
    if (!accountNumber) return;

    try {
      setLookupLoading(true);
      // Only pass bankName if it has a value
      const response = await bankAPI.lookupAccount(accountNumber, bankName || undefined);

      if (response.success && response.data) {
        setTransferData(prev => ({
          ...prev,
          recipientName: response.data.account_name,
          // If backend returns a bank name and we didn't have one, or to correct it
          toBankName: response.data.bank_name || prev.toBankName
        }));
      } else {
        setTransferData(prev => ({ ...prev, recipientName: '' }));
        // Don't show error immediately on blur if just typing, maybe show small text
      }
    } catch (err) {
      console.error('Lookup failed:', err);
      setTransferData(prev => ({ ...prev, recipientName: '' }));
      // Optional: setTimedError('Không tìm thấy tài khoản');
    } finally {
      setLookupLoading(false);
    }
  };

  const totalBalance = bankAccounts.reduce(
    (sum, account) => sum + parseFloat(account.account_balance || 0),
    0
  );

  useEffect(() => {
    if (userId) {
      loadBankAccounts();
      loadTransactions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const setTimedSuccess = (message) => {
    setSuccess(message);
    setTimeout(() => setSuccess(null), 3500);
  };

  const setTimedError = (message) => {
    setError(message);
    setTimeout(() => setError(null), 4000);
  };

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      setError(null);

      const response = await bankAPI.getAccounts(userId);
      if (response.success && Array.isArray(response.data)) {
        setBankAccounts(response.data);
      } else {
        setBankAccounts([]);
      }
    } catch (err) {
      console.error('Error loading bank accounts:', err);
      setTimedError(err.message || 'Không thể tải danh sách tài khoản ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async () => {
    if (!userId) return;
    try {
      setTransactionsLoading(true);
      const response = await bankAPI.getTransactions(userId, 50);
      if (response.success && Array.isArray(response.data)) {
        setTransactions(response.data);
      } else {
        setTransactions([]);
      }
    } catch (err) {
      console.error('Error loading bank transactions:', err);
    } finally {
      setTransactionsLoading(false);
    }
  };

  const handleAddAccount = () => {
    setShowAddModal(true);
    setNewAccountData(initialAccountData);
  };

  const handleAddAccountSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      const response = await bankAPI.createAccount(
        userId,
        newAccountData.account_number,
        newAccountData.bank_name,
        null // Pass null to use backend default (100,000,000 VND)
      );

      if (response.success) {
        setShowAddModal(false);
        setNewAccountData(initialAccountData);
        setTimedSuccess('Thêm tài khoản ngân hàng thành công');
        loadBankAccounts();
      }
    } catch (err) {
      setTimedError(err.message || 'Không thể thêm tài khoản ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteAccount = async (accountNumber) => {
    if (!window.confirm('Bạn có chắc chắn muốn xóa tài khoản này?')) {
      return;
    }

    try {
      setLoading(true);
      const response = await bankAPI.deleteAccount(userId, accountNumber);
      if (response.success) {
        setTimedSuccess('Đã xóa tài khoản ngân hàng');
        loadBankAccounts();
      }
    } catch (err) {
      setTimedError(err.message || 'Không thể xóa tài khoản ngân hàng');
    } finally {
      setLoading(false);
    }
  };

  const handleEditAccount = () => {
    alert('Chức năng chỉnh sửa sẽ sớm được bổ sung.');
  };

  const handleSetDefault = (accountNumber) => {
    alert(`Chức năng đặt ${accountNumber} làm tài khoản mặc định sẽ sớm được bổ sung.`);
  };

  const handleTransfer = () => {
    if (bankAccounts.length > 0) {
      setTransferData((prev) => ({
        ...prev,
        fromAccount: prev.fromAccount || bankAccounts[0].account_number || '',
      }));
    }
    setShowTransferModal(true);
  };

  const handleTransferSubmit = async (e) => {
    e.preventDefault();

    if (!transferData.fromAccount || !transferData.toAccount) {
      setTimedError('Vui lòng chọn đầy đủ tài khoản nguồn và tài khoản đích');
      return;
    }

    if (transferData.fromAccount === transferData.toAccount) {
      setTimedError('Tài khoản nguồn và đích cần phải khác nhau');
      return;
    }

    const amountValue = parseFloat(transferData.amount);
    if (!amountValue || amountValue <= 0) {
      setTimedError('Số tiền chuyển phải lớn hơn 0');
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await bankAPI.transferFunds(userId, {
        fromAccount: transferData.fromAccount,
        toAccount: transferData.toAccount,
        amount: amountValue,
        note: transferData.note,
      });

      if (response.success) {
        setTimedSuccess('Chuyển khoản thành công');
        setShowTransferModal(false);
        setTransferData(initialTransferData);
        loadBankAccounts();
        loadTransactions();
      } else {
        setTimedError(response.message || 'Không thể thực hiện chuyển khoản');
      }
    } catch (err) {
      setTimedError(err.message || 'Không thể thực hiện chuyển khoản');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (value) =>
    `${Number(value || 0).toLocaleString('vi-VN')} VND`;

  const renderTransaction = (tx) => {
    const isIncoming = tx.type === 'incoming';
    const directionLabel = isIncoming ? '📥 Nhận tiền' : '📤 Chuyển đi';
    const counterpartyAccount = isIncoming ? tx.source_account : tx.target_account;
    
    // Get counterparty info with merchant detection
    const counterpartyRole = isIncoming ? tx.source_role : tx.target_role;
    const counterpartyNameRaw = isIncoming ? tx.source_account_name : tx.target_account_name;
    const counterpartyName = counterpartyRole === 'merchant' 
      ? `${counterpartyNameRaw} (Merchant)` 
      : counterpartyNameRaw || 'Merchant';
    
    const counterpartyBank = isIncoming ? tx.source_bank_name : tx.target_bank_name;
    const prefix = isIncoming ? '+' : '-';
    const note = tx.note?.trim() || 'Không có nội dung';
    const timestamp = tx.timestamp ? new Date(tx.timestamp).toLocaleString('vi-VN') : '--';

    // Find my account info for this transaction
    const myAccount = isIncoming 
      ? bankAccounts.find(acc => acc.account_number === tx.target_account)
      : bankAccounts.find(acc => acc.account_number === tx.source_account);
    
    const myAccountLabel = myAccount 
      ? `${myAccount.bank_name} - ${myAccount.account_number}`
      : (isIncoming ? tx.target_account : tx.source_account);

    return (
      <div key={tx.transaction_id} className="history-item">
        <div className={`history-indicator ${isIncoming ? 'incoming' : 'outgoing'}`} />
        <div className="history-content">
          <div className="history-row">
            <div className="history-title">
              <strong>{directionLabel}</strong>
              <span className="history-id">#{tx.transaction_id}</span>
            </div>
            <span className={`history-amount ${isIncoming ? 'incoming' : 'outgoing'}`}>
              {prefix}{Number(tx.amount || 0).toLocaleString('vi-VN')} VND
            </span>
          </div>
          
          <div className="history-details">
            <div className="history-detail-row">
              <span className="detail-label">{isIncoming ? '📍 Tài khoản nhận:' : '📍 Tài khoản gửi:'}</span>
              <span className="detail-value">{myAccountLabel}</span>
            </div>
            <div className="history-detail-row">
              <span className="detail-label">{isIncoming ? '👤 Người gửi:' : '👤 Người nhận:'}</span>
              <span className="detail-value">{counterpartyName || 'Không rõ'}</span>
            </div>
            <div className="history-detail-row">
              <span className="detail-label">{isIncoming ? '🏦 Ngân hàng gửi:' : '🏦 Ngân hàng nhận:'}</span>
              <span className="detail-value">{counterpartyBank || (counterpartyRole === 'merchant' ? counterpartyNameRaw + ' Bank' : 'Merchant Bank')}</span>
            </div>
            <div className="history-detail-row">
              <span className="detail-label">{isIncoming ? '📋 STK gửi:' : '📋 STK nhận:'}</span>
              <span className="detail-value">{counterpartyAccount || 'Không rõ'}</span>
            </div>
            <div className="history-detail-row">
              <span className="detail-label">🕒 Thời gian:</span>
              <span className="detail-value">{timestamp}</span>
            </div>
          </div>
          
          {note && note !== 'Không có nội dung' && (
            <div className="history-note">
              <strong>💬 Nội dung:</strong> {note}
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="bank-account-page">
      <div className="page-header">
        <div>
          <h1>Tài khoản ngân hàng</h1>
          <p className="text-secondary">Liên kết ngân hàng và chuyển khoản an toàn</p>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      {loading && bankAccounts.length === 0 ? (
        <div className="loading-container">
          <p>Đang tải danh sách tài khoản...</p>
        </div>
      ) : (
        <>
          <div className="bank-hero">
            <div>
              <span className="eyebrow">Tổng số dư liên kết</span>
              <h2>{formatCurrency(totalBalance)}</h2>
              <p className="hero-subtitle">
                {bankAccounts.length > 0
                  ? `${bankAccounts.length} tài khoản đang hoạt động`
                  : 'Chưa có tài khoản nào được liên kết'}
              </p>
            </div>
            <div className="bank-hero-actions">
              <button className="action-chip" onClick={handleTransfer}>
                <FiSend /> Giao dịch
              </button>
              <button className="action-chip ghost" onClick={handleAddAccount}>
                <FiPlus /> Liên kết tài khoản
              </button>
            </div>
          </div>

          <div className="bank-accounts-grid">
            {bankAccounts.length > 0 ? (
              bankAccounts.map((account) => (
                <div key={account.account_number} className="bank-card">
                  {account.isDefault && <div className="default-badge">Mặc định</div>}

                  <div className="bank-header">
                    <div className="bank-logo">
                      {(account.bank_name || 'B').charAt(0).toUpperCase()}
                    </div>
                    <div className="bank-info">
                      <h3>{account.bank_name || 'Ngân hàng'}</h3>
                      <p className="text-secondary">{account.branch || 'Chi nhánh chính'}</p>
                    </div>
                  </div>

                  <div className="bank-details">
                    <div className="detail-row">
                      <span className="detail-label">Chủ tài khoản:</span>
                      <span className="detail-value">{account.account_name || '---'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Số tài khoản:</span>
                      <span className="detail-value">{account.account_number || '---'}</span>
                    </div>
                    <div className="detail-row">
                      <span className="detail-label">Số dư:</span>
                      <span className="detail-value">{formatCurrency(account.account_balance)}</span>
                    </div>
                  </div>

                  <div className="bank-actions">
                    {!account.isDefault && (
                      <button className="action-btn" onClick={() => handleSetDefault(account.account_number)}>
                        Đặt mặc định
                      </button>
                    )}
                    <button className="action-btn" onClick={handleEditAccount}>
                      <FiEdit2 /> Sửa
                    </button>
                    <button
                      className="action-btn danger"
                      onClick={() => handleDeleteAccount(account.account_number)}
                    >
                      <FiTrash2 /> Xóa
                    </button>
                  </div>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <p>Chưa có tài khoản ngân hàng nào</p>
                <p className="text-secondary">Hãy thêm tài khoản để bắt đầu giao dịch</p>
              </div>
            )}

            <div className="add-bank-card" onClick={handleAddAccount}>
              <FiPlus size={40} />
              <span>Liên kết tài khoản mới</span>
            </div>
          </div>

          <div className="bank-history-card-fullwidth">
            <div className="panel-header">
              <div>
                <h3>Lịch sử giao dịch</h3>
                <p className="panel-sub">Theo dõi dòng tiền vào/ra tài khoản ngân hàng</p>
              </div>
              <span className="badge">{transactions.length} giao dịch</span>
            </div>

            {transactionsLoading ? (
              <p className="empty-state">Đang tải lịch sử giao dịch...</p>
            ) : transactions.length === 0 ? (
              <p className="empty-state">Chưa có giao dịch nào</p>
            ) : (
              <div className="history-list">
                {transactions.map(renderTransaction)}
              </div>
            )}
          </div>
        </>
      )}

      {/* Transfer Modal */}
      {showTransferModal && (
        <div className="modal-overlay" onClick={() => setShowTransferModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Chuyển khoản ngân hàng</h3>
              <button className="modal-close" onClick={() => setShowTransferModal(false)}>x</button>
            </div>
            <form onSubmit={handleTransferSubmit} className="transfer-form">
              <div className="form-group">
                <label>Từ tài khoản</label>
                <select
                  className="form-input"
                  value={transferData.fromAccount}
                  onChange={(e) => setTransferData({ ...transferData, fromAccount: e.target.value })}
                  required
                >
                  <option value="">Chọn tài khoản nguồn</option>
                  {bankAccounts.map((acc) => (
                    <option key={acc.account_number} value={acc.account_number}>
                      {acc.bank_name} - {acc.account_number}
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label>Ngân hàng thụ hưởng</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập tên ngân hàng (VD: Vietcombank)"
                  value={transferData.toBankName || ''}
                  onChange={(e) => {
                    setTransferData({ ...transferData, toBankName: e.target.value });
                    // Reset recipient name when bank changes
                    if (transferData.recipientName) {
                      setTransferData(prev => ({ ...prev, recipientName: '' }));
                    }
                  }}
                  onBlur={() => {
                    if (transferData.toAccount && transferData.toBankName) {
                      handleLookupAccount(transferData.toAccount, transferData.toBankName);
                    }
                  }}
                  required
                />
              </div>

              <div className="form-group">
                <label>Số tài khoản thụ hưởng</label>
                <div className="input-wrapper">
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Nhập số tài khoản đích"
                    value={transferData.toAccount}
                    onChange={(e) => {
                      setTransferData({ ...transferData, toAccount: e.target.value, recipientName: '' });
                    }}
                    onBlur={() => {
                      if (transferData.toAccount) {
                        handleLookupAccount(transferData.toAccount, transferData.toBankName);
                      }
                    }}
                    required
                  />
                  {lookupLoading && <span className="input-loading">Đang kiểm tra...</span>}
                </div>
                {transferData.recipientName && (
                  <div className="recipient-info">
                    <span className="label">Người thụ hưởng:</span>
                    <span className="value">{transferData.recipientName}</span>
                  </div>
                )}
              </div>

              <div className="form-group">
                <label>Số tiền</label>
                <input
                  type="number"
                  className="form-input"
                  placeholder="Nhập số tiền (VND)"
                  value={transferData.amount}
                  onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                  required
                  min="0"
                />
              </div>

              <div className="form-group">
                <label>Nội dung chuyển khoản</label>
                <textarea
                  className="form-input"
                  placeholder="Nhập nội dung (tùy chọn)"
                  rows="3"
                  value={transferData.note}
                  onChange={(e) => setTransferData({ ...transferData, note: e.target.value })}
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTransferModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-gradient" disabled={loading || !transferData.recipientName}>
                  <FiSend /> {loading ? 'Đang xử lý...' : 'Chuyển khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Add Bank Account Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content glass-card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm tài khoản ngân hàng</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>x</button>
            </div>
            <form onSubmit={handleAddAccountSubmit} className="transfer-form">
              <div className="form-group">
                <label>Tên ngân hàng</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Vietcombank, Techcombank..."
                  value={newAccountData.bank_name}
                  onChange={(e) => setNewAccountData({ ...newAccountData, bank_name: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Số tài khoản</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Nhập số tài khoản"
                  value={newAccountData.account_number}
                  onChange={(e) => setNewAccountData({ ...newAccountData, account_number: e.target.value })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Tên chủ tài khoản</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="NGUYEN VAN A"
                  value={newAccountData.account_name}
                  onChange={(e) => setNewAccountData({ ...newAccountData, account_name: e.target.value.toUpperCase() })}
                  required
                />
              </div>

              <div className="form-group">
                <label>Chi nhánh</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="VD: Chi nhánh TP.HCM"
                  value={newAccountData.branch}
                  onChange={(e) => setNewAccountData({ ...newAccountData, branch: e.target.value })}
                  required
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary btn-gradient" disabled={loading}>
                  <FiPlus /> {loading ? 'Đang xử lý...' : 'Thêm tài khoản'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default BankAccountPage;
