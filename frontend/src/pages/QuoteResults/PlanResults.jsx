import React from 'react';
import './PlanResults.css';

const PlanResults = ({ plans = [], onSelectPlan }) => {
  if (!plans || plans.length === 0) {
    return (
      <div className="plan-results-empty">
        <p>No plans available matching your criteria.</p>
      </div>
    );
  }

  return (
    <div className="plan-results">
      <div className="plan-results-header">
        <h3>Available Plans ({plans.length})</h3>
      </div>
      <div className="plan-results-grid">
        {plans.map((plan) => (
          <div key={plan.id} className="plan-card">
            <div className="plan-card-header">
              <h4>{plan.name}</h4>
              <span className="plan-type">{plan.type}</span>
            </div>
            <div className="plan-card-body">
              <div className="plan-premium">
                <span className="label">Monthly Premium:</span>
                <span className="value">${plan.premium?.toFixed(2) || '0.00'}</span>
              </div>
              <div className="plan-details">
                <div className="detail-item">
                  <span className="label">Deductible:</span>
                  <span className="value">${plan.deductible || 'N/A'}</span>
                </div>
                <div className="detail-item">
                  <span className="label">Out-of-Pocket Max:</span>
                  <span className="value">${plan.oopMax || 'N/A'}</span>
                </div>
              </div>
            </div>
            {onSelectPlan && (
              <div className="plan-card-footer">
                <button 
                  className="select-plan-btn"
                  onClick={() => onSelectPlan(plan)}
                >
                  Select Plan
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default PlanResults;