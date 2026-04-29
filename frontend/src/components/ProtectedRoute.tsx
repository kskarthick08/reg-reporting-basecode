import { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuthStore } from '@/store/authStore';
import { authService } from '@/services/authService';
import { Loader } from './Loader';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
  const { isAuthenticated, token, clearAuth, setAuth } = useAuthStore();
  const [isValidating, setIsValidating] = useState(true);
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    const validateAuth = async () => {
      // If not authenticated, no need to validate
      if (!isAuthenticated || !token) {
        setIsValidating(false);
        setIsValid(false);
        return;
      }

      try {
        // Verify token is still valid by fetching current user
        const user = await authService.getCurrentUser();
        
        // Update store with fresh user data
        setAuth(user, token);
        setIsValid(true);
      } catch (error) {
        // Token is invalid or expired, clear auth
        console.error('Token validation failed:', error);
        clearAuth();
        setIsValid(false);
      } finally {
        setIsValidating(false);
      }
    };

    validateAuth();
  }, [isAuthenticated, token, clearAuth, setAuth]);

  // Show loader while validating token
  if (isValidating) {
    return <Loader />;
  }

  // Redirect to login if not valid
  if (!isValid) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
};
