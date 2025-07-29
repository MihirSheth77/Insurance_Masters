import React, { useState, useEffect } from 'react';

/**
 * Plan Filters Component
 * Provides real-time filtering interface for quote results
 */
const PlanFilters = ({ 
  activeFilters, 
  availableFilters, 
  onFilterChange, 
  loading = false 
}) => {
  const [localFilters, setLocalFilters] = useState(activeFilters);
  const [isExpanded, setIsExpanded] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Update local filters when active filters change
  useEffect(() => {
    setLocalFilters(activeFilters);
  }, [activeFilters]);

  /**
   * Handle carrier filter changes
   */
  const handleCarrierChange = (carrier, checked) => {
    const newCarriers = checked
      ? [...localFilters.carrier, carrier]
      : localFilters.carrier.filter(c => c !== carrier);
    
    const newFilters = { ...localFilters, carrier: newCarriers };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  /**
   * Handle metal level filter changes
   */
  const handleMetalLevelChange = (metalLevel, checked) => {
    const newMetalLevels = checked
      ? [...localFilters.metalLevel, metalLevel]
      : localFilters.metalLevel.filter(ml => ml !== metalLevel);
    
    const newFilters = { ...localFilters, metalLevel: newMetalLevels };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  /**
   * Handle market filter changes
   */
  const handleMarketChange = (market) => {
    const newFilters = { ...localFilters, market };
    setLocalFilters(newFilters);
    onFilterChange(newFilters);
  };

  /**
   * Clear all filters
   */
  const clearAllFilters = () => {
    const clearedFilters = {
      carrier: [],
      metalLevel: [],
      market: 'all'
    };
    setLocalFilters(clearedFilters);
    onFilterChange(clearedFilters);
  };

  /**
   * Apply preset filters
   */
  const applyPreset = (presetName) => {
    let presetFilters;
    
    switch (presetName) {
      case 'bronze-silver':
        presetFilters = {
          ...localFilters,
          metalLevel: ['Bronze', 'Silver']
        };
        break;
      case 'gold-platinum':
        presetFilters = {
          ...localFilters,
          metalLevel: ['Gold', 'Platinum']
        };
        break;
      case 'on-market-only':
        presetFilters = {
          ...localFilters,
          market: 'on-market'
        };
        break;
      case 'off-market-only':
        presetFilters = {
          ...localFilters,
          market: 'off-market'
        };
        break;
      default:
        presetFilters = localFilters;
    }
    
    setLocalFilters(presetFilters);
    onFilterChange(presetFilters);
  };

  /**
   * Check if any filters are active
   */
  const hasActiveFilters = () => {
    return localFilters.carrier.length > 0 || 
           localFilters.metalLevel.length > 0 || 
           localFilters.market !== 'all';
  };

  /**
   * Get filter summary text
   */
  const getFilterSummary = () => {
    const parts = [];
    
    if (localFilters.carrier.length > 0) {
      parts.push(`${localFilters.carrier.length} carrier${localFilters.carrier.length > 1 ? 's' : ''}`);
    }
    
    if (localFilters.metalLevel.length > 0) {
      parts.push(`${localFilters.metalLevel.length} metal level${localFilters.metalLevel.length > 1 ? 's' : ''}`);
    }
    
    if (localFilters.market !== 'all') {
      parts.push(localFilters.market);
    }
    
    return parts.length > 0 ? parts.join(', ') : 'No filters applied';
  };

  return (
    <div className={`plan-filters ${isExpanded ? 'expanded' : 'collapsed'}`}>
      {/* Filter Header */}
      <div className="filter-header">
        <div className="filter-title">
          <h3>Plan Filters</h3>
          {loading && <div className="filter-loading-spinner"></div>}
        </div>
        
        <div className="filter-summary">
          <span className="summary-text">{getFilterSummary()}</span>
          <button 
            className="expand-toggle"
            onClick={() => setIsExpanded(!isExpanded)}
            aria-label={isExpanded ? 'Collapse filters' : 'Expand filters'}
          >
            {isExpanded ? '▲' : '▼'}
          </button>
        </div>
      </div>

      {/* Filter Content */}
      {isExpanded && (
        <div className="filter-content">
          {/* Quick Actions */}
          <div className="quick-actions">
            <div className="preset-filters">
              <span className="preset-label">Quick Filters:</span>
              <button 
                className="preset-btn"
                onClick={() => applyPreset('bronze-silver')}
              >
                Bronze & Silver
              </button>
              <button 
                className="preset-btn"
                onClick={() => applyPreset('gold-platinum')}
              >
                Gold & Platinum
              </button>
              <button 
                className="preset-btn"
                onClick={() => applyPreset('on-market-only')}
              >
                On-Market Only
              </button>
            </div>
            
            {hasActiveFilters() && (
              <button 
                className="clear-all-btn"
                onClick={clearAllFilters}
              >
                Clear All
              </button>
            )}
          </div>

          {/* Main Filter Groups */}
          <div className="filter-groups">
            {/* Market Type Filter */}
            <div className="filter-group market-filter">
              <div className="filter-group-header">
                <h4>Market Type</h4>
                <span className="filter-help">Choose plan marketplace</span>
              </div>
              <div className="filter-options radio-group">
                {availableFilters.markets?.map(market => (
                  <label key={market} className="radio-option">
                    <input
                      type="radio"
                      name="market"
                      value={market}
                      checked={localFilters.market === market}
                      onChange={() => handleMarketChange(market)}
                      disabled={loading}
                    />
                    <span className="radio-label">
                      {market === 'all' ? 'All Markets' : 
                       market === 'on-market' ? 'On-Market (with subsidies)' : 
                       'Off-Market (no subsidies)'}
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Metal Level Filter */}
            <div className="filter-group metal-level-filter">
              <div className="filter-group-header">
                <h4>Metal Level</h4>
                <span className="filter-help">Filter by coverage level</span>
              </div>
              <div className="filter-options checkbox-group">
                {availableFilters.metalLevels?.map(level => (
                  <label key={level} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={localFilters.metalLevel.includes(level)}
                      onChange={(e) => handleMetalLevelChange(level, e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkbox-label">
                      {level}
                      <span className="level-description">
                        {level === 'Bronze' && '~60% coverage'}
                        {level === 'Silver' && '~70% coverage'}
                        {level === 'Gold' && '~80% coverage'}
                        {level === 'Platinum' && '~90% coverage'}
                        {level === 'Catastrophic' && 'Minimal coverage'}
                      </span>
                    </span>
                  </label>
                ))}
              </div>
            </div>

            {/* Carrier Filter */}
            <div className="filter-group carrier-filter">
              <div className="filter-group-header">
                <h4>Insurance Carriers</h4>
                <span className="filter-help">Filter by insurance company</span>
              </div>
              <div className="filter-options checkbox-group carrier-list">
                {availableFilters.carriers?.map(carrier => (
                  <label key={carrier} className="checkbox-option">
                    <input
                      type="checkbox"
                      checked={localFilters.carrier.includes(carrier)}
                      onChange={(e) => handleCarrierChange(carrier, e.target.checked)}
                      disabled={loading}
                    />
                    <span className="checkbox-label">{carrier}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Advanced Options */}
          <div className="advanced-options">
            <button 
              className="advanced-toggle"
              onClick={() => setShowAdvanced(!showAdvanced)}
            >
              Advanced Options {showAdvanced ? '▲' : '▼'}
            </button>
            
            {showAdvanced && (
              <div className="advanced-content">
                <div className="advanced-filters">
                  <div className="advanced-note">
                    <p>
                      <strong>Filter Tips:</strong>
                    </p>
                    <ul>
                      <li>On-market plans include premium tax credit eligibility</li>
                      <li>Bronze/Silver plans typically have lower premiums but higher deductibles</li>
                      <li>Gold/Platinum plans have higher premiums but lower out-of-pocket costs</li>
                      <li>Multiple carriers provide more employee choice</li>
                    </ul>
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Filter Impact Summary */}
          {hasActiveFilters() && (
            <div className="filter-impact">
              <div className="impact-header">
                <h4>Filter Impact</h4>
              </div>
              <div className="impact-details">
                <div className="impact-item">
                  <span className="impact-label">Active Filters:</span>
                  <span className="impact-value">{getFilterSummary()}</span>
                </div>
                
                {localFilters.market === 'on-market' && (
                  <div className="impact-note">
                    <strong>On-Market Focus:</strong> Showing only marketplace plans with potential 
                    premium tax credit eligibility.
                  </div>
                )}
                
                {localFilters.market === 'off-market' && (
                  <div className="impact-note">
                    <strong>Off-Market Focus:</strong> Showing only non-marketplace plans without 
                    premium tax credit eligibility.
                  </div>
                )}
                
                {localFilters.metalLevel.length > 0 && localFilters.metalLevel.length < availableFilters.metalLevels?.length && (
                  <div className="impact-note">
                    <strong>Limited Coverage Levels:</strong> Results filtered to 
                    {localFilters.metalLevel.join(', ')} plans only.
                  </div>
                )}
                
                {localFilters.carrier.length > 0 && localFilters.carrier.length < availableFilters.carriers?.length && (
                  <div className="impact-note">
                    <strong>Limited Carriers:</strong> Results filtered to 
                    {localFilters.carrier.slice(0, 3).join(', ')}
                    {localFilters.carrier.length > 3 && ` and ${localFilters.carrier.length - 3} more`} only.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Loading Overlay */}
      {loading && (
        <div className="filter-loading-overlay">
          <div className="loading-message">
            <div className="loading-spinner"></div>
            <span>Updating results with new filters...</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanFilters;