/**
 * Dashboard Service
 * API calls for dashboard data
 */

import api from './api';

const dashboardService = {
  /**
   * Get dashboard KPI metrics
   */
  getMetrics: async () => {
    try {
      const response = await api.get('/dashboard/metrics');
      return response.data;
    } catch (error) {
      console.error('Error fetching dashboard metrics:', error);
      throw error;
    }
  },

  /**
   * Get recent groups
   */
  getRecentGroups: async () => {
    try {
      const response = await api.get('/dashboard/recent-groups');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent groups:', error);
      throw error;
    }
  },

  /**
   * Get recent quotes
   */
  getRecentQuotes: async () => {
    try {
      const response = await api.get('/dashboard/recent-quotes');
      return response.data;
    } catch (error) {
      console.error('Error fetching recent quotes:', error);
      throw error;
    }
  },

  /**
   * Get activity summary
   */
  getActivitySummary: async () => {
    try {
      const response = await api.get('/dashboard/activity-summary');
      return response.data;
    } catch (error) {
      console.error('Error fetching activity summary:', error);
      throw error;
    }
  }
};

export default dashboardService;