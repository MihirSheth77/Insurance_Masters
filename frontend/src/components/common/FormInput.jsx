import React from 'react';
import Input from './Input';
import './FormInput.css';

const FormInput = ({ 
  label,
  error,
  required,
  prefix,
  suffix,
  onChange,
  ...inputProps 
}) => {
  // Handle onChange to pass just the value
  const handleChange = (e) => {
    if (onChange) {
      onChange(e.target.value);
    }
  };
  return (
    <div className="form-field">
      {label && (
        <label className="form-label">
          {label}
          {required && <span className="required">*</span>}
        </label>
      )}
      <div className="input-wrapper">
        {prefix && <span className="input-prefix">{prefix}</span>}
        <Input 
          error={!!error}
          required={required}
          onChange={handleChange}
          {...inputProps}
        />
        {suffix && <span className="input-suffix">{suffix}</span>}
      </div>
      {error && <span className="form-error">{error}</span>}
    </div>
  );
};

export default FormInput;