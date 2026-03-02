// FerryMapperNYC - Error boundaries and error handling utilities

import { getEl } from './dom.js';

/**
 * Application error class with recoverable flag
 */
export class AppError extends Error {
  /**
   * @param {string} message - Error message
   * @param {boolean} recoverable - Whether the app can continue
   */
  constructor(message, recoverable = true) {
    super(message);
    this.name = 'AppError';
    this.recoverable = recoverable;
    this.timestamp = Date.now();
  }
}

/**
 * Escape HTML to prevent XSS
 * @param {string} str - Raw string
 * @returns {string} Escaped string
 */
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Show error UI in the directions panel
 * @param {string} message - Error message to display
 * @param {boolean} showReload - Whether to show reload button
 */
export function showErrorUI(message, showReload = true) {
  const directions = getEl('directions');
  if (directions) {
    directions.innerHTML = `
      <div class="error-msg">
        <strong>Something went wrong</strong>
        <p>${escapeHtml(message)}</p>
        ${showReload ? '<button onclick="location.reload()">Reload App</button>' : ''}
      </div>
    `;
  }
}

/**
 * Wrap an async function with error handling
 * @template T
 * @param {(...args: any[]) => Promise<T>} fn - Async function to wrap
 * @param {(err: Error) => T|null} [fallback] - Fallback function on error
 * @returns {(...args: any[]) => Promise<T|null>} Wrapped function
 */
export function wrapAsync(fn, fallback = null) {
  return async function(...args) {
    try {
      return await fn(...args);
    } catch (err) {
      console.error('[FerryMapper]', err);
      
      // Re-throw in debug mode for debugging
      if (window.FM_CONFIG?.debug) {
        throw err;
      }
      
      // Use fallback if provided
      if (fallback) {
        return fallback(err);
      }
      
      // Show error UI for user-facing errors
      showErrorUI(err.message || 'An unexpected error occurred');
      return null;
    }
  };
}

/**
 * Wrap a sync function with error handling
 * @template T
 * @param {(...args: any[]) => T} fn - Function to wrap
 * @param {(err: Error) => T|null} [fallback] - Fallback function on error
 * @returns {(...args: any[]) => T|null} Wrapped function
 */
export function wrapSync(fn, fallback = null) {
  return function(...args) {
    try {
      return fn(...args);
    } catch (err) {
      console.error('[FerryMapper]', err);
      
      if (window.FM_CONFIG?.debug) {
        throw err;
      }
      
      if (fallback) {
        return fallback(err);
      }
      
      showErrorUI(err.message || 'An unexpected error occurred');
      return null;
    }
  };
}

/**
 * Global error handler for uncaught errors
 */
export function initErrorHandling() {
  window.addEventListener('error', (event) => {
    console.error('[FerryMapper] Uncaught error:', event.error);
    
    // Don't show UI for every error - only show if no search results
    const directions = getEl('directions');
    if (directions && !directions.innerHTML.trim()) {
      showErrorUI('An unexpected error occurred. Please reload the page.', true);
    }
  });
  
  window.addEventListener('unhandledrejection', (event) => {
    console.error('[FerryMapper] Unhandled promise rejection:', event.reason);
  });
}

/**
 * Safely execute a function that might fail
 * @template T
 * @param {() => T} fn - Function to execute
 * @param {T} [defaultValue] - Default value on error
 * @returns {T|undefined} Result or default
 */
export function safeExecute(fn, defaultValue = undefined) {
  try {
    return fn();
  } catch {
    return defaultValue;
  }
}
