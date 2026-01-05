import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';


interface User {
  Id: number;
  Fullname: string;
  Email: string;
  profilePic?: string;
}

interface AuthContextType {
  user: User | null;
  accessToken: string | null;
  refreshToken: string | null;
  isAuthenticated: boolean;
  login: (userData: User, accessToken: string, refreshToken: string) => void;
  logout: () => void;
  setTokens: (accessToken: string, refreshToken: string) => void;
  updateUser: (userData: Partial<User>) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

interface AuthProviderProps {
  children: ReactNode;
}

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [refreshToken, setRefreshToken] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  // Load auth state from localStorage on mount
  useEffect(() => {
    console.log('=== AUTH CONTEXT LOADING ===');
    const storedAccessToken = localStorage.getItem('accessToken');
    const storedRefreshToken = localStorage.getItem('refreshToken');
    const storedUser = localStorage.getItem('user');
    
    console.log('Stored accessToken:', storedAccessToken ? 'Exists' : 'Missing');
    console.log('Stored refreshToken:', storedRefreshToken ? 'Exists' : 'Missing');
    console.log('Stored user raw:', storedUser);

    if (storedAccessToken && storedRefreshToken && storedUser) {
      try {
        const userData = JSON.parse(storedUser);
        console.log('Parsed userData:', userData);
        console.log('User ID from stored data:', userData.Id);
        console.log('User Fullname from stored data:', userData.Fullname);
        console.log('User Email from stored data:', userData.Email);
        
        // If user ID is missing, extract it from JWT token
        if (!userData.Id && storedAccessToken) {
          console.log('User ID missing from stored data, extracting from JWT token');
          try {
            // Decode JWT token to get user ID
            const tokenPayload = JSON.parse(atob(storedAccessToken.split('.')[1]));
            console.log('JWT token payload:', tokenPayload);
            
            if (tokenPayload.uid) {
              console.log('Found user ID in JWT token:', tokenPayload.uid);
              userData.Id = tokenPayload.uid;
              
              // Update localStorage with corrected user data
              localStorage.setItem('user', JSON.stringify(userData));
              console.log('Updated localStorage with user ID:', userData);
            } else {
              console.log('No user ID found in JWT token payload');
            }
          } catch (jwtError) {
            console.error('Error decoding JWT token:', jwtError);
          }
        }
        
        setUser(userData);
        setAccessToken(storedAccessToken);
        setRefreshToken(storedRefreshToken);
        setIsAuthenticated(true);
        console.log('Auth state loaded successfully, final user ID:', userData.Id);
      } catch (error) {
        console.error('Error parsing stored user data:', error);
        // Clear corrupted data
        localStorage.removeItem('accessToken');
        localStorage.removeItem('refreshToken');
        localStorage.removeItem('user');
      }
    } else {
      console.log('Missing auth data in localStorage');
    }
    console.log('=== END AUTH CONTEXT LOADING ===');
  }, []);

  // Listen for token refresh events
  useEffect(() => {
    const handleTokenRefreshed = (event: CustomEvent) => {
      const { accessToken: newAccessToken, refreshToken: newRefreshToken } = event.detail;
      setAccessToken(newAccessToken);
      setRefreshToken(newRefreshToken);
    };

    window.addEventListener('tokenRefreshed', handleTokenRefreshed as EventListener);
    return () => {
      window.removeEventListener('tokenRefreshed', handleTokenRefreshed as EventListener);
    };
  }, []);

  const login = (userData: User, accessToken: string, refreshToken: string) => {
    console.log('=== AUTH LOGIN DEBUG ===');
    console.log('userData received:', userData);
    console.log('User ID being stored:', userData.Id);
    console.log('User Fullname being stored:', userData.Fullname);
    console.log('User Email being stored:', userData.Email);
    
    setUser(userData);
    setAccessToken(accessToken);
    setRefreshToken(refreshToken);
    setIsAuthenticated(true);
    
    // Store in localStorage
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
    localStorage.setItem('user', JSON.stringify(userData));
    
    console.log('User data stored in localStorage:', JSON.stringify(userData));
    console.log('=== END AUTH LOGIN DEBUG ===');
  };

  const logout = () => {
    setUser(null);
    setAccessToken(null);
    setRefreshToken(null);
    setIsAuthenticated(false);
    
    // Clear localStorage
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  };

  const setTokens = (newAccessToken: string, newRefreshToken: string) => {
    setAccessToken(newAccessToken);
    setRefreshToken(newRefreshToken);
    
    // Update localStorage
    localStorage.setItem('accessToken', newAccessToken);
    localStorage.setItem('refreshToken', newRefreshToken);
  };

  const updateUser = async (userData: Partial<User>) => {
    if (!user) {
      throw new Error('No user is currently logged in');
    }

    // In a real application, you would make an API call here to update the user data
    // For now, we'll just update the local state
    const updatedUser = { ...user, ...userData };
    setUser(updatedUser);
    
    // Update localStorage
    localStorage.setItem('user', JSON.stringify(updatedUser));
    
    // Simulate API call delay
    await new Promise(resolve => setTimeout(resolve, 500));
  };

  const value: AuthContextType = {
    user,
    accessToken,
    refreshToken,
    isAuthenticated,
    login,
    logout,
    setTokens,
    updateUser,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
};