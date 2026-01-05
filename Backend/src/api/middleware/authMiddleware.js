import jwt from 'jsonwebtoken';
import TokenModel from '../models/tokenModel.js';

export const authenticateToken = async (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    console.log('=== AUTH MIDDLEWARE DEBUG ===');
    console.log('Auth header:', authHeader ? 'Present' : 'Missing');
    console.log('Token extracted:', token ? 'Yes' : 'No');

    if (!token) {
        return res.status(401).json({
            success: false,
            message: 'Access token required'
        });
    }

    try {
        // First verify JWT signature
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        console.log('JWT decoded successfully:', decoded);
        
        // Then validate token in database
        const tokenData = await TokenModel.validateAccessToken(token);
        console.log('Token validation result:', tokenData ? 'Valid' : 'Invalid');
        
        if (!tokenData) {
            console.log('Token validation failed - token not found in database or inactive');
            return res.status(403).json({
                success: false,
                message: 'Invalid or expired token'
            });
        }

        console.log('Token validated, setting user data');
        // Set user data from database result
        req.user = {
            uid: tokenData.user_id,
            email: tokenData.email,
            Fullname: tokenData.full_name
        };
        
        next();
    } catch (err) {
        console.log('Auth error:', err.message);
        return res.status(403).json({
            success: false,
            message: 'Invalid or expired token'
        });
    }
};