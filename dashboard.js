import { watchCandidates, watchReferrals, getFixes } from './firebase.js';
import { getDashboardCandidateStats } from './syncLogic.js';

const runtimeBox = document.getElementById('dashboardRuntimeStatus');
if (runtimeBox) {
 runtimeBox.textContent = 'Dashboard JS loaded';
 runtimeBox.style.background = '#047857';
}

console.log('[dashboard] MODULE LOADED');

function setText(id, value) {
 const el = document.getElementById(id);
 if (el) el.textContent = value ?? 0;
}

function updateDashboard(candidates) {
 console.log('[dashboard] candidates received', candidates.length);

 const stats = getDashboardCandidateStats(candidates, null);
 console.log('[dashboard] stats', stats);

 if (runtimeBox) {
  runtimeBox.textContent = 'Dashboard JS loaded | candidates: ' + candidates.length + ' | inProcess: ' + (stats.inProcess ?? 0);
 }

 setText('s1', stats.inProcess);
 setText('s3', stats.hiredThisMonth);
 setText('s4', stats.startedThisMonth);
 setText('miniS1', stats.inProcess);
 setText('miniS3', stats.hiredThisMonth);
 setText('miniS4', stats.startedThisMonth);
 setText('syncCandidates', candidates.length);

 const newThisMonth = stats.newThisMonth ?? 0;
 const sNew = document.getElementById('newCandidatesThisMonth');
 if (sNew) sNew.textContent = newThisMonth;
}

console.log('[dashboard] attaching watchCandidates');

watchCandidates(function(candidates) {
 console.log('[dashboard] watchCandidates fired', candidates.length);
 console.log('FULL_CANDIDATES', JSON.stringify(candidates, null, 2));
 if (candidates[0]) {
  console.log('FIRST_CANDIDATE', candidates[0]);
  console.log('FIRST_CANDIDATE_STATUS', candidates[0].status);
  console.log('FIRST_CANDIDATE_CREATEDAT', candidates[0].createdAt);
 }
 if (runtimeBox) {
  runtimeBox.textContent = 'Dashboard JS loaded | candidates: ' + candidates.length;
 }
 updateDashboard(candidates);
});

watchReferrals(function(referrals) {
 console.log('[dashboard] watchReferrals fired', referrals.length);
 setText('s2', referrals.length);
 setText('miniS2', referrals.length);
 setText('syncReferrals', referrals.length);
});

getFixes()
 .then(function(fixes) {
 console.log('[dashboard] fixes loaded', fixes.length);
 setText('s5', fixes.length);
 setText('syncFixes', fixes.length);
 })
 .catch(function(err) {
 console.error('[dashboard] getFixes failed', err);
 });
