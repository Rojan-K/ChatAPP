import express from 'express';
import { searchUsers, updateUser, getFriends } from '../controllers/userController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';
import { testFriendship } from '../models/userModel.js';

const router = express.Router();

router.get('/search', authenticateToken, searchUsers);
router.get('/friends', authenticateToken, getFriends);
router.get('/test-friendship', authenticateToken, testFriendship);
router.put('/profile', authenticateToken, updateUser);

export default router;