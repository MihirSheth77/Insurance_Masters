import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useQuery } from '@tanstack/react-query';

// Components
import FormInput from '../../components/common/FormInput';
import Select from '../../components/common/Select';
import CountySelectionModal from '../../components/common/CountySelectionModal';
import ZipValidationLoader from '../../components/common/ZipValidationLoader';
import ErrorMessage from '../../components/common/ErrorMessage';

// Services
import { geographicService } from '../../services/geographicService';

// Styles
import './AddressInfo.css';

// US States
const US_STATES = [
  { value: 'AL', label: 'Alabama' },
  { value: 'AK', label: 'Alaska' },
  { value: 'AZ', label: 'Arizona' },
  { value: 'AR', label: 'Arkansas' },
  { value: 'CA', label: 'California' },
  { value: 'CO', label: 'Colorado' },
  { value: 'CT', label: 'Connecticut' },
  { value: 'DE', label: 'Delaware' },
  { value: 'FL', label: 'Florida' },
  { value: 'GA', label: 'Georgia' },
  { value: 'HI', label: 'Hawaii' },
  { value: 'ID', label: 'Idaho' },
  { value: 'IL', label: 'Illinois' },
  { value: 'IN', label: 'Indiana' },
  { value: 'IA', label: 'Iowa' },
  { value: 'KS', label: 'Kansas' },
  { value: 'KY', label: 'Kentucky' },
  { value: 'LA', label: 'Louisiana' },
  { value: 'ME', label: 'Maine' },
  { value: 'MD', label: 'Maryland' },
  { value: 'MA', label: 'Massachusetts' },
  { value: 'MI', label: 'Michigan' },
  { value: 'MN', label: 'Minnesota' },
  { value: 'MS', label: 'Mississippi' },
  { value: 'MO', label: 'Missouri' },
  { value: 'MT', label: 'Montana' },
  { value: 'NE', label: 'Nebraska' },
  { value: 'NV', label: 'Nevada' },
  { value: 'NH', label: 'New Hampshire' },
  { value: 'NJ', label: 'New Jersey' },
  { value: 'NM', label: 'New Mexico' },
  { value: 'NY', label: 'New York' },
  { value: 'NC', label: 'North Carolina' },
  { value: 'ND', label: 'North Dakota' },
  { value: 'OH', label: 'Ohio' },
  { value: 'OK', label: 'Oklahoma' },
  { value: 'OR', label: 'Oregon' },
  { value: 'PA', label: 'Pennsylvania' },
  { value: 'RI', label: 'Rhode Island' },
  { value: 'SC', label: 'South Carolina' },
  { value: 'SD', label: 'South Dakota' },
  { value: 'TN', label: 'Tennessee' },
  { value: 'TX', label: 'Texas' },
  { value: 'UT', label: 'Utah' },
  { value: 'VT', label: 'Vermont' },
  { value: 'VA', label: 'Virginia' },
  { value: 'WA', label: 'Washington' },
  { value: 'WV', label: 'West Virginia' },
  { value: 'WI', label: 'Wisconsin' },
  { value: 'WY', label: 'Wyoming' }
];

