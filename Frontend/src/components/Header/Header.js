import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSelector, useDispatch } from 'react-redux';
import { FiBell, FiUser, FiLogOut } from 'react-icons/fi';
import { logout } from '../../features/auth/authSlice';
import './Header.css';

const Header = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
  };

  return (
    <header className="header">
      <div className="header-container">
        <Link to="/" className="header-logo">
          <h2>Cexora</h2>
        </Link>

        <nav className="header-nav">
          <Link to="/market" className="nav-link">Thị trường</Link>
          <Link to="/trading/spot" className="nav-link">Spot</Link>
          <Link to="/trading/futures" className="nav-link">Futures</Link>
          <Link to="/trading/p2p" className="nav-link">P2P</Link>
        </nav>

        <div className="header-actions">
          {isAuthenticated ? (
            <>
              <button className="header-icon-btn">
                <FiBell size={20} />
              </button>
              <div className="header-user">
                <Link to="/profile" className="header-icon-btn">
                  <FiUser size={20} />
                  <span className="user-name">{user?.username}</span>
                </Link>
                <button className="header-icon-btn" onClick={handleLogout}>
                  <FiLogOut size={20} />
                </button>
              </div>
            </>
          ) : (
            <div className="header-auth-buttons">
              <Link to="/login" className="btn btn-secondary">Đăng nhập</Link>
              <Link to="/register" className="btn btn-primary">Đăng ký</Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};

export default Header;
