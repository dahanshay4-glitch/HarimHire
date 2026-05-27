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

/**
 * Build a fast lookup map: city → canonical area name
 * @returns {{ [normalizedCity]: areaName }}
 */
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

/**
 * Get the canonical area name for a given city string.
 * Returns the CITY_AREAS area name containing this city,
 * or the normalized city string itself if not found.
 */
export function getCanonicalCity(city) {
  if (!city) return null;
  const map = buildCityToCanonicalMap();
  const norm = normalizeText(city);
  return map[norm] || norm;
}

/**
 * Normalize a city string:
 * - returns the canonical area name if the city is in CITY_AREAS
 * - otherwise returns the normalized city string directly
 * - returns null for empty/falsy inputs
 */
export function normalizeCity(city) {
  if (!city) return null;
  return getCanonicalCity(city);
}

/**
 * Check if two city strings match after canonicalization.
 */
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

// Status constant shorthands
const STATUS_WAITING_FILTER   = 'ממתין לסינון';
const STATUS_INTERVIEW_MATCH = 'תואם ראיון';
const STATUS_SENT_SECURITY   = 'נשלח ביטחון';
const STATUS_PASSED_SECURITY = 'עבר ביטחון';
const STATUS_STARTED         = 'התחיל לעבוד';
const STATUS_NOT_ACCEPTED    = 'לא התקבל';
const STATUS_LEFT            = 'עזב';
const STATUS_IN_PROCESS_PHRASE = 'בתהליך';

/**
 * Returns true if candidate is in-process (past screening, not yet hired/rejected).
 * Excludes: ממתין לסינון, לא התקבל, עזב
 */
export function isCandidateInProcess(candidate) {
  if (!candidate) return false;
  const s = normalizeStatus(candidate.status);
  if (!s) return false;
  if (s === STATUS_WAITING_FILTER) return false;
  if (s === STATUS_NOT_ACCEPTED) return false;
  if (s === STATUS_LEFT) return false;
  if (s === STATUS_INTERVIEW_MATCH) return true;
  if (s === STATUS_SENT_SECURITY) return true;
  if (s === STATUS_PASSED_SECURITY) return true;
  if (s === STATUS_STARTED) return true;
  if (s.includes(STATUS_IN_PROCESS_PHRASE)) return true;
  return false;
}

/**
 * Returns true if candidate was hired (status = "התחיל לעבוד").
 */
export function isCandidateHired(candidate) {
  if (!candidate) return false;
  return normalizeStatus(candidate.status) === STATUS_STARTED;
}

/**
 * Returns true if candidate has started working (same as hired in this system).
 */
export function isCandidateStarted(candidate) {
  return isCandidateHired(candidate);
}

/**
 * Returns true if candidate was not accepted or left.
 */
export function isCandidateRejected(candidate) {
  if (!candidate) return false;
  const s = normalizeStatus(candidate.status);
  return s === STATUS_NOT_ACCEPTED || s === STATUS_LEFT;
}

// ─────────────────────────────────────────────────
// DATE HELPER
// ─────────────────────────────────────────────────

/**
 * Get a valid Date object from a candidate/job record.
 * Prefers createdAt (Firestore Timestamp), falls back to createdDate / date.
 * Returns null if no date info available.
 */
export function getCreatedDate(record) {
  if (!record) return null;
  const ts = record.createdAt || record.createdDate || record.date;
  if (!ts) return null;
  try {
    if (ts.toDate && typeof ts.toDate === 'function') {
      return ts.toDate();
    }
    return new Date(ts);
  } catch (e) {
    return null;
  }
}

/**
 * Returns true if the candidate was created within the current calendar month.
 */
export function isCandidateNewThisMonth(candidate) {
  if (!candidate) return false;
  const d = getCreatedDate(candidate);
  if (!d) return false;
  const now = new Date();
  return d.getFullYear() === now.getFullYear() && d.getMonth() === now.getMonth();
}

/**
 * Returns true if candidate was created within N days from now.
 */
export function isCandidateNewWithinDays(candidate, days) {
  if (!candidate) return false;
  const d = getCreatedDate(candidate);
  if (!d) return false;
  const now = new Date();
  return now - d >= 0 && now - d <= days * 864e5;
}

/**
 * Get month-year key string (e.g. "2025-05").
 */
export function getMonthKey(d) {
  if (!d || isNaN(d.getFullYear())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
}

// Hebrew 3-letter month abbreviations (index = js month 0-based)
const HEBREW_MONTHS = ['ינ', 'פבר', 'מרץ', 'אפר', 'מאי', 'יונ', 'יול', 'אוג', 'ספט', 'אוק', 'נוב', 'דצ'];

export function getHebrewMonthName(monthIndex) {
  return HEBREW_MONTHS[monthIndex] || '';
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

/**
 * Core matching: does a single candidate match a single job?
 *
 * Rules:
 *   1. Candidate must not be soft-deleted
 *   2. Job must be open (status = פתוחה / open / empty)
 *   3. Job must have at least one city defined
 *   4. Candidate city (canonical) must match at least one of job.cities (canonical)
 *   5. Candidate city must not be empty/unknown
 */
export function candidateMatchesJob(candidate, job) {
  if (!candidate || !job) return false;
  if (candidate.deleted === true) return false;
  if (!isJobOpen(job)) return false;
  const jobCities = job.cities;
  if (!jobCities || !Array.isArray(jobCities) || jobCities.length === 0) return false;
  const candCity = candidate.city;
  if (!candCity) return false;
  const candNorm = normalizeCity(candCity);
  if (!candNorm) return false;
  // Check against each job city after canonicalization
  return jobCities.some(jc => normalizeCity(jc) === candNorm);
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

/**
 * Compute dashboard candidate statistics from live candidate/job arrays.
 *
 * @param {Array}  candidates  - live candidates array (from watchCandidates)
 * @param {Array}  [jobs]      - live jobs array (optional, for future job-level stats)
 * @returns {{ inProcess, newThisMonth, hiredThisMonth, referralsThisMonth,
 *             bySource, byStatus, byMonth }}
 */
export function getDashboardCandidateStats(candidates, jobs) {
  if (!candidates) candidates = [];
  const now = new Date();
  const currentYear = now.getFullYear();
  const currentMonth = now.getMonth();

  let inProcess = 0;
  let newThisMonth = 0;
  let hiredThisMonth = 0;
  let referralsThisMonth = 0;
  const bySource = {};
  const byStatus = {};
  const byMonth = {}; // key = "YYYY-MM", value = count

  candidates.forEach(c => {
    if (c.deleted === true) return;

    // In-process
    if (isCandidateInProcess(c)) inProcess++;

    // Status breakdown
    const st = normalizeStatus(c.status);
    if (st) {
      byStatus[st] = (byStatus[st] || 0) + 1;
    }

    // Source breakdown
    const src = normalizeText(c.source);
    if (src) {
      bySource[src] = (bySource[src] || 0) + 1;
    }

    // Date-based metrics using createdAt as canonical
    const d = getCreatedDate(c);
    if (!d || isNaN(d.getFullYear())) return;

    // New this month
    if (d.getFullYear() === currentYear && d.getMonth() === currentMonth) {
      newThisMonth++;

      // Hired this month (status = התחיל לעבוד, created this month)
      if (st === STATUS_STARTED) hiredThisMonth++;
    }

    // Monthly histogram (last 7 months including current)
    const monthKey = getMonthKey(d);
    byMonth[monthKey] = (byMonth[monthKey] || 0) + 1;
  });

  return { inProcess, newThisMonth, hiredThisMonth, referralsThisMonth, bySource, byStatus, byMonth };
}
