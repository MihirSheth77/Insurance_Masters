import React, { useState } from 'react';
import Button from '../../components/common/Button';
import './PlanFilters.css';

const PlanFilters = ({ 
  filters, 
  onFilterChange, 
  onClearFilters,
  availableCarriers = [],
  isLoading = false,
  filterStats = {}
}) => {
  // Expandable sections state
  const [expandedSections, setExpandedSections] = useState({
    basic: true,
    cost: true,
    features: false,
    ichra: false
  });

  // Metal level options with colors
  const metalLevels = [
    { value: 'bronze', label: 'Bronze', color: '#CD7F32' },
    { value: 'silver', label: 'Silver', color: '#C0C0C0' },
    { value: 'gold', label: 'Gold', color: '#FFD700' },
    { value: 'platinum', label: 'Platinum', color: '#E5E4E2' }
  ];

  // Plan type options
  const planTypes = [
    { value: 'hmo', label: 'HMO' },
    { value: 'ppo', label: 'PPO' },
    { value: 'epo', label: 'EPO' },
    { value: 'pos', label: 'POS' }
  ];

  // Carrier options - 6 major issuers
  const carrierOptions = availableCarriers.length > 0 ? availableCarriers.map(carrier => ({
    value: carrier.id,
    label: carrier.name,
    planCount: carrier.planCount
  })) : [
    { value: 'anthem', label: 'Anthem', planCount: 25 },
    { value: 'aetna', label: 'Aetna', planCount: 18 },
    { value: 'cigna', label: 'Cigna', planCount: 22 },
    { value: 'humana', label: 'Humana', planCount: 16 },
    { value: 'unitedhealth', label: 'UnitedHealth', planCount: 30 },
    { value: 'bluecross', label: 'Blue Cross Blue Shield', planCount: 28 }
  ];

  // Handle filter changes with immediate server-side recalculation
  const handleFilterChange = (filterKey, value) => {
    const newFilters = { [filterKey]: value };
    onFilterChange(newFilters);
    
  };

  // Handle multi-select filters (arrays) with immediate server-side updates
  const handleMultiSelectChange = (filterKey, value, checked) => {
    const currentValues = filters[filterKey] || [];
    let newValues;
    
    if (checked) {
      newValues = [...currentValues, value];
    } else {
      newValues = currentValues.filter(v => v !== value);
    }
    
    const newFilters = { [filterKey]: newValues };
    onFilterChange(newFilters);
    
  };

  // Handle apply filters - triggers server-side recalculation
  const handleApplyFilters = () => {
    // Force a recalculation with current filters via server API
    onFilterChange({ ...filters, _forceUpdate: Date.now() });
  };

  // Handle clear all filters with immediate server-side reset
  const handleClearAllFilters = () => {
    onClearFilters();
  };

  // Toggle section expansion
  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Handle range input changes
  const handleRangeChange = (rangeKey, minMax, value) => {
    const currentRange = filters[rangeKey] || { min: 0, max: 10000 };
    const newRange = {
      ...currentRange,
      [minMax]: parseInt(value) || 0
    };
    handleFilterChange(rangeKey, newRange);
  };

  return (
    <div className="plan-filters">
      <div className="filters-header">
        <h3>Filter Plans</h3>
        <div className="filter-actions">
          <Button
            variant="primary"
            size="small"
            onClick={handleApplyFilters}
            disabled={isLoading}
          >
            Apply Filters
          </Button>
          <Button
            variant="outline"
            size="small"
            onClick={handleClearAllFilters}
            disabled={isLoading}
          >
            Clear All
          </Button>
        </div>
      </div>

      {/* Filter Statistics */}
      <div className="filter-info">
        <div className="info-item">
          <div className="info-icon">📊</div>
          <div className="info-text">
            <div className="stats-main">
              <strong>{filterStats.filteredCount || 0}</strong> of <strong>{filterStats.totalPlans || 0}</strong> plans match your filters
            </div>
            <div className="stats-secondary">
              {(filterStats.filterPercentage || 0).toFixed(1)}% of available plans
              {isLoading && <span className="updating-indicator"> ⚡ Updating...</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Basic Filters */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('basic')}
        >
          <h4>Basic Filters</h4>
          <span className={`expand-icon ${expandedSections.basic ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.basic && (
          <div className="filter-section-content">
            {/* Metal Levels - Real-time checkboxes */}
            <div className="filter-group">
              <label className="filter-label">
                Metal Level 
                <span className="selected-count">
                  ({(filters.metalLevels || []).length} selected)
                </span>
              </label>
              <div className="checkbox-group metal-levels">
                {metalLevels.map(level => (
                  <label key={level.value} className={`checkbox-item metal-level-item ${(filters.metalLevels || []).includes(level.value) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={(filters.metalLevels || []).includes(level.value)}
                      onChange={(e) => handleMultiSelectChange('metalLevels', level.value, e.target.checked)}
                      disabled={isLoading}
                    />
                    <span className="checkbox-label">
                      <span 
                        className="metal-indicator"
                        style={{ backgroundColor: level.color }}
                      />
                      {level.label}
                    </span>
                    {(filters.metalLevels || []).includes(level.value) && (
                      <span className="selected-indicator">✓</span>
                    )}
                  </label>
                ))}
              </div>
            </div>

            {/* Plan Types */}
            <div className="filter-group">
              <label className="filter-label">Plan Type</label>
              <div className="checkbox-group">
                {planTypes.map(type => (
                  <label key={type.value} className="checkbox-item">
                    <input
                      type="checkbox"
                      checked={(filters.planTypes || []).includes(type.value)}
                      onChange={(e) => handleMultiSelectChange('planTypes', type.value, e.target.checked)}
                      disabled={isLoading}
                    />
                    <span className="checkbox-label">{type.label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Insurance Carriers - Multi-select from 6 issuers */}
            <div className="filter-group">
              <label className="filter-label">
                Insurance Carrier 
                <span className="selected-count">
                  ({(filters.carriers || []).length} of {carrierOptions.length} selected)
                </span>
              </label>
              <div className="checkbox-group carriers">
                {carrierOptions.map(carrier => (
                  <label key={carrier.value} className={`checkbox-item carrier-item ${(filters.carriers || []).includes(carrier.value) ? 'selected' : ''}`}>
                    <input
                      type="checkbox"
                      checked={(filters.carriers || []).includes(carrier.value)}
                      onChange={(e) => handleMultiSelectChange('carriers', carrier.value, e.target.checked)}
                      disabled={isLoading}
                    />
                    <span className="checkbox-label">
                      {carrier.label}
                      <span className="plan-count">({carrier.planCount} plans)</span>
                    </span>
                    {(filters.carriers || []).includes(carrier.value) && (
                      <span className="selected-indicator">✓</span>
                    )}
                  </label>
                ))}
              </div>
              
              {/* Carrier Selection Helper */}
              <div className="filter-helper">
                <button 
                  type="button" 
                  className="helper-link"
                  onClick={() => {
                    const allCarrierIds = carrierOptions.map(c => c.value);
                    handleFilterChange('carriers', allCarrierIds);
                  }}
                  disabled={isLoading}
                >
                  Select All
                </button>
                {(filters.carriers || []).length > 0 && (
                  <button 
                    type="button" 
                    className="helper-link"
                    onClick={() => handleFilterChange('carriers', [])}
                    disabled={isLoading}
                  >
                    Clear Selection
                  </button>
                )}
              </div>
            </div>

            {/* Market Filter - Radio buttons for on-market/off-market/all */}
            <div className="filter-group">
              <label className="filter-label">Market Type</label>
              <div className="radio-group market-filter">
                <label className={`radio-item ${filters.market === 'all' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="market"
                    value="all"
                    checked={filters.market === 'all' || !filters.market}
                    onChange={() => handleFilterChange('market', 'all')}
                    disabled={isLoading}
                  />
                  <span className="radio-label">All Plans</span>
                  <span className="radio-description">On-market and off-market</span>
                </label>
                <label className={`radio-item ${filters.market === 'on-market' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="market"
                    value="on-market"
                    checked={filters.market === 'on-market'}
                    onChange={() => handleFilterChange('market', 'on-market')}
                    disabled={isLoading}
                  />
                  <span className="radio-label">On-Market Only</span>
                  <span className="radio-description">ACA marketplace plans</span>
                </label>
                <label className={`radio-item ${filters.market === 'off-market' ? 'selected' : ''}`}>
                  <input
                    type="radio"
                    name="market"
                    value="off-market"
                    checked={filters.market === 'off-market'}
                    onChange={() => handleFilterChange('market', 'off-market')}
                    disabled={isLoading}
                  />
                  <span className="radio-label">Off-Market Only</span>
                  <span className="radio-description">Private exchange plans</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Premium & Cost Filters */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('cost')}
        >
          <h4>Premium & Cost</h4>
          <span className={`expand-icon ${expandedSections.cost ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.cost && (
          <div className="filter-section-content">
            {/* Monthly Premium Range */}
            <div className="filter-group">
              <label className="filter-label">Monthly Premium Range</label>
              <div className="range-inputs">
                <div className="range-input">
                  <label>Min ($)</label>
                  <input
                    type="number"
                    value={filters.premiumRange?.min || 0}
                    onChange={(e) => handleRangeChange('premiumRange', 'min', e.target.value)}
                    disabled={isLoading}
                    min="0"
                    max="5000"
                  />
                </div>
                <span className="range-separator">to</span>
                <div className="range-input">
                  <label>Max ($)</label>
                  <input
                    type="number"
                    value={filters.premiumRange?.max || 10000}
                    onChange={(e) => handleRangeChange('premiumRange', 'max', e.target.value)}
                    disabled={isLoading}
                    min="0"
                    max="10000"
                  />
                </div>
              </div>
              <div className="range-display">
                ${filters.premiumRange?.min || 0} - ${filters.premiumRange?.max || 10000} per month
              </div>
            </div>

            {/* Annual Deductible Range */}
            <div className="filter-group">
              <label className="filter-label">Annual Deductible Range</label>
              <div className="range-inputs">
                <div className="range-input">
                  <label>Min ($)</label>
                  <input
                    type="number"
                    value={filters.deductibleRange?.min || 0}
                    onChange={(e) => handleRangeChange('deductibleRange', 'min', e.target.value)}
                    disabled={isLoading}
                    min="0"
                    max="15000"
                  />
                </div>
                <span className="range-separator">to</span>
                <div className="range-input">
                  <label>Max ($)</label>
                  <input
                    type="number"
                    value={filters.deductibleRange?.max || 15000}
                    onChange={(e) => handleRangeChange('deductibleRange', 'max', e.target.value)}
                    disabled={isLoading}
                    min="0"
                    max="25000"
                  />
                </div>
              </div>
              <div className="range-display">
                ${filters.deductibleRange?.min || 0} - ${filters.deductibleRange?.max || 15000} annually
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Coverage Features */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('features')}
        >
          <h4>Coverage Features</h4>
          <span className={`expand-icon ${expandedSections.features ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.features && (
          <div className="filter-section-content">
            {/* Network Size */}
            <div className="filter-group">
              <label className="filter-label">Provider Network Size</label>
              <div className="radio-group">
                {['any', 'large', 'medium', 'small'].map(size => (
                  <label key={size} className="radio-item">
                    <input
                      type="radio"
                      name="networkSize"
                      value={size}
                      checked={filters.networkSize === size}
                      onChange={() => handleFilterChange('networkSize', size)}
                      disabled={isLoading}
                    />
                    <span className="radio-label">{size.charAt(0).toUpperCase() + size.slice(1)}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* HSA Eligibility */}
            <div className="filter-group">
              <label className="filter-label">HSA Eligibility</label>
              <div className="radio-group">
                <label className="radio-item">
                  <input
                    type="radio"
                    name="hsaEligible"
                    checked={filters.hsaEligible === null}
                    onChange={() => handleFilterChange('hsaEligible', null)}
                    disabled={isLoading}
                  />
                  <span className="radio-label">Any</span>
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="hsaEligible"
                    checked={filters.hsaEligible === true}
                    onChange={() => handleFilterChange('hsaEligible', true)}
                    disabled={isLoading}
                  />
                  <span className="radio-label">HSA Compatible</span>
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="hsaEligible"
                    checked={filters.hsaEligible === false}
                    onChange={() => handleFilterChange('hsaEligible', false)}
                    disabled={isLoading}
                  />
                  <span className="radio-label">Not HSA Compatible</span>
                </label>
              </div>
            </div>

            {/* Prescription Coverage */}
            <div className="filter-group">
              <label className="filter-label">Prescription Coverage</label>
              <div className="radio-group">
                <label className="radio-item">
                  <input
                    type="radio"
                    name="prescription"
                    checked={filters.prescription === null}
                    onChange={() => handleFilterChange('prescription', null)}
                    disabled={isLoading}
                  />
                  <span className="radio-label">Any</span>
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="prescription"
                    checked={filters.prescription === true}
                    onChange={() => handleFilterChange('prescription', true)}
                    disabled={isLoading}
                  />
                  <span className="radio-label">Included</span>
                </label>
                <label className="radio-item">
                  <input
                    type="radio"
                    name="prescription"
                    checked={filters.prescription === false}
                    onChange={() => handleFilterChange('prescription', false)}
                    disabled={isLoading}
                  />
                  <span className="radio-label">Not Included</span>
                </label>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ICHRA Features */}
      <div className="filter-section">
        <div 
          className="filter-section-header"
          onClick={() => toggleSection('ichra')}
        >
          <h4>ICHRA Features</h4>
          <span className={`expand-icon ${expandedSections.ichra ? 'expanded' : ''}`}>
            ▼
          </span>
        </div>
        {expandedSections.ichra && (
          <div className="filter-section-content">
            {/* ICHRA Compliance */}
            <div className="filter-group">
              <label className="checkbox-item">
                <input
                  type="checkbox"
                  checked={filters.showICHRACompliant}
                  onChange={(e) => handleFilterChange('showICHRACompliant', e.target.checked)}
                  disabled={isLoading}
                />
                <span className="checkbox-label">Show Only ICHRA Compliant Plans</span>
              </label>
            </div>
          </div>
        )}
      </div>

      {/* Active Filters */}
      {filterStats.isFiltered && (
        <div className="active-filters">
          <h4>Active Filters ({filterStats.activeFilterCount || 0})</h4>
          <div className="active-filter-tags">
            {(filters.metalLevels || []).map(level => (
              <div key={level} className="filter-tag">
                Metal: {level.charAt(0).toUpperCase() + level.slice(1)}
                <button onClick={() => handleMultiSelectChange('metalLevels', level, false)}>×</button>
              </div>
            ))}
            {(filters.carriers || []).map(carrier => {
              const carrierInfo = carrierOptions.find(c => c.value === carrier);
              return (
                <div key={carrier} className="filter-tag">
                  {carrierInfo?.label || carrier}
                  <button onClick={() => handleMultiSelectChange('carriers', carrier, false)}>×</button>
                </div>
              );
            })}
            {(filters.planTypes || []).map(type => (
              <div key={type} className="filter-tag">
                Type: {type.toUpperCase()}
                <button onClick={() => handleMultiSelectChange('planTypes', type, false)}>×</button>
              </div>
            ))}
            {filters.market && filters.market !== 'all' && (
              <div className="filter-tag">
                Market: {filters.market}
                <button onClick={() => handleFilterChange('market', 'all')}>×</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PlanFilters; 