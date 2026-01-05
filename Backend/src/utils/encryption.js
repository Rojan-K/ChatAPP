import crypto from 'crypto';

class EncryptionUtils {
  static algorithm = 'aes-256-gcm';
  static secretKey = crypto.scryptSync(process.env.ENCRYPTION_KEY || 'default-secret-key-change-in-production', 'salt', 32);
  
  /**
   * Encrypt a message using AES-256-GCM
   * @param {string} text - The message to encrypt
   * @returns {object} - Encrypted data with iv and tag
   */
  static encrypt(text) {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher(this.algorithm, this.secretKey);
      cipher.setAAD(Buffer.from('chat-app', 'utf8'));
      
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      
      const tag = cipher.getAuthTag();
      
      return {
        encrypted,
        iv: iv.toString('hex'),
        tag: tag.toString('hex')
      };
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }
  
  /**
   * Decrypt a message using AES-256-GCM
   * @param {object} encryptedData - Object containing encrypted, iv, and tag
   * @returns {string} - Decrypted message
   */
  static decrypt(encryptedData) {
    try {
      const { encrypted, iv, tag } = encryptedData;
      
      if (!encrypted || !iv || !tag) {
        throw new Error('Invalid encrypted data format');
      }
      
      const decipher = crypto.createDecipher(this.algorithm, this.secretKey);
      decipher.setAAD(Buffer.from('chat-app', 'utf8'));
      decipher.setAuthTag(Buffer.from(tag, 'hex'));
      
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      
      return decrypted;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }
  
  /**
   * Check if a string is encrypted (contains encryption fields)
   * @param {string|object} data - Data to check
   * @returns {boolean} - True if data appears to be encrypted
   */
  static isEncrypted(data) {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return parsed.encrypted && parsed.iv && parsed.tag;
      } catch {
        return false;
      }
    }
    return data && data.encrypted && data.iv && data.tag;
  }
}

export default EncryptionUtils;
