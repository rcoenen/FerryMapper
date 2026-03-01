// Main Application Module - Entry point and coordination
import { loadFerryData, createDataLookup } from './data.js';
import { 
  STORAGE_KEY, 
  saveState, 
  loadState,
  TIME_FMT_KEY,
  getTimeFormatPreference,
  setTimeFormatPreference 
} from './state.js';
import { LOC_STORAGE_KEY } from './map.js';
import { 
  initializeUIElements,
  applyDateTimeInputMode,
  syncLocaleFormatClass,
  syncModalBodyLock,
  populateStopSelectors 
} from './ui.js';
import { 
  sanitizeInput,
  validateDateInput,
  validateTimeInput,
  showErrorMessage,
  showSuccessMessage,
  debounce,
  throttle 
} from './utils.js';
import { 
  findRoutes,
  formatTime,
  normalizeDateInput,
  normalizeTimeInput,
  checkPastTime,
  formatDateForDisplay 
} from './routing.js';
import { 
  initializeMap,
  addStopMarkers,
  addRoutePaths,
  highlightRoute,
  showRouteOnMap,
  changeMapStyle,
  enableGeolocation,
  clearGeoLocation 
} from './map.js';

(async function() {
  const DEBUG_MODE = !!window.FM_CONFIG?.debug;
  
  try {
    // --- Load data ---
    const data = await loadFerryData(DEBUG_MODE);
    const { stops, routes, graph, routeStopSequences, services, schedules } = data;
    const { stopById, routeById } = createDataLookup(data);
    
    // --- Initialize UI ---
    const uiElements = initializeUIElements();
    const { 
      dateInput, 
      timeInput, 
      goBtn, 
      fromSel, 
      toSel,
      aboutTrigger,
      aboutModal,
      aboutClose,
      nerdTrigger,
      nerdModal,
      nerdClose,
      dateModal,
      dateModalClose,
      dateModalToday,
      dateModalNow,
      dateModalDone
    } = uiElements;
    
    // --- Initialize Map ---
    const map = initializeMap(stops, routes, stopById, routeById);
    const stopMarkers = addStopMarkers(map, stops, stopById);
    const routeLayers = addRoutePaths(map, routes, routeById);
    
    // Restore location tracking state if it was enabled
    try {
      const locationEnabled = localStorage.getItem(LOC_STORAGE_KEY) === '1';
      if (locationEnabled) {
        const locationToggle = document.getElementById('location-toggle');
        if (locationToggle) {
          locationToggle.checked = true;
          enableGeolocation(map);
        }
      }
    } catch (error) {
      console.error('Failed to restore location state:', error);
    }
    
    // --- Initialize Settings Drawer ---
    const settingsToggle = document.getElementById('settings-toggle');
    const settingsDrawer = document.getElementById('settings-drawer');
    const mapStyleSelect = document.getElementById('map-style-select');
    
    // Initialize settings drawer state
    const initialExpanded = settingsToggle.getAttribute('aria-expanded') === 'true';
    settingsDrawer.hidden = !initialExpanded;
    
    // Set up settings toggle
    settingsToggle.addEventListener('click', () => {
      const isExpanded = settingsToggle.getAttribute('aria-expanded') === 'true';
      const newExpandedState = !isExpanded;
      
      settingsDrawer.hidden = !newExpandedState;
      settingsToggle.setAttribute('aria-expanded', String(newExpandedState));
    });
    
    // Set up map style changer
    mapStyleSelect.addEventListener('change', (e) => {
      changeMapStyle(map, e.target.value);
    });
    
    // Set up location toggle
    const locationToggle = document.getElementById('location-toggle');
    if (locationToggle) {
      locationToggle.addEventListener('change', (e) => {
        if (e.target.checked) {
          // Start location tracking
          const success = enableGeolocation(map);
          
          if (!success) {
            e.target.checked = false;
            showErrorMessage('Location services not available or denied');
          } else {
            try { 
              localStorage.setItem(LOC_STORAGE_KEY, '1'); 
            } catch (error) {
              console.error('Failed to save location preference:', error);
            }
          }
        } else {
          // Stop location tracking
          clearGeoLocation();
          try { 
            localStorage.removeItem(LOC_STORAGE_KEY); 
          } catch (error) {
            console.error('Failed to remove location preference:', error);
          }
        }
      });
    }
    
    // --- State management ---
    const savedState = loadState();
    const use12h = getTimeFormatPreference();
    
    // Apply UI settings
    applyDateTimeInputMode(use12h);
    syncLocaleFormatClass(use12h);
    
    // Populate stop selectors
    populateStopSelectors(stops, fromSel, toSel);
    
    // Restore saved state if available
    if (savedState) {
      dateInput.value = savedState.date || '';
      timeInput.value = savedState.time || '';
    }
    
    // --- Event listeners ---
    function saveCurrentState() {
      saveState({
        date: dateInput.value,
        time: timeInput.value,
        mode: document.getElementById('time-mode').value
      });
    }
    
    // Route finding with debounce
    const findRouteDebounced = debounce(async () => {
      try {
        const fromId = fromSel.value;
        const toId = toSel.value;
        const dateStr = normalizeDateInput({ commit: true });
        const timeStr = normalizeTimeInput({ commit: true });
        
        if (!fromId || !toId || !dateStr || !timeStr) {
          showErrorMessage('Please select valid stops, date, and time');
          return;
        }
        
        if (checkPastTime(dateStr, timeStr)) {
          showErrorMessage('Selected time is in the past');
          return;
        }
        
        const routeResult = findRoutes(fromId, toId, graph, schedules, services, dateStr, timeStr);
        
        if (routeResult.legs.length > 0) {
          showSuccessMessage(`Found route: ${routeResult.totalDuration} minutes, ${routeResult.transfers} transfers`);
          console.log('Route found:', routeResult);
          
          // Show route on map
          showRouteOnMap(map, routeResult, routeLayers, stopMarkers);
          
          // Highlight the route
          const routeId = routeResult.legs[0].route;
          highlightRoute(map, routeId, routeLayers, stopMarkers);
          
        } else {
          showErrorMessage('No routes found for the selected time');
        }
        
      } catch (error) {
        console.error('Route finding error:', error);
        showErrorMessage('Failed to find route. Please try again.');
      }
    }, 300);
    
    // Set up event listeners
    goBtn.addEventListener('click', findRouteDebounced);
    
    // Date/time modal handlers
    dateModalToday.addEventListener('click', () => {
      const now = new Date();
      dateInput.value = now.toISOString().slice(0, 10);
      saveCurrentState();
    });
    
    dateModalNow.addEventListener('click', () => {
      const now = new Date();
      dateInput.value = now.toISOString().slice(0, 10);
      timeInput.value = now.toTimeString().slice(0, 5);
      saveCurrentState();
    });
    
    dateModalDone.addEventListener('click', () => {
      const d = normalizeDateInput({ commit: true });
      const t = normalizeTimeInput({ commit: true });
      if (d && t) {
        saveCurrentState();
      }
    });
    
    // Modal close handlers
    dateModalClose.addEventListener('click', () => {
      dateModal.hidden = true;
      syncModalBodyLock();
    });
    
    aboutClose.addEventListener('click', () => {
      aboutModal.hidden = true;
      syncModalBodyLock();
    });
    
    nerdClose.addEventListener('click', () => {
      nerdModal.hidden = true;
      syncModalBodyLock();
    });
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        dateModal.hidden = true;
        aboutModal.hidden = true;
        nerdModal.hidden = true;
        syncModalBodyLock();
      }
    });
    
    console.log('FerryMapper initialized successfully');
    
    // Export key variables to window for debugging/nerd mode
    window.FERRY_DATA = {
      stops,
      routes,
      graph,
      stopById,
      routeById,
      schedules,
      services,
      routeStopSequences
    };
    
  } catch (error) {
    console.error('Application initialization failed:', error);
    showErrorMessage('Failed to initialize the application. Please refresh the page.');
  }
  
})();