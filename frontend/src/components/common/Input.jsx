// Common input component with validation and styling
import React from 'react';

const Input = ({ 
  id,
  type = 'text',
  value,
  onChange,
  onBlur,
  onFocus,
  placeholder,
  disabled = false,
  required = false,
  error = false,
  maxLength,
  min,
  max,
  step,
  autoComplete,
  className = '',
  ...props
}) => {
  const inputClasses = [
    'form-input',
    error ? 'form-input--error' : '',
    disabled ? 'form-input--disabled' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <input
      id={id}
      type={type}
      value={value || ''}
      onChange={onChange}
      onBlur={onBlur}
      onFocus={onFocus}
      placeholder={placeholder}
      disabled={disabled}
      required={required}
      maxLength={maxLength}
      min={min}
      max={max}
      step={step}
      autoComplete={autoComplete}
      className={inputClasses}
      aria-invalid={error ? 'true' : 'false'}
      {...props}
    />
  );
};

export default Input; 