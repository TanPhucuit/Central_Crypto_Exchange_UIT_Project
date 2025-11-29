import { useSelector } from 'react-redux';

/**
 * Custom hook to get current user information
 * Returns user object and helper functions
 */
export const useAuth = () => {
  const { user, isAuthenticated, loading, error } = useSelector((state) => state.auth);

  return {
    user,
    isAuthenticated,
    loading,
    error,
    userId: user?.user_id || null,
    username: user?.username || '',
    email: user?.email || '',
    role: user?.role || 'normal',
    isMerchant: user?.role === 'merchant',
  };
};

/**
 * Get user ID from Redux or localStorage
 * Useful for API calls
 */
export const getUserId = () => {
  const storedUserId = localStorage.getItem('user_id');
  return storedUserId ? parseInt(storedUserId) : null;
};

export default useAuth;
