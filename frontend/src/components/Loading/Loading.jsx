/**
 * Loading Component
 * Professional loading states with smooth animations
 */

import React from 'react';
import './Loading.css';

export const LoadingSpinner = ({ size = 'medium', color = 'primary' }) => {
  return (
    <div className={`loading-spinner loading-spinner-${size} loading-spinner-${color}`}>
      <div className="spinner-circle"></div>
    </div>
  );
};

export const LoadingDots = ({ size = 'medium' }) => {
  return (
    <div className={`loading-dots loading-dots-${size}`}>
      <span className="loading-dot"></span>
      <span className="loading-dot"></span>
      <span className="loading-dot"></span>
    </div>
  );
};

export const LoadingProgress = ({ progress = 0, showPercent = true }) => {
  return (
    <div className="loading-progress">
      <div className="progress-bar">
        <div 
          className="progress-fill"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>
      {showPercent && (
        <div className="progress-text">{Math.round(progress)}%</div>
      )}
    </div>
  );
};

export const LoadingPulse = ({ lines = 3 }) => {
  return (
    <div className="loading-pulse">
      {Array.from({ length: lines }).map((_, index) => (
        <div 
          key={index} 
          className="pulse-line"
          style={{ width: index === lines - 1 ? '60%' : '100%' }}
        />
      ))}
    </div>
  );
};

export const LoadingCard = ({ showAvatar = true, lines = 3 }) => {
  return (
    <div className="loading-card">
      {showAvatar && (
        <div className="loading-card-header">
          <div className="loading-avatar skeleton"></div>
          <div className="loading-card-meta">
            <div className="skeleton" style={{ width: '150px', height: '20px' }}></div>
            <div className="skeleton" style={{ width: '100px', height: '16px', marginTop: '8px' }}></div>
          </div>
        </div>
      )}
      <div className="loading-card-body">
        {Array.from({ length: lines }).map((_, index) => (
          <div 
            key={index}
            className="skeleton"
            style={{ 
              width: index === lines - 1 ? '70%' : '100%',
              height: '16px',
              marginBottom: '12px'
            }}
          />
        ))}
      </div>
    </div>
  );
};

export const LoadingOverlay = ({ 
  message = 'Loading...', 
  description = null,
  showSpinner = true 
}) => {
  return (
    <div className="loading-overlay">
      <div className="loading-overlay-content">
        {showSpinner && <LoadingSpinner size="large" />}
        <h3 className="loading-message">{message}</h3>
        {description && (
          <p className="loading-description">{description}</p>
        )}
      </div>
    </div>
  );
};

export const LoadingTable = ({ rows = 5, columns = 4 }) => {
  return (
    <div className="loading-table">
      <div className="loading-table-header">
        {Array.from({ length: columns }).map((_, index) => (
          <div key={index} className="skeleton loading-table-cell" />
        ))}
      </div>
      <div className="loading-table-body">
        {Array.from({ length: rows }).map((_, rowIndex) => (
          <div key={rowIndex} className="loading-table-row">
            {Array.from({ length: columns }).map((_, colIndex) => (
              <div key={colIndex} className="skeleton loading-table-cell" />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
};

// Main Loading component that can be used as a page-level loader
const Loading = ({ 
  type = 'spinner', 
  message = 'Loading...',
  fullScreen = false,
  ...props 
}) => {
  const content = () => {
    switch (type) {
      case 'dots':
        return <LoadingDots {...props} />;
      case 'progress':
        return <LoadingProgress {...props} />;
      case 'pulse':
        return <LoadingPulse {...props} />;
      case 'card':
        return <LoadingCard {...props} />;
      case 'table':
        return <LoadingTable {...props} />;
      case 'overlay':
        return <LoadingOverlay message={message} {...props} />;
      case 'spinner':
      default:
        return <LoadingSpinner {...props} />;
    }
  };

  if (fullScreen) {
    return (
      <div className="loading-fullscreen">
        <div className="loading-content">
          {content()}
          {message && type !== 'overlay' && (
            <p className="loading-message">{message}</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="loading-container">
      {content()}
      {message && type !== 'overlay' && (
        <p className="loading-message">{message}</p>
      )}
    </div>
  );
};

export default Loading;