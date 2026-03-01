// Map Module - Handles Leaflet map integration

const MAP_STYLES = {
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

const DEFAULT_VIEW = { lat: 40.6989, lng: -73.9922, zoom: 13 };
const STYLE_STORAGE_KEY = 'ferryMapperNYCStyle';

export function initializeMap(stops, routes, stopById, routeById) {
  // Initialize Leaflet map
  const map = L.map('map', {
    minZoom: 11,
    zoomControl: false
  }).setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
  
  // Load saved map style or default to positron
  let activeStyleKey = 'positron';
  try {
    activeStyleKey = localStorage.getItem(STYLE_STORAGE_KEY) || 'positron';
  } catch (error) {
    console.error('Failed to load map style preference:', error);
  }
  
  if (!MAP_STYLES[activeStyleKey]) activeStyleKey = 'positron';
  
  // Add tile layer with selected style
  let currentTileLayer = L.tileLayer(MAP_STYLES[activeStyleKey].url, {
    attribution: MAP_STYLES[activeStyleKey].attribution,
    maxZoom: MAP_STYLES[activeStyleKey].maxZoom
  }).addTo(map);
  
  // Add zoom control to bottom right
  L.control.zoom({
    position: 'bottomright'
  }).addTo(map);
  
  // Store map reference for global access
  window.FERRY_MAP = map;
  
  // Store current tile layer for later style changes
  window.currentTileLayer = currentTileLayer;
  
  return map;
}

export function changeMapStyle(map, styleKey) {
  if (!MAP_STYLES[styleKey]) {
    console.error('Invalid map style:', styleKey);
    return;
  }
  
  // Remove current tile layer
  if (window.currentTileLayer) {
    map.removeLayer(window.currentTileLayer);
  }
  
  // Add new tile layer
  window.currentTileLayer = L.tileLayer(MAP_STYLES[styleKey].url, {
    attribution: MAP_STYLES[styleKey].attribution,
    maxZoom: MAP_STYLES[styleKey].maxZoom
  }).addTo(map);
  
  // Save preference
  try {
    localStorage.setItem(STYLE_STORAGE_KEY, styleKey);
  } catch (error) {
    console.error('Failed to save map style preference:', error);
  }
}

export function addStopMarkers(map, stops, stopById) {
  const markers = {};
  
  stops.forEach(stop => {
    if (stop.lat && stop.lng) {
      const marker = L.marker([stop.lat, stop.lng], {
        title: stop.name,
        alt: stop.name,
        riseOnHover: true
      }).addTo(map);
      
      marker.on('click', () => {
        console.log('Stop clicked:', stop.name);
        // Additional stop click handling can be added here
      });
      
      markers[stop.id] = marker;
    }
  });
  
  return markers;
}

export function addRoutePaths(map, routes, routeById) {
  const routeLayers = {};
  
  routes.forEach(route => {
    // This would be implemented with actual route path data
    // For now, just create a placeholder
    const routePath = L.polyline([], {
      color: getRouteColor(route.id),
      weight: 3,
      opacity: 0.7
    });
    
    routeLayers[route.id] = routePath;
  });
  
  return routeLayers;
}

export function getRouteColor(routeId) {
  // Simple hash-based color generation for routes
  const colors = [
    '#1976D2', '#D32F2F', '#388E3C', '#F57C00',
    '#7B1FA2', '#0288D1', '#5D4037', '#689F38'
  ];
  
  let hash = 0;
  for (let i = 0; i < routeId.length; i++) {
    hash = routeId.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  return colors[Math.abs(hash) % colors.length];
}

export function highlightRoute(map, routeId, routeLayers, stopMarkers) {
  // Clear previous highlights
  Object.values(routeLayers).forEach(layer => {
    if (layer.setStyle) {
      layer.setStyle({ weight: 3 });
    }
  });
  
  Object.values(stopMarkers).forEach(marker => {
    if (marker.setZIndexOffset) {
      marker.setZIndexOffset(0);
    }
  });
  
  // Highlight selected route
  if (routeLayers[routeId] && routeLayers[routeId].setStyle) {
    routeLayers[routeId].setStyle({ weight: 6 });
    routeLayers[routeId].bringToFront();
  }
  
  // Highlight stops on this route
  // This would be implemented with actual route-stop mapping
}

export function showRouteOnMap(map, routeResult, routeLayers, stopMarkers) {
  // Clear previous route display
  if (window.currentRouteLayer) {
    map.removeLayer(window.currentRouteLayer);
  }
  
  // Show the new route
  const routePath = L.polyline([], {
    color: '#FF5722',
    weight: 5,
    opacity: 0.9
  }).addTo(map);
  
  window.currentRouteLayer = routePath;
  
  // This would be enhanced with actual route path data
  console.log('Displaying route on map:', routeResult);
}

// User location tracking
export const LOC_STORAGE_KEY = 'ferryMapperNYCLocation';
let geoWatchId = null;
let geoMarker = null;

export function createGeoMarker(lat, lng, map) {
  // Create a blue pulse dot similar to Google Maps
  const icon = L.divIcon({
    className: 'google-maps-style-location',
    html: `<div class="gm-style-location">
      <div class="gm-style-pulse"></div>
      <div class="gm-style-dot"></div>
    </div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
    className: ''
  });
  return L.marker([lat, lng], { icon, interactive: false, zIndexOffset: 1000 }).addTo(map);
}

export function clearGeoLocation() {
  if (geoWatchId !== null) {
    navigator.geolocation.clearWatch(geoWatchId);
    geoWatchId = null;
  }
  if (geoMarker) {
    map.removeLayer(geoMarker);
    geoMarker = null;
  }
}

export function enableGeolocation(map) {
  if (!navigator.geolocation) {
    console.error('Geolocation is not supported by this browser');
    try { localStorage.removeItem(LOC_STORAGE_KEY); } catch (error) {
      console.error('Failed to remove location storage:', error);
    }
    return false;
  }
  
  geoWatchId = navigator.geolocation.watchPosition(
    (pos) => {
      const { latitude, longitude } = pos.coords;
      if (geoMarker) {
        geoMarker.setLatLng([latitude, longitude]);
      } else {
        geoMarker = createGeoMarker(latitude, longitude, map);
      }
    },
    (err) => {
      console.error('Geolocation error:', err);
      clearGeoLocation();
      try { localStorage.removeItem(LOC_STORAGE_KEY); } catch (error) {
        console.error('Failed to remove location storage:', error);
      }
      
      if (err.code === err.PERMISSION_DENIED) {
        alert('Location access was denied. To re-enable it, click the lock/settings icon in your browser\'s address bar and allow location access, then try again.');
      }
    },
    { enableHighAccuracy: true, maximumAge: 10000 }
  );
  
  return true;
}

export function stopLocationTracking() {
  if (watchId !== null) {
    navigator.geolocation.clearWatch(watchId);
    watchId = null;
  }
  clearUserLocation();
}

export function clearUserLocation() {
  if (userLocationMarker) {
    userLocationMarker.remove();
    userLocationMarker = null;
  }
  
  if (userLocationCircle) {
    userLocationCircle.remove();
    userLocationCircle = null;
  }
}

export function isLocationTrackingActive() {
  return watchId !== null;
}