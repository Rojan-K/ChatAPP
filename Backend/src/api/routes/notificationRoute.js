import express from 'express';
import { getUserNotifications, markNotificationAsRead, getUnreadNotificationCount } from '../controllers/notificationController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.get('/', authenticateToken, getUserNotifications);
router.put('/:notificationId/read', authenticateToken, markNotificationAsRead);
router.get('/unread-count', authenticateToken, getUnreadNotificationCount);

export default router;