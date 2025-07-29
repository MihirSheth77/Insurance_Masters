/**
 * Quote API Service
 * Provides interface to backend quote endpoints
 */

const API_BASE_URL = process.env.REACT_APP_API_BASE_URL || 'http://localhost:3000/api';

class QuoteApiService {
  constructor() {
    this.baseURL = `${API_BASE_URL}/quotes`;
  }

  /**
   * Generic API request handler
   */
  async makeRequest(url, options = {}) {
    try {
      const config = {
        headers: {
          'Content-Type': 'application/json',
          ...options.headers
        },
        ...options
      };

      const response = await fetch(url, config);
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `HTTP error! status: ${response.status}`);
      }

      return data;
    } catch (error) {
      console.error('API Request failed:', error);
      throw error;
    }
  }

  /**
   * Generate quotes for a group
   */
  async generateQuote(groupId, options = {}) {
    const url = `${this.baseURL}/generate`;
    return this.makeRequest(url, {
      method: 'POST',
      body: JSON.stringify({
        groupId,
        options
      })
    });
  }

  /**
   * Get comprehensive quote summary with employer/employee comparisons
   * This is the main endpoint for the summary page
   */
  async getQuoteSummary(quoteId, filters = {}) {
    const queryParams = new URLSearchParams();
    
    // Add filter parameters
    if (filters.carrier && filters.carrier.length > 0) {
      filters.carrier.forEach(c => queryParams.append('carrier', c));
    }
    if (filters.metalLevel && filters.metalLevel.length > 0) {
      filters.metalLevel.forEach(ml => queryParams.append('metalLevel', ml));
    }
    if (filters.market && filters.market !== 'all') {
      queryParams.append('market', filters.market);
    }
    
    queryParams.append('includeEmployeeDetails', 'true');

    const url = `${this.baseURL}/${quoteId}/summary?${queryParams.toString()}`;
    return this.makeRequest(url);
  }

  /**
   * Update quote filters in real-time and get updated comparison data
   */
  async updateQuoteFilters(quoteId, filters) {
    const url = `${this.baseURL}/${quoteId}/filters`;
    return this.makeRequest(url, {
      method: 'PUT',
      body: JSON.stringify({ filters })
    });
  }

  /**
   * Get filtered quote results with member details
   */
  async getFilteredQuoteResults(quoteId, filters = {}, options = {}) {
    const queryParams = new URLSearchParams();
    
    // Add filter parameters
    if (filters.carrier && filters.carrier.length > 0) {
      filters.carrier.forEach(c => queryParams.append('carrier', c));
    }
    if (filters.metalLevel && filters.metalLevel.length > 0) {
      filters.metalLevel.forEach(ml => queryParams.append('metalLevel', ml));
    }
    if (filters.market && filters.market !== 'all') {
      queryParams.append('market', filters.market);
    }

    // Add options
    queryParams.append('includeMembers', options.includeMembers || 'true');
    queryParams.append('page', options.page || '1');
    queryParams.append('limit', options.limit || '50');

    const url = `${this.baseURL}/${quoteId}/filtered?${queryParams.toString()}`;
    return this.makeRequest(url);
  }

  /**
   * Get detailed comparison for a specific employee
   */
  async getEmployeeComparison(quoteId, memberId, filters = {}) {
    const queryParams = new URLSearchParams();
    
    if (filters.carrier && filters.carrier.length > 0) {
      filters.carrier.forEach(c => queryParams.append('carrier', c));
    }
    if (filters.metalLevel && filters.metalLevel.length > 0) {
      filters.metalLevel.forEach(ml => queryParams.append('metalLevel', ml));
    }
    if (filters.market && filters.market !== 'all') {
      queryParams.append('market', filters.market);
    }

    const url = `${this.baseURL}/${quoteId}/employee/${memberId}?${queryParams.toString()}`;
    return this.makeRequest(url);
  }

  /**
   * Get available filter options for a quote
   */
  async getAvailableFilters(quoteId) {
    const url = `${this.baseURL}/${quoteId}/filters/available`;
    return this.makeRequest(url);
  }

  /**
   * Get basic quote details
   */
  async getQuote(quoteId, options = {}) {
    const queryParams = new URLSearchParams();
    
    if (options.includeDetails) {
      queryParams.append('includeDetails', 'true');
    }
    if (options.page) {
      queryParams.append('page', options.page);
    }
    if (options.limit) {
      queryParams.append('limit', options.limit);
    }

    const url = `${this.baseURL}/${quoteId}?${queryParams.toString()}`;
    return this.makeRequest(url);
  }

  /**
   * Export quote in various formats
   */
  async exportQuote(quoteId, format = 'csv', includeDetails = true) {
    const url = `${this.baseURL}/${quoteId}/export`;
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        format,
        includeDetails
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || 'Export failed');
    }

    // Handle different content types
    if (format === 'json') {
      return response.json();
    } else {
      return response.blob();
    }
  }

  /**
   * Get all quotes for a group
   */
  async getGroupQuotes(groupId, options = {}) {
    const queryParams = new URLSearchParams();
    
    if (options.page) queryParams.append('page', options.page);
    if (options.limit) queryParams.append('limit', options.limit);
    if (options.sortBy) queryParams.append('sortBy', options.sortBy);
    if (options.order) queryParams.append('order', options.order);

    const url = `${this.baseURL}/group/${groupId}?${queryParams.toString()}`;
    return this.makeRequest(url);
  }

  /**
   * Delete (archive) a quote
   */
  async deleteQuote(quoteId) {
    const url = `${this.baseURL}/${quoteId}`;
    return this.makeRequest(url, {
      method: 'DELETE'
    });
  }
}

export default new QuoteApiService();