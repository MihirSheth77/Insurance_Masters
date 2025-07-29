import React, { useState, useEffect } from 'react';
import QuoteApiService from '../../services/quoteApi';

/**
 * Employee Comparisons Component
 * Displays detailed cost comparisons for individual employees
 */
const EmployeeComparisons = ({ 
  quoteId, 
  employeeDetails = [], 
  employeeSummary, 
  activeFilters, 
  onFilterChange 
}) => {
  const [sortBy, setSortBy] = useState('monthlySavings');
  const [sortOrder, setSortOrder] = useState('desc');
  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [employeeDetailData, setEmployeeDetailData] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showOnlySavings, setShowOnlySavings] = useState(false);

  /**
   * Format currency values
   */
  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount || 0);
  };

  /**
   * Format percentage values
   */
  const formatPercentage = (value) => {
    return `${(value || 0).toFixed(1)}%`;
  };

  /**
   * Get savings indicator class
   */
  const getSavingsClass = (amount) => {
    if (amount > 0) return 'positive-savings';
    if (amount < 0) return 'negative-savings';
    return 'neutral-savings';
  };

  /**
   * Sort employees based on selected criteria
   */
  const sortedEmployees = React.useMemo(() => {
    let filtered = [...employeeDetails];

    // Apply search filter
    if (searchTerm) {
      filtered = filtered.filter(emp => 
        emp.memberName.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Apply savings filter
    if (showOnlySavings) {
      filtered = filtered.filter(emp => emp.monthlySavings > 0);
    }

    // Sort employees
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case 'name':
          aValue = a.memberName;
          bValue = b.memberName;
          break;
        case 'oldCost':
          aValue = a.oldOutOfPocketCost;
          bValue = b.oldOutOfPocketCost;
          break;
        case 'newCost':
          aValue = a.newOutOfPocketCost;
          bValue = b.newOutOfPocketCost;
          break;
        case 'monthlySavings':
          aValue = a.monthlySavings;
          bValue = b.monthlySavings;
          break;
        case 'savingsPercentage':
          aValue = a.savingsPercentage;
          bValue = b.savingsPercentage;
          break;
        case 'planOptions':
          aValue = a.planOptionsCount?.total || 0;
          bValue = b.planOptionsCount?.total || 0;
          break;
        default:
          aValue = a.monthlySavings;
          bValue = b.monthlySavings;
      }

      if (typeof aValue === 'string') {
        return sortOrder === 'asc' 
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue);
      }

      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    });

    return filtered;
  }, [employeeDetails, sortBy, sortOrder, searchTerm, showOnlySavings]);

  /**
   * Handle employee selection for detailed view
   */
  const handleEmployeeSelect = async (employee) => {
    if (selectedEmployee?.memberId === employee.memberId) {
      setSelectedEmployee(null);
      setEmployeeDetailData(null);
      return;
    }

    setSelectedEmployee(employee);
    setLoadingDetail(true);

    try {
      const response = await QuoteApiService.getEmployeeComparison(
        quoteId, 
        employee.memberId, 
        activeFilters
      );
      setEmployeeDetailData(response.data);
    } catch (error) {
      setEmployeeDetailData(null);
    } finally {
      setLoadingDetail(false);
    }
  };

  /**
   * Handle sort change
   */
  const handleSort = (field) => {
    if (sortBy === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('desc');
    }
  };

  /**
   * Calculate summary statistics
   */
  const summaryStats = React.useMemo(() => {
    const totalEmployees = sortedEmployees.length;
    const employeesWithSavings = sortedEmployees.filter(emp => emp.monthlySavings > 0).length;
    const totalSavings = sortedEmployees.reduce((sum, emp) => sum + emp.monthlySavings, 0);
    const averageSavings = totalEmployees > 0 ? totalSavings / totalEmployees : 0;

    return {
      totalEmployees,
      employeesWithSavings,
      totalSavings,
      averageSavings,
      savingsRate: totalEmployees > 0 ? (employeesWithSavings / totalEmployees) * 100 : 0
    };
  }, [sortedEmployees]);

  return (
    <div className="employee-comparisons">
      {/* Summary Section */}
      <div className="employee-summary">
        <h2>Employee Cost Comparison Summary</h2>
        <div className="summary-cards">
          <div className="summary-card">
            <div className="card-value">{summaryStats.totalEmployees}</div>
            <div className="card-label">Total Employees</div>
          </div>
          <div className="summary-card positive">
            <div className="card-value">{summaryStats.employeesWithSavings}</div>
            <div className="card-label">Employees Saving Money</div>
            <div className="card-sublabel">{formatPercentage(summaryStats.savingsRate)}</div>
          </div>
          <div className="summary-card">
            <div className="card-value">{formatCurrency(summaryStats.totalSavings)}</div>
            <div className="card-label">Total Monthly Savings</div>
          </div>
          <div className="summary-card">
            <div className="card-value">{formatCurrency(summaryStats.averageSavings)}</div>
            <div className="card-label">Average Savings per Employee</div>
          </div>
        </div>
      </div>

      {/* Controls Section */}
      <div className="employee-controls">
        <div className="search-controls">
          <input
            type="text"
            placeholder="Search employees..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
          <label className="checkbox-label">
            <input
              type="checkbox"
              checked={showOnlySavings}
              onChange={(e) => setShowOnlySavings(e.target.checked)}
            />
            Show only employees with savings
          </label>
        </div>

        <div className="sort-controls">
          <label>Sort by:</label>
          <select 
            value={sortBy} 
            onChange={(e) => setSortBy(e.target.value)}
            className="sort-select"
          >
            <option value="monthlySavings">Monthly Savings</option>
            <option value="savingsPercentage">Savings Percentage</option>
            <option value="name">Employee Name</option>
            <option value="oldCost">Current Cost</option>
            <option value="newCost">New Cost</option>
            <option value="planOptions">Plan Options</option>
          </select>
          <button 
            onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
            className={`sort-order-btn ${sortOrder}`}
          >
            {sortOrder === 'asc' ? '↑' : '↓'}
          </button>
        </div>
      </div>

      {/* Employee List */}
      <div className="employee-list">
        <div className="employee-table">
          <div className="table-header">
            <div className="header-cell name" onClick={() => handleSort('name')}>
              Employee Name {sortBy === 'name' && (sortOrder === 'asc' ? '↑' : '↓')}
            </div>
            <div className="header-cell cost" onClick={() => handleSort('oldCost')}>
              Current Cost {sortBy === 'oldCost' && (sortOrder === 'asc' ? '↑' : '↓')}
            </div>
            <div className="header-cell cost" onClick={() => handleSort('newCost')}>
              New Cost {sortBy === 'newCost' && (sortOrder === 'asc' ? '↑' : '↓')}
            </div>
            <div className="header-cell savings" onClick={() => handleSort('monthlySavings')}>
              Monthly Savings {sortBy === 'monthlySavings' && (sortOrder === 'asc' ? '↑' : '↓')}
            </div>
            <div className="header-cell percentage" onClick={() => handleSort('savingsPercentage')}>
              Savings % {sortBy === 'savingsPercentage' && (sortOrder === 'asc' ? '↑' : '↓')}
            </div>
            <div className="header-cell plans" onClick={() => handleSort('planOptions')}>
              Plan Options {sortBy === 'planOptions' && (sortOrder === 'asc' ? '↑' : '↓')}
            </div>
            <div className="header-cell action">Details</div>
          </div>

          {sortedEmployees.map((employee) => (
            <React.Fragment key={employee.memberId}>
              <div 
                className={`employee-row ${selectedEmployee?.memberId === employee.memberId ? 'selected' : ''}`}
                onClick={() => handleEmployeeSelect(employee)}
              >
                <div className="cell name">
                  <div className="employee-name">{employee.memberName}</div>
                  {employee.subsidyEligible && (
                    <span className="subsidy-indicator">Subsidy Eligible</span>
                  )}
                </div>
                <div className="cell cost">
                  {formatCurrency(employee.oldOutOfPocketCost)}
                </div>
                <div className="cell cost">
                  {formatCurrency(employee.newOutOfPocketCost)}
                </div>
                <div className={`cell savings ${getSavingsClass(employee.monthlySavings)}`}>
                  {formatCurrency(employee.monthlySavings)}
                </div>
                <div className={`cell percentage ${getSavingsClass(employee.monthlySavings)}`}>
                  {formatPercentage(employee.savingsPercentage)}
                </div>
                <div className="cell plans">
                  <div className="plan-count">
                    {employee.planOptionsCount?.total || 0} plans
                  </div>
                  <div className="plan-breakdown">
                    {employee.planOptionsCount?.onMarket || 0} on-market, {employee.planOptionsCount?.offMarket || 0} off-market
                  </div>
                </div>
                <div className="cell action">
                  <button className="detail-btn">
                    {selectedEmployee?.memberId === employee.memberId ? 'Hide' : 'View'}
                  </button>
                </div>
              </div>

              {/* Employee Detail Panel */}
              {selectedEmployee?.memberId === employee.memberId && (
                <div className="employee-detail-panel">
                  {loadingDetail ? (
                    <div className="loading-detail">Loading employee details...</div>
                  ) : employeeDetailData ? (
                    <div className="employee-detail-content">
                      <div className="detail-header">
                        <h3>{employee.memberName} - Detailed Analysis</h3>
                        <div className="detail-meta">
                          <span>ICHRA Contribution: {formatCurrency(employee.ichraContribution)}</span>
                          {employee.subsidyEligible && (
                            <span className="subsidy-tag">Premium Tax Credit Eligible</span>
                          )}
                        </div>
                      </div>

                      <div className="cost-breakdown">
                        <div className="breakdown-section">
                          <h4>Cost Breakdown</h4>
                          <div className="breakdown-items">
                            <div className="breakdown-item">
                              <span>Previous Plan Cost:</span>
                              <span>{formatCurrency(employeeDetailData.previousPlan.totalCost)}</span>
                            </div>
                            <div className="breakdown-item">
                              <span>Previous Out-of-Pocket:</span>
                              <span>{formatCurrency(employeeDetailData.previousPlan.memberContribution)}</span>
                            </div>
                            <div className="breakdown-item best-plan">
                              <span>Best New Plan Cost:</span>
                              <span>{formatCurrency(employeeDetailData.comparison.bestPlan?.memberCost || 0)}</span>
                            </div>
                            <div className="breakdown-item savings">
                              <span>Monthly Savings:</span>
                              <span className={getSavingsClass(employeeDetailData.comparison.monthlySavings)}>
                                {formatCurrency(employeeDetailData.comparison.monthlySavings)}
                              </span>
                            </div>
                          </div>
                        </div>

                        {employeeDetailData.comparison.bestPlan && (
                          <div className="best-plan-section">
                            <h4>Recommended Plan</h4>
                            <div className="plan-details">
                              <div className="plan-info">
                                <div className="plan-name">{employeeDetailData.comparison.bestPlan.planName}</div>
                                <div className="plan-carrier">{employeeDetailData.comparison.bestPlan.carrier}</div>
                                <div className="plan-metal">{employeeDetailData.comparison.bestPlan.metalLevel}</div>
                              </div>
                              <div className="plan-costs">
                                <div>Premium: {formatCurrency(employeeDetailData.comparison.bestPlan.fullPremium)}</div>
                                <div>After Subsidy: {formatCurrency(employeeDetailData.comparison.bestPlan.subsidizedPremium)}</div>
                                <div>ICHRA Contribution: {formatCurrency(employeeDetailData.comparison.bestPlan.ichraContribution)}</div>
                                <div className="final-cost">Final Cost: {formatCurrency(employeeDetailData.comparison.bestPlan.memberCost)}</div>
                              </div>
                            </div>
                          </div>
                        )}
                      </div>

                      <div className="plan-options-summary">
                        <h4>Available Plan Options</h4>
                        <div className="options-grid">
                          <div className="option-card">
                            <div className="option-number">{employeeDetailData.filteredPlanOptions.onMarket.length}</div>
                            <div className="option-label">On-Market Plans</div>
                            <div className="option-note">With subsidies</div>
                          </div>
                          <div className="option-card">
                            <div className="option-number">{employeeDetailData.filteredPlanOptions.offMarket.length}</div>
                            <div className="option-label">Off-Market Plans</div>
                            <div className="option-note">Without subsidies</div>
                          </div>
                          <div className="option-card total">
                            <div className="option-number">{employeeDetailData.comparison.totalPlanOptions}</div>
                            <div className="option-label">Total Options</div>
                            <div className="option-note">After filters</div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="error-detail">Failed to load employee details</div>
                  )}
                </div>
              )}
            </React.Fragment>
          ))}
        </div>

        {sortedEmployees.length === 0 && (
          <div className="no-employees">
            {searchTerm || showOnlySavings 
              ? 'No employees match your filters'
              : 'No employee data available'
            }
          </div>
        )}
      </div>

      {/* Summary Insights */}
      <div className="employee-insights">
        <h3>Employee Impact Insights</h3>
        <div className="insights">
          {summaryStats.savingsRate > 80 && (
            <div className="insight positive">
              <strong>High Success Rate:</strong> {formatPercentage(summaryStats.savingsRate)} of employees 
              will save money with ICHRA, indicating strong employee benefit.
            </div>
          )}
          
          {summaryStats.averageSavings > 100 && (
            <div className="insight positive">
              <strong>Significant Savings:</strong> Average employee saves {formatCurrency(summaryStats.averageSavings)} 
              monthly, providing meaningful financial relief.
            </div>
          )}
          
          {summaryStats.savingsRate < 50 && (
            <div className="insight warning">
              <strong>Mixed Results:</strong> Only {formatPercentage(summaryStats.savingsRate)} of employees 
              will save money. Consider adjusting ICHRA contribution levels.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EmployeeComparisons;