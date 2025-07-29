// Common button component with variants and loading states
import React from 'react';
import './Button.css';

const Button = ({
  type = 'button',
  variant = 'primary',
  size = 'medium',
  disabled = false,
  loading = false,
  fullWidth = false,
  onClick,
  children,
  className = '',
  icon,
  iconPosition = 'left',
  ...props
}) => {
  const buttonClasses = [
    'btn',
    `btn--${variant}`,
    `btn--${size}`,
    fullWidth ? 'btn--full-width' : '',
    disabled || loading ? 'btn--disabled' : '',
    loading ? 'btn--loading' : '',
    className
  ].filter(Boolean).join(' ');

  return (
    <button
      type={type}
      disabled={disabled || loading}
      onClick={onClick}
      className={buttonClasses}
      aria-busy={loading}
      {...props}
    >
      {loading && (
        <span className="btn__spinner" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none">
            <circle
              cx="12"
              cy="12"
              r="10"
              stroke="currentColor"
              strokeWidth="2"
              strokeDasharray="15 10"
              className="animate-spin"
            />
          </svg>
        </span>
      )}
      <span className={loading ? 'btn__content--loading' : 'btn__content'}>
        {icon && iconPosition === 'left' && <span className="btn__icon btn__icon--left">{icon}</span>}
        {children}
        {icon && iconPosition === 'right' && <span className="btn__icon btn__icon--right">{icon}</span>}
      </span>
    </button>
  );
};

export default Button; 