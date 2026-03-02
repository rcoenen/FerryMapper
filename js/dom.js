// FerryMapperNYC - Centralized DOM element references
// This module provides a single source of truth for all DOM access

/** @type {Object<string, Element|null>} */
let elements = {};

/**
 * Initialize all DOM element references
 * Call this once at app startup
 * @returns {Object<string, Element|null>} All cached elements
 */
export function initDOM() {
  const ids = [
    // Form controls
    'date-input',
    'time-input',
    'time-mode',
    'from-select',
    'to-select',
    'go-btn',
    
    // Layout containers
    'route-actions',
    'directions',
    'map-overlay',
    'bottom-sheet',
    'sheet-handle',
    'settings-drawer',
    
    // Action buttons
    'swap-btn',
    'clear-route-btn',
    'show-map-btn',
    'share-route-btn',
    'settings-toggle',
    
    // Modal triggers
    'about-trigger',
    'nerd-trigger',
    
    // Date modal buttons
    'date-modal-today',
    'date-modal-now',
    'date-modal-done',
    
    // Modals
    'about-modal',
    'nerd-modal',
    'date-modal',
  ];
  
  elements = {};
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!el) {
      console.warn(`DOM element not found: #${id}`);
    }
    elements[id] = el;
  }
  
  // Cache common containers/selectors
  elements.controlsContainer = document.querySelector('.controls');
  elements.controlFields = document.querySelectorAll('.control-field');
  elements.optionTabs = document.querySelectorAll('.option-tab');
  
  return elements;
}

/**
 * Get a cached DOM element by ID
 * @param {string} id - The element ID
 * @returns {Element|null} The element or null if not found
 */
export function getEl(id) {
  if (elements[id] === undefined) {
    console.error(`DOM access before init or missing: #${id}`);
    return document.getElementById(id);
  }
  return elements[id];
}

/**
 * Get multiple elements by selector
 * @param {string} selector - CSS selector
 * @returns {NodeListOf<Element>} Elements
 */
export function getAll(selector) {
  return document.querySelectorAll(selector);
}

/**
 * Get a single element by selector
 * @param {string} selector - CSS selector
 * @returns {Element|null} First matching element
 */
export function getOne(selector) {
  return document.querySelector(selector);
}
