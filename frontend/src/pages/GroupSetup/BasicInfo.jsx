// Basic group info form
import React, { useState, useEffect } from 'react';
import Input from '../../components/common/Input';
import ErrorMessage from '../../components/common/ErrorMessage';
import { validateGroupBasicInfo } from '../../utils/validators';

const BasicInfo = ({ data, onUpdate, isLoading }) => {
  
  const [formData, setFormData] = useState({
    name: data?.name || '',
    effectiveDate: data?.effectiveDate || '',
    employeeCount: data?.employeeCount || '',
    description: data?.description || ''
  });
  
  // Update form data when data prop changes (for edit mode)
  useEffect(() => {
    if (data && (data.name || data.effectiveDate || data.employeeCount || data.description)) {
      const newFormData = {
        name: data.name || '',
        effectiveDate: data.effectiveDate ? data.effectiveDate.split('T')[0] : '',
        employeeCount: data.employeeCount || '',
        description: data.description || ''
      };
      setFormData(newFormData);
    }
  }, [data]);

  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  // Validate form data whenever it changes
  useEffect(() => {
    const validation = validateGroupBasicInfo(formData);
    setErrors(validation.errors);
    
    // Update parent component with data and validation status
    if (onUpdate) {
      // Only pass the data fields, not the entire object to prevent reference changes
      onUpdate({
        name: formData.name,
        effectiveDate: formData.effectiveDate,
        employeeCount: formData.employeeCount,
        description: formData.description
      }, validation.isValid);
    }
  }, [formData.name, formData.effectiveDate, formData.employeeCount, formData.description, onUpdate]);

  // Handle input changes
  const handleChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Mark field as touched
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Handle field blur events
  const handleBlur = (field) => {
    setTouched(prev => ({
      ...prev,
      [field]: true
    }));
  };

  // Generate default effective date (first of next month)
  // const getDefaultEffectiveDate = () => {
  //   const now = new Date();
  //   const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1);
  //   return nextMonth.toISOString().split('T')[0];
  // };

  // Generate list of valid effective dates (first of each month for next 12 months)
  const getValidEffectiveDates = () => {
    const dates = [];
    const now = new Date();
    
    for (let i = 0; i < 12; i++) {
      const date = new Date(now.getFullYear(), now.getMonth() + i, 1);
      dates.push({
        value: date.toISOString().split('T')[0],
        label: date.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })
      });
    }
    
    return dates;
  };

  
  return (
    <div className="basic-info-form">
      <div className="form-header">
        <h2>Basic Group Information</h2>
        <p>Enter your organization's basic details to get started.</p>
      </div>

      <div className="form-content">
        <div className="form-row">
          <div className="form-group">
            <label htmlFor="groupName" className="form-label required">
              Group Name
            </label>
            <Input
              id="groupName"
              type="text"
              value={formData.name}
              onChange={(e) => handleChange('name', e.target.value)}
              onBlur={() => handleBlur('name')}
              placeholder="Enter your organization name"
              disabled={isLoading}
              error={touched.name && errors.name}
              maxLength={100}
            />
            {touched.name && errors.name && (
              <ErrorMessage message={errors.name} />
            )}
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="effectiveDate" className="form-label required">
              Effective Date
            </label>
            <select
              id="effectiveDate"
              className={`form-select ${touched.effectiveDate && errors.effectiveDate ? 'error' : ''}`}
              value={formData.effectiveDate}
              onChange={(e) => handleChange('effectiveDate', e.target.value)}
              onBlur={() => handleBlur('effectiveDate')}
              disabled={isLoading}
            >
              <option value="">Select effective date</option>
              {getValidEffectiveDates().map(date => (
                <option key={date.value} value={date.value}>
                  {date.label} (1st)
                </option>
              ))}
            </select>
            {touched.effectiveDate && errors.effectiveDate && (
              <ErrorMessage message={errors.effectiveDate} />
            )}
            <small className="form-help">
              ICHRA coverage must begin on the 1st of the month. Select the month when coverage will start.
            </small>
          </div>

          <div className="form-group">
            <label htmlFor="employeeCount" className="form-label required">
              Number of Employees
            </label>
            <Input
              id="employeeCount"
              type="number"
              value={formData.employeeCount}
              onChange={(e) => handleChange('employeeCount', e.target.value)}
              onBlur={() => handleBlur('employeeCount')}
              placeholder="0"
              disabled={isLoading}
              error={touched.employeeCount && errors.employeeCount}
              min="1"
              max="10000"
            />
            {touched.employeeCount && errors.employeeCount && (
              <ErrorMessage message={errors.employeeCount} />
            )}
            <small className="form-help">
              Estimated number of employees eligible for ICHRA
            </small>
          </div>
        </div>

        <div className="form-row">
          <div className="form-group">
            <label htmlFor="description" className="form-label">
              Description (Optional)
            </label>
            <textarea
              id="description"
              value={formData.description}
              onChange={(e) => handleChange('description', e.target.value)}
              onBlur={() => handleBlur('description')}
              placeholder="Brief description of your organization or ICHRA plan"
              disabled={isLoading}
              className="form-textarea"
              rows={3}
              maxLength={500}
            />
            <small className="form-help">
              {formData.description.length}/500 characters
            </small>
          </div>
        </div>

        <div className="form-info">
          <div className="info-card">
            <h4>What is ICHRA?</h4>
            <p>
              Individual Coverage Health Reimbursement Arrangement (ICHRA) allows employers 
              to reimburse employees for individual health insurance premiums and medical expenses. 
              This gives employees more choice while providing employers with predictable costs.
            </p>
          </div>

          <div className="info-card">
            <h4>Getting Started</h4>
            <ul>
              <li>Enter your organization's basic information</li>
              <li>Set up your address and location details</li>
              <li>Define employee classes and contribution amounts</li>
              <li>Add your employees and generate quotes</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BasicInfo; 