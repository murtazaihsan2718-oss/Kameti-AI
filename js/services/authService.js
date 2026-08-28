// Authentication Service for Kameti Mobile App
// Supports Firebase Phone Auth & local high-fidelity OTP simulation

import { storageService } from './storageService.js';
import { firebaseManager } from '../config/firebaseConfig.js';
import { PaymentMethods } from '../models/dataModels.js';

class AuthService {
  constructor() {
    this.currentOtpSession = null;
    this.cooldownTimer = null;
  }

  getCurrentUser() {
    return storageService.getCurrentUser();
  }

  loginAsUser(user) {
    if (!user) return;
    storageService.setCurrentUser(user);
    const users = storageService.getUsers();
    const idx = users.findIndex(u => u.id === user.id || (u.verifiedPhone && u.verifiedPhone === user.verifiedPhone));
    if (idx >= 0) {
      users[idx] = user;
    } else {
      users.push(user);
    }
    storageService.setUsers(users);
    return user;
  }

  isLoggedIn() {
    return !!this.getCurrentUser();
  }

  /**
   * Request OTP for Phone Verification
   * @param {string} phoneNumber - e.g. "+923145550101"
   * @returns {Promise<{success: boolean, simulatedCode?: string, message?: string}>}
   */
  async requestOtp(phoneNumber) {
    const cleanPhone = phoneNumber.replace(/\s+/g, '');
    if (!cleanPhone || cleanPhone.length < 9) {
      throw new Error('Please enter a valid phone number');
    }

    if (firebaseManager.isLive()) {
      try {
        // Firebase Phone Auth Recaptcha & ConfirmationResult
        const appVerifier = window.recaptchaVerifier;
        const confirmationResult = await firebaseManager.auth.signInWithPhoneNumber(cleanPhone, appVerifier);
        this.currentOtpSession = {
          type: 'firebase',
          phoneNumber: cleanPhone,
          confirmationResult,
          timestamp: Date.now()
        };
        return { success: true, message: 'OTP sent via SMS' };
      } catch (err) {
        console.error('Firebase SMS error:', err);
        throw new Error(err.message || 'Failed to send SMS. Please try again.');
      }
    } else {
      // High fidelity simulation
      // Generate standard 6-digit OTP code (default testing code 123456 or random)
      const simulatedCode = '123456';
      this.currentOtpSession = {
        type: 'mock',
        phoneNumber: cleanPhone,
        code: simulatedCode,
        timestamp: Date.now(),
        expiresAt: Date.now() + 5 * 60 * 1000 // 5 minutes
      };

      return {
        success: true,
        simulatedCode,
        message: `Verification code sent to ${cleanPhone}`
      };
    }
  }

  /**
   * Verify OTP Code
   * @param {string} code 
   * @returns {Promise<{success: boolean, user?: object}>}
   */
  async verifyOtp(code) {
    if (!this.currentOtpSession) {
      throw new Error('No active OTP session. Please request a new code.');
    }

    const cleanCode = code.trim();
    if (cleanCode.length !== 6) {
      throw new Error('Please enter the complete 6-digit code');
    }

    if (this.currentOtpSession.type === 'firebase') {
      try {
        const userCredential = await this.currentOtpSession.confirmationResult.confirm(cleanCode);
        const firebaseUser = userCredential.user;
        
        // Find or create local profile
        let user = storageService.getUsers().find(u => u.id === firebaseUser.uid || u.verifiedPhone === firebaseUser.phoneNumber);
        if (!user) {
          user = {
            id: firebaseUser.uid,
            name: firebaseUser.displayName || 'Committee Member',
            verifiedPhone: firebaseUser.phoneNumber,
            paymentMethod: PaymentMethods.EASYPAISA,
            paymentNumber: firebaseUser.phoneNumber,
            createdAt: new Date().toISOString()
          };
          const users = storageService.getUsers();
          users.push(user);
          storageService.setUsers(users);
        }

        storageService.setCurrentUser(user);
        this.currentOtpSession = null;
        return { success: true, user };
      } catch (err) {
        throw new Error('Invalid or expired verification code');
      }
    } else {
      // Mock verification
      if (Date.now() > this.currentOtpSession.expiresAt) {
        throw new Error('Verification code has expired. Please request a new code.');
      }

      if (cleanCode !== this.currentOtpSession.code && cleanCode !== '123456') {
        throw new Error('Incorrect verification code. Please try again.');
      }

      const phone = this.currentOtpSession.phoneNumber;
      let user = storageService.getUsers().find(u => u.verifiedPhone === phone);

      if (!user) {
        // Prepare new user profile shell for completing registration
        user = {
          id: 'usr_' + Date.now().toString(36),
          name: '',
          verifiedPhone: phone,
          paymentMethod: PaymentMethods.EASYPAISA,
          paymentNumber: phone,
          isNewUser: true,
          createdAt: new Date().toISOString()
        };
      }

      storageService.setCurrentUser(user);
      this.currentOtpSession = null;
      return { success: true, user };
    }
  }

  /**
   * Complete or Update Profile
   * @param {{name: string, paymentMethod: string, paymentNumber: string}} profileData 
   */
  async updateProfile(profileData) {
    const currentUser = this.getCurrentUser();
    if (!currentUser) throw new Error('Not authenticated');

    const updatedUser = {
      ...currentUser,
      name: profileData.name.trim() || currentUser.name,
      paymentMethod: profileData.paymentMethod || currentUser.paymentMethod,
      paymentNumber: profileData.paymentNumber.trim() || currentUser.paymentNumber,
      isNewUser: false,
      updatedAt: new Date().toISOString()
    };

    // Update in users collection
    const users = storageService.getUsers();
    const idx = users.findIndex(u => u.id === updatedUser.id);
    if (idx >= 0) {
      users[idx] = updatedUser;
    } else {
      users.push(updatedUser);
    }
    storageService.setUsers(users);
    storageService.setCurrentUser(updatedUser);

    return updatedUser;
  }

  logout() {
    storageService.setCurrentUser(null);
  }
}

export const authService = new AuthService();
