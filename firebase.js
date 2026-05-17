// Firebase Configuration
const firebaseConfig = {
    apiKey: "AIzaSyDDhvquMr_6zODjgFIiU2y1Uzpc2wNgmX0",
    authDomain: "harimhire.firebaseapp.com",
    projectId: "harimhire",
    storageBucket: "harimhire.appspot.com",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Get Firestore instance
const firestore = firebase.firestore();

// Collections:
// - candidates (מועמדים)
// - clients (לקוחות)
// - jobs (משרות)
// - jobTypes (סוגי משרה - 1001, 1002 וכו')
// - referrals (הפניות)
// - logs (תיעוד פעולות)
// - templates (תבניות הודעות)
// - alerts (התראות חכמות)
// - interviewAddresses (כתובות ראיון)

console.log('Firebase initialized successfully');
