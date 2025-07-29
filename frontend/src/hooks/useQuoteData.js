import { useState, useEffect, useCallback } from 'react';
import QuoteApiService from '../services/quoteApi';

/**
 * Custom hook for managing quote data and real-time filtering
 */
export const useQuoteData = (quoteId) => {
  const [quoteData, setQuoteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState({
    carrier: [],
    metalLevel: [],
    market: 'all'
  });
  const [availableFilters, setAvailableFilters] = useState({
    carriers: [],
    metalLevels: [],
    markets: ['all', 'on-market', 'off-market']
  });
  const [filterLoading, setFilterLoading] = useState(false);

  /**
   * Load initial quote data
   */
  const loadQuoteData = useCallback(async () => {
    if (!quoteId) return;

    try {
      setLoading(true);
      setError(null);

      // Load comprehensive quote summary
      const summaryResponse = await QuoteApiService.getQuoteSummary(quoteId, filters);
      setQuoteData(summaryResponse.data);

      // Load available filter options
      const filtersResponse = await QuoteApiService.getAvailableFilters(quoteId);
      setAvailableFilters(filtersResponse.data.availableFilters);

    } catch (err) {
      setError(err.message || 'Failed to load quote data');
    } finally {
      setLoading(false);
    }
  }, [quoteId, filters]);

  /**
   * Update filters and reload data
   */
  const updateFilters = useCallback(async (newFilters) => {
    try {
      setFilterLoading(true);
      setFilters(newFilters);

      // Get updated comparison data with new filters
      const updatedSummary = await QuoteApiService.getQuoteSummary(quoteId, newFilters);
      setQuoteData(updatedSummary.data);

    } catch (err) {
      setError(`Filter update failed: ${err.message}`);
    } finally {
      setFilterLoading(false);
    }
  }, [quoteId]);

  /**
   * Refresh quote data
   */
  const refreshData = useCallback(async () => {
    await loadQuoteData();
  }, [loadQuoteData]);

  /**
   * Export quote data
   */
  const exportQuote = useCallback(async (format) => {
    try {
      const blob = await QuoteApiService.exportQuote(quoteId, format, true);
      
      // Create download link
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `quote_${quoteId}.${format}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      return true;
    } catch (err) {
      setError(`Export failed: ${err.message}`);
      return false;
    }
  }, [quoteId]);

  /**
   * Clear error
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Load data on mount and when quoteId changes
  useEffect(() => {
    loadQuoteData();
  }, [loadQuoteData]);

  return {
    // Data
    quoteData,
    filters,
    availableFilters,
    
    // Loading states
    loading,
    filterLoading,
    
    // Error handling
    error,
    clearError,
    
    // Actions
    updateFilters,
    refreshData,
    exportQuote,
    
    // Computed values
    hasActiveFilters: filters.carrier.length > 0 || filters.metalLevel.length > 0 || filters.market !== 'all',
    isReady: !loading && !error && quoteData
  };
};

export default useQuoteData;