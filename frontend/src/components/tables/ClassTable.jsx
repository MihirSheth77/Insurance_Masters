import React from 'react';
import Button from '../common/Button';
import {
  EditIcon,
  DeleteIcon,
  PersonIcon,
  ExpandMoreIcon,
  ExpandLessIcon
} from '../Icons/Icons';
import './ClassTable.css';

const ClassTable = ({ 
  classes = [], 
  onEdit, 
  onDelete, 
  onManageSubClasses,
  isLoading = false 
}) => {
  const [expandedRows, setExpandedRows] = React.useState([]);
  
  // Debug logging
  React.useEffect(() => {
    console.log('ClassTable rendered with classes:', classes);
  }, [classes]);

  const toggleExpand = (classId) => {
    setExpandedRows(prev => 
      prev.includes(classId) 
        ? prev.filter(id => id !== classId)
        : [...prev, classId]
    );
  };

  if (isLoading) {
    return <div className="loading">Loading classes...</div>;
  }

  if (classes.length === 0) {
    return (
      <div className="empty-state">
        <p>No classes defined yet. Create your first employee class to get started.</p>
      </div>
    );
  }

  return (
    <div className="class-table-container">
      <table className="class-table">
        <thead>
          <tr>
            <th>Class Name</th>
            <th>Type</th>
            <th>Employee Contribution</th>
            <th>Dependent Contribution</th>
            <th>Members</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {classes.map((classItem) => (
            <React.Fragment key={classItem._id || classItem.classId}>
              <tr className="class-row">
                <td className="class-name">
                  {classItem.ageBasedContributions?.length > 0 && (
                    <button
                      className="expand-btn"
                      onClick={() => toggleExpand(classItem._id || classItem.classId)}
                    >
                      {expandedRows.includes(classItem._id || classItem.classId) 
                        ? <ExpandLessIcon size={20} /> 
                        : <ExpandMoreIcon size={20} />
                      }
                    </button>
                  )}
                  <span>{classItem.name}</span>
                </td>
                <td className="class-type">{classItem.type}</td>
                <td className="contribution">
                  ${classItem.employeeContribution?.toFixed(2) || '0.00'}/mo
                </td>
                <td className="contribution">
                  ${classItem.dependentContribution?.toFixed(2) || '0.00'}/mo
                </td>
                <td className="member-count">
                  <PersonIcon size={16} />
                  <span>{classItem.memberCount || 0}</span>
                </td>
                <td className="actions">
                  <button
                    className="action-btn"
                    onClick={() => onEdit(classItem)}
                    title="Edit Class"
                  >
                    <EditIcon size={16} />
                  </button>
                  <button
                    className="action-btn danger"
                    onClick={() => onDelete(classItem._id || classItem.classId)}
                    title="Delete Class"
                    disabled={classItem.memberCount > 0}
                  >
                    <DeleteIcon size={16} />
                  </button>
                  {!classItem.parentClassId && (
                    <Button
                      variant="outline"
                      size="small"
                      onClick={() => onManageSubClasses(classItem)}
                    >
                      Age Bands
                    </Button>
                  )}
                </td>
              </tr>
              
              {/* Age-based contributions expanded view */}
              {expandedRows.includes(classItem._id || classItem.classId) && 
               classItem.ageBasedContributions?.length > 0 && (
                <tr className="expanded-row">
                  <td colSpan="6">
                    <div className="age-contributions">
                      <h4>Age-Based Contributions</h4>
                      <table className="age-table">
                        <thead>
                          <tr>
                            <th>Age Range</th>
                            <th>Employee Contribution</th>
                            <th>Dependent Contribution</th>
                          </tr>
                        </thead>
                        <tbody>
                          {classItem.ageBasedContributions.map((ageRange, index) => (
                            <tr key={index}>
                              <td>{ageRange.minAge} - {ageRange.maxAge}</td>
                              <td>${ageRange.employeeContribution?.toFixed(2)}/mo</td>
                              <td>${ageRange.dependentContribution?.toFixed(2)}/mo</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default ClassTable;