/**
 * syncLogic.js – Centralized deterministic matching & sync logic for HarimHire/Talento
 *
 * All pages MUST use these functions instead of duplicating inline matching logic.
 * Rules:
 *   - trim whitespace
 *   - lowercase where relevant
 *   - ignore punctuation/dashes/extra spaces
 *   - use CITY_AREAS for canonical city/area mapping
 *   - candidate city must match one of job.cities after normalization
 *   - job must be active/open unless existing logic says otherwise
 *   - NEVER guess missing fields
 */

import { CITY_AREAS } from './city_areas.js';

// ─────────────────────────────────────────────────
// TEXT NORMALIZATION
// ─────────────────────────────────────────────────

/**
 * Normalize text for comparison:
 * - trims leading/trailing whitespace
 * - converts to lowercase
 * - replaces hyphens/dashes with spaces
 * - collapses multiple spaces into one
 * - strips punctuation marks (keeps Hebrew letters)
 */
export function normalizeText(value) {
  if (!value) return '';
  return String(value)
    .trim()
    .toLowerCase()
    .replace(/[\-״׳]/g, ' ')
    .replace(/[^\w\s\u0590-\u05ff]/g, '')
    .replace(/\s+/g, ' ')
    .trim();
}

// ─────────────────────────────────────────────────
// CITY NORMALIZATION VIA city_areas.js
// ─────────────────────────────────────────────────

let _cityToCanonicalMap = null;
function buildCityToCanonicalMap() {
  if (_cityToCanonicalMap) return _cityToCanonicalMap;
  _cityToCanonicalMap = {};
  CITY_AREAS.forEach(area => {
    if (!area.cities || area.cities.length === 0) return;
    area.cities.forEach(city => {
      _cityToCanonicalMap[normalizeText(city)] = area.name;
    });
  });
  return _cityToCanonicalMap;
}

export function getCanonicalCity(city) {
  if (!city) return null;
  const map = buildCityToCanonicalMap();
  const norm = normalizeText(city);
  return map[norm] || norm;
}

export function normalizeCity(city) {
  if (!city) return null;
  return getCanonicalCity(city);
}

export function citiesMatch(cityA, cityB) {
  if (!cityA && !cityB) return true;
  if (!cityA || !cityB) return false;
  return normalizeCity(cityA) === normalizeCity(cityB);
}

// ─────────────────────────────────────────────────
// STATUS NORMALIZATION
// ─────────────────────────────────────────────────

export function normalizeStatus(s) {
  if (!s) return '';
  return String(s).trim();
}

const STATUS_WAITING_FILTER = 'ממתין לסינון';
const STATUS_INTERVIEW_MATCH = 'תואם ראיון';
const STATUS_SENT_SECURITY = 'נשלח ביטחון';
const STATUS_PASSED_SECURITY = 'עבר ביטחון';
const STATUS_STARTED = 'התחיל לעבוד';
const STATUS_NOT_ACCEPTED = 'לא התקבל';
const STATUS_LEFT = 'עזב';
const STATUS_IN_PROCESS_PHRASE = 'בתהליך';

/**
 * Returns true if candidate is in-process (past screening, not yet hired/rejected).
 */
export function isCandidateInProcess(candidate) {
  if (!candidate) return false;
  const s = normalizeStatus(candidate.status);
  if (!s) return false;
  if (s === STATUS_WAITING_FILTER) return true;
  if (s === STATUS_NOT_ACCEPTED) return false;
  if (s === STATUS_LEFT) return false;
  if (s === STATUS_INTERVIEW_MATCH) return true;
  if (s === STATUS_SENT_SECURITY) return true;
  if (s === STATUS_PASSED_SECURITY) return true;
  if (s === STATUS_STARTED) return true;
  if (s.includes(STATUS_IN_PROCESS_PHRASE)) return true;
  return false;
}

export function isCandidateHired(candidate) {
  if (!candidate) return false;
  return normalizeStatus(candidate.status) === STATUS_STARTED;
}

export function isCandidateStarted(candidate) {
  return isCandidateHired(candidate);
}

export function isCandidateRejected(candidate) {
  if (!candidate) return false;
  const s = normalizeStatus(candidate.status);
  return s === STATUS_NOT_ACCEPTED || s === STATUS_LEFT;
}

// ─────────────────────────────────────────────────
// DATE HELPER
// ─────────────────────────────────────────────────

