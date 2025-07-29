import React, { useMemo } from 'react';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import './EmployeeComparisons.css';

const EmployeeComparisons = ({ 
  quoteData, 
  groupData, 
  classData, 
  memberData,
  isLoading = false 
}) => {
  // Extract employee details from comprehensive quote data
  const employeeSummary = useMemo(() => {
    if (!quoteData?.employeeDetails && !memberData) {
      // Generate sample data for demonstration
      return {
        totalEmployees: 25,
        avgMonthlySavings: 150,
        totalMonthlySavings: 3750,
        totalAnnualSavings: 45000,
        employeesWithSavings: 22,
                 avgAffordabilityRate: 92,
         topSavingsEmployee: { name: "John Smith", monthlySavings: 275 },
        employees: Array.from({ length: 5 }, (_, i) => ({
          id: i + 1,
          name: `Employee ${i + 1}`,
          className: 'Full-Time',
          monthlySavings: 100 + (i * 25),
          annualSavings: (100 + (i * 25)) * 12,
          ichraContribution: 400,
          outOfPocketCost: 150 - (i * 10)
        }))
      };
    }

    // Process real data
    const employees = quoteData?.employeeDetails || [];
    const totalEmployees = employees.length;
    const totalMonthlySavings = employees.reduce((sum, emp) => sum + (emp.monthlySavings || 0), 0);
    const avgMonthlySavings = totalEmployees > 0 ? totalMonthlySavings / totalEmployees : 0;
    const employeesWithSavings = employees.filter(emp => emp.monthlySavings > 0).length;
    const totalAnnualSavings = totalMonthlySavings * 12;
    
    // Find employee with highest savings
    const topSavingsEmployee = employees.reduce((top, current) => 
      (current.monthlySavings || 0) > (top.monthlySavings || 0) ? current : top, 
      employees[0] || {}
    );

    return {
      totalEmployees,
      avgMonthlySavings,
      totalMonthlySavings,
      totalAnnualSavings,
      employeesWithSavings,
      avgAffordabilityRate: Math.round((employeesWithSavings / totalEmployees) * 100),
      topSavingsEmployee,
      employees: employees.slice(0, 5) // Show top 5 for preview
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
      <div className="employee-comparisons-loading">
        <LoadingSpinner size="large" />
        <p>Analyzing employee impact...</p>
      </div>
    );
  }

  return (
    <div className="employee-comparisons">
      {/* Header */}
      <div className="comparisons-header">
        <h1>Employee Impact Analysis</h1>
        <p>How ICHRA affects individual employees</p>
      </div>

      {/* Key Metrics - Only 4 Most Important */}
      <div className="key-metrics">
        <div className="metric-card primary">
          <div className="metric-value">{formatCurrency(employeeSummary.avgMonthlySavings)}</div>
          <div className="metric-label">Avg Monthly Savings</div>
          <div className="metric-detail">Per employee with ICHRA</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{employeeSummary.employeesWithSavings}</div>
          <div className="metric-label">Employees Saving</div>
          <div className="metric-detail">Out of {employeeSummary.totalEmployees} total</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{formatCurrency(employeeSummary.totalMonthlySavings)}</div>
          <div className="metric-label">Total Monthly Savings</div>
          <div className="metric-detail">{formatCurrency(employeeSummary.totalAnnualSavings)} annually</div>
        </div>

        <div className="metric-card">
          <div className="metric-value">{employeeSummary.avgAffordabilityRate}%</div>
          <div className="metric-label">Affordability Rate</div>
          <div className="metric-detail">ICHRA compliance level</div>
        </div>
      </div>

      {/* Top Savings Highlight */}
      <div className="top-savings">
        <div className="highlight-card">
          <div className="highlight-icon">🏆</div>
          <div className="highlight-content">
            <div className="highlight-title">Highest Savings</div>
            <div className="highlight-name">{employeeSummary.topSavingsEmployee?.memberName || employeeSummary.topSavingsEmployee?.name}</div>
            <div className="highlight-amount">{formatCurrency(employeeSummary.topSavingsEmployee?.monthlySavings || 0)} monthly savings</div>
          </div>
        </div>
      </div>

      {/* Simple Employee List */}
      <div className="employee-preview">
        <h3>Employee Savings Preview</h3>
        <div className="employee-list">
          {employeeSummary.employees.map((employee, index) => (
            <div key={employee.id || index} className="employee-item">
              <div className="employee-info">
                <div className="employee-name">{employee.memberName || employee.name}</div>
                <div className="employee-class">{employee.className}</div>
              </div>
              <div className="employee-savings">
                <div className="savings-amount">{formatCurrency(employee.monthlySavings || 0)}</div>
                <div className="savings-label">monthly</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Status Summary */}
      <div className="status-section">
        <div className="status-item">
          <div className="status-indicator success"></div>
          <div className="status-text">
            <div className="status-title">Employee Benefits</div>
            <div className="status-desc">{employeeSummary.employeesWithSavings} employees will save money with ICHRA</div>
          </div>
        </div>
        
        <div className="status-item">
          <div className="status-indicator info"></div>
          <div className="status-text">
            <div className="status-title">Plan Choice</div>
            <div className="status-desc">Employees can choose from multiple health plan options</div>
          </div>
        </div>
        
        <div className="status-item">
          <div className="status-indicator warning"></div>
          <div className="status-text">
            <div className="status-title">Total Impact</div>
            <div className="status-desc">{formatCurrency(employeeSummary.totalAnnualSavings)} in combined annual savings</div>
          </div>
        </div>
      </div>


    </div>
  );
};

export default EmployeeComparisons; 