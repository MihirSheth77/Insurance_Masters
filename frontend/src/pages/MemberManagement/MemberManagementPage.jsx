import React, { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { useGroup } from '../../context/GroupContext';

// Components
import MemberTable from '../../components/tables/MemberTable';
import MemberForm from '../../components/forms/MemberForm';
import BulkUpload from './BulkUpload';
import Button from '../../components/common/Button';
import Input from '../../components/common/Input';
import Select from '../../components/common/Select';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

// Services
import { memberService } from '../../services/memberService';
import { classService } from '../../services/classService';
import { groupService } from '../../services/groupService';

// Styles
import './MemberManagementPage.css';

const MemberManagementPage = ({ workflowData, onComplete, onChange, isWorkflowMode }) => {
  const navigate = useNavigate();
  const { state: groupState, actions: groupActions } = useGroup();
  const currentGroup = workflowData?.group || groupState.currentGroup;
  const queryClient = useQueryClient();

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showBulkUploadModal, setShowBulkUploadModal] = useState(false);
  const [showBulkActionsModal, setShowBulkActionsModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [selectedMembers, setSelectedMembers] = useState([]);
  
  // Filters and search
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedClassFilter, setSelectedClassFilter] = useState(''); // Force empty to show ALL members
  const [statusFilter, setStatusFilter] = useState('active');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize] = useState(20);

  // Form errors
  const [formErrors, setFormErrors] = useState({});

  // Check if group is available and reset filters when group changes
  useEffect(() => {
    if (!currentGroup) {
      console.warn('No current group available');
    } else {
      // Reset class filter when group changes so auto-selection can work
      setSelectedClassFilter('');
      setCurrentPage(1);
    }
  }, [currentGroup]);

  // Query for all groups when no group is selected
  const {
    data: groupsData,
    isLoading: isLoadingGroups
  } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getGroups({}),
    enabled: !currentGroup,
    staleTime: 30000
  });

  // Query for members with filters
  const {
    data: membersData,
    isLoading: isLoadingMembers,
    error: membersError
  } = useQuery({
    queryKey: ['members', currentGroup?.id, searchTerm, selectedClassFilter, statusFilter, currentPage, pageSize],
    queryFn: () => {
      console.log('🔍 Fetching members with params:', {
        groupId: currentGroup?.id,
        search: searchTerm,
        classId: selectedClassFilter,
        includeInactive: statusFilter === 'all',
        page: currentPage,
        limit: pageSize
      });
      return memberService.getMembers(currentGroup?.id, {
        search: searchTerm,
        classId: '', // Temporarily disable class filter to see all members
        includeInactive: statusFilter === 'all',
        page: currentPage,
        limit: pageSize
      });
    },
    enabled: !!currentGroup?.id,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('📊 Members query success:', data);
    },
    onError: (error) => {
      console.log('❌ Members query error:', error);
    }
  });

  // Query for classes for filter dropdown
  const {
    data: classesData,
    isLoading: isLoadingClasses
  } = useQuery({
    queryKey: ['classes', currentGroup?.id],
    queryFn: () => classService.getClasses(currentGroup?.id),
    enabled: !!currentGroup?.id,
    refetchOnWindowFocus: false
  });

  // TEMPORARILY DISABLED: Auto-select first class when classes are loaded and no class is selected
  // useEffect(() => {
  //   if (classesData?.classes?.length > 0 && !selectedClassFilter) {
  //     const firstClass = classesData.classes[0];
  //     setSelectedClassFilter(firstClass.classId);
  //   }
  // }, [classesData, selectedClassFilter]);

  // Debug logging for member management loading issues
  useEffect(() => {
    console.log('MemberManagementPage state:', {
      currentGroup: currentGroup,
      groupId: currentGroup?.id,
      isLoadingMembers,
      membersError: membersError?.message,
      membersData: membersData?.members?.length,
      membersDataFull: membersData,
      selectedClassFilter
    });
  }, [currentGroup, isLoadingMembers, membersError, membersData, selectedClassFilter]);

  // Create member mutation
  const createMemberMutation = useMutation({
    mutationFn: (memberData) => memberService.createMember(currentGroup?.id, memberData),
    onSuccess: (result) => {
      console.log('✅ Member created successfully:', result);
      
      // Force refetch of members and classes data
      queryClient.invalidateQueries(['members', currentGroup?.id]).then(() => {
        console.log('Members query invalidated and refetched');
      });
      queryClient.invalidateQueries(['classes', currentGroup?.id]).then(() => {
        console.log('Classes query invalidated and refetched');
      });
      
      setShowCreateModal(false);
      setFormErrors({});
      console.log('Modal closed, queries invalidated');
      
      // Also force a manual refetch as backup
      setTimeout(() => {
        console.log('Force refetching members data...');
        queryClient.refetchQueries(['members', currentGroup?.id]);
      }, 500);
      
      if (onChange) onChange();
    },
    onError: (error) => {
      console.log('❌ Error creating member:', error);
      setFormErrors({ submit: error.message || 'Failed to create member' });
    }
  });

  // Update member mutation
  const updateMemberMutation = useMutation({
    mutationFn: ({ memberId, memberData }) => memberService.updateMember(currentGroup?.id, memberId, memberData),
    onSuccess: () => {
      queryClient.invalidateQueries(['members', currentGroup?.id]);
      setShowEditModal(false);
      setSelectedMember(null);
      setFormErrors({});
      if (onChange) onChange();
    },
    onError: (error) => {
      setFormErrors({ submit: error.message || 'Failed to update member' });
    }
  });

  // Delete member mutation
  const deleteMemberMutation = useMutation({
    mutationFn: (memberId) => memberService.deleteMember(currentGroup?.id, memberId),
    onSuccess: () => {
      queryClient.invalidateQueries(['members', currentGroup?.id]);
      setSelectedMembers([]);
    },
    onError: (error) => {
      setFormErrors({ delete: error.message || 'Failed to delete member' });
    }
  });

  // Bulk update class mutation
  const bulkUpdateClassMutation = useMutation({
    mutationFn: ({ memberIds, classId }) => memberService.bulkUpdateClass(currentGroup?.id, memberIds, classId),
    onSuccess: () => {
      queryClient.invalidateQueries(['members', currentGroup?.id]);
      setSelectedMembers([]);
      setShowBulkActionsModal(false);
    },
    onError: (error) => {
      setFormErrors({ bulk: error.message || 'Failed to update member classes' });
    }
  });

  // Handle search
  const handleSearchChange = (value) => {
    setSearchTerm(value);
    setCurrentPage(1); // Reset to first page when searching
  };

  // Handle class filter change
  const handleClassFilterChange = (value) => {
    setSelectedClassFilter(value);
    setCurrentPage(1);
  };

  // Handle status filter change
  const handleStatusFilterChange = (value) => {
    setStatusFilter(value);
    setCurrentPage(1);
  };

  // Handle create member
  const handleCreateMember = (memberData) => {
    console.log('handleCreateMember called with:', {
      memberData,
      currentGroupId: currentGroup?.id,
      serviceUsed: 'memberService.createMember'
    });
    setFormErrors({});
    createMemberMutation.mutate(memberData);
  };

  // Handle edit member
  const handleEditMember = (member) => {
    setSelectedMember(member);
    setShowEditModal(true);
    setFormErrors({});
  };

  // Handle update member
  const handleUpdateMember = (memberData) => {
    setFormErrors({});
    updateMemberMutation.mutate({
      memberId: selectedMember.memberId,
      memberData
    });
  };

  // Handle delete member
  const handleDeleteMember = (memberId) => {
    if (window.confirm('Are you sure you want to delete this member?')) {
      setFormErrors({});
      deleteMemberMutation.mutate(memberId);
    }
  };

  // Handle bulk delete
  const handleBulkDelete = () => {
    if (window.confirm(`Are you sure you want to delete ${selectedMembers.length} members?`)) {
      setFormErrors({});
      selectedMembers.forEach(memberId => {
        deleteMemberMutation.mutate(memberId);
      });
    }
  };

  // Handle bulk class assignment
  const handleBulkClassAssignment = (classId) => {
    setFormErrors({});
    bulkUpdateClassMutation.mutate({
      memberIds: selectedMembers,
      classId
    });
  };

  // Handle member selection
  const handleMemberSelection = (memberIds) => {
    setSelectedMembers(memberIds);
  };

  // Handle pagination
  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  // Close modals
  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowBulkUploadModal(false);
    setShowBulkActionsModal(false);
    setSelectedMember(null);
    setFormErrors({});
  };

  // Prepare class options for filters and forms
  const classOptions = classesData?.classes?.map(cls => ({
    value: cls.classId,
    label: `${cls.name} (${cls.type})`
  })) || [];

  const statusOptions = [
    { value: 'active', label: 'Active Members' },
    { value: 'inactive', label: 'Inactive Members' },
    { value: 'all', label: 'All Members' }
  ];

  if (!currentGroup) {
    return (
      <div className="member-management-page">
        <div className="member-management-container">
          <div className="page-header">
            <div className="header-content">
              <h1>Select a Group</h1>
              <p>Choose a group to manage its members</p>
            </div>
            <div className="header-actions">
              <Button
                variant="primary"
                onClick={() => navigate('/workflow')}
              >
                Create New Group
              </Button>
            </div>
          </div>

          {isLoadingGroups ? (
            <div className="loading-container">
              <LoadingSpinner size="large" />
              <p>Loading groups...</p>
            </div>
          ) : groupsData?.data?.length > 0 ? (
            <div className="groups-grid">
              {groupsData.data.map((group) => (
                <div
                  key={group.groupId || group.id}
                  className="group-card"
                  onClick={() => {
                    // Ensure the group has an id field for consistency - use MongoDB _id
                    const normalizedGroup = {
                      ...group,
                      id: group._id || group.groupId || group.id
                    };
                    console.log('Setting current group:', normalizedGroup);
                    groupActions.setCurrentGroup(normalizedGroup);
                  }}
                >
                  <div className="group-card-header">
                    <h3>{group.name}</h3>
                    <span className="group-status">{group.status || 'Active'}</span>
                  </div>
                  <div className="group-card-body">
                    <div className="group-info-item">
                      <span className="label">Effective Date:</span>
                      <span className="value">{new Date(group.effectiveDate).toLocaleDateString()}</span>
                    </div>
                    <div className="group-info-item">
                      <span className="label">Members:</span>
                      <span className="value">{group.memberCount || 0}</span>
                    </div>
                  </div>
                  <div className="group-card-footer">
                    <Button variant="primary" size="small">
                      Select Group
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="no-groups-state">
              <div className="state-icon">📋</div>
              <h2>No Groups Found</h2>
              <p>Create your first group to start managing members.</p>
              <Button
                variant="primary"
                onClick={() => navigate('/workflow')}
              >
                Create First Group
              </Button>
            </div>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="member-management-page">
      <div className="member-management-container">
        {/* Header */}
        <div className="member-management-header">
          <div className="header-content">
            <h1>Member Management</h1>
            <p>Manage group members and their ICHRA class assignments for {currentGroup.name}</p>
          </div>
          <div className="header-actions">
            <Button
              variant="secondary"
              onClick={() => setShowBulkUploadModal(true)}
              disabled={isLoadingMembers}
            >
              Bulk Upload
            </Button>
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              disabled={isLoadingMembers}
            >
              Add Member
            </Button>
          </div>
        </div>

        {/* Members Overview */}
        {membersData && (
          <div className="members-overview">
            <div className="overview-cards">
              <div className="overview-card">
                <div className="card-value">{membersData.pagination?.total || 0}</div>
                <div className="card-label">Total Members</div>
              </div>
              <div className="overview-card">
                <div className="card-value">
                  {membersData.members?.filter(m => m.status === 'active').length || 0}
                </div>
                <div className="card-label">Active Members</div>
              </div>
              <div className="overview-card">
                <div className="card-value">
                  {membersData.members?.reduce((sum, m) => sum + (m.familySize || 1), 0) || 0}
                </div>
                <div className="card-label">Total Family Members</div>
              </div>
              <div className="overview-card">
                <div className="card-value">
                  ${membersData.members?.reduce((sum, m) => sum + (m.contributions?.employee || 0), 0).toLocaleString() || 0}
                </div>
                <div className="card-label">Monthly Employee Contributions</div>
              </div>
            </div>
          </div>
        )}

        {/* Filters and Search */}
        <div className="filters-section">
          <div className="filters-row">
            <div className="search-filter">
              <Input
                placeholder="Search members by name or ID..."
                value={searchTerm}
                onChange={handleSearchChange}
                disabled={isLoadingMembers}
                icon="🔍"
              />
            </div>
            
            <div className="class-filter">
              <Select
                placeholder="Filter by class"
                options={[{ value: '', label: 'All Classes' }, ...classOptions]}
                value={selectedClassFilter}
                onChange={handleClassFilterChange}
                disabled={isLoadingMembers || isLoadingClasses}
              />
            </div>
            
            <div className="status-filter">
              <Select
                options={statusOptions}
                value={statusFilter}
                onChange={handleStatusFilterChange}
                disabled={isLoadingMembers}
              />
            </div>
          </div>

          {/* Bulk Actions */}
          {selectedMembers.length > 0 && (
            <div className="bulk-actions">
              <div className="bulk-info">
                <span>{selectedMembers.length} member(s) selected</span>
              </div>
              <div className="bulk-buttons">
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => setShowBulkActionsModal(true)}
                  disabled={bulkUpdateClassMutation.isPending}
                >
                  Assign Class
                </Button>
                <Button
                  variant="danger"
                  size="small"
                  onClick={handleBulkDelete}
                  disabled={deleteMemberMutation.isPending}
                >
                  Delete Selected
                </Button>
                <Button
                  variant="outline"
                  size="small"
                  onClick={() => setSelectedMembers([])}
                >
                  Clear Selection
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* Members Table */}
        <div className="members-section">
          {isLoadingMembers ? (
            <div className="loading-container">
              <LoadingSpinner size="large" />
              <p>Loading members...</p>
            </div>
          ) : membersError ? (
            <ErrorMessage 
              message="Failed to load members"
              details={membersError.message}
            />
          ) : (
            <MemberTable
              members={membersData?.members || []}
              classes={classesData?.classes || []}
              selectedMembers={selectedMembers}
              onMemberSelection={handleMemberSelection}
              onEdit={handleEditMember}
              onDelete={handleDeleteMember}
              pagination={membersData?.pagination}
              onPageChange={handlePageChange}
              isLoading={
                createMemberMutation.isPending ||
                updateMemberMutation.isPending ||
                deleteMemberMutation.isPending ||
                bulkUpdateClassMutation.isPending
              }
            />
          )}

          {membersData?.members?.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">👥</div>
              <h3>No Members Found</h3>
              <p>
                {searchTerm || selectedClassFilter 
                  ? 'No members match your current filters. Try adjusting your search criteria.'
                  : 'Add your first group member to start managing ICHRA benefits.'
                }
              </p>
              {!searchTerm && !selectedClassFilter && (
                <div className="empty-actions">
                  <Button
                    variant="primary"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Add First Member
                  </Button>
                  <Button
                    variant="secondary"
                    onClick={() => setShowBulkUploadModal(true)}
                  >
                    Bulk Upload Members
                  </Button>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Workflow Continue Button */}
        {isWorkflowMode && membersData?.members?.length > 0 && (
          <div className="workflow-actions">
            <Button
              variant="primary"
              size="large"
              onClick={() => {
                if (onComplete) {
                  onComplete(membersData.members);
                }
              }}
            >
              Continue to Quote Generation
            </Button>
          </div>
        )}

        {/* Create Member Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={closeModals}
          title="Add New Member"
          size="large"
        >
          <MemberForm
            classes={classesData?.classes || []}
            onSubmit={handleCreateMember}
            onCancel={closeModals}
            isLoading={createMemberMutation.isPending}
            errors={formErrors}
            groupId={currentGroup?.id}
          />
        </Modal>

        {/* Edit Member Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={closeModals}
          title="Edit Member"
          size="large"
        >
          {selectedMember && (
            <MemberForm
              member={selectedMember}
              classes={classesData?.classes || []}
              onSubmit={handleUpdateMember}
              onCancel={closeModals}
              isLoading={updateMemberMutation.isPending}
              errors={formErrors}
              groupId={currentGroup?.id}
              isEditing={true}
            />
          )}
        </Modal>

        {/* Bulk Upload Modal */}
        <Modal
          isOpen={showBulkUploadModal}
          onClose={closeModals}
          title="Bulk Upload Members"
          size="extra-large"
        >
          <BulkUpload
            groupId={currentGroup?.id}
            classes={classesData?.classes || []}
            onClose={closeModals}
            onComplete={() => {
              queryClient.invalidateQueries(['members', currentGroup?.id]);
              closeModals();
            }}
          />
        </Modal>

        {/* Bulk Actions Modal */}
        <Modal
          isOpen={showBulkActionsModal}
          onClose={closeModals}
          title="Bulk Class Assignment"
          size="medium"
        >
          <div className="bulk-actions-modal">
            <p>Assign {selectedMembers.length} selected members to a class:</p>
            
            <div className="class-selection">
              <Select
                label="Select Class"
                placeholder="Choose a class..."
                options={classOptions}
                onChange={handleBulkClassAssignment}
                disabled={bulkUpdateClassMutation.isPending}
              />
            </div>

            {formErrors.bulk && (
              <ErrorMessage message={formErrors.bulk} />
            )}

            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={closeModals}
                disabled={bulkUpdateClassMutation.isPending}
              >
                Cancel
              </Button>
            </div>
          </div>
        </Modal>
      </div>
    </div>
  );
};

export default MemberManagementPage; 