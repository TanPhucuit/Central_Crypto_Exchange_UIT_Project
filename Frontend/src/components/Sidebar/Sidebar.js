import React from 'react';
import { NavLink } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { 
  FiHome, 
  FiTrendingUp, 
  FiDollarSign, 
  FiPieChart,
  FiCreditCard,
  FiUser,
  FiClock,
  FiLayers
} from 'react-icons/fi';
import './Sidebar.css';

const Sidebar = () => {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  const userMenuItems = [
    { path: '/dashboard', icon: FiHome, label: 'Dashboard' },
    { path: '/wallet', icon: FiDollarSign, label: 'Ví của tôi' },
    { path: '/trading/spot', icon: FiTrendingUp, label: 'Giao dịch Spot' },
    { path: '/trading/futures', icon: FiPieChart, label: 'Giao dịch Futures' },
    { path: '/trading/p2p', icon: FiLayers, label: 'Giao dịch P2P' },
    { path: '/bank-accounts', icon: FiCreditCard, label: 'Tài khoản NH' },
    { path: '/transactions', icon: FiClock, label: 'Lịch sử GD' },
    { path: '/profile', icon: FiUser, label: 'Tài khoản' },
  ];

  const merchantMenuItems = [
    { path: '/merchant/dashboard', icon: FiHome, label: 'Dashboard & P2P' },
    { path: '/merchant/bank', icon: FiCreditCard, label: 'Tài khoản NH' },
    { path: '/merchant/wallet', icon: FiDollarSign, label: 'Ví của tôi' },
  ];

  const menuItems = user?.role === 'merchant' ? merchantMenuItems : userMenuItems;

  if (!isAuthenticated) return null;

  return (
    <aside className="sidebar">
      <nav className="sidebar-nav">
        {menuItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            className={({ isActive }) => 
              `sidebar-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon size={20} />
            <span>{item.label}</span>
          </NavLink>
        ))}
      </nav>
    </aside>
  );
};

export default Sidebar;
