// State Management Module - Handles localStorage and application state

export const STORAGE_KEY = 'ferryMapperNYC';

export function saveState(state) {
  try {
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state object');
    }
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('Failed to save state:', error);
    showUserError('Failed to save your preferences. Some features may not work correctly.');
  }
}

export function loadState() {
  try {
    const stateString = localStorage.getItem(STORAGE_KEY);
    if (!stateString) return null;
    
    const state = JSON.parse(stateString);
    if (!state || typeof state !== 'object') {
      throw new Error('Invalid state format');
    }
    return state;
  } catch (error) {
    console.error('Failed to load state:', error);
    localStorage.removeItem(STORAGE_KEY); // Clean up corrupted state
    return null;
  }
}

export const TIME_FMT_KEY = 'ferryMapperNYCTimeFmt';

export function getTimeFormatPreference() {
  try {
    const value = localStorage.getItem(TIME_FMT_KEY);
    if (value === null) return false;
    if (value !== '12' && value !== '24') {
      localStorage.setItem(TIME_FMT_KEY, '24'); // Reset to default if invalid
      return false;
    }
    return value === '12';
  } catch (error) {
    console.error('Failed to load time format preference:', error);
    return false;
  }
}

export function setTimeFormatPreference(use12h) {
  try {
    if (typeof use12h !== 'boolean') {
      throw new Error('Time format preference must be a boolean');
    }
    localStorage.setItem(TIME_FMT_KEY, use12h ? '12' : '24');
  } catch (error) {
    console.error('Failed to save time format preference:', error);
    showUserError('Failed to save your time format preference.');
  }
}

function showUserError(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'user-error-message';
  errorElement.style.position = 'fixed';
  errorElement.style.bottom = '20px';
  errorElement.style.right = '20px';
  errorElement.style.backgroundColor = '#ffebee';
  errorElement.style.padding = '10px 15px';
  errorElement.style.borderRadius = '4px';
  errorElement.style.boxShadow = '0 2px 4px rgba(0,0,0,0.2)';
  errorElement.style.zIndex = '1000';
  errorElement.textContent = message;
  
  document.body.appendChild(errorElement);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}