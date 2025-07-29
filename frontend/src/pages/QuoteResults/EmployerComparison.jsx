import React, { useMemo } from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './EmployerComparison.css';

const EmployerComparison = ({ 
  quoteData, 
  groupData, 
  classData, 
  memberData,
  isLoading = false 
}) => {
  // Extract cost analysis from comprehensive quote data
  const costAnalysis = useMemo(() => {
    if (!quoteData?.employerComparison) {
      // Generate sample data for demonstration
      const sampleMemberCount = memberData?.length || 25;
      const sampleOldCost = 500 * sampleMemberCount;
      const sampleNewCost = 400 * sampleMemberCount;
      const sampleSavings = sampleOldCost - sampleNewCost;
      
      return {
        oldTotalCost: sampleOldCost,
        newICHRACost: sampleNewCost,
        monthlySavings: sampleSavings,
        annualSavings: sampleSavings * 12,
        savingsPercentage: (sampleSavings / sampleOldCost) * 100,
        memberCount: sampleMemberCount,
        avgOldCostPerMember: 500,
        avgNewCostPerMember: 400
      };
    }

    // Extract data from comprehensive structure
    const employerComparison = quoteData.employerComparison;
    const memberCount = employerComparison.totalEmployees || memberData?.length || 0;
    
    const oldTotalCost = employerComparison.oldPlan?.totalMonthlyCost || 0;
    const newICHRACost = employerComparison.newICHRAPlan?.totalMonthlyCost || 0;
    const monthlySavings = employerComparison.savings?.monthlySavings || 0;
    const annualSavings = employerComparison.savings?.annualSavings || monthlySavings * 12;
    const savingsPercentage = employerComparison.savings?.savingsPercentage || 0;

    return {
      oldTotalCost,
      newICHRACost,
      monthlySavings,
      annualSavings,
      savingsPercentage,
      memberCount,
      avgOldCostPerMember: memberCount > 0 ? oldTotalCost / memberCount : 0,
      avgNewCostPerMember: memberCount > 0 ? newICHRACost / memberCount : 0
    };
  }, [quoteData, memberData]);

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  if (isLoading) {
    return (
      <div className="employer-comparison-loading">
        <LoadingSpinner size="large" />
        <p>Calculating employer costs...</p>
      </div>
    );
  }

  return (
    <div className="employer-comparison">
      {/* Header */}
      <div className="comparison-header">
        <h1>Employer Cost Analysis</h1>
        <p>Compare current healthcare costs with ICHRA implementation</p>
      </div>

      {/* Key Metrics - Only 4 Most Important */}
      <div className="key-metrics">
        <div className="metric-card">
          <div className="metric-value">{formatCurrency(costAnalysis.oldTotalCost)}</div>
          <div className="metric-label">Current Monthly Cost</div>
          <div className="metric-detail">{formatCurrency(costAnalysis.avgOldCostPerMember)} per employee</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{formatCurrency(costAnalysis.newICHRACost)}</div>
          <div className="metric-label">New ICHRA Cost</div>
          <div className="metric-detail">{formatCurrency(costAnalysis.avgNewCostPerMember)} per employee</div>
        </div>

        <div className="metric-card primary">
          <div className="metric-value">{formatCurrency(costAnalysis.monthlySavings)}</div>
          <div className="metric-label">Monthly Savings</div>
          <div className="metric-detail">{formatCurrency(costAnalysis.annualSavings)} annually</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{Math.round(costAnalysis.savingsPercentage)}%</div>
          <div className="metric-label">Cost Reduction</div>
          <div className="metric-detail">{costAnalysis.memberCount} employees</div>
        </div>
      </div>

      {/* Simple Cost Comparison */}
      <div className="cost-comparison">
        <h3>Monthly Cost Breakdown</h3>
        <div className="comparison-bars">
          <div className="cost-bar">
            <div className="bar-label">Current Plan</div>
            <div className="bar-container">
              <div className="bar current" style={{width: '100%'}}>
                <span className="bar-value">{formatCurrency(costAnalysis.oldTotalCost)}</span>
              </div>
            </div>
          </div>
          
          <div className="cost-bar">
            <div className="bar-label">ICHRA Plan</div>
            <div className="bar-container">
              <div 
                className="bar ichra" 
                style={{width: `${(costAnalysis.newICHRACost / costAnalysis.oldTotalCost) * 100}%`}}
              >
                <span className="bar-value">{formatCurrency(costAnalysis.newICHRACost)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Status Summary */}
      <div className="status-section">
        <div className="status-item">
          <div className="status-indicator success"></div>
          <div className="status-text">
            <div className="status-title">Cost Savings Achieved</div>
            <div className="status-desc">ICHRA reduces monthly employer costs by {formatCurrency(costAnalysis.monthlySavings)}</div>
          </div>
        </div>
        
        <div className="status-item">
          <div className="status-indicator info"></div>
          <div className="status-text">
            <div className="status-title">Employee Coverage</div>
            <div className="status-desc">{costAnalysis.memberCount} employees will receive ICHRA contributions</div>
          </div>
        </div>
        
        <div className="status-item">
          <div className="status-indicator warning"></div>
          <div className="status-text">
            <div className="status-title">Budget Impact</div>
            <div className="status-desc">{Math.round(costAnalysis.savingsPercentage)}% reduction from current healthcare spending</div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default EmployerComparison; 