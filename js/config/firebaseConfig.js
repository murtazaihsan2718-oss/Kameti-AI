// Firebase Configuration & Service Initializer
// Dual-mode architecture: seamlessly connects to live Firebase when credentials are provided,
// or operates in an offline-ready high-fidelity local mode for instant zero-configuration testing.

export const FIREBASE_CONFIG = {
  apiKey: "YOUR_FIREBASE_API_KEY",
  authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
  projectId: "YOUR_PROJECT_ID",
  storageBucket: "YOUR_PROJECT_ID.appspot.com",
  messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
  appId: "YOUR_APP_ID"
};

class FirebaseManager {
  constructor() {
    this.isLiveConfigured = false;
    this.auth = null;
    this.db = null;
    this.storage = null;
    this.mode = 'mock'; // 'mock' or 'firebase'
    this.init();
  }

  init() {
    // Check if real credentials have been provided
    if (FIREBASE_CONFIG.apiKey && !FIREBASE_CONFIG.apiKey.startsWith('YOUR_')) {
      try {
        if (window.firebase) {
          if (!window.firebase.apps.length) {
            window.firebase.initializeApp(FIREBASE_CONFIG);
          }
          this.auth = window.firebase.auth();
          this.db = window.firebase.firestore();
          this.storage = window.firebase.storage();
          this.isLiveConfigured = true;
          this.mode = 'firebase';
          console.log('[Firebase] Initialized live Firebase connection');
        }
      } catch (err) {
        console.warn('[Firebase] Live init failed, falling back to local mode:', err);
        this.mode = 'mock';
      }
    } else {
      // In local mode, fully enabled for zero-friction local testing
      this.mode = 'mock';
      console.log('[Firebase] Running in Local Storage Mode (Ready to switch to Live Firebase anytime)');
    }
  }

  isLive() {
    return this.isLiveConfigured && this.mode === 'firebase';
  }
}

export const firebaseManager = new FirebaseManager();
