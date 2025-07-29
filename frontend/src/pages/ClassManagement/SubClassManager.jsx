import React, { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';

// Components
import FormInput from '../../components/common/FormInput';
import Button from '../../components/common/Button';
import ErrorMessage from '../../components/common/ErrorMessage';
import Tooltip, { ICHRATooltips } from '../../components/common/Tooltip';

// Services
import { classService } from '../../services/classService';

// Styles
import './SubClassManager.css';

const SubClassManager = ({ parentClass, groupId, onClose, onUpdate }) => {
  const queryClient = useQueryClient();

  // State for age ranges
  const [ageRanges, setAgeRanges] = useState([]);
  const [newRange, setNewRange] = useState({
    minAge: '',
    maxAge: '',
    employeeContribution: '',
    dependentContribution: ''
  });
  const [validationErrors, setValidationErrors] = useState({});
  const [rangeErrors, setRangeErrors] = useState([]);

  // Initialize with existing age-based contributions
  useEffect(() => {
    if (parentClass?.ageBasedContributions && parentClass.ageBasedContributions.length > 0) {
      setAgeRanges(parentClass.ageBasedContributions.map((range, index) => ({
        id: index,
        minAge: range.minAge,
        maxAge: range.maxAge,
        employeeContribution: range.employeeContribution,
        dependentContribution: range.dependentContribution
      })));
    }
  }, [parentClass]);

  // Create/Update sub-classes mutation
  const updateSubClassesMutation = useMutation({
    mutationFn: (ageBasedContributions) => 
      classService.createSubClasses(groupId, parentClass.classId, { ageBasedContributions }),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes', groupId]);
      onUpdate();
      onClose();
    },
    onError: (error) => {
      setValidationErrors({ submit: error.message || 'Failed to update sub-classes' });
    }
  });

  // Validate age range
  const validateAgeRange = (range, index, allRanges) => {
    const errors = {};

    // Validate age values
    if (!range.minAge || isNaN(range.minAge) || range.minAge < 18 || range.minAge > 99) {
      errors.minAge = 'Minimum age must be between 18 and 99';
    }

    if (!range.maxAge || isNaN(range.maxAge) || range.maxAge < 18 || range.maxAge > 99) {
      errors.maxAge = 'Maximum age must be between 18 and 99';
    }

    if (range.minAge && range.maxAge && parseInt(range.minAge) >= parseInt(range.maxAge)) {
      errors.maxAge = 'Maximum age must be greater than minimum age';
    }

    // Validate contribution amounts
    if (!range.employeeContribution || isNaN(range.employeeContribution) || range.employeeContribution < 0) {
      errors.employeeContribution = 'Employee contribution must be a positive number';
    }

    if (!range.dependentContribution || isNaN(range.dependentContribution) || range.dependentContribution < 0) {
      errors.dependentContribution = 'Dependent contribution must be a positive number';
    }

    // Check for overlapping ranges
    const currentMin = parseInt(range.minAge);
    const currentMax = parseInt(range.maxAge);

    if (!isNaN(currentMin) && !isNaN(currentMax)) {
      for (let i = 0; i < allRanges.length; i++) {
        if (i === index) continue; // Skip self

        const otherRange = allRanges[i];
        const otherMin = parseInt(otherRange.minAge);
        const otherMax = parseInt(otherRange.maxAge);

        if (!isNaN(otherMin) && !isNaN(otherMax)) {
          // Check for overlap
          if ((currentMin <= otherMax && currentMax >= otherMin)) {
            errors.overlap = `Age range overlaps with range ${i + 1} (${otherMin}-${otherMax})`;
            break;
          }
        }
      }
    }

    return errors;
  };

  // Validate all ranges
  const validateAllRanges = (ranges) => {
    const allErrors = ranges.map((range, index) => validateAgeRange(range, index, ranges));
    setRangeErrors(allErrors);
    return allErrors.every(errors => Object.keys(errors).length === 0);
  };

  // Add new age range
  const addAgeRange = () => {
    const errors = validateAgeRange(newRange, ageRanges.length, [...ageRanges, newRange]);
    
    if (Object.keys(errors).length > 0) {
      setValidationErrors(errors);
      return;
    }

    const newRangeWithId = {
      ...newRange,
      id: Date.now(),
      minAge: parseInt(newRange.minAge),
      maxAge: parseInt(newRange.maxAge),
      employeeContribution: parseFloat(newRange.employeeContribution),
      dependentContribution: parseFloat(newRange.dependentContribution)
    };

    const updatedRanges = [...ageRanges, newRangeWithId];
    setAgeRanges(updatedRanges);
    setNewRange({
      minAge: '',
      maxAge: '',
      employeeContribution: '',
      dependentContribution: ''
    });
    setValidationErrors({});
    validateAllRanges(updatedRanges);
  };

  // Remove age range
  const removeAgeRange = (id) => {
    const updatedRanges = ageRanges.filter(range => range.id !== id);
    setAgeRanges(updatedRanges);
    validateAllRanges(updatedRanges);
  };

  // Update existing range
  const updateAgeRange = (id, field, value) => {
    const updatedRanges = ageRanges.map(range => {
      if (range.id === id) {
        return { ...range, [field]: value };
      }
      return range;
    });
    setAgeRanges(updatedRanges);
    validateAllRanges(updatedRanges);
  };

  // Handle save
  const handleSave = () => {
    if (ageRanges.length === 0) {
      setValidationErrors({ submit: 'At least one age range is required' });
      return;
    }

    const isValid = validateAllRanges(ageRanges);
    if (!isValid) {
      setValidationErrors({ submit: 'Please fix all validation errors before saving' });
      return;
    }

    // Convert ranges for API
    const ageBasedContributions = ageRanges.map(range => ({
      minAge: parseInt(range.minAge),
      maxAge: parseInt(range.maxAge),
      employeeContribution: parseFloat(range.employeeContribution),
      dependentContribution: parseFloat(range.dependentContribution)
    }));

    setValidationErrors({});
    updateSubClassesMutation.mutate(ageBasedContributions);
  };

  // Generate age coverage visualization
  const generateAgeVisualization = () => {
    const minPossibleAge = 18;
    const maxPossibleAge = 99;
    const totalAges = maxPossibleAge - minPossibleAge + 1;
    
    const coverage = Array(totalAges).fill(null);
    
    ageRanges.forEach((range, rangeIndex) => {
      const minAge = parseInt(range.minAge);
      const maxAge = parseInt(range.maxAge);
      
      if (!isNaN(minAge) && !isNaN(maxAge)) {
        for (let age = minAge; age <= maxAge; age++) {
          const index = age - minPossibleAge;
          if (index >= 0 && index < totalAges) {
            coverage[index] = rangeIndex;
          }
        }
      }
    });

    return { coverage, minPossibleAge, maxPossibleAge };
  };

  const { coverage, minPossibleAge, maxPossibleAge } = generateAgeVisualization();

  return (
    <div className="sub-class-manager">
      <div className="sub-class-header">
        <h3>
          Age-Based Sub-Classes
          <Tooltip content={ICHRATooltips.ageBasedContribution} position="right" />
        </h3>
        <p>
          Define different contribution amounts based on employee age ranges for the 
          <strong> {parentClass.name}</strong> class.
        </p>
      </div>

      {/* Age Coverage Visualization */}
      <div className="age-visualization">
        <h4>Age Coverage Overview</h4>
        <div className="age-timeline">
          <div className="age-labels">
            <span>{minPossibleAge}</span>
            <span>{Math.floor((minPossibleAge + maxPossibleAge) / 2)}</span>
            <span>{maxPossibleAge}</span>
          </div>
          <div className="age-coverage">
            {coverage.map((rangeIndex, index) => {
              const age = index + minPossibleAge;
              const isDecade = age % 10 === 0;
              return (
                <div
                  key={age}
                  className={`age-block ${rangeIndex !== null ? 'covered' : 'uncovered'} ${isDecade ? 'decade' : ''}`}
                  style={{
                    backgroundColor: rangeIndex !== null ? 
                      `hsl(${(rangeIndex * 60) % 360}, 60%, 70%)` : 
                      '#f0f0f0'
                  }}
                  title={`Age ${age}${rangeIndex !== null ? ` - Range ${rangeIndex + 1}` : ' - Not covered'}`}
                />
              );
            })}
          </div>
          <div className="coverage-legend">
            <span className="legend-item">
              <div className="legend-color covered"></div>
              Covered Ages
            </span>
            <span className="legend-item">
              <div className="legend-color uncovered"></div>
              Uncovered Ages
            </span>
          </div>
        </div>
      </div>

      {/* Existing Age Ranges */}
      {ageRanges.length > 0 && (
        <div className="existing-ranges">
          <h4>Current Age Ranges</h4>
          <div className="ranges-list">
            {ageRanges.map((range, index) => (
              <div key={range.id} className="range-item">
                <div className="range-header">
                  <h5>Range {index + 1}</h5>
                  <Button
                    variant="danger"
                    size="small"
                    onClick={() => removeAgeRange(range.id)}
                    disabled={updateSubClassesMutation.isPending}
                  >
                    Remove
                  </Button>
                </div>
                
                <div className="range-form">
                  <div className="form-row">
                    <FormInput
                      label="Min Age"
                      type="number"
                      min="18"
                      max="99"
                      value={range.minAge}
                      onChange={(value) => updateAgeRange(range.id, 'minAge', value)}
                      error={rangeErrors[index]?.minAge}
                      disabled={updateSubClassesMutation.isPending}
                    />
                    <FormInput
                      label="Max Age"
                      type="number"
                      min="18"
                      max="99"
                      value={range.maxAge}
                      onChange={(value) => updateAgeRange(range.id, 'maxAge', value)}
                      error={rangeErrors[index]?.maxAge}
                      disabled={updateSubClassesMutation.isPending}
                    />
                  </div>
                  
                  <div className="form-row">
                    <div className="form-field-with-tooltip">
                      <FormInput
                        label={
                          <span className="form-label-with-tooltip">
                            Employee Contribution
                            <Tooltip content={ICHRATooltips.employeeContribution} position="top" />
                          </span>
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        value={range.employeeContribution}
                        onChange={(value) => updateAgeRange(range.id, 'employeeContribution', value)}
                        error={rangeErrors[index]?.employeeContribution}
                        disabled={updateSubClassesMutation.isPending}
                        prefix="$"
                      />
                    </div>
                    <div className="form-field-with-tooltip">
                      <FormInput
                        label={
                          <span className="form-label-with-tooltip">
                            Dependent Contribution
                            <Tooltip content={ICHRATooltips.dependentContribution} position="top" />
                          </span>
                        }
                        type="number"
                        min="0"
                        step="0.01"
                        value={range.dependentContribution}
                        onChange={(value) => updateAgeRange(range.id, 'dependentContribution', value)}
                        error={rangeErrors[index]?.dependentContribution}
                        disabled={updateSubClassesMutation.isPending}
                        prefix="$"
                      />
                    </div>
                  </div>

                  {rangeErrors[index]?.overlap && (
                    <ErrorMessage message={rangeErrors[index].overlap} />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Add New Range */}
      <div className="add-range-section">
        <h4>Add New Age Range</h4>
        <div className="range-form">
          <div className="form-row">
            <FormInput
              label="Min Age"
              placeholder="18"
              type="number"
              min="18"
              max="99"
              value={newRange.minAge}
              onChange={(value) => setNewRange(prev => ({ ...prev, minAge: value }))}
              error={validationErrors.minAge}
              disabled={updateSubClassesMutation.isPending}
            />
            <FormInput
              label="Max Age"
              placeholder="65"
              type="number"
              min="18"
              max="99"
              value={newRange.maxAge}
              onChange={(value) => setNewRange(prev => ({ ...prev, maxAge: value }))}
              error={validationErrors.maxAge}
              disabled={updateSubClassesMutation.isPending}
            />
          </div>
          
          <div className="form-row">
            <FormInput
              label="Employee Contribution"
              placeholder="500.00"
              type="number"
              min="0"
              step="0.01"
              value={newRange.employeeContribution}
              onChange={(value) => setNewRange(prev => ({ ...prev, employeeContribution: value }))}
              error={validationErrors.employeeContribution}
              disabled={updateSubClassesMutation.isPending}
              prefix="$"
            />
            <FormInput
              label="Dependent Contribution"
              placeholder="200.00"
              type="number"
              min="0"
              step="0.01"
              value={newRange.dependentContribution}
              onChange={(value) => setNewRange(prev => ({ ...prev, dependentContribution: value }))}
              error={validationErrors.dependentContribution}
              disabled={updateSubClassesMutation.isPending}
              prefix="$"
            />
          </div>

          {(validationErrors.overlap || validationErrors.minAge || validationErrors.maxAge || 
            validationErrors.employeeContribution || validationErrors.dependentContribution) && (
            <div className="validation-errors">
              {Object.values(validationErrors).map((error, index) => (
                <ErrorMessage key={index} message={error} />
              ))}
            </div>
          )}

          <Button
            variant="secondary"
            onClick={addAgeRange}
            disabled={updateSubClassesMutation.isPending}
          >
            Add Age Range
          </Button>
        </div>
      </div>

      {/* Summary */}
      {ageRanges.length > 0 && (
        <div className="ranges-summary">
          <h4>Summary</h4>
          <div className="summary-stats">
            <div className="stat">
              <span className="stat-label">Total Ranges:</span>
              <span className="stat-value">{ageRanges.length}</span>
            </div>
            <div className="stat">
              <span className="stat-label">Ages Covered:</span>
              <span className="stat-value">
                {coverage.filter(c => c !== null).length} of {coverage.length}
              </span>
            </div>
            <div className="stat">
              <span className="stat-label">Average Employee Contribution:</span>
              <span className="stat-value">
                ${(ageRanges.reduce((sum, range) => sum + parseFloat(range.employeeContribution || 0), 0) / ageRanges.length).toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Submit Error */}
      {validationErrors.submit && (
        <ErrorMessage message={validationErrors.submit} />
      )}

      {/* Action Buttons */}
      <div className="modal-actions">
        <Button
          variant="secondary"
          onClick={onClose}
          disabled={updateSubClassesMutation.isPending}
        >
          Cancel
        </Button>
        <Button
          variant="primary"
          onClick={handleSave}
          loading={updateSubClassesMutation.isPending}
          disabled={ageRanges.length === 0}
        >
          Save Sub-Classes
        </Button>
      </div>
    </div>
  );
};

export default SubClassManager; 