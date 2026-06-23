import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

// Create a centralized Axios instance
const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to attach auth token
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => {
    return { data: response.data, error: null };
  },
  (error) => {
    const message = error.response?.data?.error || error.message || 'API request failed';
    return { data: null, error: message };
  }
);

// Auth Token management
export const getAuthToken = () => localStorage.getItem('auth_token');
export const setAuthToken = (token) => {
  if (token) {
    localStorage.setItem('auth_token', token);
  } else {
    localStorage.removeItem('auth_token');
  }
};

// Auth API
export const auth = {
  register: async (email, password, fullName) => {
    return apiClient.post('/auth/register', { email, password, full_name: fullName });
  },
  login: async (email, password) => {
    const { data, error } = await apiClient.post('/auth/login', { email, password });
    if (data && data.token) {
      setAuthToken(data.token);
    }
    return { data, error };
  },
  logout: () => {
    setAuthToken(null);
  },
  verify: async () => {
    return apiClient.get('/auth/verify');
  },
  getCurrentUser: async () => {
    return apiClient.get('/auth/me');
  },
};

// Transactions API
export const transactions = {
  getAll: async (page = 1, limit = 20, filters = {}) => {
    return apiClient.get('/transactions', { params: { page, limit, ...filters } });
  },
  get: async (transactionId) => {
    return apiClient.get(`/transactions/${transactionId}`);
  },
  create: async (transactionData) => {
    return apiClient.post('/transactions', transactionData);
  },
  update: async (transactionId, updates) => {
    return apiClient.put(`/transactions/${transactionId}`, updates);
  },
  approve: async (transactionId, notes) => {
    return apiClient.post(`/transactions/${transactionId}/approve`, { notes });
  },
  reject: async (transactionId, notes) => {
    return apiClient.post(`/transactions/${transactionId}/reject`, { notes });
  },
  getStats: async () => {
    return apiClient.get('/transactions/stats');
  },
};

// Merchants API
export const merchants = {
  getAll: async (page = 1, limit = 20, filters = {}) => {
    return apiClient.get('/merchants', { params: { page, limit, ...filters } });
  },
  get: async (merchantId) => {
    return apiClient.get(`/merchants/${merchantId}`);
  },
  create: async (merchantData) => {
    return apiClient.post('/merchants', merchantData);
  },
  update: async (merchantId, updates) => {
    return apiClient.put(`/merchants/${merchantId}`, updates);
  },
  delete: async (merchantId) => {
    return apiClient.delete(`/merchants/${merchantId}`);
  },
  getRiskSummary: async () => {
    return apiClient.get('/merchants/risk-summary');
  },
};

// Fraud Detection API
export const fraudDetection = {
  analyze: async (transactionData) => {
    return apiClient.post('/fraud-detection/analyze', transactionData);
  },
  getModels: async () => {
    return apiClient.get('/fraud-detection/models');
  },
  getModelPerformance: async () => {
    return apiClient.get('/fraud-detection/model-performance');
  },
  retrain: async (formData) => {
    return apiClient.post('/fraud-detection/retrain', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    });
  },
  getMLLogs: async (page = 1, limit = 20, filters = {}) => {
    return apiClient.get('/fraud-detection/ml-logs', { params: { page, limit, ...filters } });
  },
};

// Alerts API
export const alerts = {
  getAll: async (page = 1, limit = 20, filters = {}) => {
    return apiClient.get('/alerts', { params: { page, limit, ...filters } });
  },
  get: async (alertId) => {
    return apiClient.get(`/alerts/${alertId}`);
  },
  create: async (alertData) => {
    return apiClient.post('/alerts', alertData);
  },
  update: async (alertId, updates) => {
    return apiClient.put(`/alerts/${alertId}`, updates);
  },
  getSummary: async () => {
    return apiClient.get('/alerts/summary');
  },
};

// Analytics API
export const analytics = {
  getDashboardMetrics: async (days = 30) => {
    return apiClient.get('/analytics/dashboard-metrics', { params: { days } });
  },
  getFraudTrends: async (days = 30) => {
    return apiClient.get('/analytics/fraud-trends', { params: { days } });
  },
  getMerchantAnalytics: async () => {
    return apiClient.get('/analytics/merchant-analytics');
  },
  getTransactionTypes: async () => {
    return apiClient.get('/analytics/transaction-types');
  },
  getGeographicAnalysis: async () => {
    return apiClient.get('/analytics/geographic-analysis');
  },
  getDetectionPerformance: async () => {
    return apiClient.get('/analytics/detection-performance');
  },
  getAlertsAnalytics: async () => {
    return apiClient.get('/analytics/alerts-analytics');
  },
};

// Checkout API
export const checkout = {
  evaluate: async (data) => {
    return apiClient.post('/checkout/evaluate', data);
  },
  verifyOtp: async (transactionId, otp) => {
    return apiClient.post('/checkout/verify-otp', { transaction_id: transactionId, otp });
  }
};
