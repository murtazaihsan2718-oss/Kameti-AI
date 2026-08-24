// Payment Tracking, Proof Uploads & Deep Linking Service

import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { PaymentStatus } from '../models/dataModels.js';

class PaymentService {
  /**
   * Get payment record for user in a specific month
   * @param {string} committeeMonthId 
   * @param {string} userId 
   */
  getPaymentForUser(committeeMonthId, userId) {
    const payments = storageService.getPayments();
    return payments.find(p => p.committeeMonthId === committeeMonthId && p.payerUserId === userId) || null;
  }

  /**
   * Get proof record for a payment
   * @param {string} paymentId 
   */
  getProofForPayment(paymentId) {
    const proofs = storageService.getProofs();
    return proofs.find(p => p.paymentId === paymentId) || null;
  }

  /**
   * Submit payment proof image
   * @param {string} paymentId 
   * @param {string} fileDataUrl - Base64 data URL or Storage URL
   * @param {string} notes 
   */
  async submitPaymentProof(paymentId, fileDataUrl, notes = '') {
    const user = authService.getCurrentUser() || storageService.getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const payments = storageService.getPayments();
    let paymentIdx = payments.findIndex(p => p.id === paymentId || p.payerUserId === user.id);

    let payment;
    if (paymentIdx === -1) {
      payment = {
        id: paymentId || 'pay_' + Date.now().toString(36),
        committeeId: paymentId.split('_')[1] || 'com_default',
        payerUserId: user.id,
        amount: 20000,
        status: PaymentStatus.SUBMITTED,
        submittedAt: new Date().toISOString()
      };
      payments.push(payment);
      paymentIdx = payments.length - 1;
    } else {
      payment = payments[paymentIdx];
      payment.status = PaymentStatus.SUBMITTED;
      payment.submittedAt = new Date().toISOString();
      payments[paymentIdx] = payment;
    }

    // Save proof
    const proofs = storageService.getProofs();
    const existingProofIdx = proofs.findIndex(p => p.paymentId === payment.id || p.uploadedBy === user.id);

    const proofRecord = {
      id: existingProofIdx >= 0 ? proofs[existingProofIdx].id : 'prf_' + Date.now().toString(36),
      paymentId: payment.id,
      uploadedBy: user.id,
      fileUrl: fileDataUrl,
      fileType: 'image/jpeg',
      uploadedAt: new Date().toISOString(),
      notes: (notes || '').trim()
    };

    if (existingProofIdx >= 0) {
      proofs[existingProofIdx] = proofRecord;
    } else {
      proofs.push(proofRecord);
    }
    storageService.setProofs(proofs);
    storageService.setPayments(payments);

    // Add in-app notification
    const notifications = storageService.getNotifications();
    notifications.unshift({
      id: 'notif_' + Date.now().toString(36),
      userId: user.id,
      committeeId: payment.committeeId,
      type: 'proof_submitted',
      title: 'Payment Proof Submitted ✓',
      body: `Your payment proof of Rs. ${Number(payment.amount || 20000).toLocaleString('en-PK')} has been submitted.`,
      read: false,
      createdAt: new Date().toISOString()
    });
    storageService.setNotifications(notifications);

    return { success: true, proof: proofRecord, payment };
  }

  /**
   * Delete or remove uploaded proof
   * @param {string} paymentId 
   */
  deletePaymentProof(paymentId) {
    const user = authService.getCurrentUser() || storageService.getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const payments = storageService.getPayments();
    const payment = payments.find(p => p.id === paymentId || p.payerUserId === user.id);
    if (payment) {
      payment.status = PaymentStatus.PENDING;
      payment.submittedAt = null;
      storageService.setPayments(payments);
    }

    // Remove proof
    let proofs = storageService.getProofs();
    proofs = proofs.filter(p => p.paymentId !== paymentId && p.uploadedBy !== user.id);
    storageService.setProofs(proofs);

    return { success: true };
  }

  /**
   * Recipient approves and marks a member's payment as verified
   * @param {string} committeeId 
   * @param {string} payerUserId 
   */
  verifyPayment(committeeId, payerUserId) {
    const user = authService.getCurrentUser() || storageService.getCurrentUser();
    if (!user) throw new Error('Authentication required');

    const payments = storageService.getPayments();
    let payment = payments.find(p => p.committeeId === committeeId && p.payerUserId === payerUserId);

    if (payment) {
      payment.status = PaymentStatus.VERIFIED;
      payment.verifiedAt = new Date().toISOString();
      payment.verifiedBy = user.id;
    } else {
      payment = {
        id: 'pay_' + committeeId + '_' + payerUserId,
        committeeId,
        payerUserId,
        amount: 20000,
        status: PaymentStatus.VERIFIED,
        verifiedAt: new Date().toISOString(),
        verifiedBy: user.id
      };
      payments.push(payment);
    }
    storageService.setPayments(payments);

    return { success: true, payment };
  }

  /**
   * Helper to open external payment apps
   * @param {string} method - 'Easypaisa', 'JazzCash', etc.
   * @param {string} number 
   */
  openPaymentApp(method, number) {
    const cleanNum = (number || '').replace(/[^0-9+]/g, '');
    const cleanMethod = (method || '').toLowerCase();

    if (cleanMethod.includes('easypaisa')) {
      window.location.href = `easypaisa://pay?number=${cleanNum}`;
      setTimeout(() => {
        console.log('Opened Easypaisa intent');
      }, 1000);
    } else if (cleanMethod.includes('jazzcash')) {
      window.location.href = `jazzcash://pay?number=${cleanNum}`;
    } else {
      window.location.href = `tel:${cleanNum}`;
    }
  }
}

export const paymentService = new PaymentService();
