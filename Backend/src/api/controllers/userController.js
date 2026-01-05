import UserModel from '../models/userModel.js';
import jwt from 'jsonwebtoken';

export const searchUsers = async (req, res) => {
    console.log('=== SEARCH ENDPOINT CALLED ==='); // Debug
    console.log('=== AUTH MIDDLEWARE DEBUG FOR SEARCH ===');
    console.log('User from req.user:', req.user);
    try {
        const { q } = req.query;
        console.log('Search query received:', q); // Debug
        
        if (!q || q.length < 2) {
            console.log('Query too short, returning empty array'); // Debug
            return res.json([]);
        }

        // Get current user ID from token
        const token = req.headers.authorization?.replace('Bearer ', '');
        console.log('Auth header:', token ? 'Present' : 'Missing'); // Debug
        
        let currentUserId = null;
        let currentUserEmail = null;
        
        if (token) {
            try {
                const decoded = jwt.verify(token, process.env.JWT_SECRET);
                currentUserEmail = decoded.email;
                
                if (!currentUserEmail) {
                    console.log('No email in token'); // Debug
                } else {
                    // Get actual database user ID from email
                    const userResult = await UserModel.findbyEmail(currentUserEmail);
                    if (userResult.length > 0 && userResult[0].length > 0) {
                        currentUserId = userResult[0][0].user_id;
                    }
                }
            } catch (tokenError) {
                console.log('Invalid token:', tokenError.message);
            }
        }

        const users = await UserModel.searchUsers(q, currentUserId, currentUserEmail);
        
        console.log('=== SEARCH RESULTS DEBUG ===');
        console.log('Raw search results:', JSON.stringify(users, null, 2));
        console.log('First user profilePic:', users[0]?.profilePic);
        
        res.json(users);
    } catch (error) {
        console.error("Search error: ", error);
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

export const updateUser = async (req, res) => {
    try {
        const { Fullname, Email, profilePic } = req.body;
        const userId = req.user.uid; // Get user ID from JWT token
        
        console.log('=== UPDATE USER DEBUG ===');
        console.log('Request body:', req.body);
        console.log('userId:', userId);
        console.log('Fullname:', Fullname);
        console.log('Email:', Email);
        console.log('profilePic length:', profilePic ? profilePic.length : 'undefined');
        console.log('profilePic type:', typeof profilePic);
        
        // Validate input
        if (!Fullname && !Email && !profilePic) {
            return res.status(400).json({
                success: false,
                message: "At least one field must be provided for update"
            });
        }

        // Validate email format if provided
        if (Email && !Email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
            return res.status(400).json({
                success: false,
                message: "Invalid email format"
            });
        }

        // Validate name if provided
        if (Fullname && (Fullname.trim().length < 2 || Fullname.trim().length > 50)) {
            return res.status(400).json({
                success: false,
                message: "Name must be between 2 and 50 characters"
            });
        }

        const updateData = {};
        if (Fullname !== undefined) updateData.Fullname = Fullname.trim();
        if (Email !== undefined) updateData.Email = Email.trim().toLowerCase();
        if (profilePic !== undefined) updateData.profilePic = profilePic;

        const updatedUser = await UserModel.updateUser(userId, updateData);
        
        res.status(200).json({
            success: true,
            message: "Profile updated successfully",
            data: updatedUser
        });
        
    } catch (error) {
        console.error("Update error: ", error);
        
        // Handle specific database errors
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(400).json({
                success: false,
                message: "Email already exists"
            });
        }
        
        res.status(500).json({ 
            success: false, 
            message: "Internal server error" 
        });
    }
};

export const getFriends = async (req, res) => {
    console.log('=== GET FRIENDS CONTROLLER CALLED ===');
    try {
        const userId = req.user.uid;  // Use uid to match JWT token structure
        
        console.log('=== GET FRIENDS DEBUG ===');
        console.log('User ID from token:', userId);
        
        const friends = await UserModel.getFriends(userId);
        
        console.log('Raw friends result:', JSON.stringify(friends, null, 2));
        console.log('Number of friends found:', friends.length);
        
        res.status(200).json({
            success: true,
            data: friends
        });
    } catch (error) {
        console.error("Get friends error: ", error);
        res.status(500).json({
            success: false,
            message: "Internal server error"
        });
    }
};