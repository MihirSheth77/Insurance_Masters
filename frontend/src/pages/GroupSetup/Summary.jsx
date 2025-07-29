// Group setup summary
import React from 'react';
import formatters from '../../utils/formatters';

const Summary = ({ data = {}, onUpdate, isLoading }) => {
  // Extract data from form steps
  const { basicInfo = {}, addressInfo = {} } = data || {};

  // Track previous validity to avoid unnecessary updates
  const [prevIsValid, setPrevIsValid] = React.useState(null);
  
  // Mark summary as valid if we have all required data
  React.useEffect(() => {
    const isValid = Boolean(
      basicInfo.name && 
      basicInfo.effectiveDate && 
      basicInfo.employeeCount &&
      addressInfo.streetAddress &&
      addressInfo.city &&
      addressInfo.state &&
      addressInfo.zipCode
    );
    
    
    // Only call onUpdate if validity has changed
    if (isValid !== prevIsValid) {
      setPrevIsValid(isValid);
      if (onUpdate) {
        onUpdate({}, isValid);
      }
    }
  }, [basicInfo.name, basicInfo.effectiveDate, basicInfo.employeeCount, 
      addressInfo.streetAddress, addressInfo.city, addressInfo.state, 
      addressInfo.zipCode, prevIsValid, onUpdate]);

  return (
    <div className="summary-form">
      <div className="form-header">
        <h2>Review Group Setup</h2>
        <p>Please review your information before creating the group.</p>
      </div>

      <div className="summary-content">
        <div className="summary-section">
          <h3>Basic Information</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <label>Group Name:</label>
              <span>{basicInfo.name || 'Not provided'}</span>
            </div>
            <div className="summary-item">
              <label>Effective Date:</label>
              <span>
                {basicInfo.effectiveDate 
                  ? formatters.formatDate(basicInfo.effectiveDate)
                  : 'Not provided'
                }
              </span>
            </div>
            <div className="summary-item">
              <label>Number of Employees:</label>
              <span>
                {basicInfo.employeeCount 
                  ? formatters.formatNumber(basicInfo.employeeCount)
                  : 'Not provided'
                }
              </span>
            </div>
            {basicInfo.description && (
              <div className="summary-item">
                <label>Description:</label>
                <span>{basicInfo.description}</span>
              </div>
            )}
          </div>
        </div>

        <div className="summary-section">
          <h3>Address Information</h3>
          <div className="summary-grid">
            <div className="summary-item">
              <label>Street Address:</label>
              <span>{addressInfo.streetAddress || 'Not provided'}</span>
            </div>
            <div className="summary-item">
              <label>City:</label>
              <span>{addressInfo.city || 'Not provided'}</span>
            </div>
            <div className="summary-item">
              <label>State:</label>
              <span>{addressInfo.state || 'Not provided'}</span>
            </div>
            <div className="summary-item">
              <label>ZIP Code:</label>
              <span>{addressInfo.zipCode || 'Not provided'}</span>
            </div>
            {addressInfo.county && (
              <div className="summary-item">
                <label>County:</label>
                <span>{addressInfo.county.name}</span>
              </div>
            )}
          </div>
        </div>

        <div className="summary-section">
          <h3>Next Steps</h3>
          <div className="next-steps">
            <div className="step-item">
              <div className="step-number">1</div>
              <div className="step-content">
                <h4>Create Group</h4>
                <p>Your group will be created in our system and with the Ideon API</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">2</div>
              <div className="step-content">
                <h4>Define ICHRA Classes</h4>
                <p>Set up employee classes with contribution amounts</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">3</div>
              <div className="step-content">
                <h4>Add Members</h4>
                <p>Add individual employees or bulk upload via CSV</p>
              </div>
            </div>
            <div className="step-item">
              <div className="step-number">4</div>
              <div className="step-content">
                <h4>Generate Quotes</h4>
                <p>Run ICHRA quotes and compare plan options</p>
              </div>
            </div>
          </div>
        </div>

        <div className="summary-section">
          <h3>Important Notes</h3>
          <div className="notes-grid">
            <div className="note-item">
              <h4>⚠️ Effective Date</h4>
              <p>
                ICHRA coverage cannot start before the first day of a month. 
                Make sure your effective date aligns with your payroll cycle.
              </p>
            </div>
            <div className="note-item">
              <h4>📋 Employee Classes</h4>
              <p>
                You'll need to define at least one ICHRA employee class. 
                Common classes include full-time, part-time, and seasonal employees.
              </p>
            </div>
            <div className="note-item">
              <h4>💰 Contribution Amounts</h4>
              <p>
                Set monthly contribution amounts for employees and their dependents. 
                These must be the same for all employees in a class.
              </p>
            </div>
            <div className="note-item">
              <h4>🏥 Plan Options</h4>
              <p>
                Employees will choose from individual health plans available in their area. 
                ICHRA contributions help offset premium costs.
              </p>
            </div>
          </div>
        </div>

        <div className="summary-actions">
          <div className="action-info">
            <p>
              <strong>Ready to create your group?</strong> 
              Click "Create Group" to proceed with your ICHRA setup.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Summary; 