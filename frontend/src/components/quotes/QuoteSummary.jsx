import React from 'react';

/**
 * Quote Summary Component
 * Displays comprehensive overview of quote analysis with key metrics
 */
const QuoteSummary = ({ data, activeFilters, onFilterChange }) => {
  if (!data) {
    return <div className="quote-summary">No data available</div>;
  }

  const {
    employerComparison,
    employeeSummary,
    overallAnalysis,
    subsidyAnalysis,
    planAnalysis,
    employeeDetails = []
  } = data;

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
   * Calculate employee statistics for display
   */
  const employeeStats = {
    totalEmployees: employeeDetails.length,
    employeesWithSavings: employeeDetails.filter(emp => emp.monthlySavings > 0).length,
    employeesWithCosts: employeeDetails.filter(emp => emp.monthlySavings < 0).length,
    averageSavings: employeeDetails.length > 0 
      ? employeeDetails.reduce((sum, emp) => sum + emp.monthlySavings, 0) / employeeDetails.length 
      : 0
  };

  return (
    <div className="quote-summary">
      {/* Key Metrics Overview */}
      <div className="metrics-overview">
        <h2>Quote Summary Overview</h2>
        <div className="metrics-grid">
          {/* Total Savings Card */}
          <div className="metric-card total-savings">
            <div className="metric-header">
              <h3>Total Monthly Savings</h3>
              <span className="metric-subtitle">Combined Employer + Employee</span>
            </div>
            <div className={`metric-value ${getSavingsClass(overallAnalysis?.monthlySavings)}`}>
              {formatCurrency(overallAnalysis?.monthlySavings)}
            </div>
            <div className="metric-details">
              <div>Annual: {formatCurrency(overallAnalysis?.annualSavings)}</div>
              <div>Percentage: {formatPercentage(overallAnalysis?.savingsPercentage)}</div>
            </div>
          </div>

          {/* Employer Savings Card */}
          <div className="metric-card employer-savings">
            <div className="metric-header">
              <h3>Employer Savings</h3>
              <span className="metric-subtitle">Monthly Cost Reduction</span>
            </div>
            <div className={`metric-value ${getSavingsClass(employerComparison?.savings?.monthlySavings)}`}>
              {formatCurrency(employerComparison?.savings?.monthlySavings)}
            </div>
            <div className="metric-details">
              <div>Old Cost: {formatCurrency(employerComparison?.oldPlan?.totalMonthlyCost)}</div>
              <div>New Cost: {formatCurrency(employerComparison?.newICHRAPlan?.totalMonthlyCost)}</div>
              <div>Percentage: {formatPercentage(employerComparison?.savings?.savingsPercentage)}</div>
            </div>
          </div>

          {/* Employee Savings Card */}
          <div className="metric-card employee-savings">
            <div className="metric-header">
              <h3>Employee Savings</h3>
              <span className="metric-subtitle">Total Monthly Reduction</span>
            </div>
            <div className={`metric-value ${getSavingsClass(employeeSummary?.savings?.totalMonthlySavings)}`}>
              {formatCurrency(employeeSummary?.savings?.totalMonthlySavings)}
            </div>
            <div className="metric-details">
              <div>Avg per Employee: {formatCurrency(employeeSummary?.savings?.averageSavingsPerEmployee)}</div>
              <div>Percentage: {formatPercentage(employeeSummary?.savings?.savingsPercentage)}</div>
            </div>
          </div>

          {/* Plan Coverage Card */}
          <div className="metric-card plan-coverage">
            <div className="metric-header">
              <h3>Plan Coverage</h3>
              <span className="metric-subtitle">Available Options</span>
            </div>
            <div className="metric-value">
              {planAnalysis?.totalOnMarketPlans + planAnalysis?.totalOffMarketPlans}
            </div>
            <div className="metric-details">
              <div>On-Market: {planAnalysis?.totalOnMarketPlans}</div>
              <div>Off-Market: {planAnalysis?.totalOffMarketPlans}</div>
              <div>Avg per Employee: {planAnalysis?.averagePlansPerMember?.toFixed(1)}</div>
            </div>
          </div>
        </div>
      </div>

      {/* Cost Comparison Charts */}
      <div className="cost-comparison-section">
        <h2>Cost Comparison Analysis</h2>
        
        <div className="comparison-charts">
          {/* Employer Cost Breakdown */}
          <div className="cost-chart employer-costs">
            <h3>Employer Monthly Costs</h3>
            <div className="cost-bars">
              <div className="cost-bar old-cost">
                <div className="cost-label">Current Plan</div>
                <div className="cost-amount">{formatCurrency(employerComparison?.oldPlan?.totalMonthlyCost)}</div>
                <div 
                  className="cost-bar-fill old"
                  style={{ 
                    width: '100%',
                    height: `${Math.max(20, (employerComparison?.oldPlan?.totalMonthlyCost / Math.max(employerComparison?.oldPlan?.totalMonthlyCost, employerComparison?.newICHRAPlan?.totalMonthlyCost)) * 100)}px`
                  }}
                ></div>
              </div>
              <div className="cost-bar new-cost">
                <div className="cost-label">ICHRA Plan</div>
                <div className="cost-amount">{formatCurrency(employerComparison?.newICHRAPlan?.totalMonthlyCost)}</div>
                <div 
                  className="cost-bar-fill new"
                  style={{ 
                    width: `${(employerComparison?.newICHRAPlan?.totalMonthlyCost / employerComparison?.oldPlan?.totalMonthlyCost) * 100}%`,
                    height: `${Math.max(20, (employerComparison?.newICHRAPlan?.totalMonthlyCost / Math.max(employerComparison?.oldPlan?.totalMonthlyCost, employerComparison?.newICHRAPlan?.totalMonthlyCost)) * 100)}px`
                  }}
                ></div>
              </div>
            </div>
            <div className="savings-summary">
              <span className={getSavingsClass(employerComparison?.savings?.monthlySavings)}>
                {employerComparison?.savings?.monthlySavings > 0 ? 'Savings: ' : 'Additional Cost: '}
                {formatCurrency(Math.abs(employerComparison?.savings?.monthlySavings))}
              </span>
            </div>
          </div>

          {/* Employee Cost Breakdown */}
          <div className="cost-chart employee-costs">
            <h3>Employee Monthly Costs</h3>
            <div className="cost-bars">
              <div className="cost-bar old-cost">
                <div className="cost-label">Current Plans</div>
                <div className="cost-amount">{formatCurrency(employeeSummary?.oldPlan?.totalMonthlyCost)}</div>
                <div 
                  className="cost-bar-fill old"
                  style={{ 
                    width: '100%',
                    height: `${Math.max(20, (employeeSummary?.oldPlan?.totalMonthlyCost / Math.max(employeeSummary?.oldPlan?.totalMonthlyCost, employeeSummary?.newICHRAPlans?.totalMonthlyCost)) * 100)}px`
                  }}
                ></div>
              </div>
              <div className="cost-bar new-cost">
                <div className="cost-label">ICHRA Plans</div>
                <div className="cost-amount">{formatCurrency(employeeSummary?.newICHRAPlans?.totalMonthlyCost)}</div>
                <div 
                  className="cost-bar-fill new"
                  style={{ 
                    width: `${(employeeSummary?.newICHRAPlans?.totalMonthlyCost / employeeSummary?.oldPlan?.totalMonthlyCost) * 100}%`,
                    height: `${Math.max(20, (employeeSummary?.newICHRAPlans?.totalMonthlyCost / Math.max(employeeSummary?.oldPlan?.totalMonthlyCost, employeeSummary?.newICHRAPlans?.totalMonthlyCost)) * 100)}px`
                  }}
                ></div>
              </div>
            </div>
            <div className="savings-summary">
              <span className={getSavingsClass(employeeSummary?.savings?.totalMonthlySavings)}>
                {employeeSummary?.savings?.totalMonthlySavings > 0 ? 'Savings: ' : 'Additional Cost: '}
                {formatCurrency(Math.abs(employeeSummary?.savings?.totalMonthlySavings))}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Employee Impact Analysis */}
      <div className="employee-impact-section">
        <h2>Employee Impact Analysis</h2>
        <div className="impact-metrics">
          <div className="impact-card">
            <div className="impact-number">{employeeStats.totalEmployees}</div>
            <div className="impact-label">Total Employees</div>
          </div>
          <div className="impact-card positive">
            <div className="impact-number">{employeeStats.employeesWithSavings}</div>
            <div className="impact-label">Employees Saving Money</div>
            <div className="impact-percentage">
              {formatPercentage((employeeStats.employeesWithSavings / employeeStats.totalEmployees) * 100)}
            </div>
          </div>
          <div className="impact-card negative">
            <div className="impact-number">{employeeStats.employeesWithCosts}</div>
            <div className="impact-label">Employees with Higher Costs</div>
            <div className="impact-percentage">
              {formatPercentage((employeeStats.employeesWithCosts / employeeStats.totalEmployees) * 100)}
            </div>
          </div>
          <div className="impact-card average">
            <div className="impact-number">{formatCurrency(employeeStats.averageSavings)}</div>
            <div className="impact-label">Average Savings per Employee</div>
          </div>
        </div>
      </div>

      {/* Subsidy Analysis */}
      {subsidyAnalysis && (
        <div className="subsidy-analysis-section">
          <h2>Premium Tax Credit Analysis</h2>
          <div className="subsidy-metrics">
            <div className="subsidy-card">
              <h3>Subsidy Eligibility</h3>
              <div className="subsidy-stats">
                <div className="stat">
                  <span className="stat-number">{subsidyAnalysis.membersEligibleForSubsidy}</span>
                  <span className="stat-label">Eligible Employees</span>
                </div>
                <div className="stat">
                  <span className="stat-number">{formatPercentage(subsidyAnalysis.subsidyEligibilityRate)}</span>
                  <span className="stat-label">Eligibility Rate</span>
                </div>
                {subsidyAnalysis.averageSubsidy > 0 && (
                  <div className="stat">
                    <span className="stat-number">{formatCurrency(subsidyAnalysis.averageSubsidy)}</span>
                    <span className="stat-label">Average Monthly Subsidy</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Key Insights */}
      <div className="insights-section">
        <h2>Key Insights</h2>
        <div className="insights-list">
          {employerComparison?.savings?.monthlySavings > 0 && (
            <div className="insight positive">
              <strong>Employer Savings:</strong> The company will save {formatCurrency(employerComparison.savings.monthlySavings)} 
              monthly ({formatCurrency(employerComparison.savings.annualSavings)} annually) by switching to ICHRA.
            </div>
          )}
          
          {employeeSummary?.savings?.totalMonthlySavings > 0 && (
            <div className="insight positive">
              <strong>Employee Benefits:</strong> Employees will collectively save {formatCurrency(employeeSummary.savings.totalMonthlySavings)} 
              monthly, with an average of {formatCurrency(employeeSummary.savings.averageSavingsPerEmployee)} per employee.
            </div>
          )}
          
          {subsidyAnalysis?.subsidyEligibilityRate > 50 && (
            <div className="insight neutral">
              <strong>Subsidy Impact:</strong> {formatPercentage(subsidyAnalysis.subsidyEligibilityRate)} of employees 
              are eligible for premium tax credits, enhancing the value of ICHRA.
            </div>
          )}
          
          {planAnalysis?.averagePlansPerMember > 10 && (
            <div className="insight positive">
              <strong>Plan Choice:</strong> Employees have access to an average of {planAnalysis.averagePlansPerMember.toFixed(0)} 
              plan options, providing significant flexibility and choice.
            </div>
          )}
        </div>
      </div>

      {/* Filter Impact Notice */}
      {(activeFilters.carrier.length > 0 || activeFilters.metalLevel.length > 0 || activeFilters.market !== 'all') && (
        <div className="filter-impact-notice">
          <h3>Filter Impact</h3>
          <p>
            The above analysis reflects the impact of your selected filters. 
            Remove filters to see the complete analysis across all available plans.
          </p>
        </div>
      )}
    </div>
  );
};

export default QuoteSummary;