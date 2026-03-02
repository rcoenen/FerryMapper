// Mobile bottom sheet (drag, snap, resize) and map overlay

import { state, setSheetSnapState } from './state.js';
import { map } from './map-core.js';
import { CONFIG } from './config.js';

const snaps = ['full', 'peek', 'collapsed'];

let sheet, handle, mapOverlay, mapCloseBtn;

export function isMobile() { return window.innerWidth <= CONFIG.SHEET_BREAKPOINT_PX; }

export function setSheetSnap(snap) {
  setSheetSnapState(snap);
  sheet.classList.remove('snap-collapsed', 'snap-peek', 'snap-full');
  sheet.classList.add('snap-' + snap);
  setTimeout(() => map.invalidateSize(), 320);
}

export function openMapOverlay() {
  mapOverlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  setTimeout(() => {
    map.invalidateSize();
    if (state.highlightLayers.length) {
      const bounds = [];
      state.highlightLayers.forEach(l => {
        if (l.getBounds) bounds.push(l.getBounds());
        else if (l.getLatLng) bounds.push(l.getLatLng());
      });
      if (bounds.length) {
        const group = L.featureGroup(state.highlightLayers);
        map.fitBounds(group.getBounds(), { padding: [50, 50] });
      }
    }
  }, 50);
}

export function closeMapOverlay() {
  if (!mapOverlay.classList.contains('open')) return;
  mapOverlay.classList.remove('open');
  document.body.style.overflow = '';
  setTimeout(() => map.invalidateSize(), 50);
}

function initSheetPosition() {
  if (isMobile()) {
    closeMapOverlay();
    sheet.classList.remove('snap-collapsed', 'snap-peek', 'snap-full');
    sheet.style.transform = '';
    setSheetSnap('peek');
  } else {
    sheet.classList.remove('snap-collapsed', 'snap-peek', 'snap-full');
    sheet.style.transform = '';
    mapOverlay.classList.remove('open');
    document.body.style.overflow = '';
  }
}

export function initSheet() {
  sheet = document.getElementById('bottom-sheet');
  handle = document.getElementById('sheet-handle');
  mapOverlay = document.getElementById('map-overlay');
  mapCloseBtn = document.getElementById('map-close');

  if (isMobile()) sheet.classList.add('snap-peek');
  initSheetPosition();

  mapCloseBtn.addEventListener('click', closeMapOverlay);

  // Resize handler
  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initSheetPosition();
      map.invalidateSize();
    }, 150);
  });

  // Pointer drag on handle with velocity tracking
  let dragStartY = 0;
  let dragStartTranslate = 0;
  let isDragging = false;
  let lastTouchY = 0;
  let lastTouchTime = 0;
  let dragDistance = 0;
  let velocity = 0;
  let activePointerId = null;

  function getSheetTranslateY() {
    const style = window.getComputedStyle(sheet);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m42;
  }

  function startDrag(clientY) {
    isDragging = true;
    dragStartY = clientY;
    dragStartTranslate = getSheetTranslateY();
    lastTouchY = dragStartY;
    lastTouchTime = Date.now();
    dragDistance = 0;
    velocity = 0;
    sheet.classList.add('dragging');
    handle.classList.add('pressed');
  }

  function moveDrag(clientY) {
    const now = Date.now();
    const dt = now - lastTouchTime;
    if (dt > 0) velocity = (clientY - lastTouchY) / dt;
    lastTouchY = clientY;
    lastTouchTime = now;
    const dy = clientY - dragStartY;
    dragDistance = Math.max(dragDistance, Math.abs(dy));
    let newY = dragStartTranslate + dy;
    const maxY = sheet.offsetHeight - 52;
    if (newY < 0) newY = newY * 0.3;
    sheet.style.transform = `translateY(${Math.min(newY, maxY)}px)`;
  }

  function endDrag() {
    if (!isDragging) return;
    isDragging = false;
    sheet.classList.remove('dragging');
    handle.classList.remove('pressed');

    if (getSheetTranslateY() < 0) {
      sheet.style.transform = '';
      setSheetSnap('full');
      return;
    }

    if (Math.abs(velocity) > CONFIG.FLICK_VELOCITY_THRESHOLD) {
      sheet.style.transform = '';
      const dir = velocity > 0 ? 1 : -1;
      const currentIdx = snaps.indexOf(state.currentSnap);
      const nextIdx = Math.max(0, Math.min(snaps.length - 1, currentIdx + dir));
      setSheetSnap(snaps[nextIdx]);
      return;
    }

    const translateY = getSheetTranslateY();
    const threshold = sheet.offsetHeight * (CONFIG.DRAG_TOGGLE_PERCENT / 100);
    sheet.style.transform = '';
    setSheetSnap(translateY > threshold ? 'collapsed' : 'peek');
  }

  handle.addEventListener('pointerdown', (e) => {
    if (!isMobile()) return;
    activePointerId = e.pointerId;
    handle.setPointerCapture?.(activePointerId);
    startDrag(e.clientY);
  });

  document.addEventListener('pointermove', (e) => {
    if (!isDragging) return;
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    moveDrag(e.clientY);
  });

  document.addEventListener('pointerup', (e) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    endDrag();
    activePointerId = null;
  });

  document.addEventListener('pointercancel', (e) => {
    if (activePointerId !== null && e.pointerId !== activePointerId) return;
    endDrag();
    activePointerId = null;
  });

  function toggleSheetFromHandle() {
    if (!isMobile()) return;
    sheet.style.transform = '';
    setSheetSnap(state.currentSnap === 'collapsed' ? 'peek' : 'collapsed');
  }

  handle.addEventListener('click', () => {
    if (dragDistance > 6) return;
    toggleSheetFromHandle();
  });
}
