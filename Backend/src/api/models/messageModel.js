import { pool } from "../../config/db.js";

class MessageModel {
    static async saveMessage(senderId, receiverId, message) {
        try {
            console.log('MessageModel.saveMessage called with:', { senderId, receiverId, message });
            
            // Store message as plain text (no encryption)
            let messagePreview = message.length > 50 ? message.substring(0, 50) + '...' : message;
            console.log('Message stored as plain text');
            
            // First get or create conversation
            const conversationQuery = `
                INSERT INTO conversations (participant1, participant2, last_message, last_message_time)
                VALUES (?, ?, ?, NOW())
                ON DUPLICATE KEY UPDATE last_message = ?, last_message_time = NOW()
            `;
            console.log('Executing conversation query:', conversationQuery);
            await pool.execute(conversationQuery, [senderId, receiverId, messagePreview, messagePreview]);
            console.log('Conversation query executed successfully');
            
            // Get conversation ID
            const [conversationResult] = await pool.execute(
                'SELECT id FROM conversations WHERE participant1 = ? AND participant2 = ?',
                [senderId, receiverId]
            );
            const conversationId = conversationResult[0]?.id;
            console.log('Conversation ID:', conversationId);
            
            // Insert message (plain text)
            const query = `
                INSERT INTO messages (sender_id, receiver_id, message, created_at, read_status)
                VALUES (?, ?, ?, NOW(), false)
            `;
            console.log('Executing message insert query:', query);
            const [result] = await pool.execute(query, [senderId, receiverId, message]);
            console.log('Message inserted successfully with ID:', result.insertId);
            
            return { messageId: result.insertId, conversationId };
        } catch (error) {
            console.error('Error in MessageModel.saveMessage:', error);
            throw error;
        }
    }

    static async getChatHistory(userId1, userId2, limit = 50) {
        const query = `
            SELECT 
                m.id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.created_at,
                m.read_status,
                u.full_name as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.user_id
            WHERE (
                (m.sender_id = ? AND m.receiver_id = ?) OR 
                (m.sender_id = ? AND m.receiver_id = ?)
            )
            ORDER BY m.created_at DESC
            LIMIT ?
        `;
        
        const [messages] = await pool.execute(query, [userId1, userId2, userId2, userId1, limit]);
        
        // Return messages as plain text (no decryption needed)
        return messages.reverse(); // Reverse to show chronological order (oldest first)
    }

    static async getConversationMessages(conversationId, limit = 50) {
        const query = `
            SELECT 
                m.id,
                m.sender_id,
                m.receiver_id,
                m.message,
                m.created_at,
                m.read_status,
                u.full_name as sender_name
            FROM messages m
            JOIN users u ON m.sender_id = u.user_id
            WHERE (
                (m.sender_id IN (SELECT participant1 FROM conversations WHERE id = ?) AND 
                 m.receiver_id IN (SELECT participant2 FROM conversations WHERE id = ?)) OR
                (m.sender_id IN (SELECT participant2 FROM conversations WHERE id = ?) AND 
                 m.receiver_id IN (SELECT participant1 FROM conversations WHERE id = ?))
            )
            ORDER BY m.created_at ASC
            LIMIT ?
        `;
        
        const [messages] = await pool.execute(query, [conversationId, conversationId, conversationId, conversationId, limit]);
        
        // Decrypt messages before returning
        const decryptedMessages = messages.map(msg => {
            let decryptedMessage = msg.message;
            
            try {
                if (EncryptionUtils.isEncrypted(msg.message)) {
                    decryptedMessage = EncryptionUtils.decrypt(msg.message);
                    console.log(`Decrypted message ${msg.id} successfully`);
                }
            } catch (decryptError) {
                console.error(`Failed to decrypt message ${msg.id}:`, decryptError);
                // Keep original message if decryption fails
            }
            
            return {
                ...msg,
                message: decryptedMessage
            };
        });
        
        return decryptedMessages;
    }

    static async markMessagesAsRead(senderId, receiverId) {
        const query = `
            UPDATE messages 
            SET read_status = true 
            WHERE sender_id = ? AND receiver_id = ? AND read_status = false
        `;
        
        const [result] = await pool.execute(query, [senderId, receiverId]);
        return result.affectedRows;
    }

    static async getUnreadMessageCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM messages 
            WHERE receiver_id = ? AND read_status = false
        `;
        
        const [result] = await pool.execute(query, [userId]);
        return result[0].count;
    }
}

export default MessageModel;