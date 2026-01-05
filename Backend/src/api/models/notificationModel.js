import { pool } from "../../config/db.js";

class NotificationModel {
    static async createNotification(recipientId, senderId, type, message) {
        const query = `
            INSERT INTO notifications (recipient_id, sender_id, type, message, created_at)
            VALUES (?, ?, ?, ?, NOW())
        `;
        
        const [result] = await pool.execute(query, [recipientId, senderId, type, message]);
        return result.insertId;
    }

    static async getUserNotifications(userId, limit = 50) {
        const query = `
            SELECT 
                n.*,
                u.full_name as sender_name
            FROM notifications n
            JOIN users u ON n.sender_id = u.user_id
            WHERE n.recipient_id = ?
            ORDER BY n.created_at DESC
            LIMIT ?
        `;
        
        const [notifications] = await pool.execute(query, [userId, limit]);
        return notifications;
    }

    static async markAsRead(notificationId, userId) {
        const query = `
            UPDATE notifications 
            SET read_status = true 
            WHERE id = ? AND recipient_id = ?
        `;
        
        const [result] = await pool.execute(query, [notificationId, userId]);
        return result.affectedRows;
    }

    static async markAllAsRead(userId) {
        const query = `
            UPDATE notifications 
            SET read_status = true 
            WHERE recipient_id = ? AND read_status = false
        `;
        
        const [result] = await pool.execute(query, [userId]);
        return result.affectedRows;
    }

    static async getUnreadCount(userId) {
        const query = `
            SELECT COUNT(*) as count
            FROM notifications 
            WHERE recipient_id = ? AND read_status = false
        `;
        
        const [result] = await pool.execute(query, [userId]);
        return result[0].count;
    }

    static async deleteNotification(notificationId, userId) {
        const query = `
            DELETE FROM notifications 
            WHERE id = ? AND recipient_id = ?
        `;
        
        const [result] = await pool.execute(query, [notificationId, userId]);
        return result.affectedRows;
    }
}

export default NotificationModel;
