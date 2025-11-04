/*
 * challenge.js
 * Logic for the "Challenge of the Day" panel.
 * Handles random selection, subject filtering, locking, hints, and copying.
 */
import { get as storageGet, set as storageSet, remove as storageRemove } from './storage.js';

let challengesBySubject = {};
let currentSubject = 'All';
let currentChallenge = null;

// Elements
let subjectSelect;
let newBtn;
let lockBtn;
let copyBtn;
let hintBtn;
let subjectDisplay;
let textDisplay;
let hintsList;

/**
 * Initialize the challenge module with data from config.
 * @param {Object[]} challenges - Array of challenge objects with subject and text.
 */
export function init(challenges) {
  // Group challenges by subject
  challengesBySubject = { All: [] };
  challenges.forEach((ch) => {
    const subj = ch.subject || 'Misc';
    if (!challengesBySubject[subj]) {
      challengesBySubject[subj] = [];
    }
    challengesBySubject[subj].push(ch);
    challengesBySubject['All'].push(ch);
  });

  // Cache DOM elements
  subjectSelect = document.getElementById('challenge-subject-select');
  newBtn = document.getElementById('btn-new-challenge');
  lockBtn = document.getElementById('btn-toggle-lock');
  copyBtn = document.getElementById('btn-copy-challenge');
  hintBtn = document.getElementById('btn-show-hints');
  subjectDisplay = document.getElementById('challenge-subject');
  textDisplay = document.getElementById('challenge-text');
  hintsList = document.getElementById('challenge-hints');

  populateSubjectSelect();
  attachListeners();
  restoreState();
}

/**
 * Populate the subject filter dropdown.
 */
function populateSubjectSelect() {
  // Clear existing options
  subjectSelect.innerHTML = '';
  Object.keys(challengesBySubject).forEach((subj) => {
    const option = document.createElement('option');
    option.value = subj;
    option.textContent = subj;
    subjectSelect.appendChild(option);
  });
  // Set previously selected subject
  const savedSubject = storageGet('challenge.subject', 'All');
  if (challengesBySubject[savedSubject]) {
    currentSubject = savedSubject;
    subjectSelect.value = currentSubject;
  }
}

/**
 * Attach event listeners for buttons and select.
 */
function attachListeners() {
  subjectSelect.addEventListener('change', () => {
    currentSubject = subjectSelect.value;
    storageSet('challenge.subject', currentSubject);
    // When subject changes and not locked, pick new challenge
    if (!isLocked()) {
      pickNewChallenge();
    }
  });

  newBtn.addEventListener('click', () => {
    if (!isLocked()) {
      pickNewChallenge();
    }
  });

  lockBtn.addEventListener('click', () => {
    toggleLock();
  });

  copyBtn.addEventListener('click', () => {
    copyCurrentChallenge();
  });

  hintBtn.addEventListener('click', () => {
    toggleHints();
  });
}

/**
 * Restore state from localStorage (locked challenge and subject).
 */
function restoreState() {
  const locked = isLocked();
  if (locked) {
    const stored = storageGet('challenge.lockedItem', null);
    if (stored) {
      currentChallenge = stored;
      currentSubject = stored.subject || 'All';
      subjectSelect.value = currentSubject;
      renderChallenge(currentChallenge);
    } else {
      // fallback if missing
      storageSet('challenge.locked', false);
      pickNewChallenge();
    }
  } else {
    pickNewChallenge();
  }
  updateLockButton();
}

/**
 * Determine if the challenge is locked.
 * @returns {boolean}
 */
function isLocked() {
  return storageGet('challenge.locked', false) === true;
}

/**
 * Toggle the locked state.
 */
function toggleLock() {
  const locked = !isLocked();
  storageSet('challenge.locked', locked);
  if (locked) {
    // Store current challenge in localStorage
    if (currentChallenge) {
      storageSet('challenge.lockedItem', currentChallenge);
    }
  } else {
    storageRemove('challenge.lockedItem');
  }
  updateLockButton();
}

/**
 * Update lock button text and aria-pressed state based on locked state.
 */
function updateLockButton() {
  const locked = isLocked();
  lockBtn.setAttribute('aria-pressed', locked);
  lockBtn.textContent = locked ? '🔒 Unlock' : '🔓 Lock';
}

/**
 * Pick a new random challenge based on the current subject filter.
 */
function pickNewChallenge() {
  const list = challengesBySubject[currentSubject] || [];
  if (list.length === 0) {
    subjectDisplay.textContent = currentSubject;
    textDisplay.textContent = 'No challenges available.';
    hintsList.classList.add('hidden');
    return;
  }
  // Seed random selection with Math.random
  const randomIndex = Math.floor(Math.random() * list.length);
  currentChallenge = list[randomIndex];
  renderChallenge(currentChallenge);
}

/**
 * Render the current challenge to the UI.
 * @param {Object} challenge
 */
function renderChallenge(challenge) {
  subjectDisplay.textContent = challenge.subject;
  textDisplay.textContent = challenge.text;
  // Hints
  if (Array.isArray(challenge.hints) && challenge.hints.length > 0) {
    hintsList.innerHTML = '';
    challenge.hints.forEach((hint) => {
      const li = document.createElement('li');
      li.textContent = hint;
      hintsList.appendChild(li);
    });
    // hide hints by default
    hintsList.classList.add('hidden');
    hintBtn.classList.remove('hidden');
  } else {
    hintsList.innerHTML = '';
    hintsList.classList.add('hidden');
    hintBtn.classList.add('hidden');
  }
}

/**
 * Toggle showing hints list.
 */
function toggleHints() {
  if (hintsList.classList.contains('hidden')) {
    hintsList.classList.remove('hidden');
    hintBtn.setAttribute('aria-pressed', 'true');
  } else {
    hintsList.classList.add('hidden');
    hintBtn.setAttribute('aria-pressed', 'false');
  }
}

/**
 * Copy the current challenge text to clipboard.
 */
function copyCurrentChallenge() {
  if (!currentChallenge) return;
  const textToCopy = `${currentChallenge.subject}: ${currentChallenge.text}`;
  navigator.clipboard.writeText(textToCopy).then(() => {
    showOverlay('Challenge copied to clipboard');
  }).catch(() => {
    showOverlay('Failed to copy challenge');
  });
}

/**
 * Display a temporary overlay message.
 * @param {string} message
 */
function showOverlay(message) {
  const overlay = document.getElementById('overlay');
  overlay.textContent = message;
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 2000);
}

/**
 * External method to create a new challenge via keyboard shortcut.
 */
export function newChallengeViaShortcut() {
  if (!isLocked()) {
    pickNewChallenge();
  }
}

/**
 * External method to toggle lock via keyboard shortcut.
 */
export function toggleLockViaShortcut() {
  toggleLock();
}