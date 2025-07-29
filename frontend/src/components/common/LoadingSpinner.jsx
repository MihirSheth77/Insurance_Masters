// Common loading spinner component
import React from 'react';

const LoadingSpinner = ({ size = 'medium', message, variant = 'default' }) => {
  const sizeClasses = {
    small: { width: '24px', height: '24px', border: '2px' },
    medium: { width: '40px', height: '40px', border: '3px' },
    large: { width: '64px', height: '64px', border: '4px' },
    xl: { width: '80px', height: '80px', border: '5px' }
  };

  const currentSize = sizeClasses[size] || sizeClasses.medium;

  const variantStyles = {
    default: {
      primary: '#3b82f6',
      secondary: '#e5e7eb',
      background: 'transparent'
    },
    success: {
      primary: '#10b981',
      secondary: '#d1fae5',
      background: 'rgba(16, 185, 129, 0.05)'
    },
    warning: {
      primary: '#f59e0b',
      secondary: '#fef3c7',
      background: 'rgba(245, 158, 11, 0.05)'
    },
    error: {
      primary: '#ef4444',
      secondary: '#fee2e2',
      background: 'rgba(239, 68, 68, 0.05)'
    },
    glassmorphism: {
      primary: '#ffffff',
      secondary: 'rgba(255, 255, 255, 0.2)',
      background: 'rgba(255, 255, 255, 0.1)'
    }
  };

  const currentVariant = variantStyles[variant] || variantStyles.default;

  // Advanced spinner with multiple rings
  const AdvancedSpinner = () => (
    <div style={{
      position: 'relative',
      width: currentSize.width,
      height: currentSize.height,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      {/* Outer ring */}
      <div style={{
        position: 'absolute',
        width: '100%',
        height: '100%',
        borderRadius: '50%',
        border: `${currentSize.border} solid ${currentVariant.secondary}`,
        borderTop: `${currentSize.border} solid ${currentVariant.primary}`,
        animation: 'spin 1s linear infinite',
        filter: 'drop-shadow(0 0 8px rgba(59, 130, 246, 0.3))'
      }} />
      
      {/* Inner ring */}
      <div style={{
        position: 'absolute',
        width: '70%',
        height: '70%',
        borderRadius: '50%',
        border: `${parseInt(currentSize.border) - 1}px solid transparent`,
        borderRight: `${parseInt(currentSize.border) - 1}px solid ${currentVariant.primary}`,
        borderBottom: `${parseInt(currentSize.border) - 1}px solid ${currentVariant.primary}`,
        animation: 'spin 0.7s linear infinite reverse',
        opacity: 0.6
      }} />

      {/* Center dot */}
      <div style={{
        width: '20%',
        height: '20%',
        borderRadius: '50%',
        background: `linear-gradient(135deg, ${currentVariant.primary}, ${currentVariant.secondary})`,
        animation: 'pulse 1.5s ease-in-out infinite'
      }} />
    </div>
  );

  // Dots loading animation
  const DotsSpinner = () => (
    <div style={{
      display: 'flex',
      gap: '8px',
      alignItems: 'center'
    }}>
      {[0, 1, 2].map(index => (
        <div
          key={index}
          style={{
            width: '12px',
            height: '12px',
            borderRadius: '50%',
            background: `linear-gradient(135deg, ${currentVariant.primary}, ${currentVariant.secondary})`,
            animation: `dotPulse 1.4s ease-in-out infinite`,
            animationDelay: `${index * 0.2}s`,
            boxShadow: `0 0 8px ${currentVariant.primary}40`
          }}
        />
      ))}
    </div>
  );

  // Bars loading animation
  const BarsSpinner = () => (
    <div style={{
      display: 'flex',
      gap: '4px',
      alignItems: 'flex-end',
      height: currentSize.height
    }}>
      {[0, 1, 2, 3, 4].map(index => (
        <div
          key={index}
          style={{
            width: '6px',
            background: `linear-gradient(to top, ${currentVariant.primary}, ${currentVariant.secondary})`,
            borderRadius: '3px',
            animation: `barPulse 1.2s ease-in-out infinite`,
            animationDelay: `${index * 0.1}s`,
            minHeight: '20%'
          }}
        />
      ))}
    </div>
  );

  const spinnerTypes = {
    default: AdvancedSpinner,
    dots: DotsSpinner,
    bars: BarsSpinner,
    advanced: AdvancedSpinner
  };

  const SpinnerComponent = spinnerTypes[variant] || AdvancedSpinner;

  return (
    <div style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '16px',
      padding: '24px',
      background: currentVariant.background,
      borderRadius: '16px',
      backdropFilter: variant === 'glassmorphism' ? 'blur(20px)' : 'none',
      border: variant === 'glassmorphism' ? '1px solid rgba(255, 255, 255, 0.1)' : 'none'
    }}>
      <SpinnerComponent />
      
      {message && (
        <div style={{
          fontSize: size === 'small' ? '12px' : size === 'large' ? '16px' : '14px',
          color: variant === 'glassmorphism' ? '#ffffff' : '#64748b',
          fontWeight: '500',
          textAlign: 'center',
          maxWidth: '200px',
          lineHeight: '1.4',
          animation: 'fadeInOut 2s ease-in-out infinite'
        }}>
          {message}
        </div>
      )}

      <style jsx>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }

        @keyframes pulse {
          0%, 100% { 
            transform: scale(1);
            opacity: 1;
          }
          50% { 
            transform: scale(1.2);
            opacity: 0.7;
          }
        }

        @keyframes dotPulse {
          0%, 80%, 100% { 
            transform: scale(0.8);
            opacity: 0.5;
          }
          40% { 
            transform: scale(1.2);
            opacity: 1;
          }
        }

        @keyframes barPulse {
          0%, 40%, 100% { 
            height: 20%;
            opacity: 0.7;
          }
          20% { 
            height: 100%;
            opacity: 1;
          }
        }

        @keyframes fadeInOut {
          0%, 100% { opacity: 0.7; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
};

export default LoadingSpinner; 