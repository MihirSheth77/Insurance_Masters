/**
 * Upload Service
 * Handles CSV file uploads for plans, pricing, and geographic data
 */

import api from './api';

class UploadService {
  /**
   * Upload a data file (CSV)
   * @param {string} dataType - Type of data (plans, pricing, counties, etc.)
   * @param {File} file - The file to upload
   * @returns {Promise} Upload response
   */
  async uploadDataFile(dataType, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', dataType);

      const response = await api.post(`/upload/data/${dataType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error uploading ${dataType} file:`, error);
      throw error;
    }
  }

  /**
   * Get upload status for all data types
   * @returns {Promise} Status of uploaded data
   */
  async getDataStatus() {
    try {
      const response = await api.get('/upload/data/status');
      return response.data;
    } catch (error) {
      console.error('Error fetching data status:', error);
      throw error;
    }
  }

  /**
   * Validate CSV file structure
   * @param {string} dataType - Type of data
   * @param {File} file - The file to validate
   * @returns {Promise} Validation result
   */
  async validateFile(dataType, file) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('type', dataType);

      const response = await api.post(`/upload/validate/${dataType}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      return response.data;
    } catch (error) {
      console.error(`Error validating ${dataType} file:`, error);
      throw error;
    }
  }

  /**
   * Get import history
   * @returns {Promise} Import history
   */
  async getImportHistory() {
    try {
      const response = await api.get('/upload/history');
      return response.data;
    } catch (error) {
      console.error('Error fetching import history:', error);
      throw error;
    }
  }

  /**
   * Clear data for a specific type
   * @param {string} dataType - Type of data to clear
   * @returns {Promise} Clear response
   */
  async clearData(dataType) {
    try {
      const response = await api.delete(`/upload/data/${dataType}`);
      return response.data;
    } catch (error) {
      console.error(`Error clearing ${dataType} data:`, error);
      throw error;
    }
  }

  /**
   * Get data statistics
   * @param {string} dataType - Type of data
   * @returns {Promise} Data statistics
   */
  async getDataStats(dataType) {
    try {
      const response = await api.get(`/upload/data/${dataType}/stats`);
      return response.data;
    } catch (error) {
      console.error(`Error fetching ${dataType} stats:`, error);
      throw error;
    }
  }
}

export const uploadService = new UploadService();
export default uploadService;