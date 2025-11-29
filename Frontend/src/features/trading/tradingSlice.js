import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  activeOrders: [],
  orderHistory: [],
  tradeHistory: [],
  positions: [],
  loading: false,
  error: null,
};

const tradingSlice = createSlice({
  name: 'trading',
  initialState,
  reducers: {
    setActiveOrders: (state, action) => {
      state.activeOrders = action.payload;
    },
    setOrderHistory: (state, action) => {
      state.orderHistory = action.payload;
    },
    setTradeHistory: (state, action) => {
      state.tradeHistory = action.payload;
    },
    setPositions: (state, action) => {
      state.positions = action.payload;
    },
    addOrder: (state, action) => {
      state.activeOrders.unshift(action.payload);
    },
    cancelOrder: (state, action) => {
      state.activeOrders = state.activeOrders.filter(order => order.id !== action.payload);
    },
  },
});

export const { setActiveOrders, setOrderHistory, setTradeHistory, setPositions, addOrder, cancelOrder } = tradingSlice.actions;
export default tradingSlice.reducer;
