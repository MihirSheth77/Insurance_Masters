import React from 'react';
import './QuoteProgress.css';

const QuoteProgress = ({ steps, currentStep, completedSteps, onStepClick }) => {
  const getStepStatus = (stepId) => {
    if (stepId === currentStep) return 'active';
    if (completedSteps.includes(stepId)) return 'completed';
    return 'upcoming';
  };

  const canNavigateToStep = (stepId) => {
    return stepId <= currentStep || completedSteps.includes(stepId);
  };

  return (
    <div className="quote-progress">
      <div className="progress-steps">
        {steps.map((step, index) => {
          const status = getStepStatus(step.id);
          const canNavigate = canNavigateToStep(step.id);
          
          return (
            <React.Fragment key={step.id}>
              <div 
                className={`progress-step ${status} ${canNavigate ? 'clickable' : ''}`}
                onClick={() => canNavigate && onStepClick(step.id)}
              >
                <div className="step-indicator">
                  {status === 'completed' ? (
                    <span className="step-icon">✓</span>
                  ) : (
                    <span className="step-number">{step.id}</span>
                  )}
                </div>
                <div className="step-info">
                  <span className="step-label">{step.label}</span>
                </div>
              </div>
              
              {index < steps.length - 1 && (
                <div className={`progress-connector ${
                  completedSteps.includes(step.id) ? 'completed' : ''
                }`} />
              )}
            </React.Fragment>
          );
        })}
      </div>
      
      {/* Mobile-friendly version */}
      <div className="progress-mobile">
        <div className="mobile-step-info">
          <span className="mobile-current">Step {currentStep} of {steps.length}</span>
          <span className="mobile-label">{steps[currentStep - 1]?.label}</span>
        </div>
        <div className="mobile-progress-bar">
          <div 
            className="mobile-progress-fill"
            style={{ width: `${(currentStep / steps.length) * 100}%` }}
          />
        </div>
      </div>
    </div>
  );
};

export default QuoteProgress;