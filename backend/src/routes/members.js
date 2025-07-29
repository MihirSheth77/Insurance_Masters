const express = require('express');
const router = express.Router();
const multer = require('multer');
const csv = require('csv-parser');
const fs = require('fs');
const Member = require('../models/Member');
const Group = require('../models/Group');
const ICHRAClass = require('../models/ICHRAClass');
const IdeonAPIService = require('../services/IdeonAPIService');

// Configure multer for CSV file uploads
const upload = multer({
  dest: 'uploads/',
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
    files: 1
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === 'text/csv' || file.originalname.endsWith('.csv')) {
      cb(null, true);
    } else {
      cb(new Error('Only CSV files are allowed'));
    }
  }
});

/**
 * POST /api/groups/:groupId/members
 * Add individual member with Ideon API integration
 */
router.post('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      classId,
      personalInfo,
      previousContributions,
      dependents
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
    if (!classId) {
      return res.status(400).json({
        success: false,
        error: 'Class ID is required',
        code: 'MISSING_CLASS_ID'
      });
    }

    if (!personalInfo) {
      return res.status(400).json({
        success: false,
        error: 'Personal information is required',
        code: 'MISSING_PERSONAL_INFO'
      });
    }

    if (!previousContributions) {
      return res.status(400).json({
        success: false,
        error: 'Previous contributions information is required',
        code: 'MISSING_PREVIOUS_CONTRIBUTIONS'
      });
    }

    // Validate personal information
    if (!personalInfo.firstName || !personalInfo.lastName || !personalInfo.dateOfBirth || !personalInfo.zipCode) {
      return res.status(422).json({
        success: false,
        error: 'Personal info must include firstName, lastName, dateOfBirth, and zipCode',
        code: 'INCOMPLETE_PERSONAL_INFO'
      });
    }

    // Validate 5-digit ZIP code
    const zipNum = parseInt(personalInfo.zipCode);
    if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
      return res.status(422).json({
        success: false,
        error: 'ZIP code must be a valid 5-digit ZIP code',
        code: 'INVALID_ZIP_CODE'
      });
    }

    // Validate date of birth
    const dob = new Date(personalInfo.dateOfBirth);
    if (isNaN(dob.getTime())) {
      return res.status(422).json({
        success: false,
        error: 'Invalid date of birth format',
        code: 'INVALID_DATE_OF_BIRTH'
      });
    }

    // Validate previous contributions
    if (!previousContributions.planName || 
        isNaN(previousContributions.employerContribution) || 
        isNaN(previousContributions.memberContribution)) {
      return res.status(422).json({
        success: false,
        error: 'Previous contributions must include planName, employerContribution, and memberContribution',
        code: 'INCOMPLETE_PREVIOUS_CONTRIBUTIONS'
      });
    }

    // Verify class exists and belongs to group
    const ichraClass = await ICHRAClass.findOne({
      _id: classId,
      groupId: groupId,
      isActive: true
    });

    if (!ichraClass) {
      return res.status(404).json({
        success: false,
        error: 'Class not found in this group',
        code: 'CLASS_NOT_FOUND'
      });
    }

    // Validate dependents if provided
    if (dependents && Array.isArray(dependents)) {
      for (let i = 0; i < dependents.length; i++) {
        const dependent = dependents[i];
        
        if (!dependent.firstName || !dependent.lastName || !dependent.dateOfBirth || !dependent.relationship) {
          return res.status(422).json({
            success: false,
            error: `Dependent ${i + 1} must include firstName, lastName, dateOfBirth, and relationship`,
            code: 'INCOMPLETE_DEPENDENT_INFO'
          });
        }

        const depDob = new Date(dependent.dateOfBirth);
        if (isNaN(depDob.getTime())) {
          return res.status(422).json({
            success: false,
            error: `Invalid date of birth for dependent ${i + 1}`,
            code: 'INVALID_DEPENDENT_DOB'
          });
        }

        if (!['spouse', 'child', 'domestic_partner', 'other'].includes(dependent.relationship)) {
          return res.status(422).json({
            success: false,
            error: `Invalid relationship for dependent ${i + 1}`,
            code: 'INVALID_DEPENDENT_RELATIONSHIP'
          });
        }
      }
    }

    // Create member data for local MongoDB storage
    const localMemberData = {
      personalInfo: {
        firstName: personalInfo.firstName.trim(),
        lastName: personalInfo.lastName.trim(),
        dateOfBirth: dob,
        zipCode: personalInfo.zipCode,
        tobacco: personalInfo.tobacco || false,
        householdIncome: personalInfo.householdIncome || 50000, // Default to 50k if not provided
        familySize: personalInfo.familySize || 1 // Default to 1 if not provided
      },
      previousContributions: {
        employerContribution: parseFloat(previousContributions.employerContribution),
        memberContribution: parseFloat(previousContributions.memberContribution),
        planName: previousContributions.planName.trim(),
        planType: previousContributions.planType || 'Other',
        metalLevel: previousContributions.metalLevel || 'Other',
        carrier: previousContributions.carrier
      },
      dependents: dependents || [],
      classId: classId
    };

    // Get location_id from the Ideon group data
    let locationId = null;
    if (group.ideonGroupId) {
      // Try to get location from group metadata
      locationId = group.metadata?.ideonLocationId;
      
      // If no location_id is stored, we need to handle this differently
      // For now, we'll skip the Ideon API call when location_id is missing
      if (!locationId) {
        console.warn(`No location_id found for group ${group._id}. Skipping Ideon API call.`);
      }
    }

    // Create member data for Ideon API (matching official documentation)
    const ideonMemberData = {
      dateOfBirth: dob.toISOString().split('T')[0], // YYYY-MM-DD format
      zipCode: personalInfo.zipCode,
      tobaccoUse: personalInfo.tobacco || false,
      gender: personalInfo.gender || 'M', // Default to M if not specified
      locationId: locationId,
      fipsCode: '41051', // Multnomah County, OR
      dependents: (dependents || []).map(dep => ({
        dateOfBirth: dep.dateOfBirth,
        gender: dep.gender || 'M',
        tobaccoUse: dep.tobacco || false,
        relationship: dep.relationship
      }))
    };

    // Create in Ideon API (with error handling)
    let ideonResponse = null;
    if (group.ideonGroupId && locationId) {
      try {
        ideonResponse = await IdeonAPIService.createMember(group.ideonGroupId, ideonMemberData);
      } catch (ideonError) {
        console.error('Ideon API error:', ideonError.message);
        // Continue with local creation even if Ideon fails
        ideonResponse = { id: `local_${Date.now()}` };
      }
    } else {
      // No Ideon integration available, create local ID
      console.log('Creating member locally without Ideon integration');
      ideonResponse = { id: `local_${Date.now()}` };
    }

    // Create member in MongoDB
    const member = new Member({
      groupId: groupId,
      ideonMemberId: ideonResponse.id,
      classId: classId,
      personalInfo: {
        ...localMemberData.personalInfo,
        age: 0 // Temporary value, will be calculated by pre-save middleware
      },
      previousContributions: localMemberData.previousContributions,
      dependents: localMemberData.dependents.map((dep, index) => ({
        ...dep,
        ideonDependentId: `${ideonResponse.id}_dep_${index}`,
        age: 0 // Temporary value, will be calculated by pre-save middleware
      })),
      status: 'active'
    });

    await member.save();

    // Update class member count
    await ICHRAClass.updateMemberCount(classId, await Member.countDocuments({
      classId: classId,
      status: 'active'
    }));

    // 201 Created - Successfully created
    res.status(201).json({
      success: true,
      data: {
        memberId: member._id,
        ideonMemberId: member.ideonMemberId,
        groupId: member.groupId,
        classId: member.classId,
        personalInfo: member.personalInfo,
        familySize: member.familySize,
        createdAt: member.createdAt
      }
    });

  } catch (error) {
    console.error('Error creating member:', error);

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
      error: 'Internal server error while creating member',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * POST /api/groups/:groupId/members/bulk
 * CSV upload endpoint with progress tracking
 */
router.post('/groups/:groupId/members/bulk', upload.single('csvFile'), async (req, res) => {
  let uploadedFilePath = null;
  
  try {
    const { groupId } = req.params;
    const { defaultClassId } = req.body;

    // 422 Unprocessable Entity - Invalid groupId format
    if (!groupId.match(/^[0-9a-fA-F]{24}$/)) {
      return res.status(422).json({
        success: false,
        error: 'Invalid group ID format',
        code: 'INVALID_GROUP_ID'
      });
    }

    // 400 Bad Request - Missing file
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'CSV file is required',
        code: 'MISSING_CSV_FILE'
      });
    }

    uploadedFilePath = req.file.path;

    // Verify group exists
    const group = await Group.findById(groupId);
    if (!group) {
      return res.status(404).json({
        success: false,
        error: 'Group not found',
        code: 'GROUP_NOT_FOUND'
      });
    }

    // Verify default class if provided
    if (defaultClassId) {
      const defaultClass = await ICHRAClass.findOne({
        _id: defaultClassId,
        groupId: groupId,
        isActive: true
      });

      if (!defaultClass) {
        return res.status(404).json({
          success: false,
          error: 'Default class not found',
          code: 'DEFAULT_CLASS_NOT_FOUND'
        });
      }
    }

    // Process CSV file
    const members = [];
    const errors = [];
    let processedCount = 0;

    return new Promise((resolve, reject) => {
      fs.createReadStream(uploadedFilePath)
        .pipe(csv())
        .on('data', (row) => {
          processedCount++;
          
          try {
            // Validate required CSV columns
            if (!row.firstName || !row.lastName || !row.dateOfBirth || !row.zipCode) {
              errors.push({
                row: processedCount,
                error: 'Missing required fields: firstName, lastName, dateOfBirth, zipCode',
                data: row
              });
              return;
            }

            // Validate ZIP code
            const zipNum = parseInt(row.zipCode);
            if (isNaN(zipNum) || zipNum < 10000 || zipNum > 99999) {
              errors.push({
                row: processedCount,
                error: 'Invalid ZIP code (must be a valid 5-digit ZIP code)',
                data: row
              });
              return;
            }

            // Validate date of birth
            const dob = new Date(row.dateOfBirth);
            if (isNaN(dob.getTime())) {
              errors.push({
                row: processedCount,
                error: 'Invalid date of birth format',
                data: row
              });
              return;
            }

            // Build member object
            const memberData = {
              personalInfo: {
                firstName: row.firstName.trim(),
                lastName: row.lastName.trim(),
                dateOfBirth: dob,
                zipCode: row.zipCode,
                tobacco: row.tobacco === 'true' || row.tobacco === '1',
                gender: row.gender || 'M' // Default to M if not provided
              },
              previousContributions: {
                employerContribution: parseFloat(row.employerContribution) || 0,
                memberContribution: parseFloat(row.memberContribution) || 0,
                planName: row.planName || 'Unknown',
                planType: row.planType || 'Other',
                metalLevel: row.metalLevel || 'Other',
                carrier: row.carrier || null
              },
              classId: row.classId || defaultClassId,
              dependents: []
            };

            // Parse dependents if provided
            if (row.dependents) {
              try {
                memberData.dependents = JSON.parse(row.dependents);
              } catch (depError) {
                errors.push({
                  row: processedCount,
                  error: 'Invalid dependents JSON format',
                  data: row
                });
                return;
              }
            }

            members.push({ row: processedCount, data: memberData });
          } catch (error) {
            errors.push({
              row: processedCount,
              error: error.message,
              data: row
            });
          }
        })
        .on('end', async () => {
          try {
            // Process valid members
            const successfulMembers = [];
            const failedMembers = [];

            for (const memberEntry of members) {
              try {
                // Check if we have location_id for Ideon integration
                const locationId = group.metadata?.ideonLocationId;
                let ideonResponse = null;
                
                // Only call Ideon if we have both groupId and locationId
                if (group.ideonGroupId && locationId) {
                  try {
                    // Create properly formatted Ideon API data (flat structure)
                    const ideonMemberData = {
                      dateOfBirth: memberEntry.data.personalInfo.dateOfBirth.toISOString().split('T')[0], // YYYY-MM-DD format
                      zipCode: memberEntry.data.personalInfo.zipCode,
                      tobaccoUse: memberEntry.data.personalInfo.tobacco || false,
                      gender: memberEntry.data.personalInfo.gender || 'M',
                      locationId: locationId,
                      fipsCode: '41051', // Multnomah County, OR
                      dependents: (memberEntry.data.dependents || []).map(dep => ({
                        dateOfBirth: dep.dateOfBirth,
                        gender: dep.gender || 'M',
                        tobaccoUse: dep.tobacco || false,
                        relationship: dep.relationship
                      }))
                    };
                    
                    ideonResponse = await IdeonAPIService.createMember(
                      group.ideonGroupId, 
                      ideonMemberData
                    );
                  } catch (ideonError) {
                    console.error('Ideon API error for row', memberEntry.row, ':', ideonError.message);
                    // Continue with local creation even if Ideon fails
                    ideonResponse = { id: `local_${Date.now()}_${memberEntry.row}` };
                  }
                } else {
                  // No Ideon integration available, create local ID
                  console.log('Creating member locally without Ideon integration for row', memberEntry.row);
                  ideonResponse = { id: `local_${Date.now()}_${memberEntry.row}` };
                }

                // Create in MongoDB
                const member = new Member({
                  groupId: groupId,
                  ideonMemberId: ideonResponse.id,
                  classId: memberEntry.data.classId,
                  personalInfo: memberEntry.data.personalInfo,
                  previousContributions: memberEntry.data.previousContributions,
                  dependents: memberEntry.data.dependents.map(dep => ({
                    ...dep,
                    ideonDependentId: `${ideonResponse.id}_${dep.firstName}_${dep.lastName}`,
                    age: 0 // Will be calculated by pre-save middleware
                  })),
                  status: 'active'
                });

                await member.save();
                successfulMembers.push({
                  row: memberEntry.row,
                  memberId: member._id,
                  ideonMemberId: member.ideonMemberId
                });

              } catch (memberError) {
                failedMembers.push({
                  row: memberEntry.row,
                  error: memberError.message,
                  data: memberEntry.data
                });
              }
            }

            // Update class member counts
            const classIds = [...new Set(successfulMembers.map(m => m.classId))];
            for (const classId of classIds) {
              const count = await Member.countDocuments({
                classId: classId,
                status: 'active'
              });
              await ICHRAClass.updateMemberCount(classId, count);
            }

            // Clean up uploaded file
            if (uploadedFilePath) {
              fs.unlinkSync(uploadedFilePath);
            }

            // Return success/failure report
            const response = {
              success: true,
              data: {
                summary: {
                  totalProcessed: processedCount,
                  successful: successfulMembers.length,
                  failed: failedMembers.length + errors.length,
                  validationErrors: errors.length,
                  apiErrors: failedMembers.length
                },
                successfulMembers: successfulMembers,
                errors: [...errors, ...failedMembers]
              }
            };

            // 207 Multi-Status if there are failures, 201 if all successful
            if (errors.length > 0 || failedMembers.length > 0) {
              res.status(207).json(response);
            } else {
              res.status(201).json(response);
            }

            resolve();
          } catch (processError) {
            console.error('Error processing bulk upload:', processError);
            reject(processError);
          }
        })
        .on('error', (streamError) => {
          console.error('Error reading CSV file:', streamError);
          reject(streamError);
        });
    });

  } catch (error) {
    console.error('Error in bulk member upload:', error);

    // Clean up uploaded file
    if (uploadedFilePath) {
      try {
        fs.unlinkSync(uploadedFilePath);
      } catch (cleanupError) {
        console.error('Error cleaning up file:', cleanupError);
      }
    }

    // 413 Payload Too Large - File size exceeded
    if (error.code === 'LIMIT_FILE_SIZE') {
      return res.status(413).json({
        success: false,
        error: 'File size too large. Maximum 10MB allowed',
        code: 'FILE_TOO_LARGE'
      });
    }

    // 415 Unsupported Media Type - Wrong file type
    if (error.message === 'Only CSV files are allowed') {
      return res.status(415).json({
        success: false,
        error: 'Only CSV files are allowed',
        code: 'INVALID_FILE_TYPE'
      });
    }

    // 503 Service Unavailable - Database or API issues
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
      error: 'Internal server error during bulk upload',
      code: 'INTERNAL_ERROR'
    });
  }
});

