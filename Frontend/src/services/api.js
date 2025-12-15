import axios from 'axios';

// Base URL for API - Change this to your backend URL
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000/api';

const MAX_RETRY_ATTEMPTS = 2;
const RETRY_DELAY_MS = 800;

const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Create axios instance with default config
const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // Increased to 30s to handle TiDB latency
});

// Add response interceptor for error handling + lightweight retries
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const config = error.config || {};
    const method = config.method ? config.method.toLowerCase() : 'get';
    const isReadRequest = ['get', 'head'].includes(method);
    const isTimeout = error.code === 'ECONNABORTED';
    const isNetworkError = !error.response && (isTimeout || error.message === 'Network Error');

    if (isNetworkError && isReadRequest) {
      config.__retryCount = config.__retryCount || 0;
      if (config.__retryCount < MAX_RETRY_ATTEMPTS) {
        config.__retryCount += 1;
        await delay(RETRY_DELAY_MS * config.__retryCount);
        return api(config);
      }
    }

    if (error.response) {
      // Server responded with error status (4xx, 5xx)
      console.error('API Error:', error.response.data);
      console.error('Status:', error.response.status);
      console.error('URL:', error.config?.url);
      return Promise.reject(error.response.data);
    }

    if (error.request) {
      // Request made but no response received
      console.error('Network Error:', error.message);
      console.error('Request URL:', error.config?.url);
      console.error('Base URL:', error.config?.baseURL);
      console.error('Full URL:', error.config?.baseURL + error.config?.url);
      console.error('Error Code:', error.code);
      return Promise.reject({
        success: false,
        message: 'Không thể kết nối đến server. Vui lòng kiểm tra kết nối mạng.'
      });
    }

    // Something else happened in setting up the request
    console.error('Error:', error.message);
    return Promise.reject({
      success: false,
      message: error.message || 'Đã xảy ra lỗi không xác định'
    });
  }
);

// ============= AUTH ENDPOINTS =============
export const authAPI = {
  // Register new user
  register: async (userData) => {
    const response = await api.post('/auth/register', userData);
    return response.data;
  },

  // Login
  login: async (credentials) => {
    const response = await api.post('/auth/login', {
      login: credentials.username, // Backend expects 'login' field
      password: credentials.password,
    });
    return response.data;
  },

  // Get current user profile
  getProfile: async (userId) => {
    const response = await api.get(`/auth/me?user_id=${userId}`);
    return response.data;
  },
};

// ============= USER ENDPOINTS =============
export const userAPI = {
  // Get user profile
  getProfile: async (userId) => {
    const response = await api.get(`/user/profile?user_id=${userId}`);
    return response.data;
  },

  // Update user profile
  updateProfile: async (userId, profileData) => {
    const response = await api.put('/user/profile', {
      user_id: userId,
      ...profileData,
    });
    return response.data;
  },

  // Change password
  changePassword: async (userId, oldPassword, newPassword) => {
    const response = await api.post('/user/change-password', {
      user_id: userId,
      old_password: oldPassword,
      new_password: newPassword,
    });
    return response.data;
  },
};

// ============= WALLET ENDPOINTS =============
export const walletAPI = {
  // Get all wallets for user
  getWallets: async (userId) => {
    const response = await api.get(`/wallet?user_id=${userId}`);
    return response.data;
  },

  // Get wallet by currency or type
  getWalletByCurrency: async (userId, currency) => {
    const response = await api.get(`/wallet/currency/${currency}?user_id=${userId}`);
    return response.data;
  },

  // Alias for getWalletByCurrency (type can be 'spot', 'future', etc.)
  getWalletByType: async (userId, type) => {
    const response = await api.get(`/wallet/currency/${type}?user_id=${userId}`);
    return response.data;
  },

  // Create new wallet
  createWallet: async (userId, currency) => {
    const response = await api.post('/wallet', {
      user_id: userId,
      currency: currency, // 'USDT', 'BTC', 'ETH', etc.
    });
    return response.data;
  },

  // Internal Transfer between currencies
  internalTransfer: async (userId, { fromType, toType, amount, note }) => {
    const response = await api.post('/wallet/transfer', {
      user_id: userId,
      from_type: fromType,
      to_type: toType,
      amount,
      note: note || ''
    });
    return response.data;
  },

  // Get wallet with properties (assets)
  getWalletWithProperties: async (userId, walletId) => {
    const response = await api.get(`/wallet/${walletId}/properties?user_id=${userId}`);
    return response.data;
  },
};

