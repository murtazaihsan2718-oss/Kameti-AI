# 📱 Kameti - Mobile Informal Savings Committee Manager

> **Simple, fast, trustworthy, and visually clean mobile application for managing Kameti, Beesi, and ROSCA informal savings committees.**

---

## 🔒 Core Product Principle
**This app DOES NOT hold, transfer, process, or manage real money.**
Users make actual payments themselves through **Easypaisa, JazzCash, SadaPay, NayaPay, Raast, Bank Transfer, or Cash** outside the app. The app tells them who to pay, how much to pay, where to send it, and allows uploading and reviewing payment proof.

---

## ✨ Features

1. **⚡ Fast Onboarding & Authentication**
   - Under 1-minute onboarding.
   - Phone authentication with OTP verification & resend cooldown.
   - Login phone number stored separately from payment number.
   - Profile setup: Name, Preferred payment method (Easypaisa, JazzCash, SadaPay, etc.), Payment account number.

2. **🏠 Home Screen**
   - Personalized time-of-day greeting ("Good morning, Aown").
   - Two prominent primary actions: `[ + Create Committee ]` and `[ Join Committee ]`.
   - Clean committee cards displaying monthly contribution, member count, current recipient, deadline, and real-time status badge (● On track, ● Due soon, ● Overdue).
   - Friendly empty state for first-time users.

3. **➕ Create Committee**
   - Setup wizard: Name, Member count, Contribution amount, Frequency (monthly/custom), Start date, Recipient selection mode (**Random** or **Voting**).
   - Real-time monthly pool calculator (`5 members × Rs. 20,000 = Rs. 100,000`).
   - Summary confirmation screen.
   - Automatic generation of unique 6-character invitation code and shareable join links.

4. **🔗 Join Committee**
   - Direct join links (`https://yourapp/?join=ABC123`) and invitation code input.
   - Full invitation details preview.
   - Duplicate membership guards & capacity limit checks.

5. **⭕ Signature Committee Circle Room**
   - Visual circular arrangement of member avatars around an active status core.
   - Status indicators:
     - 👑 **Gold Crown & Glow**: Monthly recipient.
     - ⏳ **Pending Ring**: Contribution proof pending.
     - ✓ **Emerald Ring**: Payment proof submitted.
   - Tap any avatar to view that member's payment details (restricted to committee members).
   - Prominent `[ PAY Rs. 20,000 ]` hero button for pending payments.

6. **🎲 Deterministic Recipient Selection**
   - **Mode A: Random**: Smoothly animated spinning wheel that rotates, slows down, and lands deterministically on the eligible member. Locks permanently per cycle.
   - **Mode B: Voting**: Real-time voting room with live vote counts, candidate progress bars, active countdown timer, and automatic fair tie-breaker resolution.

7. **💳 Payment Instructions & Proof Uploads**
   - Recipient details, payment method, and account number.
   - `[ Copy Number ]`, `[ Copy Amount ]`, and `[ Open Payment App ]` deep links.
   - Photo/receipt upload from camera, gallery, or drag-and-drop.
   - In-app proof viewer for committee members.
   - Replace or remove proof before cycle closure.

8. **⏰ Automated Reminders & Natural Language Deadlines**
   - Natural deadlines: *"Payment due in 2 days"*, *"Payment due today"*, *"1 day late"*.
   - Automated notifications (3 days before, 1 day before, due date, late alert, proof submitted confirmation, recipient payout alert).

9. **📜 Committee History**
   - Month-by-month historical schedule with pool totals, recipient records, and completed payment counters.

10. **🎙️ Multilingual Voice & AI Assistant**
    - Accessible via floating glowing microphone action.
    - Full speech recognition (speech-to-text) and speech synthesis (text-to-speech) in **English**, **Urdu (اردو)**, and **Roman Urdu** (*"meri committee ki bari kab hai?"*, *"how much do I owe this month?"*, *"who hasn't submitted proof?"*).
    - Safe application tools layer (`getMyCommittees`, `getCurrentRecipient`, `getMyPendingPayments`, `getMyUpcomingPayout`, `getPendingMembers`).

11. **👤 User Profile & Tracking Statistics**
    - Account details editor and OTP-secured profile updates.
    - Tracking statistics: Active committees, Completed committees, Total contributions tracked, Total payouts received.

---

## 🚀 Running the App Locally

Start the local server using `agy-node.cmd`:

```powershell
& agy-node.cmd server.js
```

Open your browser at:
👉 **`http://localhost:3000`**

To test joining a committee via invitation link:
👉 **`http://localhost:3000/?join=FRIEND5`**

---

## 🔥 Firebase Setup Instructions (Optional for Live Production)

The app works out of the box with zero setup in **Mock/Demo Mode**. To connect your live Firebase project:

1. Open `js/config/firebaseConfig.js` and fill in your Firebase project credentials:
   ```javascript
   export const FIREBASE_CONFIG = {
     apiKey: "YOUR_FIREBASE_API_KEY",
     authDomain: "YOUR_PROJECT_ID.firebaseapp.com",
     projectId: "YOUR_PROJECT_ID",
     storageBucket: "YOUR_PROJECT_ID.appspot.com",
     messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
     appId: "YOUR_APP_ID"
   };
   ```
2. Enable **Phone Authentication** in Firebase Console -> Authentication -> Sign-in method -> Phone.
3. Deploy Firestore Security Rules:
   ```bash
   firebase deploy --only firestore:rules
   ```
   (Uses the provided [`firestore.rules`](./firestore.rules))
4. Deploy Storage Security Rules:
   ```bash
   firebase deploy --only storage
   ```
   (Uses the provided [`storage.rules`](./storage.rules))

---

## 📂 Project Architecture

```
kameti-mobile-app/
├── index.html                  # Mobile web app container frame & shell
├── manifest.json               # Web App Manifest for mobile installation
├── sw.js                       # Service Worker for offline support
├── server.js                   # High-speed static HTTP server
├── firestore.rules             # Production Firebase Security Rules
├── storage.rules               # Production Firebase Storage Rules
├── README.md                   # Documentation & Setup Guide
├── css/
│   └── styles.css              # Custom mobile design system & animations
└── js/
    ├── app.js                  # App router, nav bar, and state controller
    ├── config/
    │   └── firebaseConfig.js   # Dual-mode Firebase manager
    ├── models/
    │   └── dataModels.js       # Data schemas and utility functions
    ├── services/
    │   ├── authService.js      # Phone auth & OTP verification
    │   ├── committeeService.js # Committee CRUD & join resolver
    │   ├── selectionService.js # Deterministic random spinner & voting engine
    │   ├── paymentService.js   # Payment tracking & proof uploads
    │   ├── notificationService.js # Reminders & natural notifications
    │   ├── voiceAssistantService.js # Multilingual voice & safe AI tools
    │   └── storageService.js   # Reactive state store with rich seed data
    └── components/
        ├── onboardingView.js   # 4-step fast onboarding
        ├── homeView.js         # Home dashboard & cards
        ├── createCommitteeView.js # Committee setup wizard
        ├── joinCommitteeView.js   # Join code & link resolver
        ├── committeeCircle.js     # Signature circular visualization & spinner
        ├── committeeRoomView.js   # Committee Room main screen
        ├── votingModal.js         # Voting session & timer
        ├── paymentProofModal.js   # Payment instructions & proof upload/viewer
        ├── historyView.js         # Historical months & proofs
        ├── notificationsView.js   # Alerts center
        ├── profileView.js         # Profile & tracking stats
        └── voiceAssistantModal.js # Multilingual voice UI & orb
```
