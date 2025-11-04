/*
 * app.js
 * Entry point for the Ramaz Challenge & Spinner app.
 * Coordinates loading of config, initialization of modules,
 * tab navigation, teacher controls, keyboard shortcuts, and offline support.
 */
import * as storage from './storage.js';
import * as challenge from './challenge.js';
import * as spinner from './spinner.js';

let configData = {};
let activeTab = 'challenge';
let timerInterval = null;
let remainingSeconds = 0;

document.addEventListener('DOMContentLoaded', () => {
  loadConfig();
  registerServiceWorker();
  setupTabs();
  setupTeacherControls();
  setupKeyboardShortcuts();
  setupOfflineHandlers();
});

/**
 * Load configuration JSON from /data/config.json.
 * If fetch fails, fall back to an embedded default.
 */
async function loadConfig() {
  try {
    const response = await fetch('data/config.json');
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    const data = await response.json();
    if (!validateConfig(data)) {
      throw new Error('Invalid configuration file.');
    }
    configData = data;
    challenge.init(configData.challenges);
    spinner.init(configData.spinner);
  } catch (err) {
    console.error('Failed to load config', err);
    // Fallback to embedded default config
    configData = getDefaultConfig();
    challenge.init(configData.challenges);
    spinner.init(configData.spinner);
    showOverlay('Using default configuration because loading failed.');
  }
}

/**
 * Validate that config has the expected structure.
 * @param {Object} data
 * @returns {boolean}
 */
function validateConfig(data) {
  return (
    data &&
    Array.isArray(data.challenges) &&
    data.spinner &&
    data.spinner.categories &&
    typeof data.spinner.categories === 'object'
  );
}

/**
 * Provide a simple default configuration in case loading fails.
 * @returns {Object}
 */
function getDefaultConfig() {
  return {
    challenges: [
      { subject: 'General', text: 'What is the capital of France?', hints: ['It is known as the City of Light.', 'It houses the Eiffel Tower.'] },
      { subject: 'Math', text: 'Compute 7 × 8.', hints: ['Think of 56.'] },
      { subject: 'Science', text: 'Name the process by which plants make food.', hints: ['It involves sunlight and chlorophyll.'] }
    ],
    spinner: {
      categories: {
        Students: ['Alice', 'Bob', 'Charlie'],
        Topics: ['Math', 'Science', 'History'],
        'Review Questions': ['What is photosynthesis?', 'Explain Newton’s second law.', 'What is the Pythagorean theorem?']
      }
    }
  };
}

/**
 * Register the service worker for offline caching.
 */
function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('sw.js').catch((err) => {
      console.warn('Service worker registration failed', err);
    });
  }
}

/**
 * Setup tab navigation and restore previously active tab.
 */
function setupTabs() {
  const tabChallenge = document.getElementById('tab-challenge');
  const tabSpinner = document.getElementById('tab-spinner');
  const panelChallenge = document.getElementById('panel-challenge');
  const panelSpinner = document.getElementById('panel-spinner');

  function switchTo(tab) {
    activeTab = tab;
    storage.set('activeTab', tab);
    if (tab === 'challenge') {
      tabChallenge.classList.add('active');
      tabSpinner.classList.remove('active');
      panelChallenge.classList.remove('hidden');
      panelSpinner.classList.add('hidden');
      tabChallenge.setAttribute('aria-selected', 'true');
      tabSpinner.setAttribute('aria-selected', 'false');
    } else {
      tabSpinner.classList.add('active');
      tabChallenge.classList.remove('active');
      panelSpinner.classList.remove('hidden');
      panelChallenge.classList.add('hidden');
      tabSpinner.setAttribute('aria-selected', 'true');
      tabChallenge.setAttribute('aria-selected', 'false');
    }
  }

  tabChallenge.addEventListener('click', () => switchTo('challenge'));
  tabSpinner.addEventListener('click', () => switchTo('spinner'));

  // Restore from storage or default
  const saved = storage.get('activeTab', 'challenge');
  switchTo(saved);
}

/**
 * Setup teacher controls: import/export, theme, sound, projector mode, timer.
 */
