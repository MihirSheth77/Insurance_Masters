import React, { useState } from 'react';
import Button from '../common/Button';
import './ClassForm.css';

const ClassForm = ({ 
  initialData = {}, 
  onSubmit, 
  onCancel, 
  isLoading = false, 
  errors = {}, 
  isEditing = false 
}) => {
  const [formData, setFormData] = useState({
    name: '',
    type: 'full-time',
    employeeContribution: '',
    dependentContribution: '',
    criteria: {},
    ...initialData
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...formData,
      employeeContribution: parseFloat(formData.employeeContribution) || 0,
      dependentContribution: parseFloat(formData.dependentContribution) || 0
    });
  };

  return (
    <form onSubmit={handleSubmit} className="class-form">
      <div className="form-section">
        <h3>Basic Information</h3>
        
        <div className="form-group">
          <label htmlFor="name">Class Name *</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            placeholder="e.g., Full-Time Employees"
            required
            disabled={isLoading}
          />
          {errors.name && <span className="error-text">{errors.name}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="type">Class Type *</label>
          <select
            id="type"
            name="type"
            value={formData.type}
            onChange={handleChange}
            required
            disabled={isLoading}
          >
            <option value="full-time">Full-Time</option>
            <option value="part-time">Part-Time</option>
            <option value="seasonal">Seasonal</option>
            <option value="salaried">Salaried</option>
            <option value="hourly">Hourly</option>
            <option value="other">Other</option>
          </select>
          {errors.type && <span className="error-text">{errors.type}</span>}
        </div>
      </div>

      <div className="form-section">
        <h3>Contribution Settings</h3>
        
        <div className="form-group">
          <label htmlFor="employeeContribution">Employee Monthly Contribution ($) *</label>
          <input
            type="number"
            id="employeeContribution"
            name="employeeContribution"
            value={formData.employeeContribution}
            onChange={handleChange}
            placeholder="500"
            min="0"
            step="0.01"
            required
            disabled={isLoading}
          />
          {errors.employeeContribution && <span className="error-text">{errors.employeeContribution}</span>}
        </div>

        <div className="form-group">
          <label htmlFor="dependentContribution">Dependent Monthly Contribution ($) *</label>
          <input
            type="number"
            id="dependentContribution"
            name="dependentContribution"
            value={formData.dependentContribution}
            onChange={handleChange}
            placeholder="250"
            min="0"
            step="0.01"
            required
            disabled={isLoading}
          />
          {errors.dependentContribution && <span className="error-text">{errors.dependentContribution}</span>}
        </div>
      </div>


      {errors.submit && (
        <div className="form-error">
          <span className="error-text">{errors.submit}</span>
        </div>
      )}

      <div className="form-actions">
        <Button
          type="button"
          variant="secondary"
          onClick={onCancel}
          disabled={isLoading}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          variant="primary"
          loading={isLoading}
          disabled={isLoading}
        >
          {isEditing ? 'Update Class' : 'Create Class'}
        </Button>
      </div>
    </form>
  );
};

export default ClassForm; 