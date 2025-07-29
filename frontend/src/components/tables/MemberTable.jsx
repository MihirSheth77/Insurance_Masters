// Member listing table
import React from 'react';
import formatters from '../../utils/formatters';
import Button from '../common/Button';
import './MemberTable.css';

const MemberTable = ({
  members = [],
  classes = [],
  loading = false,
  onEdit,
  onDelete,
  onBulkAction,
  selectedMembers = [],
  onSelectMember,
  onSelectAll,
  className = ''
}) => {
  const handleSelectAll = (e) => {
    if (onSelectAll) {
      onSelectAll(e.target.checked ? members.map(m => m.id) : []);
    }
  };

  const handleSelectMember = (memberId, checked) => {
    if (onSelectMember) {
      onSelectMember(memberId, checked);
    }
  };

  const getClassName = (classId) => {
    const classObj = classes.find(c => c.id === classId);
    return classObj ? classObj.name : 'Unknown Class';
  };

  const getClassType = (classId) => {
    const classObj = classes.find(c => c.id === classId);
    return classObj ? classObj.type : 'unknown';
  };

  if (loading) {
    return (
      <div className="member-table-loading">
        <div className="loading-placeholder">
          <div className="loading-row header"></div>
          {[...Array(5)].map((_, i) => (
            <div key={i} className="loading-row"></div>
          ))}
        </div>
      </div>
    );
  }

  if (members.length === 0) {
    return (
      <div className="member-table-empty">
        <div className="empty-state">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" strokeWidth="2"/>
            <circle cx="12" cy="7" r="4" stroke="currentColor" strokeWidth="2"/>
          </svg>
          <h3>No Members Found</h3>
          <p>Start by adding your first group member or uploading a CSV file.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`member-table ${className}`.trim()}>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th className="checkbox-column">
                <input
                  type="checkbox"
                  checked={selectedMembers.length === members.length && members.length > 0}
                  onChange={handleSelectAll}
                  aria-label="Select all members"
                />
              </th>
              <th>Name</th>
              <th>Age</th>
              <th>ZIP Code</th>
              <th>ICHRA Class</th>
              <th>Previous Plan</th>
              <th>Previous Contributions</th>
              <th>Dependents</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member.memberId || member._id || member.id} className={selectedMembers.includes(member.memberId || member._id || member.id) ? 'selected' : ''}>
                <td className="checkbox-column">
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(member.memberId || member._id || member.id)}
                    onChange={(e) => handleSelectMember(member.memberId || member._id || member.id, e.target.checked)}
                    aria-label={`Select ${formatters.formatName(member.personalInfo.firstName, member.personalInfo.lastName)}`}
                  />
                </td>
                <td className="name-column">
                  <div className="member-name">
                    <span className="full-name">
                      {formatters.formatName(member.personalInfo.firstName, member.personalInfo.lastName)}
                    </span>
                    {member.personalInfo.tobacco && (
                      <span className="tobacco-indicator" title="Tobacco User">🚬</span>
                    )}
                  </div>
                </td>
                <td>
                  {formatters.formatAge(member.personalInfo.dateOfBirth)}
                </td>
                <td>
                  {member.personalInfo.zipCode}
                </td>
                <td>
                  <div className="class-info">
                    <span className="class-name">{getClassName(member.classId)}</span>
                    <span className={`class-type class-type--${getClassType(member.classId)}`}>
                      {formatters.formatStatus(getClassType(member.classId))}
                    </span>
                  </div>
                </td>
                <td>
                  <div className="plan-info">
                    <span className="plan-name">{member.previousContributions.planName}</span>
                    {member.previousContributions.metalLevel && member.previousContributions.metalLevel !== 'Other' && (
                      <span className={`metal-level metal-level--${member.previousContributions.metalLevel.toLowerCase()}`}>
                        {formatters.formatMetalLevel(member.previousContributions.metalLevel)}
                      </span>
                    )}
                  </div>
                </td>
                <td>
                  <div className="contributions">
                    <div className="contribution-row">
                      <span className="label">Employer:</span>
                      <span className="amount">
                        {formatters.formatCurrency(member.previousContributions.employerContribution)}
                      </span>
                    </div>
                    <div className="contribution-row">
                      <span className="label">Employee:</span>
                      <span className="amount">
                        {formatters.formatCurrency(member.previousContributions.memberContribution)}
                      </span>
                    </div>
                  </div>
                </td>
                <td>
                  <div className="dependents-info">
                    {member.dependents && member.dependents.length > 0 ? (
                      <span className="dependent-count">
                        {member.dependents.length} dependent{member.dependents.length > 1 ? 's' : ''}
                      </span>
                    ) : (
                      <span className="no-dependents">None</span>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`status status--${member.status || 'active'}`}>
                    {formatters.formatStatus(member.status || 'active')}
                  </span>
                </td>
                <td className="actions-column">
                  <div className="action-buttons">
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => onEdit && onEdit(member)}
                      aria-label={`Edit ${formatters.formatName(member.personalInfo.firstName, member.personalInfo.lastName)}`}
                    >
                      Edit
                    </Button>
                    <Button
                      variant="danger"
                      size="small"
                      onClick={() => onDelete && onDelete(member)}
                      aria-label={`Delete ${formatters.formatName(member.personalInfo.firstName, member.personalInfo.lastName)}`}
                    >
                      Delete
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Bulk Actions Footer */}
      {selectedMembers.length > 0 && (
        <div className="bulk-actions">
          <div className="selection-info">
            <span>{selectedMembers.length} member{selectedMembers.length > 1 ? 's' : ''} selected</span>
          </div>
          <div className="bulk-action-buttons">
            <Button
              variant="outline"
              size="small"
              onClick={() => onBulkAction && onBulkAction('change-class', selectedMembers)}
            >
              Change Class
            </Button>
            <Button
              variant="danger"
              size="small"
              onClick={() => onBulkAction && onBulkAction('delete', selectedMembers)}
            >
              Delete Selected
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};

export default MemberTable; 