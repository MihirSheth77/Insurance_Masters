// Member form
import React, { useState, useEffect } from 'react';
import Input from '../common/Input';
import Select from '../common/Select';
import Button from '../common/Button';
import ErrorMessage from '../common/ErrorMessage';
import { validateMember } from '../../utils/validators';
import formatters from '../../utils/formatters';
import './MemberForm.css';

const MemberForm = ({
  member = null,
  classes = [],
  onSubmit,
  onCancel,
  isLoading = false,
  className = ''
}) => {
  const [formData, setFormData] = useState({
    classId: '',
    personalInfo: {
      firstName: '',
      lastName: '',
      dateOfBirth: '',
      zipCode: '',
      tobacco: false,
      householdIncome: '',
      familySize: 1
    },
    previousContributions: {
      employerContribution: '',
      memberContribution: '',
      planName: '',
      planType: 'Other',
      metalLevel: 'Other',
      carrier: ''
    },
    dependents: []
  });

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Initialize form data when member prop changes
  useEffect(() => {
    if (member) {
      // Ensure we use the proper ObjectId for classId
      const memberClassId = member.classId || member.class?.classId || member.class?.id || member.class?._id || '';
      console.log('Initializing form with member:', { 
        member, 
        extractedClassId: memberClassId,
        classObject: member.class 
      });
      
      setFormData({
        classId: memberClassId,
        personalInfo: {
          firstName: member.personalInfo?.firstName || '',
          lastName: member.personalInfo?.lastName || '',
          dateOfBirth: member.personalInfo?.dateOfBirth || '',
          zipCode: member.personalInfo?.zipCode || '',
          tobacco: member.personalInfo?.tobacco || false,
          householdIncome: member.personalInfo?.householdIncome || '',
          familySize: member.personalInfo?.familySize || 1
        },
        previousContributions: {
          employerContribution: member.previousContributions?.employerContribution || '',
          memberContribution: member.previousContributions?.memberContribution || '',
          planName: member.previousContributions?.planName || '',
          planType: member.previousContributions?.planType || 'Other',
          metalLevel: member.previousContributions?.metalLevel || 'Other',
          carrier: member.previousContributions?.carrier || ''
        },
        dependents: member.dependents || []
      });
    } else {
      // For new members, ensure classId starts empty
      console.log('Initializing form for new member');
      setFormData(prev => ({
        ...prev,
        classId: '' // Force user to select from dropdown
      }));
    }
  }, [member]);

  // Validate form when data changes
  useEffect(() => {
    const validation = validateMember(formData);
    setErrors(validation.errors);
  }, [formData]);

  const handleInputChange = (field, value, section = null) => {
    setFormData(prev => {
      if (section) {
        return {
          ...prev,
          [section]: {
            ...prev[section],
            [field]: value
          }
        };
      }
      return {
        ...prev,
        [field]: value
      };
    });

    // Mark field as touched
    const touchedKey = section ? `${section}.${field}` : field;
    setTouched(prev => ({
      ...prev,
      [touchedKey]: true
    }));
  };

  const handleDependentChange = (index, field, value) => {
    setFormData(prev => ({
      ...prev,
      dependents: prev.dependents.map((dep, i) => 
        i === index ? { ...dep, [field]: value } : dep
      )
    }));
  };

  const addDependent = () => {
    setFormData(prev => ({
      ...prev,
      dependents: [
        ...prev.dependents,
        {
          firstName: '',
          lastName: '',
          dateOfBirth: '',
          relationship: 'child'
        }
      ]
    }));
  };

  const removeDependent = (index) => {
    setFormData(prev => ({
      ...prev,
      dependents: prev.dependents.filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    
    // Validate all fields
    const validation = validateMember(formData);
    setErrors(validation.errors);

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(validation.errors).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    console.log('Form validation result:', {
      isValid: validation.isValid,
      errors: validation.errors,
      formData: formData
    });

    if (validation.isValid && onSubmit) {
      console.log('Submitting member form with data:', {
        classId: formData.classId,
        personalInfo: formData.personalInfo,
        availableClasses: classes.map(c => ({ 
          id: c.classId || c.id || c._id, 
          name: c.name 
        }))
      });
      onSubmit(formData);
    } else {
      console.log('Form validation failed:', validation.errors);
    }
  };

  const planTypeOptions = [
    { value: 'HMO', label: 'HMO' },
    { value: 'PPO', label: 'PPO' },
    { value: 'EPO', label: 'EPO' },
    { value: 'POS', label: 'POS' },
    { value: 'HDHP', label: 'High Deductible Health Plan' },
    { value: 'Other', label: 'Other' }
  ];

  const metalLevelOptions = [
    { value: 'Bronze', label: 'Bronze' },
    { value: 'Silver', label: 'Silver' },
    { value: 'Gold', label: 'Gold' },
    { value: 'Platinum', label: 'Platinum' },
    { value: 'Catastrophic', label: 'Catastrophic' },
    { value: 'Other', label: 'Other' }
  ];

  const relationshipOptions = [
    { value: 'spouse', label: 'Spouse' },
    { value: 'child', label: 'Child' },
    { value: 'domestic_partner', label: 'Domestic Partner' },
    { value: 'other', label: 'Other' }
  ];

  return (
    <form onSubmit={handleSubmit} className={`member-form ${className}`.trim()}>
      <div className="form-section">
        <h3>Basic Information</h3>
        
        <div className="form-row single-column">
          <div className="form-group">
            <label htmlFor="classId" className="form-label required">
              ICHRA Class
            </label>
            <Select
              id="classId"
              value={formData.classId}
              onChange={(e) => {
                console.log('Class selected:', {
                  selectedValue: e.target.value,
                  selectedClass: classes.find(c => (c.classId || c.id || c._id) === e.target.value),
                  allClasses: classes
                });
                handleInputChange('classId', e.target.value);
              }}
              options={classes.map(c => {
                const classId = c.classId || c.id || c._id;
                console.log('Mapping class:', { class: c, extractedId: classId });
                return { 
                  value: classId, 
                  label: `${c.name} (${formatters.formatStatus(c.type)})` 
                };
              })}
              placeholder="Select ICHRA class..."
              error={touched.classId && errors.classId}
              disabled={isLoading}
              required
            />
            {touched.classId && errors.classId && (
              <ErrorMessage message={errors.classId} />
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="firstName" className="form-label required">
              First Name
            </label>
            <Input
              id="firstName"
              type="text"
              value={formData.personalInfo.firstName}
              onChange={(e) => handleInputChange('firstName', e.target.value, 'personalInfo')}
              placeholder="Enter first name"
              error={touched['personalInfo.firstName'] && errors.firstName}
              disabled={isLoading}
              required
              maxLength={50}
            />
            {touched['personalInfo.firstName'] && errors.firstName && (
              <ErrorMessage message={errors.firstName} />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="lastName" className="form-label required">
              Last Name
            </label>
            <Input
              id="lastName"
              type="text"
              value={formData.personalInfo.lastName}
              onChange={(e) => handleInputChange('lastName', e.target.value, 'personalInfo')}
              placeholder="Enter last name"
              error={touched['personalInfo.lastName'] && errors.lastName}
              disabled={isLoading}
              required
              maxLength={50}
            />
            {touched['personalInfo.lastName'] && errors.lastName && (
              <ErrorMessage message={errors.lastName} />
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="dateOfBirth" className="form-label required">
              Date of Birth
            </label>
            <Input
              id="dateOfBirth"
              type="date"
              value={formData.personalInfo.dateOfBirth}
              onChange={(e) => handleInputChange('dateOfBirth', e.target.value, 'personalInfo')}
              error={touched['personalInfo.dateOfBirth'] && errors.dateOfBirth}
              disabled={isLoading}
              required
              max={new Date().toISOString().split('T')[0]}
            />
            {touched['personalInfo.dateOfBirth'] && errors.dateOfBirth && (
              <ErrorMessage message={errors.dateOfBirth} />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="zipCode" className="form-label required">
              ZIP Code
            </label>
            <Input
              id="zipCode"
              type="number"
              value={formData.personalInfo.zipCode}
              onChange={(e) => handleInputChange('zipCode', e.target.value, 'personalInfo')}
              placeholder="Enter 5-digit ZIP code"
              error={touched['personalInfo.zipCode'] && errors.zipCode}
              disabled={isLoading}
              required
              min="10000"
              max="99999"
            />
            {touched['personalInfo.zipCode'] && errors.zipCode && (
              <ErrorMessage message={errors.zipCode} />
            )}
            <small className="form-help">Valid 5-digit US ZIP codes supported</small>
          </div>
        </div>

        <div className="form-row single-column">
          <div className="form-group">
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={formData.personalInfo.tobacco}
                onChange={(e) => handleInputChange('tobacco', e.target.checked, 'personalInfo')}
                disabled={isLoading}
              />
              Tobacco User
            </label>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="householdIncome" className="form-label required">
              Household Income
            </label>
            <Input
              id="householdIncome"
              type="number"
              value={formData.personalInfo.householdIncome}
              onChange={(e) => handleInputChange('householdIncome', e.target.value, 'personalInfo')}
              placeholder="Enter annual household income"
              error={touched['personalInfo.householdIncome'] && errors.householdIncome}
              disabled={isLoading}
              required
              min="0"
              max="999999"
              step="1000"
            />
            {touched['personalInfo.householdIncome'] && errors.householdIncome && (
              <ErrorMessage message={errors.householdIncome} />
            )}
            <small className="form-help">Annual gross household income before taxes</small>
          </div>

          <div className="form-group">
            <label htmlFor="familySize" className="form-label required">
              Family Size
            </label>
            <Select
              id="familySize"
              value={formData.personalInfo.familySize}
              onChange={(e) => handleInputChange('familySize', parseInt(e.target.value), 'personalInfo')}
              options={[
                { value: 1, label: '1 person' },
                { value: 2, label: '2 people' },
                { value: 3, label: '3 people' },
                { value: 4, label: '4 people' },
                { value: 5, label: '5 people' },
                { value: 6, label: '6 people' },
                { value: 7, label: '7 people' },
                { value: 8, label: '8+ people' }
              ]}
              error={touched['personalInfo.familySize'] && errors.familySize}
              disabled={isLoading}
              required
            />
            {touched['personalInfo.familySize'] && errors.familySize && (
              <ErrorMessage message={errors.familySize} />
            )}
            <small className="form-help">Total number of people in the household including dependents</small>
          </div>
        </div>
      </div>

      <div className="form-section">
        <h3>Previous Health Plan Information</h3>
        
        <div className="form-row single-column">
          <div className="form-group">
            <label htmlFor="planName" className="form-label required">
              Previous Plan Name
            </label>
            <Input
              id="planName"
              type="text"
              value={formData.previousContributions.planName}
              onChange={(e) => handleInputChange('planName', e.target.value, 'previousContributions')}
              placeholder="Enter previous plan name"
              error={touched['previousContributions.planName'] && errors.planName}
              disabled={isLoading}
              required
              maxLength={100}
            />
            {touched['previousContributions.planName'] && errors.planName && (
              <ErrorMessage message={errors.planName} />
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="planType" className="form-label">
              Plan Type
            </label>
            <Select
              id="planType"
              value={formData.previousContributions.planType}
              onChange={(e) => handleInputChange('planType', e.target.value, 'previousContributions')}
              options={planTypeOptions}
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="metalLevel" className="form-label">
              Metal Level
            </label>
            <Select
              id="metalLevel"
              value={formData.previousContributions.metalLevel}
              onChange={(e) => handleInputChange('metalLevel', e.target.value, 'previousContributions')}
              options={metalLevelOptions}
              disabled={isLoading}
            />
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="employerContribution" className="form-label required">
              Previous Employer Contribution (Monthly)
            </label>
            <Input
              id="employerContribution"
              type="number"
              value={formData.previousContributions.employerContribution}
              onChange={(e) => handleInputChange('employerContribution', e.target.value, 'previousContributions')}
              placeholder="0.00"
              error={touched['previousContributions.employerContribution'] && errors.employerContribution}
              disabled={isLoading}
              required
              min="0"
              max="10000"
              step="0.01"
            />
            {touched['previousContributions.employerContribution'] && errors.employerContribution && (
              <ErrorMessage message={errors.employerContribution} />
            )}
          </div>

          <div className="form-group">
            <label htmlFor="memberContribution" className="form-label required">
              Previous Employee Contribution (Monthly)
            </label>
            <Input
              id="memberContribution"
              type="number"
              value={formData.previousContributions.memberContribution}
              onChange={(e) => handleInputChange('memberContribution', e.target.value, 'previousContributions')}
              placeholder="0.00"
              error={touched['previousContributions.memberContribution'] && errors.memberContribution}
              disabled={isLoading}
              required
              min="0"
              max="10000"
              step="0.01"
            />
            {touched['previousContributions.memberContribution'] && errors.memberContribution && (
              <ErrorMessage message={errors.memberContribution} />
            )}
          </div>
        </div>
      </div>

      <div className="form-section">
        <div className="section-header">
          <h3>Dependents</h3>
          <Button
            type="button"
            variant="outline"
            size="small"
            onClick={addDependent}
            disabled={isLoading}
          >
            Add Dependent
          </Button>
        </div>

        {formData.dependents.map((dependent, index) => (
          <div key={index} className="dependent-form">
            <div className="dependent-header">
              <h4>Dependent {index + 1}</h4>
              <Button
                type="button"
                variant="danger"
                size="small"
                onClick={() => removeDependent(index)}
                disabled={isLoading}
              >
                Remove
              </Button>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`dependent-firstName-${index}`} className="form-label required">
                  First Name
                </label>
                <Input
                  id={`dependent-firstName-${index}`}
                  type="text"
                  value={dependent.firstName}
                  onChange={(e) => handleDependentChange(index, 'firstName', e.target.value)}
                  placeholder="Enter first name"
                  disabled={isLoading}
                  required
                  maxLength={50}
                />
              </div>

              <div className="form-group">
                <label htmlFor={`dependent-lastName-${index}`} className="form-label required">
                  Last Name
                </label>
                <Input
                  id={`dependent-lastName-${index}`}
                  type="text"
                  value={dependent.lastName}
                  onChange={(e) => handleDependentChange(index, 'lastName', e.target.value)}
                  placeholder="Enter last name"
                  disabled={isLoading}
                  required
                  maxLength={50}
                />
              </div>
            </div>

            <div className="form-row">
              <div className="form-group">
                <label htmlFor={`dependent-dateOfBirth-${index}`} className="form-label required">
                  Date of Birth
                </label>
                <Input
                  id={`dependent-dateOfBirth-${index}`}
                  type="date"
                  value={dependent.dateOfBirth}
                  onChange={(e) => handleDependentChange(index, 'dateOfBirth', e.target.value)}
                  disabled={isLoading}
                  required
                  max={new Date().toISOString().split('T')[0]}
                />
              </div>

              <div className="form-group">
                <label htmlFor={`dependent-relationship-${index}`} className="form-label required">
                  Relationship
                </label>
                <Select
                  id={`dependent-relationship-${index}`}
                  value={dependent.relationship}
                  onChange={(e) => handleDependentChange(index, 'relationship', e.target.value)}
                  options={relationshipOptions}
                  disabled={isLoading}
                  required
                />
              </div>
            </div>
          </div>
        ))}

        {formData.dependents.length === 0 && (
          <div className="no-dependents">
            <p>No dependents added. Click "Add Dependent" to include family members.</p>
          </div>
        )}
      </div>

      <div className="form-actions">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          disabled={isLoading || Object.keys(errors).length > 0}
        >
          {member ? 'Update Member' : 'Create Member'}
        </Button>
      </div>
    </form>
  );
};

export default MemberForm; 