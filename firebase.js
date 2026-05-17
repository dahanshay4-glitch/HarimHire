// Firebase Configuration – HarimHire
// Centralized Firebase bootstrap. Keep all Firebase config in this file.
const firebaseConfig = {
  apiKey: "AIzaSyDDhvquMr_6zODjgFIiU2y1Uzpc2wNgmX0",
  authDomain: "harimhire.firebaseapp.com",
  projectId: "harimhire",
  storageBucket: "harimhire.firebasestorage.app",
  messagingSenderId: "723909250338",
  appId: "1:723909250338:web:70f5ac52e307083379697b"
};

if (typeof firebase === 'undefined') {
  console.error('Firebase SDK was not loaded before firebase.js');
} else {
  if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
  }

  // Backward-compatible globals used across existing pages.
  window.firestore = firebase.firestore();
  window.db = window.firestore;

  console.log('Firebase initialized successfully');
}

// Collections currently used/planned:
// - candidates (מועמדים)
// - clients (לקוחות)
// - jobs (משרות)
// - jobTypes (סוגי משרה - 1001, 1002 וכו')
// - referrals (הפניות)
// - logs (תיעוד פעולות)
// - templates (תבניות הודעות)
// - alerts (התראות חכמות)
// - interviewAddresses (כתובות ראיון)
