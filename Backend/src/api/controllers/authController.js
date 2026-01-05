import { generateAccessToken, generateRefreshToken } from "../../config/jwt.js";
import UserModel from "../models/userModel.js";
import bcrypt from 'bcrypt';
import TokenModel from "../models/tokenModel.js";

export const register= async(req,res)=>{
    try{
        const{name,email,password}=req.body;
        
        const result=await UserModel.create({name, email, password}); 
        
        console.log('User created:', result);
        return res.status(201).json({ 
            success: true,
            message: "User created successfully",
            data: {
                id: result.insertId || result[0]?.insertId,
                name,
                email
            }
        });

    }catch(error){
        console.log("Registration error: ",error)
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message 
        });
    }

};
export const login= async(req,res)=>{
    try{
        const{email,password}=req.body;
        
        const result=await UserModel.findbyEmail(email); 
        
        if(result.length===0){
            return res.status(404).json({
                success: false,
                message: "User not found",
            })
        }
        const user = result[0][0];        
        const isMatch = await bcrypt.compare(password, user.password);
        if(!isMatch){
            return res.status(401).json({
                success:false,
                message:"Invalid credentials"
            })
        }
        
        const tokenPayload = {
            uid: user.user_id,
            email: user.email,
        };
        
        // Generate tokens
        const accessToken = generateAccessToken(tokenPayload);
        const refreshToken = generateRefreshToken(tokenPayload);
        
        // Save tokens to database
        try {
            await TokenModel.saveTokens(
                user.user_id,
                accessToken,
                refreshToken,
                req.get('User-Agent'), // Device info
                req.ip // IP address
            );
        } catch (tokenError) {
            console.error('Error saving tokens to database:', tokenError);
            // Continue with login even if token storage fails
        }

        return res.status(200).json({
            success: true, 
            message: "Login success",
            data: {
                Id: user.user_id,
                Fullname: user.full_name,
                Email: user.email,
            },
            accessToken,
            refreshToken
        });
    }catch(error){
        console.log("Login error: ",error) 
        res.status(500).json({ 
            success: false,
            message: "User not found",
            error: error.message 
        });
    }

};
export const logout = async (req, res) => {
    try {
        const userId = req.user.uid;
        
        console.log('=== LOGOUT DEBUG ===');
        console.log('Logging out user ID:', userId);
        
        // Revoke all tokens for this user
        await TokenModel.revokeAllTokens(userId);
        
        console.log('Logout completed - tokens revoked for user:', userId);
        
        return res.status(200).json({
            success: true,
            message: "Logout successful"
        });
    } catch (error) {
        console.log("Logout error: ", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message 
        });
    }
};
export const refreshToken = async (req, res) => {
    try {
        const { refreshToken } = req.body;
        
        if(!refreshToken) {
            return res.status(401).json({
                success: false,
                message: "Refresh token required"
            });
        }

        // Use TokenModel to refresh tokens
        const tokenResult = await TokenModel.refreshTokens(
            refreshToken,
            req.get('User-Agent'),
            req.ip
        );

        if (!tokenResult) {
            return res.status(401).json({
                success: false,
                message: "Invalid or expired refresh token"
            });
        }

        return res.status(200).json({
            success: true,
            message: "Token refreshed successfully",
            accessToken: tokenResult.accessToken,
            refreshToken: tokenResult.refreshToken
        });
    } catch(error) {
        console.log("Refresh token error: ", error);
        res.status(500).json({ 
            success: false,
            message: "Internal server error",
            error: error.message 
        });
    }
};
