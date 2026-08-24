// Kameti App Entry Point & Router - Matching Reference Designs 1-to-1

import { authService } from './services/authService.js';
import { notificationService } from './services/notificationService.js';
import { storageService } from './services/storageService.js';

import { renderOnboardingView } from './components/onboardingView.js';
import { renderHomeView } from './components/homeView.js';
import { renderCreateCommitteeView } from './components/createCommitteeView.js';
import { renderJoinCommitteeView } from './components/joinCommitteeView.js';
import { renderCommitteeRoomView } from './components/committeeRoomView.js';
import { renderHistoryView } from './components/historyView.js';
import { renderNotificationsView } from './components/notificationsView.js';
import { renderProfileView } from './components/profileView.js';
import { openVoiceAssistantModal } from './components/voiceAssistantModal.js';

class KametiApp {
  constructor() {
    this.currentView = 'home';
    this.activeCommitteeId = null;
    this.joinCodeFromUrl = null;
    
    this.appRoot = document.getElementById('app-viewport');
    this.bottomNav = document.getElementById('app-bottom-nav');
    this.toastEl = document.getElementById('toast-notification');
    this.toastTimer = null;

    this.init();
  }

  init() {
    const urlParams = new URLSearchParams(window.location.search);
    let joinParam = urlParams.get('join') || urlParams.get('code');

    if (joinParam) {
      this.joinCodeFromUrl = joinParam.trim().toUpperCase();
    }

    storageService.subscribe(() => {
      this.updateBottomNavBadges();
    });

    this.attachNavListeners();
    this.navigateInitial();
  }

  async navigateInitial() {
    const user = authService.getCurrentUser();

    if (this.joinCodeFromUrl) {
      if (!user || user.isNewUser || !user.name) {
        this.renderOnboarding();
      } else {
        const code = this.joinCodeFromUrl;
        this.joinCodeFromUrl = null;
        this.renderJoin(code);
      }
    } else if (!user || user.isNewUser || !user.name) {
      this.renderOnboarding();
    } else {
      this.navigate('home');
    }
  }

  navigate(viewName, params = {}) {
    this.currentView = viewName;
    const user = authService.getCurrentUser();

    if (!user || !user.name) {
      this.renderOnboarding();
      return;
    }

    this.updateBottomNavState(viewName);

    switch (viewName) {
      case 'home':
        this.renderHome();
        break;
      case 'create':
        this.renderCreate();
        break;
      case 'join':
        this.renderJoin(params.joinCode || '');
        break;
      case 'room':
        this.activeCommitteeId = params.committeeId || this.activeCommitteeId;
        this.renderRoom(this.activeCommitteeId);
        break;
      case 'history':
        this.renderHistory(params.committeeId || this.activeCommitteeId);
        break;
      case 'voice':
        this.renderVoice();
        break;
      case 'notifications':
        this.renderNotifications();
        break;
      case 'profile':
        this.renderProfile();
        break;
      default:
        this.renderHome();
    }
  }

  renderOnboarding() {
    if (this.bottomNav) this.bottomNav.style.display = 'none';

    renderOnboardingView(this.appRoot, {
      onComplete: () => {
        if (this.joinCodeFromUrl) {
          this.renderJoin(this.joinCodeFromUrl);
          this.joinCodeFromUrl = null;
        } else {
          this.navigate('home');
        }
      },
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderHome() {
    this.showNavigationChrome();
    renderHomeView(this.appRoot, {
      onNavigate: (view) => this.navigate(view),
      onOpenCommittee: (id) => this.navigate('room', { committeeId: id }),
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderCreate() {
    this.showNavigationChrome();
    renderCreateCommitteeView(this.appRoot, {
      onBack: () => this.navigate('home'),
      onCreated: (id) => this.navigate('room', { committeeId: id }),
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderJoin(initialCode = '') {
    this.showNavigationChrome();
    renderJoinCommitteeView(this.appRoot, {
      initialCode,
      onBack: () => this.navigate('home'),
      onJoined: (id) => this.navigate('room', { committeeId: id }),
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderRoom(committeeId) {
    this.showNavigationChrome();
    renderCommitteeRoomView(this.appRoot, {
      committeeId,
      onBack: () => this.navigate('home'),
      onOpenHistory: (id) => this.navigate('history', { committeeId: id }),
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderHistory(committeeId) {
    this.showNavigationChrome();
    renderHistoryView(this.appRoot, {
      committeeId,
      onBack: () => this.navigate('room', { committeeId }),
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderVoice() {
    this.showNavigationChrome();
    openVoiceAssistantModal({
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderNotifications() {
    this.showNavigationChrome();
    renderNotificationsView(this.appRoot, {
      onBack: () => this.navigate('home'),
      onOpenCommittee: (id) => this.navigate('room', { committeeId: id }),
      showToast: (msg) => this.showToast(msg)
    });
  }

  renderProfile() {
    this.showNavigationChrome();
    renderProfileView(this.appRoot, {
      onLogout: () => this.renderOnboarding(),
      onReload: () => this.renderProfile(),
      showToast: (msg) => this.showToast(msg)
    });
  }

  showNavigationChrome() {
    if (this.bottomNav) this.bottomNav.style.display = 'flex';
  }

  hideNavigationChrome() {
    if (this.bottomNav) this.bottomNav.style.display = 'none';
  }

  updateBottomNavState(viewName) {
    const navItems = document.querySelectorAll('.dock-nav-item');
    navItems.forEach(item => {
      const target = item.getAttribute('data-view');
      if (target === viewName || (viewName === 'room' && target === 'home')) {
        item.classList.add('active');
      } else {
        item.classList.remove('active');
      }
    });
  }

  updateBottomNavBadges() {
    // Badges updated reactively
  }

  attachNavListeners() {
    const navItems = document.querySelectorAll('.dock-nav-item');
    navItems.forEach(item => {
      item.addEventListener('click', (e) => {
        e.preventDefault();
        const view = item.getAttribute('data-view');
        if (view) this.navigate(view);
      });
    });
  }

  showToast(message, duration = 3000) {
    if (!this.toastEl) return;
    this.toastEl.innerHTML = `
      <span style="color: #FFFFFF; font-weight: 700;">✓</span>
      <span>${message}</span>
    `;
    this.toastEl.classList.add('show');
    
    clearTimeout(this.toastTimer);
    this.toastTimer = setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, duration);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  window.kametiApp = new KametiApp();
});
