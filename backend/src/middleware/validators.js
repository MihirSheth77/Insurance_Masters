const { body, param, query, validationResult } = require('express-validator');

/**
 * Validation middleware using express-validator
 * Implements Google-standard input validation
 */

/**
 * Helper to handle validation errors
 */
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(422).json({
      success: false,
      error: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: errors.array().map(err => ({
        field: err.param,
        message: err.msg,
        value: err.value
      }))
    });
  }
  next();
};

/**
 * MongoDB ObjectId validation
 */
const isValidObjectId = (value) => {
  return value && value.match(/^[0-9a-fA-F]{24}$/);
};

/**
 * Group validation rules
 */
const groupValidators = {
  create: [
    body('groupName')
      .trim()
      .notEmpty().withMessage('Group name is required')
      .isLength({ min: 2, max: 100 }).withMessage('Group name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,']+$/).withMessage('Group name contains invalid characters'),
    body('address.street')
      .trim()
      .notEmpty().withMessage('Street address is required')
      .isLength({ max: 200 }).withMessage('Street address too long'),
    body('address.city')
      .trim()
      .notEmpty().withMessage('City is required')
      .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('City contains invalid characters'),
    body('address.state')
      .trim()
      .notEmpty().withMessage('State is required')
      .isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters')
      .isAlpha().withMessage('State must contain only letters'),
    body('address.zipCode')
      .trim()
      .notEmpty().withMessage('ZIP code is required')
      .matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format'),
    body('effectiveDate')
      .notEmpty().withMessage('Effective date is required')
      .isISO8601().withMessage('Invalid date format')
      .custom(value => {
        const date = new Date(value);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return date >= today;
      }).withMessage('Effective date must be today or in the future'),
    handleValidationErrors
  ],

  update: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    body('groupName')
      .optional()
      .trim()
      .isLength({ min: 2, max: 100 }).withMessage('Group name must be between 2 and 100 characters')
      .matches(/^[a-zA-Z0-9\s\-&.,']+$/).withMessage('Group name contains invalid characters'),
    body('address.street')
      .optional()
      .trim()
      .isLength({ max: 200 }).withMessage('Street address too long'),
    body('address.city')
      .optional()
      .trim()
      .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('City contains invalid characters'),
    body('address.state')
      .optional()
      .trim()
      .isLength({ min: 2, max: 2 }).withMessage('State must be 2 characters')
      .isAlpha().withMessage('State must contain only letters'),
    body('address.zipCode')
      .optional()
      .trim()
      .matches(/^\d{5}(-\d{4})?$/).withMessage('Invalid ZIP code format'),
    handleValidationErrors
  ],

  getById: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    handleValidationErrors
  ]
};

/**
 * ICHRA Class validation rules
 */
const classValidators = {
  create: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    body('name')
      .trim()
      .notEmpty().withMessage('Class name is required')
      .isLength({ min: 2, max: 50 }).withMessage('Class name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9\s\-]+$/).withMessage('Class name contains invalid characters'),
    body('type')
      .notEmpty().withMessage('Class type is required')
      .isIn(['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'])
      .withMessage('Invalid class type'),
    body('employeeContribution')
      .notEmpty().withMessage('Employee contribution is required')
      .isFloat({ min: 0, max: 10000 }).withMessage('Employee contribution must be between 0 and 10000'),
    body('dependentContribution')
      .notEmpty().withMessage('Dependent contribution is required')
      .isFloat({ min: 0, max: 10000 }).withMessage('Dependent contribution must be between 0 and 10000'),
    body('parentClassId')
      .optional()
      .custom(isValidObjectId).withMessage('Invalid parent class ID format'),
    handleValidationErrors
  ],

  update: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    param('classId')
      .custom(isValidObjectId).withMessage('Invalid class ID format'),
    body('name')
      .optional()
      .trim()
      .isLength({ min: 2, max: 50 }).withMessage('Class name must be between 2 and 50 characters')
      .matches(/^[a-zA-Z0-9\s\-]+$/).withMessage('Class name contains invalid characters'),
    body('type')
      .optional()
      .isIn(['full-time', 'part-time', 'seasonal', 'salaried', 'hourly', 'other'])
      .withMessage('Invalid class type'),
    body('employeeContribution')
      .optional()
      .isFloat({ min: 0, max: 10000 }).withMessage('Employee contribution must be between 0 and 10000'),
    body('dependentContribution')
      .optional()
      .isFloat({ min: 0, max: 10000 }).withMessage('Dependent contribution must be between 0 and 10000'),
    handleValidationErrors
  ],

  getByGroup: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    query('includeInactive')
      .optional()
      .isBoolean().withMessage('Include inactive must be boolean'),
    handleValidationErrors
  ],

  getById: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    param('classId')
      .custom(isValidObjectId).withMessage('Invalid class ID format'),
    handleValidationErrors
  ],

  delete: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    param('classId')
      .custom(isValidObjectId).withMessage('Invalid class ID format'),
    query('force')
      .optional()
      .isBoolean().withMessage('Force parameter must be boolean'),
    handleValidationErrors
  ],

  createSubClasses: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    param('classId')
      .custom(isValidObjectId).withMessage('Invalid class ID format'),
    body('ageBasedContributions')
      .isArray({ min: 1 }).withMessage('Age-based contributions must be a non-empty array'),
    body('ageBasedContributions.*.minAge')
      .isInt({ min: 0, max: 120 }).withMessage('Min age must be between 0 and 120'),
    body('ageBasedContributions.*.maxAge')
      .isInt({ min: 0, max: 120 }).withMessage('Max age must be between 0 and 120'),
    body('ageBasedContributions.*.employeeContribution')
      .isFloat({ min: 0, max: 10000 }).withMessage('Employee contribution must be between 0 and 10000'),
    body('ageBasedContributions.*.dependentContribution')
      .isFloat({ min: 0, max: 10000 }).withMessage('Dependent contribution must be between 0 and 10000'),
    handleValidationErrors
  ]
};

