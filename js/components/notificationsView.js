// Notifications & Activity View Component - Matching Minimalist Design

import { notificationService } from '../services/notificationService.js';

export function renderNotificationsView(container, { onBack, onOpenCommittee, showToast }) {
  notificationService.syncAutomatedReminders();
  const notifications = notificationService.getMyNotifications();

  function render() {
    container.innerHTML = `
      <div style="padding: 12px 20px 24px 20px;">
        <!-- Top Navbar -->
        <div class="app-top-header">
          <button id="btn-notif-back" class="btn-icon-header">
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="15 18 9 12 15 6"></polyline></svg>
          </button>
          <span class="header-title">Activity & Alerts</span>
          <button id="btn-mark-all-read" class="btn-icon-header" title="Mark all read">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          </button>
        </div>

        <!-- Title -->
        <div style="margin-top: 4px; margin-bottom: 20px;">
          <h1 style="font-size: 22px; font-weight: 800; color: #000000; letter-spacing: -0.02em; margin-bottom: 4px;">
            Notifications
          </h1>
          <p style="font-size: 13.5px; color: #71717A; font-weight: 500;">
            Stay updated on committee rounds & payments
          </p>
        </div>

        ${notifications.length === 0 ? renderEmpty() : renderList()}
      </div>
    `;

    attachEvents();
  }

  function renderList() {
    return `
      <div style="display: flex; flex-direction: column; gap: 12px;">
        ${notifications.map(n => {
          const timeAgo = getTimeAgo(n.createdAt);

          return `
            <div class="card-light-gray notif-card" data-id="${n.id}" data-comm-id="${n.committeeId || ''}" style="padding: 18px; display: flex; align-items: flex-start; gap: 14px; cursor: pointer; margin-bottom: 0; position: relative;">
              <div style="width: 38px; height: 38px; border-radius: 50%; background-color: #E4E4E7; display: flex; align-items: center; justify-content: center; flex-shrink: 0;">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#000000" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
              </div>

              <div style="flex: 1;">
                <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 4px;">
                  <strong style="font-size: 15px; font-weight: 800; color: #000000;">${n.title}</strong>
                  <span style="font-size: 11px; color: #71717A; font-weight: 600;">${timeAgo}</span>
                </div>
                <p style="font-size: 13px; color: #52525B; line-height: 1.45; font-weight: 500;">${n.body}</p>
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }

  function renderEmpty() {
    return `
      <div class="card-light-gray" style="padding: 36px 20px; text-align: center; margin-top: 10px;">
        <div style="width: 50px; height: 50px; border-radius: 50%; background-color: #FFFFFF; display: flex; align-items: center; justify-content: center; margin: 0 auto 14px auto;">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#71717A" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
        </div>
        <h3 style="font-size: 17px; font-weight: 800; color: #000000; margin-bottom: 4px;">No notifications</h3>
        <p style="font-size: 13px; color: #71717A; font-weight: 500;">
          You're all caught up! Updates and payment alerts will appear here.
        </p>
      </div>
    `;
  }

  function getTimeAgo(dateStr) {
    if (!dateStr) return '';
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return 'Just now';
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  function attachEvents() {
    const btnBack = document.getElementById('btn-notif-back');
    if (btnBack) btnBack.addEventListener('click', onBack);

    const btnMark = document.getElementById('btn-mark-all-read');
    if (btnMark) {
      btnMark.addEventListener('click', () => {
        notificationService.markAllAsRead();
        showToast('All notifications marked as read');
        render();
      });
    }

    const cards = container.querySelectorAll('.notif-card');
    cards.forEach(c => {
      c.addEventListener('click', () => {
        const notifId = c.getAttribute('data-id');
        const commId = c.getAttribute('data-comm-id');
        if (notifId) notificationService.markAsRead(notifId);
        if (commId && onOpenCommittee) onOpenCommittee(commId);
      });
    });
  }

  render();
}
