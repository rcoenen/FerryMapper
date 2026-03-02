// About, nerd, date-picker, and transfer-time modal management

import { restoreNativeInputs, refreshModalDisplay } from './datetime-input.js';
import { state, TRANSFER_TIME_KEY, setTransferTime, restoreDefaultTransferTime } from './state.js';

let aboutModal, aboutTrigger, aboutClose;
let nerdModal, nerdTrigger, nerdClose;
let dateModal, datePickerBtn, dateModalClose;
let transferModal, transferModalClose, transferModalInput, transferModalSave, transferModalReset;

function syncModalBodyLock() {
  const hasOpenModal = !aboutModal.hidden || !nerdModal.hidden || !dateModal.hidden || !transferModal.hidden;
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

export function openTransferModal() {
  transferModalInput.value = state.transferTime;
  transferModal.hidden = false;
  syncModalBodyLock();
  transferModalInput.focus();
  transferModalInput.select();
}

export function closeTransferModal({ restoreFocus = true } = {}) {
  if (transferModal.hidden) return;
  transferModal.hidden = true;
  syncModalBodyLock();
  if (restoreFocus) document.getElementById('transfer-time-row')?.focus();
}

function saveTransferTime() {
  const value = parseInt(transferModalInput.value);
  if (isNaN(value) || value < 1 || value > 60) return;
  setTransferTime(value);
  try { localStorage.setItem(TRANSFER_TIME_KEY, String(value)); } catch {}
  closeTransferModal();
}

function resetTransferTime() {
  restoreDefaultTransferTime();
  transferModalInput.value = state.transferTime;
  try { localStorage.setItem(TRANSFER_TIME_KEY, String(state.transferTime)); } catch {}
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
  transferModal = document.getElementById('transfer-modal');
  transferModalClose = document.getElementById('transfer-modal-close');
  transferModalInput = document.getElementById('transfer-modal-input');
  transferModalSave = document.getElementById('transfer-modal-save');
  transferModalReset = document.getElementById('transfer-modal-reset');

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

  // Transfer modal
  transferModalClose.addEventListener('click', closeTransferModal);
  transferModalSave.addEventListener('click', saveTransferTime);
  transferModalReset.addEventListener('click', resetTransferTime);
  transferModal.addEventListener('click', (e) => {
    if (e.target === transferModal) closeTransferModal();
  });
  transferModalInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') { e.preventDefault(); saveTransferTime(); }
  });
}
