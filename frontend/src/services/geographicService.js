import api from './api';

export const geographicService = {
  /**
   * Resolve ZIP code to county information
   * @param {string|number} zipCode - 5-digit ZIP code to resolve
   * @returns {Promise<Object>} - County resolution result
   */
  async resolveZip(zipCode) {
    try {
      const response = await api.post('/geographic/resolve-zip', {
        zipCode: zipCode.toString()
      });
      
      const data = response.data?.data || response.data;
      
      if (!data) {
        throw new Error('No data received from server');
      }
      
      return {
        success: data.success || false,
        multipleCounties: data.multipleCounties || false,
        county: data.counties && data.counties.length === 1 ? data.counties[0] : null,
        counties: data.counties || [],
        zipCode: zipCode
      };
    } catch (error) {
      console.error('Error resolving ZIP code:', error);
      console.error('Error details:', {
        message: error.message,
        response: error.response?.data,
        status: error.response?.status
      });
      
      // Handle specific error cases based on backend response codes
      if (error.response?.data?.code === 'COUNTY_NOT_FOUND') {
        throw new Error('ZIP code not found in our coverage area');
      } else if (error.response?.data?.code === 'INVALID_ZIP_CODE') {
        throw new Error('Invalid ZIP code format. Must be a valid 5-digit ZIP code.');
      } else if (error.response?.status === 503) {
        throw new Error('Geographic service temporarily unavailable. Please try again.');
      } else {
        throw new Error(error.response?.data?.error || 'Failed to validate ZIP code. Please try again.');
      }
    }
  },

  /**
   * Get all counties with optional state filtering
   * @param {string} state - Optional state filter (e.g., 'CA')
   * @returns {Promise<Array>} - List of counties
   */
  async getCounties(state = null) {
    try {
      const params = state ? { state } : {};
      const response = await api.get('/geographic/counties', { params });
      
      const data = response.data?.data || response.data;

      return {
        success: true,
        counties: data.counties || [],
        total: data.total || 0
      };
    } catch (error) {
      console.error('Error fetching counties:', error);
      
      if (error.response?.data?.code === 'STATE_NOT_FOUND') {
        throw new Error('No counties found for the specified state');
      } else if (error.response?.status === 503) {
        throw new Error('Geographic service temporarily unavailable. Please try again.');
      } else {
        throw new Error(error.response?.data?.error || 'Failed to fetch counties. Please try again.');
      }
    }
  },

  /**
   * Validate ZIP code format (5-digit US ZIP codes)
   * @param {string|number} zipCode - ZIP code to validate
   * @returns {Object} - Validation result
   */
  validateZipFormat(zipCode) {
    const zipNum = parseInt(zipCode);
    
    if (isNaN(zipNum)) {
      return {
        isValid: false,
        error: 'ZIP code must be a number'
      };
    }
    
    if (zipNum < 10000 || zipNum > 99999) {
      return {
        isValid: false,
        error: 'ZIP code must be a valid 5-digit ZIP code'
      };
    }
    
    return {
      isValid: true,
      zipCode: zipNum
    };
  },

  /**
   * Get available ZIP codes (deprecated - now using real 5-digit ZIP codes)
   * @returns {Array} - Array of valid ZIP codes
   */
  getAvailableZipCodes() {
    // This method is deprecated - we now use real 5-digit ZIP codes
    console.warn('getAvailableZipCodes is deprecated - use real 5-digit ZIP codes');
    return [];
  },

  /**
   * Check if ZIP code is valid 5-digit format
   * @param {string|number} zipCode - ZIP code to check
   * @returns {boolean} - Whether ZIP code is valid
   */
  isValidZip(zipCode) {
    const zipNum = parseInt(zipCode);
    return !isNaN(zipNum) && zipNum >= 10000 && zipNum <= 99999;
  }
}; 