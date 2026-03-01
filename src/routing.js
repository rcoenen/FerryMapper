// Routing Module - Handles route finding and schedule logic

export function findRoutes(fromId, toId, graph, schedules, services, dateStr, timeStr) {
  // This is a simplified version - the full implementation would include:
  // 1. BFS route finding with transfer penalties
  // 2. Schedule lookup for departure times
  // 3. Transfer time calculations
  // 4. Route optimization
  
  console.log('Finding routes from', fromId, 'to', toId, 'on', dateStr, 'at', timeStr);
  
  // Placeholder: return basic route info
  return {
    legs: [
      {
        from: fromId,
        to: toId,
        route: 'AST',
        departure: '08:00',
        arrival: '08:30',
        duration: 30
      }
    ],
    totalDuration: 30,
    transfers: 0
  };
}

export function formatTime(h, m, use12h = false) {
  if (use12h) {
    let ap = 'AM';
    if (h === 0) h = 12;
    else if (h === 12) ap = 'PM';
    else if (h > 12) {
      h -= 12;
      ap = 'PM';
    }
    return `${h}:${String(m).padStart(2, '0')} ${ap}`;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function normalizeDateValue(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length === 10 && s[4] === '-' && s[7] === '-') {
    const [y, m, d] = s.split('-').map(Number);
    if (y >= 2000 && y <= 2100 && m >= 1 && m <= 12 && d >= 1 && d <= 31) {
      return s;
    }
  }
  return '';
}

export function normalizeTimeValue(value) {
  if (!value) return '';
  const s = String(value).trim();
  if (s.length === 5 && s[2] === ':') {
    const [hStr, mStr] = s.split(':');
    const h = Number(hStr);
    const m = Number(mStr);
    if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
      return s;
    }
  }
  return '';
}

export function normalizeDateInput({ commit = false } = {}) {
  const dateInput = document.getElementById('date-input');
  const parsed = normalizeDateValue(dateInput.value);
  if (parsed) {
    dateInput.value = parsed;
    dateInput.setCustomValidity('');
    return parsed;
  }
  if (commit && String(dateInput.value || '').trim()) {
    dateInput.setCustomValidity('Use YYYY-MM-DD');
    dateInput.reportValidity();
  } else {
    dateInput.setCustomValidity('');
  }
  return '';
}

export function normalizeTimeInput({ commit = false } = {}) {
  const timeInput = document.getElementById('time-input');
  const parsed = normalizeTimeValue(timeInput.value);
  if (parsed) {
    timeInput.value = parsed;
    timeInput.setCustomValidity('');
    return parsed;
  }
  if (commit && String(timeInput.value || '').trim()) {
    timeInput.setCustomValidity('Use HH:MM');
    timeInput.reportValidity();
  } else {
    timeInput.setCustomValidity('');
  }
  return '';
}

export function checkPastTime(dateStr, timeStr) {
  const now = new Date();
  const selected = new Date(`${dateStr}T${timeStr}:00`);
  return selected < now;
}

export function formatDateForDisplay(dateStr, use12h) {
  if (!dateStr) return '';
  const dt = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(dt.getTime())) return dateStr;
  
  const locale = use12h ? 'en-US' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  }).format(dt);
}