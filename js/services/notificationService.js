// Automated Reminders and Notification Service

import { storageService } from './storageService.js';
import { authService } from './authService.js';
import { formatCurrency, PaymentStatus } from '../models/dataModels.js';

class NotificationService {
  /**
   * Get all notifications for current user
   */
  getMyNotifications() {
    const user = authService.getCurrentUser();
    if (!user) return [];

    const allNotifs = storageService.getNotifications();
    return allNotifs.filter(n => n.userId === user.id);
  }

  /**
   * Get unread notification count
   */
  getUnreadCount() {
    const notifs = this.getMyNotifications();
    return notifs.filter(n => !n.read).length;
  }

  /**
   * Mark a notification as read
   * @param {string} notifId 
   */
  markAsRead(notifId) {
    const allNotifs = storageService.getNotifications();
    const notif = allNotifs.find(n => n.id === notifId);
    if (notif) {
      notif.read = true;
      storageService.setNotifications(allNotifs);
    }
  }

  /**
   * Mark all notifications as read
   */
  markAllAsRead() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const allNotifs = storageService.getNotifications();
    allNotifs.forEach(n => {
      if (n.userId === user.id) n.read = true;
    });
    storageService.setNotifications(allNotifs);
  }

  /**
   * Check for required reminders based on active committee deadlines
   */
  syncAutomatedReminders() {
    const user = authService.getCurrentUser();
    if (!user) return;

    const committees = storageService.getCommittees();
    const members = storageService.getMembers().filter(m => m.userId === user.id);
    const months = storageService.getMonths();
    const payments = storageService.getPayments();
    const users = storageService.getUsers();

    members.forEach(member => {
      const comm = committees.find(c => c.id === member.committeeId);
      if (!comm || comm.status !== 'active') return;

      const activeMonth = months.find(m => m.committeeId === comm.id && m.status === 'active');
      if (!activeMonth || !activeMonth.dueDate) return;

      const payment = payments.find(p => p.committeeMonthId === activeMonth.id && p.payerUserId === user.id);
      const recipient = users.find(u => u.id === activeMonth.recipientUserId);
      const recipientName = recipient ? recipient.name : 'Selected Member';

      // Check if user is the recipient
      if (activeMonth.recipientUserId === user.id) {
        const totalPool = comm.contributionAmount * comm.numberOfMembers;
        this.addNotificationIfNew({
          userId: user.id,
          committeeId: comm.id,
          type: 'recipient',
          title: "You're this month's recipient! 🎉",
          body: `You are scheduled to receive ${formatCurrency(totalPool)} from ${comm.name}.`
        });
      }

      // If user has pending payment, generate natural reminder
      if (payment && payment.status === PaymentStatus.PENDING && activeMonth.recipientUserId !== user.id) {
        const dueDate = new Date(activeMonth.dueDate);
        const today = new Date();
        const diffDays = Math.round((dueDate - today) / (1000 * 60 * 60 * 24));

        if (diffDays === 3) {
          this.addNotificationIfNew({
            userId: user.id,
            committeeId: comm.id,
            type: 'reminder_3days',
            title: 'Payment Due in 3 Days',
            body: `Your ${comm.name} payment of ${formatCurrency(comm.contributionAmount)} is due in 3 days. This month's recipient is ${recipientName}.`
          });
        } else if (diffDays === 1) {
          this.addNotificationIfNew({
            userId: user.id,
            committeeId: comm.id,
            type: 'reminder_1day',
            title: 'Payment Due Tomorrow',
            body: `Reminder: Your ${formatCurrency(comm.contributionAmount)} payment for ${comm.name} is due tomorrow.`
          });
        } else if (diffDays === 0) {
          this.addNotificationIfNew({
            userId: user.id,
            committeeId: comm.id,
            type: 'reminder_today',
            title: 'Payment Due Today',
            body: `Your ${comm.name} payment of ${formatCurrency(comm.contributionAmount)} is due today.`
          });
        } else if (diffDays < 0) {
          const lateDays = Math.abs(diffDays);
          this.addNotificationIfNew({
            userId: user.id,
            committeeId: comm.id,
            type: 'reminder_late',
            title: 'Payment Overdue',
            body: `Your ${comm.name} payment is ${lateDays} ${lateDays === 1 ? 'day' : 'days'} late. Please send ${formatCurrency(comm.contributionAmount)} to ${recipientName} and upload your payment proof.`
          });
        }
      }
    });
  }

  addNotificationIfNew({ userId, committeeId, type, title, body }) {
    const allNotifs = storageService.getNotifications();
    const exists = allNotifs.some(n => n.userId === userId && n.committeeId === committeeId && n.type === type && (Date.now() - new Date(n.createdAt).getTime() < 86400000));
    
    if (!exists) {
      allNotifs.unshift({
        id: 'notif_' + Date.now().toString(36) + '_' + Math.random().toString(36).substring(2, 5),
        userId,
        committeeId,
        type,
        title,
        body,
        read: false,
        createdAt: new Date().toISOString()
      });
      storageService.setNotifications(allNotifs);
    }
  }
}

export const notificationService = new NotificationService();
