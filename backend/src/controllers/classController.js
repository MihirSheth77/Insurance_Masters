const ICHRAClass = require('../models/ICHRAClass');
const Group = require('../models/Group');
const Member = require('../models/Member');

/**
 * ICHRA Class Controller
 * Handles business logic for ICHRA class management
 */
class ClassController {
  /**
   * Create a new ICHRA class
   */
  async createClass(req, res) {
    try {
      const { groupId } = req.params;
      const { 
        name, 
        type, 
        parentClassId, 
        employeeContribution, 
        dependentContribution,
        criteria 
      } = req.body;

      // Validate groupId format
      if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(422).json({
          success: false,
          error: 'Invalid group ID format',
          code: 'INVALID_GROUP_ID'
        });
      }

      // Verify group exists
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }

      // Validate required fields
      const validationErrors = this.validateClassData({
        name, type, employeeContribution, dependentContribution
      });
      
      if (validationErrors.length > 0) {
        return res.status(400).json({
          success: false,
          error: validationErrors[0].message,
          code: validationErrors[0].code
        });
      }

      // Check for duplicate class name
      const existingClass = await ICHRAClass.findOne({
        groupId: groupId,
        name: name.trim(),
        isActive: true
      });

      if (existingClass) {
        return res.status(409).json({
          success: false,
          error: 'Class with this name already exists in the group',
          code: 'DUPLICATE_CLASS_NAME'
        });
      }

      // Validate parent class if provided
      if (parentClassId) {
        const parentValidation = await this.validateParentClass(parentClassId, groupId);
        if (!parentValidation.valid) {
          return res.status(parentValidation.status).json({
            success: false,
            error: parentValidation.error,
            code: parentValidation.code
          });
        }
      }

      // Create new class
      const ichraClass = new ICHRAClass({
        groupId: groupId,
        name: name.trim(),
        type: type,
        parentClassId: parentClassId || null,
        employeeContribution: parseFloat(employeeContribution),
        dependentContribution: parseFloat(dependentContribution),
        criteria: criteria || {},
        isActive: true
      });

      await ichraClass.save();

      // Update group statistics
      await Group.findByIdAndUpdate(groupId, {
        $inc: { 'statistics.totalClasses': 1 }
      });

