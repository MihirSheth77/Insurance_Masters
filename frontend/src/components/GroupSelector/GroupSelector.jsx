import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../../context/GroupContext';
import { groupService } from '../../services/groupService';
import Button from '../common/Button';
import LoadingSpinner from '../common/LoadingSpinner';
import './GroupSelector.css';

/**
 * GroupSelector Component
 * Implements workspace switcher pattern similar to Slack/Notion
 * Shows in top navigation bar for easy group context switching
 */
const GroupSelector = () => {
  const navigate = useNavigate();
  const { state: groupState, actions: groupActions } = useGroup();
  const [isOpen, setIsOpen] = useState(false);
  const [groups, setGroups] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  
  const currentGroup = groupState.currentGroup;

  // Load groups when dropdown opens
  useEffect(() => {
    if (isOpen && groups.length === 0) {
      loadGroups();
    }
  }, [isOpen]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (!event.target.closest('.group-selector')) {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => document.removeEventListener('click', handleClickOutside);
    }
  }, [isOpen]);

  // Keyboard shortcut for group switcher (Cmd/Ctrl + G)
  useEffect(() => {
    const handleKeyPress = (event) => {
      if ((event.metaKey || event.ctrlKey) && event.key === 'g') {
        event.preventDefault();
        setIsOpen(!isOpen);
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen]);

  const loadGroups = async () => {
    setIsLoading(true);
    try {
      const response = await groupService.getGroups({});
      setGroups(response.data || []);
    } catch (error) {
      console.error('Failed to load groups:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const selectGroup = (group) => {
    groupActions.setCurrentGroup(group);
    setIsOpen(false);
    
    // Navigate to appropriate page based on current location
    const currentPath = window.location.pathname;
    if (currentPath.includes('/members')) {
      navigate(`/groups/${group.id || group.groupId}/members`);
    } else if (currentPath.includes('/classes')) {
      navigate(`/groups/${group.id || group.groupId}/classes`);
    } else {
      navigate(`/groups/${group.id || group.groupId}`);
    }
  };

  const handleCreateGroup = () => {
    setIsOpen(false);
    navigate('/workflow');
  };

  return (
    <div className="group-selector">
      <button
        className={`group-selector-trigger ${isOpen ? 'active' : ''}`}
        onClick={() => setIsOpen(!isOpen)}
        aria-label="Select group"
      >
        <div className="current-group">
          {currentGroup ? (
            <>
              <span className="group-icon">🏢</span>
              <span className="group-name">{currentGroup.name}</span>
              <span className="dropdown-arrow">▼</span>
            </>
          ) : (
            <>
              <span className="group-icon">🏢</span>
              <span className="no-group">Select a Group</span>
              <span className="dropdown-arrow">▼</span>
            </>
          )}
        </div>
      </button>

      {isOpen && (
        <div className="group-selector-dropdown">
          <div className="dropdown-header">
            <h3>Switch Group</h3>
            <span className="keyboard-hint">⌘G</span>
          </div>

          {isLoading ? (
            <div className="dropdown-loading">
              <LoadingSpinner size="small" />
              <span>Loading groups...</span>
            </div>
          ) : (
            <>
              <div className="groups-list">
                {groups.length > 0 ? (
                  groups.map((group) => (
                    <div
                      key={group.id || group.groupId}
                      className={`group-item ${currentGroup?.id === group.id ? 'active' : ''}`}
                      onClick={() => selectGroup(group)}
                    >
                      <div className="group-item-info">
                        <span className="group-item-name">{group.name}</span>
                        <span className="group-item-meta">
                          {group.memberCount || 0} members • {group.classCount || 0} classes
                        </span>
                      </div>
                      {currentGroup?.id === group.id && (
                        <span className="checkmark">✓</span>
                      )}
                    </div>
                  ))
                ) : (
                  <div className="no-groups">
                    <p>No groups found</p>
                  </div>
                )}
              </div>

              <div className="dropdown-footer">
                <Button
                  variant="primary"
                  size="small"
                  onClick={handleCreateGroup}
                  className="create-group-btn"
                >
                  + Create New Group
                </Button>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
};

export default GroupSelector;