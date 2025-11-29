import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';

// Layout
import MainLayout from './components/Layout/MainLayout';
import AuthLayout from './components/Layout/AuthLayout';

// Pages
import HomePage from './pages/HomePage';
import LoginPage from './pages/Auth/LoginPage';
import RegisterPage from './pages/Auth/RegisterPage';
import DashboardPage from './pages/Dashboard/DashboardPage';
import WalletPage from './pages/Wallet/WalletPage';
import P2PTradingPage from './pages/Trading/P2PTradingPage';
import SpotTradingPage from './pages/Trading/SpotTradingPage';
import FuturesTradingPage from './pages/Trading/FuturesTradingPage';
import PnLAnalyticsPage from './pages/Trading/PnLAnalyticsPage';
import MarketPage from './pages/Market/MarketPage';
import ProfilePage from './pages/Profile/ProfilePage';
import BankAccountPage from './pages/BankAccount/BankAccountPage';
import TransactionHistoryPage from './pages/Transaction/TransactionHistoryPage';

// Merchant Pages
import MerchantDashboardPage from './pages/Merchant/MerchantDashboardPage';
import MerchantP2PPage from './pages/Merchant/MerchantP2PPage';
import MerchantBankPage from './pages/Merchant/MerchantBankPage';
import MerchantWalletPage from './pages/Merchant/MerchantWalletPage';

function App() {
  const { user, isAuthenticated } = useSelector((state) => state.auth);

  // Protected Route Component
  const ProtectedRoute = ({ children, allowedRoles }) => {
    if (!isAuthenticated) {
      return <Navigate to="/login" replace />;
    }
    
    if (allowedRoles && !allowedRoles.includes(user?.role)) {
      return <Navigate to="/dashboard" replace />;
    }
    
    return children;
  };

  return (
    <Routes>
      {/* Public Routes */}
      <Route element={<AuthLayout />}>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />
      </Route>

      {/* Protected Routes */}
      <Route element={<MainLayout />}>
        <Route path="/" element={<HomePage />} />
        <Route path="/market" element={<MarketPage />} />
        
        {/* User Routes */}
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/wallet"
          element={
            <ProtectedRoute>
              <WalletPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trading/p2p"
          element={
            <ProtectedRoute>
              <P2PTradingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trading/spot"
          element={
            <ProtectedRoute>
              <SpotTradingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trading/futures"
          element={
            <ProtectedRoute>
              <FuturesTradingPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/trading/pnl-analytics"
          element={
            <ProtectedRoute>
              <PnLAnalyticsPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/profile"
          element={
            <ProtectedRoute>
              <ProfilePage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/bank-accounts"
          element={
            <ProtectedRoute>
              <BankAccountPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/transactions"
          element={
            <ProtectedRoute>
              <TransactionHistoryPage />
            </ProtectedRoute>
          }
        />

        {/* Merchant Routes */}
        <Route
          path="/merchant/dashboard"
          element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantDashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/p2p"
          element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantP2PPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/bank"
          element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantBankPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/merchant/wallet"
          element={
            <ProtectedRoute allowedRoles={['merchant']}>
              <MerchantWalletPage />
            </ProtectedRoute>
          }
        />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default App;
