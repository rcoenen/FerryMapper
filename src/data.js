// Data Module - Handles data loading and processing

export async function loadFerryData(debugMode = false) {
  try {
    const dataUrl = 'data/ferry-data.json' + (debugMode ? ('?ts=' + Date.now()) : '');
    const res = await fetch(dataUrl, debugMode ? { cache: 'no-store' } : undefined);
    
    if (!res.ok) {
      throw new Error(`HTTP error! status: ${res.status}`);
    }
    
    const data = await res.json();
    return processFerryData(data);
  } catch (error) {
    console.error('Failed to load ferry data:', error);
    // Show user-friendly error message
    const errorElement = document.createElement('div');
    errorElement.className = 'error-message';
    errorElement.textContent = 'Failed to load ferry data. Please try refreshing the page.';
    document.body.prepend(errorElement);
    throw error;
  }
}

export function processFerryData(data) {
  // Filter out shuttle bus routes (RES/RWS) and their stops
  const shuttleRouteIds = new Set(['RES', 'RWS']);
  const keepStopName = 'Beach Channel Dr/Beach 108th Street';
  
  data.routes = data.routes.filter(r => !shuttleRouteIds.has(r.id));
  data.schedules = data.schedules.filter(s => !shuttleRouteIds.has(s.r));
  
  // Remove shuttle route edges from graph
  for (const stopId in data.graph) {
    data.graph[stopId] = data.graph[stopId].filter(e => !shuttleRouteIds.has(e.route));
  }
  
  // Remove shuttle route refs from stops, then drop stops with no routes (except the ferry terminal)
  data.stops.forEach(s => { 
    s.routes = s.routes.filter(r => !shuttleRouteIds.has(r)); 
  });
  data.stops = data.stops.filter(s => s.routes.length > 0 || s.name === keepStopName);
  
  // Clean up empty graph entries
  for (const stopId in data.graph) {
    if (data.graph[stopId].length === 0) delete data.graph[stopId];
  }
  
  return data;
}

export function createDataLookup(data) {
  const stopById = {};
  data.stops.forEach(s => stopById[s.id] = s);
  
  const routeById = {};
  data.routes.forEach(r => routeById[r.id] = r);
  
  return { stopById, routeById };
}