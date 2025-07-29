import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useGroup } from '../../context/GroupContext';
import {
  GroupIcon,
  PersonIcon,
  CalendarIcon,
  EditIcon,
  PlusIcon,
  AssessmentIcon,
  ErrorIcon,
  TrendingUpIcon
} from '../../components/Icons/Icons';
import { groupService } from '../../services/groupService';
import { classService } from '../../services/classService';
import Loading from '../../components/Loading/Loading';
import './GroupDetail.css';

const GroupDetail = () => {
  const { groupId } = useParams();
  const navigate = useNavigate();
  const { actions: groupActions } = useGroup();
  const [activeTab, setActiveTab] = useState('overview');
  

  // Fetch group details
  const { data: groupData, isLoading: groupLoading, error: groupError } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroup(groupId),
    enabled: !!groupId,
    onError: (error) => {
    }
  });

  // Fetch classes for the group
  const { data: classesData, isLoading: classesLoading, error: classesError } = useQuery({
    queryKey: ['classes', groupId],
    queryFn: () => classService.getClasses(groupId),
    enabled: !!groupId
  });

  const group = groupData?.data || groupData;
  const classes = classesData?.classes || [];

  if (groupLoading || classesLoading) {
    return <Loading type="spinner" />;
  }

  if (groupError || classesError) {
    return (
      <div className="error-container">
        <ErrorIcon />
        <div className="error-message">
          Failed to load group details. Please try again.
          <br />
          <small>{groupError?.message || classesError?.message}</small>
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/groups')}>
          Back to Groups
        </button>
      </div>
    );
  }

  if (!group) {
    return (
      <div className="error-container">
        <ErrorIcon />
        <div className="error-message">
          Group not found.
        </div>
        <button className="btn btn-primary" onClick={() => navigate('/groups')}>
          Back to Groups
        </button>
      </div>
    );
  }

  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  return (
    <div className="group-detail-page">
      {/* Header */}
      <div className="page-header">
        <div className="header-content">
          <button 
            className="back-button"
            onClick={() => navigate('/groups')}
          >
            ← Back to Groups
          </button>
          <div className="header-main">
            <div>
              <h1 className="page-title">
                <GroupIcon size={32} />
                {group.name}
              </h1>
              <div className="header-meta">
                <span className={`status-badge ${group.status || 'active'}`}>
                  {group.status || 'Active'}
                </span>
                <span className="meta-item">
                  <CalendarIcon size={16} />
                  Effective: {formatDate(group.effectiveDate)}
                </span>
                <span className="meta-item">
                  📍 {group.address?.city}, {group.address?.state}
                </span>
              </div>
            </div>
            <div className="header-actions">
              <button 
                className="btn btn-secondary"
                onClick={() => navigate(`/groups/${groupId}/edit`)}
              >
                <EditIcon size={20} />
                Edit Group
              </button>
              <button 
                className="btn btn-primary"
                onClick={() => {
                  // For existing groups, go directly to where they need to continue
                  // If no classes defined, go to classes page
                  // If classes exist but no members, go to members page
                  // If both exist, go to review/generate quote
                  
                  if (classes.length === 0) {
                    // No classes yet, go to classes page
                    navigate(`/groups/${groupId}/classes`);
                  } else if (group.statistics?.totalMembers === 0) {
                    // Has classes but no members, go to members page
                    navigate(`/groups/${groupId}/members`);
                  } else {
                    // Has both classes and members, go to quote generation
                    // Store group info for quote context
                    sessionStorage.setItem('selectedGroupId', groupId);
                    sessionStorage.setItem('selectedGroupName', group.name);
                    
                    // Also set in group context
                    console.log('🎯 Setting group context before quote generation:', group);
                    groupActions.setCurrentGroup({
                      id: groupId,
                      groupId: groupId,
                      name: group.name,
                      ...group
                    });
                    
                    navigate('/quote/new');
                  }
                }}
              >
                <AssessmentIcon size={20} />
                Generate Quote
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Statistics Cards */}
      <div className="statistics-section">
        <div className="stat-card">
          <div className="stat-icon primary">
            <GroupIcon />
          </div>
          <div className="stat-content">
            <div className="stat-value">{classes.length || 0}</div>
            <div className="stat-label">Employee Classes</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <PersonIcon />
          </div>
          <div className="stat-content">
            <div className="stat-value">{group.statistics?.totalMembers || 0}</div>
            <div className="stat-label">Total Members</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <TrendingUpIcon />
          </div>
          <div className="stat-content">
            <div className="stat-value">${group.statistics?.totalEmployerContribution || 0}</div>
            <div className="stat-label">Total Contribution</div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="tabs-container">
        <div className="tabs">
          <button 
            className={`tab ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveTab('overview')}
          >
            Overview
          </button>
          <button 
            className={`tab ${activeTab === 'classes' ? 'active' : ''}`}
            onClick={() => setActiveTab('classes')}
          >
            Classes ({classes.length})
          </button>
          <button 
            className={`tab ${activeTab === 'members' ? 'active' : ''}`}
            onClick={() => setActiveTab('members')}
          >
            Members ({group.statistics?.totalMembers || 0})
          </button>
        </div>
      </div>

      {/* Tab Content */}
      <div className="tab-content">
        {activeTab === 'overview' && (
          <div className="overview-section">
            <div className="info-grid">
              <div className="info-card">
                <h3>Group Information</h3>
                <div className="info-item">
                  <span className="info-label">Group Name:</span>
                  <span className="info-value">{group.name}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Group ID:</span>
                  <span className="info-value">{group.groupId || group._id}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Effective Date:</span>
                  <span className="info-value">{formatDate(group.effectiveDate)}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">Created:</span>
                  <span className="info-value">{formatDate(group.createdAt)}</span>
                </div>
              </div>

              <div className="info-card">
                <h3>Address Information</h3>
                <div className="info-item">
                  <span className="info-label">Street:</span>
                  <span className="info-value">{group.address?.street1}</span>
                </div>
                {group.address?.street2 && (
                  <div className="info-item">
                    <span className="info-label">Street 2:</span>
                    <span className="info-value">{group.address.street2}</span>
                  </div>
                )}
                <div className="info-item">
                  <span className="info-label">City:</span>
                  <span className="info-value">{group.address?.city}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">State:</span>
                  <span className="info-value">{group.address?.state}</span>
                </div>
                <div className="info-item">
                  <span className="info-label">ZIP Code:</span>
                  <span className="info-value">{group.address?.zipCode}</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTab === 'classes' && (
          <div className="classes-section">
            <div className="section-header">
              <h3>Employee Classes</h3>
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/groups/${groupId}/classes`)}
              >
                <PlusIcon size={20} />
                Manage Classes
              </button>
            </div>
            
            {classes.length === 0 ? (
              <div className="empty-state">
                <GroupIcon size={48} className="empty-icon" />
                <h3>No Classes Defined</h3>
                <p>Create employee classes to organize members and set contribution amounts.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/groups/${groupId}/classes`)}
                >
                  Create First Class
                </button>
              </div>
            ) : (
              <div className="classes-grid">
                {classes.map((cls) => (
                  <div key={cls._id || cls.classId} className="class-card">
                    <h4>{cls.name}</h4>
                    <div className="class-info">
                      <div className="class-stat">
                        <span className="stat-label">Type:</span>
                        <span className="stat-value">{cls.type}</span>
                      </div>
                      <div className="class-stat">
                        <span className="stat-label">Employee:</span>
                        <span className="stat-value">${cls.employeeContribution}/mo</span>
                      </div>
                      <div className="class-stat">
                        <span className="stat-label">Dependent:</span>
                        <span className="stat-value">${cls.dependentContribution}/mo</span>
                      </div>
                      <div className="class-stat">
                        <span className="stat-label">Members:</span>
                        <span className="stat-value">{cls.memberCount || 0}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTab === 'members' && (
          <div className="members-section">
            <div className="section-header">
              <h3>Group Members</h3>
              <button 
                className="btn btn-primary"
                onClick={() => navigate(`/groups/${groupId}/members`)}
              >
                <PersonIcon size={20} />
                Manage Members
              </button>
            </div>
            
            {group.statistics?.totalMembers === 0 ? (
              <div className="empty-state">
                <PersonIcon size={48} className="empty-icon" />
                <h3>No Members Added</h3>
                <p>Add members to this group to generate quotes.</p>
                <button 
                  className="btn btn-primary"
                  onClick={() => navigate(`/groups/${groupId}/members`)}
                >
                  Add Members
                </button>
              </div>
            ) : (
              <div className="members-summary">
                <p>This group has {group.statistics?.totalMembers} members.</p>
                <button 
                  className="btn btn-secondary"
                  onClick={() => navigate(`/groups/${groupId}/members`)}
                >
                  View All Members
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default GroupDetail;