/*
 * spinner.js
 * Logic for the Spinner / Poller panel.
 * Supports multiple categories, spinning, exclusions, history, and confetti.
 */
import { get as storageGet, set as storageSet, remove as storageRemove } from './storage.js';

let categories = {};
let baseCategories = {};
let additions = {};
let currentCategory = null;
let history = {};
let excludePicked = false;
let showHistory = false;

// DOM elements
let categorySelect;
let spinBtn;
let shuffleBtn;
let resetBtn;
let excludeChk;
let historyChk;
let historyList;
let historyContainer;
let resultDisplay;
let addInput;
let addBtn;

/**
 * Initialize spinner with categories from config.
 * @param {Object} spinnerConfig - Object with categories and arrays of items.
 */
export function init(spinnerConfig) {
  // Clone config to internal structures
  baseCategories = JSON.parse(JSON.stringify(spinnerConfig.categories || {}));
  // Load additions, exclusions, history from storage
  additions = storageGet('spinner.additions', {});
  const exclusions = storageGet('spinner.exclusions', {});
  history = storageGet('spinner.history', {});
  excludePicked = storageGet('spinner.settings.excludePicked', false);
  showHistory = storageGet('spinner.settings.showHistory', false);

  // Build full categories including additions minus exclusions
  categories = {};
  Object.keys(baseCategories).forEach((cat) => {
    const base = [...baseCategories[cat]];
    const added = additions[cat] || [];
    const combined = base.concat(added);
    const excluded = exclusions[cat] || [];
    categories[cat] = combined.filter((item) => !excluded.includes(item));
  });

  // DOM references
  categorySelect = document.getElementById('spinner-category-select');
  spinBtn = document.getElementById('btn-spin');
  shuffleBtn = document.getElementById('btn-shuffle');
  resetBtn = document.getElementById('btn-reset');
  excludeChk = document.getElementById('chk-exclude');
  historyChk = document.getElementById('chk-show-history');
  historyList = document.getElementById('history-list');
  historyContainer = document.getElementById('spinner-history');
  resultDisplay = document.getElementById('spinner-result');
  addInput = document.getElementById('spinner-add-input');
  addBtn = document.getElementById('btn-add-item');

  populateCategorySelect();
  attachListeners();
  restoreState();
  updateHistoryUI();
  updateExcludeUI();
}

/**
 * Populate category select with categories from config.
 */
function populateCategorySelect() {
  categorySelect.innerHTML = '';
  Object.keys(categories).forEach((cat) => {
    const option = document.createElement('option');
    option.value = cat;
    option.textContent = cat;
    categorySelect.appendChild(option);
  });
  // Restore previously selected category
  const savedCat = storageGet('spinner.activeCategory', Object.keys(categories)[0]);
  if (categories[savedCat]) {
    currentCategory = savedCat;
    categorySelect.value = currentCategory;
  } else {
    currentCategory = Object.keys(categories)[0];
    categorySelect.value = currentCategory;
  }
}

/**
 * Restore settings from localStorage.
 */
function restoreState() {
  excludeChk.checked = excludePicked;
  historyChk.checked = showHistory;
  historyContainer.classList.toggle('hidden', !showHistory);
  // Display last history item as result if exists
  if (history[currentCategory] && history[currentCategory].length > 0) {
    resultDisplay.textContent = history[currentCategory][history[currentCategory].length - 1];
  }
}

/**
 * Attach event listeners to UI elements.
 */
function attachListeners() {
  categorySelect.addEventListener('change', () => {
    currentCategory = categorySelect.value;
    storageSet('spinner.activeCategory', currentCategory);
    // Update result display with last history item if exists
    if (history[currentCategory] && history[currentCategory].length > 0) {
      resultDisplay.textContent = history[currentCategory][history[currentCategory].length - 1];
    } else {
      resultDisplay.textContent = 'Press Spin to start!';
    }
    updateHistoryUI();
  });

  spinBtn.addEventListener('click', () => {
    spin();
  });
  shuffleBtn.addEventListener('click', () => {
    shuffle();
  });
  resetBtn.addEventListener('click', () => {
    reset();
  });
  excludeChk.addEventListener('change', () => {
    excludePicked = excludeChk.checked;
    storageSet('spinner.settings.excludePicked', excludePicked);
  });
  historyChk.addEventListener('change', () => {
    showHistory = historyChk.checked;
    storageSet('spinner.settings.showHistory', showHistory);
    historyContainer.classList.toggle('hidden', !showHistory);
  });
  addBtn.addEventListener('click', () => {
    addNewItem();
  });
  addInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      addNewItem();
    }
  });
  document.getElementById('btn-clear-history').addEventListener('click', () => {
    clearHistory();
  });
}

/**
 * Perform a spin: pick a random item, optionally remove it, save to history, display result.
 */
function spin() {
  const pool = categories[currentCategory] || [];
  if (pool.length === 0) {
    resultDisplay.textContent = 'No items available';
    return;
  }
  const index = Math.floor(Math.random() * pool.length);
  const item = pool[index];
  if (excludePicked) {
    // Remove from pool and record exclusion
    pool.splice(index, 1);
    const exclusions = storageGet('spinner.exclusions', {});
    if (!exclusions[currentCategory]) exclusions[currentCategory] = [];
    exclusions[currentCategory].push(item);
    storageSet('spinner.exclusions', exclusions);
  }
  // Record in history
  if (!history[currentCategory]) history[currentCategory] = [];
  history[currentCategory].push(item);
  storageSet('spinner.history', history);
  // Update display
  resultDisplay.textContent = item;
  announce(item);
  updateHistoryUI();
  triggerConfetti();
  playSound();
}

