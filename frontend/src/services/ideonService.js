// Ideon API Integration Service
import { apiService } from './api';

export const ideonService = {
  /**
   * Check Ideon API health and connectivity
   * @returns {Promise<Object>} Health check results
   */
  async checkHealth() {
    try {
      const response = await apiService.ideon.checkHealth();
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        isConnected: data.api_connectivity?.success || false,
        configuration: data.configuration || {},
        rateLimits: data.rate_limits || {},
        timestamp: data.timestamp
      };
    } catch (error) {
      throw new Error(`Ideon health check failed: ${error.response?.data?.error?.message || error.message}`);
    }
  },

  /**
   * Get current rate limiting status
   * @returns {Promise<Object>} Rate limit status
   */
  async getRateLimits() {
    try {
      const response = await apiService.ideon.getRateLimits();
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        general: data.general || {},
        ichra: data.ichra || {},
        limits: data.limits || {},
        timestamp: data.timestamp
      };
    } catch (error) {
      throw new Error(`Failed to get rate limits: ${error.response?.data?.error?.message || error.message}`);
    }
  },

  /**
   * Create a group in Ideon API
   * @param {Object} groupData - Group data
   * @returns {Promise<Object>} Created group data
   */
  async createGroup(groupData) {
    try {
      const payload = {
        groupName: groupData.name,
        address: {
          street: groupData.address?.street1 || groupData.address?.street,
          city: groupData.address?.city,
          state: groupData.address?.state,
          zipCode: groupData.address?.zipCode,
          county: groupData.address?.county
        },
        effectiveDate: groupData.effectiveDate,
        contactEmail: groupData.contactEmail,
        contactName: groupData.contactName,
        contactPhone: groupData.contactPhone
      };

      const response = await apiService.ideon.createGroup(payload);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        ideonGroupId: data.id || data.groupId,
        externalId: data.external_id,
        ...data
      };
    } catch (error) {
      // Handle specific Ideon API errors
      if (error.response?.data?.code === 'HTTP_ERROR' && error.response?.data?.message?.includes('422')) {
        throw new Error('Invalid group data format. Please check all required fields.');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before creating another group.');
      } else {
        throw new Error(`Failed to create group in Ideon: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  },

  /**
   * Create a member in Ideon API
   * @param {string} ideonGroupId - Ideon group ID
   * @param {Object} memberData - Member data
   * @returns {Promise<Object>} Created member data
   */
  async createMember(ideonGroupId, memberData) {
    try {
      const payload = {
        firstName: memberData.firstName,
        lastName: memberData.lastName,
        dateOfBirth: memberData.dateOfBirth,
        zipCode: memberData.personalInfo?.zipCode || memberData.zipCode,
        className: memberData.className || 'Full-time Employees',
        tobaccoUser: memberData.tobaccoUser || false,
        gender: memberData.gender || 'unknown'
      };

      const response = await apiService.ideon.createMember(ideonGroupId, payload);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        ideonMemberId: data.id || data.memberId,
        externalId: data.external_id,
        ...data
      };
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before creating another member.');
      } else {
        throw new Error(`Failed to create member in Ideon: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  },

  /**
   * Get available plans from Ideon API
   * @param {Object} filters - Plan filters
   * @returns {Promise<Object>} Available plans
   */
  async getPlans(filters = {}) {
    try {
      const params = {
        county: filters.county,
        state: filters.state,
        effective_date: filters.effectiveDate,
        metal_levels: filters.metalLevels?.join(','),
        plan_types: filters.planTypes?.join(','),
        carriers: filters.carriers?.join(',')
      };

      // Remove undefined values
      Object.keys(params).forEach(key => 
        params[key] === undefined && delete params[key]
      );

      const response = await apiService.ideon.getPlans(params);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        plans: data.plans || data || [],
        total: data.total || 0,
        filters: params
      };
    } catch (error) {
      if (error.response?.data?.code === 'HTTP_ERROR' && error.response?.data?.message?.includes('422')) {
        throw new Error('Invalid plan search parameters. Please check your filters.');
      } else {
        throw new Error(`Failed to get plans from Ideon: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  },

  /**
   * Create a quote in Ideon API
   * @param {Object} quoteData - Quote data
   * @returns {Promise<Object>} Created quote data
   */
  async createQuote(quoteData) {
    try {
      const payload = {
        groupId: quoteData.ideonGroupId,
        effectiveDate: quoteData.effectiveDate,
        productLine: quoteData.productLine || 'individual',
        filters: quoteData.filters || {}
      };

      const response = await apiService.ideon.createQuote(payload);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        quoteId: data.id || data.quoteId,
        status: data.status,
        ...data
      };
    } catch (error) {
      if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before creating another quote.');
      } else {
        throw new Error(`Failed to create quote in Ideon: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  },

  /**
   * Calculate ICHRA affordability for a group
   * @param {string} groupId - Local group ID (not Ideon group ID)
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Affordability calculation results
   */
  async calculateGroupAffordability(groupId, options = {}) {
    try {
      const payload = {
        groupId: groupId,
        options: {
          includeSubsidyAnalysis: options.includeSubsidyAnalysis !== false,
          includeBenchmarkAnalysis: options.includeBenchmarkAnalysis !== false,
          customContributions: options.customContributions || null,
          ...options
        }
      };

      const response = await apiService.ideon.calculateGroupAffordability(payload);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        calculationId: data.calculationId,
        status: data.status,
        results: data.results,
        message: data.message
      };
    } catch (error) {
      // Handle specific ICHRA errors
      if (error.response?.data?.code === 'ICHRA_LIMIT_EXCEEDED') {
        throw new Error('ICHRA calculation limit reached (10 per trial). Please upgrade to production.');
      } else if (error.response?.data?.code === 'GROUP_ICHRA_CALCULATION_FAILED') {
        throw new Error(error.response.data.message || 'Group has no members for ICHRA calculation');
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please wait before calculating affordability.');
      } else {
        throw new Error(`ICHRA calculation failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  },

  /**
   * Calculate individual member ICHRA affordability
   * @param {string} groupId - Local group ID
   * @param {string} memberId - Local member ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Affordability calculation results
   */
  async calculateAffordability(groupId, memberId, options = {}) {
    try {
      const payload = {
        groupId: groupId,
        memberId: memberId,
        options: options
      };

      const response = await apiService.ideon.calculateAffordability(payload);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        isAffordable: data.isAffordable,
        benchmarkPremium: data.benchmarkPremium,
        requiredContribution: data.requiredContribution,
        ...data
      };
    } catch (error) {
      if (error.response?.data?.code === 'ICHRA_LIMIT_EXCEEDED') {
        throw new Error('ICHRA calculation limit reached (10 per trial). Please upgrade to production.');
      } else {
        throw new Error(`Individual affordability calculation failed: ${error.response?.data?.error?.message || error.message}`);
      }
    }
  },

  /**
   * Calculate minimum ICHRA contribution required
   * @param {string} groupId - Local group ID
   * @param {string} memberId - Local member ID
   * @param {Object} options - Calculation options
   * @returns {Promise<Object>} Minimum contribution calculation results
   */
  async calculateMinimumContribution(groupId, memberId, options = {}) {
    try {
      const payload = {
        groupId: groupId,
        memberId: memberId,
        options: options
      };

      const response = await apiService.ideon.calculateMinimumContribution(payload);
      const data = response.data?.data || response.data;
      
      return {
        success: true,
        minimumContribution: data.minimumContribution,
        benchmarkPremium: data.benchmarkPremium,
        affordabilityThreshold: data.affordabilityThreshold,
        ...data
      };
    } catch (error) {
      throw new Error(`Minimum contribution calculation failed: ${error.response?.data?.error?.message || error.message}`);
    }
  },

  /**
   * Validate that we have proper rate limits available
   * @param {string} operation - Type of operation ('general' or 'ichra')
   * @returns {Promise<boolean>} Whether operation can proceed
   */
  async checkRateLimit(operation = 'general') {
    try {
      const rateLimits = await this.getRateLimits();
      
      if (operation === 'ichra') {
        return rateLimits.ichra?.counts?.QUEUED < 10; // Trial limit
      } else {
        return rateLimits.general?.counts?.QUEUED < 5; // Per minute limit
      }
    } catch (error) {
      console.warn('Could not check rate limits:', error.message);
      return true; // Allow operation if we can't check
    }
  },

  /**
   * Test complete Ideon workflow
   * @param {Object} testData - Complete test data
   * @returns {Promise<Object>} Workflow test results
   */
  async testWorkflow(testData) {
    try {
      const { groupData, memberData, quoteOptions, ichraOptions } = testData;
      
      const results = {
        workflowId: `test_${Date.now()}`,
        steps: [],
        success: true,
        errors: []
      };

      try {
        // Step 1: Check rate limits
        const rateLimitOk = await this.checkRateLimit('general');
        if (!rateLimitOk) {
          throw new Error('Rate limit exceeded - cannot proceed with workflow test');
        }

        // Step 2: Create Group
        const group = await this.createGroup(groupData);
        results.steps.push({
          step: 1,
          name: 'Create Group',
          success: true,
          data: group
        });

        // Step 3: Create Member
        const member = await this.createMember(group.ideonGroupId, memberData);
        results.steps.push({
          step: 2,
          name: 'Create Member',
          success: true,
          data: member
        });

        // Step 4: Create Quote (if requested)
        if (quoteOptions) {
          const quote = await this.createQuote({
            ideonGroupId: group.ideonGroupId,
            ...quoteOptions
          });
          results.steps.push({
            step: 3,
            name: 'Create Quote',
            success: true,
            data: quote
          });
        }

        // Step 5: ICHRA Calculation (if requested and within limits)
        if (ichraOptions) {
          const ichraLimitOk = await this.checkRateLimit('ichra');
          
          if (ichraLimitOk) {
            const ichra = await this.calculateGroupAffordability(groupData.localGroupId, ichraOptions);
            results.steps.push({
              step: 4,
              name: 'ICHRA Affordability',
              success: true,
              data: ichra
            });
          } else {
            results.steps.push({
              step: 4,
              name: 'ICHRA Affordability',
              success: false,
              error: 'ICHRA calculation limit reached (10 per trial)'
            });
          }
        }

      } catch (stepError) {
        results.success = false;
        results.errors.push({
          step: results.steps.length + 1,
          error: stepError.message,
          timestamp: new Date().toISOString()
        });
      }

      return results;
    } catch (error) {
      throw new Error(`Workflow test failed: ${error.message}`);
    }
  }
};

export default ideonService;