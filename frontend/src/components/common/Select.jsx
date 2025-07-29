// Common select component with validation and styling
import React from 'react';

const Select = ({
  id,
  label,
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = 'Select an option...',
  disabled = false,
  required = false,
  error = false,
  multiple = false,
  className = '',
  ...props
}) => {
  const selectClasses = [
    'form-select',
    error ? 'form-select--error' : '',
    disabled ? 'form-select--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="form-select-wrapper">
      <select
        id={id}
        value={value || (multiple ? [] : '')}
        onChange={onChange}
        onBlur={onBlur}
        disabled={disabled}
        required={required}
        multiple={multiple}
        className={selectClasses}
        aria-invalid={error ? 'true' : 'false'}
        {...props}
      >
        {!multiple && placeholder && (
          <option value="" disabled>
            {placeholder}
          </option>
        )}
        {options.map((option) => {
          const optionValue = typeof option === 'object' ? option.value : option;
          const optionLabel = typeof option === 'object' ? option.label : option;
          const optionDisabled = typeof option === 'object' ? option.disabled : false;

          return (
            <option 
              key={optionValue} 
              value={optionValue}
              disabled={optionDisabled}
            >
              {optionLabel}
            </option>
          );
        })}
      </select>
      <svg 
        className="form-select__icon" 
        width="20" 
        height="20" 
        viewBox="0 0 24 24" 
        fill="none"
        aria-hidden="true"
      >
        <polyline points="6,9 12,15 18,9" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
      </svg>
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default Select; 