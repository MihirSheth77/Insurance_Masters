/**
 * Groups Management Page
 * Display and manage all employer groups
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  GroupIcon,
  PersonIcon,
  CalendarIcon,
  SearchIcon,
  EditIcon,
  DeleteIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  ErrorIcon,
  PlusIcon
} from '../../components/Icons/Icons';
import { groupService } from '../../services/groupService';
import Loading from '../../components/Loading/Loading';
import './Groups.css';

const Groups = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedGroups, setSelectedGroups] = useState([]);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [groupToDelete, setGroupToDelete] = useState(null);

  // Fetch groups
  const { data: groupsData, isLoading, error } = useQuery({
    queryKey: ['groups', filterStatus],
    queryFn: () => groupService.getGroups({ status: filterStatus !== 'all' ? filterStatus : undefined }),
    staleTime: 30000
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: (groupId) => groupService.deleteGroup(groupId),
    onSuccess: () => {
      queryClient.invalidateQueries(['groups']);
      setShowDeleteConfirm(false);
      setGroupToDelete(null);
    }
  });

  // Filter groups based on search
  const filteredGroups = groupsData?.data?.filter(group => {
    const matchesSearch = group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         group.address?.city?.toLowerCase().includes(searchTerm.toLowerCase());
    return matchesSearch;
  }) || [];

  // Format date
  const formatDate = (date) => {
    if (!date) return 'N/A';
    return new Date(date).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  // Handle delete
  const handleDelete = (group) => {
    setGroupToDelete(group);
    setShowDeleteConfirm(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    if (groupToDelete) {
      deleteMutation.mutate(groupToDelete.groupId);
    }
  };

  // Bulk selection
  const handleSelectAll = (e) => {
    if (e.target.checked) {
      setSelectedGroups(filteredGroups.map(g => g.groupId));
    } else {
      setSelectedGroups([]);
    }
  };

  const handleSelectGroup = (groupId) => {
    setSelectedGroups(prev => 
      prev.includes(groupId) 
        ? prev.filter(id => id !== groupId)
        : [...prev, groupId]
    );
  };

  return (
    <div className="groups-page">
      {/* Page Header */}
      <div className="page-header">
        <div className="header-content">
          <div>
            <h1 className="page-title">Groups Management</h1>
            <p className="page-subtitle">
              Manage employer groups and their ICHRA configurations
            </p>
          </div>
          <button 
            className="btn btn-primary"
            onClick={() => navigate('/group-setup')}
          >
            <PlusIcon size={20} />
            Create New Group
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="filters-section">
        <div className="search-box">
          <SearchIcon className="search-icon" />
          <input
            type="text"
            placeholder="Search by group name or city..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        
        <div className="filter-controls">
          <select 
            className="filter-select"
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
          >
            <option value="all">All Groups</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Groups Statistics */}
      <div className="statistics-cards">
        <div className="stat-card">
          <div className="stat-icon primary">
            <GroupIcon />
          </div>
          <div className="stat-content">
            <div className="stat-value">{groupsData?.data?.length || 0}</div>
            <div className="stat-label">Total Groups</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon success">
            <CheckCircleIcon />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {groupsData?.data?.filter(g => g.status === 'active').length || 0}
            </div>
            <div className="stat-label">Active Groups</div>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon warning">
            <PersonIcon />
          </div>
          <div className="stat-content">
            <div className="stat-value">
              {groupsData?.data?.reduce((sum, g) => sum + (g.memberCount || g.statistics?.totalMembers || 0), 0) || 0}
            </div>
            <div className="stat-label">Total Members</div>
          </div>
        </div>
      </div>

      {/* Groups Table */}
      <div className="groups-section">
        {isLoading ? (
          <Loading type="spinner" />
        ) : error ? (
          <div className="error-container">
            <ErrorIcon />
            <div className="error-message">
              Failed to load groups. Please try again.
            </div>
          </div>
        ) : filteredGroups.length === 0 ? (
          <div className="empty-state">
            <GroupIcon size={48} className="empty-icon" />
            <h3>No Groups Found</h3>
            <p>
              {searchTerm ? 'No groups match your search criteria.' : 'Get started by creating your first group.'}
            </p>
            {!searchTerm && (
              <button 
                className="btn btn-primary"
                onClick={() => navigate('/group-setup')}
              >
                Create First Group
              </button>
            )}
          </div>
        ) : (
          <div className="groups-table-container">
            <table className="groups-table">
              <thead>
                <tr>
                  <th className="checkbox-column">
                    <input
                      type="checkbox"
                      checked={selectedGroups.length === filteredGroups.length}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>Group Name</th>
                  <th>Location</th>
                  <th>Effective Date</th>
                  <th>Members</th>
                  <th>Classes</th>
                  <th>Status</th>
                  <th className="actions-column">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredGroups.map((group) => (
                  <tr key={group.groupId} className="group-row">
                    <td className="checkbox-column">
                      <input
                        type="checkbox"
                        checked={selectedGroups.includes(group.groupId)}
                        onChange={() => handleSelectGroup(group.groupId)}
                      />
                    </td>
                    <td className="group-name">
                      <div className="name-cell">
                        <GroupIcon className="group-icon" />
                        <span>{group.name}</span>
                      </div>
                    </td>
                    <td className="location">
                      {group.address?.city}, {group.address?.state}
                    </td>
                    <td className="date">
                      <CalendarIcon size={16} />
                      {formatDate(group.effectiveDate)}
                    </td>
                    <td className="members-count">
                      <PersonIcon size={16} />
                      {group.memberCount || group.statistics?.totalMembers || 0}
                    </td>
                    <td className="classes-count">
                      {group.classCount || group.statistics?.totalClasses || 0}
                    </td>
                    <td>
                      <span className={`status-badge ${group.status || 'active'}`}>
                        {group.status || 'Active'}
                      </span>
                    </td>
                    <td className="actions-column">
                      <div className="action-buttons">
                        <button
                          className="action-btn view"
                          onClick={() => {
                            navigate(`/groups/${group.groupId}`);
                          }}
                          title="View Details"
                        >
                          <ArrowRightIcon />
                        </button>
                        <button
                          className="action-btn edit"
                          onClick={() => navigate(`/groups/${group.groupId}/edit`)}
                          title="Edit Group"
                        >
                          <EditIcon />
                        </button>
                        <button
                          className="action-btn delete"
                          onClick={() => handleDelete(group)}
                          title="Delete Group"
                        >
                          <DeleteIcon />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="modal-backdrop" onClick={() => setShowDeleteConfirm(false)}>
          <div className="delete-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Confirm Delete</h3>
            </div>
            <div className="modal-body">
              <p>
                Are you sure you want to delete the group <strong>{groupToDelete?.name}</strong>?
              </p>
              <p className="warning-text">
                This action cannot be undone. All associated members and classes will also be deleted.
              </p>
            </div>
            <div className="modal-footer">
              <button 
                className="btn btn-secondary"
                onClick={() => setShowDeleteConfirm(false)}
              >
                Cancel
              </button>
              <button 
                className="btn btn-danger"
                onClick={confirmDelete}
                disabled={deleteMutation.isPending}
              >
                {deleteMutation.isPending ? 'Deleting...' : 'Delete Group'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Groups;