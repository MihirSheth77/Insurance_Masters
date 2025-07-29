import api from './api';

export const quoteService = {
  /**
   * Generate a new ICHRA quote for a group
   * @param {string} groupId - Group ID
   * @param {Object} options - Quote generation options
   * @returns {Promise<Object>} - Generated quote data
   */
  async generateQuote(groupId, options = {}) {
    try {
      const response = await api.post('/quotes/generate', {
        groupId: groupId,
        options: {
          filters: options.filters || {},
          includeSubsidyAnalysis: options.includeSubsidyAnalysis !== false,
          includeBenchmarkAnalysis: options.includeBenchmarkAnalysis !== false,
          includeComplianceCheck: options.includeComplianceCheck !== false,
          customContributions: options.customContributions || null
        }
      });

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        groupId: response.data.data.groupId,
        groupName: response.data.data.groupName,
        summary: response.data.data.summary,
        employerSummary: response.data.data.employerSummary,
        message: response.data.data.message
      };
    } catch (error) {
      console.error('Error generating quote:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid quote parameters or missing group data');
      } else if (error.response?.status === 404) {
        throw new Error('Group not found or has no members');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid group configuration for ICHRA quotes';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Quote service temporarily unavailable. Please try again.');
      } else if (error.response?.status === 429) {
        throw new Error('Too many quote requests. Please wait before generating another quote.');
      } else {
        throw new Error('Failed to generate quote. Please try again.');
      }
    }
  },

  /**
   * Get quote results by quote ID (updated to use new API structure)
   * @param {string} quoteId - Quote ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Quote results data
   */
  async getQuoteResults(quoteId, options = {}) {
    try {
      const params = {
        includeDetails: options.includeDetails || 'false',
        page: options.page || 1,
        limit: options.limit || 50
      };

      const response = await api.get(`/quotes/${quoteId}`, { params });

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        groupId: response.data.data.groupId,
        groupName: response.data.data.groupName,
        status: response.data.data.status,
        summary: response.data.data.summary,
        employerSummary: response.data.data.employerSummary,
        filters: response.data.data.filters,
        statistics: response.data.data.statistics,
        memberQuotes: response.data.data.memberQuotes || [],
        pagination: response.data.data.pagination || {},
        generatedAt: response.data.data.generatedAt,
        updatedAt: response.data.data.updatedAt
      };
    } catch (error) {
      console.error('Error fetching quote results:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid quote ID format');
      } else if (error.response?.status === 503) {
        throw new Error('Quote service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch quote results. Please try again.');
      }
    }
  },

  /**
   * Get quote results with filtering (legacy method - use getQuoteSummary for comprehensive data)
   * @param {string} groupId - Group ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Quote results data
   * @deprecated Use getQuoteSummary for comprehensive filtered data instead
   */
  async getQuoteResultsByGroup(groupId, options = {}) {
    try {
      const params = {
        filters: JSON.stringify(options.filters || {}),
        sort: JSON.stringify(options.sort || { field: 'totalCost', direction: 'asc' }),
        page: options.page || 1,
        limit: options.limit || 20,
        includeComparison: options.includeComparison || true,
        includeProjections: options.includeProjections || true
      };

      const response = await api.get(`/groups/${groupId}/quotes/results`, { params });

      return {
        success: true,
        plans: response.data.plans || [],
        summary: response.data.summary || {},
        pagination: response.data.pagination || {},
        availableCarriers: response.data.availableCarriers || [],
        metalLevelStats: response.data.metalLevelStats || {},
        carrierStats: response.data.carrierStats || {},
        planDistribution: response.data.planDistribution || {},
        currentCosts: response.data.currentCosts || {},
        projectedCosts: response.data.projectedCosts || {},
        savings: response.data.savings || {},
        totalContributions: response.data.totalContributions || 0,
        subsidyEligible: response.data.subsidyEligible || 0,
        affordabilityCompliant: response.data.affordabilityCompliant || 0,
        quoteId: response.data.quoteId
      };
    } catch (error) {
      console.error('Error fetching quote results by group:', error);
      
      if (error.response?.status === 404) {
        throw new Error('No quote found for this group. Please generate a quote first.');
      } else if (error.response?.status === 410) {
        throw new Error('Quote has expired. Please generate a new quote.');
      } else if (error.response?.status === 503) {
        throw new Error('Quote service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch quote results. Please try again.');
      }
    }
  },

  /**
   * Get detailed quote analysis for specific plans
   * @param {string} groupId - Group ID
   * @param {Array} planIds - Array of plan IDs to analyze
   * @returns {Promise<Object>} - Detailed analysis data
   */
  async getDetailedAnalysis(groupId, planIds) {
    try {
      const response = await api.post(`/groups/${groupId}/quotes/analysis`, {
        planIds,
        includeEmployeeBreakdown: true,
        includeCostProjections: true,
        includeComplianceAnalysis: true,
        includeSubsidyImpact: true
      });

      return {
        success: true,
        analysis: response.data.analysis,
        employeeBreakdowns: response.data.employeeBreakdowns || [],
        costProjections: response.data.costProjections || {},
        complianceAnalysis: response.data.complianceAnalysis || {},
        subsidyImpact: response.data.subsidyImpact || {},
        recommendations: response.data.recommendations || []
      };
    } catch (error) {
      console.error('Error fetching detailed analysis:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid plan IDs provided');
      } else if (error.response?.status === 404) {
        throw new Error('Group or quote not found');
      } else if (error.response?.status === 503) {
        throw new Error('Analysis service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch detailed analysis. Please try again.');
      }
    }
  },

  /**
   * Export quote results in various formats
   * @param {string} quoteId - Quote ID
   * @param {Object} exportOptions - Export configuration
   * @returns {Promise<Object>} - Export file data
   */
  async exportQuote(quoteId, exportOptions = {}) {
    try {
      const response = await api.post(`/quotes/${quoteId}/export`, {
        format: exportOptions.format || 'csv', // csv, excel, pdf, json
        includeDetails: exportOptions.includeDetails !== false
      }, {
        responseType: 'blob', // Important for file downloads
        timeout: 60000 // 1 minute timeout for large exports
      });

      // Extract filename from Content-Disposition header
      const contentDisposition = response.headers['content-disposition'];
      let filename = `quote-export.${exportOptions.format || 'csv'}`;
      if (contentDisposition) {
        const filenameMatch = contentDisposition.match(/filename="?(.+)"?/);
        if (filenameMatch) {
          filename = filenameMatch[1];
        }
      }

      return {
        success: true,
        fileContent: response.data,
        filename: filename,
        mimeType: response.headers['content-type'] || 'text/csv'
      };
    } catch (error) {
      console.error('Error exporting quote:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid export parameters');
      } else if (error.response?.status === 404) {
        throw new Error('Quote not found for export');
      } else if (error.response?.status === 413) {
        throw new Error('Export file too large. Try reducing the scope of data.');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid export format or quote ID';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Export service temporarily unavailable. Please try again.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Export timeout. Please try with fewer options or contact support.');
      } else {
        throw new Error('Failed to export quote. Please try again.');
      }
    }
  },

  /**
   * Get quote history for a group
   * @param {string} groupId - Group ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Quote history data
   */
  async getQuoteHistory(groupId, options = {}) {
    try {
      const params = {
        page: options.page || 1,
        limit: options.limit || 10,
        sortBy: options.sortBy || 'generatedAt',
        order: options.order || 'desc'
      };

      const response = await api.get(`/quotes/group/${groupId}`, { params });

      return {
        success: true,
        groupId: response.data.data.groupId,
        groupName: response.data.data.groupName,
        quotes: response.data.data.quotes || [],
        pagination: response.data.data.pagination || {}
      };
    } catch (error) {
      console.error('Error fetching quote history:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Group not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid group ID format');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch quote history. Please try again.');
      }
    }
  },

  /**
   * Update quote with new parameters (legacy method - use updateQuoteFilters for real-time filtering)
   * @param {string} groupId - Group ID
   * @param {string} quoteId - Quote ID
   * @param {Object} updates - Quote updates
   * @returns {Promise<Object>} - Updated quote data
   * @deprecated Use updateQuoteFilters for real-time filtering instead
   */
  async updateQuote(groupId, quoteId, updates) {
    try {
      const response = await api.patch(`/groups/${groupId}/quotes/${quoteId}`, {
        filters: updates.filters || {},
        customContributions: updates.customContributions || {},
        selectedPlans: updates.selectedPlans || [],
        notes: updates.notes || null
      });

      return {
        success: true,
        quote: response.data.quote,
        summary: response.data.summary
      };
    } catch (error) {
      console.error('Error updating quote:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid update parameters');
      } else if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 410) {
        throw new Error('Quote has expired and cannot be updated');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to update quote. Please try again.');
      }
    }
  },

  /**
   * Get benchmark silver plans for subsidy calculations
   * @param {string} groupId - Group ID
   * @param {Object} criteria - Search criteria
   * @returns {Promise<Object>} - Benchmark plan data
   */
  async getBenchmarkPlans(groupId, criteria = {}) {
    try {
      const params = {
        countyId: criteria.countyId,
        year: criteria.year || new Date().getFullYear(),
        includeProjections: criteria.includeProjections || false
      };

      const response = await api.get(`/groups/${groupId}/quotes/benchmark`, { params });

      return {
        success: true,
        benchmarkPlans: response.data.benchmarkPlans || [],
        secondLowestSilver: response.data.secondLowestSilver || null,
        averageBenchmark: response.data.averageBenchmark || 0,
        subsidyThresholds: response.data.subsidyThresholds || {}
      };
    } catch (error) {
      console.error('Error fetching benchmark plans:', error);
      
      if (error.response?.status === 404) {
        throw new Error('No benchmark plans found for the specified criteria');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch benchmark plans. Please try again.');
      }
    }
  },

  /**
   * Calculate affordability analysis for specific contribution amounts
   * @param {string} groupId - Group ID
   * @param {Object} contributionScenarios - Different contribution scenarios
   * @returns {Promise<Object>} - Affordability analysis
   */
  async calculateAffordability(groupId, contributionScenarios) {
    try {
      const response = await api.post(`/groups/${groupId}/quotes/affordability`, {
        scenarios: contributionScenarios,
        includeComplianceRate: true,
        includeImpactAnalysis: true,
        includeMemberBreakdown: true
      });

      return {
        success: true,
        scenarios: response.data.scenarios || [],
        complianceRates: response.data.complianceRates || {},
        impactAnalysis: response.data.impactAnalysis || {},
        memberBreakdowns: response.data.memberBreakdowns || {},
        recommendations: response.data.recommendations || []
      };
    } catch (error) {
      console.error('Error calculating affordability:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Invalid contribution scenarios provided');
      } else if (error.response?.status === 404) {
        throw new Error('Group not found');
      } else if (error.response?.status === 503) {
        throw new Error('Affordability service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to calculate affordability. Please try again.');
      }
    }
  },

  /**
   * Delete (archive) a quote
   * @param {string} quoteId - Quote ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteQuote(quoteId) {
    try {
      const response = await api.delete(`/quotes/${quoteId}`);

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        status: response.data.data.status,
        archivedAt: response.data.data.archivedAt
      };
    } catch (error) {
      console.error('Error deleting quote:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid quote ID format');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to delete quote. Please try again.');
      }
    }
  },

  /**
   * Get comprehensive quote summary with employer and employee comparisons
   * @param {string} quoteId - Quote ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Comprehensive summary data
   */
  async getQuoteSummary(quoteId, options = {}) {
    try {
      const params = {
        carrier: options.carrier || undefined,
        metalLevel: options.metalLevel || undefined,
        market: options.market || 'all',
        includeEmployeeDetails: options.includeEmployeeDetails !== false ? 'true' : 'false'
      };

      // Remove undefined parameters
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await api.get(`/quotes/${quoteId}/summary`, { params });

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        groupId: response.data.data.groupId,
        appliedFilters: response.data.data.appliedFilters,
        employerComparison: response.data.data.employerComparison,
        employeeSummary: response.data.data.employeeSummary,
        overallAnalysis: response.data.data.overallAnalysis,
        subsidyAnalysis: response.data.data.subsidyAnalysis,
        planAnalysis: response.data.data.planAnalysis,
        availableFilters: response.data.data.availableFilters,
        employeeDetails: response.data.data.employeeDetails || [],
        generatedAt: response.data.data.generatedAt,
        filteredAt: response.data.data.filteredAt
      };
    } catch (error) {
      console.error('Error fetching quote summary:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid quote ID format');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch quote summary. Please try again.');
      }
    }
  },

  /**
   * Get filtered quote results with detailed member data
   * @param {string} quoteId - Quote ID
   * @param {Object} options - Query options and filters
   * @returns {Promise<Object>} - Filtered quote results
   */
  async getFilteredQuoteResults(quoteId, options = {}) {
    try {
      const params = {
        carrier: options.carrier || undefined,
        metalLevel: options.metalLevel || undefined,
        market: options.market || 'all',
        includeMembers: options.includeMembers || 'false',
        page: options.page || 1,
        limit: options.limit || 50
      };

      // Remove undefined parameters
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await api.get(`/quotes/${quoteId}/filtered`, { params });

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        groupId: response.data.data.groupId,
        appliedFilters: response.data.data.appliedFilters,
        comparisonSummary: response.data.data.comparisonSummary,
        memberCount: response.data.data.memberCount,
        memberQuotes: response.data.data.memberQuotes || [],
        pagination: response.data.data.pagination || {},
        filteredAt: response.data.data.filteredAt
      };
    } catch (error) {
      console.error('Error fetching filtered quote results:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid quote ID format');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch filtered quote results. Please try again.');
      }
    }
  },

  /**
   * Apply real-time filters to quote with updated comparison calculations
   * @param {string} quoteId - Quote ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Updated comparison data
   */
  async updateQuoteFilters(quoteId, filters) {
    try {
      const response = await api.put(`/quotes/${quoteId}/filters`, {
        filters: filters || {}
      });

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        groupId: response.data.data.groupId,
        appliedFilters: response.data.data.appliedFilters,
        comparisonSummary: response.data.data.comparisonSummary,
        memberCount: response.data.data.memberCount,
        filteredAt: response.data.data.filteredAt,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error updating quote filters:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Filters object is required');
      } else if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid filter values provided';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to update quote filters. Please try again.');
      }
    }
  },

  /**
   * Get detailed comparison for a specific employee
   * @param {string} quoteId - Quote ID
   * @param {string} memberId - Member ID
   * @param {Object} filters - Filter options
   * @returns {Promise<Object>} - Employee comparison data
   */
  async getEmployeeComparison(quoteId, memberId, filters = {}) {
    try {
      const params = {
        carrier: filters.carrier || undefined,
        metalLevel: filters.metalLevel || undefined,
        market: filters.market || 'all'
      };

      // Remove undefined parameters
      Object.keys(params).forEach(key => params[key] === undefined && delete params[key]);

      const response = await api.get(`/quotes/${quoteId}/employee/${memberId}`, { params });

      return {
        success: true,
        employeeComparison: response.data.data,
        message: response.data.message
      };
    } catch (error) {
      console.error('Error fetching employee comparison:', error);
      
      if (error.response?.status === 404) {
        const errorMessage = error.response?.data?.error || 'Quote or member not found';
        throw new Error(errorMessage);
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid ID format';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch employee comparison. Please try again.');
      }
    }
  },

  /**
   * Get available filter options for a quote
   * @param {string} quoteId - Quote ID
   * @returns {Promise<Object>} - Available filter options
   */
  async getAvailableFilters(quoteId) {
    try {
      const response = await api.get(`/quotes/${quoteId}/filters/available`);

      return {
        success: true,
        quoteId: response.data.data.quoteId,
        availableFilters: response.data.data.availableFilters,
        statistics: response.data.data.statistics
      };
    } catch (error) {
      console.error('Error fetching available filters:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Quote not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid quote ID format');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch available filters. Please try again.');
      }
    }
  },

  /**
   * Validate quote data before generation
   * @param {string} groupId - Group ID
   * @param {Object} quoteData - Quote configuration data
   * @returns {Object} - Validation result
   */
  validateQuoteData(groupId, quoteData = {}) {
    const errors = {};

    // Group ID validation
    if (!groupId || !groupId.match(/^[0-9a-fA-F]{24}$/)) {
      errors.groupId = 'Valid group ID is required';
    }

    // Filters validation
    if (quoteData.filters) {
      const { filters } = quoteData;

      // Premium range validation
      if (filters.premiumRange) {
        if (filters.premiumRange.min < 0 || filters.premiumRange.max < 0) {
          errors.premiumRange = 'Premium range values must be positive';
        }
        if (filters.premiumRange.min >= filters.premiumRange.max) {
          errors.premiumRange = 'Maximum premium must be greater than minimum';
        }
      }

      // Deductible range validation
      if (filters.deductibleRange) {
        if (filters.deductibleRange.min < 0 || filters.deductibleRange.max < 0) {
          errors.deductibleRange = 'Deductible range values must be positive';
        }
        if (filters.deductibleRange.min >= filters.deductibleRange.max) {
          errors.deductibleRange = 'Maximum deductible must be greater than minimum';
        }
      }

      // Metal levels validation
      if (filters.metalLevels && Array.isArray(filters.metalLevels)) {
        const validLevels = ['bronze', 'silver', 'gold', 'platinum'];
        const invalidLevels = filters.metalLevels.filter(level => !validLevels.includes(level));
        if (invalidLevels.length > 0) {
          errors.metalLevels = `Invalid metal levels: ${invalidLevels.join(', ')}`;
        }
      }

      // Plan types validation
      if (filters.planTypes && Array.isArray(filters.planTypes)) {
        const validTypes = ['hmo', 'ppo', 'epo', 'pos', 'hdhp'];
        const invalidTypes = filters.planTypes.filter(type => !validTypes.includes(type));
        if (invalidTypes.length > 0) {
          errors.planTypes = `Invalid plan types: ${invalidTypes.join(', ')}`;
        }
      }
    }

    // Custom contributions validation
    if (quoteData.customContributions) {
      Object.entries(quoteData.customContributions).forEach(([classId, contribution]) => {
        if (typeof contribution !== 'object') {
          errors[`contribution_${classId}`] = 'Contribution must be an object';
          return;
        }

        if (contribution.employee !== undefined) {
          const empContrib = parseFloat(contribution.employee);
          if (isNaN(empContrib) || empContrib < 0) {
            errors[`contribution_${classId}_employee`] = 'Employee contribution must be a positive number';
          }
        }

        if (contribution.dependent !== undefined) {
          const depContrib = parseFloat(contribution.dependent);
          if (isNaN(depContrib) || depContrib < 0) {
            errors[`contribution_${classId}_dependent`] = 'Dependent contribution must be a positive number';
          }
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}; 