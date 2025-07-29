import React from 'react';
import { useOutletContext } from 'react-router-dom';
import Button from '../common/Button';
import './QuoteReview.css';

const QuoteReview = () => {
  const { wizardData, onNext, onPrevious } = useOutletContext();
  
  const calculateTotalContributions = () => {
    let totalEmployee = 0;
    let totalDependent = 0;
    
    wizardData.classes.forEach(cls => {
      const classMembers = wizardData.members.filter(m => m.classId === cls.id);
      classMembers.forEach(member => {
        totalEmployee += cls.employeeContribution || 0;
        if (member.dependents > 0) {
          totalDependent += (cls.dependentContribution || 0) * member.dependents;
        }
      });
    });
    
    return {
      employee: totalEmployee,
      dependent: totalDependent,
      total: totalEmployee + totalDependent
    };
  };
  
  const contributions = calculateTotalContributions();

  return (
    <div className="quote-review">
      <div className="review-header">
        <h2>Review Your Quote Details</h2>
        <p>Please review all information before generating your quote</p>
      </div>

      <div className="review-sections">
        {/* Group Information */}
        <div className="review-section">
          <h3>Group Information</h3>
          <div className="review-content">
            <div className="review-item">
              <span className="review-label">Group Name:</span>
              <span className="review-value">{wizardData.groupName || 'Not set'}</span>
            </div>
            <div className="review-item">
              <span className="review-label">Group ID:</span>
              <span className="review-value">{wizardData.groupId || 'Will be generated'}</span>
            </div>
          </div>
        </div>

        {/* Classes Summary */}
        <div className="review-section">
          <h3>ICHRA Classes ({wizardData.classes.length})</h3>
          <div className="review-content">
            {wizardData.classes.map((cls, index) => (
              <div key={index} className="class-summary">
                <h4>{cls.name}</h4>
                <div className="class-details">
                  <span>Employee: ${cls.employeeContribution}/mo</span>
                  <span>Dependent: ${cls.dependentContribution}/mo</span>
                  <span>Members: {wizardData.members.filter(m => m.classId === cls.id).length}</span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Members Summary */}
        <div className="review-section">
          <h3>Members ({wizardData.members.length})</h3>
          <div className="review-content">
            <div className="members-stats">
              <div className="stat">
                <span className="stat-label">Total Employees:</span>
                <span className="stat-value">{wizardData.members.length}</span>
              </div>
              <div className="stat">
                <span className="stat-label">Total Dependents:</span>
                <span className="stat-value">
                  {wizardData.members.reduce((sum, m) => sum + (m.dependents || 0), 0)}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Cost Summary */}
        <div className="review-section highlight">
          <h3>Estimated Monthly Costs</h3>
          <div className="review-content">
            <div className="cost-breakdown">
              <div className="cost-item">
                <span>Employee Contributions:</span>
                <span>${contributions.employee.toLocaleString()}</span>
              </div>
              <div className="cost-item">
                <span>Dependent Contributions:</span>
                <span>${contributions.dependent.toLocaleString()}</span>
              </div>
              <div className="cost-item total">
                <span>Total Monthly Cost:</span>
                <span>${contributions.total.toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="review-actions">
        <Button variant="secondary" onClick={onPrevious}>
          ← Back to Members
        </Button>
        <Button variant="primary" onClick={onNext} size="large">
          Generate Quote →
        </Button>
      </div>
    </div>
  );
};

export default QuoteReview;