/**
 * Member validation rules
 */
const memberValidators = {
  create: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    body('firstName')
      .trim()
      .notEmpty().withMessage('First name is required')
      .isLength({ min: 1, max: 50 }).withMessage('First name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('First name contains invalid characters'),
    body('lastName')
      .trim()
      .notEmpty().withMessage('Last name is required')
      .isLength({ min: 1, max: 50 }).withMessage('Last name must be between 1 and 50 characters')
      .matches(/^[a-zA-Z\s\-'.]+$/).withMessage('Last name contains invalid characters'),
    body('dateOfBirth')
      .notEmpty().withMessage('Date of birth is required')
      .isISO8601().withMessage('Invalid date format')
      .custom(value => {
        const age = new Date().getFullYear() - new Date(value).getFullYear();
        return age >= 0 && age <= 120;
      }).withMessage('Invalid age'),
    body('zipCode')
      .trim()
      .notEmpty().withMessage('ZIP code is required')
      .matches(/^\d{5}$/).withMessage('ZIP code must be 5 digits'),
    body('gender')
      .optional()
      .isIn(['male', 'female', 'other']).withMessage('Invalid gender'),
    body('tobaccoUse')
      .optional()
      .isBoolean().withMessage('Tobacco use must be boolean'),
    body('householdIncome')
      .notEmpty().withMessage('Household income is required')
      .isFloat({ min: 0, max: 999999 }).withMessage('Household income must be between $0 and $999,999'),
    body('familySize')
      .notEmpty().withMessage('Family size is required')
      .isInt({ min: 1, max: 8 }).withMessage('Family size must be between 1 and 8'),
    body('classId')
      .notEmpty().withMessage('Class ID is required')
      .custom(isValidObjectId).withMessage('Invalid class ID format'),
    body('previousContributions.employerContribution')
      .notEmpty().withMessage('Previous employer contribution is required')
      .isFloat({ min: 0, max: 10000 }).withMessage('Invalid employer contribution amount'),
    body('previousContributions.memberContribution')
      .notEmpty().withMessage('Previous member contribution is required')
      .isFloat({ min: 0, max: 10000 }).withMessage('Invalid member contribution amount'),
    body('previousContributions.planName')
      .trim()
      .notEmpty().withMessage('Previous plan name is required')
      .isLength({ max: 100 }).withMessage('Plan name too long'),
    handleValidationErrors
  ],

  bulkUpload: [
    param('groupId')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    body('defaultClassId')
      .optional()
      .custom(isValidObjectId).withMessage('Invalid class ID format'),
    handleValidationErrors
  ]
};

/**
 * Quote validation rules
 */
const quoteValidators = {
  generate: [
    body('groupId')
      .notEmpty().withMessage('Group ID is required')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    body('options')
      .optional()
      .isObject().withMessage('Options must be an object'),
    handleValidationErrors
  ],

  getById: [
    param('quoteId')
      .custom(isValidObjectId).withMessage('Invalid quote ID format'),
    query('includeDetails')
      .optional()
      .isBoolean().withMessage('Include details must be boolean'),
    query('page')
      .optional()
      .isInt({ min: 1 }).withMessage('Page must be a positive integer'),
    query('limit')
      .optional()
      .isInt({ min: 1, max: 100 }).withMessage('Limit must be between 1 and 100'),
    handleValidationErrors
  ],

  updateFilters: [
    param('quoteId')
      .custom(isValidObjectId).withMessage('Invalid quote ID format'),
    body('filters')
      .notEmpty().withMessage('Filters are required')
      .isObject().withMessage('Filters must be an object'),
    body('filters.carriers')
      .optional()
      .isArray().withMessage('Carriers must be an array'),
    body('filters.metalLevels')
      .optional()
      .isArray().withMessage('Metal levels must be an array')
      .custom(levels => {
        const valid = ['bronze', 'silver', 'gold', 'platinum', 'catastrophic'];
        return levels.every(level => valid.includes(level.toLowerCase()));
      }).withMessage('Invalid metal level'),
    body('filters.marketType')
      .optional()
      .isIn(['on-market', 'off-market', 'both']).withMessage('Invalid market type'),
    handleValidationErrors
  ],

  export: [
    param('quoteId')
      .custom(isValidObjectId).withMessage('Invalid quote ID format'),
    body('format')
      .optional()
      .isIn(['csv', 'excel', 'pdf', 'json']).withMessage('Invalid export format'),
    body('includeDetails')
      .optional()
      .isBoolean().withMessage('Include details must be boolean'),
    handleValidationErrors
  ]
};

/**
 * ICHRA Affordability validation rules
 */
const ichraValidators = {
  calculate: [
    body('groupId')
      .notEmpty().withMessage('Group ID is required')
      .custom(isValidObjectId).withMessage('Invalid group ID format'),
    body('memberId')
      .notEmpty().withMessage('Member ID is required')
      .custom(isValidObjectId).withMessage('Invalid member ID format'),
    body('options')
      .optional()
      .isObject().withMessage('Options must be an object'),
    body('options.householdIncome')
      .optional()
      .isFloat({ min: 0, max: 1000000 }).withMessage('Invalid household income'),
    handleValidationErrors
  ]
};

module.exports = {
  groupValidators,
  classValidators,
  memberValidators,
  quoteValidators,
  ichraValidators,
  handleValidationErrors
};