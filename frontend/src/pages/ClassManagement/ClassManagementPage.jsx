import React, { useState, useEffect } from 'react';
import { useParams, useOutletContext, useNavigate, useLocation } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useGroup } from '../../context/GroupContext';
import { groupService } from '../../services/groupService';

// Components
import ClassTable from '../../components/tables/ClassTable';
import ClassForm from '../../components/forms/ClassForm';
import SubClassManager from './SubClassManager';
import Button from '../../components/common/Button';
import Modal from '../../components/common/Modal';
import LoadingSpinner from '../../components/common/LoadingSpinner';
import ErrorMessage from '../../components/common/ErrorMessage';

// Services
import { classService } from '../../services/classService';

// Styles
import './ClassManagementPage.css';

const ClassManagementPage = ({ workflowData, onComplete, onChange, isWorkflowMode }) => {
  const { groupId: urlGroupId } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { state: groupState, actions: groupActions } = useGroup();
  const outletContext = useOutletContext() || {};
  const queryClient = useQueryClient();

  // Debug logging to understand the routing issue
  useEffect(() => {
    console.log('ClassManagementPage loaded with:', {
      pathname: location.pathname,
      isWorkflowMode,
      onComplete: !!onComplete,
      workflowData: !!workflowData,
      outletContext: !!outletContext,
      isQuoteWizardMode: false
    });
  }, [location.pathname, isWorkflowMode, onComplete, workflowData, outletContext]);
  
  // Determine group ID from multiple sources
  const groupId = urlGroupId || workflowData?.group?.id || groupState?.currentGroup?.groupId || outletContext?.wizardData?.groupId;
  
  // Fetch group data if we have a groupId but no group data
  const { data: groupData } = useQuery({
    queryKey: ['group', groupId],
    queryFn: () => groupService.getGroup(groupId),
    enabled: !!groupId && !groupState?.currentGroup,
    staleTime: 5 * 60 * 1000
  });
  
  const currentGroup = groupState?.currentGroup || groupData;

  // Query for all groups when no group is selected
  const {
    data: groupsData,
    isLoading: isLoadingGroups
  } = useQuery({
    queryKey: ['groups'],
    queryFn: () => groupService.getGroups({}),
    enabled: !currentGroup && !groupId,
    staleTime: 30000
  });

  // State management
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSubClassModal, setShowSubClassModal] = useState(false);
  const [selectedClass, setSelectedClass] = useState(null);
  const [deleteClassId, setDeleteClassId] = useState(null);
  const [formErrors, setFormErrors] = useState({});

  // Check if group is available
  useEffect(() => {
    if (!groupId) {
      console.warn('No group ID available');
      navigate('/groups');
    }
  }, [groupId, navigate]);

  // Query for classes
  const {
    data: classesData,
    isLoading: isLoadingClasses,
    error: classesError
  } = useQuery({
    queryKey: ['classes', groupId],
    queryFn: () => classService.getClasses(groupId),
    enabled: !!groupId,
    refetchOnWindowFocus: false,
    onSuccess: (data) => {
      console.log('Classes data loaded:', data);
    },
    onError: (error) => {
      console.error('Classes data error:', error);
    }
  });

  // Create class mutation
  const createClassMutation = useMutation({
    mutationFn: (classData) => classService.createClass(groupId, classData),
    onSuccess: (newClass) => {
      queryClient.invalidateQueries(['classes', groupId]);
      setShowCreateModal(false);
      setFormErrors({});
      if (onChange) onChange();
      
      // Auto-complete workflow step if in workflow mode and we have classes
      if (isWorkflowMode && onComplete) {
        console.log('Attempting auto-completion for workflow...', { isWorkflowMode, onComplete: !!onComplete });
        // Refetch classes and complete the step
        setTimeout(() => {
          classService.getClasses(groupId).then((updatedClasses) => {
            console.log('Fetched updated classes for auto-completion:', updatedClasses);
            if (updatedClasses.classes && updatedClasses.classes.length > 0) {
              console.log('✅ Auto-completing class definition step with classes:', updatedClasses.classes);
              onComplete(updatedClasses.classes);
            } else {
              console.warn('❌ No classes found for auto-completion');
            }
          }).catch(error => {
            console.error('❌ Error fetching classes for auto-completion:', error);
          });
        }, 500);
      }
    },
    onError: (error) => {
      setFormErrors({ submit: error.message || 'Failed to create class' });
    }
  });

  // Update class mutation
  const updateClassMutation = useMutation({
    mutationFn: ({ classId, classData }) => classService.updateClass(groupId, classId, classData),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes', groupId]);
      setShowEditModal(false);
      setSelectedClass(null);
      setFormErrors({});
      if (onChange) onChange();
    },
    onError: (error) => {
      setFormErrors({ submit: error.message || 'Failed to update class' });
    }
  });

  // Delete class mutation
  const deleteClassMutation = useMutation({
    mutationFn: (classId) => classService.deleteClass(groupId, classId),
    onSuccess: () => {
      queryClient.invalidateQueries(['classes', groupId]);
      setShowDeleteModal(false);
      setDeleteClassId(null);
      if (onChange) onChange();
    },
    onError: (error) => {
      setFormErrors({ delete: error.message || 'Failed to delete class' });
    }
  });

  // Handle create class
  const handleCreateClass = (classData) => {
    setFormErrors({});
    createClassMutation.mutate(classData);
  };

  // Handle edit class
  const handleEditClass = (classItem) => {
    setSelectedClass(classItem);
    setShowEditModal(true);
    setFormErrors({});
  };

  // Handle update class
  const handleUpdateClass = (classData) => {
    setFormErrors({});
    updateClassMutation.mutate({
      classId: selectedClass.classId,
      classData
    });
  };

  // Handle delete class
  const handleDeleteClass = (classId) => {
    setDeleteClassId(classId);
    setShowDeleteModal(true);
    setFormErrors({});
  };

  // Confirm delete
  const confirmDelete = () => {
    setFormErrors({});
    deleteClassMutation.mutate(deleteClassId);
  };

  // Handle sub-class management
  const handleManageSubClasses = (classItem) => {
    setSelectedClass(classItem);
    setShowSubClassModal(true);
  };

  // Close modals
  const closeModals = () => {
    setShowCreateModal(false);
    setShowEditModal(false);
    setShowDeleteModal(false);
    setShowSubClassModal(false);
    setSelectedClass(null);
    setDeleteClassId(null);
    setFormErrors({});
  };

  if (!currentGroup && !isWorkflowMode) {
    return (
      <div className="class-management-page">
        <div className="class-management-container">
          <div className="page-header">
            <div className="header-content">
              <h1>Select a Group</h1>
              <p>Choose a group to manage its ICHRA classes</p>
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
                  key={group.id || group.groupId}
                  className="group-card"
                  onClick={() => {
                    groupActions.setCurrentGroup(group);
                    window.location.reload();
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
                      <span className="label">Classes:</span>
                      <span className="value">{group.classCount || 0}</span>
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
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Groups Found</h3>
              <p>Create your first group to start managing ICHRA classes.</p>
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
    <div className="class-management-page">
      <div className="class-management-container">
        {/* Header */}
        <div className="class-management-header">
          <div className="header-content">
            <h1>ICHRA Class Management</h1>
            <p>Manage employee classes and contribution amounts for {currentGroup?.name || 'this group'}</p>
          </div>
          <div className="header-actions">
            <Button
              variant="primary"
              onClick={() => setShowCreateModal(true)}
              disabled={isLoadingClasses}
            >
              Create New Class
            </Button>
          </div>
        </div>

        {/* Classes Overview */}
        {(() => {
          console.log('Debug - Classes Overview render check:', {
            classesData: !!classesData,
            classesDataContent: classesData,
            isLoading: isLoadingClasses,
            error: classesError,
            groupId
          });
          return classesData;
        })() && (
          <div className="classes-overview">
            <div className="overview-cards">
              <div className="overview-card">
                <div className="card-value">
                  {(() => {
                    const count = classesData?.classes?.length || 0;
                    console.log('Debug - Total Classes:', count, 'classesData:', classesData);
                    return count;
                  })()}
                </div>
                <div className="card-label">Total Classes</div>
              </div>
              <div className="overview-card members-card">
                <div className="card-value">
                  {classesData.classes?.reduce((sum, cls) => sum + (cls.statistics?.memberCount || 0), 0) || 0}
                </div>
                <div className="card-label">Total Members</div>
                <div className="card-action" style={{ marginTop: '12px' }}>
                  <Button
                    variant="primary"
                    size="small"
                    onClick={() => {
                      // Get current group info
                      const group = groupState?.currentGroup || workflowData?.group;
                      const groupIdToUse = group?.id || group?.groupId || groupId;
                      
                      console.log('Add Members clicked:', { 
                        group, 
                        groupIdToUse,
                        groupState: groupState?.currentGroup,
                        workflowData: workflowData?.group
                      });
                      
                      if (groupIdToUse && group) {
                        // Ensure the group is set in context before navigating
                        const normalizedGroup = {
                          ...group,
                          id: groupIdToUse,
                          groupId: groupIdToUse
                        };
                        
                        groupActions.setCurrentGroup(normalizedGroup);
                        
                        // Navigate to member management
                        setTimeout(() => {
                          navigate(`/groups/${groupIdToUse}/members`);
                        }, 100);
                      } else {
                        console.error('No group available for member management');
                        // Fallback: navigate to groups page to select a group
                        navigate('/groups');
                      }
                    }}
                    style={{ fontSize: '12px', padding: '6px 12px' }}
                  >
                    Add Members
                  </Button>
                </div>
              </div>
              <div className="overview-card">
                <div className="card-value">
                  ${classesData.classes?.reduce((sum, cls) => {
                    const employeeContrib = cls.statistics?.totalEmployeeContribution || 0;
                    const dependentContrib = cls.statistics?.totalDependentContribution || 0;
                    return sum + employeeContrib + dependentContrib;
                  }, 0).toLocaleString() || 0}
                </div>
                <div className="card-label">Monthly Contributions</div>
              </div>
            </div>
          </div>
        )}

        {/* Classes Table */}
        <div className="classes-section">
          <div className="section-header">
            <h2>Employee Classes</h2>
            <p>Define employee classifications and contribution amounts</p>
          </div>

          {isLoadingClasses ? (
            <div className="loading-container">
              <LoadingSpinner size="large" />
              <p>Loading classes...</p>
            </div>
          ) : classesError ? (
            <ErrorMessage 
              message="Failed to load classes"
              details={classesError.message}
            />
          ) : (
            <ClassTable
              classes={classesData?.classes || []}
              onEdit={handleEditClass}
              onDelete={handleDeleteClass}
              onManageSubClasses={handleManageSubClasses}
              isLoading={
                createClassMutation.isPending ||
                updateClassMutation.isPending ||
                deleteClassMutation.isPending
              }
            />
          )}

          {classesData?.classes?.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📋</div>
              <h3>No Classes Created</h3>
              <p>Create your first employee class to start managing ICHRA contributions.</p>
              <Button
                variant="primary"
                onClick={() => setShowCreateModal(true)}
              >
                Create First Class
              </Button>
            </div>
          )}
        </div>

        {/* Workflow Continue Button */}
        {isWorkflowMode && classesData?.classes?.length > 0 && (
          <div className="workflow-actions" style={{ background: '#f0f9ff', border: '2px solid #0ea5e9', borderRadius: '8px', padding: '24px', margin: '24px 0' }}>
            <h3 style={{ color: '#0c4a6e', marginTop: 0 }}>✅ Classes Created - Ready to Continue!</h3>
            <p style={{ color: '#0c4a6e' }}>
              You have created {classesData.classes.length} class{classesData.classes.length !== 1 ? 'es' : ''}. 
              Click below to continue to member onboarding.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <Button
                variant="primary"
                size="large"
                onClick={() => {
                  console.log('🎯 Manual continue clicked', { classesData: classesData.classes });
                  if (onComplete) {
                    onComplete(classesData.classes);
                  } else {
                    console.warn('onComplete not available, forcing navigation');
                    window.location.href = '/workflow/member-onboarding';
                  }
                }}
                style={{ background: '#0ea5e9', fontSize: '16px', padding: '12px 24px' }}
              >
                Continue to Member Onboarding →
              </Button>
              <Button
                variant="outline"
                size="large"
                onClick={() => {
                  console.log('🚀 Force navigation clicked');
                  window.location.href = '/workflow/member-onboarding';
                }}
                style={{ fontSize: '16px', padding: '12px 24px' }}
              >
                Force Next Step →
              </Button>
            </div>
          </div>
        )}


        {/* Create Class Modal */}
        <Modal
          isOpen={showCreateModal}
          onClose={closeModals}
          title="Create New Class"
          size="large"
        >
          <ClassForm
            onSubmit={handleCreateClass}
            onCancel={closeModals}
            isLoading={createClassMutation.isPending}
            errors={formErrors}
            groupId={currentGroup?.groupId || currentGroup?.id}
          />
        </Modal>

        {/* Edit Class Modal */}
        <Modal
          isOpen={showEditModal}
          onClose={closeModals}
          title="Edit Class"
          size="large"
        >
          {selectedClass && (
            <ClassForm
              initialData={selectedClass}
              onSubmit={handleUpdateClass}
              onCancel={closeModals}
              isLoading={updateClassMutation.isPending}
              errors={formErrors}
              groupId={currentGroup?.groupId || currentGroup?.id}
              isEditing={true}
            />
          )}
        </Modal>

        {/* Delete Confirmation Modal */}
        <Modal
          isOpen={showDeleteModal}
          onClose={closeModals}
          title="Delete Class"
          size="medium"
        >
          <div className="delete-confirmation">
            <div className="warning-icon">⚠️</div>
            <h3>Are you sure you want to delete this class?</h3>
            <p>
              This action cannot be undone. All members assigned to this class will need to be 
              reassigned to another class.
            </p>
            
            {formErrors.delete && (
              <ErrorMessage message={formErrors.delete} />
            )}

            <div className="modal-actions">
              <Button
                variant="secondary"
                onClick={closeModals}
                disabled={deleteClassMutation.isPending}
              >
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={confirmDelete}
                loading={deleteClassMutation.isPending}
              >
                Delete Class
              </Button>
            </div>
          </div>
        </Modal>

        {/* Sub-Class Management Modal */}
        <Modal
          isOpen={showSubClassModal}
          onClose={closeModals}
          title={`Manage Sub-Classes: ${selectedClass?.name}`}
          size="extra-large"
        >
          {selectedClass && (
            <SubClassManager
              parentClass={selectedClass}
              groupId={currentGroup?.groupId || currentGroup?.id}
              onClose={closeModals}
              onUpdate={() => {
                queryClient.invalidateQueries(['classes', groupId]);
              }}
            />
          )}
        </Modal>
      </div>
    </div>
  );
};

export default ClassManagementPage; 