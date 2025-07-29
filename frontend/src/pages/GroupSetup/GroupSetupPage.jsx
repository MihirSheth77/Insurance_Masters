import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useGroup } from '../../context/GroupContext';
import { groupService } from '../../services/groupService';

// Components
import BasicInfo from './BasicInfo';
import AddressInfo from './AddressInfo';
import Summary from './Summary';
import ProgressBar from '../../components/common/ProgressBar';
import Button from '../../components/common/Button';

// Styles
import './GroupSetupPage.css';

const STEPS = [
  { id: 'basic-info', label: 'Basic Information', component: BasicInfo },
  { id: 'address-info', label: 'Address Information', component: AddressInfo },
  { id: 'summary', label: 'Summary', component: Summary }
];

const GroupSetupPage = ({ editMode = false, workflowData, onComplete, onChange, isWorkflowMode }) => {
  const navigate = useNavigate();
  const { step: urlStep, groupId } = useParams();
  const { actions: groupActions } = useGroup();
  const [isLoading, setIsLoading] = useState(false);
  // Store loaded group data for reference
  const [existingGroup, setExistingGroup] = useState(null);
  

  // State for current step and form data
  const [currentStep, setCurrentStep] = useState(0);
  const [formData, setFormData] = useState({
    basicInfo: {
      name: '',
      effectiveDate: '',
      employeeCount: '',
      description: ''
    },
    addressInfo: {
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      county: null,
      multipleCounties: []
    },
    isValid: {
      basicInfo: false,
      addressInfo: false,
      summary: false
    }
  });

  // Navigation errors for invalid steps
  const [navigationError, setNavigationError] = useState('');

  // Update current step based on URL parameter
  useEffect(() => {
    // Don't redirect if we're in edit mode
    if (editMode) {
      return;
    }
    
    if (urlStep) {
      const stepIndex = STEPS.findIndex(step => step.id === urlStep);
      if (stepIndex !== -1) {
        setCurrentStep(stepIndex);
      } else {
        // Invalid step in URL, redirect to first step
        navigate('/group-setup/basic-info', { replace: true });
      }
    } else {
      // No step in URL, redirect to first step
      navigate('/group-setup/basic-info', { replace: true });
    }
  }, [urlStep, navigate, editMode]);

  // Clear navigation error when step changes
  useEffect(() => {
    setNavigationError('');
  }, [currentStep]);

  // Load existing group data if in edit mode
  useEffect(() => {
    const loadGroupData = async () => {
      if (editMode && groupId) {
        setIsLoading(true);
        try {
          const groupData = await groupService.getGroup(groupId);
          setExistingGroup(groupData);
          
          // Populate form with existing data
          setFormData(prevData => ({
            ...prevData,
            basicInfo: {
              name: groupData.name || '',
              effectiveDate: groupData.effectiveDate || '',
              employeeCount: groupData.metadata?.employeeCount || '',
              description: groupData.metadata?.description || ''
            },
            addressInfo: {
              streetAddress: groupData.address?.street1 || '',
              city: groupData.address?.city || '',
              state: groupData.address?.state || '',
              zipCode: groupData.address?.zipCode || '',
              county: groupData.address?.county || null,
              multipleCounties: groupData.address?.multipleCounties || []
            }
          }));
        } catch (error) {
          setNavigationError('Failed to load group data');
        } finally {
          setIsLoading(false);
        }
      }
    };
    
    loadGroupData();
  }, [editMode, groupId]);

  // Store validation functions for each step
  const [stepValidators, setStepValidators] = useState({});

  // Update form data for a specific step
  const updateStepData = useCallback((stepKey, data, isValid = true, validateFn = null) => {
    setFormData(prevData => ({
      ...prevData,
      [stepKey]: { ...prevData[stepKey], ...data },
      isValid: { ...prevData.isValid, [stepKey]: isValid }
    }));
    
    // Store validation function if provided
    if (validateFn) {
      setStepValidators(prev => ({
        ...prev,
        [stepKey]: validateFn
      }));
    }
  }, []);

  // Navigate to specific step
  const goToStep = (stepIndex) => {
    if (stepIndex >= 0 && stepIndex < STEPS.length) {
      const stepId = STEPS[stepIndex].id;
      navigate(`/group-setup/${stepId}`);
    }
  };

  // Navigate to next step
  const nextStep = () => {
    const nextStepIndex = currentStep + 1;
    if (nextStepIndex < STEPS.length) {
      // Map step IDs to formData keys
      const stepKeyMap = {
        'basic-info': 'basicInfo',
        'address-info': 'addressInfo',
        'summary': 'summary'
      };
      const currentStepKey = stepKeyMap[STEPS[currentStep].id] || STEPS[currentStep].id;
      
      // If step has a validation function, call it first
      if (stepValidators[currentStepKey]) {
        const isValid = stepValidators[currentStepKey]();
        if (!isValid) {
          setNavigationError('Please complete all required fields before proceeding.');
          return;
        }
      } else {
        // Fallback to checking isValid state
        if (!formData.isValid[currentStepKey]) {
          setNavigationError('Please complete all required fields before proceeding.');
          return;
        }
      }
      
      // Clear any previous error and proceed
      setNavigationError('');
      goToStep(nextStepIndex);
    }
  };

  // Navigate to previous step
  const previousStep = () => {
    const prevStepIndex = currentStep - 1;
    if (prevStepIndex >= 0) {
      goToStep(prevStepIndex);
    }
  };

  // Handle form submission
  const handleSubmit = async () => {
    try {
      setIsLoading(true);
      groupActions.setLoading(true);
      
      // Validate all steps
      const allStepsValid = Object.values(formData.isValid).every(valid => valid);
      if (!allStepsValid) {
        setNavigationError('Please complete all steps before submitting.');
        return;
      }

      // Prepare submission data
      const submissionData = {
        name: formData.basicInfo.name,
        effectiveDate: formData.basicInfo.effectiveDate,
        address: {
          street1: formData.addressInfo.streetAddress,
          city: formData.addressInfo.city,
          state: formData.addressInfo.state,
          zipCode: formData.addressInfo.zipCode
        },
        metadata: {
          employeeCount: parseInt(formData.basicInfo.employeeCount),
          description: formData.basicInfo.description,
          setupCompleted: true,
          setupCompletedAt: new Date().toISOString(),
          county: formData.addressInfo.county
        }
      };

      // Create or update group via service
      let result;
      if (editMode && groupId) {
        result = await groupService.updateGroup(groupId, submissionData);
      } else {
        result = await groupService.createGroup(submissionData);
      }
      
      if (result.data) {
        // Update context with group data
        groupActions.setCurrentGroup(result.data);
        
        // Store group ID for navigation guard
        localStorage.setItem('currentGroupId', result.data.groupId || groupId);
        
        // In workflow mode, call onComplete
        if (isWorkflowMode && onComplete) {
          onComplete({
            id: result.data.groupId || result.data.id,
            name: result.data.name,
            ...result.data
          });
        } else if (editMode) {
          // Navigate back to group detail page after edit
          navigate(`/groups/${groupId}`);
        } else {
          // Navigate to classes for new group
          navigate('/classes');
        }
      } else {
        setNavigationError(result.error || 'Failed to save group. Please try again.');
      }
    } catch (error) {
      setNavigationError(error.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsLoading(false);
      groupActions.setLoading(false);
    }
  };

  // Get current step component
  const CurrentStepComponent = STEPS[currentStep]?.component;

  // Progress percentage can be used for progress indicators
  // const progressPercentage = ((currentStep + 1) / STEPS.length) * 100;
  
  // Memoize onUpdate callback for current step
  const handleStepUpdate = useCallback((data, isValid, validateFn) => {
    // Map step IDs to formData keys
    const stepKeyMap = {
      'basic-info': 'basicInfo',
      'address-info': 'addressInfo',
      'summary': 'summary'
    };
    const stepKey = stepKeyMap[STEPS[currentStep].id] || STEPS[currentStep].id;
    updateStepData(stepKey, data, isValid, validateFn);
  }, [currentStep, updateStepData]);

  return (
    <div className="group-setup-page">
      <div className="group-setup-container">
        {/* Header */}
        <div className="group-setup-header">
          <h1>{editMode ? 'Edit Group' : 'Group Setup'}</h1>
          <p>{editMode ? 'Update your organization\'s information' : 'Set up your organization\'s information for ICHRA administration'}</p>
        </div>

        {/* Progress Bar */}
        <div className="progress-section">
          <ProgressBar 
            currentStep={currentStep}
            totalSteps={STEPS.length}
            steps={STEPS}
          />
        </div>

        {/* Step Navigation */}
        <div className="step-navigation">
          {STEPS.map((step, index) => {
            // Map step IDs to formData keys
            const stepKeyMap = {
              'basic-info': 'basicInfo',
              'address-info': 'addressInfo',
              'summary': 'summary'
            };
            const stepKey = stepKeyMap[step.id] || step.id;
            
            return (
              <button
                key={step.id}
                className={`step-button ${index === currentStep ? 'active' : ''} ${
                  formData.isValid[stepKey] ? 'completed' : ''
                }`}
                onClick={() => goToStep(index)}
                disabled={isLoading}
              >
                <span className="step-number">{index + 1}</span>
                <span className="step-label">{step.label}</span>
              </button>
            );
          })}
        </div>

        {/* Error Message */}
        {navigationError && (
          <div className="error-message">
            <span className="error-icon">⚠️</span>
            {navigationError}
          </div>
        )}

        {/* Current Step Content */}
        <div className="step-content">
          {CurrentStepComponent && (
            (() => {
              // Map step IDs to formData keys
              const stepKeyMap = {
                'basic-info': 'basicInfo',
                'address-info': 'addressInfo',
                'summary': 'summary'
              };
              const currentStepId = STEPS[currentStep].id;
              const stepKey = stepKeyMap[currentStepId] || currentStepId;
              
              
              return (
                <CurrentStepComponent
                  data={
                    currentStep === 2 // Summary step
                      ? { basicInfo: formData.basicInfo, addressInfo: formData.addressInfo }
                      : formData[stepKey]
                  }
                  onUpdate={handleStepUpdate}
                  isLoading={isLoading}
                />
              );
            })()
          )}
        </div>

        {/* Navigation Buttons */}
        <div className="navigation-buttons">
          <Button
            variant="secondary"
            onClick={previousStep}
            disabled={currentStep === 0 || isLoading}
          >
            Previous
          </Button>

          <div className="button-spacer" />

          {currentStep === STEPS.length - 1 ? (
            (() => {
              const allValid = Object.values(formData.isValid).every(valid => valid);
              return (
                <Button
                  variant="primary"
                  onClick={handleSubmit}
                  disabled={!allValid || isLoading}
                  loading={isLoading}
                >
                  {editMode ? 'Update Group' : 'Create Group'}
                </Button>
              );
            })()
          ) : (
            <Button
              variant="primary"
              onClick={nextStep}
              disabled={(() => {
                // Map step IDs to formData keys
                const stepKeyMap = {
                  'basic-info': 'basicInfo',
                  'address-info': 'addressInfo',
                  'summary': 'summary'
                };
                const currentStepKey = stepKeyMap[STEPS[currentStep].id] || STEPS[currentStep].id;
                return !formData.isValid[currentStepKey] || isLoading;
              })()}
            >
              Next
            </Button>
          )}
        </div>

        {/* Help Text */}
        <div className="help-text">
          <p>
            You can navigate between steps at any time using the step buttons above. 
            All information is saved automatically as you progress.
          </p>
        </div>
      </div>
    </div>
  );
};

export default GroupSetupPage; 