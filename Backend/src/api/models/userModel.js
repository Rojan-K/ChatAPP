import { pool } from "../../config/db.js";
import bcrypt from 'bcrypt'; 

class UserModel{
    static async create(userData){
        const{name,email,password}=userData;
        const hashpass=await bcrypt.hash(password, 10);
        const generateUniqueUserId = () => {
         const timestamp = Date.now();
         const random = Math.floor(Math.random() * 10000);
         return (timestamp + random) % 100000000; 
};
        const u_id=generateUniqueUserId();
        const status="offline"
        const query = 'INSERT INTO users (user_id,full_name, email, password,status) VALUES (?, ?, ?, ?,?)';
        const [result] = await pool.execute(query, [u_id,name, email, hashpass,status]);
        return result;
}

static async findbyEmail(email){
        
        const query = 'SELECT * FROM users WHERE email=?';
        const result = await pool.execute(query, [ email]);
        return result;
}

static async testFriendshipTable() {
        const query = `
            SELECT COUNT(*) as count FROM friendships
        `;
        const [result] = await pool.execute(query);
        console.log('Friendship table count:', result[0].count); // Debug
        return result[0].count;
    }

    static async searchUsers(searchQuery, currentUserId = null, currentUserEmail = null) {
    let query = `
        SELECT u.user_id as id, u.full_name as Fullname, u.email as Email, u.pic_url as profilePic,
               CASE 
                WHEN EXISTS (
                SELECT 1 FROM friendships f 
                WHERE (f.user_id = ? AND f.friend_id = u.user_id) 
                  OR (f.user_id = u.user_id AND f.friend_id = ?)
                ) THEN true 
                ELSE false 
                END as isFriend
        FROM users u
        WHERE (u.full_name LIKE ? OR u.email LIKE ? OR u.user_id LIKE ?)
    `;
    
    const params = [currentUserId, currentUserId, `%${searchQuery}%`, `%${searchQuery}%`, `%${searchQuery}%`];
    
    // Try to exclude by user_id first, then by email as fallback
    if (currentUserId) {
        query += ` AND u.user_id != ?`;
        params.push(currentUserId);
    } else if (currentUserEmail) {
        query += ` AND u.email != ?`;
        params.push(currentUserEmail);
    }
    
    query += ` LIMIT 20`;
    
    console.log('SQL Query:', query); // Debug
    console.log('SQL Params:', params); // Debug
    
    const [result] = await pool.execute(query, params);
    console.log('Raw DB results:', result); // Debug
    return result;
}

static async updateUser(userId, updateData) {
    const { Fullname, Email, profilePic } = updateData;
    
    console.log('=== UPDATE USER MODEL DEBUG ===');
    console.log('userId:', userId);
    console.log('updateData:', updateData);
    console.log('Fullname:', Fullname);
    console.log('Email:', Email);
    console.log('profilePic:', profilePic ? `length: ${profilePic.length}, type: ${typeof profilePic}` : 'undefined');
    
    // Build dynamic query based on provided fields
    const updateFields = [];
    const updateValues = [];
    
    if (Fullname !== undefined) {
        updateFields.push('full_name = ?');
        updateValues.push(Fullname);
    }
    
    if (Email !== undefined) {
        updateFields.push('email = ?');
        updateValues.push(Email);
    }
    
    if (profilePic !== undefined) {
        updateFields.push('pic_url = ?');
        updateValues.push(profilePic);
        console.log('Adding pic_url to update fields');
    }
    
    if (updateFields.length === 0) {
        throw new Error('No fields to update');
    }
    
    updateValues.push(userId);
    
    const query = `UPDATE users SET ${updateFields.join(', ')} WHERE user_id = ?`;
    console.log('Update Query:', query);
    console.log('Update Values:', updateValues);
    
    const [result] = await pool.execute(query, updateValues);
    console.log('Database update result:', result);
    
    // Return the updated user data
    const selectQuery = 'SELECT user_id as userID, full_name as Fullname, email as Email, pic_url as profilePic FROM users WHERE user_id = ?';
    const [updatedUser] = await pool.execute(selectQuery, [userId]);
    console.log('Updated user from DB:', updatedUser);
    
    return updatedUser[0];
}

static async updateUserStatus(userId, status) {
    const query = 'UPDATE users SET status = ? WHERE user_id = ?';
    const [result] = await pool.execute(query, [status, userId]);
    return result;
}

static async getFriends(userId) {
    const query = `
        SELECT DISTINCT u.user_id as id, u.full_name as name, u.email, u.pic_url as profilePic, 
               CASE WHEN u.status = 'online' THEN true ELSE false END as online
        FROM users u
        INNER JOIN friendships f ON (
            (f.user_id = ? AND f.friend_id = u.user_id) OR 
             (f.friend_id = ? AND f.user_id = u.user_id)
            )
            ORDER BY u.full_name
    `;
    
    const [friends] = await pool.execute(query, [userId, userId]);
    return friends;
}
}

export default UserModel;

export const testFriendship = async (req, res) => {
    try {
        const count = await UserModel.testFriendshipTable();
        
        // Get all friendships for debugging
        const query = `SELECT * FROM friendships LIMIT 5`;
        const [friendships] = await pool.execute(query);
        
        // Get current user ID for debugging
        const currentUserQuery = `SELECT user_id FROM users WHERE email = ? LIMIT 1`;
        const [currentUserResult] = await pool.execute(currentUserQuery, [req.body.currentUserEmail]);
        
        res.json({ 
            success: true,
            tableCount: count,
            friendships: friendships,
            currentUser: currentUserResult[0],
            currentUserEmail: req.body.currentUserEmail
        });
    } catch (error) {
        console.error("Test friendship error:", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};