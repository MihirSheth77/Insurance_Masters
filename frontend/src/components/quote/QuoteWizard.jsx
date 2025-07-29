import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation, Outlet } from 'react-router-dom';
import { useGroup } from '../../context/GroupContext';
import { useQuote } from '../../context/QuoteContext';
import QuoteProgress from './QuoteProgress';
import QuoteContextBar from './QuoteContextBar';
import Button from '../common/Button';
import Modal from '../common/Modal';
import './QuoteWizard.css';

const WIZARD_STEPS = [
  { id: 1, path: 'group', label: 'Group Setup', icon: '🏢' },
  { id: 2, path: 'classes', label: 'ICHRA Classes', icon: '👥' },
  { id: 3, path: 'members', label: 'Add Members', icon: '👤' },
  { id: 4, path: 'review', label: 'Review', icon: '✓' },
  { id: 5, path: 'generate', label: 'Generate Quote', icon: '📊' }
];

const QuoteWizard = () => {
  const navigate = useNavigate();
  const location = useLocation();
  // const { state: groupState } = useGroup();
  // const { state: quoteState, actions: quoteActions } = useQuote();
  
  const [currentStep, setCurrentStep] = useState(1);
  const [completedSteps, setCompletedSteps] = useState([]);
  const [showExitModal, setShowExitModal] = useState(false);
  const [wizardData, setWizardData] = useState({
    groupId: null,
    groupName: '',
    classes: [],
    members: [],
    quoteOptions: {}
  });

  // Navigate to specific step
  const navigateToStep = useCallback((stepId) => {
    const step = WIZARD_STEPS.find(s => s.id === stepId);
    if (step) {
      navigate(`/quote/new/${step.path}`);
    }
  }, [navigate]);

  // Clear saved progress
  const clearProgress = useCallback(() => {
    localStorage.removeItem('quoteWizardProgress');
    setWizardData({
      groupId: null,
      groupName: '',
      classes: [],
      members: [],
      quoteOptions: {}
    });
    setCompletedSteps([]);
  }, []);

  // Load saved progress on mount
  useEffect(() => {
    // Check if we have a selected group from the group detail page
    const selectedGroupId = sessionStorage.getItem('selectedGroupId');
    const selectedGroupName = sessionStorage.getItem('selectedGroupName');
    
    if (selectedGroupId && selectedGroupName) {
      // Load group data and prepare to skip to classes step
      setWizardData(prev => ({
        ...prev,
        groupId: selectedGroupId,
        groupName: selectedGroupName
      }));
      setCompletedSteps([1]); // Mark group step as completed
      setCurrentStep(2); // Set to classes step
      
      // Clean up session storage
      sessionStorage.removeItem('selectedGroupId');
      sessionStorage.removeItem('selectedGroupName');
      
      // Navigate to classes step after state is set
      setTimeout(() => {
        navigate('/quote/new/classes');
      }, 100);
      
      console.log('🏢 Group selected for quote:', { selectedGroupId, selectedGroupName });
      return;
    }
    
    const savedProgress = localStorage.getItem('quoteWizardProgress');
    if (savedProgress) {
      try {
        const parsed = JSON.parse(savedProgress);
        const hoursSinceLastSave = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
        
        // Only restore if less than 24 hours old
        if (hoursSinceLastSave < 24) {
          setWizardData(parsed.data);
          setCurrentStep(parsed.currentStep);
          setCompletedSteps(parsed.completedSteps);
          
          // Show notification
          if (window.confirm(`Continue your quote for ${parsed.data.groupName}?`)) {
            navigateToStep(parsed.currentStep);
          } else {
            clearProgress();
          }
        }
      } catch (error) {
      }
    }
  }, [navigateToStep, clearProgress]);

  // Determine current step from URL
  useEffect(() => {
    const pathSegments = location.pathname.split('/');
    const stepPath = pathSegments[pathSegments.length - 1];
    const step = WIZARD_STEPS.find(s => s.path === stepPath);
    if (step) {
      setCurrentStep(step.id);
    }
  }, [location]);

  // Save progress automatically
  const saveProgress = useCallback(() => {
    const progressData = {
      data: wizardData,
      currentStep,
      completedSteps,
      timestamp: Date.now()
    };
    localStorage.setItem('quoteWizardProgress', JSON.stringify(progressData));
  }, [wizardData, currentStep, completedSteps]);

  // Handle step navigation
  const handleStepClick = (stepId) => {
    // Can only navigate to completed steps or current step
    if (stepId <= currentStep || completedSteps.includes(stepId)) {
      navigateToStep(stepId);
    }
  };

  // Handle next step
  const handleNextStep = () => {
    console.log('🚀 QuoteWizard Next Step clicked!', { 
      currentStep, 
      totalSteps: WIZARD_STEPS.length,
      completedSteps,
      wizardData 
    });
    
    if (currentStep < WIZARD_STEPS.length) {
      // Mark current step as completed
      if (!completedSteps.includes(currentStep)) {
        console.log('✅ Marking step completed:', currentStep);
        setCompletedSteps([...completedSteps, currentStep]);
      }
      
      // Save progress
      saveProgress();
      
      // Navigate to next step
      const nextStep = currentStep + 1;
      console.log('📍 Navigating to step:', nextStep, WIZARD_STEPS[nextStep - 1]);
      navigateToStep(nextStep);
    } else {
      console.warn('❌ Cannot proceed - already at last step');
    }
  };

  // Handle previous step
  const handlePreviousStep = () => {
    if (currentStep > 1) {
      navigateToStep(currentStep - 1);
    }
  };

  // Handle save and exit
  const handleSaveAndExit = () => {
    saveProgress();
    setShowExitModal(true);
  };

  // Update wizard data
  const updateWizardData = (key, value) => {
    setWizardData(prev => ({
      ...prev,
      [key]: value
    }));
  };

  // Get completion percentage
  const getCompletionPercentage = () => {
    return Math.round((completedSteps.length / WIZARD_STEPS.length) * 100);
  };

  return (
    <div className="quote-wizard">
      {/* Context Bar */}
      <QuoteContextBar
        groupName={wizardData.groupName || 'New Quote'}
        completionPercentage={getCompletionPercentage()}
        onSaveAndExit={handleSaveAndExit}
      />

      {/* Progress Indicator */}
      <QuoteProgress
        steps={WIZARD_STEPS}
        currentStep={currentStep}
        completedSteps={completedSteps}
        onStepClick={handleStepClick}
      />

      {/* Main Content */}
      <div className="wizard-content">
        <Outlet context={{
          wizardData,
          updateWizardData,
          currentStep,
          onNext: handleNextStep,
          onPrevious: handlePreviousStep
        }} />
      </div>

      {/* Navigation Footer */}
      <div className="wizard-footer">
        <div className="wizard-nav">
          <Button
            variant="secondary"
            onClick={handlePreviousStep}
            disabled={currentStep === 1}
          >
            ← Previous
          </Button>

          <div className="wizard-actions">
            <Button
              variant="outline"
              onClick={handleSaveAndExit}
            >
              Save & Exit
            </Button>

            <Button
              variant="primary"
              onClick={() => {
                console.log('🎯 Next button clicked in QuoteWizard!');
                handleNextStep();
              }}
              disabled={currentStep === WIZARD_STEPS.length}
              style={{ minWidth: '120px' }}
            >
              {currentStep === WIZARD_STEPS.length - 1 ? 'Generate Quote' : 'Next →'}
            </Button>
          </div>
        </div>
      </div>

      {/* Exit Modal */}
      <Modal
        isOpen={showExitModal}
        onClose={() => setShowExitModal(false)}
        title="Save Progress"
      >
        <div className="exit-modal-content">
          <p>Your progress has been saved. You can continue this quote later from your dashboard.</p>
          <div className="modal-actions">
            <Button
              variant="secondary"
              onClick={() => setShowExitModal(false)}
            >
              Continue Working
            </Button>
            <Button
              variant="primary"
              onClick={() => {
                navigate('/dashboard');
                clearProgress();
              }}
            >
              Exit to Dashboard
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default QuoteWizard;