/**
 * GET /api/groups/:groupId/members/debug
 * Debug endpoint to check member data
 */
router.get('/groups/:groupId/members/debug', async (req, res) => {
  try {
    const { groupId } = req.params;
    
    const members = await Member.find({ groupId: groupId, status: 'active' })
      .select('personalInfo previousContributions')
      .limit(5);
    
    const debugInfo = members.map(m => ({
      name: `${m.personalInfo.firstName} ${m.personalInfo.lastName}`,
      previousContributions: m.previousContributions,
      hasPreviousData: !!(m.previousContributions?.employerContribution || m.previousContributions?.memberContribution)
    }));
    
    res.json({
      success: true,
      data: {
        totalMembers: members.length,
        membersWithPreviousData: debugInfo.filter(m => m.hasPreviousData).length,
        members: debugInfo
      }
    });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/groups/:groupId/members
 * List members with pagination and filtering
 */
router.get('/groups/:groupId/members', async (req, res) => {
  try {
    const { groupId } = req.params;
    const { 
      classId, 
      page = 1, 
      limit = 20, 
      includeInactive = false,
      search 
    } = req.query;

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

    // Validate pagination parameters
    const pageNum = parseInt(page);
    const limitNum = parseInt(limit);

    if (isNaN(pageNum) || pageNum < 1) {
      return res.status(422).json({
        success: false,
        error: 'Page must be a positive number',
        code: 'INVALID_PAGE'
      });
    }

    if (isNaN(limitNum) || limitNum < 1 || limitNum > 100) {
      return res.status(422).json({
        success: false,
        error: 'Limit must be between 1 and 100',
        code: 'INVALID_LIMIT'
      });
    }

    // Build query
    const query = { groupId: groupId };

    // Filter by class
    if (classId) {
      if (!classId.match(/^[0-9a-fA-F]{24}$/)) {
        return res.status(422).json({
          success: false,
          error: 'Invalid class ID format',
          code: 'INVALID_CLASS_ID'
        });
      }
      query.classId = classId;
    }

    // Include/exclude inactive members
    if (!includeInactive || includeInactive === 'false') {
      query.status = 'active';
    }

    // Search functionality
    if (search && search.trim().length > 0) {
      const searchRegex = new RegExp(search.trim(), 'i');
      query.$or = [
        { 'personalInfo.firstName': searchRegex },
        { 'personalInfo.lastName': searchRegex },
        { ideonMemberId: searchRegex }
      ];
    }

    // Get total count
    const total = await Member.countDocuments(query);

    // Calculate pagination
    const skip = (pageNum - 1) * limitNum;
    const totalPages = Math.ceil(total / limitNum);

    // Get members with pagination
    const members = await Member.find(query)
      .populate('classId', 'name type employeeContribution dependentContribution')
      .sort({ 'personalInfo.lastName': 1, 'personalInfo.firstName': 1 })
      .skip(skip)
      .limit(limitNum);

    // Include contribution details
    const membersWithContributions = members.map(member => {
      const contribution = member.classId ? 
        member.classId.getContributionForAge(member.personalInfo.age) :
        { employee: 0, dependent: 0 };

      return {
        memberId: member._id,
        ideonMemberId: member.ideonMemberId,
        personalInfo: member.personalInfo,
        className: member.classId?.name || 'Unknown',
        classType: member.classId?.type || 'Unknown',
        familySize: member.familySize,
        dependents: member.dependents,
        status: member.status,
        contributions: {
          employee: contribution.employee,
          dependent: contribution.dependent,
          totalDependentContribution: contribution.dependent * (member.dependents?.length || 0)
        },
        previousContributions: member.previousContributions,
        createdAt: member.createdAt,
        updatedAt: member.updatedAt
      };
    });

    // 200 OK - Success with member list
    res.status(200).json({
      success: true,
      data: {
        groupId: groupId,
        groupName: group.name,
        members: membersWithContributions,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total: total,
          totalPages: totalPages,
          hasNextPage: pageNum < totalPages,
          hasPreviousPage: pageNum > 1
        },
        filters: {
          classId: classId || null,
          includeInactive: includeInactive === 'true',
          search: search || null
        }
      }
    });

  } catch (error) {
    console.error('Error fetching members:', error);

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
      error: 'Internal server error while fetching members',
      code: 'INTERNAL_ERROR'
    });
  }
});

module.exports = router; 