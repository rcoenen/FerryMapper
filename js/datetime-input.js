// Date/time input normalization, formatting, and date-picker modal display

import { state } from './state.js';
import { formatTime } from './time-utils.js';

export function applyDateTimeInputMode() {
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  restoreNativeInputs();
  dateInput.type = 'date';
  timeInput.type = 'time';
  timeInput.step = '60';
  dateInput.placeholder = '';
  timeInput.placeholder = '';
  dateInput.removeAttribute('inputmode');
  timeInput.removeAttribute('inputmode');
  dateInput.removeAttribute('autocapitalize');
  timeInput.removeAttribute('autocapitalize');
  dateInput.removeAttribute('autocomplete');
  timeInput.removeAttribute('autocomplete');
  dateInput.removeAttribute('spellcheck');
  timeInput.removeAttribute('spellcheck');
  const locale = state.use12h ? 'en-US' : 'en-GB';
  dateInput.setAttribute('lang', locale);
  timeInput.setAttribute('lang', locale);
  document.body.classList.add('native-datetime-inputs');
  document.body.classList.remove('desktop-datetime-inputs');
}

export function syncLocaleFormatClass() {
  document.body.classList.toggle('us-format', !!state.use12h);
  document.body.classList.toggle('eu-format', !state.use12h);
}

export function normalizeDateValue(raw) {
  const v = String(raw || '').trim();
  if (!v) return '';
  let y, m, d;
  let hit = v.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (hit) {
    y = Number(hit[1]); m = Number(hit[2]); d = Number(hit[3]);
  } else {
    hit = v.match(/^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/);
    if (!hit) return '';
    d = Number(hit[1]); m = Number(hit[2]); y = Number(hit[3]);
  }
  const dt = new Date(y, m - 1, d);
  if (dt.getFullYear() !== y || (dt.getMonth() + 1) !== m || dt.getDate() !== d) return '';
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
}

export function normalizeTimeValue(raw) {
  const v = String(raw || '').trim().toUpperCase();
  if (!v) return '';
  const hit = v.match(/^(\d{1,2}):(\d{2})(?:\s*([AP]M))?$/);
  if (!hit) return '';
  let h = Number(hit[1]);
  const m = Number(hit[2]);
  const ap = hit[3] || '';
  if (!Number.isFinite(h) || !Number.isFinite(m) || m < 0 || m > 59) return '';
  if (ap) {
    if (h < 1 || h > 12) return '';
    if (ap === 'AM') h = h % 12;
    if (ap === 'PM') h = (h % 12) + 12;
  } else if (h < 0 || h > 23) {
    return '';
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
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

export function formatDateForDisplay(dateStr) {
  if (!dateStr) return '';
  const dt = new Date(dateStr + 'T00:00:00');
  if (Number.isNaN(dt.getTime())) return dateStr;
  const locale = state.use12h ? 'en-US' : 'en-GB';
  return new Intl.DateTimeFormat(locale, {
    day: 'numeric',
    month: 'short'
  }).format(dt);
}

export function syncDateTimeButton() {
  const datePickerBtn = document.getElementById('date-picker-btn');
  if (!datePickerBtn) return;
  const d = normalizeDateInput();
  const t = normalizeTimeInput();
  if (!d || !t) {
    datePickerBtn.textContent = 'Date & Time';
    return;
  }
  const [h, m] = t.split(':').map(Number);
  const mins = h * 60 + m;
  datePickerBtn.textContent = `${formatDateForDisplay(d)} ${formatTime(mins)}`;
}

export function restoreNativeInputs() {
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  if (timeInput.type === 'text') {
    const raw = timeInput.dataset.raw || '';
    timeInput.readOnly = false;
    timeInput.type = 'time';
    timeInput.step = '60';
    timeInput.value = raw;
  }
  if (dateInput.type === 'text') {
    const raw = dateInput.dataset.raw || '';
    dateInput.readOnly = false;
    dateInput.type = 'date';
    dateInput.value = raw;
  }
}

export function refreshModalDisplay() {
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  const dateModal = document.getElementById('date-modal');
  if (dateModal.hidden) return;
  if (document.activeElement !== timeInput) {
    const raw = timeInput.type === 'time' ? timeInput.value : (timeInput.dataset.raw || '');
    timeInput.dataset.raw = raw;
    timeInput.type = 'text';
    timeInput.readOnly = true;
    if (raw) {
      const [h, m] = raw.split(':').map(Number);
      if (!isNaN(h) && !isNaN(m)) timeInput.value = formatTime(h * 60 + m);
    }
  }
  if (document.activeElement !== dateInput) {
    const raw = dateInput.type === 'date' ? dateInput.value : (dateInput.dataset.raw || '');
    dateInput.dataset.raw = raw;
    dateInput.type = 'text';
    dateInput.readOnly = true;
    if (raw) {
      const locale = state.use12h ? 'en-US' : 'en-GB';
      const dt = new Date(raw + 'T00:00:00');
      if (!isNaN(dt.getTime())) {
        dateInput.value = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short', year: 'numeric' }).format(dt);
      }
    }
  }
}

export function checkPastTime() {
  const dateInput = document.getElementById('date-input');
  normalizeDateInput();
  normalizeTimeInput();
  syncDateTimeButton();
  dateInput.style.color = '';
}
