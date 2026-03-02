// About, nerd, and date-picker modal management

import { restoreNativeInputs, refreshModalDisplay } from './datetime-input.js';

let aboutModal, aboutTrigger, aboutClose;
let nerdModal, nerdTrigger, nerdClose;
let dateModal, datePickerBtn, dateModalClose;

function syncModalBodyLock() {
  const hasOpenModal = !aboutModal.hidden || !nerdModal.hidden || !dateModal.hidden;
  document.body.classList.toggle('modal-open', hasOpenModal);
}

export function openAboutModal() {
  closeNerdModal({ restoreFocus: false });
  aboutModal.hidden = false;
  syncModalBodyLock();
  aboutTrigger.setAttribute('aria-expanded', 'true');
  aboutClose.focus();
}

export function closeAboutModal({ restoreFocus = true } = {}) {
  if (aboutModal.hidden) return;
  aboutModal.hidden = true;
  syncModalBodyLock();
  aboutTrigger.setAttribute('aria-expanded', 'false');
  if (restoreFocus) aboutTrigger.focus();
}

export function openNerdModal() {
  closeAboutModal({ restoreFocus: false });
  nerdModal.hidden = false;
  syncModalBodyLock();
  nerdClose.focus();
}

export function closeNerdModal({ restoreFocus = true } = {}) {
  if (nerdModal.hidden) return;
  nerdModal.hidden = true;
  syncModalBodyLock();
  if (restoreFocus) aboutTrigger.focus();
}

export function openDateModal() {
  dateModal.hidden = false;
  syncModalBodyLock();
  refreshModalDisplay();
}

export function closeDateModal({ restoreFocus = true } = {}) {
  if (dateModal.hidden) return;
  restoreNativeInputs();
  dateModal.hidden = true;
  syncModalBodyLock();
  if (restoreFocus) datePickerBtn.focus();
}

export function initModals() {
  aboutModal = document.getElementById('about-modal');
  aboutTrigger = document.getElementById('about-trigger');
  aboutClose = document.getElementById('about-close');
  nerdModal = document.getElementById('nerd-modal');
  nerdTrigger = document.getElementById('nerd-trigger');
  nerdClose = document.getElementById('nerd-close');
  dateModal = document.getElementById('date-modal');
  datePickerBtn = document.getElementById('date-picker-btn');
  dateModalClose = document.getElementById('date-modal-close');

  aboutTrigger.setAttribute('aria-expanded', 'false');
  aboutTrigger.addEventListener('click', openAboutModal);
  aboutClose.addEventListener('click', closeAboutModal);
  nerdTrigger.addEventListener('click', () => {
    if (confirm('You sure?')) openNerdModal();
  });
  nerdClose.addEventListener('click', closeNerdModal);
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) closeAboutModal();
  });
  nerdModal.addEventListener('click', (e) => {
    if (e.target === nerdModal) closeNerdModal();
  });
  dateModal.addEventListener('click', (e) => {
    if (e.target === dateModal) closeDateModal();
  });
  datePickerBtn.addEventListener('click', openDateModal);
  dateModalClose.addEventListener('click', closeDateModal);
}
