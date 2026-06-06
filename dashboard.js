import { watchCandidates, watchReferrals, getFixes } from './firebase.js';
import { getDashboardCandidateStats } from './syncLogic.js';

console.log('[dashboard] MODULE LOADED');

function setText(id, value) {
 const el = document.getElementById(id);
 if (el) el.textContent = value ?? 0;
}

function updateDashboard(candidates) {
 
 const stats = getDashboardCandidateStats(candidates, null);
 
 
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


watchCandidates(function(candidates) {
  if (candidates[0]) {
    }
  updateDashboard(candidates);
});

watchReferrals(function(referrals) {
  setText('s2', referrals.length);
 setText('miniS2', referrals.length);
 setText('syncReferrals', referrals.length);
});

getFixes()
 .then(function(fixes) {
  setText('s5', fixes.length);
 setText('syncFixes', fixes.length);
 })
 });
