// Group API service
import { apiService } from './api';

export const groupService = {
  /**
   * Create a new group
   * @param {Object} groupData - Group creation data
   * @returns {Promise} API response
   */
  createGroup: async (groupData) => {
    try {
      const response = await apiService.groups.create(groupData);
      
      // Emit custom event for dashboard updates
      window.dispatchEvent(new CustomEvent('group-created', { 
        detail: { group: response.data.data } 
      }));
      
      return response.data;
    } catch (error) {
      // Handle specific error codes from backend
      if (error.response?.data?.code === 'DUPLICATE_GROUP_NAME') {
        throw new Error('A group with this name already exists. Please choose a different name.');
      } else if (error.response?.data?.code === 'INCOMPLETE_ADDRESS') {
        throw new Error('Address must include street1, city, state, and zipCode');
      } else if (error.response?.data?.code === 'INVALID_ZIP_CODE') {
        throw new Error('ZIP code must be a valid 5-digit ZIP code');
      } else if (error.response?.data?.code === 'INVALID_EFFECTIVE_DATE') {
        throw new Error('Effective date must be a valid future date');
      }
      
      // Handle other errors with more detail
      const errorMessage = error.response?.data?.error || error.message || 'Failed to create group';
      throw new Error(errorMessage);
    }
  },

  /**
   * Get group by ID
   * @param {string} groupId - Group ID
   * @returns {Promise} API response
   */
  getGroup: async (groupId) => {
    try {
      const response = await apiService.groups.get(groupId);
      
      // Backend returns {success: true, data: {...}}
      let groupData;
      if (response.data && response.data.success) {
        groupData = response.data.data;
      } else {
        // Fallback to just response.data
        groupData = response.data;
      }
      
      // Normalize group data to ensure consistent id field
      return {
        ...groupData,
        id: groupData.id || groupData.groupId || groupData._id
      };
    } catch (error) {
      throw new Error(`Failed to get group: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * Update group information
   * @param {string} groupId - Group ID
   * @param {Object} updateData - Data to update
   * @returns {Promise} API response
   */
  updateGroup: async (groupId, updateData) => {
    try {
      const response = await apiService.groups.update(groupId, updateData);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to update group: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * List all groups with optional filters
   * @param {Object} filters - Optional filters
   * @returns {Promise} API response
   */
  listGroups: async (filters = {}) => {
    try {
      const response = await apiService.groups.list(filters);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to list groups: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * Get groups (alias for listGroups for compatibility)
   * @param {Object} filters - Optional filters
   * @returns {Promise} API response
   */
  getGroups: async (filters = {}) => {
    try {
      const response = await apiService.groups.list(filters);
      // Backend returns {success: true, data: {groups: [...], pagination: {...}}}
      const responseData = response.data?.data || response.data;
      
      if (responseData && responseData.groups) {
        // Normalize group data to ensure consistent id field
        const normalizedGroups = responseData.groups.map(group => ({
          ...group,
          id: group.id || group.groupId || group._id
        }));
        return {
          data: normalizedGroups,
          pagination: responseData.pagination
        };
      }
      // If no groups property, assume data is the array directly
      const groups = Array.isArray(responseData) ? responseData : [];
      const normalizedGroups = groups.map(group => ({
        ...group,
        id: group.id || group.groupId || group._id
      }));
      return { data: normalizedGroups };
    } catch (error) {
      throw new Error(`Failed to get groups: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * Delete a group
   * @param {string} groupId - Group ID to delete
   * @returns {Promise} API response
   */
  deleteGroup: async (groupId) => {
    try {
      const response = await apiService.groups.delete(groupId);
      return response.data;
    } catch (error) {
      throw new Error(`Failed to delete group: ${error.response?.data?.error || error.message}`);
    }
  },

  /**
   * Validate group data before submission
   * @param {Object} groupData - Group data to validate
   * @returns {Object} Validation result
   */
  validateGroupData: (groupData) => {
    const errors = {};

    if (!groupData.name?.trim()) {
      errors.name = 'Group name is required';
    }

    if (!groupData.address) {
      errors.address = 'Address is required';
    } else {
      if (!groupData.address.street1?.trim()) {
        errors['address.street1'] = 'Street address is required';
      }
      if (!groupData.address.city?.trim()) {
        errors['address.city'] = 'City is required';
      }
      if (!groupData.address.state?.trim()) {
        errors['address.state'] = 'State is required';
      }
      if (!groupData.address.zipCode?.trim()) {
        errors['address.zipCode'] = 'ZIP code is required';
      } else {
        const zipNum = parseInt(groupData.address.zipCode);
        if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
          errors['address.zipCode'] = 'ZIP code must be a valid 5-digit ZIP code';
        }
      }
    }

    if (!groupData.effectiveDate) {
      errors.effectiveDate = 'Effective date is required';
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    };
  }
};

export default groupService; 