// ============= TRADING ENDPOINTS =============
export const tradingAPI = {
  // Get spot transaction history
  getSpotHistory: async (userId, walletId) => {
    const response = await api.get(`/trading/spot/${walletId}/history?user_id=${userId}`);
    return response.data;
  },

  // Execute spot buy
  spotBuy: async (userId, walletId, symbol, unitNumbers, indexPrice) => {
    const response = await api.post('/trading/spot/buy', {
      user_id: userId,
      wallet_id: walletId,
      symbol: symbol,
      unit_numbers: unitNumbers,
      index_price: indexPrice,
    });
    return response.data;
  },

  // Execute spot sell
  spotSell: async (userId, walletId, symbol, unitNumbers, indexPrice) => {
    const response = await api.post('/trading/spot/sell', {
      user_id: userId,
      wallet_id: walletId,
      symbol: symbol,
      unit_numbers: unitNumbers,
      index_price: indexPrice,
    });
    return response.data;
  },

  // Open a futures position (market only)
  openFuturePosition: async ({ userId, walletId, symbol, side, margin, entryPrice, leverage }) => {
    const response = await api.post('/trading/futures/open', {
      user_id: userId,
      wallet_id: walletId,
      symbol,
      side,
      amount: margin,
      entry_price: entryPrice,
      leverage,
    });
    return response.data;
  },

  // Close a futures position
  closeFuturePosition: async ({ orderId, userId, exitPrice }) => {
    const response = await api.post(`/trading/futures/${orderId}/close`, {
      user_id: userId,
      exit_price: exitPrice,
    });
    return response.data;
  },

  // Fetch all open futures positions for the user
  getOpenFutures: async (userId) => {
    const response = await api.get(`/trading/futures/open?user_id=${userId}`);
    return response.data;
  },

  // Fetch futures history for a specific future wallet
  getFutureHistory: async (userId, walletId) => {
    const response = await api.get(`/trading/futures/${walletId}/history?user_id=${userId}`);
    return response.data;
  },
};

// ============= P2P ENDPOINTS =============
export const p2pAPI = {
  // Get all open P2P orders
  getOrders: async () => {
    const response = await api.get('/p2p/orders');
    return response.data;
  },

  // Get user's P2P orders
  getMyOrders: async (userId) => {
    const response = await api.get(`/p2p/my-orders?user_id=${userId}`);
    return response.data;
  },

  // Get list of merchants
  getMerchants: async () => {
    const response = await api.get('/p2p/merchants');
    return response.data;
  },

  // Create new P2P order
  createOrder: async (orderData) => {
    const response = await api.post('/p2p/orders', orderData);
    return response.data;
  },

  // Cancel order
  cancelOrder: async (orderId, userId) => {
    const response = await api.post(`/p2p/orders/${orderId}/cancel?user_id=${userId}`);
    return response.data;
  },

  // Transfer payment for order (User transfers VND for buy orders)
  transferPayment: async (orderId, paymentData) => {
    const response = await api.post(`/p2p/orders/${orderId}/transfer`, paymentData);
    return response.data;
  },

  // Merchant transfers payment for sell orders
  merchantTransferPayment: async (orderId, paymentData) => {
    const response = await api.post(`/p2p/orders/${orderId}/merchant-transfer`, paymentData);
    return response.data;
  },

  // Confirm and release USDT (for both merchant and user)
  // For buy orders: merchant_id confirms and releases USDT to user
  // For sell orders: user_id confirms and releases USDT to merchant
  confirmAndRelease: async (orderId, userId, merchantId) => {
    const response = await api.post(`/p2p/orders/${orderId}/confirm`, {
      user_id: userId,
      merchant_id: merchantId || userId // If merchantId not provided, use userId for backward compatibility
    });
    return response.data;
  },

  // Update P2P order
  updateOrder: async (orderId, updateData) => {
    const response = await api.put(`/p2p/orders/${orderId}`, updateData);
    return response.data;
  },
};

