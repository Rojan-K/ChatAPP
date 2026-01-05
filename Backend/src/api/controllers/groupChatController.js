import GroupChatModel from '../models/groupChatModel.js';
import { getIO } from '../../config/socket.js';

class GroupChatController {
    static async createGroupChat(req, res) {
        try {
            const { groupName, participants } = req.body;
            const creatorId = req.user.uid; // Use uid instead of id

            if (!groupName || groupName.trim().length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Group name is required' 
                });
            }

            if (!participants || !Array.isArray(participants) || participants.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'At least one participant is required' 
                });
            }

            // Remove duplicates and creator from participants
            const uniqueParticipants = [...new Set(participants)].filter(id => id !== creatorId);

            if (uniqueParticipants.length === 0) {
                return res.status(400).json({ 
                    success: false, 
                    message: 'Please add at least one other participant' 
                });
            }

            const groupId = await GroupChatModel.createGroupChat(
                groupName.trim(), 
                creatorId, 
                uniqueParticipants
            );

            // Get group details with participants
            const groupDetails = await GroupChatModel.getGroupParticipants(groupId);

            // Notify all participants via socket
            const io = getIO();
            uniqueParticipants.forEach(participantId => {
                io.to(`user_${participantId}`).emit('group_added', {
                    groupId,
                    groupName: groupName.trim(),
                    addedBy: creatorId
                });
            });

            res.status(201).json({
                success: true,
                message: 'Group chat created successfully',
                data: {
                    groupId,
                    groupName: groupName.trim(),
                    participants: groupDetails
                }
            });

        } catch (error) {
            console.error('Error creating group chat:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    static async getUserGroups(req, res) {
        try {
            const userId = req.user.uid; // Use uid instead of id
            const groups = await GroupChatModel.getUserGroups(userId);

            res.status(200).json({
                success: true,
                data: groups
            });

        } catch (error) {
            console.error('Error fetching user groups:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    static async getGroupParticipants(req, res) {
        try {
            const { groupId } = req.params;
            const userId = req.user.uid; // Use uid instead of id

            // Check if user is in the group
            const isMember = await GroupChatModel.isUserInGroup(userId, groupId);
            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this group'
                });
            }

            const participants = await GroupChatModel.getGroupParticipants(groupId);

            res.status(200).json({
                success: true,
                data: participants
            });

        } catch (error) {
            console.error('Error fetching group participants:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    static async addParticipant(req, res) {
        try {
            const { groupId } = req.params;
            const { userId } = req.body;
            const addedBy = req.user.uid; // Use uid instead of id

            // Check if requester is admin or creator
            // For now, allow any group member to add others
            const isMember = await GroupChatModel.isUserInGroup(addedBy, groupId);
            if (!isMember) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a member of this group'
                });
            }

            await GroupChatModel.addParticipant(groupId, userId, addedBy);

            // Notify via socket
            const io = getIO();
            io.to(`user_${userId}`).emit('group_added', {
                groupId,
                addedBy
            });

            res.status(200).json({
                success: true,
                message: 'Participant added successfully'
            });

        } catch (error) {
            console.error('Error adding participant:', error);
            res.status(500).json({
                success: false,
                message: error.message || 'Internal server error'
            });
        }
    }

    static async sendGroupMessage(req, res) {
        try {
            const { groupId, message, timestamp } = req.body;
            const userId = req.user.uid; 
            const userName = req.user.Fullname;

            console.log('=== GROUP MESSAGE CONTROLLER ===');
            console.log('Received group message request:', {
                groupId,
                message,
                timestamp,
                userId,
                userName
            });

            // Verify user is a participant in the group
            const isParticipant = await GroupChatModel.isParticipant(groupId, userId);
            if (!isParticipant) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a participant in this group'
                });
            }

            // Save message to database
            const messageResult = await GroupChatModel.sendGroupMessage(groupId, userId, message, timestamp);
            
            console.log('Group message saved to database:', messageResult);

            const broadcastTimestamp = messageResult.timestamp || timestamp || new Date().toISOString();

            // Get socket.io instance and broadcast to group
            const io = getIO();
            
            // Broadcast to all participants in the group
            io.to(`group_${groupId}`).emit('receive_group_message', {
                id: messageResult.id,
                groupId,
                senderId: userId,
                senderName: userName,
                message,
                timestamp: broadcastTimestamp
            });

            console.log('Group message broadcasted to group_' + groupId);

            res.status(200).json({
                success: true,
                message: 'Group message sent successfully',
                data: messageResult
            });

        } catch (error) {
            console.error('Error sending group message:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    static async getGroupMessages(req, res) {
        try {
            const { groupId } = req.params;
            const userId = req.user.uid; // Use uid instead of id
            const { limit = 15 } = req.query;

            console.log('=== GET GROUP MESSAGES ===');
            console.log('Fetching messages for group:', groupId, 'by user:', userId);

            // Verify user is a participant in the group
            const isParticipant = await GroupChatModel.isParticipant(groupId, userId);
            if (!isParticipant) {
                return res.status(403).json({
                    success: false,
                    message: 'You are not a participant in this group'
                });
            }

            // Get messages
            const messages = await GroupChatModel.getGroupMessages(groupId, parseInt(limit));
            
            console.log('Retrieved', messages.length, 'messages for group', groupId);

            res.status(200).json({
                success: true,
                data: messages
            });

        } catch (error) {
            console.error('Error getting group messages:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }

    static async leaveGroup(req, res) {
        try {
            const { groupId } = req.params;
            const userId = req.user.uid; // Use uid instead of id

            await GroupChatModel.removeParticipant(groupId, userId);

            // Notify via socket
            const io = getIO();
            io.to(`group_${groupId}`).emit('participant_left', {
                groupId,
                userId
            });

            res.status(200).json({
                success: true,
                message: 'Left group successfully'
            });

        } catch (error) {
            console.error('Error leaving group:', error);
            res.status(500).json({
                success: false,
                message: 'Internal server error',
                error: error.message
            });
        }
    }
}

export default GroupChatController;
