const express = require('express');
const router = express.Router();
const Group = require('../models/Group');
const ICHRAClass = require('../models/ICHRAClass');
const Member = require('../models/Member');
const IdeonAPIService = require('../services/IdeonAPIService');

/**
 * POST /api/groups
 * Create new group via Ideon API and store in MongoDB
 */
router.post('/', async (req, res) => {
  try {
    const { name, address, effectiveDate, metadata } = req.body;

    // 400 Bad Request - Missing required fields
    if (!name) {
      return res.status(400).json({
        success: false,
        error: 'Group name is required',
        code: 'MISSING_GROUP_NAME'
      });
    }

    if (!address) {
      return res.status(400).json({
        success: false,
        error: 'Group address is required',
        code: 'MISSING_ADDRESS'
      });
    }

    if (!effectiveDate) {
      return res.status(400).json({
        success: false,
        error: 'Effective date is required',
        code: 'MISSING_EFFECTIVE_DATE'
      });
    }

    // 422 Unprocessable Entity - Validate address structure
    if (!address.street1 || !address.city || !address.state || !address.zipCode) {
      return res.status(422).json({
        success: false,
        error: 'Address must include street1, city, state, and zipCode',
        code: 'INCOMPLETE_ADDRESS'
      });
    }

    // 422 Unprocessable Entity - Validate state format
    if (address.state.length !== 2) {
      return res.status(422).json({
        success: false,
        error: 'State must be a 2-character state code',
        code: 'INVALID_STATE_FORMAT'
      });
    }

    // 422 Unprocessable Entity - Validate 5-digit ZIP code
    const zipNum = parseInt(address.zipCode);
    if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
      return res.status(422).json({
        success: false,
        error: 'ZIP code must be a valid 5-digit ZIP code',
        code: 'INVALID_ZIP_CODE'
      });
    }

    // 422 Unprocessable Entity - Validate effective date
    const effectiveDateObj = new Date(effectiveDate);
    if (isNaN(effectiveDateObj.getTime())) {
      return res.status(422).json({
        success: false,
        error: 'Invalid effective date format',
        code: 'INVALID_EFFECTIVE_DATE'
      });
    }

    // Check if group name already exists
    const existingGroup = await Group.findOne({ name: name });
    if (existingGroup) {
      return res.status(409).json({
        success: false,
        error: 'Group with this name already exists',
        code: 'DUPLICATE_GROUP_NAME'
      });
    }

    // Prepare group data for Ideon API
    const groupData = {
      name: name.trim(),
      address: {
        street1: address.street1.trim(),
        street2: address.street2?.trim() || null,
        city: address.city.trim(),
        state: address.state.toUpperCase(),
        zipCode: address.zipCode
      },
      effectiveDate: effectiveDateObj,
      metadata: metadata || {}
    };

    // Create via Ideon API
    const ideonResponse = await IdeonAPIService.createGroup(groupData);

    // Extract the location_id from the response
    const primaryLocation = ideonResponse.locations?.find(loc => loc.primary) || ideonResponse.locations?.[0];
    const locationId = primaryLocation?.id || primaryLocation?.external_id;

    // Store in MongoDB with location information
    const group = new Group({
      ideonGroupId: ideonResponse.id,
      name: groupData.name,
      address: groupData.address,
      effectiveDate: groupData.effectiveDate,
      status: 'active',
      metadata: {
        ...groupData.metadata,
        ideonLocationId: locationId,
        ideonLocations: ideonResponse.locations
      }
    });

    await group.save();

    // 201 Created - Successfully created
    res.status(201).json({
      success: true,
      data: {
        groupId: group._id,
        ideonGroupId: group.ideonGroupId,
        name: group.name,
        address: group.address,
        effectiveDate: group.effectiveDate,
        status: group.status,
        createdAt: group.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating group:', error);

    // 503 Service Unavailable - Ideon API issues
    if (error.response?.status >= 500 || error.code === 'ECONNREFUSED') {
      return res.status(503).json({
        success: false,
        error: 'Ideon API service temporarily unavailable',
        code: 'IDEON_API_UNAVAILABLE'
      });
    }

    // 429 Too Many Requests - Rate limiting
    if (error.response?.status === 429) {
      return res.status(429).json({
        success: false,
        error: 'Rate limit exceeded. Please try again later',
        code: 'RATE_LIMIT_EXCEEDED'
      });
    }

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
      error: 'Internal server error while creating group',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/groups/:id
 * Get full group details with class and member counts
 */
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;

    // 422 Unprocessable Entity - Invalid ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    // Find group
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Get class and member counts
    const [classes, memberCount] = await Promise.all([
      ICHRAClass.getClassesForGroup(group._id),
      Member.countDocuments({ groupId: group._id, status: 'active' })
    ]);

    // Calculate total contributions
    let totalEmployerContribution = 0;
    let totalDependentContribution = 0;

    for (const ichraClass of classes) {
      const classMembers = await Member.getMembersByClass(ichraClass._id);
      
      for (const member of classMembers) {
        const contribution = ichraClass.getContributionForAge(member.personalInfo.age);
        totalEmployerContribution += contribution.employee;
        totalDependentContribution += contribution.dependent * (member.dependents?.length || 0);
      }
    }

    // 200 OK - Full group details
    res.status(200).json({
      success: true,
      data: {
        groupId: group._id,
        ideonGroupId: group.ideonGroupId,
        name: group.name,
        address: group.address,
        effectiveDate: group.effectiveDate,
        status: group.status,
        metadata: group.metadata,
        statistics: {
          totalMembers: memberCount,
          totalClasses: classes.length,
          totalEmployerContribution: totalEmployerContribution,
          totalDependentContribution: totalDependentContribution,
          lastQuoteDate: group.statistics?.lastQuoteDate || null
        },
        classes: classes.map(cls => ({
          classId: cls._id,
          name: cls.name,
          type: cls.type,
          memberCount: cls.statistics?.memberCount || 0,
          employeeContribution: cls.employeeContribution,
          dependentContribution: cls.dependentContribution
        })),
        createdAt: group.createdAt,
        updatedAt: group.updatedAt
      }
    });

  } catch (error) {
    console.error('Error fetching group:', error);

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
      error: 'Internal server error while fetching group',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * PUT /api/groups/:id
 * Update group information and sync with Ideon if needed
 */
router.put('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, address, effectiveDate, status, metadata, syncWithIdeon } = req.body;

    // 422 Unprocessable Entity - Invalid ObjectId format
    if (!id.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    // Find group
    const group = await Group.findById(id);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Build update object
    const updates = {};

    // Validate and update name
    if (name !== undefined) {
      if (!name || name.trim().length === 0) {
        return res.status(422).json({
          success: false,
          error: 'Group name cannot be empty',
          code: 'INVALID_GROUP_NAME'
        });
      }

      // Check for duplicate name
      const existingGroup = await Group.findOne({ 
        name: name.trim(), 
        _id: { $ne: id } 
      });
      
      if (existingGroup) {
        return res.status(409).json({
          success: false,
          error: 'Another group with this name already exists',
          code: 'DUPLICATE_GROUP_NAME'
        });
      }

      updates.name = name.trim();
    }

    // Validate and update address
    if (address !== undefined) {
      if (!address.street1 || !address.city || !address.state || !address.zipCode) {
        return res.status(422).json({
          success: false,
          error: 'Address must include street1, city, state, and zipCode',
          code: 'INCOMPLETE_ADDRESS'
        });
      }

      if (address.state.length !== 2) {
        return res.status(422).json({
          success: false,
          error: 'State must be a 2-character state code',
          code: 'INVALID_STATE_FORMAT'
        });
      }

      const zipNum = parseInt(address.zipCode);
      if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
        return res.status(422).json({
          success: false,
          error: 'ZIP code must be a valid 5-digit US ZIP code',
          code: 'INVALID_ZIP_CODE'
        });
      }

      updates.address = {
        street1: address.street1.trim(),
        street2: address.street2?.trim() || null,
        city: address.city.trim(),
        state: address.state.toUpperCase(),
        zipCode: address.zipCode
      };
    }

    // Validate and update effective date
    if (effectiveDate !== undefined) {
      const effectiveDateObj = new Date(effectiveDate);
      if (isNaN(effectiveDateObj.getTime())) {
        return res.status(422).json({
          success: false,
          error: 'Invalid effective date format',
          code: 'INVALID_EFFECTIVE_DATE'
        });
      }
      updates.effectiveDate = effectiveDateObj;
    }

    // Validate and update status
    if (status !== undefined) {
      if (!['active', 'inactive'].includes(status)) {
        return res.status(422).json({
          success: false,
          error: 'Status must be either active or inactive',
          code: 'INVALID_STATUS'
        });
      }
      updates.status = status;
    }

    // Update metadata
    if (metadata !== undefined) {
      updates.metadata = metadata;
    }

    // Sync with Ideon if needed
    if (syncWithIdeon && Object.keys(updates).length > 0) {
      try {
        // Note: This would require an Ideon API update method
        console.log('Syncing group updates with Ideon API');
        // await IdeonAPIService.updateGroup(group.ideonGroupId, updates);
      } catch (ideonError) {
        console.warn('Failed to sync with Ideon:', ideonError.message);
        // Continue with local update even if Ideon sync fails
      }
    }

    // Update group in MongoDB
    const updatedGroup = await Group.findByIdAndUpdate(
      id,
      { $set: updates },
      { new: true, runValidators: true }
    );

    // 200 OK - Successfully updated
    res.status(200).json({
      success: true,
      data: {
        groupId: updatedGroup._id,
        ideonGroupId: updatedGroup.ideonGroupId,
        name: updatedGroup.name,
        address: updatedGroup.address,
        effectiveDate: updatedGroup.effectiveDate,
        status: updatedGroup.status,
        metadata: updatedGroup.metadata,
        syncedWithIdeon: syncWithIdeon || false,
        updatedAt: updatedGroup.updatedAt
      }
    });

  } catch (error) {
    console.error('Error updating group:', error);

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
      error: 'Internal server error while updating group',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/groups/check-name/:name
 * Check if a group name is available
 */
router.get('/check-name/:name', async (req, res) => {
  try {
    const { name } = req.params;
    
    if (!name || name.trim().length === 0) {
      return res.status(422).json({
        success: false,
        error: 'Group name is required',
        code: 'MISSING_GROUP_NAME'
      });
    }
    
    const existingGroup = await Group.findOne({ name: name.trim() });
    
    res.status(200).json({
      success: true,
      data: {
        available: !existingGroup,
        suggestedName: existingGroup ? `${name.trim()} (${new Date().getFullYear()})` : null
      }
    });
    
  } catch (error) {
    console.error('Error checking group name:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error while checking group name',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/groups
 * List all groups with pagination
 */
router.get('/', async (req, res) => {
  try {
    const { page = 1, limit = 10, status, search } = req.query;
    
    const query = {};
    
    // Filter by status if provided
    if (status) {
      query.status = status;
    }
    
    // Search by name if provided
    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    
    const [groups, total] = await Promise.all([
      Group.find(query)
        .sort('-createdAt')
        .skip(skip)
        .limit(parseInt(limit))
        .select('name status address effectiveDate createdAt'),
      Group.countDocuments(query)
    ]);
    
    // Get member and class counts for each group
    const groupsWithCounts = await Promise.all(
      groups.map(async (group) => {
        const [memberCount, classCount] = await Promise.all([
          Member.countDocuments({ groupId: group._id, status: 'active' }),
          ICHRAClass.countDocuments({ groupId: group._id })
        ]);
        
        return {
          groupId: group._id,
          name: group.name,
          status: group.status,
          city: group.address.city,
          state: group.address.state,
          effectiveDate: group.effectiveDate,
          createdAt: group.createdAt,
          memberCount,
          classCount,
          statistics: {
            totalMembers: memberCount,
            totalClasses: classCount
          }
        };
      })
    );
    
    res.status(200).json({
      success: true,
      data: {
        groups: groupsWithCounts,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / parseInt(limit))
        }
      }
    });
    
  } catch (error) {
    console.error('Error listing groups:', error);
    
    res.status(500).json({
      success: false,
      error: 'Internal server error while listing groups',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router; 