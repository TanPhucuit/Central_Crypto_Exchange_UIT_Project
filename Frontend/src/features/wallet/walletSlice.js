import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  wallets: [],
  selectedWallet: null,
  balance: {
    total: 0,
    available: 0,
    locked: 0,
  },
  loading: false,
  error: null,
};

const walletSlice = createSlice({
  name: 'wallet',
  initialState,
  reducers: {
    setWallets: (state, action) => {
      state.wallets = action.payload;
    },
    selectWallet: (state, action) => {
      state.selectedWallet = action.payload;
    },
    updateBalance: (state, action) => {
      state.balance = action.payload;
    },
    setLoading: (state, action) => {
      state.loading = action.payload;
    },
    setError: (state, action) => {
      state.error = action.payload;
    },
  },
});

export const { setWallets, selectWallet, updateBalance, setLoading, setError } = walletSlice.actions;
export default walletSlice.reducer;
