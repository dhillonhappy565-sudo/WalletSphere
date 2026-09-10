import React, { createContext, useContext, useState, useEffect } from 'react';
import API from '../services/api';

const AuthContext = createContext();

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('walletsphere_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });
  const [token, setToken] = useState(() => localStorage.getItem('walletsphere_token') || null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const verifyUser = async () => {
      if (token) {
        try {
          const res = await API.get('/auth/profile');
          setUser(res.data.data);
          localStorage.setItem('walletsphere_user', JSON.stringify(res.data.data));
        } catch (error) {
          console.error('Failed to verify stored session:', error);
          logout();
        }
      }
      setLoading(false);
    };

    verifyUser();
  }, []);

  const login = async (email, password) => {
    const res = await API.post('/auth/login', { email, password });
    const { token: authToken, ...userData } = res.data.data;
    
    setToken(authToken);
    setUser(userData);
    localStorage.setItem('walletsphere_token', authToken);
    localStorage.setItem('walletsphere_user', JSON.stringify(userData));
    return userData;
  };

  const register = async (userData) => {
    const res = await API.post('/auth/register', userData);
    const { token: authToken, ...userInfo } = res.data.data;

    setToken(authToken);
    setUser(userInfo);
    localStorage.setItem('walletsphere_token', authToken);
    localStorage.setItem('walletsphere_user', JSON.stringify(userInfo));
    return userInfo;
  };

  const logout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem('walletsphere_token');
    localStorage.removeItem('walletsphere_user');
  };

  const updateUserProfile = async (updatedData) => {
    const res = await API.put('/auth/profile', updatedData);
    const { token: authToken, ...userInfo } = res.data.data;

    setUser(userInfo);
    localStorage.setItem('walletsphere_user', JSON.stringify(userInfo));
    if (authToken) {
      setToken(authToken);
      localStorage.setItem('walletsphere_token', authToken);
    }
    return userInfo;
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        isAuthenticated: !!token,
        login,
        register,
        logout,
        updateUserProfile,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
