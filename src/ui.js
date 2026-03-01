// UI Module - Handles DOM manipulation and user interface

export function initializeUIElements() {
  const elements = {
    dateInput: document.getElementById('date-input'),
    datePickerBtn: document.getElementById('date-picker-btn'),
    dateModal: document.getElementById('date-modal'),
    dateModalClose: document.getElementById('date-modal-close'),
    dateModalToday: document.getElementById('date-modal-today'),
    dateModalNow: document.getElementById('date-modal-now'),
    dateModalDone: document.getElementById('date-modal-done'),
    timeInput: document.getElementById('time-input'),
    goBtn: document.getElementById('go-btn'),
    fromSel: document.getElementById('from-select'),
    toSel: document.getElementById('to-select'),
    aboutTrigger: document.getElementById('about-trigger'),
    aboutModal: document.getElementById('about-modal'),
    aboutClose: document.getElementById('about-close'),
    nerdTrigger: document.getElementById('nerd-trigger'),
    nerdModal: document.getElementById('nerd-modal'),
    nerdClose: document.getElementById('nerd-close')
  };
  
  return elements;
}

export function applyDateTimeInputMode(use12h) {
  restoreNativeInputs();
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  
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
  
  const locale = use12h ? 'en-US' : 'en-GB';
  dateInput.setAttribute('lang', locale);
  timeInput.setAttribute('lang', locale);
  
  document.body.classList.add('native-datetime-inputs');
  document.body.classList.remove('desktop-datetime-inputs');
}

export function restoreNativeInputs() {
  // Reset input types if needed
  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  
  if (dateInput && timeInput) {
    dateInput.type = 'text';
    timeInput.type = 'text';
    document.body.classList.remove('native-datetime-inputs', 'desktop-datetime-inputs');
  }
}

export function syncLocaleFormatClass(use12h) {
  document.body.classList.toggle('us-format', !!use12h);
  document.body.classList.toggle('eu-format', !use12h);
}

export function syncModalBodyLock() {
  const aboutModal = document.getElementById('about-modal');
  const nerdModal = document.getElementById('nerd-modal');
  const dateModal = document.getElementById('date-modal');
  
  const hasOpenModal = !aboutModal.hidden || !nerdModal.hidden || !dateModal.hidden;
  document.body.classList.toggle('modal-open', hasOpenModal);
}

export function populateStopSelectors(stops, fromSel, toSel) {
  const sorted = [...stops].sort((a, b) => a.name.localeCompare(b.name));
  
  function populateSelect(selectElement) {
    selectElement.innerHTML = '';
    const defaultOption = document.createElement('option');
    defaultOption.value = '';
    defaultOption.textContent = 'Select a stop';
    selectElement.appendChild(defaultOption);
    
    sorted.forEach(stop => {
      const option = document.createElement('option');
      option.value = stop.id;
      option.textContent = stop.name;
      selectElement.appendChild(option);
    });
  }
  
  populateSelect(fromSel);
  populateSelect(toSel);
}