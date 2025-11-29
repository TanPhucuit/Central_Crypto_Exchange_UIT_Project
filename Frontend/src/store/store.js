import { configureStore } from '@reduxjs/toolkit';
import authReducer from '../features/auth/authSlice';
import walletReducer from '../features/wallet/walletSlice';
import marketReducer from '../features/market/marketSlice';
import tradingReducer from '../features/trading/tradingSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    wallet: walletReducer,
    market: marketReducer,
    trading: tradingReducer,
  },
});
