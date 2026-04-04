import React, { createContext, useContext, useState } from 'react';
import axios from 'axios';
import { AUTH_API } from '../config/api';

export const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  const API_URL = AUTH_API;

  const login = async (email, password) => {
    if (!email || !password) {
      return { success: false, error: 'Email and password are required' };
    }
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/login`, { email, password });
      
      if (response.data.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      
      setUser({ ...response.data.user, token: response.data.token });
      setLoading(false);
      return { 
        ...response.data, 
        requiresOtp: response.data.requires_otp 
      };
    } catch (err) {
      setLoading(false);
      const errMessage = err.response?.data?.error || `Connection Error: ${err.message}`;
      return { success: false, error: errMessage };
    }
  };

  const verifyOtp = async (email, otp) => {
    if (!otp) return { success: false, error: 'OTP is required' };
    setLoading(true);
    try {
      const response = await axios.post(`${API_URL}/verify-otp`, { email, otp });
      if (response.data.token) {
        axios.defaults.headers.common['Authorization'] = `Bearer ${response.data.token}`;
      }
      setUser({ ...response.data.user, token: response.data.token });
      setLoading(false);
      return response.data;
    } catch (err) {
      setLoading(false);
      return { success: false, error: err.response?.data?.error || 'Invalid OTP' };
    }
  };

  const resendOtp = async (email) => {
    try {
      const response = await axios.post(`${API_URL}/resend-otp`, { email });
      return response.data;
    } catch (err) {
      return { success: false, error: err.response?.data?.error || 'Failed to resend OTP' };
    }
  };

  const logout = () => {
    delete axios.defaults.headers.common['Authorization'];
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, verifyOtp, resendOtp, logout }}>
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
