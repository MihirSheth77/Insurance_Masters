import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

// Context imports
import { useGroup } from '../../context/GroupContext';
import { useApp } from '../../context/AppContext';

// Page Components
import GroupSetupPage from '../GroupSetup/GroupSetupPage';
import ClassManagementPage from '../ClassManagement/ClassManagementPage';
import MemberManagementPage from '../MemberManagement/MemberManagementPage';
import QuoteResultsPage from '../QuoteResults/QuoteResultsPage';

// Common Components
import Button from '../../components/common/Button';
import LoadingSpinner from '../../components/common/LoadingSpinner';

// Styles
import './UnifiedWorkflow.css';

// Workflow Steps Configuration
const WORKFLOW_STEPS = [
  {
    id: 'group-setup',
    name: 'Group Setup',
    description: 'Create and configure your employer group',
    icon: '🏢',
    component: GroupSetupPage,
    validation: (context) => {
      return context.currentGroup && context.currentGroup.id;
    }
  },
  {
    id: 'class-definition',
    name: 'Class Definition',
    description: 'Define ICHRA employee classes and contributions',
    icon: '👥',
    component: ClassManagementPage,
    validation: (context) => {
      return context.classes && context.classes.length > 0;
    }
  },
  {
    id: 'member-onboarding',
    name: 'Member Onboarding',
    description: 'Add employees and assign them to classes',
    icon: '👤',
    component: MemberManagementPage,
    validation: (context) => {
      return context.members && context.members.length > 0;
    }
  },
  {
    id: 'group-quoting',
    name: 'Group Quoting',
    description: 'Generate quotes and view comparison reports',
    icon: '📊',
    component: QuoteResultsPage,
    validation: (context) => {
      return context.currentQuote && context.currentQuote.id;
    }
  }
];

/**
 * UnifiedWorkflow Component
 * Provides a unified 4-step workflow for the insurance quoting process
 * with non-sequential navigation capabilities
 */
