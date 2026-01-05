import { pool } from "../../config/db.js";

class GroupChatModel {
    static async createGroupChat(groupName, creatorId, participants) {
        try {
            // Validate inputs
            if (!groupName || groupName.trim() === '') {
                throw new Error('Group name is required');
            }
            if (!creatorId) {
                throw new Error('Creator ID is required');
            }
            if (!participants || !Array.isArray(participants) || participants.length === 0) {
                throw new Error('Participants array is required');
            }

            // Start transaction
            const connection = await pool.getConnection();
            await connection.beginTransaction();

            try {
                // Create the group chat
                const [groupResult] = await connection.execute(
                    `INSERT INTO group_chats (name, created_by, created_at) VALUES (?, ?, NOW())`,
                    [groupName, creatorId]
                );
                const groupId = groupResult.insertId;

                // Add creator as a participant
                await connection.execute(
                    `INSERT INTO group_participants (group_id, user_id, joined_at, role) VALUES (?, ?, NOW(), 'admin')`,
                    [groupId, creatorId]
                );

                // Add other participants (exclude creator to prevent duplicates)
                const uniqueParticipants = participants.filter(id => id !== creatorId);
                for (const participantId of uniqueParticipants) {
                    if (!participantId) {
                        throw new Error('Participant ID cannot be undefined');
                    }
                    await connection.execute(
                        `INSERT INTO group_participants (group_id, user_id, joined_at, role) VALUES (?, ?, NOW(), 'member')`,
                        [groupId, participantId]
                    );
                }

                await connection.commit();
                return groupId;
            } catch (error) {
                await connection.rollback();
                throw error;
            } finally {
                connection.release();
            }
        } catch (error) {
            console.error('Error creating group chat:', error);
            throw error;
        }
    }

    static async getUserGroups(userId) {
        const query = `
            SELECT 
                gc.*,
                gp.role,
                gp.joined_at,
                (SELECT COUNT(*) FROM group_participants WHERE group_id = gc.id) as participant_count
            FROM group_chats gc
            JOIN group_participants gp ON gc.id = gp.group_id
            WHERE gp.user_id = ?
            ORDER BY gc.created_at DESC
        `;
        
        const [groups] = await pool.execute(query, [userId]);
        return groups;
    }

    static async getGroupParticipants(groupId) {
        const query = `
            SELECT 
                gp.user_id,
                gp.role,
                gp.joined_at,
                u.full_name,
                u.email,
                u.pic_url as profile_pic
            FROM group_participants gp
            JOIN users u ON gp.user_id = u.user_id
            WHERE gp.group_id = ?
            ORDER BY gp.joined_at ASC
        `;
        
        const [participants] = await pool.execute(query, [groupId]);
        return participants;
    }

    static async isUserInGroup(userId, groupId) {
        const query = `
            SELECT COUNT(*) as count FROM group_participants 
            WHERE user_id = ? AND group_id = ?
        `;
        
        const [result] = await pool.execute(query, [userId, groupId]);
        return result[0].count > 0;
    }

    static async addParticipant(groupId, userId, addedBy) {
        try {
            // Check if user is already in group
            const [existing] = await pool.execute(
                `SELECT COUNT(*) as count FROM group_participants WHERE group_id = ? AND user_id = ?`,
                [groupId, userId]
            );

            if (existing[0].count > 0) {
                throw new Error('User is already in the group');
            }

            await pool.execute(
                `INSERT INTO group_participants (group_id, user_id, joined_at, added_by, role) VALUES (?, ?, NOW(), ?, 'member')`,
                [groupId, userId, addedBy]
            );

            return true;
        } catch (error) {
            console.error('Error adding participant:', error);
            throw error;
        }
    }

    static async removeParticipant(groupId, userId) {
        try {
            await pool.execute(
                `DELETE FROM group_participants WHERE group_id = ? AND user_id = ?`,
                [groupId, userId]
            );

            return true;
        } catch (error) {
            console.error('Error removing participant:', error);
            throw error;
        }
    }

    static async sendGroupMessage(groupId, senderId, message, timestamp) {
        try {
            // Insert group message
            const query = `
                INSERT INTO group_messages (group_id, sender_id, message, created_at)
                VALUES (?, ?, ?, NOW())
            `;
            
            const [result] = await pool.execute(query, [groupId, senderId, message]);
            console.log('Group message inserted with ID:', result.insertId);

            // Update group's last message
            await this.updateGroupLastMessage(groupId, message, senderId);

            return {
                id: result.insertId,
                groupId,
                senderId,
                message,
                timestamp: timestamp || new Date().toISOString()
            };
        } catch (error) {
            console.error('Error in GroupChatModel.sendGroupMessage:', error);
            throw error;
        }
    }

    static async getGroupMessages(groupId, limit = 15, random = null) {
        try {
            console.log('GroupChatModel.getGroupMessages called with:', { groupId, limit, random });

            const query = `
                SELECT SQL_NO_CACHE
                    gm.id,
                    gm.sender_id,
                    gm.message,
                    gm.created_at,
                    u.full_name as sender_name
                FROM group_messages gm
                JOIN users u ON gm.sender_id = u.user_id
                WHERE gm.group_id = ?
                ORDER BY gm.id DESC, gm.created_at DESC
                LIMIT ?
            `;
            
            const [messages] = await pool.execute(query, [groupId, limit]);
            
            const reversedMessages = messages.reverse(); // Return in chronological order (oldest first)
            
            return reversedMessages;
        } catch (error) {
            console.error('Error in GroupChatModel.getGroupMessages:', error);
            throw error;
        }
    }

    static async isParticipant(groupId, userId) {
        try {
            const query = `
                SELECT 1 
                FROM group_participants 
                WHERE group_id = ? AND user_id = ?
            `;
            
            const [result] = await pool.execute(query, [groupId, userId]);
            return result.length > 0;
        } catch (error) {
            console.error('Error in GroupChatModel.isParticipant:', error);
            throw error;
        }
    }

    static async updateGroupLastMessage(groupId, message, senderId) {
        const query = `
            UPDATE group_chats 
            SET last_message = ?, last_message_time = NOW(), last_message_sender = ?
            WHERE id = ?
        `;
        
        const [result] = await pool.execute(query, [message, senderId, groupId]);
        return result.affectedRows;
    }
}

export default GroupChatModel;