const AddressInfo = ({ data, onUpdate, isLoading }) => {
  const [formData, setFormData] = useState(() => {
    const initialData = {
      streetAddress: '',
      city: '',
      state: '',
      zipCode: '',
      county: null,
      multipleCounties: [],
      ...data
    };
    
    // Ensure string fields are always strings
    initialData.streetAddress = String(initialData.streetAddress || '');
    initialData.city = String(initialData.city || '');
    initialData.state = String(initialData.state || '');
    initialData.zipCode = String(initialData.zipCode || '');
    
    return initialData;
  });

  const [validationErrors, setValidationErrors] = useState({});
  const [showCountyModal, setShowCountyModal] = useState(false);
  const [availableCounties, setAvailableCounties] = useState([]);
  const [zipValidationState, setZipValidationState] = useState(() => {
    // If we have a pre-filled ZIP code, start in validating state
    if (formData.zipCode && formData.zipCode.trim() !== '') {
      const zipNum = parseInt(formData.zipCode);
      if (!isNaN(zipNum) && zipNum >= 10000 && zipNum <= 99999) {
        return 'validating';
      }
    }
    return 'idle';
  });

  // Update form data when data prop changes (for edit mode)
  useEffect(() => {
    if (data && Object.keys(data).length > 0) {
      setFormData(prev => ({
        ...prev,
        streetAddress: String(data.streetAddress || ''),
        city: String(data.city || ''),
        state: String(data.state || ''),
        zipCode: String(data.zipCode || ''),
        county: data.county || null,
        multipleCounties: data.multipleCounties || []
      }));
    }
  }, [data]);
  
  // Cleanup timeout on unmount and ensure initial state
  useEffect(() => {
    // Force initial state to be idle if no ZIP code
    if (!formData.zipCode || formData.zipCode.trim() === '') {
      setZipValidationState('idle');
    }
    
    return () => {
      if (window.zipValidationTimeout) {
        clearTimeout(window.zipValidationTimeout);
      }
    };
  }, [formData.zipCode]);

  // Current ZIP code being validated
  const [validatingZipCode, setValidatingZipCode] = useState('');
  
  // Set validatingZipCode on mount if we have a pre-filled ZIP
  useEffect(() => {
    if (formData.zipCode && formData.zipCode.trim() !== '' && validatingZipCode === '') {
      const zipNum = parseInt(formData.zipCode);
      if (!isNaN(zipNum) && zipNum >= 10000 && zipNum <= 99999) {
        setValidatingZipCode(formData.zipCode);
      }
    }
  }, [formData.zipCode, validatingZipCode]);
  
  // Query for ZIP code validation
  const {
    data: zipResolution,
    isLoading: isValidatingZip,
    error: zipError,
    // refetch: validateZip
  } = useQuery({
    queryKey: ['zip-resolution', validatingZipCode], // Use the validating ZIP code
    queryFn: async () => {
      return await geographicService.resolveZip(validatingZipCode);
    },
    enabled: !!validatingZipCode, // Enable when we have a ZIP code to validate
    retry: false
  });

  // Handle ZIP code validation result
  useEffect(() => {
    if (zipResolution) {
      if (zipResolution.multipleCounties) {
        // Multiple counties - show selection modal
        setAvailableCounties(zipResolution.counties);
        setShowCountyModal(true);
        setZipValidationState('multiple');
      } else {
        // Single county - auto-select
        const county = zipResolution.county || zipResolution.counties[0];
        setFormData(prev => ({
          ...prev,
          county: county,
          multipleCounties: []
        }));
        setZipValidationState('valid');
      }
    }
  }, [zipResolution]);

  // Handle ZIP validation error
  useEffect(() => {
    if (zipError) {
      setZipValidationState('invalid');
      setValidationErrors(prev => ({
        ...prev,
        zipCode: 'ZIP code not found. Currently only Oregon ZIP codes (97xxx) are available in our database.'
      }));
    }
  }, [zipError]);

  // Handle ZIP loading state
  useEffect(() => {
    // Only set validating if we actually have a ZIP code to validate
    if (isValidatingZip && formData.zipCode && formData.zipCode.trim() !== '') {
      setZipValidationState('validating');
      setValidationErrors(prev => {
        const { zipCode, ...rest } = prev;
        return rest;
      });
    } else if (zipValidationState === 'validating' && !isValidatingZip) {
      // Query finished - if no result and no error, reset to idle
      if (!zipResolution && !zipError) {
        setZipValidationState('idle');
      }
    }
  }, [isValidatingZip, zipValidationState, zipResolution, zipError, formData.zipCode]);

  // Add timeout fallback for stuck validation
  useEffect(() => {
    let timeoutId;
    if (zipValidationState === 'validating') {
      timeoutId = setTimeout(() => {
        setZipValidationState('invalid');
        setValidationErrors(prev => ({
          ...prev,
          zipCode: 'ZIP code validation timed out. Please try a different ZIP code.'
        }));
      }, 10000); // 10 second timeout
    }

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
    };
  }, [zipValidationState]);

  // State to track if user has attempted to submit/proceed
  const [hasAttemptedSubmit, setHasAttemptedSubmit] = useState(false);

  // Form validation
  const validateForm = useCallback((forceValidation = false) => {
    const errors = {};

    // Only show validation errors if user has attempted to submit OR we're forcing validation
    if (hasAttemptedSubmit || forceValidation) {
      // Street address validation
      if (!String(formData.streetAddress || '').trim()) {
        errors.streetAddress = 'Street address is required';
      }

      // City validation
      if (!String(formData.city || '').trim()) {
        errors.city = 'City is required';
      }

      // State validation
      if (!formData.state) {
        errors.state = 'State is required';
      }

      // ZIP code validation
      if (!String(formData.zipCode || '').trim()) {
        errors.zipCode = 'ZIP code is required';
      } else {
        const zipNum = parseInt(formData.zipCode);
        if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
          errors.zipCode = 'ZIP code must be a valid 5-digit ZIP code';
        }
      }

      // County validation - only require if ZIP code validation succeeded
      if (zipValidationState === 'valid' && !formData.county) {
        errors.county = 'Please validate your ZIP code to select county';
      } else if (zipValidationState === 'multiple' && !formData.county) {
        errors.county = 'Please select a county from the available options';
      }
    } else {
      // Only validate specific field formats as user types (not required field validation)
      if (String(formData.zipCode || '').trim()) {
        const zipNum = parseInt(formData.zipCode);
        if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
          errors.zipCode = 'ZIP code must be a valid 5-digit ZIP code';
        }
      }
    }

    setValidationErrors(errors);
    return Object.keys(errors).length === 0 && zipValidationState !== 'invalid';
  }, [formData.streetAddress, formData.city, formData.state, formData.zipCode, formData.county, zipValidationState, hasAttemptedSubmit]); // Specific dependencies

  // Function to validate when user tries to proceed
  const validateAndProceed = useCallback(() => {
    setHasAttemptedSubmit(true);
    return validateForm(true);
  }, [formData, zipValidationState, hasAttemptedSubmit, validateForm]); // Fixed dependencies

  // Update parent component when form data changes (debounced)
  const updateTimeoutRef = useRef(null);
  
  useEffect(() => {
    // Clear any existing timeout
    if (updateTimeoutRef.current) {
      clearTimeout(updateTimeoutRef.current);
    }
    
    // Debounce the update to prevent excessive re-renders
    updateTimeoutRef.current = setTimeout(() => {
      const isValid = validateForm();
      if (onUpdate) {
        onUpdate(formData, isValid, validateAndProceed);
      }
    }, 300); // 300ms debounce
    
    // Cleanup timeout on unmount or when dependencies change
    return () => {
      if (updateTimeoutRef.current) {
        clearTimeout(updateTimeoutRef.current);
      }
    };
  }, [formData, validateForm, onUpdate, validateAndProceed]); // All dependencies included

  // Handle input changes
  const handleInputChange = (field, value) => {
    // Ensure we always store a string value
    const stringValue = typeof value === 'object' ? (value?.target?.value || '') : String(value || '');
    
    setFormData(prev => ({
      ...prev,
      [field]: stringValue
    }));

    // Clear specific validation error
    if (validationErrors[field]) {
      setValidationErrors(prev => {
        const { [field]: removed, ...rest } = prev;
        return rest;
      });
    }

    // Trigger ZIP validation when ZIP code changes
    if (field === 'zipCode') {
      // Clear any existing validation timeout
      if (window.zipValidationTimeout) {
        clearTimeout(window.zipValidationTimeout);
      }
      
      // Reset county data and validation state immediately
      setFormData(prev => ({
        ...prev,
        county: null,
        multipleCounties: []
      }));
      
      // Clear any ongoing validation
      setValidatingZipCode('');
      
      // Check if ZIP code is valid and trigger validation
      const zipNum = parseInt(stringValue);
      if (stringValue && stringValue.trim() !== '' && !isNaN(zipNum) && zipNum >= 10000 && zipNum <= 99999) {
        // Valid ZIP format, trigger validation after slight delay
        window.zipValidationTimeout = setTimeout(() => {
          // Use the stringValue parameter since formData might not be updated yet
          const zipToValidate = stringValue;
          const zipNumToValidate = parseInt(zipToValidate);
          if (zipToValidate && zipToValidate.trim() !== '' && !isNaN(zipNumToValidate) && zipNumToValidate >= 10000 && zipNumToValidate <= 99999) {
            setZipValidationState('validating');
            setValidatingZipCode(zipToValidate); // This will trigger the query
          }
        }, 500);
      } else {
        // Invalid or empty ZIP - reset state immediately
        setZipValidationState('idle');
      }
    }
  };

  // Handle county selection from modal
  const handleCountySelection = (selectedCounty) => {
    setFormData(prev => ({
      ...prev,
      county: selectedCounty,
      multipleCounties: availableCounties
    }));
    setShowCountyModal(false);
    setZipValidationState('valid');
  };

  // Get ZIP validation status message
  const getZipStatusMessage = () => {
    switch (zipValidationState) {
      case 'validating':
        return { type: 'info', text: 'Validating ZIP code...' };
      case 'valid':
        return { 
          type: 'success', 
          text: `Valid ZIP code. County: ${formData.county?.name || 'Selected'}` 
        };
      case 'multiple':
        return { 
          type: 'warning', 
          text: 'Multiple counties available. Please select one.' 
        };
      case 'invalid':
        return { type: 'error', text: 'Invalid ZIP code or not available in our system' };
      default:
        return null;
    }
  };

  const zipStatus = getZipStatusMessage();

  return (
    <div className="address-info">
      <div className="address-info-header">
        <h2>Address Information</h2>
        <p>Enter your organization's primary business address</p>
      </div>

      <div className="address-form">
        {/* Street Address */}
        <div className="form-group">
          <FormInput
            label="Street Address"
            placeholder="123 Main Street"
            value={String(formData.streetAddress || '')}
            onChange={(value) => handleInputChange('streetAddress', value)}
            error={validationErrors.streetAddress}
            disabled={isLoading}
            required
          />
        </div>

        {/* City and State Row */}
        <div className="form-row">
          <div className="form-group">
            <FormInput
              label="City"
              placeholder="Anytown"
              value={String(formData.city || '')}
              onChange={(value) => handleInputChange('city', value)}
              error={validationErrors.city}
              disabled={isLoading}
              required
            />
          </div>

          <div className="form-group">
            <Select
              label="State"
              placeholder="Select state"
              options={US_STATES}
              value={formData.state}
              onChange={(value) => handleInputChange('state', value)}
              error={validationErrors.state}
              disabled={isLoading}
              required
            />
          </div>
        </div>

        {/* ZIP Code */}
        <div className="form-group">
          <FormInput
            label="ZIP Code"
            placeholder="Enter 5-digit ZIP code"
            value={String(formData.zipCode || '')}
            onChange={(value) => handleInputChange('zipCode', value)}
            error={validationErrors.zipCode}
            disabled={isLoading}
            required
            type="number"
            min="10000"
            max="99999"
          />
          
          {/* ZIP Code Helper Text */}
          <div className="zip-helper-text">
            <p>
              <strong>Note:</strong> Enter a valid 5-digit US ZIP code to find available insurance plans in your area.
            </p>
          </div>

          {/* ZIP Validation Status */}
          {zipStatus && (
            <div className={`zip-status ${zipStatus.type}`}>
              {zipValidationState === 'validating' && <ZipValidationLoader />}
              <span>{zipStatus.text}</span>
            </div>
          )}
        </div>

        {/* County Information (Read-only display) */}
        {formData.county && (
          <div className="form-group">
            <div className="county-display">
              <label>Selected County</label>
              <div className="county-info">
                <div className="county-name">{formData.county.name}</div>
                <div className="county-details">
                  State: {formData.county.stateId} | 
                  Available Plans: {formData.county.availablePlans || 0}
                  {formData.multipleCounties.length > 1 && (
                    <button
                      type="button"
                      className="change-county-btn"
                      onClick={() => setShowCountyModal(true)}
                      disabled={isLoading}
                    >
                      Change County
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* County Selection Modal */}
      <CountySelectionModal
        isOpen={showCountyModal}
        onClose={() => setShowCountyModal(false)}
        onSelect={handleCountySelection}
        counties={availableCounties}
        zipCode={formData.zipCode}
        isLoading={isValidatingZip}
      />

      {/* General Error Display */}
      {Object.keys(validationErrors).length > 0 && zipValidationState !== 'validating' && (
        <ErrorMessage 
          message="Please correct the errors above to continue"
          details={Object.values(validationErrors)}
        />
      )}
    </div>
  );
};

export default AddressInfo; 