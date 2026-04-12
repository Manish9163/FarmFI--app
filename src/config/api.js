// Centralized API configuration
const BASE_IP = '192.168.0.108';
const BASE_PORT = '5000';

export const API_BASE = `http://${BASE_IP}:${BASE_PORT}/api/v1`;
export const ADMIN_API = `${API_BASE}/admin`;
export const AUTH_API = `${API_BASE}/auth`;
export const MARKETPLACE_API = `${API_BASE}/marketplace`;
export const WEATHER_API = `${API_BASE}/weather`;
export const WORKER_API = `${API_BASE}/workers`;
export const FARM_API = `${API_BASE}/farm`;
