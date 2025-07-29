import React, { useState } from 'react';

/**
 * Employer Comparison Component
 * Displays detailed employer cost analysis comparing current plan vs ICHRA
 */
const EmployerComparison = ({ 
  data, 
  overallAnalysis, 
  subsidyAnalysis, 
  planAnalysis, 
  activeFilters 
}) => {
  const [viewMode, setViewMode] = useState('monthly'); // 'monthly' or 'annual'
  const [showProjections, setShowProjections] = useState(false);

  if (!data) {
    return <div className="employer-comparison">No employer comparison data available</div>;
  }

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
   * Get display values based on view mode
   */
  const getDisplayValues = (monthly, annual) => {
    return viewMode === 'monthly' ? monthly : annual;
  };

  /**
   * Calculate multi-year projections
   */
  const calculateProjections = (monthlySavings) => {
    const annualSavings = monthlySavings * 12;
    return {
      year1: annualSavings,
      year2: annualSavings * 2,
      year3: annualSavings * 3,
      year5: annualSavings * 5
    };
  };

  const projections = calculateProjections(data.savings.monthlySavings);

  return (
    <div className="employer-comparison">
      {/* Header and Controls */}
      <div className="comparison-header">
        <h2>Employer Cost Analysis</h2>
        <div className="view-controls">
          <div className="time-period-toggle">
            <button 
              className={`toggle-btn ${viewMode === 'monthly' ? 'active' : ''}`}
              onClick={() => setViewMode('monthly')}
            >
              Monthly View
            </button>
            <button 
              className={`toggle-btn ${viewMode === 'annual' ? 'active' : ''}`}
              onClick={() => setViewMode('annual')}
            >
              Annual View
            </button>
          </div>
          <label className="projection-toggle">
            <input
              type="checkbox"
              checked={showProjections}
              onChange={(e) => setShowProjections(e.target.checked)}
            />
            Show Multi-Year Projections
          </label>
        </div>
      </div>

      {/* Cost Comparison Summary */}
      <div className="cost-comparison-summary">
        <div className="comparison-cards">
          {/* Current Plan Card */}
          <div className="comparison-card current-plan">
            <div className="card-header">
              <h3>Current Group Plan</h3>
              <span className="plan-type">Traditional Group Health Insurance</span>
            </div>
            <div className="card-content">
              <div className="cost-display">
                <div className="cost-amount">
                  {formatCurrency(getDisplayValues(data.oldPlan.totalMonthlyCost, data.oldPlan.totalAnnualCost))}
                </div>
                <div className="cost-period">{viewMode === 'monthly' ? 'per month' : 'per year'}</div>
              </div>
              <div className="cost-details">
                <div className="detail-item">
                  <span>Total Employees:</span>
                  <span>{data.totalEmployees}</span>
                </div>
                <div className="detail-item">
                  <span>Average Cost per Employee:</span>
                  <span>{formatCurrency(data.oldPlan.totalMonthlyCost / data.totalEmployees)}/month</span>
                </div>
              </div>
            </div>
          </div>

          {/* ICHRA Plan Card */}
          <div className="comparison-card ichra-plan">
            <div className="card-header">
              <h3>Proposed ICHRA Plan</h3>
              <span className="plan-type">Individual Coverage Health Reimbursement Arrangement</span>
            </div>
            <div className="card-content">
              <div className="cost-display">
                <div className="cost-amount">
                  {formatCurrency(getDisplayValues(data.newICHRAPlan.totalMonthlyCost, data.newICHRAPlan.totalAnnualCost))}
                </div>
                <div className="cost-period">{viewMode === 'monthly' ? 'per month' : 'per year'}</div>
              </div>
              <div className="cost-details">
                <div className="detail-item">
                  <span>Total Employees:</span>
                  <span>{data.totalEmployees}</span>
                </div>
                <div className="detail-item">
                  <span>Average Contribution per Employee:</span>
                  <span>{formatCurrency(data.newICHRAPlan.totalMonthlyCost / data.totalEmployees)}/month</span>
                </div>
              </div>
            </div>
          </div>

          {/* Savings Card */}
          <div className={`comparison-card savings-card ${getSavingsClass(data.savings.monthlySavings)}`}>
            <div className="card-header">
              <h3>{data.savings.monthlySavings > 0 ? 'Cost Savings' : 'Additional Cost'}</h3>
              <span className="savings-type">
                {data.savings.monthlySavings > 0 ? 'Money Saved' : 'Extra Investment'}
              </span>
            </div>
            <div className="card-content">
              <div className="savings-display">
                <div className="savings-amount">
                  {formatCurrency(Math.abs(getDisplayValues(data.savings.monthlySavings, data.savings.annualSavings)))}
                </div>
                <div className="savings-period">{viewMode === 'monthly' ? 'per month' : 'per year'}</div>
              </div>
              <div className="savings-details">
                <div className="detail-item">
                  <span>Percentage Change:</span>
                  <span className={getSavingsClass(data.savings.monthlySavings)}>
                    {data.savings.savingsPercentage > 0 ? '-' : '+'}{formatPercentage(Math.abs(data.savings.savingsPercentage))}
                  </span>
                </div>
                <div className="detail-item">
                  <span>Impact:</span>
                  <span>{data.savings.isPositiveSavings ? 'Reduces costs' : 'Increases costs'}</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Detailed Cost Breakdown */}
      <div className="detailed-breakdown">
        <h3>Detailed Cost Breakdown</h3>
        <div className="breakdown-table">
          <div className="breakdown-header">
            <div className="header-cell category">Category</div>
            <div className="header-cell current">Current Plan</div>
            <div className="header-cell ichra">ICHRA Plan</div>
            <div className="header-cell difference">Difference</div>
          </div>

          <div className="breakdown-row">
            <div className="cell category">
              <strong>{viewMode === 'monthly' ? 'Monthly' : 'Annual'} Employer Contribution</strong>
            </div>
            <div className="cell current">
              {formatCurrency(getDisplayValues(data.oldPlan.totalMonthlyCost, data.oldPlan.totalAnnualCost))}
            </div>
            <div className="cell ichra">
              {formatCurrency(getDisplayValues(data.newICHRAPlan.totalMonthlyCost, data.newICHRAPlan.totalAnnualCost))}
            </div>
            <div className={`cell difference ${getSavingsClass(data.savings.monthlySavings)}`}>
              {data.savings.monthlySavings > 0 ? '-' : '+'}
              {formatCurrency(Math.abs(getDisplayValues(data.savings.monthlySavings, data.savings.annualSavings)))}
            </div>
          </div>

          <div className="breakdown-row per-employee">
            <div className="cell category">
              Per Employee {viewMode === 'monthly' ? 'Monthly' : 'Annual'} Cost
            </div>
            <div className="cell current">
              {formatCurrency(getDisplayValues(
                data.oldPlan.totalMonthlyCost / data.totalEmployees,
                data.oldPlan.totalAnnualCost / data.totalEmployees
              ))}
            </div>
            <div className="cell ichra">
              {formatCurrency(getDisplayValues(
                data.newICHRAPlan.totalMonthlyCost / data.totalEmployees,
                data.newICHRAPlan.totalAnnualCost / data.totalEmployees
              ))}
            </div>
            <div className={`cell difference ${getSavingsClass(data.savings.monthlySavings)}`}>
              {data.savings.monthlySavings > 0 ? '-' : '+'}
              {formatCurrency(Math.abs(getDisplayValues(
                data.savings.monthlySavings / data.totalEmployees,
                data.savings.annualSavings / data.totalEmployees
              )))}
            </div>
          </div>
        </div>
      </div>

      {/* Multi-Year Projections */}
      {showProjections && (
        <div className="projections-section">
          <h3>Multi-Year Savings Projections</h3>
          <div className="projections-chart">
            <div className="projection-bar">
              <div className="year-label">Year 1</div>
              <div className={`projection-amount ${getSavingsClass(projections.year1)}`}>
                {formatCurrency(Math.abs(projections.year1))}
              </div>
              <div 
                className="projection-visual"
                style={{
                  width: `${Math.min(100, Math.abs(projections.year1) / Math.abs(projections.year5) * 100)}%`
                }}
              ></div>
            </div>
            <div className="projection-bar">
              <div className="year-label">Year 2</div>
              <div className={`projection-amount ${getSavingsClass(projections.year2)}`}>
                {formatCurrency(Math.abs(projections.year2))}
              </div>
              <div 
                className="projection-visual"
                style={{
                  width: `${Math.min(100, Math.abs(projections.year2) / Math.abs(projections.year5) * 100)}%`
                }}
              ></div>
            </div>
            <div className="projection-bar">
              <div className="year-label">Year 3</div>
              <div className={`projection-amount ${getSavingsClass(projections.year3)}`}>
                {formatCurrency(Math.abs(projections.year3))}
              </div>
              <div 
                className="projection-visual"
                style={{
                  width: `${Math.min(100, Math.abs(projections.year3) / Math.abs(projections.year5) * 100)}%`
                }}
              ></div>
            </div>
            <div className="projection-bar">
              <div className="year-label">Year 5</div>
              <div className={`projection-amount ${getSavingsClass(projections.year5)}`}>
                {formatCurrency(Math.abs(projections.year5))}
              </div>
              <div className="projection-visual" style={{ width: '100%' }}></div>
            </div>
          </div>
          <div className="projection-note">
            <p>
              Projections assume consistent ICHRA contribution levels and do not account for 
              premium inflation or changes in employee count.
            </p>
          </div>
        </div>
      )}

      {/* Strategic Benefits */}
      <div className="strategic-benefits">
        <h3>Strategic Benefits of ICHRA</h3>
        <div className="benefits-grid">
          <div className="benefit-card">
            <div className="benefit-icon">💰</div>
            <div className="benefit-title">Cost Predictability</div>
            <div className="benefit-description">
              Fixed monthly contributions per employee class provide better budget control 
              compared to unpredictable group plan renewals.
            </div>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🎯</div>
            <div className="benefit-title">Employee Choice</div>
            <div className="benefit-description">
              Employees can choose from {planAnalysis?.totalOnMarketPlans + planAnalysis?.totalOffMarketPlans} available plans, 
              improving satisfaction and retention.
            </div>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">📈</div>
            <div className="benefit-title">Scalability</div>
            <div className="benefit-description">
              ICHRA contributions can be easily adjusted by employee class, 
              providing flexibility as your organization grows.
            </div>
          </div>
          <div className="benefit-card">
            <div className="benefit-icon">🏥</div>
            <div className="benefit-title">Compliance Simplification</div>
            <div className="benefit-description">
              Eliminates complex group plan administration while maintaining 
              ACA compliance and providing competitive benefits.
            </div>
          </div>
        </div>
      </div>

      {/* Risk Analysis */}
      <div className="risk-analysis">
        <h3>Implementation Considerations</h3>
        <div className="risk-factors">
          <div className="risk-item low-risk">
            <div className="risk-indicator"></div>
            <div className="risk-content">
              <div className="risk-title">Employee Education</div>
              <div className="risk-description">
                Employees will need guidance choosing individual plans. Consider providing decision support tools.
              </div>
            </div>
          </div>
          <div className="risk-item medium-risk">
            <div className="risk-indicator"></div>
            <div className="risk-content">
              <div className="risk-title">Administrative Setup</div>
              <div className="risk-description">
                Initial setup requires ICHRA administration system and employee onboarding processes.
              </div>
            </div>
          </div>
          <div className="risk-item low-risk">
            <div className="risk-indicator"></div>
            <div className="risk-content">
              <div className="risk-title">Market Availability</div>
              <div className="risk-description">
                Strong plan availability with {planAnalysis?.averagePlansPerMember?.toFixed(0)} average options per employee.
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tax Credit Impact */}
      {subsidyAnalysis && subsidyAnalysis.subsidyEligibilityRate > 0 && (
        <div className="tax-credit-impact">
          <h3>Premium Tax Credit Impact</h3>
          <div className="subsidy-benefits">
            <div className="subsidy-stat">
              <div className="stat-value">{subsidyAnalysis.membersEligibleForSubsidy}</div>
              <div className="stat-label">Employees Eligible for Tax Credits</div>
            </div>
            <div className="subsidy-stat">
              <div className="stat-value">{formatPercentage(subsidyAnalysis.subsidyEligibilityRate)}</div>
              <div className="stat-label">Eligibility Rate</div>
            </div>
            {subsidyAnalysis.averageSubsidy > 0 && (
              <div className="subsidy-stat">
                <div className="stat-value">{formatCurrency(subsidyAnalysis.averageSubsidy)}</div>
                <div className="stat-label">Average Monthly Subsidy</div>
              </div>
            )}
          </div>
          <div className="subsidy-note">
            <p>
              <strong>Tax Credit Advantage:</strong> {formatPercentage(subsidyAnalysis.subsidyEligibilityRate)} of your employees 
              are eligible for premium tax credits, which can significantly reduce their out-of-pocket costs 
              and increase the value of your ICHRA benefit.
            </p>
          </div>
        </div>
      )}

      {/* Key Recommendations */}
      <div className="recommendations">
        <h3>Key Recommendations</h3>
        <div className="recommendation-list">
          {data.savings.monthlySavings > 0 && (
            <div className="recommendation positive">
              <strong>Strong Financial Case:</strong> ICHRA provides {formatCurrency(data.savings.monthlySavings)} 
              in monthly savings ({formatCurrency(data.savings.annualSavings)} annually), making it a financially 
              attractive alternative to your current group plan.
            </div>
          )}
          
          {subsidyAnalysis?.subsidyEligibilityRate > 50 && (
            <div className="recommendation positive">
              <strong>Leverage Tax Credits:</strong> With {formatPercentage(subsidyAnalysis.subsidyEligibilityRate)} 
              employee eligibility for premium tax credits, emphasize this benefit during employee communication.
            </div>
          )}
          
          <div className="recommendation neutral">
            <strong>Implementation Timeline:</strong> Plan for a 3-6 month implementation period to allow for 
            system setup, employee education, and enrollment processes.
          </div>
          
          {planAnalysis?.averagePlansPerMember > 15 && (
            <div className="recommendation positive">
              <strong>Rich Plan Selection:</strong> Employees have access to {planAnalysis.averagePlansPerMember.toFixed(0)} 
              average plan options, providing excellent choice and flexibility.
            </div>
          )}
        </div>
      </div>

      {/* Filter Impact Notice */}
      {(activeFilters.carrier?.length > 0 || activeFilters.metalLevel?.length > 0 || activeFilters.market !== 'all') && (
        <div className="filter-impact-notice">
          <h4>Filter Impact on Analysis</h4>
          <p>
            This employer analysis reflects your selected filters. The actual cost savings and 
            plan availability may differ when considering all available options.
          </p>
        </div>
      )}
    </div>
  );
};

export default EmployerComparison;