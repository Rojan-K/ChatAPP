import CryptoJS from 'crypto-js';

class EncryptionUtils {
  private static readonly ALGORITHM = 'AES-256-CBC';
  private static readonly SALT = 'chat-app-salt-constant';
  
  /**
   * Derive encryption key from user ID
   * @param userId - User ID for key derivation
   * @returns Derived key
   */
  private static deriveKey(userId: string | number): CryptoJS.lib.WordArray {
    const userSpecificString = `${userId}-${this.SALT}`;
    return CryptoJS.PBKDF2(userSpecificString, userSpecificString, {
      keySize: 256 / 32,
      iterations: 10000
    });
  }
  
  /**
   * Encrypt a message using AES-256-CBC for socket communication
   * @param text - The message to encrypt
   * @param userId - User ID for key derivation
   * @returns Encrypted data as JSON string
   */
  static encrypt(text: string, userId: string | number): string {
    try {
      const key = this.deriveKey(userId);
      const iv = CryptoJS.lib.WordArray.random(16);
      
      const encrypted = CryptoJS.AES.encrypt(text, key, {
        iv: iv,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const result = {
        encrypted: encrypted.toString(),
        iv: CryptoJS.enc.Hex.stringify(iv)
      };
      
      return JSON.stringify(result);
    } catch (error) {
      console.error('Encryption error:', error);
      throw new Error('Failed to encrypt message');
    }
  }
  
  /**
   * Decrypt a message using AES-256-CBC for socket communication
   * @param encryptedData - Encrypted data as JSON string or object
   * @param userId - User ID for key derivation
   * @returns Decrypted message
   */
  static decrypt(encryptedData: string | object, userId: string | number): string {
    try {
      const data = typeof encryptedData === 'string' 
        ? JSON.parse(encryptedData) 
        : encryptedData;
      
      const { encrypted, iv } = data;
      
      if (!encrypted || !iv) {
        throw new Error('Invalid encrypted data format');
      }
      
      const key = this.deriveKey(userId);
      const ivParsed = CryptoJS.enc.Hex.parse(iv);
      
      const decrypted = CryptoJS.AES.decrypt(encrypted, key, {
        iv: ivParsed,
        mode: CryptoJS.mode.CBC,
        padding: CryptoJS.pad.Pkcs7
      });
      
      const decryptedText = decrypted.toString(CryptoJS.enc.Utf8);
      
      if (!decryptedText) {
        throw new Error('Decryption failed - invalid key or corrupted data');
      }
      
      return decryptedText;
    } catch (error) {
      console.error('Decryption error:', error);
      throw new Error('Failed to decrypt message');
    }
  }
  
  /**
   * Check if a string is encrypted (contains encryption fields)
   * @param data - Data to check
   * @returns True if data appears to be encrypted
   */
  static isEncrypted(data: string | object): boolean {
    if (typeof data === 'string') {
      try {
        const parsed = JSON.parse(data);
        return parsed.encrypted && parsed.iv;
      } catch {
        return false;
      }
    }
    return data && typeof data === 'object' && 
           'encrypted' in data && 'iv' in data;
  }
}

export default EncryptionUtils;
