import React from 'react';
import { Outlet } from 'react-router-dom';
import './AuthLayout.css';

const AuthLayout = () => {
  return (
    <div className="auth-layout">
      <div className="auth-container">
        <div className="auth-branding">
          <h1 className="auth-logo">Cexora</h1>
          <p className="auth-tagline">CryptoExchange Oracle - Sàn giao dịch tiền điện tử hàng đầu</p>
        </div>
        <div className="auth-content">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
