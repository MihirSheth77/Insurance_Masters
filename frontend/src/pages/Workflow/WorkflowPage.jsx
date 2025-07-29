import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';

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

// Icons
import { 
  CheckCircleIcon,
  ArrowRightIcon,
  ArrowDownIcon,
  UploadIcon,
  CloseIcon
} from '../../components/Icons/Icons';

// Styles
import './WorkflowPage.css';

// Workflow Steps Configuration - Exactly as specified in requirements
const WORKFLOW_STEPS = [
  {
    id: 'group-setup',
    number: 1,
    title: 'Group Setup',
    subtitle: 'Create group and enter details',
    description: 'Start by creating a group and entering all necessary details including employer information.',
    component: GroupSetupPage,
    validation: (data) => {
      return data.group && data.group.id && data.group.name;
    },
    requiredFields: ['Group Name', 'Address', 'Effective Date']
  },
  {
    id: 'class-definition',
    number: 2,
    title: 'Class Definition',
    subtitle: 'Define ICHRA classes',
    description: 'Define one or more ICHRA employee classes, each with its own contribution structure.',
    component: ClassManagementPage,
    validation: (data) => {
      return data.classes && data.classes.length > 0;
    },
    requiredFields: ['At least one class', 'Employee contribution', 'Dependent contribution']
  },
  {
    id: 'member-onboarding',
    number: 3,
    title: 'Member Onboarding',
    subtitle: 'Add members to group',
    description: 'Add members by file upload or manual entry, assign to classes, and capture prior contribution details.',
    component: MemberManagementPage,
    validation: (data) => {
      return data.members && data.members.length > 0;
    },
    requiredFields: ['Employee information', 'Class assignments', 'Prior insurance contributions']
  },
  {
    id: 'group-quoting',
    number: 4,
    title: 'Group Quoting',
    subtitle: 'Generate and compare quotes',
    description: 'Run quotes for the entire group with ICHRA affordability calculations and detailed comparisons.',
    component: QuoteResultsPage,
    validation: (data) => {
      return data.quote && data.quote.id;
    },
    requiredFields: ['ICHRA affordability check', 'Plan comparisons', 'Savings calculations']
  }
];

/**
 * Modern Workflow Page Component
 * Implements best practices for multi-step workflows with insurance-specific UX
 */
const WorkflowPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { step } = useParams();
  const queryClient = useQueryClient();
  const { state: groupState, actions: groupActions } = useGroup();
  const { showNotification } = useApp();

  // State management
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [workflowData, setWorkflowData] = useState({
    group: null,
    classes: [],
    members: [],
    quote: null
  });
  const [completedSteps, setCompletedSteps] = useState(new Set());
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [unsavedChanges, setUnsavedChanges] = useState(false);

  // Load saved progress from localStorage
  useEffect(() => {
    const savedProgress = localStorage.getItem('workflowProgress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        setWorkflowData(parsed.data || {});
        setCompletedSteps(new Set(parsed.completedSteps || []));
      } catch (error) {
        console.error('Error loading workflow progress:', error);
      }
    }
  }, []);

  // Save progress to localStorage
  useEffect(() => {
    const progress = {
      data: workflowData,
      completedSteps: Array.from(completedSteps),
      lastUpdated: new Date().toISOString()
    };
    localStorage.setItem('workflowProgress', JSON.stringify(progress));
  }, [workflowData, completedSteps]);

  // Determine current step from URL
  useEffect(() => {
    const stepIndex = WORKFLOW_STEPS.findIndex(s => s.id === step);
    if (stepIndex >= 0) {
      setCurrentStepIndex(stepIndex);
    } else {
      // Default to first incomplete step or first step
      const firstIncompleteIndex = WORKFLOW_STEPS.findIndex(
        (s, idx) => !completedSteps.has(s.id)
      );
      const targetIndex = firstIncompleteIndex >= 0 ? firstIncompleteIndex : 0;
      navigate(`/workflow/${WORKFLOW_STEPS[targetIndex].id}`, { replace: true });
    }
  }, [step, completedSteps, navigate]);

  // Handle step navigation with transition
  const navigateToStep = useCallback(async (targetIndex) => {
    if (targetIndex < 0 || targetIndex >= WORKFLOW_STEPS.length) return;
    
    // Check for unsaved changes
    if (unsavedChanges) {
      const confirmLeave = window.confirm(
        'You have unsaved changes. Are you sure you want to leave this step?'
      );
      if (!confirmLeave) return;
    }

    setIsTransitioning(true);
    
    // Smooth transition
    setTimeout(() => {
      const targetStep = WORKFLOW_STEPS[targetIndex];
      navigate(`/workflow/${targetStep.id}`);
      setIsTransitioning(false);
    }, 300);
  }, [navigate, unsavedChanges]);

  // Handle step completion
  const handleStepComplete = useCallback((stepId, data) => {
    // Update workflow data
    const updates = {};
    switch (stepId) {
      case 'group-setup':
        updates.group = data;
        break;
      case 'class-definition':
        updates.classes = data;
        break;
      case 'member-onboarding':
        updates.members = data;
        break;
      case 'group-quoting':
        updates.quote = data;
        break;
      default:
        console.warn(`Unknown step ID: ${stepId}`);
        break;
    }

    setWorkflowData(prev => ({ ...prev, ...updates }));
    setCompletedSteps(prev => new Set([...prev, stepId]));
    setUnsavedChanges(false);

    // Show success notification
    showNotification({
      type: 'success',
      message: `${WORKFLOW_STEPS[currentStepIndex].title} completed successfully!`,
      duration: 3000
    });

    // Auto-advance to next step if not the last one
    if (currentStepIndex < WORKFLOW_STEPS.length - 1) {
      setTimeout(() => {
        navigateToStep(currentStepIndex + 1);
      }, 500);
    }
  }, [currentStepIndex, navigateToStep, showNotification]);

  // Calculate progress percentage
  const progressPercentage = (completedSteps.size / WORKFLOW_STEPS.length) * 100;

  // Get current step info
  const currentStep = WORKFLOW_STEPS[currentStepIndex];
  const CurrentStepComponent = currentStep?.component;

  // Check if current step can be accessed
  const canAccessStep = (stepIndex) => {
    if (stepIndex < 0 || stepIndex >= WORKFLOW_STEPS.length) return false;
    
    // Always allow access to the first step
    if (stepIndex === 0) return true;
    
    // Allow access to next step or any previously completed step
    // This makes the workflow more flexible
    return stepIndex <= currentStepIndex + 1 || completedSteps.has(WORKFLOW_STEPS[stepIndex].id);
  };

  // Check if we can proceed to next step
  const canProceedToNext = () => {
    if (currentStepIndex >= WORKFLOW_STEPS.length - 1) return false;
    
    // Check if current step has required data
    const currentStepValidation = WORKFLOW_STEPS[currentStepIndex].validation(workflowData);
    return currentStepValidation;
  };

  // Exit workflow handler
  const handleExitWorkflow = () => {
    if (unsavedChanges) {
      const confirmExit = window.confirm(
        'You have unsaved changes. Are you sure you want to exit the workflow?'
      );
      if (!confirmExit) return;
    }
    navigate('/dashboard');
  };

  // Save and exit handler
  const handleSaveAndExit = () => {
    showNotification({
      type: 'info',
      message: 'Progress saved. You can continue from where you left off.',
      duration: 3000
    });
    navigate('/dashboard');
  };

  return (
    <div className="workflow-page">
      {/* Header Bar */}
      <div className="workflow-header-bar">
        <div className="workflow-header-content">
          <div className="workflow-header-left">
            <h1 className="workflow-title">Group Insurance Quote Builder</h1>
            <div className="workflow-progress-text">
              Step {currentStepIndex + 1} of {WORKFLOW_STEPS.length} - {currentStep?.title}
            </div>
          </div>
          
          <div className="workflow-header-actions">
            <Button
              variant="outline"
              size="small"
              onClick={handleSaveAndExit}
              icon={<UploadIcon />}
            >
              Save & Exit
            </Button>
            <Button
              variant="text"
              size="small"
              onClick={handleExitWorkflow}
              icon={<CloseIcon />}
            >
              Exit
            </Button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="workflow-progress-bar">
          <div 
            className="workflow-progress-fill"
            style={{ width: `${progressPercentage}%` }}
          />
        </div>
      </div>

      {/* Main Content Area */}
      <div className="workflow-content-area">
        <div className="workflow-container">
          {/* Stepper Sidebar */}
          <aside className="workflow-sidebar">
            <div className="workflow-stepper">
              {WORKFLOW_STEPS.map((step, index) => {
                const isActive = index === currentStepIndex;
                const isCompleted = completedSteps.has(step.id);
                const isAccessible = canAccessStep(index);
                
                return (
                  <div
                    key={step.id}
                    className={`workflow-step-item ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''} ${!isAccessible ? 'disabled' : ''}`}
                    onClick={() => isAccessible && navigateToStep(index)}
                  >
                    <div className="step-indicator">
                      {isCompleted ? (
                        <CheckCircleIcon className="step-icon completed" />
                      ) : (
                        <div className={`step-number ${isActive ? 'active' : ''}`}>
                          {step.number}
                        </div>
                      )}
                    </div>
                    
                    <div className="step-content">
                      <h3 className="step-title">{step.title}</h3>
                      <p className="step-subtitle">{step.subtitle}</p>
                      
                      {isActive && (
                        <div className="step-requirements">
                          <p className="requirements-label">Required:</p>
                          <ul className="requirements-list">
                            {step.requiredFields.map((field, idx) => (
                              <li key={idx}>{field}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                    </div>
                    
                    {index < WORKFLOW_STEPS.length - 1 && (
                      <div className={`step-connector ${isCompleted ? 'completed' : ''}`} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Quick Stats */}
            {completedSteps.size > 0 && (
              <div className="workflow-stats">
                <h4>Progress Summary</h4>
                {workflowData.group && (
                  <div className="stat-item">
                    <span className="stat-label">Group:</span>
                    <span className="stat-value">{workflowData.group.name}</span>
                  </div>
                )}
                {workflowData.classes?.length > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Classes:</span>
                    <span className="stat-value">{workflowData.classes.length}</span>
                  </div>
                )}
                {workflowData.members?.length > 0 && (
                  <div className="stat-item">
                    <span className="stat-label">Members:</span>
                    <span className="stat-value">{workflowData.members.length}</span>
                  </div>
                )}
              </div>
            )}
          </aside>

          {/* Step Content */}
          <main className={`workflow-main ${isTransitioning ? 'transitioning' : ''}`}>
            <div className="step-header">
              <h2 className="step-page-title">{currentStep.title}</h2>
              <p className="step-description">{currentStep.description}</p>
            </div>

            <div className="step-component-wrapper">
              {CurrentStepComponent && (
                <CurrentStepComponent
                  workflowData={workflowData}
                  onComplete={(data) => handleStepComplete(currentStep.id, data)}
                  onChange={() => setUnsavedChanges(true)}
                  isWorkflowMode={true}
                />
              )}
            </div>

            {/* Navigation Footer */}
            <div className="workflow-footer">
              <Button
                variant="outline"
                onClick={() => navigateToStep(currentStepIndex - 1)}
                disabled={currentStepIndex === 0}
                icon={<ArrowDownIcon style={{ transform: 'rotate(90deg)' }} />}
              >
                Previous
              </Button>

              <div className="footer-center">
                {unsavedChanges && (
                  <span className="unsaved-indicator">• Unsaved changes</span>
                )}
              </div>

              <Button
                variant="primary"
                onClick={() => {
                  console.log('Next button clicked!', { currentStepIndex, currentStep: currentStep.id });
                  if (currentStepIndex === WORKFLOW_STEPS.length - 1) {
                    handleStepComplete(currentStep.id, workflowData.quote);
                  } else {
                    const nextStepIndex = currentStepIndex + 1;
                    console.log('Navigating to step:', nextStepIndex, WORKFLOW_STEPS[nextStepIndex]?.id);
                    // Force navigation directly
                    const targetStep = WORKFLOW_STEPS[nextStepIndex];
                    if (targetStep) {
                      console.log('Forcing navigation to:', `/workflow/${targetStep.id}`);
                      navigate(`/workflow/${targetStep.id}`);
                    }
                  }
                }}
                disabled={false}
                icon={<ArrowRightIcon />}
                iconPosition="right"
              >
                {currentStepIndex === WORKFLOW_STEPS.length - 1 ? 'Complete' : 'Next →'}
              </Button>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
};

export default WorkflowPage;