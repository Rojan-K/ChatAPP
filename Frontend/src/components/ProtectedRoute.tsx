import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/authContext';
import { isTokenExpired } from '../utils/jwtUtils';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, accessToken } = useAuth();
  const location = useLocation();

  // Check if user is authenticated and token is valid
  const isTokenValid = accessToken && !isTokenExpired(accessToken);
  
  if (!isAuthenticated || !isTokenValid) {
    // Redirect to login page with return URL
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return <>{children}</>;
};

// For routes that should be accessible only when not authenticated (like login, register)
export const PublicRoute: React.FC<ProtectedRouteProps> = ({ children }) => {
  const { isAuthenticated, accessToken } = useAuth();
  const location = useLocation();

  const isTokenValid = accessToken && !isTokenExpired(accessToken);
  
  if (isAuthenticated && isTokenValid) {
    // Redirect to home page or the page they were trying to access
    const from = location.state?.from?.pathname || '/home';
    return <Navigate to={from} replace />;
  }

  return <>{children}</>;
};
