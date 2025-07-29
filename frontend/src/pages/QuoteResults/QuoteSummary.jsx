import React from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Styles
import './QuoteSummary.css';

const QuoteSummary = ({ summary, quoteData, groupData, isLoading }) => {
  if (isLoading) {
    return (
      <div className="quote-summary-loading">
        <LoadingSpinner size="large" />
        <p>Loading summary data...</p>
      </div>
    );
  }

  // Note: Removed generateSampleData() to prevent fallback to hardcoded values

  // Use real data or show loading/no data states
  const data = quoteData || summary;
  
  // Debug: Log what data we're receiving
  console.log('QuoteSummary received data:', data);
  console.log('quoteData:', quoteData);
  console.log('summary:', summary);
  
  // Extract key metrics - try multiple possible field structures
  const totalEmployees = data?.employerComparison?.totalEmployees || data?.employer?.totalEmployees || 1;
  
  // Try different possible field names for employer savings
  const employerMonthlySavings = data?.employerComparison?.monthlySavings || 
                                data?.employerComparison?.savings?.monthlySavings ||
                                data?.employer?.monthlySavings || 0;
  const employerAnnualSavings = data?.employerComparison?.annualSavings || 
                               data?.employerComparison?.savings?.annualSavings ||
                               data?.employer?.annualSavings || 
                               (employerMonthlySavings * 12);
  
  // Try different possible field names for employee savings
  const employeeMonthlySavings = data?.employeeSummary?.savings?.totalMonthlySavings || 
                                data?.employeeSummary?.monthlySavings || 
                                data?.employeeSummary?.savings?.monthlySavings ||
                                data?.employees?.monthlySavings || 0;
  
  console.log('🔍 Employee savings extraction:', {
    'data?.employeeSummary?.savings?.totalMonthlySavings': data?.employeeSummary?.savings?.totalMonthlySavings,
    'data?.employeeSummary?.monthlySavings': data?.employeeSummary?.monthlySavings,
    'data?.employeeSummary?.savings?.monthlySavings': data?.employeeSummary?.savings?.monthlySavings,
    'data?.employees?.monthlySavings': data?.employees?.monthlySavings,
    'Final employeeMonthlySavings': employeeMonthlySavings
  });
  const employeeAnnualSavings = data?.employeeSummary?.savings?.totalAnnualSavings ||
                               data?.employeeSummary?.annualSavings || 
                               data?.employeeSummary?.savings?.annualSavings ||
                               data?.employees?.annualSavings || 
                               (employeeMonthlySavings * 12);
  
  // Calculate totals
  const totalMonthlySavings = data?.overallAnalysis?.monthlySavings || 
                             data?.overall?.monthlySavings || 
                             (employerMonthlySavings + employeeMonthlySavings);
  const totalAnnualSavings = data?.overallAnalysis?.annualSavings || 
                            data?.overall?.annualSavings || 
                            (totalMonthlySavings * 12);
  
  const complianceRate = data?.overallAnalysis?.complianceRate 
    ? Math.round(data.overallAnalysis.complianceRate * 100) 
    : 0;
  const complianceCount = data?.overallAnalysis?.complianceCount || 0;
  const totalPlans = data?.planAnalysis?.totalPlans || 40;
  const avgPremium = data?.planAnalysis?.averagePremium || 340;
  const employeesWithSavings = data?.overallAnalysis?.employeesWithSavings || (employeeMonthlySavings > 0 ? 1 : 0);
  
  // Debug extracted values
  console.log('Extracted values:', {
    totalEmployees,
    employerMonthlySavings,
    employeeMonthlySavings,
    totalAnnualSavings,
    complianceRate
  });
  
  // Debug the actual API structure
  console.log('employerComparison:', JSON.stringify(data?.employerComparison, null, 2));
  console.log('employeeSummary:', JSON.stringify(data?.employeeSummary, null, 2));
  console.log('overallAnalysis:', JSON.stringify(data?.overallAnalysis, null, 2));
  
  // Debug the data check
  console.log('Data check:', {
    hasData: !!data,
    hasEmployerComparison: !!data?.employerComparison,
    hasEmployeeSummary: !!data?.employeeSummary,
    hasOverallAnalysis: !!data?.overallAnalysis,
    dataKeys: data ? Object.keys(data) : 'no data'
  });

  // If no real data, don't show anything
  if (!data || !data.success) {
    return (
      <div className="quote-summary">
        <div className="summary-header">
          <h1>Quote Summary</h1>
          <p>Loading quote data...</p>
        </div>
        <div className="key-metrics">
          <div className="metric-card">
            <div className="metric-value">--</div>
            <div className="metric-label">No data available</div>
            <div className="metric-detail">Please generate a quote first</div>
          </div>
        </div>
      </div>
    );
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <div className="quote-summary">
      {/* Header */}
      <div className="summary-header">
        <h1>Quote Summary</h1>
        <p>Key results for your ICHRA implementation</p>
      </div>

      {/* Key Metrics - Overall Savings vs ICHRA Compliance */}
      <div className="key-metrics">
        <div className="metric-card primary">
          <div className="metric-value">{formatCurrency(totalAnnualSavings)}</div>
          <div className="metric-label">Total Annual Savings</div>
          <div className="metric-detail">{formatCurrency(totalMonthlySavings)}/month combined</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{formatCurrency(employeeMonthlySavings)}</div>
          <div className="metric-label">Avg Monthly Savings</div>
          <div className="metric-detail">Per employee with ICHRA</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{employeesWithSavings}</div>
          <div className="metric-label">Employees Saving</div>
          <div className="metric-detail">Out of {totalEmployees} total</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{complianceRate}%</div>
          <div className="metric-label">ICHRA Compliance</div>
          <div className="metric-detail">{complianceCount} of {totalEmployees} employees</div>
        </div>
      </div>

      {/* Detailed Analysis Sections */}
      <div className="analysis-sections">
        
        {/* Employee Impact Analysis */}
        <div className="analysis-section">
          <h2>Employee Impact Analysis</h2>
          <p>How ICHRA affects individual employees</p>
          
          <div className="analysis-metrics">
            <div className="analysis-metric">
              <div className="metric-value">{formatCurrency(employeeMonthlySavings)}</div>
              <div className="metric-label">Avg Monthly Savings</div>
              <div className="metric-detail">Per employee with ICHRA</div>
            </div>
            
            <div className="analysis-metric">
              <div className="metric-value">{employeesWithSavings}</div>
              <div className="metric-label">Employees Saving</div>
              <div className="metric-detail">Out of {totalEmployees} total</div>
            </div>
            
            <div className="analysis-metric">
              <div className="metric-value">{formatCurrency(employeeMonthlySavings * totalEmployees)}</div>
              <div className="metric-label">Total Monthly Savings</div>
              <div className="metric-detail">{formatCurrency(employeeAnnualSavings)} annually</div>
            </div>
            
            <div className="analysis-metric">
              <div className="metric-value">{complianceRate}%</div>
              <div className="metric-label">Affordability Rate</div>
              <div className="metric-detail">ICHRA compliance level</div>
            </div>
          </div>
        </div>

        {/* Employer Impact Analysis */}
        <div className="analysis-section">
          <h2>Employer Cost Analysis</h2>
          <p>Financial impact on company healthcare costs</p>
          
          <div className="analysis-metrics">
            <div className="analysis-metric">
              <div className="metric-value">{formatCurrency(employerMonthlySavings)}</div>
              <div className="metric-label">Monthly Savings</div>
              <div className="metric-detail">Reduced employer costs</div>
            </div>
            
            <div className="analysis-metric">
              <div className="metric-value">{formatCurrency(employerAnnualSavings)}</div>
              <div className="metric-label">Annual Savings</div>
              <div className="metric-detail">Projected yearly reduction</div>
            </div>
            
            <div className="analysis-metric">
              <div className="metric-value">{totalEmployees}</div>
              <div className="metric-label">Employees Covered</div>
              <div className="metric-detail">Total in ICHRA plan</div>
            </div>
            
            <div className="analysis-metric">
              <div className="metric-value">{Math.round(data?.employer?.savingsPercentage || 0)}%</div>
              <div className="metric-label">Cost Reduction</div>
              <div className="metric-detail">Vs current plan</div>
            </div>
          </div>
        </div>
        
      </div>


    </div>
  );
};

export default QuoteSummary; 