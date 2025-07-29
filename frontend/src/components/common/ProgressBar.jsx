// Progress Bar Component
import React from 'react';

const ProgressBar = ({ 
  currentStep = 0,
  totalSteps = 1,
  steps = [],
  onStepClick,
  className = '',
  ...props 
}) => {
  const progressPercentage = ((currentStep + 1) / totalSteps) * 100;

  return (
    <div className={`progress-bar ${className}`.trim()} {...props}>
      {/* Progress Track */}
      <div className="progress-bar__track">
        <div 
          className="progress-bar__fill" 
          style={{ width: `${progressPercentage}%` }}
        />
      </div>

      {/* Step Indicators */}
      {steps.length > 0 && (
        <div className="progress-bar__steps">
          {steps.map((step, index) => {
            const isActive = index === currentStep;
            const isCompleted = index < currentStep;
            const isClickable = onStepClick && typeof onStepClick === 'function';

            return (
              <button
                key={step.id || index}
                type="button"
                className={`
                  progress-bar__step
                  ${isActive ? 'progress-bar__step--active' : ''}
                  ${isCompleted ? 'progress-bar__step--completed' : ''}
                  ${isClickable ? 'progress-bar__step--clickable' : ''}
                `.trim()}
                onClick={isClickable ? () => onStepClick(index) : undefined}
                disabled={!isClickable}
                aria-label={`Step ${index + 1}: ${step.label || step.name || `Step ${index + 1}`}`}
                aria-current={isActive ? 'step' : undefined}
              >
                <span className="progress-bar__step-number">
                  {isCompleted ? (
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
                      <polyline 
                        points="20,6 9,17 4,12" 
                        stroke="currentColor" 
                        strokeWidth="2" 
                        strokeLinecap="round" 
                        strokeLinejoin="round"
                      />
                    </svg>
                  ) : (
                    index + 1
                  )}
                </span>
                <span className="progress-bar__step-label">
                  {step.label || step.name || `Step ${index + 1}`}
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};

export default ProgressBar; 