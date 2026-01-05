import { pool } from "../../config/db.js";
import crypto from 'crypto';
import { generateAccessToken, generateRefreshToken } from "../../config/jwt.js";

class TokenModel {
    // Hash token for blacklist storage
    static hashToken(token) {
        return crypto.createHash('sha256').update(token).digest('hex');
    }

    // Save tokens to database
    static async saveTokens(userId, accessToken, refreshToken, deviceInfo = null, ipAddress = null) {
        try {
            await pool.execute(
                'UPDATE user_tokens SET is_active = FALSE WHERE user_id = ? AND is_active = TRUE',
                [userId]
             );
            const accessTokenExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hr
            const refreshTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

            // Insert new tokens
            const [result] = await pool.execute(
                `INSERT INTO user_tokens 
                 (user_id, access_token, refresh_token, access_token_expires_at, refresh_token_expires_at, device_info, ip_address)
                 VALUES (?, ?, ?, ?, ?, ?, ?)`,
                [userId, accessToken, refreshToken, accessTokenExpiresAt, refreshTokenExpiresAt, deviceInfo, ipAddress]
            );

            return result.insertId;
        } catch (error) {
            console.error('Error saving tokens:', error);
            throw error;
        }
    }

    // Validate access token
    static async validateAccessToken(token) {
        try {
            console.log('=== TOKEN VALIDATION DEBUG ===');
            console.log('Validating token:', token.substring(0, 20) + '...');
            
            const [tokens] = await pool.execute(
                `SELECT ut.*, u.email, u.full_name 
                 FROM user_tokens ut 
                 JOIN users u ON ut.user_id = u.user_id 
                 WHERE ut.access_token = ? AND ut.is_active = TRUE 
                 AND ut.access_token_expires_at > NOW()`,
                [token]
            );

            console.log('Database query result:', tokens.length, 'tokens found');
            if (tokens.length > 0) {
                console.log('Token found for user:', tokens[0].email);
                console.log('Token expires at:', tokens[0].access_token_expires_at);
                console.log('Current time:', new Date().toISOString());
                console.log('Is active:', tokens[0].is_active);
            }

            if (tokens.length === 0) {
                console.log('No valid token found in database');
                return null;
            }

            // Check if token is blacklisted
            const tokenHash = this.hashToken(token);
            const [blacklisted] = await pool.execute(
                'SELECT id FROM token_blacklist WHERE token_hash = ? AND expires_at > NOW()',
                [tokenHash]
            );

            if (blacklisted.length > 0) {
                console.log('Token is blacklisted');
                return null;
            }

            console.log('Token validation successful');
            return tokens[0];
        } catch (error) {
            console.error('Error validating access token:', error);
            throw error;
        }
    }

    // Refresh tokens
    static async refreshTokens(refreshToken, newDeviceInfo = null, newIpAddress = null) {
        try {
            const [tokens] = await pool.execute(
                `SELECT ut.*, u.email 
                 FROM user_tokens ut
                 JOIN users u ON ut.user_id = u.user_id
                 WHERE ut.refresh_token = ? AND ut.is_active = TRUE 
                 AND ut.refresh_token_expires_at > NOW()`,
                [refreshToken]
            );

            if (tokens.length === 0) {
                return null;
            }

            const oldToken = tokens[0];
            
            // Generate new tokens (using existing JWT functions)
            const { generateAccessToken, generateRefreshToken } = await import("../../config/jwt.js");
            const tokenPayload = {
                uid: oldToken.user_id,
                email: oldToken.email
            };
            
            const newAccessToken = generateAccessToken(tokenPayload);
            const newRefreshToken = generateRefreshToken(tokenPayload);
            
            // Deactivate old token
            await pool.execute(
                'UPDATE user_tokens SET is_active = FALSE WHERE id = ?',
                [oldToken.id]
            );

            // Save new tokens
            await this.saveTokens(
                oldToken.user_id, 
                newAccessToken, 
                newRefreshToken, 
                newDeviceInfo || oldToken.device_info, 
                newIpAddress || oldToken.ip_address
            );

            return {
                accessToken: newAccessToken,
                refreshToken: newRefreshToken,
                userId: oldToken.user_id
            };
        } catch (error) {
            console.error('Error refreshing tokens:', error);
            throw error;
        }
    }

    // Revoke all tokens for user
    static async revokeAllTokens(userId) {
        try {
            // Get active tokens to blacklist them
            const [tokens] = await pool.execute(
                'SELECT access_token, refresh_token FROM user_tokens WHERE user_id = ? AND is_active = TRUE',
                [userId]
            );

            // Add tokens to blacklist
            for (const token of tokens) {
                const accessTokenHash = this.hashToken(token.access_token);
                const refreshTokenHash = this.hashToken(token.refresh_token);
                
                await pool.execute(
                    'INSERT INTO token_blacklist (token_hash, user_id, expires_at, reason) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?)',
                    [accessTokenHash, userId, 'User logout']
                );
                
                await pool.execute(
                    'INSERT INTO token_blacklist (token_hash, user_id, expires_at, reason) VALUES (?, ?, DATE_ADD(NOW(), INTERVAL 7 DAY), ?)',
                    [refreshTokenHash, userId, 'User logout']
                );
            }

            // Deactivate all tokens
            await pool.execute(
                'UPDATE user_tokens SET is_active = FALSE WHERE user_id = ?',
                [userId]
            );
             await pool.execute(
                'DELETE FROM user_tokens WHERE user_id = ?',
                [userId]
            );

            return true;
        } catch (error) {
            console.error('Error revoking tokens:', error);
            throw error;
        }
    }

    // Cleanup expired tokens
    static async cleanupExpiredTokens() {
        try {
            // Deactivate expired tokens
            await pool.execute(
                'UPDATE user_tokens SET is_active = FALSE WHERE access_token_expires_at < NOW()'
            );

            // Remove expired blacklist entries
            await pool.execute(
                'DELETE FROM token_blacklist WHERE expires_at < NOW()'
            );

            return true;
        } catch (error) {
            console.error('Error cleaning up expired tokens:', error);
            throw error;
        }
    }
}

export default TokenModel;