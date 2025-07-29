import React from 'react';
import { useLocation } from 'react-router-dom';
import GroupSelector from '../GroupSelector/GroupSelector';
import Button from '../common/Button';
import './TopBar.css';

/**
 * TopBar Component
 * Provides context-aware navigation and group selection
 * Implements best practices from Slack/Notion UX patterns
 */
const TopBar = () => {
  const location = useLocation();
  
  // Get page title based on current route
  const getPageTitle = () => {
    const path = location.pathname;
    if (path === '/') return 'Dashboard';
    if (path.includes('/workflow')) return 'Quote Workflow';
    if (path.includes('/groups') && path.includes('/members')) return 'Member Management';
    if (path.includes('/groups') && path.includes('/classes')) return 'Class Management';
    if (path.includes('/groups')) return 'Groups';
    if (path.includes('/members')) return 'Member Management';
    if (path.includes('/classes')) return 'ICHRA Classes';
    if (path.includes('/quotes')) return 'Quotes';
    if (path.includes('/data-management')) return 'Data Management';
    return 'Insurance Masters';
  };

  // Check if we're in workflow mode
  const isWorkflowMode = location.pathname.includes('/workflow');

  return (
    <div className="top-bar">
      <div className="top-bar-left">
        <h1 className="page-title">{getPageTitle()}</h1>
      </div>
      
      <div className="top-bar-center">
        {!isWorkflowMode && <GroupSelector />}
      </div>
      
      <div className="top-bar-right">
        <Button
          variant="text"
          size="small"
          className="help-button"
        >
          Help
        </Button>
        <div className="user-menu">
          <div className="user-avatar">
            <span>JD</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TopBar;