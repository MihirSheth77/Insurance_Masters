import React, { useState, useEffect, useCallback } from 'react';
import QuoteApiService from '../../services/quoteApi';
import QuoteSummary from './QuoteSummary';
import EmployeeComparisons from './EmployeeComparisons';
import EmployerComparison from './EmployerComparison';
import PlanFilters from './PlanFilters';

/**
 * Main Quote Results Page Component
 * Orchestrates the display of comprehensive quote analysis
 */
const QuoteResultsPage = ({ quoteId }) => {
  const [quoteData, setQuoteData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeFilters, setActiveFilters] = useState({
    carrier: [],
    metalLevel: [],
    market: 'all'
  });
  const [availableFilters, setAvailableFilters] = useState({
    carriers: [],
    metalLevels: [],
    markets: ['all', 'on-market', 'off-market']
  });
  const [activeTab, setActiveTab] = useState('summary');
  const [filterUpdateLoading, setFilterUpdateLoading] = useState(false);

  /**
   * Load initial quote data and available filters
   */
  const loadQuoteData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Load comprehensive quote summary
      const summaryResponse = await QuoteApiService.getQuoteSummary(quoteId, activeFilters);
      setQuoteData(summaryResponse.data);

      // Load available filter options
      const filtersResponse = await QuoteApiService.getAvailableFilters(quoteId);
      setAvailableFilters(filtersResponse.data.availableFilters);

    } catch (err) {
      setError(err.message || 'Failed to load quote data');
    } finally {
      setLoading(false);
    }
  }, [quoteId, activeFilters]);

  /**
   * Handle real-time filter updates
   */
  const handleFilterChange = useCallback(async (newFilters) => {
    try {
      setFilterUpdateLoading(true);
      setActiveFilters(newFilters);

      // Get updated comparison data with new filters
      const updatedSummary = await QuoteApiService.getQuoteSummary(quoteId, newFilters);
      setQuoteData(updatedSummary.data);

    } catch (err) {
      setError(`Filter update failed: ${err.message}`);
    } finally {
      setFilterUpdateLoading(false);
    }
  }, [quoteId]);

  /**
   * Handle tab switching
   */
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  /**
   * Export quote data
   */
  const handleExport = async (format) => {
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
    } catch (err) {
      setError(`Export failed: ${err.message}`);
    }
  };

  // Load data on component mount and when quoteId changes
  useEffect(() => {
    if (quoteId) {
      loadQuoteData();
    }
  }, [quoteId, loadQuoteData]);

  if (loading && !quoteData) {
    return (
      <div className="quote-results-page">
        <div className="loading-container">
          <div className="loading-spinner"></div>
          <p>Loading comprehensive quote analysis...</p>
        </div>
      </div>
    );
  }

  if (error && !quoteData) {
    return (
      <div className="quote-results-page">
        <div className="error-container">
          <h3>Error Loading Quote</h3>
          <p>{error}</p>
          <button onClick={loadQuoteData} className="retry-button">
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (!quoteData) {
    return (
      <div className="quote-results-page">
        <div className="no-data-container">
          <p>No quote data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="quote-results-page">
      {/* Header Section */}
      <div className="quote-header">
        <div className="header-content">
          <h1>ICHRA Quote Analysis</h1>
          <div className="quote-meta">
            <span className="quote-id">Quote ID: {quoteData.quoteId}</span>
            <span className="group-id">Group ID: {quoteData.groupId}</span>
            <span className="generated-at">
              Generated: {new Date(quoteData.generatedAt).toLocaleDateString()}
            </span>
            {quoteData.filteredAt && (
              <span className="filtered-at">
                Last Filtered: {new Date(quoteData.filteredAt).toLocaleDateString()}
              </span>
            )}
          </div>
        </div>
        
        {/* Export Controls */}
        <div className="export-controls">
          <button onClick={() => handleExport('csv')} className="export-btn">
            Export CSV
          </button>
          <button onClick={() => handleExport('excel')} className="export-btn">
            Export Excel
          </button>
          <button onClick={() => handleExport('pdf')} className="export-btn">
            Export PDF
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="error-banner">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="dismiss-error">×</button>
        </div>
      )}

      {/* Filter Update Loading */}
      {filterUpdateLoading && (
        <div className="filter-loading-banner">
          <span>Updating comparison data with new filters...</span>
        </div>
      )}

      {/* Filters Section */}
      <div className="filters-section">
        <PlanFilters
          activeFilters={activeFilters}
          availableFilters={availableFilters}
          onFilterChange={handleFilterChange}
          loading={filterUpdateLoading}
        />
      </div>

      {/* Navigation Tabs */}
      <div className="nav-tabs">
        <button
          className={`tab ${activeTab === 'summary' ? 'active' : ''}`}
          onClick={() => handleTabChange('summary')}
        >
          Overview & Summary
        </button>
        <button
          className={`tab ${activeTab === 'employer' ? 'active' : ''}`}
          onClick={() => handleTabChange('employer')}
        >
          Employer Comparison
        </button>
        <button
          className={`tab ${activeTab === 'employees' ? 'active' : ''}`}
          onClick={() => handleTabChange('employees')}
        >
          Employee Comparisons
        </button>
      </div>

      {/* Content Section */}
      <div className="content-section">
        {activeTab === 'summary' && (
          <QuoteSummary
            data={quoteData}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        )}
        
        {activeTab === 'employer' && (
          <EmployerComparison
            data={quoteData.employerComparison}
            overallAnalysis={quoteData.overallAnalysis}
            subsidyAnalysis={quoteData.subsidyAnalysis}
            planAnalysis={quoteData.planAnalysis}
            activeFilters={activeFilters}
          />
        )}
        
        {activeTab === 'employees' && (
          <EmployeeComparisons
            quoteId={quoteData.quoteId}
            employeeDetails={quoteData.employeeDetails || []}
            employeeSummary={quoteData.employeeSummary}
            activeFilters={activeFilters}
            onFilterChange={handleFilterChange}
          />
        )}
      </div>

      {/* Applied Filters Summary */}
      {(activeFilters.carrier.length > 0 || 
        activeFilters.metalLevel.length > 0 || 
        activeFilters.market !== 'all') && (
        <div className="applied-filters-summary">
          <h4>Active Filters:</h4>
          <div className="filter-tags">
            {activeFilters.carrier.map(carrier => (
              <span key={carrier} className="filter-tag carrier">
                Carrier: {carrier}
              </span>
            ))}
            {activeFilters.metalLevel.map(level => (
              <span key={level} className="filter-tag metal-level">
                Metal Level: {level}
              </span>
            ))}
            {activeFilters.market !== 'all' && (
              <span className="filter-tag market">
                Market: {activeFilters.market}
              </span>
            )}
          </div>
          <button 
            onClick={() => handleFilterChange({ carrier: [], metalLevel: [], market: 'all' })}
            className="clear-filters-btn"
          >
            Clear All Filters
          </button>
        </div>
      )}
    </div>
  );
};

export default QuoteResultsPage;