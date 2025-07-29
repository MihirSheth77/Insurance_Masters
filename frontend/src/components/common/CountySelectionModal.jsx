import React from 'react';
import Modal from './Modal';
import Button from './Button';
import './CountySelectionModal.css';

/**
 * CountySelectionModal - Component for selecting a county when ZIP code maps to multiple counties
 * @param {Object} props
 * @param {boolean} props.isOpen - Whether modal is open
 * @param {Function} props.onClose - Callback when modal is closed
 * @param {Function} props.onSelect - Callback when county is selected
 * @param {Array} props.counties - Array of county options
 * @param {string} props.zipCode - The ZIP code that has multiple counties
 * @param {boolean} props.isLoading - Loading state
 */
const CountySelectionModal = ({ 
  isOpen, 
  onClose, 
  onSelect, 
  counties = [], 
  zipCode,
  isLoading = false 
}) => {
  const [selectedCountyId, setSelectedCountyId] = React.useState(null);

  const handleSelect = () => {
    const selectedCounty = counties.find(c => c.id === selectedCountyId);
    if (selectedCounty) {
      onSelect(selectedCounty);
    }
  };

  const handleCountyClick = (countyId) => {
    setSelectedCountyId(countyId);
  };

  React.useEffect(() => {
    if (isOpen && counties.length > 0) {
      setSelectedCountyId(null);
    }
  }, [isOpen, counties]);

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Select Your County"
      size="medium"
    >
      <div className="county-selection-modal">
        <div className="county-selection-header">
          <p className="county-selection-description">
            The ZIP code <strong>{zipCode}</strong> serves multiple counties. 
            Please select your county to ensure accurate plan availability and pricing.
          </p>
        </div>

        {isLoading ? (
          <div className="county-selection-loading">
            <div className="spinner"></div>
            <p>Loading counties...</p>
          </div>
        ) : (
          <>
            <div className="county-selection-list">
              {counties.map((county) => (
                <div
                  key={county.id}
                  className={`county-option ${selectedCountyId === county.id ? 'selected' : ''}`}
                  onClick={() => handleCountyClick(county.id)}
                  role="button"
                  tabIndex={0}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      handleCountyClick(county.id);
                    }
                  }}
                  aria-pressed={selectedCountyId === county.id}
                >
                  <div className="county-option-content">
                    <div className="county-info">
                      <h4 className="county-name">{county.name}</h4>
                      <p className="county-state">State: {county.stateId}</p>
                      {county.availablePlans && (
                        <p className="county-plans">
                          {county.availablePlans} available plans
                        </p>
                      )}
                    </div>
                    <div className="county-selection-indicator">
                      <input
                        type="radio"
                        name="county"
                        checked={selectedCountyId === county.id}
                        onChange={() => handleCountyClick(county.id)}
                        aria-label={`Select ${county.name}`}
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="county-selection-footer">
              <p className="county-selection-help">
                Not sure which county? Check your address or contact your employer.
              </p>
              <div className="county-selection-actions">
                <Button
                  variant="secondary"
                  onClick={onClose}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  onClick={handleSelect}
                  disabled={!selectedCountyId}
                >
                  Select County
                </Button>
              </div>
            </div>
          </>
        )}
      </div>
    </Modal>
  );
};

export default CountySelectionModal;