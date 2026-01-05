import express from 'express';
import { sendMessage, getMessages, getChatHistory, deleteMessage } from '../controllers/messageController.js';
import { authenticateToken } from '../middleware/authMiddleware.js';

const router = express.Router();

router.post('/send', authenticateToken, sendMessage);
router.get('/history/:userId', authenticateToken, getChatHistory);
router.get('/:conversationId', authenticateToken, getMessages);
router.delete('/:messageId', authenticateToken, deleteMessage);

export default router;
