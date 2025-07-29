const express = require('express');
const router = express.Router();
const ICHRAClass = require('../models/ICHRAClass');
const Group = require('../models/Group');
const Member = require('../models/Member');

/**
 * POST /api/groups/:groupId/classes
 * Create new ICHRA class with validation
 */
router.post('/:groupId/classes', async (req, res) => {
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

    // 422 Unprocessable Entity - Invalid groupId format
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

    // 400 Bad Request - Missing required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Class name is required',
        code: 'MISSING_CLASS_NAME'
      });
    }

    if (!type) {
      return res.status(400).json({
        success: false,
        error: 'Class type is required',
        code: 'MISSING_CLASS_TYPE'
      });
    }

    if (employeeContribution === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Employee contribution is required',
        code: 'MISSING_EMPLOYEE_CONTRIBUTION'
      });
    }

    if (dependentContribution === undefined) {
      return res.status(400).json({
        success: false,
        error: 'Dependent contribution is required',
        code: 'MISSING_DEPENDENT_CONTRIBUTION'
      });
    }

    // 422 Unprocessable Entity - Validate class type
    const validTypes = ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'];
    if (!validTypes.includes(type)) {
      return res.status(422).json({
        success: false,
        error: `Invalid class type. Valid options: ${validTypes.join(', ')}`,
        code: 'INVALID_CLASS_TYPE'
      });
    }

    // Validate contribution amounts
    if (isNaN(employeeContribution) || employeeContribution < 0) {
      return res.status(422).json({
        success: false,
        error: 'Employee contribution must be a non-negative number',
        code: 'INVALID_EMPLOYEE_CONTRIBUTION'
      });
    }

    if (isNaN(dependentContribution) || dependentContribution < 0) {
      return res.status(422).json({
        success: false,
        error: 'Dependent contribution must be a non-negative number',
        code: 'INVALID_DEPENDENT_CONTRIBUTION'
      });
    }

    // Check for duplicate class name within group
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

    // Support parent/child relationships
    if (parentClassId) {
      if (!parentClassId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(422).json({
          success: false,
          error: 'Invalid parent class ID format',
          code: 'INVALID_PARENT_CLASS_ID'
        });
      }

      const parentClass = await ICHRAClass.findOne({
        _id: parentClassId,
        groupId: groupId,
        isActive: true
      });

      if (!parentClass) {
        return res.status(404).json({
          success: false,
          error: 'Parent class not found in this group',
          code: 'PARENT_CLASS_NOT_FOUND'
        });
      }

      // Prevent circular relationships
      if (parentClass.parentClassId) {
        return res.status(422).json({
          success: false,
          error: 'Cannot create sub-class of a sub-class (max 2 levels)',
          code: 'INVALID_CLASS_HIERARCHY'
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

    // 201 Created - Successfully created
    res.status(201).json({
      success: true,
      data: {
        classId: ichraClass._id,
        groupId: ichraClass.groupId,
        name: ichraClass.name,
        type: ichraClass.type,
        parentClassId: ichraClass.parentClassId,
        employeeContribution: ichraClass.employeeContribution,
        dependentContribution: ichraClass.dependentContribution,
        criteria: ichraClass.criteria,
        isActive: ichraClass.isActive,
        createdAt: ichraClass.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating ICHRA class:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating class',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/groups/:groupId/classes
 * List all classes with member counts and contribution totals
 */
router.get('/:groupId/classes', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { includeInactive } = req.query;

    // 422 Unprocessable Entity - Invalid groupId format
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

    // Get all classes for the group
    const classes = await ICHRAClass.getClassesForGroup(
      groupId, 
      includeInactive === 'true'
    );

    // Calculate member counts and contribution totals for each class
    const classesWithDetails = await Promise.all(
      classes.map(async (ichraClass) => {
        // Get member count for this class
        const memberCount = await Member.countDocuments({
          classId: ichraClass._id,
          status: 'active'
        });

        // Get all members to calculate totals
        const members = await Member.find({
          classId: ichraClass._id,
          status: 'active'
        });

        // Calculate contribution totals
        let totalEmployeeContribution = 0;
        let totalDependentContribution = 0;

        members.forEach(member => {
          const contribution = ichraClass.getContributionForAge(member.personalInfo.age);
          totalEmployeeContribution += contribution.employee;
          totalDependentContribution += contribution.dependent * (member.dependents?.length || 0);
        });

        return {
          classId: ichraClass._id,
          name: ichraClass.name,
          type: ichraClass.type,
          parentClassId: ichraClass.parentClassId,
          employeeContribution: ichraClass.employeeContribution,
          dependentContribution: ichraClass.dependentContribution,
          ageBasedContributions: ichraClass.ageBasedContributions,
          criteria: ichraClass.criteria,
          isActive: ichraClass.isActive,
          statistics: {
            memberCount: memberCount,
            totalEmployeeContribution: totalEmployeeContribution,
            totalDependentContribution: totalDependentContribution,
            averageAge: ichraClass.statistics?.averageAge || 0
          },
          createdAt: ichraClass.createdAt,
          updatedAt: ichraClass.updatedAt
        };
      })
    );

    // Calculate overall totals
    const overallStats = {
      totalClasses: classesWithDetails.length,
      totalMembers: classesWithDetails.reduce((sum, cls) => sum + cls.statistics.memberCount, 0),
      totalEmployeeContribution: classesWithDetails.reduce((sum, cls) => sum + cls.statistics.totalEmployeeContribution, 0),
      totalDependentContribution: classesWithDetails.reduce((sum, cls) => sum + cls.statistics.totalDependentContribution, 0)
    };

    // 200 OK - Success with class details
    res.status(200).json({
      success: true,
      data: {
        groupId: groupId,
        groupName: group.name,
        classes: classesWithDetails,
        summary: overallStats
      }
    });

  } catch (error) {
    console.error('Error fetching ICHRA classes:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching classes',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/groups/:groupId/classes/:classId/subclasses
 * Create age-based sub-classes with defined age ranges and contributions
 */
router.post('/:groupId/classes/:classId/subclasses', async (req, res) => {
  try {
    const { groupId, classId } = req.params;
    const { ageBasedContributions } = req.body;

    // 422 Unprocessable Entity - Invalid ID formats
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid class ID format',
        code: 'INVALID_CLASS_ID'
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

    // Verify parent class exists
    const parentClass = await ICHRAClass.findOne({
      _id: classId,
      groupId: groupId,
      isActive: true
    });

    if (!parentClass) {
      return res.status(404).json({
        success: false,
        error: 'Parent class not found',
        code: 'PARENT_CLASS_NOT_FOUND'
      });
    }

    // Prevent creating sub-classes of sub-classes
    if (parentClass.parentClassId) {
      return res.status(422).json({
        success: false,
        error: 'Cannot create sub-classes of a sub-class',
        code: 'INVALID_CLASS_HIERARCHY'
      });
    }

    // 400 Bad Request - Missing age-based contributions
    if (!ageBasedContributions || !Array.isArray(ageBasedContributions) || ageBasedContributions.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'Age-based contributions array is required and must not be empty',
        code: 'MISSING_AGE_CONTRIBUTIONS'
      });
    }

    // Validate age-based contributions
    for (let i = 0; i < ageBasedContributions.length; i++) {
      const contribution = ageBasedContributions[i];

      if (!contribution.minAge && contribution.minAge !== 0) {
        return res.status(422).json({
          success: false,
          error: `Missing minAge for contribution ${i + 1}`,
          code: 'MISSING_MIN_AGE'
        });
      }

      if (!contribution.maxAge) {
        return res.status(422).json({
          success: false,
          error: `Missing maxAge for contribution ${i + 1}`,
          code: 'MISSING_MAX_AGE'
        });
      }

      if (contribution.minAge < 0 || contribution.minAge > 120) {
        return res.status(422).json({
          success: false,
          error: `Invalid minAge for contribution ${i + 1}: must be between 0 and 120`,
          code: 'INVALID_MIN_AGE'
        });
      }

      if (contribution.maxAge < 0 || contribution.maxAge > 120) {
        return res.status(422).json({
          success: false,
          error: `Invalid maxAge for contribution ${i + 1}: must be between 0 and 120`,
          code: 'INVALID_MAX_AGE'
        });
      }

      if (contribution.minAge > contribution.maxAge) {
        return res.status(422).json({
          success: false,
          error: `Invalid age range for contribution ${i + 1}: minAge cannot be greater than maxAge`,
          code: 'INVALID_AGE_RANGE'
        });
      }

      if (isNaN(contribution.employeeContribution) || contribution.employeeContribution < 0) {
        return res.status(422).json({
          success: false,
          error: `Invalid employee contribution for age range ${i + 1}: must be non-negative`,
          code: 'INVALID_EMPLOYEE_CONTRIBUTION'
        });
      }

      if (isNaN(contribution.dependentContribution) || contribution.dependentContribution < 0) {
        return res.status(422).json({
          success: false,
          error: `Invalid dependent contribution for age range ${i + 1}: must be non-negative`,
          code: 'INVALID_DEPENDENT_CONTRIBUTION'
        });
      }
    }

    // Check for overlapping age ranges
    const sortedContributions = [...ageBasedContributions].sort((a, b) => a.minAge - b.minAge);
    for (let i = 0; i < sortedContributions.length - 1; i++) {
      if (sortedContributions[i].maxAge >= sortedContributions[i + 1].minAge) {
        return res.status(422).json({
          success: false,
          error: 'Age ranges cannot overlap',
          code: 'OVERLAPPING_AGE_RANGES'
        });
      }
    }

    // Update parent class with age-based contributions
    parentClass.ageBasedContributions = ageBasedContributions.map(contribution => ({
      minAge: parseInt(contribution.minAge),
      maxAge: parseInt(contribution.maxAge),
      employeeContribution: parseFloat(contribution.employeeContribution),
      dependentContribution: parseFloat(contribution.dependentContribution)
    }));

    await parentClass.save();

    // 201 Created - Successfully created sub-classes
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
    console.error('Error creating age-based sub-classes:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while creating sub-classes',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/groups/:groupId/classes/:classId
 * Get a single class by ID
 */
router.get('/:groupId/classes/:classId', async (req, res) => {
  try {
    const { groupId, classId } = req.params;

    // 422 Unprocessable Entity - Invalid ID formats
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid class ID format',
        code: 'INVALID_CLASS_ID'
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

    // Get the class
    const ichraClass = await ICHRAClass.findOne({
      _id: classId,
      groupId: groupId
    });

    if (!ichraClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Get member count for this class
    const memberCount = await Member.countDocuments({
      classId: ichraClass._id,
      status: 'active'
    });

    // Get all members to calculate totals
    const members = await Member.find({
      classId: ichraClass._id,
      status: 'active'
    });

    // Calculate contribution totals
    let totalEmployeeContribution = 0;
    let totalDependentContribution = 0;

    members.forEach(member => {
      const contribution = ichraClass.getContributionForAge(member.personalInfo.age);
      totalEmployeeContribution += contribution.employee;
      totalDependentContribution += contribution.dependent * (member.dependents?.length || 0);
    });

    // 200 OK - Success with class details
    res.status(200).json({
      success: true,
      data: {
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
        statistics: {
          memberCount: memberCount,
          totalEmployeeContribution: totalEmployeeContribution,
          totalDependentContribution: totalDependentContribution,
          averageAge: ichraClass.statistics?.averageAge || 0
        },
        createdAt: ichraClass.createdAt,
        updatedAt: ichraClass.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching ICHRA class:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while fetching class',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/groups/:groupId/classes/:classId
 * Update an existing ICHRA class
 */
router.put('/:groupId/classes/:classId', async (req, res) => {
  try {
    const { groupId, classId } = req.params;
    const { 
      name, 
      type, 
      employeeContribution, 
      dependentContribution,
      criteria,
      isActive 
    } = req.body;

    // 422 Unprocessable Entity - Invalid ID formats
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid class ID format',
        code: 'INVALID_CLASS_ID'
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

    // Verify class exists
    const ichraClass = await ICHRAClass.findOne({
      _id: classId,
      groupId: groupId
    });

    if (!ichraClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Validate new values if provided
    if (type) {
      const validTypes = ['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'];
      if (!validTypes.includes(type)) {
        return res.status(422).json({
          success: false,
          error: `Invalid class type. Valid options: ${validTypes.join(', ')}`,
          code: 'INVALID_CLASS_TYPE'
        });
      }
    }

    if (employeeContribution !== undefined) {
      if (isNaN(employeeContribution) || employeeContribution < 0) {
        return res.status(422).json({
          success: false,
          error: 'Employee contribution must be a non-negative number',
          code: 'INVALID_EMPLOYEE_CONTRIBUTION'
        });
      }
    }

    if (dependentContribution !== undefined) {
      if (isNaN(dependentContribution) || dependentContribution < 0) {
        return res.status(422).json({
          success: false,
          error: 'Dependent contribution must be a non-negative number',
          code: 'INVALID_DEPENDENT_CONTRIBUTION'
        });
      }
    }

    // Check for duplicate name if name is being changed
    if (name && name.trim() !== ichraClass.name) {
      const existingClass = await ICHRAClass.findOne({
        groupId: groupId,
        name: name.trim(),
        isActive: true,
        _id: { $ne: classId }
      });

      if (existingClass) {
        return res.status(409).json({
          success: false,
          error: 'Class with this name already exists in the group',
          code: 'DUPLICATE_CLASS_NAME'
        });
      }
    }

    // Update fields
    if (name !== undefined) ichraClass.name = name.trim();
    if (type !== undefined) ichraClass.type = type;
    if (employeeContribution !== undefined) ichraClass.employeeContribution = parseFloat(employeeContribution);
    if (dependentContribution !== undefined) ichraClass.dependentContribution = parseFloat(dependentContribution);
    if (criteria !== undefined) ichraClass.criteria = criteria;
    if (isActive !== undefined) ichraClass.isActive = isActive;

    await ichraClass.save();

    // If class is being deactivated, update group statistics
    if (isActive === false) {
      await Group.findByIdAndUpdate(groupId, {
        $inc: { 'statistics.totalClasses': -1 }
      });
    }

    // 200 OK - Successfully updated
    res.status(200).json({
      success: true,
      data: {
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
        updatedAt: ichraClass.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating ICHRA class:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while updating class',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * DELETE /api/groups/:groupId/classes/:classId
 * Delete an ICHRA class (soft delete)
 */
router.delete('/:groupId/classes/:classId', async (req, res) => {
  try {
    const { groupId, classId } = req.params;
    const { force } = req.query;

    // 422 Unprocessable Entity - Invalid ID formats
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid class ID format',
        code: 'INVALID_CLASS_ID'
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

    // Verify class exists
    const ichraClass = await ICHRAClass.findOne({
      _id: classId,
      groupId: groupId
    });

    if (!ichraClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Check if class has active members
    const memberCount = await Member.countDocuments({
      classId: classId,
      status: 'active'
    });

    if (memberCount > 0 && force !== 'true') {
      return res.status(409).json({
        success: false,
        error: `Cannot delete class with ${memberCount} active members. Use force=true to override.`,
        code: 'CLASS_HAS_MEMBERS',
        memberCount: memberCount
      });
    }

    // Check if class has sub-classes
    const subClassCount = await ICHRAClass.countDocuments({
      parentClassId: classId,
      isActive: true
    });

    if (subClassCount > 0) {
      return res.status(409).json({
        success: false,
        error: `Cannot delete class with ${subClassCount} active sub-classes`,
        code: 'CLASS_HAS_SUBCLASSES',
        subClassCount: subClassCount
      });
    }

    // If force delete and class has members, reassign them to default class or mark inactive
    if (memberCount > 0 && force === 'true') {
      // Find a default class for the group (e.g., first active class that's not this one)
      const defaultClass = await ICHRAClass.findOne({
        groupId: groupId,
        isActive: true,
        _id: { $ne: classId }
      });

      if (defaultClass) {
        // Reassign members to default class
        await Member.updateMany(
          { classId: classId },
          { $set: { classId: defaultClass._id } }
        );
      } else {
        // No other class available, mark members as unassigned
        await Member.updateMany(
          { classId: classId },
          { $unset: { classId: 1 } }
        );
      }
    }

    // Soft delete the class
    ichraClass.isActive = false;
    await ichraClass.save();

    // Update group statistics
    await Group.findByIdAndUpdate(groupId, {
      $inc: { 'statistics.totalClasses': -1 }
    });

    // 200 OK - Successfully deleted
    res.status(200).json({
      success: true,
      data: {
        classId: ichraClass._id,
        name: ichraClass.name,
        deletedAt: new Date(),
        membersReassigned: memberCount > 0 && force === 'true',
        memberCount: memberCount
      }
    });

  } catch (error) {
    console.error('Error deleting ICHRA class:', error);

    // 503 Service Unavailable - Database connection issues
    if (error.name === 'MongooseError' || error.name === 'MongoError') {
      return res.status(503).json({
        success: false,
        error: 'Database service temporarily unavailable',
        code: 'DATABASE_UNAVAILABLE'
      });
    }

    // 500 Internal Server Error - Unexpected errors
    res.status(500).json({
      success: false,
      error: 'Internal server error while deleting class',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router; 