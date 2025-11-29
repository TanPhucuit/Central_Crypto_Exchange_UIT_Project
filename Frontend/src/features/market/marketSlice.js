import { createSlice } from '@reduxjs/toolkit';

const initialState = {
  markets: [],
  selectedMarket: null,
  ticker: {},
  orderBook: {
    bids: [],
    asks: [],
  },
  recentTrades: [],
  loading: false,
};

const marketSlice = createSlice({
  name: 'market',
  initialState,
  reducers: {
    setMarkets: (state, action) => {
      state.markets = action.payload;
    },
    selectMarket: (state, action) => {
      state.selectedMarket = action.payload;
    },
    updateTicker: (state, action) => {
      state.ticker = action.payload;
    },
    updateOrderBook: (state, action) => {
      state.orderBook = action.payload;
    },
    updateRecentTrades: (state, action) => {
      state.recentTrades = action.payload;
    },
  },
});

export const { setMarkets, selectMarket, updateTicker, updateOrderBook, updateRecentTrades } = marketSlice.actions;
export default marketSlice.reducer;