export function getCreatedDate(record) {
  if (!record) return null;
  var ts = record.createdAt || record.createdDate || record.date;
  if (!ts) return null;
  try {
    if (ts && typeof ts.toDate === 'function') {
      return ts.toDate();
    }
    var d = new Date(ts);
    if (isNaN(d.getFullYear())) return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function isCandidateNewThisMonth(candidate) {
  if (!candidate) return false;
  const d = getCreatedDate(candidate);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

export function isCandidateNewWithinDays(candidate, days) {
  if (!candidate) return false;
  const d = getCreatedDate(candidate);
  if (!d) return false;
  const now = new Date();
  return now - d >= 0 && now - d <= days * 864e5;
}

export function getMonthKey(d) {
  if (!d || isNaN(d.getFullYear())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

const HEBREW_MONTHS = ['ינ', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];
export function getHebrewMonthName(monthIndex) {
  return HEBREW_MONTHS[monthIndex] || '';
}

// ─────────────────────────────────────────────────
// JOB TYPE / CODE EXTRACTION
// ─────────────────────────────────────────────────

/**
 * Extract the leading numeric code from a string like "1002 – שליח שכיר"
 * Returns null if no leading code found.
 */
function extractJobCode(value) {
  if (!value) return null;
  const str = String(value).trim();
  const match = str.match(/^(\d+)/);
  return match ? match[1] : null;
}

/**
 * Determine if two job identifiers match.
 * Prefer numeric code match; fall back to normalized text.
 * "1002 – שליח שכיר" matches "1002" but NOT "1001".
 * "שליח שכיר" does NOT match "שליח עצמאי/קבלן".
 */
function jobTypesMatch(candidateJobValue, jobTypeValue, jobTypeCodeValue) {
  if (!candidateJobValue && !jobTypeValue && !jobTypeCodeValue) return false;
  if (!candidateJobValue) return false;

  const candCode = extractJobCode(candidateJobValue);
  const jobCode = extractJobCode(jobTypeCodeValue);
  const jobNameCode = extractJobCode(jobTypeValue);

  // If both sides have a numeric code, codes must match
  if (candCode && jobCode && candCode !== jobCode) return false;
  if (candCode && jobNameCode && candCode !== jobNameCode) return false;

  // If no codes on either side, compare normalized text
  if (!candCode && !jobCode && !jobNameCode) {
    return normalizeText(candidateJobValue) === normalizeText(jobTypeValue);
  }

  // If candidate has code but job has none, compare candidate code to job type name text
  if (candCode && !jobCode && !jobNameCode) {
    return normalizeText(candidateJobValue) === normalizeText(jobTypeValue);
  }

  return true;
}

// ─────────────────────────────────────────────────
// CORE MATCHING LOGIC
// ─────────────────────────────────────────────────

const OPEN_STATUS_VALUES = new Set(['פתוחה', 'open', '']);

function isJobOpen(job) {
  if (!job) return false;
  const s = normalizeStatus(job.status);
  if (!s) return true;
  return OPEN_STATUS_VALUES.has(s);
}

function isCandidateStatusEligible(candidate) {
  if (!candidate) return false;
  const s = normalizeStatus(candidate.status);
  if (!s) return false;
  if (s === STATUS_NOT_ACCEPTED) return false;
  if (s === STATUS_LEFT) return false;
  if (s === STATUS_WAITING_FILTER) return true;
  if (s === STATUS_INTERVIEW_MATCH) return true;
  if (s === STATUS_SENT_SECURITY) return true;
  if (s === STATUS_PASSED_SECURITY) return true;
  if (s === STATUS_STARTED) return true;
  if (s.includes(STATUS_IN_PROCESS_PHRASE)) return true;
  // Any other status (including empty) is treated as potentially eligible
  return true;
}

// ─────────────────────────────────────────────────
// REQUIREMENTS CHECK
// ─────────────────────────────────────────────────

const NOT_IMPORTANT = 'לא חשוב';

function checkRequirement(candidateValue, requirementValue, fieldName, req) {
  // If requirement is "לא חשוב" or missing/empty, always pass
  if (!requirementValue || requirementValue === NOT_IMPORTANT) return true;

  // Candidate value missing: only allow if includeUnknown flag is set
  if (!candidateValue || String(candidateValue).trim() === '') {
    const includeUnknown = req['includeUnknown' + fieldName.charAt(0).toUpperCase() + fieldName.slice(1)];
    if (includeUnknown === true) return true;
    return false;
  }

  const cand = normalizeText(String(candidateValue));
  const reqNorm = normalizeText(String(requirementValue));

  // Exact match after normalization
  return cand === reqNorm;
}

function matchesRequirements(candidate, requirements) {
  if (!requirements || typeof requirements !== 'object') return true;
  if (Object.keys(requirements).length === 0) return true;

  // Age: candidate.age must be within [ageMin, ageMax]
  if ('ageMin' in requirements || 'ageMax' in requirements) {
    const ageMin = parseInt(requirements.ageMin) || 0;
    const ageMax = parseInt(requirements.ageMax) || 999;
    const candAge = parseInt(candidate.age);
    if (!isNaN(candAge)) {
      if (candAge < ageMin || candAge > ageMax) return false;
    } else {
      // Missing age: only allow if includeUnknownAge === true
      if (requirements.includeUnknownAge !== true) return false;
    }
  }

  // Gender
  if ('gender' in requirements) {
    if (!checkRequirement(candidate.gender, requirements.gender, 'gender', requirements)) return false;
  }

  // Driver license
  if ('driverLicense' in requirements) {
    // Candidate may have field 'license' (from new_candidate.html)
    if (!checkRequirement(candidate.license, requirements.driverLicense, 'driverLicense', requirements)) return false;
  }

  // Mobility
  if ('mobility' in requirements) {
    if (!checkRequirement(candidate.mobility, requirements.mobility, 'mobility', requirements)) return false;
  }

  // Salary range
  if ('salaryMin' in requirements || 'salaryMax' in requirements) {
    const salaryMin = parseInt(requirements.salaryMin) || 0;
    const salaryMax = parseInt(requirements.salaryMax) || 99999999;
    const candSalary = parseInt(candidate.salary);
    if (!isNaN(candSalary)) {
      if (candSalary < salaryMin || candSalary > salaryMax) return false;
    } else {
      if (requirements.includeUnknownSalary !== true) return false;
    }
  }

  // Return months / availability
  if ('returnMonths' in requirements) {
    const reqReturn = parseInt(requirements.returnMonths) || 0;
    const candReturn = parseInt(candidate.returnMonths || candidate.returnMonthsMin);
    if (!isNaN(candReturn)) {
      if (candReturn > reqReturn) return false;
    } else {
      if (requirements.includeUnknownAvailability !== true) return false;
    }
  }

  return true;
}

// ─────────────────────────────────────────────────
// candidateMatchesJob
// ─────────────────────────────────────────────────

/**
 * Returns true only if ALL mandatory conditions are satisfied:
 * A. Valid records, not deleted
 * B. Job is open/active
 * C. Candidate status is eligible (not rejected/left)
 * D. Candidate job type matches job's job type (numeric code preferred)
 * E. Candidate city is in job.cities (canonical match)
 * F. Candidate satisfies job.requirements (if present)
 */
export function candidateMatchesJob(candidate, job) {
  // A: valid records
  if (!candidate || !job) return false;
  if (candidate.deleted === true || candidate.isDeleted === true) return false;
  if (job.deleted === true || job.isDeleted === true) return false;

  // B: job must be open
  if (!isJobOpen(job)) return false;

  // C: candidate status must be eligible (not rejected/left)
  if (!isCandidateStatusEligible(candidate)) return false;

  // D: job type / target job — HARD condition
  const candJob = candidate.job || candidate.targetJob || candidate.jobType || '';
  const jobType = job.jobType || job.jobTypeName || job.typeName || '';
  const jobCode = job.jobTypeCode || job.code || job.number || job.num || '';
  if (!jobTypesMatch(candJob, jobType, jobCode)) return false;

  // E: city — mandatory
  if (!job.cities || !Array.isArray(job.cities) || job.cities.length === 0) return false;
  const candCity = candidate.city || candidate.candidateCity;
  if (!candCity) return false;
  const candNorm = normalizeCity(candCity);
  if (!candNorm) return false;
  const cityMatch = job.cities.some(jc => normalizeCity(jc) === candNorm);
  if (!cityMatch) return false;

  // F: requirements
  if (!matchesRequirements(candidate, job.requirements)) return false;

  return true;
}

/**
 * Returns all candidates from an array that match a given job.
 */
export function getMatchingCandidatesForJob(candidates, job) {
  if (!candidates || !job) return [];
  return candidates.filter(c => candidateMatchesJob(c, job));
}

// ─────────────────────────────────────────────────
// DASHBOARD STATS
// ─────────────────────────────────────────────────

export function getDashboardCandidateStats(candidates, jobs) {
  if (!candidates) candidates = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let inProcess = 0;
  let newThisMonth = 0;
  let hiredThisMonth = 0;
  let startedThisMonth = 0;
  let referralsThisMonth = 0;
  const bySource = {};
  const byStatus = {};
  const byMonth = {};

  candidates.forEach(c => {
    if (c.deleted === true) return;


    if (isCandidateInProcess(c)) inProcess++;

    if (st) byStatus[st] = (byStatus[st] || 0) + 1;
    const src = normalizeText(c.source);
    if (src) bySource[src] = (bySource[src] || 0) + 1;

    if (!d || isNaN(d.getFullYear())) return;

    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      newThisMonth++;
      if (st === STATUS_STARTED) hiredThisMonth++;
      if (isCandidateStarted(c)) startedThisMonth++;
    }

    const monthKey = getMonthKey(d);
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
  });

  return { inProcess, newThisMonth, hiredThisMonth, startedThisMonth, referralsThisMonth, bySource, byStatus, byMonth };
}