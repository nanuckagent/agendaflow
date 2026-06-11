/**
 * Authentication hook
 */

import { useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { useAuthStore } from '@/stores/auth-store.js';

export function useAuth() {
  const navigate = useNavigate();
  const { user, token, isAuthenticated, setUser, logout } = useAuthStore();

  // Check if user is authenticated
  const isLoggedIn = !!token && !!user;

  // Require authentication - redirect to home if not authenticated
  const requireAuth = () => {
    if (!isLoggedIn) {
      navigate({ to: '/' });
      throw new Error('Authentication required');
    }
  };

  // Login with Google
  const loginWithGoogle = () => {
    window.location.href = `${import.meta.env.VITE_API_URL || ''}/v1/auth/google`;
  };

  // Logout
  const handleLogout = () => {
    logout();
    navigate({ to: '/' });
  };

  return {
    user,
    token,
    isLoggedIn,
    isAuthenticated,
    setUser,
    logout: handleLogout,
    loginWithGoogle,
    requireAuth,
  };
}
