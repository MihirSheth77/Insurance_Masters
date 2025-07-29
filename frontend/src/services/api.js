// Base API service configuration
import axios from 'axios';

// Create axios instance with base configuration
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for adding auth tokens if needed
api.interceptors.request.use(
  (config) => {
    // Add auth token if available
    const token = localStorage.getItem('authToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for handling common errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Handle common error responses
    if (error.response?.status === 401) {
      // Unauthorized - clear auth and redirect to login
      localStorage.removeItem('authToken');
      window.location.href = '/login';
    }
    
    // Return a standardized error format
    const errorMessage = error.response?.data?.error?.message || 
                        error.response?.data?.message || 
                        error.message || 
                        'An unexpected error occurred';
    
    return Promise.reject({
      message: errorMessage,
      status: error.response?.status,
      code: error.response?.data?.error?.code,
      originalError: error
    });
  }
);

// API endpoints
export const endpoints = {
  // Health check
  health: '/health',
  
  // Geographic services
  geographic: {
    resolveZip: '/geographic/resolve-zip',
    counties: '/geographic/counties'
  },
  
  // Plan services
  plans: {
    search: '/plans/search',
    quote: '/plans/quote',
    benchmark: (countyId) => `/plans/benchmark/${countyId}`
  },
  
  // Group management
  groups: {
    create: '/groups',
    get: (id) => `/groups/${id}`,
    update: (id) => `/groups/${id}`,
    list: '/groups'
  },
  
  // Class management
  classes: {
    create: (groupId) => `/groups/${groupId}/classes`,
    list: (groupId) => `/groups/${groupId}/classes`,
    createSubclasses: (groupId, classId) => `/groups/${groupId}/classes/${classId}/subclasses`
  },
  
  // Member management
  members: {
    create: (groupId) => `/groups/${groupId}/members`,
    bulkUpload: (groupId) => `/groups/${groupId}/members/bulk`,
    list: (groupId) => `/groups/${groupId}/members`
  },
  
  // Quote services
  quotes: {
    generate: '/quotes/generate',
    get: (quoteId) => `/quotes/${quoteId}`,
    export: (quoteId) => `/quotes/${quoteId}/export`
  },
  
  // Ideon API integration
  ideon: {
    health: '/ideon/health',
    groups: '/ideon/groups',
    members: (groupId) => `/ideon/groups/${groupId}/members`,
    quotes: '/ideon/quotes',
    plans: '/ideon/plans',
    rateLimits: '/ideon/rate-limits',
    ichra: {
      affordability: '/ideon/ichra/affordability',
      minimumContribution: '/ideon/ichra/minimum-contribution',
      groupAffordability: '/ideon/ichra/group-affordability'
    }
  }
};

// Convenience methods for common operations
export const apiService = {
  // Health check
  checkHealth: () => api.get(endpoints.health),
  
  // Geographic services
  geographic: {
    resolveZip: (zipCode) => api.post(endpoints.geographic.resolveZip, { zipCode }),
    getCounties: (state) => api.get(endpoints.geographic.counties, { params: { state } })
  },
  
  // Plan services
  plans: {
    search: (params) => api.get(endpoints.plans.search, { params }),
    quote: (data) => api.post(endpoints.plans.quote, data),
    getBenchmark: (countyId, params) => api.get(endpoints.plans.benchmark(countyId), { params })
  },
  
  // Group management
  groups: {
    create: (data) => api.post(endpoints.groups.create, data),
    get: (id) => api.get(endpoints.groups.get(id)),
    update: (id, data) => api.put(endpoints.groups.update(id), data),
    list: (params) => api.get(endpoints.groups.list, { params }),
    delete: (id) => api.delete(endpoints.groups.get(id))
  },
  
  // Class management
  classes: {
    create: (groupId, data) => api.post(endpoints.classes.create(groupId), data),
    list: (groupId, params) => api.get(endpoints.classes.list(groupId), { params }),
    createSubclasses: (groupId, classId, data) => api.post(endpoints.classes.createSubclasses(groupId, classId), data)
  },
  
  // Member management
  members: {
    create: (groupId, data) => api.post(endpoints.members.create(groupId), data),
    bulkUpload: (groupId, formData) => api.post(endpoints.members.bulkUpload(groupId), formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    }),
    list: (groupId, params) => api.get(endpoints.members.list(groupId), { params })
  },
  
  // Quote services
  quotes: {
    generate: (data) => api.post(endpoints.quotes.generate, data),
    get: (quoteId) => api.get(endpoints.quotes.get(quoteId)),
    export: (quoteId, format) => api.post(endpoints.quotes.export(quoteId), { format })
  },
  
  // Ideon API integration
  ideon: {
    checkHealth: () => api.get(endpoints.ideon.health),
    createGroup: (data) => api.post(endpoints.ideon.groups, data),
    createMember: (groupId, data) => api.post(endpoints.ideon.members(groupId), data),
    createQuote: (data) => api.post(endpoints.ideon.quotes, data),
    getPlans: (params) => api.get(endpoints.ideon.plans, { params }),
    getRateLimits: () => api.get(endpoints.ideon.rateLimits),
    calculateAffordability: (data) => api.post(endpoints.ideon.ichra.affordability, data),
    calculateMinimumContribution: (data) => api.post(endpoints.ideon.ichra.minimumContribution, data),
    calculateGroupAffordability: (data) => api.post(endpoints.ideon.ichra.groupAffordability, data)
  }
};

export default api; 