const UnifiedWorkflow = () => {
  const navigate = useNavigate();
  const { step } = useParams();
  const { state: groupState } = useGroup();
  const { showNotification } = useApp();
  const { currentGroup, loading: groupLoading } = groupState;

  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [workflowData, setWorkflowData] = useState({
    group: null,
    classes: [],
    members: [],
    quote: null
  });
  const [stepValidation, setStepValidation] = useState({
    'group-setup': false,
    'class-definition': false,
    'member-onboarding': false,
    'group-quoting': false
  });

  // Load workflow data from context and localStorage
  useEffect(() => {
    const savedWorkflowData = localStorage.getItem('workflowData');
    if (savedWorkflowData) {
      try {
        const parsed = JSON.parse(savedWorkflowData);
        setWorkflowData(parsed);
      } catch (error) {
        console.error('Error loading workflow data:', error);
      }
    }

    // Load current group data
    if (currentGroup) {
      setWorkflowData(prev => ({
        ...prev,
        group: currentGroup
      }));
    }
  }, [currentGroup]);

  // Save workflow data to localStorage
  useEffect(() => {
    localStorage.setItem('workflowData', JSON.stringify(workflowData));
  }, [workflowData]);

  // Determine current step from URL
  useEffect(() => {
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === step);
    if (stepIndex >= 0) {
      setCurrentStepIndex(stepIndex);
    } else {
      // Default to first step if invalid step
      navigate(`/workflow/${WORKFLOW_STEPS[0].id}`, { replace: true });
    }
  }, [step, navigate]);

  // Validate all steps
  useEffect(() => {
    const validation = {};
    WORKFLOW_STEPS.forEach(step => {
      validation[step.id] = step.validation(workflowData);
    });
    setStepValidation(validation);
  }, [workflowData]);

  // Navigate to a specific step
  const navigateToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < WORKFLOW_STEPS.length) {
      const targetStep = WORKFLOW_STEPS[stepIndex];
      navigate(`/workflow/${targetStep.id}`);
    }
  };

  // Handle step completion
  const handleStepComplete = (stepId, data) => {
    // Update workflow data based on step
    switch (stepId) {
      case 'group-setup':
        setWorkflowData(prev => ({ ...prev, group: data }));
        break;
      case 'class-definition':
        setWorkflowData(prev => ({ ...prev, classes: data }));
        break;
      case 'member-onboarding':
        setWorkflowData(prev => ({ ...prev, members: data }));
        break;
      case 'group-quoting':
        setWorkflowData(prev => ({ ...prev, quote: data }));
        break;
      default:
        break;
    }

    showNotification({
      type: 'success',
      message: `${WORKFLOW_STEPS[currentStepIndex].name} completed successfully!`
    });

    // Auto-navigate to next step if available
    if (currentStepIndex < WORKFLOW_STEPS.length - 1) {
      setTimeout(() => {
        navigateToStep(currentStepIndex + 1);
      }, 500);
    }
  };

  // Handle navigation buttons
  const handlePrevious = () => {
    if (currentStepIndex > 0) {
      navigateToStep(currentStepIndex - 1);
    }
  };

  const handleNext = () => {
    if (currentStepIndex < WORKFLOW_STEPS.length - 1) {
      navigateToStep(currentStepIndex + 1);
    }
  };

  // Clear workflow data
  const handleClearWorkflow = () => {
    if (window.confirm('Are you sure you want to clear all workflow data and start over?')) {
      setWorkflowData({
        group: null,
        classes: [],
        members: [],
        quote: null
      });
      localStorage.removeItem('workflowData');
      localStorage.removeItem('currentGroupId');
      navigateToStep(0);
      showNotification({
        type: 'info',
        message: 'Workflow data cleared. Starting fresh!'
      });
    }
  };

  if (groupLoading) {
    return (
      <div className="unified-workflow-loading">
        <LoadingSpinner size="large" />
        <p>Loading workflow data...</p>
      </div>
    );
  }

  const CurrentStepComponent = WORKFLOW_STEPS[currentStepIndex]?.component;
  const currentStep = WORKFLOW_STEPS[currentStepIndex];

  return (
    <div className="unified-workflow">
      {/* Workflow Header */}
      <div className="workflow-header">
        <div className="workflow-title">
          <h1>Insurance Quoting Workflow</h1>
          <p>Complete all steps to generate your group insurance quote</p>
        </div>
        <Button
          variant="secondary"
          size="small"
          onClick={handleClearWorkflow}
        >
          Start Over
        </Button>
      </div>

      {/* Progress Indicator */}
      <div className="workflow-progress">
        {WORKFLOW_STEPS.map((step, index) => (
          <div
            key={step.id}
            className={`workflow-step ${
              index === currentStepIndex ? 'active' : ''
            } ${stepValidation[step.id] ? 'completed' : ''}`}
            onClick={() => navigateToStep(index)}
            role="button"
            tabIndex={0}
            onKeyPress={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                navigateToStep(index);
              }
            }}
          >
            <div className="step-indicator">
              {stepValidation[step.id] ? (
                <span className="step-check">✓</span>
              ) : (
                <span className="step-number">{index + 1}</span>
              )}
            </div>
            <div className="step-content">
              <div className="step-icon">{step.icon}</div>
              <div className="step-info">
                <h3>{step.name}</h3>
                <p>{step.description}</p>
              </div>
            </div>
            {index < WORKFLOW_STEPS.length - 1 && (
              <div className="step-connector" />
            )}
          </div>
        ))}
      </div>

      {/* Current Step Content */}
      <div className="workflow-content">
        <div className="step-header">
          <h2>
            <span className="step-icon-large">{currentStep.icon}</span>
            {currentStep.name}
          </h2>
          <p className="step-description">{currentStep.description}</p>
        </div>

        <div className="step-component">
          {CurrentStepComponent && (
            <CurrentStepComponent
              workflowData={workflowData}
              onComplete={(data) => handleStepComplete(currentStep.id, data)}
              isWorkflowMode={true}
            />
          )}
        </div>
      </div>

      {/* Navigation Controls */}
      <div className="workflow-navigation">
        <Button
          variant="secondary"
          onClick={handlePrevious}
          disabled={currentStepIndex === 0}
        >
          Previous Step
        </Button>

        <div className="step-counter">
          Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length}
        </div>

        <Button
          variant="primary"
          onClick={handleNext}
          disabled={currentStepIndex === WORKFLOW_STEPS.length - 1}
        >
          Next Step
        </Button>
      </div>

      {/* Quick Navigation */}
      <div className="workflow-quick-nav">
        <h4>Quick Navigation</h4>
        <p>Jump to any step at any time:</p>
        <div className="quick-nav-buttons">
          {WORKFLOW_STEPS.map((step, index) => (
            <Button
              key={step.id}
              variant={index === currentStepIndex ? 'primary' : 'outline'}
              size="small"
              onClick={() => navigateToStep(index)}
              className={stepValidation[step.id] ? 'validated' : ''}
            >
              {step.icon} {step.name}
              {stepValidation[step.id] && ' ✓'}
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
};

export default UnifiedWorkflow;