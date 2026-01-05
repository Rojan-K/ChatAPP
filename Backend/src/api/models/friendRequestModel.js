import { pool } from "../../config/db.js";

class FriendRequestModel {
    static async createFriendRequest(senderId, receiverId) {
        const query = `
            INSERT INTO friend_requests (sender_id, receiver_id, status, created_at) 
            VALUES (?, ?, 'pending', NOW())
        `;
        const [result] = await pool.execute(query, [senderId, receiverId]);
        return result;
    }

    static async getFriendRequestsForUser(userId) {
        const query = `
            SELECT fr.id, fr.sender_id, fr.status, fr.created_at,
                   u.full_name as sender_name, u.email as sender_email
            FROM friend_requests fr
            JOIN users u ON fr.sender_id = u.user_id
            WHERE fr.receiver_id = ? AND fr.status = 'pending'
            ORDER BY fr.created_at DESC
        `;
        const [result] = await pool.execute(query, [userId]);
        return result;
    }

    // In friendRequestModel.js
static async acceptFriendRequest(requestId, userId) {
  try {
    // Start transaction
    await pool.query('START TRANSACTION');

    // Get the request details
    const [requests] = await pool.query(
      'SELECT * FROM friend_requests WHERE id = ? AND receiver_id = ? AND status = "pending"',
      [requestId, userId]
    );

    if (requests.length === 0) {
      throw new Error('Friend request not found or already processed');
    }

    const request = requests[0];
    
    // Create friendship entries (bidirectional)
    await pool.query(
      'INSERT INTO friendships (user_id, friend_id) VALUES (?, ?), (?, ?)',
      [request.sender_id, request.receiver_id, request.receiver_id, request.sender_id]
    );

    // Update request status
    await pool.query(
      'UPDATE friend_requests SET status = "accepted" WHERE id = ?',
      [requestId]
    );

    // Create conversation for the friends
    const conversationQuery = `
      INSERT INTO conversations (participant1, participant2, created_at)
      VALUES (?, ?, NOW())
      ON DUPLICATE KEY UPDATE last_message_time = NOW()
    `;
    await pool.query(conversationQuery, [request.sender_id, request.receiver_id]);
    
    // Get conversation ID
    const [conversationResult] = await pool.query(
      'SELECT id FROM conversations WHERE participant1 = ? AND participant2 = ?',
      [request.sender_id, request.receiver_id]
    );
    
    const conversationId = conversationResult[0]?.id;

    // Get user information for both users
    const [senderInfo] = await pool.query(
      'SELECT full_name, email FROM users WHERE user_id = ?',
      [request.sender_id]
    );
    const [receiverInfo] = await pool.query(
      'SELECT full_name, email FROM users WHERE user_id = ?',
      [request.receiver_id]
    );

    await pool.query('COMMIT');
    
    return {
      conversationId,
      friendId: request.sender_id,
      roomName: [request.sender_id, request.receiver_id].sort().join('_'),
      senderName: senderInfo[0]?.full_name,
      senderEmail: senderInfo[0]?.email,
      receiverName: receiverInfo[0]?.full_name,
      receiverEmail: receiverInfo[0]?.email
    };

  } catch (error) {
    await pool.query('ROLLBACK');
    console.error('Error accepting friend request:', error);
    throw error;
  }
}

    static async rejectFriendRequest(requestId) {
        try {
            const query = `
                UPDATE friend_requests SET status = 'rejected' WHERE id = ?
            `;
            const [result] = await pool.execute(query, [requestId]);
            return result;
        } catch (error) {
            console.error('Error in rejectFriendRequest:', error);
            throw error;
        }
    }

    static async checkExistingRequest(senderId, receiverId) {
        try {
            const query = `
                SELECT id, status FROM friend_requests 
                WHERE (sender_id = ? AND receiver_id = ?) OR (sender_id = ? AND receiver_id = ?)
            `;
            const [result] = await pool.execute(query, [senderId, receiverId, receiverId, senderId]);
            return result;
        } catch (error) {
            console.error('Error in checkExistingRequest:', error);
            throw error;
        }
    }

    static async checkFriendship(userId1, userId2) {
        try {
            const query = `
                SELECT id FROM friendships 
                WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)
            `;
            const [result] = await pool.execute(query, [userId1, userId2, userId2, userId1]);
            return result.length > 0;
        } catch (error) {
            console.error('Error in checkFriendship:', error);
            throw error;
        }
    }
}

export default FriendRequestModel;
