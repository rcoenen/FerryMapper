// Shared mutable application state and localStorage persistence

export const state = {
  // Route search
  lastSearch: null,
  currentOptions: [null, null, null],
  currentActiveIdx: 1,
  shiftCount: 0,

  // Preferences
  use12h: false,

  // Map visualization
  highlightLayers: [],
  previewStartMarker: null,
  previewEndMarker: null,

  // Map style
  activeStyleKey: 'positron',
  currentTileLayer: null,

  // Sheet
  currentSnap: 'peek',

  // Geolocation
  geoWatchId: null,
  geoMarker: null,
};

// Storage keys
export const STORAGE_KEY = 'ferryMapperNYC';
export const TIME_FMT_KEY = 'ferryMapperNYCTimeFmt';
export const STYLE_STORAGE_KEY = 'ferryMapperNYCStyle';
export const LOC_STORAGE_KEY = 'ferryMapperNYCLocation';

export function saveState() {
  const s = {
    date: document.getElementById('date-input').value,
    time: document.getElementById('time-input').value,
    mode: document.getElementById('time-mode').value,
  };
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(s)); } catch {}
}

export function loadState() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
}
