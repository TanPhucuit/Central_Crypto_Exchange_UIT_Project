import React, { useState, useEffect } from 'react';
import { useDispatch } from 'react-redux';
import { FiUser, FiLock, FiShield } from 'react-icons/fi';
import { updateProfile } from '../../features/auth/authSlice';
import { useAuth } from '../../hooks/useAuth';
import { userAPI } from '../../services/api';
import './ProfilePage.css';

const ProfilePage = () => {
  const { userId } = useAuth();
  const dispatch = useDispatch();
  const [activeTab, setActiveTab] = useState('profile');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  const [profileData, setProfileData] = useState({
    username: '',
    email: '',
    phoneNumber: '',
    fullName: '',
  });

  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  });

  // Load profile data on mount
  useEffect(() => {
    if (userId) {
      loadProfileData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId]);

  const loadProfileData = async () => {
    try {
      const response = await userAPI.getProfile(userId);

      if (response.success && response.data) {
        setProfileData({
          username: response.data.username || '',
          email: response.data.email || '',
          phoneNumber: response.data.phone_number || response.data.phoneNumber || '',
          fullName: response.data.full_name || response.data.fullName || '',
        });
      }
    } catch (err) {
      console.error('Error loading profile:', err);
      setError(err.message || 'Không thể tải thông tin profile');
    }
  };

  const handleProfileUpdate = async (e) => {
    e.preventDefault();
    try {
      setError(null);
      setSuccess(null);

      const response = await userAPI.updateProfile(userId, {
        full_name: profileData.fullName,
        phone_number: profileData.phoneNumber,
      });

      if (response.success) {
        // Update Redux state
        dispatch(updateProfile({
          username: profileData.username,
          email: profileData.email,
          phone_number: profileData.phoneNumber,
          full_name: profileData.fullName,
        }));
        setSuccess('Cập nhật thông tin thành công!');
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.message || 'Không thể cập nhật thông tin');
    }
  };

  const handlePasswordChange = async (e) => {
    e.preventDefault();

    if (passwordData.newPassword !== passwordData.confirmPassword) {
      setError('Mật khẩu xác nhận không khớp!');
      return;
    }

    if (passwordData.newPassword.length < 6) {
      setError('Mật khẩu mới phải có ít nhất 6 ký tự!');
      return;
    }

    try {
      setError(null);
      setSuccess(null);

      const response = await userAPI.changePassword(
        userId,
        passwordData.currentPassword,
        passwordData.newPassword
      );

      if (response.success) {
        setSuccess('Đổi mật khẩu thành công!');
        setPasswordData({ currentPassword: '', newPassword: '', confirmPassword: '' });
        setTimeout(() => setSuccess(null), 3000);
      }
    } catch (err) {
      setError(err.message || 'Không thể đổi mật khẩu');
    }
  };

  return (
    <div className="profile-page">
      <div className="page-header">
        <h1>Tài khoản của tôi</h1>
        <p className="text-secondary">Quản lý thông tin cá nhân và bảo mật</p>
      </div>

      {/* Success/Error Messages */}
      {success && (
        <div className="alert alert-success">
          ✓ {success}
        </div>
      )}
      {error && (
        <div className="alert alert-danger">
          ⚠️ {error}
        </div>
      )}

      <div className="profile-layout">
        <div className="profile-sidebar">
          <button
            className={`sidebar-tab ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => { setActiveTab('profile'); setError(null); setSuccess(null); }}
          >
            <FiUser /> Thông tin cá nhân
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'password' ? 'active' : ''}`}
            onClick={() => { setActiveTab('password'); setError(null); setSuccess(null); }}
          >
            <FiLock /> Đổi mật khẩu
          </button>
          <button
            className={`sidebar-tab ${activeTab === 'security' ? 'active' : ''}`}
            onClick={() => { setActiveTab('security'); setError(null); setSuccess(null); }}
          >
            <FiShield /> Bảo mật
          </button>
        </div>

        <div className="profile-content">
          {activeTab === 'profile' && (
            <div className="content-section">
              <h2>Thông tin cá nhân</h2>
              <form onSubmit={handleProfileUpdate} className="profile-form">
                <div className="form-group">
                  <label>Tên đăng nhập</label>
                  <input
                    type="text"
                    value={profileData.username}
                    onChange={(e) => setProfileData({ ...profileData, username: e.target.value })}
                    className="form-input"
                    disabled
                  />
                  <span className="form-hint">Không thể thay đổi tên đăng nhập</span>
                </div>

                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    className="form-input"
                  />
                </div>

                <div className="form-group">
                  <label>Số điện thoại</label>
                  <input
                    type="tel"
                    value={profileData.phoneNumber}
                    onChange={(e) => setProfileData({ ...profileData, phoneNumber: e.target.value })}
                    className="form-input"
                    placeholder="Nhập số điện thoại"
                  />
                </div>

                <div className="form-group">
                  <label>Họ và tên</label>
                  <input
                    type="text"
                    value={profileData.fullName}
                    onChange={(e) => setProfileData({ ...profileData, fullName: e.target.value })}
                    className="form-input"
                    placeholder="Nhập họ và tên"
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Cập nhật thông tin
                </button>
              </form>
            </div>
          )}

          {activeTab === 'password' && (
            <div className="content-section">
              <h2>Đổi mật khẩu</h2>
              <form onSubmit={handlePasswordChange} className="profile-form">
                <div className="form-group">
                  <label>Mật khẩu hiện tại</label>
                  <input
                    type="password"
                    value={passwordData.currentPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, currentPassword: e.target.value })}
                    className="form-input"
                    placeholder="Nhập mật khẩu hiện tại"
                  />
                </div>

                <div className="form-group">
                  <label>Mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordData.newPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, newPassword: e.target.value })}
                    className="form-input"
                    placeholder="Nhập mật khẩu mới"
                  />
                  <span className="form-hint">Tối thiểu 8 ký tự</span>
                </div>

                <div className="form-group">
                  <label>Xác nhận mật khẩu mới</label>
                  <input
                    type="password"
                    value={passwordData.confirmPassword}
                    onChange={(e) => setPasswordData({ ...passwordData, confirmPassword: e.target.value })}
                    className="form-input"
                    placeholder="Nhập lại mật khẩu mới"
                  />
                </div>

                <button type="submit" className="btn btn-primary">
                  Đổi mật khẩu
                </button>
              </form>
            </div>
          )}

          {activeTab === 'security' && (
            <div className="content-section">
              <h2>Bảo mật tài khoản</h2>
              <div className="security-list">
                <div className="security-item">
                  <div className="security-info">
                    <h4>Xác thực 2 bước (2FA)</h4>
                    <p className="text-secondary">Tăng cường bảo mật cho tài khoản của bạn</p>
                  </div>
                  <button className="btn btn-secondary">Kích hoạt</button>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h4>Xác thực Email</h4>
                    <p className="text-secondary">Email của bạn đã được xác thực</p>
                  </div>
                  <span className="status-badge verified">Đã xác thực</span>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h4>Xác thực số điện thoại</h4>
                    <p className="text-secondary">Thêm số điện thoại để tăng bảo mật</p>
                  </div>
                  <button className="btn btn-secondary">Xác thực</button>
                </div>

                <div className="security-item">
                  <div className="security-info">
                    <h4>Thiết bị đăng nhập</h4>
                    <p className="text-secondary">Quản lý các thiết bị đã đăng nhập</p>
                  </div>
                  <button className="btn btn-secondary">Xem</button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
