// Plan API service
import { apiService } from './api';

export const planService = {
  /**
   * Search for health insurance plans
   * @param {Object} searchParams - Search parameters
   * @returns {Promise} API response
   */
  searchPlans: async (searchParams) => {
    try {
      const response = await apiService.plans.search(searchParams);
      
      // Handle backend response format: {success: true, data: {plans: [...], pagination: {...}}}
      const responseData = response.data?.data || response.data;
      
      if (responseData && responseData.plans) {
        return {
          success: true,
          plans: responseData.plans,
          pagination: responseData.pagination
        };
      }
      
      return response.data;
    } catch (error) {
      // Handle specific backend error codes
      if (error.response?.data?.code === 'MISSING_COUNTY_ID') {
        throw new Error('County ID is required for plan search');
      } else if (error.response?.data?.code === 'INVALID_COUNTY') {
        throw new Error('Invalid county specified');
      } else {
        throw new Error(`Failed to search plans: ${error.response?.data?.error || error.message}`);
      }
    }
  },

  /**
   * Calculate plan quotes for members
   * @param {Object} quoteData - Quote calculation data
   * @returns {Promise} API response
   */
  calculateQuote: async (quoteData) => {
    try {
      const response = await apiService.plans.quote(quoteData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to calculate quote: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * Get benchmark silver plan for subsidies
   * @param {string} countyId - County ID
   * @param {Object} params - Additional parameters (age, tobacco)
   * @returns {Promise} API response
   */
  getBenchmarkPlan: async (countyId, params) => {
    try {
      const response = await apiService.plans.getBenchmark(countyId, params);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to get benchmark plan: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * Filter plans by metal level
   * @param {Array} plans - Array of plans
   * @param {Array} metalLevels - Metal levels to filter by
   * @returns {Array} Filtered plans
   */
  filterByMetalLevel: (plans, metalLevels) => {
    if (!metalLevels || metalLevels.length === 0) return plans;
    return plans.filter(plan => metalLevels.includes(plan.level || plan.metalLevel));
  },

  /**
   * Filter plans by carrier
   * @param {Array} plans - Array of plans
   * @param {Array} carriers - Carriers to filter by
   * @returns {Array} Filtered plans
   */
  filterByCarrier: (plans, carriers) => {
    if (!carriers || carriers.length === 0) return plans;
    return plans.filter(plan => carriers.includes(plan.carrier));
  },

  /**
   * Filter plans by HSA eligibility
   * @param {Array} plans - Array of plans
   * @param {boolean} hsaEligible - HSA eligibility filter
   * @returns {Array} Filtered plans
   */
  filterByHSA: (plans, hsaEligible) => {
    if (hsaEligible === undefined || hsaEligible === null) return plans;
    return plans.filter(plan => plan.hsaEligible === hsaEligible);
  },

  /**
   * Sort plans by premium (low to high)
   * @param {Array} plans - Array of plans
   * @returns {Array} Sorted plans
   */
  sortByPremium: (plans) => {
    return [...plans].sort((a, b) => {
      const premiumA = a.premium || a.basePremium || 0;
      const premiumB = b.premium || b.basePremium || 0;
      return premiumA - premiumB;
    });
  },

  /**
   * Sort plans by deductible (low to high)
   * @param {Array} plans - Array of plans
   * @returns {Array} Sorted plans
   */
  sortByDeductible: (plans) => {
    return [...plans].sort((a, b) => {
      const deductibleA = a.deductible || 0;
      const deductibleB = b.deductible || 0;
      return deductibleA - deductibleB;
    });
  },

  /**
   * Get unique metal levels from plans array
   * @param {Array} plans - Array of plans
   * @returns {Array} Unique metal levels
   */
  getUniqueMetalLevels: (plans) => {
    const levels = plans.map(plan => plan.level || plan.metalLevel).filter(Boolean);
    return [...new Set(levels)];
  },

  /**
   * Get unique carriers from plans array
   * @param {Array} plans - Array of plans
   * @returns {Array} Unique carriers
   */
  getUniqueCarriers: (plans) => {
    const carriers = plans.map(plan => plan.carrier || plan.carrierName).filter(Boolean);
    return [...new Set(carriers)];
  },

  /**
   * Format premium for display
   * @param {number} premium - Premium amount
   * @returns {string} Formatted premium
   */
  formatPremium: (premium) => {
    if (!premium || isNaN(premium)) return '$0.00';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(premium);
  },

  /**
   * Calculate annual premium from monthly
   * @param {number} monthlyPremium - Monthly premium amount
   * @returns {number} Annual premium
   */
  calculateAnnualPremium: (monthlyPremium) => {
    return monthlyPremium * 12;
  },

  /**
   * Validate plan search parameters
   * @param {Object} searchParams - Search parameters to validate
   * @returns {Object} Validation result
   */
  validateSearchParams: (searchParams) => {
    const errors = {};

    if (!searchParams.countyId) {
      errors.countyId = 'County ID is required';
    }

    if (searchParams.page && (isNaN(searchParams.page) || searchParams.page < 1)) {
      errors.page = 'Page must be a positive number';
    }

    if (searchParams.limit && (isNaN(searchParams.limit) || searchParams.limit < 1 || searchParams.limit > 100)) {
      errors.limit = 'Limit must be between 1 and 100';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate quote calculation data
   * @param {Object} quoteData - Quote data to validate
   * @returns {Object} Validation result
   */
  validateQuoteData: (quoteData) => {
    const errors = {};

    if (!quoteData.members || !Array.isArray(quoteData.members) || quoteData.members.length === 0) {
      errors.members = 'At least one member is required';
    } else {
      quoteData.members.forEach((member, index) => {
        if (!member.age || isNaN(member.age) || member.age < 0 || member.age > 120) {
          errors[`members.${index}.age`] = 'Valid age is required (0-120)';
        }
        if (!member.zipCode) {
          errors[`members.${index}.zipCode`] = 'ZIP code is required';
        }
      });
    }

    if (!quoteData.planIds || !Array.isArray(quoteData.planIds) || quoteData.planIds.length === 0) {
      errors.planIds = 'At least one plan ID is required';
    }

    if (quoteData.members && quoteData.members.length > 50) {
      errors.members = 'Maximum 50 members allowed per quote';
    }

    if (quoteData.planIds && quoteData.planIds.length > 20) {
      errors.planIds = 'Maximum 20 plans allowed per quote';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

export default planService; 