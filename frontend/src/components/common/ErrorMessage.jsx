// Common error message component for form validation
import React from 'react';

const ErrorMessage = ({ 
  message,
  className = '',
  ...props 
}) => {
  if (!message) return null;

  return (
    <div 
      className={`error-message ${className}`.trim()}
      role="alert"
      aria-live="polite"
      {...props}
    >
      <svg 
        width="16" 
        height="16" 
        viewBox="0 0 24 24" 
        fill="none" 
        className="error-message__icon"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="2"/>
        <line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" strokeWidth="2"/>
        <line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" strokeWidth="2"/>
      </svg>
      <span className="error-message__text">{message}</span>
    </div>
  );
};

export default ErrorMessage; 