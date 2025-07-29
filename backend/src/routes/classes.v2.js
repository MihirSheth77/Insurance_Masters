/**
 * ICHRA Classes Routes
 * Google-standard implementation with proper controller usage
 */

const express = require('express');
const router = express.Router();
const classController = require('../controllers/classController');
const { classValidators } = require('../middleware/validators');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * @route   POST /api/groups/:groupId/classes
 * @desc    Create new ICHRA class
 * @access  Private
 */
router.post(
  '/:groupId/classes',
  classValidators.create,
  catchAsync(classController.createClass)
);

/**
 * @route   GET /api/groups/:groupId/classes
 * @desc    Get all classes for a group
 * @access  Private
 */
router.get(
  '/:groupId/classes',
  classValidators.getByGroup,
  catchAsync(classController.getClasses)
);

/**
 * @route   GET /api/groups/:groupId/classes/:classId
 * @desc    Get single class by ID
 * @access  Private
 */
router.get(
  '/:groupId/classes/:classId',
  classValidators.getById,
  catchAsync(classController.getClass)
);

/**
 * @route   PUT /api/groups/:groupId/classes/:classId
 * @desc    Update ICHRA class
 * @access  Private
 */
router.put(
  '/:groupId/classes/:classId',
  classValidators.update,
  catchAsync(classController.updateClass)
);

/**
 * @route   DELETE /api/groups/:groupId/classes/:classId
 * @desc    Delete ICHRA class
 * @access  Private
 */
router.delete(
  '/:groupId/classes/:classId',
  classValidators.delete,
  catchAsync(classController.deleteClass)
);

/**
 * @route   POST /api/groups/:groupId/classes/:classId/subclasses
 * @desc    Create age-based sub-classes
 * @access  Private
 */
router.post(
  '/:groupId/classes/:classId/subclasses',
  classValidators.createSubClasses,
  catchAsync(classController.createSubClasses)
);

module.exports = router;