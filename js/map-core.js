// Leaflet map initialization, markers, popups, and return-to-NYC overlay

import { stops, routes, stopById, routeById } from './data.js';
import { state, STYLE_STORAGE_KEY } from './state.js';
import { CONFIG } from './config.js';

export const DEFAULT_VIEW = { lat: 40.6989, lng: -73.9922, zoom: 13 };
export const MAP_STYLES = {
  positron: {
    url: 'https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20
  },
  darkMatter: {
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/">CARTO</a>',
    maxZoom: 20
  },
  osm: {
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }
};

export const LANDING_SIZE = 8;
export let map;
export let stopMarkers = {};
export let routeOutlines = {};
export let routePolylines = {};

function isLightColor(hex) {
  hex = hex.replace('#', '');
  if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
  const r = parseInt(hex.substring(0, 2), 16);
  const g = parseInt(hex.substring(2, 4), 16);
  const b = parseInt(hex.substring(4, 6), 16);
  return (r * 299 + g * 587 + b * 114) / 1000 > 160;
}

export function makePillIcon(label) {
  const w = label === 'Start' ? 52 : 44;
  return L.divIcon({
    className: '',
    html: `<div class="start-end-marker" style="pointer-events:none">${label}</div>`,
    iconSize: [w, 36],
    iconAnchor: [w / 2, 36]
  });
}

export function updatePreviewMarkers() {
  if (state.previewStartMarker) { state.previewStartMarker.remove(); state.previewStartMarker = null; }
  if (state.previewEndMarker) { state.previewEndMarker.remove(); state.previewEndMarker = null; }
  if (!state.lastSearch) {
    const fromId = document.getElementById('from-select').value;
    const toId = document.getElementById('to-select').value;
    const from = stopById[fromId];
    const to = stopById[toId];
    if (from) state.previewStartMarker = L.marker([from.lat, from.lng], { icon: makePillIcon('Start'), interactive: false }).addTo(map);
    if (to) state.previewEndMarker = L.marker([to.lat, to.lng], { icon: makePillIcon('End'), interactive: false }).addTo(map);
  }
}

export function initMap() {
  try { state.activeStyleKey = localStorage.getItem(STYLE_STORAGE_KEY) || 'positron'; } catch {}
  if (!MAP_STYLES[state.activeStyleKey]) state.activeStyleKey = 'positron';

  map = L.map('map', { minZoom: 11 }).setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
  state.currentTileLayer = L.tileLayer(MAP_STYLES[state.activeStyleKey].url, {
    attribution: MAP_STYLES[state.activeStyleKey].attribution,
    maxZoom: MAP_STYLES[state.activeStyleKey].maxZoom
  }).addTo(map);

  // Route outlines and lines
  routeOutlines = {};
  routePolylines = {};
  routes.forEach(r => {
    if (r.shape.length > 0) {
      routeOutlines[r.id] = L.polyline(r.shape, {
        color: '#fff', weight: 5, opacity: 0.35, interactive: false
      }).addTo(map);
      routePolylines[r.id] = L.polyline(r.shape, {
        color: r.color, weight: 3, opacity: 0.35, interactive: false
      }).addTo(map);
    }
  });

  // Easter egg
  L.marker([40.6892, -74.0445], {
    icon: L.divIcon({ html: '<div style="font-size:24px;line-height:1">\uD83D\uDDFD</div>', className: '', iconAnchor: [12, 24] }),
    zIndexOffset: -1
  }).addTo(map).bindPopup('Regular ferry to the Statue?<br>Not happening. That\'s <a href="https://www.cityexperiences.com/new-york/city-cruises/statue/" target="_blank" rel="noopener">Statue City Cruises</a>.<br><br>\u26A0\uFE0F Skip the scammers \u2014 buy tickets at the official desk only.');

  // Stop markers with popups
  stopMarkers = {};
  stops.forEach(s => {
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: LANDING_SIZE, fillColor: '#fff', fillOpacity: 1,
      color: '#333', weight: 1.5
    }).addTo(map);

    const routeTags = s.routes.map(rid => {
      const r = routeById[rid];
      const textColor = isLightColor(r.color) ? '#333' : '#fff';
      return `<span style="background:${r.color};color:${textColor}">${r.name}</span>`;
    }).join('');

    marker.bindPopup(`<strong>${s.name}</strong><div class="stop-popup-routes">${routeTags}</div><div class="popup-actions"><button class="popup-start" data-stop="${s.id}">Start</button><button class="popup-end" data-stop="${s.id}">End</button></div>`, { maxWidth: 280, minWidth: 240 });
    stopMarkers[s.id] = marker;
  });

  updatePreviewMarkers();

  // Popup drag handler: allow map panning by dragging the popup
  let popupDragCleanup = null;
  map.on('popupopen', () => {
    const wrapper = document.querySelector('.leaflet-popup-content-wrapper');
    if (wrapper) {
      let startX, startY, startCenter;
      const onStart = e => {
        if (e.target.closest('button')) return;
        startX = e.touches[0].clientX;
        startY = e.touches[0].clientY;
        startCenter = map.getCenter();
      };
      const onMove = e => {
        if (startX === undefined) return;
        const dx = e.touches[0].clientX - startX;
        const dy = e.touches[0].clientY - startY;
        const origin = map.latLngToContainerPoint(startCenter);
        map.panTo(map.containerPointToLatLng(L.point(origin.x - dx, origin.y - dy)), { animate: false });
      };
      const onEnd = () => { startX = undefined; };
      wrapper.addEventListener('touchstart', onStart, { passive: true });
      wrapper.addEventListener('touchmove', onMove, { passive: true });
      wrapper.addEventListener('touchend', onEnd, { passive: true });
      popupDragCleanup = () => {
        wrapper.removeEventListener('touchstart', onStart);
        wrapper.removeEventListener('touchmove', onMove);
        wrapper.removeEventListener('touchend', onEnd);
      };
    }
  });
  map.on('popupclose', () => { if (popupDragCleanup) { popupDragCleanup(); popupDragCleanup = null; } });

  // Return to NYC overlay
  const allLatLngs = stops.map(s => [s.lat, s.lng]);
  const stopsBounds = allLatLngs.length ? L.latLngBounds(allLatLngs) : null;

  const returnOverlay = document.createElement('div');
  returnOverlay.className = 'return-nyc-overlay';
  returnOverlay.innerHTML = '<div class="nyc-icon">\uD83D\uDDFD</div>' +
    '<div class="nyc-msg">Oy vey, you\'re outside NYC!</div>' +
    '<button class="nyc-back-btn" type="button">Take me back</button>';
  document.getElementById('map-overlay').appendChild(returnOverlay);

  const nycBounds = stopsBounds ? stopsBounds.pad(0.5) : null;

  function checkReturnOverlay() {
    if (!nycBounds) return;
    const visible = map.getBounds().intersects(nycBounds);
    returnOverlay.classList.toggle('visible', !visible);
  }

  map.on('moveend', checkReturnOverlay);

  returnOverlay.querySelector('.nyc-back-btn').addEventListener('click', () => {
    map.flyTo([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
  });
}
