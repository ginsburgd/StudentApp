/*
 * storage.js
 * Helpers for interacting with localStorage using a consistent prefix.
 */

const PREFIX = 'ramaz.';

/**
 * Retrieve a value from localStorage. If the key does not exist
 * the provided defaultValue is returned.
 * @param {string} key
 * @param {*} defaultValue
 * @returns {*}
 */
export function get(key, defaultValue = null) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null || raw === undefined) return defaultValue;
    return JSON.parse(raw);
  } catch (err) {
    console.warn('storage.get error', key, err);
    return defaultValue;
  }
}

/**
 * Store a value in localStorage. Values are JSON encoded.
 * @param {string} key
 * @param {*} value
 */
export function set(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (err) {
    console.warn('storage.set error', key, err);
  }
}

/**
 * Remove a key from localStorage.
 * @param {string} key
 */
export function remove(key) {
  try {
    localStorage.removeItem(PREFIX + key);
  } catch (err) {
    console.warn('storage.remove error', key, err);
  }
}