      res.status(201).json({
        success: true,
        data: this.formatClassResponse(ichraClass)
      });

    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get all classes for a group
   */
  async getClasses(req, res) {
    try {
      const { groupId } = req.params;
      const { includeInactive } = req.query;

      // Validate groupId format
      if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(422).json({
          success: false,
          error: 'Invalid group ID format',
          code: 'INVALID_GROUP_ID'
        });
      }

      // Verify group exists
      const group = await Group.findById(groupId);
      if (!group) {
        return res.status(404).json({
          success: false,
          error: 'Group not found',
          code: 'GROUP_NOT_FOUND'
        });
      }

      // Get all classes with statistics
      const classes = await this.getClassesWithStatistics(
        groupId, 
        includeInactive === 'true'
      );

      // Calculate overall totals
      const overallStats = this.calculateOverallStatistics(classes);

      res.status(200).json({
        success: true,
        data: {
          groupId: groupId,
          groupName: group.name,
          classes: classes,
          summary: overallStats
        }
      });

    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Get a single class by ID
   */
  async getClass(req, res) {
    try {
      const { groupId, classId } = req.params;

      // Validate IDs
      const idValidation = this.validateIds(groupId, classId);
      if (!idValidation.valid) {
        return res.status(422).json({
          success: false,
          error: idValidation.error,
          code: idValidation.code
        });
      }

      // Verify group and class exist
      const validationResult = await this.validateGroupAndClass(groupId, classId);
      if (!validationResult.valid) {
        return res.status(validationResult.status).json({
          success: false,
          error: validationResult.error,
          code: validationResult.code
        });
      }

      const ichraClass = validationResult.class;

      // Get statistics for this class
      const statistics = await this.calculateClassStatistics(ichraClass);

      res.status(200).json({
        success: true,
        data: {
          ...this.formatClassResponse(ichraClass),
          statistics
        }
      });

    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Update an existing ICHRA class
   */
  async updateClass(req, res) {
    try {
      const { groupId, classId } = req.params;
      const updateData = req.body;

      // Validate IDs
      const idValidation = this.validateIds(groupId, classId);
      if (!idValidation.valid) {
        return res.status(422).json({
          success: false,
          error: idValidation.error,
          code: idValidation.code
        });
      }

      // Verify group and class exist
      const validationResult = await this.validateGroupAndClass(groupId, classId);
      if (!validationResult.valid) {
        return res.status(validationResult.status).json({
          success: false,
          error: validationResult.error,
          code: validationResult.code
        });
      }

      const ichraClass = validationResult.class;

      // Validate update data
      const updateValidation = this.validateUpdateData(updateData);
      if (updateValidation.errors.length > 0) {
        return res.status(422).json({
          success: false,
          error: updateValidation.errors[0].message,
          code: updateValidation.errors[0].code
        });
      }

      // Check for duplicate name if changing
      if (updateData.name && updateData.name.trim() !== ichraClass.name) {
        const duplicate = await ICHRAClass.findOne({
          groupId: groupId,
          name: updateData.name.trim(),
          isActive: true,
          _id: { $ne: classId }
        });

        if (duplicate) {
          return res.status(409).json({
            success: false,
            error: 'Class with this name already exists in the group',
            code: 'DUPLICATE_CLASS_NAME'
          });
        }
      }

      // Update fields
      const updatedClass = await this.applyUpdates(ichraClass, updateData);
      await updatedClass.save();

      // Handle statistics updates if needed
      if (updateData.isActive === false) {
        await Group.findByIdAndUpdate(groupId, {
          $inc: { 'statistics.totalClasses': -1 }
        });
      }

      res.status(200).json({
        success: true,
        data: this.formatClassResponse(updatedClass)
      });

    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Delete an ICHRA class (soft delete)
   */
  async deleteClass(req, res) {
    try {
      const { groupId, classId } = req.params;
      const { force } = req.query;

      // Validate IDs
      const idValidation = this.validateIds(groupId, classId);
      if (!idValidation.valid) {
        return res.status(422).json({
          success: false,
          error: idValidation.error,
          code: idValidation.code
        });
      }

      // Verify group and class exist
      const validationResult = await this.validateGroupAndClass(groupId, classId);
      if (!validationResult.valid) {
        return res.status(validationResult.status).json({
          success: false,
          error: validationResult.error,
          code: validationResult.code
        });
      }

      const ichraClass = validationResult.class;

      // Check for dependencies
      const dependencyCheck = await this.checkClassDependencies(classId);
      
      if (dependencyCheck.hasMembers && force !== 'true') {
        return res.status(409).json({
          success: false,
          error: `Cannot delete class with ${dependencyCheck.memberCount} active members. Use force=true to override.`,
          code: 'CLASS_HAS_MEMBERS',
          memberCount: dependencyCheck.memberCount
        });
      }

      if (dependencyCheck.hasSubClasses) {
        return res.status(409).json({
          success: false,
          error: `Cannot delete class with ${dependencyCheck.subClassCount} active sub-classes`,
          code: 'CLASS_HAS_SUBCLASSES',
          subClassCount: dependencyCheck.subClassCount
        });
      }

      // Handle member reassignment if force delete
      if (dependencyCheck.hasMembers && force === 'true') {
        await this.reassignMembers(classId, groupId);
      }

      // Soft delete the class
      ichraClass.isActive = false;
      await ichraClass.save();

      // Update group statistics
      await Group.findByIdAndUpdate(groupId, {
        $inc: { 'statistics.totalClasses': -1 }
      });

      res.status(200).json({
        success: true,
        data: {
          classId: ichraClass._id,
          name: ichraClass.name,
          deletedAt: new Date(),
          membersReassigned: dependencyCheck.hasMembers && force === 'true',
          memberCount: dependencyCheck.memberCount
        }
      });

    } catch (error) {
      this.handleError(error, res);
    }
  }

  /**
   * Create age-based sub-classes
   */
  async createSubClasses(req, res) {
    try {
      const { groupId, classId } = req.params;
      const { ageBasedContributions } = req.body;

      // Validate IDs
      const idValidation = this.validateIds(groupId, classId);
      if (!idValidation.valid) {
        return res.status(422).json({
          success: false,
          error: idValidation.error,
          code: idValidation.code
        });
      }

      // Verify group and parent class exist
      const validationResult = await this.validateGroupAndClass(groupId, classId);
      if (!validationResult.valid) {
        return res.status(validationResult.status).json({
          success: false,
          error: validationResult.error,
          code: validationResult.code
        });
      }

      const parentClass = validationResult.class;

      // Prevent sub-classes of sub-classes
      if (parentClass.parentClassId) {
        return res.status(422).json({
          success: false,
          error: 'Cannot create sub-classes of a sub-class',
          code: 'INVALID_CLASS_HIERARCHY'
        });
      }

      // Validate age-based contributions
      const ageValidation = this.validateAgeBasedContributions(ageBasedContributions);
      if (!ageValidation.valid) {
        return res.status(ageValidation.status).json({
          success: false,
          error: ageValidation.error,
          code: ageValidation.code
        });
      }

      // Update parent class with age-based contributions
      parentClass.ageBasedContributions = ageBasedContributions.map(contribution => ({
        minAge: parseInt(contribution.minAge),
        maxAge: parseInt(contribution.maxAge),
        employeeContribution: parseFloat(contribution.employeeContribution),
        dependentContribution: parseFloat(contribution.dependentContribution)
      }));

      await parentClass.save();

      res.status(201).json({
        success: true,
        data: {
          classId: parentClass._id,
          groupId: parentClass.groupId,
          name: parentClass.name,
          type: parentClass.type,
          ageBasedContributions: parentClass.ageBasedContributions,
          updatedAt: parentClass.updatedAt
        }
      });

    } catch (error) {
      this.handleError(error, res);
    }
  }

  // Helper Methods

  validateClassData({ name, type, employeeContribution, dependentContribution }) {
    const errors = [];

    if (!name) {
      errors.push({ message: 'Class name is required', code: 'MISSING_CLASS_NAME' });
    }

    if (!type) {
      errors.push({ message: 'Class type is required', code: 'MISSING_CLASS_TYPE' });
    } else {
      const validTypes = ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'];
      if (!validTypes.includes(type)) {
        errors.push({ 
          message: `Invalid class type. Valid options: ${validTypes.join(', ')}`, 
          code: 'INVALID_CLASS_TYPE' 
        });
      }
    }

    if (employeeContribution === undefined) {
      errors.push({ message: 'Employee contribution is required', code: 'MISSING_EMPLOYEE_CONTRIBUTION' });
    } else if (isNaN(employeeContribution) || employeeContribution < 0) {
      errors.push({ 
        message: 'Employee contribution must be a non-negative number', 
        code: 'INVALID_EMPLOYEE_CONTRIBUTION' 
      });
    }

    if (dependentContribution === undefined) {
      errors.push({ message: 'Dependent contribution is required', code: 'MISSING_DEPENDENT_CONTRIBUTION' });
    } else if (isNaN(dependentContribution) || dependentContribution < 0) {
      errors.push({ 
        message: 'Dependent contribution must be a non-negative number', 
        code: 'INVALID_DEPENDENT_CONTRIBUTION' 
      });
    }

    return errors;
  }

  validateIds(groupId, classId) {
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return { valid: false, error: 'Invalid group ID format', code: 'INVALID_GROUP_ID' };
    }

    if (classId && !classId.match(/^[0-9a-fA-F]{24}$/)) {
      return { valid: false, error: 'Invalid class ID format', code: 'INVALID_CLASS_ID' };
    }

    return { valid: true };
  }

  async validateGroupAndClass(groupId, classId) {
    const group = await Group.findById(groupId);
    if (!group) {
      return { 
        valid: false, 
        status: 404,
        error: 'Group not found', 
        code: 'GROUP_NOT_FOUND' 
      };
    }

    if (classId) {
      const ichraClass = await ICHRAClass.findOne({
        _id: classId,
        groupId: groupId
      });

      if (!ichraClass) {
        return { 
          valid: false, 
          status: 404,
          error: 'Class not found', 
          code: 'CLASS_NOT_FOUND' 
        };
      }

      return { valid: true, group, class: ichraClass };
    }

    return { valid: true, group };
  }

  async validateParentClass(parentClassId, groupId) {
    if (!parentClassId.match(/^[0-9a-fA-F]{24}$/)) {
      return { 
        valid: false, 
        status: 422,
        error: 'Invalid parent class ID format', 
        code: 'INVALID_PARENT_CLASS_ID' 
      };
    }

    const parentClass = await ICHRAClass.findOne({
      _id: parentClassId,
      groupId: groupId,
      isActive: true
    });

    if (!parentClass) {
      return { 
        valid: false, 
        status: 404,
        error: 'Parent class not found in this group', 
        code: 'PARENT_CLASS_NOT_FOUND' 
      };
    }

    if (parentClass.parentClassId) {
      return { 
        valid: false, 
        status: 422,
        error: 'Cannot create sub-class of a sub-class (max 2 levels)', 
        code: 'INVALID_CLASS_HIERARCHY' 
      };
    }

    return { valid: true, parentClass };
  }

  validateUpdateData(updateData) {
    const errors = [];
    const { type, employeeContribution, dependentContribution } = updateData;

    if (type) {
      const validTypes = ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'];
      if (!validTypes.includes(type)) {
        errors.push({ 
          message: `Invalid class type. Valid options: ${validTypes.join(', ')}`, 
          code: 'INVALID_CLASS_TYPE' 
        });
      }
    }

    if (employeeContribution !== undefined) {
      if (isNaN(employeeContribution) || employeeContribution < 0) {
        errors.push({ 
          message: 'Employee contribution must be a non-negative number', 
          code: 'INVALID_EMPLOYEE_CONTRIBUTION' 
        });
      }
    }

    if (dependentContribution !== undefined) {
      if (isNaN(dependentContribution) || dependentContribution < 0) {
        errors.push({ 
          message: 'Dependent contribution must be a non-negative number', 
          code: 'INVALID_DEPENDENT_CONTRIBUTION' 
        });
      }
    }

    return { errors };
  }

  validateAgeBasedContributions(ageBasedContributions) {
    if (!ageBasedContributions || !Array.isArray(ageBasedContributions) || ageBasedContributions.length === 0) {
      return {
        valid: false,
        status: 400,
        error: 'Age-based contributions array is required and must not be empty',
        code: 'MISSING_AGE_CONTRIBUTIONS'
      };
    }

    // Validate each contribution
    for (let i = 0; i < ageBasedContributions.length; i++) {
      const contribution = ageBasedContributions[i];

      if (!contribution.minAge && contribution.minAge !== 0) {
        return {
          valid: false,
          status: 422,
          error: `Missing minAge for contribution ${i + 1}`,
          code: 'MISSING_MIN_AGE'
        };
      }

      if (!contribution.maxAge) {
        return {
          valid: false,
          status: 422,
          error: `Missing maxAge for contribution ${i + 1}`,
          code: 'MISSING_MAX_AGE'
        };
      }

      if (contribution.minAge < 0 || contribution.minAge > 120) {
        return {
          valid: false,
          status: 422,
          error: `Invalid minAge for contribution ${i + 1}: must be between 0 and 120`,
          code: 'INVALID_MIN_AGE'
        };
      }

      if (contribution.maxAge < 0 || contribution.maxAge > 120) {
        return {
          valid: false,
          status: 422,
          error: `Invalid maxAge for contribution ${i + 1}: must be between 0 and 120`,
          code: 'INVALID_MAX_AGE'
        };
      }

      if (contribution.minAge > contribution.maxAge) {
        return {
          valid: false,
          status: 422,
          error: `Invalid age range for contribution ${i + 1}: minAge cannot be greater than maxAge`,
          code: 'INVALID_AGE_RANGE'
        };
      }

      if (isNaN(contribution.employeeContribution) || contribution.employeeContribution < 0) {
        return {
          valid: false,
          status: 422,
          error: `Invalid employee contribution for age range ${i + 1}: must be non-negative`,
          code: 'INVALID_EMPLOYEE_CONTRIBUTION'
        };
      }

      if (isNaN(contribution.dependentContribution) || contribution.dependentContribution < 0) {
        return {
          valid: false,
          status: 422,
          error: `Invalid dependent contribution for age range ${i + 1}: must be non-negative`,
          code: 'INVALID_DEPENDENT_CONTRIBUTION'
        };
      }
    }

    // Check for overlapping age ranges
    const sortedContributions = [...ageBasedContributions].sort((a, b) => a.minAge - b.minAge);
    for (let i = 0; i < sortedContributions.length - 1; i++) {
      if (sortedContributions[i].maxAge >= sortedContributions[i + 1].minAge) {
        return {
          valid: false,
          status: 422,
          error: 'Age ranges cannot overlap',
          code: 'OVERLAPPING_AGE_RANGES'
        };
      }
    }

    return { valid: true };
  }

  async getClassesWithStatistics(groupId, includeInactive) {
    const classes = await ICHRAClass.getClassesForGroup(groupId, includeInactive);

    const classesWithDetails = await Promise.all(
      classes.map(async (ichraClass) => {
        const statistics = await this.calculateClassStatistics(ichraClass);
        
        return {
          ...this.formatClassResponse(ichraClass),
          statistics
        };
      })
    );

    return classesWithDetails;
  }

  async calculateClassStatistics(ichraClass) {
    const memberCount = await Member.countDocuments({
      classId: ichraClass._id,
      status: 'active'
    });

    const members = await Member.find({
      classId: ichraClass._id,
      status: 'active'
    });

    let totalEmployeeContribution = 0;
    let totalDependentContribution = 0;

    members.forEach(member => {
      const contribution = ichraClass.getContributionForAge(member.personalInfo.age);
      totalEmployeeContribution += contribution.employee;
      totalDependentContribution += contribution.dependent * (member.dependents?.length || 0);
    });

    return {
      memberCount,
      totalEmployeeContribution,
      totalDependentContribution,
      averageAge: ichraClass.statistics?.averageAge || 0
    };
  }

  calculateOverallStatistics(classes) {
    return {
      totalClasses: classes.length,
      totalMembers: classes.reduce((sum, cls) => sum + cls.statistics.memberCount, 0),
      totalEmployeeContribution: classes.reduce((sum, cls) => sum + cls.statistics.totalEmployeeContribution, 0),
      totalDependentContribution: classes.reduce((sum, cls) => sum + cls.statistics.totalDependentContribution, 0)
    };
  }

  async checkClassDependencies(classId) {
    const memberCount = await Member.countDocuments({
      classId: classId,
      status: 'active'
    });

    const subClassCount = await ICHRAClass.countDocuments({
      parentClassId: classId,
      isActive: true
    });

    return {
      hasMembers: memberCount > 0,
      memberCount,
      hasSubClasses: subClassCount > 0,
      subClassCount
    };
  }

  async reassignMembers(classId, groupId) {
    const defaultClass = await ICHRAClass.findOne({
      groupId: groupId,
      isActive: true,
      _id: { $ne: classId }
    });

    if (defaultClass) {
      await Member.updateMany(
        { classId: classId },
        { $set: { classId: defaultClass._id } }
      );
    } else {
      await Member.updateMany(
        { classId: classId },
        { $unset: { classId: 1 } }
      );
    }
  }

  applyUpdates(ichraClass, updateData) {
    if (updateData.name !== undefined) ichraClass.name = updateData.name.trim();
    if (updateData.type !== undefined) ichraClass.type = updateData.type;
    if (updateData.employeeContribution !== undefined) {
      ichraClass.employeeContribution = parseFloat(updateData.employeeContribution);
    }
    if (updateData.dependentContribution !== undefined) {
      ichraClass.dependentContribution = parseFloat(updateData.dependentContribution);
    }
    if (updateData.criteria !== undefined) ichraClass.criteria = updateData.criteria;
    if (updateData.isActive !== undefined) ichraClass.isActive = updateData.isActive;

    return ichraClass;
  }

  formatClassResponse(ichraClass) {
    return {
      classId: ichraClass._id,
      groupId: ichraClass.groupId,
      name: ichraClass.name,
      type: ichraClass.type,
      parentClassId: ichraClass.parentClassId,
      employeeContribution: ichraClass.employeeContribution,
      dependentContribution: ichraClass.dependentContribution,
      ageBasedContributions: ichraClass.ageBasedContributions,
      criteria: ichraClass.criteria,
      isActive: ichraClass.isActive,
      createdAt: ichraClass.createdAt,
      updatedAt: ichraClass.updatedAt
    };
  }

  handleError(error, res) {
    console.error('Class controller error:', error);

    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    res.status(500).json({
      success: false,
      error: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }
}

module.exports = new ClassController();