/**
 * Shuffle the order of items in the pool without spinning.
 */
function shuffle() {
  const pool = categories[currentCategory] || [];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  resultDisplay.textContent = 'Shuffled!';
}

/**
 * Reset the current category: restore pool to base + additions, clear exclusions and history.
 */
function reset() {
  // Clear exclusions for current category
  const exclusions = storageGet('spinner.exclusions', {});
  delete exclusions[currentCategory];
  storageSet('spinner.exclusions', exclusions);
  // Clear history for current category
  delete history[currentCategory];
  storageSet('spinner.history', history);
  // Rebuild categories
  const base = [...baseCategories[currentCategory]];
  const added = additions[currentCategory] || [];
  categories[currentCategory] = base.concat(added);
  resultDisplay.textContent = 'Reset!';
  updateHistoryUI();
}

/**
 * Add a new item to current category (session only).
 */
function addNewItem() {
  const text = addInput.value.trim();
  if (!text) return;
  // Add to additions
  if (!additions[currentCategory]) additions[currentCategory] = [];
  additions[currentCategory].push(text);
  storageSet('spinner.additions', additions);
  // Add to categories pool
  if (!categories[currentCategory]) categories[currentCategory] = [];
  categories[currentCategory].push(text);
  addInput.value = '';
  resultDisplay.textContent = `Added: ${text}`;
}

/**
 * Clear history for current category.
 */
function clearHistory() {
  delete history[currentCategory];
  storageSet('spinner.history', history);
  updateHistoryUI();
  resultDisplay.textContent = 'History cleared';
}

/**
 * Update the history list UI based on current history and category.
 */
function updateHistoryUI() {
  historyList.innerHTML = '';
  if (history[currentCategory] && history[currentCategory].length > 0) {
    history[currentCategory].slice().reverse().forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      historyList.appendChild(li);
    });
  }
}

/**
 * Play a celebratory sound if sound is enabled.
 */
function playSound() {
  const soundEnabled = storageGet('settings.sound', false);
  if (!soundEnabled) return;
  // Create beep using Web Audio API if audio file is unavailable
  try {
    const audio = document.getElementById('tada-sound');
    if (audio) {
      audio.currentTime = 0;
      audio.play();
    } else {
      // Fallback beep using Web Audio API
      const ctx = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = ctx.createOscillator();
      oscillator.type = 'triangle';
      oscillator.frequency.setValueAtTime(440, ctx.currentTime);
      oscillator.connect(ctx.destination);
      oscillator.start();
      oscillator.stop(ctx.currentTime + 0.5);
    }
  } catch (err) {
    console.error('Sound error', err);
  }
}

/**
 * Announce the result via aria-live region.
 * @param {string} text
 */
function announce(text) {
  // resultDisplay has aria-live attribute; simply updating text is sufficient
  // but we can force screen readers to re-read by temporarily clearing
  resultDisplay.textContent = '';
  setTimeout(() => {
    resultDisplay.textContent = text;
  }, 0);
}

/**
 * Trigger a simple confetti animation.
 */
function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  // Generate several confetti pieces
  const colors = ['#ff595e', '#ffca3a', '#8ac926', '#1982c4', '#6a4c93'];
  const numPieces = 30;
  for (let i = 0; i < numPieces; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    const size = Math.random() * 8 + 4;
    piece.style.width = `${size}px`;
    piece.style.height = `${size * 0.4}px`;
    piece.style.backgroundColor = colors[Math.floor(Math.random() * colors.length)];
    piece.style.position = 'absolute';
    piece.style.top = '0';
    piece.style.left = `${Math.random() * 100}%`;
    piece.style.opacity = '0.9';
    piece.style.transform = `rotate(${Math.random() * 360}deg)`;
    // Animation
    const duration = Math.random() * 1 + 1.5;
    const xMove = (Math.random() - 0.5) * 200;
    piece.animate([
      { transform: piece.style.transform, top: '-10px', opacity: 1 },
      { transform: `translate(${xMove}px, 500px) rotate(${Math.random() * 360}deg)`, opacity: 0 }
    ], {
      duration: duration * 1000,
      easing: 'ease-out',
      iterations: 1,
      fill: 'forwards'
    });
    container.appendChild(piece);
    // Remove after animation
    setTimeout(() => {
      container.removeChild(piece);
    }, duration * 1000);
  }
}

/**
 * Update the exclude checkbox UI state.
 */
function updateExcludeUI() {
  excludeChk.checked = excludePicked;
}

/**
 * External method to trigger spin via keyboard shortcut.
 */
export function spinViaShortcut() {
  spin();
}

/**
 * External method to reset via keyboard shortcut.
 */
export function resetViaShortcut() {
  reset();
}

/**
 * External method to toggle history via keyboard shortcut.
 */
export function toggleHistoryViaShortcut() {
  historyChk.checked = !historyChk.checked;
  historyChk.dispatchEvent(new Event('change'));
}

/**
 * Return combined categories (base + additions) for export purposes.
 * Does not remove exclusions or history; session-only removals are not exported.
 * @returns {Object} categories copy
 */
export function getExportCategories() {
  const out = {};
  Object.keys(baseCategories).forEach((cat) => {
    const base = [...baseCategories[cat]];
    const added = additions[cat] || [];
    out[cat] = base.concat(added);
  });
  return out;
}