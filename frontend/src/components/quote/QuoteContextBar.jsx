import React from 'react';
import Button from '../common/Button';
import './QuoteContextBar.css';

const QuoteContextBar = ({ groupName, completionPercentage, onSaveAndExit }) => {
  return (
    <div className="quote-context-bar">
      <div className="context-info">
        <h3 className="context-title">New Quote</h3>
        <span className="context-group">for {groupName}</span>
      </div>
      
      <div className="context-progress">
        <div className="progress-info">
          <span className="progress-label">Progress</span>
          <span className="progress-percentage">{completionPercentage}%</span>
        </div>
        <div className="progress-bar">
          <div 
            className="progress-fill" 
            style={{ width: `${completionPercentage}%` }}
          />
        </div>
      </div>

      <div className="context-actions">
        <Button
          variant="ghost"
          size="small"
          onClick={onSaveAndExit}
          icon="💾"
        >
          Save & Exit
        </Button>
      </div>
    </div>
  );
};

export default QuoteContextBar;