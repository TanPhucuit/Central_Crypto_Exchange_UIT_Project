import React, { useState, useEffect } from 'react';
import { FiCreditCard, FiPlus, FiTrash2, FiSend } from 'react-icons/fi';
import { bankAPI, merchantAPI } from '../../services/api';
import './MerchantBankPage.css';

const MerchantBankPage = () => {
  const [bankAccounts, setBankAccounts] = useState([]);
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [newAccount, setNewAccount] = useState({
    account_number: '',
    bank_name: '',
    account_holder: '',
    account_balance: 0,
  });

  const userId = localStorage.getItem('user_id');

  const totalBalance = bankAccounts.reduce(
    (sum, account) => sum + parseFloat(account.account_balance || 0),
    0
  );

  useEffect(() => {
    if (userId) {
      loadBankAccounts();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  useEffect(() => {
    if (bankAccounts.length > 0) {
      loadTransactions(bankAccounts);
    } else {
      setTransactions([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bankAccounts]);

  const loadBankAccounts = async () => {
    try {
      setLoading(true);
      const response = await bankAPI.getAccounts(userId);
      setBankAccounts(response.data || []);
    } catch (err) {
      console.error('Failed to load bank accounts:', err);
      setError('Không thể tải danh sách tài khoản.');
    } finally {
      setLoading(false);
    }
  };

  const loadTransactions = async (accounts = bankAccounts) => {
    try {
      const response = await merchantAPI.getTransactions();
      const merchantNumbers = accounts.map((acc) => acc.account_number);
      const processed = (response.data || []).map((tx) => {
        const isOutgoing = merchantNumbers.includes(tx.source_account_number);
        return {
          ...tx,
          transaction_type: isOutgoing ? 'outgoing' : 'incoming',
          amount: parseFloat(tx.transaction_amount || 0),
          created_at: tx.ts || tx.created_at,
        };
      });
      setTransactions(processed);
    } catch (err) {
      console.error('Failed to load transactions:', err);
    }
  };

  const handleAddAccount = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    try {
      await bankAPI.createAccount(
        userId,
        newAccount.account_number,
        newAccount.bank_name,
        parseFloat(newAccount.account_balance) || 0
      );
      setSuccess('Thêm tài khoản thành công!');
      setShowAddModal(false);
      setNewAccount({
        account_number: '',
        bank_name: '',
        account_holder: '',
        account_balance: 0,
      });
      loadBankAccounts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể thêm tài khoản');
      setTimeout(() => setError(''), 3000);
    }
  };

  const handleDeleteAccount = async (accountNumber) => {
    if (!window.confirm('Bạn có chắc muốn xóa tài khoản này?')) return;

    try {
      await bankAPI.deleteAccount(userId, accountNumber);
      setSuccess('Xóa tài khoản thành công!');
      loadBankAccounts();
      setTimeout(() => setSuccess(''), 3000);
    } catch (err) {
      setError(err.response?.data?.message || 'Không thể xóa tài khoản');
      setTimeout(() => setError(''), 3000);
    }
  };

  if (loading && bankAccounts.length === 0) {
    return (
      <div className="merchant-bank-page">
        <div className="page-header">
          <h1>Tài khoản ngân hàng</h1>
          <p className="text-secondary">Đang tải dữ liệu...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="merchant-bank-page">
      <div className="page-header">
        <div>
          <h1>Tài khoản ngân hàng</h1>
          <p className="text-secondary">Quản lý tài khoản và lịch sử giao dịch</p>
        </div>
        <button className="btn btn-primary" onClick={() => setShowAddModal(true)}>
          <FiPlus /> Thêm tài khoản
        </button>
      </div>

      <div className="merchant-bank-hero">
        <div>
          <span className="eyebrow">Tổng số dư VND</span>
          <h2>{totalBalance.toLocaleString()} VND</h2>
          <p className="hero-subtitle">
            {bankAccounts.length > 0
              ? `${bankAccounts.length} tài khoản đang hoạt động`
              : 'Chưa có tài khoản kết nối'}
          </p>
        </div>
        <div className="merchant-wallet-actions">
          <button className="action-chip">
            <FiSend /> Yêu cầu rút tiền
          </button>
          <button className="action-chip ghost" onClick={() => setShowAddModal(true)}>
            Liên kết tài khoản
          </button>
        </div>
      </div>

      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="bank-accounts-section">
        <h3>Tài khoản đang liên kết</h3>
        {bankAccounts.length === 0 ? (
          <div className="empty-state">
            <p>Chưa có tài khoản nào</p>
            <p className="text-secondary">Nhan "Thêm tài khoản" de bat dau</p>
          </div>
        ) : (
          <div className="bank-accounts-list">
            {bankAccounts.map((account) => (
              <div key={account.account_number} className="bank-account-card">
                <div className="bank-account-header">
                  <FiCreditCard className="bank-icon" />
                  <div>
                    <div className="bank-name">{account.bank_name}</div>
                    <div className="account-number">{account.account_number}</div>
                  </div>
                  {account.is_default && <span className="default-badge">Mặc định</span>}
                </div>
                <div className="bank-account-body">
                  <div className="account-holder">{account.account_holder}</div>
                  <div className="account-balance">
                    {parseFloat(account.account_balance || 0).toLocaleString()} VND
                  </div>
                </div>
                <div className="bank-account-actions">
                  <button
                    className="btn btn-danger btn-small"
                    onClick={() => handleDeleteAccount(account.account_number)}
                  >
                    <FiTrash2 /> Xoa
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="transaction-history-section">
        <h3>Lịch sử giao dịch</h3>
        <div className="transactions-list">
          {transactions.length === 0 ? (
            <p className="text-muted">Chưa có giao dịch nào</p>
          ) : (
            transactions.map((tx) => (
              <div key={tx.transaction_id} className="transaction-item">
                <div className={`transaction-icon ${tx.transaction_type}`}>
                  {tx.transaction_type === 'incoming' ? '+' : '-'}
                </div>
                <div className="transaction-details">
                  <div className="transaction-type">
                    {tx.transaction_type === 'incoming' ? 'Nhận tiền' : 'Chuyển đi'}
                  </div>
                  <div className="transaction-time">
                    {new Date(tx.created_at).toLocaleString('vi-VN')}
                  </div>
                  <p className="transaction-note">{tx.note || 'Chuyển khoản merchant'}</p>
                </div>
                <div className={`transaction-amount ${tx.transaction_type}`}>
                  {tx.transaction_type === 'incoming' ? '+' : '-'}
                  {tx.amount.toLocaleString()} VND
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Thêm tài khoản ngan hang</h3>
              <button className="modal-close" onClick={() => setShowAddModal(false)}>
                x
              </button>
            </div>
            <form onSubmit={handleAddAccount}>
              <div className="form-group">
                <label>Ngân hàng</label>
                <input
                  type="text"
                  value={newAccount.bank_name}
                  onChange={(e) => setNewAccount({ ...newAccount, bank_name: e.target.value })}
                  placeholder="VD: Vietcombank"
                  required
                />
              </div>
              <div className="form-group">
                <label>Số tài khoản</label>
                <input
                  type="text"
                  value={newAccount.account_number}
                  onChange={(e) => setNewAccount({ ...newAccount, account_number: e.target.value })}
                  placeholder="VD: 1234567890"
                  required
                />
              </div>
              <div className="form-group">
                <label>Chủ tài khoản</label>
                <input
                  type="text"
                  value={newAccount.account_holder}
                  onChange={(e) => setNewAccount({ ...newAccount, account_holder: e.target.value })}
                  placeholder="VD: NGUYEN VAN A"
                  required
                />
              </div>
              <div className="form-group">
                <label>Số dư ban đầu (VND)</label>
                <input
                  type="number"
                  value={newAccount.account_balance}
                  onChange={(e) => setNewAccount({ ...newAccount, account_balance: e.target.value })}
                  placeholder="0"
                  min="0"
                />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-secondary" onClick={() => setShowAddModal(false)}>
                  Hủy
                </button>
                <button type="submit" className="btn btn-primary">
                  <FiPlus /> Thêm tài khoản
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default MerchantBankPage;
