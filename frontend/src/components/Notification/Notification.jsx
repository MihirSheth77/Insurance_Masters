/**
 * Notification Component
 * Professional toast notifications with animations
 */

import React, { useState, useEffect } from 'react';
import {
  CheckCircleIcon,
  ErrorIcon,
  WarningIcon,
  InfoIcon,
  CloseIcon
} from '../Icons/Icons';
import './Notification.css';

const Notification = ({
  type = 'info',
  title,
  message,
  duration = 5000,
  onClose,
  position = 'top-right',
  showProgress = true,
  actions = []
}) => {
  const [isVisible, setIsVisible] = useState(true);
  const [progress, setProgress] = useState(100);

  useEffect(() => {
    if (duration > 0) {
      const interval = setInterval(() => {
        setProgress(prev => {
          const newProgress = prev - (100 / (duration / 100));
          if (newProgress <= 0) {
            handleClose();
            return 0;
          }
          return newProgress;
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [duration]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      if (onClose) onClose();
    }, 300);
  };

  const getIcon = () => {
    switch (type) {
      case 'success':
        return <CheckCircleIcon />;
      case 'error':
        return <ErrorIcon />;
      case 'warning':
        return <WarningIcon />;
      case 'info':
      default:
        return <InfoIcon />;
    }
  };

  if (!isVisible) return null;

  return (
    <div className={`notification notification-${type} notification-${position} ${!isVisible ? 'notification-exit' : ''}`}>
      <div className="notification-content">
        <div className="notification-icon">
          {getIcon()}
        </div>
        <div className="notification-body">
          {title && <h4 className="notification-title">{title}</h4>}
          {message && <p className="notification-message">{message}</p>}
          {actions.length > 0 && (
            <div className="notification-actions">
              {actions.map((action, index) => (
                <button
                  key={index}
                  className={`notification-action ${action.primary ? 'primary' : ''}`}
                  onClick={() => {
                    action.onClick();
                    if (action.closeOnClick !== false) {
                      handleClose();
                    }
                  }}
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
        <button
          className="notification-close"
          onClick={handleClose}
          aria-label="Close notification"
        >
          <CloseIcon />
        </button>
      </div>
      {showProgress && duration > 0 && (
        <div className="notification-progress">
          <div 
            className="notification-progress-bar"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}
    </div>
  );
};

// Notification Container Component
export const NotificationContainer = ({ notifications = [], position = 'top-right' }) => {
  return (
    <div className={`notification-container notification-container-${position}`}>
      {notifications.map((notification) => (
        <Notification key={notification.id} {...notification} position={position} />
      ))}
    </div>
  );
};

// Hook for managing notifications
export const useNotifications = () => {
  const [notifications, setNotifications] = useState([]);

  const addNotification = (notification) => {
    const id = Date.now();
    const newNotification = { id, ...notification };
    
    setNotifications(prev => [...prev, newNotification]);

    return id;
  };

  const removeNotification = (id) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
  };

  const success = (title, message, options = {}) => {
    return addNotification({ type: 'success', title, message, ...options });
  };

  const error = (title, message, options = {}) => {
    return addNotification({ type: 'error', title, message, ...options });
  };

  const warning = (title, message, options = {}) => {
    return addNotification({ type: 'warning', title, message, ...options });
  };

  const info = (title, message, options = {}) => {
    return addNotification({ type: 'info', title, message, ...options });
  };

  return {
    notifications,
    addNotification,
    removeNotification,
    success,
    error,
    warning,
    info
  };
};

export default Notification;