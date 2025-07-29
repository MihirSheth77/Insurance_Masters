import api from './api';

export const memberService = {
  /**
   * Get all members for a group with filtering and pagination
   * @param {string} groupId - Group ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} - Members data with pagination
   */
  async getMembers(groupId, options = {}) {
    try {
      const params = {
        search: options.search || '',
        classId: options.classId || '',
        includeInactive: options.includeInactive || false,
        page: options.page || 1,
        limit: options.limit || 20,
        ...options
      };

      const response = await api.get(`/groups/${groupId}/members`, { params });
      
      console.log('🔍 Raw API response:', response.data);

      // Backend returns data in response.data.data structure
      const apiData = response.data.data || response.data;
      
      return {
        success: true,
        members: apiData.members || [],
        pagination: apiData.pagination || {},
        groupId: apiData.groupId || groupId,
        groupName: apiData.groupName || '',
        filters: apiData.filters || {}
      };
    } catch (error) {
      console.error('Error fetching members:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Group not found');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch members. Please try again.');
      }
    }
  },

  /**
   * Create a new member
   * @param {string} groupId - Group ID
   * @param {Object} memberData - Member data
   * @returns {Promise<Object>} - Created member
   */
  async createMember(groupId, memberData) {
    try {
      const response = await api.post(`/groups/${groupId}/members`, {
        classId: memberData.classId,
        personalInfo: {
          firstName: memberData.personalInfo.firstName.trim(),
          lastName: memberData.personalInfo.lastName.trim(),
          dateOfBirth: memberData.personalInfo.dateOfBirth,
          zipCode: memberData.personalInfo.zipCode,
          tobacco: memberData.personalInfo.tobacco || false
        },
        previousContributions: {
          employerContribution: parseFloat(memberData.previousContributions.employerContribution),
          memberContribution: parseFloat(memberData.previousContributions.memberContribution),
          planName: memberData.previousContributions.planName.trim(),
          planType: memberData.previousContributions.planType || 'Other',
          metalLevel: memberData.previousContributions.metalLevel || 'Other',
          carrier: memberData.previousContributions.carrier || null
        },
        dependents: memberData.dependents || []
      });

      return {
        success: true,
        member: response.data.data || response.data.member,
        memberId: response.data.data?.memberId || response.data.memberId
      };
    } catch (error) {
      console.error('Error creating member:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Missing required fields');
      } else if (error.response?.status === 404) {
        throw new Error('Group or class not found');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid member data';
        throw new Error(errorMessage);
      } else if (error.response?.status === 429) {
        throw new Error('Rate limit exceeded. Please try again later.');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to create member. Please try again.');
      }
    }
  },

  /**
   * Update an existing member
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @param {Object} memberData - Updated member data
   * @returns {Promise<Object>} - Updated member
   */
  async updateMember(groupId, memberId, memberData) {
    try {
      const response = await api.put(`/groups/${groupId}/members/${memberId}`, {
        classId: memberData.classId,
        personalInfo: {
          firstName: memberData.personalInfo.firstName.trim(),
          lastName: memberData.personalInfo.lastName.trim(),
          dateOfBirth: memberData.personalInfo.dateOfBirth,
          zipCode: memberData.personalInfo.zipCode,
          tobacco: memberData.personalInfo.tobacco || false
        },
        previousContributions: {
          employerContribution: parseFloat(memberData.previousContributions.employerContribution),
          memberContribution: parseFloat(memberData.previousContributions.memberContribution),
          planName: memberData.previousContributions.planName.trim(),
          planType: memberData.previousContributions.planType || 'Other',
          metalLevel: memberData.previousContributions.metalLevel || 'Other',
          carrier: memberData.previousContributions.carrier || null
        },
        dependents: memberData.dependents || [],
        status: memberData.status || 'active'
      });

      return {
        success: true,
        member: response.data.member
      };
    } catch (error) {
      console.error('Error updating member:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Member not found');
      } else if (error.response?.status === 422) {
        const errorMessage = error.response?.data?.error || 'Invalid member data';
        throw new Error(errorMessage);
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to update member. Please try again.');
      }
    }
  },

  /**
   * Delete a member
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} - Deletion result
   */
  async deleteMember(groupId, memberId) {
    try {
      const response = await api.delete(`/groups/${groupId}/members/${memberId}`);

      return {
        success: true,
        message: response.data.message || 'Member deleted successfully'
      };
    } catch (error) {
      console.error('Error deleting member:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Member not found');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to delete member. Please try again.');
      }
    }
  },

  /**
   * Bulk upload members via CSV
   * @param {string} groupId - Group ID
   * @param {FormData} formData - Form data with CSV file
   * @param {Object} options - Upload options
   * @returns {Promise<Object>} - Upload results
   */
  async bulkUpload(groupId, formData, options = {}) {
    try {
      const response = await api.post(`/groups/${groupId}/members/bulk`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: options.onUploadProgress,
        timeout: 300000 // 5 minutes timeout for large files
      });

      // Check the actual response structure
      console.log('Bulk upload response:', response.data);
      
      // Handle the nested data structure from backend
      const responseData = response.data.data || response.data;
      
      return {
        success: true,
        summary: responseData.summary || {},
        successfulMembers: responseData.successfulMembers || [],
        errors: responseData.errors || []
      };
    } catch (error) {
      console.error('Error during bulk upload:', error);
      
      if (error.response?.status === 400) {
        throw new Error('CSV file is required');
      } else if (error.response?.status === 404) {
        throw new Error('Group or default class not found');
      } else if (error.response?.status === 413) {
        throw new Error('File size too large. Maximum 10MB allowed');
      } else if (error.response?.status === 415) {
        throw new Error('Only CSV files are allowed');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid CSV format or data');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else if (error.code === 'ECONNABORTED') {
        throw new Error('Upload timeout. Please try with a smaller file.');
      } else {
        throw new Error('Failed to upload members. Please try again.');
      }
    }
  },

  /**
   * Bulk update member classes
   * @param {string} groupId - Group ID
   * @param {Array} memberIds - Array of member IDs
   * @param {string} classId - New class ID
   * @returns {Promise<Object>} - Update result
   */
  async bulkUpdateClass(groupId, memberIds, classId) {
    try {
      const response = await api.patch(`/groups/${groupId}/members/bulk-update-class`, {
        memberIds,
        classId
      });

      return {
        success: true,
        updatedCount: response.data.updatedCount || 0,
        message: response.data.message || 'Members updated successfully'
      };
    } catch (error) {
      console.error('Error updating member classes:', error);
      
      if (error.response?.status === 400) {
        throw new Error('Member IDs and class ID are required');
      } else if (error.response?.status === 404) {
        throw new Error('Group or class not found');
      } else if (error.response?.status === 422) {
        throw new Error('Invalid member IDs or class ID');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to update member classes. Please try again.');
      }
    }
  },

  /**
   * Get member details
   * @param {string} groupId - Group ID
   * @param {string} memberId - Member ID
   * @returns {Promise<Object>} - Detailed member data
   */
  async getMemberDetails(groupId, memberId) {
    try {
      const response = await api.get(`/groups/${groupId}/members/${memberId}`);

      return {
        success: true,
        member: response.data.member,
        contributions: response.data.contributions,
        familySize: response.data.familySize,
        dependents: response.data.dependents || []
      };
    } catch (error) {
      console.error('Error fetching member details:', error);
      
      if (error.response?.status === 404) {
        throw new Error('Member not found');
      } else if (error.response?.status === 503) {
        throw new Error('Service temporarily unavailable. Please try again.');
      } else {
        throw new Error('Failed to fetch member details. Please try again.');
      }
    }
  },

  /**
   * Validate member data before submission
   * @param {Object} memberData - Member data to validate
   * @returns {Object} - Validation result
   */
  validateMemberData(memberData) {
    const errors = {};

    // Class validation
    if (!memberData.classId) {
      errors.classId = 'ICHRA class is required';
    }

    // Personal info validation
    if (!memberData.personalInfo) {
      errors.personalInfo = 'Personal information is required';
    } else {
      // First name validation
      if (!memberData.personalInfo.firstName || memberData.personalInfo.firstName.trim().length === 0) {
        errors.firstName = 'First name is required';
      } else if (memberData.personalInfo.firstName.trim().length > 50) {
        errors.firstName = 'First name must be 50 characters or less';
      }

      // Last name validation
      if (!memberData.personalInfo.lastName || memberData.personalInfo.lastName.trim().length === 0) {
        errors.lastName = 'Last name is required';
      } else if (memberData.personalInfo.lastName.trim().length > 50) {
        errors.lastName = 'Last name must be 50 characters or less';
      }

      // Date of birth validation
      if (!memberData.personalInfo.dateOfBirth) {
        errors.dateOfBirth = 'Date of birth is required';
      } else {
        const dob = new Date(memberData.personalInfo.dateOfBirth);
        if (isNaN(dob.getTime())) {
          errors.dateOfBirth = 'Invalid date of birth';
        } else {
          const age = Math.floor((new Date() - dob) / (365.25 * 24 * 60 * 60 * 1000));
          if (age < 18 || age > 99) {
            errors.dateOfBirth = 'Age must be between 18 and 99';
          }
        }
      }

      // ZIP code validation (5-digit US ZIP code)
      if (!memberData.personalInfo.zipCode) {
        errors.zipCode = 'ZIP code is required';
      } else {
        const zipNum = parseInt(memberData.personalInfo.zipCode);
        if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
          errors.zipCode = 'ZIP code must be a valid 5-digit ZIP code';
        }
      }
    }

    // Previous contributions validation
    if (!memberData.previousContributions) {
      errors.previousContributions = 'Previous contributions information is required';
    } else {
      // Employer contribution validation
      if (memberData.previousContributions.employerContribution === undefined || 
          memberData.previousContributions.employerContribution === '') {
        errors.employerContribution = 'Previous employer contribution is required';
      } else {
        const empContrib = parseFloat(memberData.previousContributions.employerContribution);
        if (isNaN(empContrib) || empContrib < 0) {
          errors.employerContribution = 'Employer contribution must be a positive number';
        } else if (empContrib > 10000) {
          errors.employerContribution = 'Employer contribution cannot exceed $10,000';
        }
      }

      // Member contribution validation
      if (memberData.previousContributions.memberContribution === undefined || 
          memberData.previousContributions.memberContribution === '') {
        errors.memberContribution = 'Previous member contribution is required';
      } else {
        const memContrib = parseFloat(memberData.previousContributions.memberContribution);
        if (isNaN(memContrib) || memContrib < 0) {
          errors.memberContribution = 'Member contribution must be a positive number';
        } else if (memContrib > 10000) {
          errors.memberContribution = 'Member contribution cannot exceed $10,000';
        }
      }

      // Plan name validation
      if (!memberData.previousContributions.planName || 
          memberData.previousContributions.planName.trim().length === 0) {
        errors.planName = 'Previous plan name is required';
      } else if (memberData.previousContributions.planName.trim().length > 100) {
        errors.planName = 'Plan name must be 100 characters or less';
      }
    }

    // Dependents validation
    if (memberData.dependents && Array.isArray(memberData.dependents)) {
      memberData.dependents.forEach((dependent, index) => {
        const depErrors = {};

        if (!dependent.firstName || dependent.firstName.trim().length === 0) {
          depErrors.firstName = 'Dependent first name is required';
        }

        if (!dependent.lastName || dependent.lastName.trim().length === 0) {
          depErrors.lastName = 'Dependent last name is required';
        }

        if (!dependent.dateOfBirth) {
          depErrors.dateOfBirth = 'Dependent date of birth is required';
        } else {
          const depDob = new Date(dependent.dateOfBirth);
          if (isNaN(depDob.getTime())) {
            depErrors.dateOfBirth = 'Invalid dependent date of birth';
          }
        }

        if (!dependent.relationship) {
          depErrors.relationship = 'Dependent relationship is required';
        } else if (!['spouse', 'child', 'domestic_partner', 'other'].includes(dependent.relationship)) {
          depErrors.relationship = 'Invalid dependent relationship';
        }

        if (Object.keys(depErrors).length > 0) {
          errors[`dependent_${index}`] = depErrors;
        }
      });
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
}; 