// ============= BANK ACCOUNT ENDPOINTS =============
export const bankAPI = {
  // Get all bank accounts
  getAccounts: async (userId) => {
    const response = await api.get(`/bank?user_id=${userId}`);
    return response.data;
  },

  // Create bank account
  createAccount: async (userId, accountNumber, bankName, accountBalance = 0) => {
    const response = await api.post('/bank', {
      user_id: userId,
      account_number: accountNumber,
      bank_name: bankName,
      account_balance: accountBalance,
    });
    return response.data;
  },

  // Transfer funds between linked bank accounts
  transferFunds: async (userId, { fromAccount, toAccount, amount }) => {
    const response = await api.post('/bank/transfer', {
      user_id: userId,
      from_account: fromAccount,
      to_account: toAccount,
      amount,
    });
    return response.data;
  },

  // Fetch recent bank transfer history
  getTransactions: async (userId, limit = 50) => {
    const response = await api.get(`/bank/transactions?user_id=${userId}&limit=${limit}`);
    return response.data;
  },

  // Delete bank account
  deleteAccount: async (userId, accountNumber) => {
    const response = await api.delete(`/bank/${accountNumber}?user_id=${userId}`);
    return response.data;
  },

  // Lookup bank account
  lookupAccount: async (accountNumber, bankName) => {
    const response = await api.post('/bank/lookup', {
      account_number: accountNumber,
      bank_name: bankName,
    });
    return response.data;
  },
};

// ============= MERCHANT ENDPOINTS =============
export const merchantAPI = {
  // Get merchant dashboard stats
  getDashboardStats: async (merchantId) => {
    const userId = merchantId || localStorage.getItem('user_id');
    const response = await api.get(`/merchant/dashboard/stats?merchant_id=${userId}`);
    return response.data;
  },

  // Get all merchant's orders
  getOrders: async (merchantId) => {
    const userId = merchantId || localStorage.getItem('user_id');
    const response = await api.get(`/merchant/orders?merchant_id=${userId}`);
    return response.data;
  },

  // Get merchant's transactions
  getTransactions: async (merchantId) => {
    const userId = merchantId || localStorage.getItem('user_id');
    const response = await api.get(`/merchant/transactions?merchant_id=${userId}`);
    return response.data;
  },

  // Get merchant's bank accounts
  getBankAccounts: async (merchantId) => {
    const userId = merchantId || localStorage.getItem('user_id');
    const response = await api.get(`/merchant/bank-accounts?merchant_id=${userId}`);
    return response.data;
  },

  // Confirm and release USDT (alias to p2pAPI.confirmAndRelease)
  confirmAndRelease: async (orderId, merchantId) => {
    const userId = merchantId || localStorage.getItem('user_id');
    const response = await api.post(`/p2p/orders/${orderId}/confirm`, {
      merchant_id: userId
    });
    return response.data;
  },

  // Update merchant USDT price
  updatePrice: async (merchantId, price) => {
    const userId = merchantId || localStorage.getItem('user_id');
    const response = await api.post('/merchant/price', {
      merchant_id: userId,
      price: price
    });
    return response.data;
  },
};

// ============= DASHBOARD ENDPOINTS =============
export const dashboardAPI = {
  // Get dashboard summary with calculated assets
  getSummary: async (userId) => {
    const response = await api.get(`/dashboard/summary?user_id=${userId}`);
    return response.data;
  },
};

// ============= HEALTH CHECK =============
export const healthAPI = {
  check: async () => {
    const response = await api.get('/health');
    return response.data;
  },

  checkDatabase: async () => {
    const response = await api.get('/health/database');
    return response.data;
  },
};

export default api;
