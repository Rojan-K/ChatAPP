import express from 'express';
import GroupChatController from '../controllers/groupChatController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

// Create a new group chat
router.post('/create', authenticateToken, GroupChatController.createGroupChat);

// Get all groups for the current user
router.get('/my-groups', authenticateToken, GroupChatController.getUserGroups);

// Get participants of a specific group
router.get('/:groupId/participants', authenticateToken, GroupChatController.getGroupParticipants);

// Add a participant to a group
router.post('/:groupId/participants', authenticateToken, GroupChatController.addParticipant);

// Leave a group
router.delete('/:groupId/leave', authenticateToken, GroupChatController.leaveGroup);

// Send a message to a group
router.post('/send-message', authenticateToken, GroupChatController.sendGroupMessage);

// Get group chat history
router.get('/:groupId/messages', authenticateToken, GroupChatController.getGroupMessages);

export default router;
