import api from './api';

export const classService = {
  /**
   * Get all classes for a group
   * @param {string} groupId - Group ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Classes data
   */
  async getClasses(groupId, options = {}) {
    try {
      const params = {
        includeInactive: options.includeInactive || false,
        ...options
      };

      const response = await api.get(`/groups/${groupId}/classes`, { params });

      return {
        success: true,
        classes: response.data.data?.classes || response.data.classes || [],
        groupId: response.data.data?.groupId || response.data.groupId,
        groupName: response.data.data?.groupName || response.data.groupName,
        total: response.data.data?.summary?.totalClasses || response.data.total || 0
      };
    } catch (error) {
      
      if (error.response?.status === 404) {
        throw new Error('Group not found');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch classes. Please try again.');
      }
    }
  },

  /**
   * Create a new class
   * @param {string} groupId - Group ID
   * @param {Object} classData - Class data
   * @returns {Promise<Object>} - Created class
   */
  async createClass(groupId, classData) {
    try {
      
      const payload = {
        name: classData.name,
        type: classData.type || 'full-time',
        parentClassId: classData.parentClassId || null,
        employeeContribution: parseFloat(classData.employeeContribution) || 0,
        dependentContribution: parseFloat(classData.dependentContribution) || 0,
        criteria: classData.criteria || {}
      };
      
      
      const response = await api.post(`/groups/${groupId}/classes`, payload);

      return {
        success: true,
        class: response.data.data || response.data.class,
        classId: response.data.data?.classId || response.data.classId
      };
    } catch (error) {
      
      if (error.response?.status === 400) {
        throw new Error('Missing required fields');
      } else if (error.response?.status === 404) {
        throw new Error('Group not found');
      } else if (error.response?.status === 409) {
        throw new Error('Class name already exists');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid class data';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to create class. Please try again.');
      }
    }
  },

  /**
   * Update an existing class
   * @param {string} groupId - Group ID
   * @param {string} classId - Class ID
   * @param {Object} classData - Updated class data
   * @returns {Promise<Object>} - Updated class
   */
  async updateClass(groupId, classId, classData) {
    try {
      const response = await api.put(`/groups/${groupId}/classes/${classId}`, {
        name: classData.name,
        type: classData.type,
        employeeContribution: parseFloat(classData.employeeContribution),
        dependentContribution: parseFloat(classData.dependentContribution),
        criteria: classData.criteria || {},
        isActive: classData.isActive !== undefined ? classData.isActive : true
      });

      return {
        success: true,
        class: response.data.class
      };
    } catch (error) {
      
      if (error.response?.status === 404) {
        throw new Error('Class not found');
      } else if (error.response?.status === 409) {
        throw new Error('Class name already exists');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid class data';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to update class. Please try again.');
      }
    }
  },

  /**
   * Delete a class
   * @param {string} groupId - Group ID
   * @param {string} classId - Class ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteClass(groupId, classId) {
    try {
      const response = await api.delete(`/groups/${groupId}/classes/${classId}`);

      return {
        success: true,
        message: response.data.message || 'Class deleted successfully'
      };
    } catch (error) {
      
      if (error.response?.status === 404) {
        throw new Error('Class not found');
      } else if (error.response?.status === 409) {
        throw new Error('Cannot delete class with assigned members');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to delete class. Please try again.');
      }
    }
  },

  /**
   * Create or update sub-classes (age-based contributions)
   * @param {string} groupId - Group ID
   * @param {string} classId - Parent class ID
   * @param {Object} subClassData - Sub-class data
   * @returns {Promise<Object>} - Sub-class creation result
   */
  async createSubClasses(groupId, classId, subClassData) {
    try {
      const response = await api.post(`/groups/${groupId}/classes/${classId}/subclasses`, {
        ageBasedContributions: subClassData.ageBasedContributions.map(range => ({
          minAge: parseInt(range.minAge),
          maxAge: parseInt(range.maxAge),
          employeeContribution: parseFloat(range.employeeContribution),
          dependentContribution: parseFloat(range.dependentContribution)
        }))
      });

      return {
        success: true,
        class: response.data.class,
        ageBasedContributions: response.data.ageBasedContributions
      };
    } catch (error) {
      
      if (error.response?.status === 400) {
        throw new Error('Age-based contributions are required');
      } else if (error.response?.status === 404) {
        throw new Error('Class not found');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid age range data';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to create sub-classes. Please try again.');
      }
    }
  },

  /**
   * Get class details with sub-classes
   * @param {string} groupId - Group ID
   * @param {string} classId - Class ID
   * @returns {Promise<Object>} - Detailed class data
   */
  async getClassDetails(groupId, classId) {
    try {
      const response = await api.get(`/groups/${groupId}/classes/${classId}`);

      return {
        success: true,
        class: response.data.class,
        memberCount: response.data.memberCount,
        totalContributions: response.data.totalContributions,
        ageBasedContributions: response.data.ageBasedContributions || []
      };
    } catch (error) {
      
      if (error.response?.status === 404) {
        throw new Error('Class not found');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch class details. Please try again.');
      }
    }
  },

  /**
   * Validate class data before submission
   * @param {Object} classData - Class data to validate
   * @returns {Object} - Validation result
   */
  validateClassData(classData) {
    const errors = {};

    // Name validation
    if (!classData.name || classData.name.trim().length === 0) {
      errors.name = 'Class name is required';
    } else if (classData.name.trim().length > 100) {
      errors.name = 'Class name must be 100 characters or less';
    }

    // Type validation
    const validTypes = ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'executive', 'contractor'];
    if (!classData.type) {
      errors.type = 'Class type is required';
    } else if (!validTypes.includes(classData.type)) {
      errors.type = 'Invalid class type';
    }

    // Employee contribution validation
    if (classData.employeeContribution === undefined || classData.employeeContribution === '') {
      errors.employeeContribution = 'Employee contribution is required';
    } else {
      const empContrib = parseFloat(classData.employeeContribution);
      if (isNaN(empContrib) || empContrib < 0) {
        errors.employeeContribution = 'Employee contribution must be a positive number';
      } else if (empContrib > 10000) {
        errors.employeeContribution = 'Employee contribution cannot exceed $10,000';
      }
    }

    // Dependent contribution validation
    if (classData.dependentContribution === undefined || classData.dependentContribution === '') {
      errors.dependentContribution = 'Dependent contribution is required';
    } else {
      const depContrib = parseFloat(classData.dependentContribution);
      if (isNaN(depContrib) || depContrib < 0) {
        errors.dependentContribution = 'Dependent contribution must be a positive number';
      } else if (depContrib > 10000) {
        errors.dependentContribution = 'Dependent contribution cannot exceed $10,000';
      }
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  },

  /**
   * Validate age-based contribution ranges
   * @param {Array} ageRanges - Array of age range objects
   * @returns {Object} - Validation result
   */
  validateAgeRanges(ageRanges) {
    const errors = [];

    if (!ageRanges || ageRanges.length === 0) {
      return {
        isValid: false,
        errors: [{ general: 'At least one age range is required' }]
      };
    }

    // Sort ranges by minAge for overlap checking
    const sortedRanges = [...ageRanges].sort((a, b) => parseInt(a.minAge) - parseInt(b.minAge));

    sortedRanges.forEach((range, index) => {
      const rangeErrors = {};

      // Age validation
      const minAge = parseInt(range.minAge);
      const maxAge = parseInt(range.maxAge);

      if (isNaN(minAge) || minAge < 18 || minAge > 99) {
        rangeErrors.minAge = 'Minimum age must be between 18 and 99';
      }

      if (isNaN(maxAge) || maxAge < 18 || maxAge > 99) {
        rangeErrors.maxAge = 'Maximum age must be between 18 and 99';
      }

      if (!isNaN(minAge) && !isNaN(maxAge) && minAge >= maxAge) {
        rangeErrors.maxAge = 'Maximum age must be greater than minimum age';
      }

      // Contribution validation
      const empContrib = parseFloat(range.employeeContribution);
      const depContrib = parseFloat(range.dependentContribution);

      if (isNaN(empContrib) || empContrib < 0) {
        rangeErrors.employeeContribution = 'Employee contribution must be a positive number';
      }

      if (isNaN(depContrib) || depContrib < 0) {
        rangeErrors.dependentContribution = 'Dependent contribution must be a positive number';
      }

      // Overlap checking
      if (!isNaN(minAge) && !isNaN(maxAge)) {
        for (let i = 0; i < sortedRanges.length; i++) {
          if (i === index) continue;

          const otherRange = sortedRanges[i];
          const otherMinAge = parseInt(otherRange.minAge);
          const otherMaxAge = parseInt(otherRange.maxAge);

          if (!isNaN(otherMinAge) && !isNaN(otherMaxAge)) {
            if (minAge <= otherMaxAge && maxAge >= otherMinAge) {
              rangeErrors.overlap = `Age range overlaps with another range (${otherMinAge}-${otherMaxAge})`;
              break;
            }
          }
        }
      }

      if (Object.keys(rangeErrors).length > 0) {
        errors[index] = rangeErrors;
      }
    });

    return {
      isValid: errors.length === 0,
      errors
    };
  }
}; 