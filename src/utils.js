// Utilities Module - Common helper functions

export function sanitizeInput(input) {
  if (typeof input !== 'string') {
    return '';
  }
  
  // Basic sanitization to prevent XSS
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

export function validateDateInput(dateString) {
  if (!dateString) return false;
  
  const date = new Date(dateString);
  return !isNaN(date.getTime());
}

export function validateTimeInput(timeString) {
  if (!timeString) return false;
  
  // Basic time validation (HH:MM or HH:MM:SS format)
  const timeRegex = /^([01]?[0-9]|2[0-3]):([0-5][0-9])(?::([0-5][0-9]))?$/;
  return timeRegex.test(timeString);
}

export function showErrorMessage(message) {
  const errorElement = document.createElement('div');
  errorElement.className = 'error-message';
  errorElement.style.color = '#d32f2f';
  errorElement.style.backgroundColor = '#ffebee';
  errorElement.style.padding = '10px 15px';
  errorElement.style.borderRadius = '4px';
  errorElement.style.margin = '10px 0';
  errorElement.style.display = 'inline-block';
  errorElement.textContent = message;
  
  const container = document.querySelector('.error-container') || document.body;
  container.prepend(errorElement);
  
  // Auto-dismiss after 5 seconds
  setTimeout(() => {
    errorElement.remove();
  }, 5000);
}

export function showSuccessMessage(message) {
  const successElement = document.createElement('div');
  successElement.className = 'success-message';
  successElement.style.color = '#388e3c';
  successElement.style.backgroundColor = '#e8f5e9';
  successElement.style.padding = '10px 15px';
  successElement.style.borderRadius = '4px';
  successElement.style.margin = '10px 0';
  successElement.style.display = 'inline-block';
  successElement.textContent = message;
  
  const container = document.querySelector('.success-container') || document.body;
  container.prepend(successElement);
  
  // Auto-dismiss after 3 seconds
  setTimeout(() => {
    successElement.remove();
  }, 3000);
}

export function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export function throttle(func, limit) {
  let lastFunc;
  let lastRan;
  return function() {
    const context = this;
    const args = arguments;
    if (!lastRan) {
      func.apply(context, args);
      lastRan = Date.now();
    } else {
      clearTimeout(lastFunc);
      lastFunc = setTimeout(function() {
        if ((Date.now() - lastRan) >= limit) {
          func.apply(context, args);
          lastRan = Date.now();
        }
      }, limit - (Date.now() - lastRan));
    }
  };
}