import MessageModel from '../models/messageModel.js';
import ConversationModel from '../models/conversationModel.js';

export const sendMessage = async (req, res) => {
  try {
    const { receiverId, content } = req.body;
    const senderId = req.user.uid;

    // Save message and get conversation info
    const { messageId, conversationId } = await MessageModel.saveMessage(senderId, receiverId, content);

    res.status(201).json({
      id: messageId,
      senderId,
      receiverId,
      content,
      conversationId,
      timestamp: new Date()
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getMessages = async (req, res) => {
  try {
    const { conversationId } = req.params;
    const userId = req.user.uid;

    // Verify user is part of conversation
    const conversation = await ConversationModel.getConversationById(conversationId);
    if (!conversation || 
        (conversation.participant1 !== userId && 
         conversation.participant2 !== userId)) {
      return res.status(403).json({ error: 'Not authorized to view these messages' });
    }

    const messages = await MessageModel.getConversationMessages(conversationId);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const getChatHistory = async (req, res) => {
  try {
    const { userId } = req.params;
    const currentUserId = req.user.uid;
    const limit = parseInt(req.query.limit) || 10;

    const messages = await MessageModel.getChatHistory(currentUserId, userId, limit);

    res.json(messages);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

export const deleteMessage = async (req, res) => {
  try {
    const { messageId } = req.params;
    const userId = req.user.uid;

    // This would need to be implemented in MessageModel
    // For now, return a placeholder response
    res.json({ message: 'Message deletion not yet implemented' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};
