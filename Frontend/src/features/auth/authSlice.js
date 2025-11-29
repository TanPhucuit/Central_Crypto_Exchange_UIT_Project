import { createSlice } from '@reduxjs/toolkit';

// Load user from localStorage on init
const loadUserFromStorage = () => {
  try {
    const userId = localStorage.getItem('user_id');
    const username = localStorage.getItem('username');
    const email = localStorage.getItem('email');
    const role = localStorage.getItem('role');
    
    if (userId && username) {
      return {
        user_id: parseInt(userId),
        username,
        email,
        role: role || 'normal',
      };
    }
  } catch (error) {
    console.error('Error loading user from storage:', error);
  }
  return null;
};

const initialState = {
  user: loadUserFromStorage(),
  isAuthenticated: !!loadUserFromStorage(),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart: (state) => {
      state.loading = true;
      state.error = null;
    },
    loginSuccess: (state, action) => {
      state.loading = false;
      state.isAuthenticated = true;
      state.user = action.payload;
      
      // Save to localStorage
      if (action.payload.user_id) {
        localStorage.setItem('user_id', action.payload.user_id.toString());
        localStorage.setItem('username', action.payload.username || '');
        localStorage.setItem('email', action.payload.email || '');
        localStorage.setItem('role', action.payload.role || 'normal');
      }
    },
    loginFailure: (state, action) => {
      state.loading = false;
      state.error = action.payload;
    },
    logout: (state) => {
      state.user = null;
      state.isAuthenticated = false;
      
      // Clear localStorage
      localStorage.removeItem('user_id');
      localStorage.removeItem('username');
      localStorage.removeItem('email');
      localStorage.removeItem('role');
    },
    updateProfile: (state, action) => {
      state.user = { ...state.user, ...action.payload };
      
      // Update localStorage
      if (action.payload.email) {
        localStorage.setItem('email', action.payload.email);
      }
      if (action.payload.username) {
        localStorage.setItem('username', action.payload.username);
      }
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, updateProfile } = authSlice.actions;
export default authSlice.reducer;
