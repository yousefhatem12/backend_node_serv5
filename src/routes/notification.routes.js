const express = require('express');
const router = express.Router();

const authMiddleware = require('../middlewares/auth.middleware');
const validate = require('../middlewares/validate.middleware');
const NotificationController = require('../controllers/notification.controller');

const {
  listNotificationsQuerySchema,
  notificationParamSchema
} = require('../validators');

// All notification routes require authentication
router.use(authMiddleware);

// Get unread counter badge
router.get('/unread-count', NotificationController.unreadCount);

// Mark all notifications as read
router.patch('/read-all', NotificationController.markAllAsRead);

// List notifications with pagination and unread_only filter
router.get('/', validate(listNotificationsQuerySchema), NotificationController.list);

// Mark a single notification as read
router.patch('/:notification/read', validate(notificationParamSchema), NotificationController.markAsRead);

module.exports = router;
