import { pool } from "../../config/db.js";

class ConversationModel {
    static async createConversation(participant1, participant2) {
        const query = `
            INSERT INTO conversations (participant1, participant2, created_at)
            VALUES (?, ?, NOW())
            ON DUPLICATE KEY UPDATE last_message_time = NOW()
        `;
        
        const [result] = await pool.execute(query, [participant1, participant2]);
        return result.insertId;
    }

    static async getConversationByParticipants(participant1, participant2) {
        const query = `
            SELECT * FROM conversations 
            WHERE (participant1 = ? AND participant2 = ?) 
               OR (participant1 = ? AND participant2 = ?)
        `;
        
        const [conversations] = await pool.execute(query, [participant1, participant2, participant2, participant1]);
        return conversations[0];
    }

    static async getConversationById(conversationId) {
        const query = `
            SELECT * FROM conversations WHERE id = ?
        `;
        
        const [conversations] = await pool.execute(query, [conversationId]);
        return conversations[0];
    }

    static async updateLastMessage(conversationId, lastMessage) {
        const query = `
            UPDATE conversations 
            SET last_message = ?, last_message_time = NOW()
            WHERE id = ?
        `;
        
        const [result] = await pool.execute(query, [lastMessage, conversationId]);
        return result.affectedRows;
    }

    static async getUserConversations(userId) {
        const query = `
            SELECT 
                c.*,
                u1.full_name as participant1_name,
                u2.full_name as participant2_name
            FROM conversations c
            JOIN users u1 ON c.participant1 = u1.user_id
            JOIN users u2 ON c.participant2 = u2.user_id
            WHERE c.participant1 = ? OR c.participant2 = ?
            ORDER BY c.last_message_time DESC
        `;
        
        const [conversations] = await pool.execute(query, [userId, userId]);
        return conversations;
    }
}

export default ConversationModel;
