import React from 'react';
import { useNavigate } from 'react-router-dom';
import Modal from '../common/Modal';
import './QuoteOptionsModal.css';

const QUOTE_OPTIONS = [
  {
    id: 'new',
    title: 'Start Fresh',
    description: 'Create a new group and build your quote from scratch',
    icon: '🆕',
    color: 'primary',
    action: '/workflow/group-setup'
  },
  {
    id: 'existing',
    title: 'Use Existing Group',
    description: 'Select from your saved groups to generate a new quote',
    icon: '📁',
    color: 'secondary',
    action: '/quote/select-group'
  },
  {
    id: 'clone',
    title: 'Clone Previous Quote',
    description: 'Copy and modify a quote you\'ve created before',
    icon: '📋',
    color: 'tertiary',
    action: '/quotes/history?action=clone'
  }
];

const QuoteOptionsModal = ({ isOpen, onClose }) => {
  const navigate = useNavigate();

  const handleOptionSelect = (option) => {
    onClose();
    navigate(option.action);
  };

  // Check for saved progress
  const checkSavedProgress = () => {
    const saved = localStorage.getItem('quoteWizardProgress');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const hoursSinceLastSave = (Date.now() - parsed.timestamp) / (1000 * 60 * 60);
        
        if (hoursSinceLastSave < 24) {
          return {
            exists: true,
            groupName: parsed.data.groupName,
            step: parsed.currentStep
          };
        }
      } catch (error) {
      }
    }
    return { exists: false };
  };

  const savedProgress = checkSavedProgress();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Create New Quote"
      size="large"
    >
      <div className="quote-options-modal">
        {savedProgress.exists && (
          <div className="saved-progress-alert">
            <div className="alert-icon">💾</div>
            <div className="alert-content">
              <h4>Continue Previous Quote?</h4>
              <p>You have an incomplete quote for <strong>{savedProgress.groupName}</strong></p>
              <button 
                className="continue-btn"
                onClick={() => {
                  onClose();
                  navigate('/quote/new/group');
                }}
              >
                Continue Quote →
              </button>
            </div>
          </div>
        )}

        <div className="quote-options-grid">
          {QUOTE_OPTIONS.map((option) => (
            <div
              key={option.id}
              className={`quote-option-card ${option.color}`}
              onClick={() => handleOptionSelect(option)}
            >
              <div className="option-icon">{option.icon}</div>
              <h3 className="option-title">{option.title}</h3>
              <p className="option-description">{option.description}</p>
              <div className="option-arrow">→</div>
            </div>
          ))}
        </div>

        <div className="modal-footer">
          <p className="help-text">
            Not sure which option to choose? <a href="#help">Learn more about quote types</a>
          </p>
        </div>
      </div>
    </Modal>
  );
};

export default QuoteOptionsModal;