function setupTeacherControls() {
  // Sound toggle
  const soundChk = document.getElementById('chk-sound');
  soundChk.checked = storage.get('settings.sound', false);
  soundChk.addEventListener('change', () => {
    storage.set('settings.sound', soundChk.checked);
  });

  // Theme toggle
  const themeChk = document.getElementById('chk-theme');
  const isDark = storage.get('settings.theme', 'light') === 'dark';
  themeChk.checked = isDark;
  applyTheme(isDark);
  themeChk.addEventListener('change', () => {
    const dark = themeChk.checked;
    storage.set('settings.theme', dark ? 'dark' : 'light');
    applyTheme(dark);
  });

  // Projector mode toggle
  const projChk = document.getElementById('chk-projector');
  const projector = storage.get('settings.projector', false);
  projChk.checked = projector;
  applyProjectorMode(projector);
  projChk.addEventListener('change', () => {
    const proj = projChk.checked;
    storage.set('settings.projector', proj);
    applyProjectorMode(proj);
  });

  // Timer controls
  const timerMinutesInput = document.getElementById('timer-minutes');
  const startBtn = document.getElementById('btn-start-timer');
  const pauseBtn = document.getElementById('btn-pause-timer');
  const resetBtn = document.getElementById('btn-reset-timer');
  const display = document.getElementById('timer-display');

  function updateDisplay() {
    const mins = String(Math.floor(remainingSeconds / 60)).padStart(2, '0');
    const secs = String(remainingSeconds % 60).padStart(2, '0');
    display.textContent = `${mins}:${secs}`;
  }

  function tick() {
    if (remainingSeconds > 0) {
      remainingSeconds--;
      updateDisplay();
    } else {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  }

  startBtn.addEventListener('click', () => {
    if (timerInterval) return;
    // Set remaining seconds based on input if timer not started
    if (remainingSeconds <= 0) {
      remainingSeconds = Math.max(1, parseInt(timerMinutesInput.value || '1', 10)) * 60;
      updateDisplay();
    }
    timerInterval = setInterval(tick, 1000);
  });
  pauseBtn.addEventListener('click', () => {
    if (timerInterval) {
      clearInterval(timerInterval);
      timerInterval = null;
    }
  });
  resetBtn.addEventListener('click', () => {
    clearInterval(timerInterval);
    timerInterval = null;
    remainingSeconds = parseInt(timerMinutesInput.value || '1', 10) * 60;
    updateDisplay();
  });
  // Initialize timer display
  remainingSeconds = parseInt(timerMinutesInput.value || '1', 10) * 60;
  updateDisplay();

  // Import / Export
  const importInput = document.getElementById('import-file');
  const exportBtn = document.getElementById('btn-export');
  importInput.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      if (!validateConfig(json)) {
        throw new Error('Invalid file structure');
      }
      configData = json;
      // Re-init modules
      challenge.init(configData.challenges);
      spinner.init(configData.spinner);
      showOverlay('Data imported successfully');
    } catch (err) {
      console.error('Import failed', err);
      showOverlay('Import failed: ' + err.message);
    } finally {
      // Reset input so same file can be selected again
      importInput.value = '';
    }
  });
  exportBtn.addEventListener('click', () => {
    // Build export object
    const exportData = {
      challenges: configData.challenges,
      spinner: {
        categories: spinner.getExportCategories()
      }
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'ramaz-config-export.json';
    a.click();
    setTimeout(() => {
      URL.revokeObjectURL(url);
    }, 1000);
  });
}

/**
 * Apply dark or light theme by setting a data attribute on the html element.
 * @param {boolean} dark
 */
function applyTheme(dark) {
  const root = document.documentElement;
  if (dark) {
    root.setAttribute('data-theme', 'dark');
  } else {
    root.removeAttribute('data-theme');
  }
}

/**
 * Apply projector mode by toggling a class on the body.
 * Projector mode increases font sizes and contrast for projection.
 * @param {boolean} enabled
 */
function applyProjectorMode(enabled) {
  document.body.classList.toggle('projector-mode', enabled);
}

/**
 * Setup keyboard shortcuts according to specification.
 */
function setupKeyboardShortcuts() {
  document.addEventListener('keydown', (e) => {
    // Ignore if active element is an input or textarea or contenteditable
    const active = document.activeElement;
    const ignoreTags = ['INPUT', 'TEXTAREA', 'SELECT'];
    if (ignoreTags.includes(active.tagName) || active.isContentEditable) {
      return;
    }
    switch (e.key.toLowerCase()) {
      case ' ':
        e.preventDefault();
        if (activeTab === 'challenge') {
          challenge.newChallengeViaShortcut();
        } else {
          spinner.spinViaShortcut();
        }
        break;
      case 'l':
        if (activeTab === 'challenge') {
          challenge.toggleLockViaShortcut();
        }
        break;
      case 'r':
        if (activeTab === 'spinner') {
          spinner.resetViaShortcut();
        }
        break;
      case 'h':
        if (activeTab === 'spinner') {
          spinner.toggleHistoryViaShortcut();
        }
        break;
      case 'f':
        toggleFullScreen();
        break;
      default:
        break;
    }
  });
}

/**
 * Toggle full screen mode on and off.
 */
function toggleFullScreen() {
  if (!document.fullscreenElement) {
    document.documentElement.requestFullscreen().catch((err) => {
      console.warn('Fullscreen request failed', err);
    });
  } else {
    document.exitFullscreen().catch((err) => {
      console.warn('Exiting fullscreen failed', err);
    });
  }
}

/**
 * Display overlay message. See challenge.js for copy messages.
 * We re-export for use in other modules.
 * @param {string} message
 */
export function showOverlay(message) {
  const overlay = document.getElementById('overlay');
  overlay.textContent = message;
  overlay.classList.remove('hidden');
  setTimeout(() => {
    overlay.classList.add('hidden');
  }, 2500);
}

/**
 * Setup handlers to indicate offline/online status to the user.
 */
function setupOfflineHandlers() {
  const offlineIndicator = document.createElement('div');
  offlineIndicator.textContent = 'Offline Mode';
  offlineIndicator.className = 'offline-indicator hidden';
  offlineIndicator.style.position = 'fixed';
  offlineIndicator.style.bottom = '0';
  offlineIndicator.style.right = '0';
  offlineIndicator.style.padding = '0.5rem 1rem';
  offlineIndicator.style.backgroundColor = 'var(--color-error)';
  offlineIndicator.style.color = '#fff';
  offlineIndicator.style.borderTopLeftRadius = '6px';
  document.body.appendChild(offlineIndicator);

  function updateIndicator() {
    const offline = !navigator.onLine;
    offlineIndicator.classList.toggle('hidden', !offline);
  }
  window.addEventListener('offline', updateIndicator);
  window.addEventListener('online', updateIndicator);
  updateIndicator();
}