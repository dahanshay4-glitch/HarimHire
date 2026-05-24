// HarimHire – Firebase Configuration
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getFirestore, collection, addDoc, getDocs, getDoc, doc, updateDoc, deleteDoc, query, where, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyDDhvquMr_6zODjgFIiU2y1Uzpc2wNgmX0",
  authDomain: "harimhire.firebaseapp.com",
  projectId: "harimhire",
  storageBucket: "harimhire.firebasestorage.app",
  messagingSenderId: "723909250338",
  appId: "1:723909250338:web:70f5ac52e307083379697b",
  measurementId: "G-3EHX5Z8VRF"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);

// ── COLLECTIONS ──
// candidates   – מועמדים
// clients      – לקוחות
// jobs         – משרות
// referrals    – הפניות
// logs         – לוג פעולות

// ── CANDIDATES ──
export async function addCandidate(data) {
  data.createdAt = serverTimestamp();
  data.updatedAt = serverTimestamp();
  return await addDoc(collection(db, 'candidates'), data);
}

export async function getCandidates() {
  const snap = await getDocs(query(collection(db, 'candidates'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function getCandidate(id) {
  try {
    const snap = await getDoc(doc(db, 'candidates', id));
    return snap.exists() ? { id: snap.id, ...snap.data() } : null;
  } catch(e) {
    // Only re-throw genuine Firestore/network errors; missing docs return null
    if (e && e.code === 'not-found') return null;
    console.error('getCandidate error:', e);
    throw e;
  }
}

export async function updateCandidate(id, data) {
  data.updatedAt = serverTimestamp();
  return await updateDoc(doc(db, 'candidates', id), data);
}

export async function deleteCandidate(id) {
  return await deleteDoc(doc(db, 'candidates', id));
}

export function watchCandidates(callback) {
  return onSnapshot(query(collection(db, 'candidates'), orderBy('createdAt', 'desc')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── CLIENTS ──
export async function addClient(data) {
  data.createdAt = serverTimestamp();
  return await addDoc(collection(db, 'clients'), data);
}

export async function getClients() {
  const snap = await getDocs(query(collection(db, 'clients'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateClient(id, data) {
  return await updateDoc(doc(db, 'clients', id), data);
}

export function watchClients(callback) {
  return onSnapshot(collection(db, 'clients'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── JOBS ──
export async function addJob(data) {
  data.createdAt = serverTimestamp();
  data.status = data.status || 'פתוחה';
  return await addDoc(collection(db, 'jobs'), data);
}

export async function getJobs() {
  const snap = await getDocs(query(collection(db, 'jobs'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateJob(id, data) {
  data.updatedAt = serverTimestamp();
  return await updateDoc(doc(db, 'jobs', id), data);
}

export function watchJobs(callback) {
  return onSnapshot(collection(db, 'jobs'), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── REFERRALS ──
export async function addReferral(data) {
  data.createdAt = serverTimestamp();
  return await addDoc(collection(db, 'referrals'), data);
}

export async function getReferrals() {
  const snap = await getDocs(query(collection(db, 'referrals'), orderBy('createdAt', 'desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

export async function updateReferral(id, data) {
  return await updateDoc(doc(db, 'referrals', id), data);
}

export function watchReferrals(callback) {
  return onSnapshot(query(collection(db, 'referrals'), orderBy('createdAt','desc')), snap => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  });
}

// ── FIXES (תיקונים) ──
export async function getFixes() {
  const snap = await getDocs(query(collection(db, 'candidates'), where('needsFix', '==', true), orderBy('createdAt','desc')));
  return snap.docs.map(d => ({ id: d.id, ...d.data() }));
}

// ── LOGS ──
export async function addLog(action, data) {
  return await addDoc(collection(db, 'logs'), {
    action, data,
    createdAt: serverTimestamp(),
    user: 'נטלי'
  });
}

export { db };
