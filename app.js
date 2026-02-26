(async function() {
  // --- Load data ---
  const res = await fetch('data/ferry-data.json');
  const data = await res.json();

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
  data.stops.forEach(s => { s.routes = s.routes.filter(r => !shuttleRouteIds.has(r)); });
  data.stops = data.stops.filter(s => s.routes.length > 0 || s.name === keepStopName);
  // Clean up empty graph entries
  for (const stopId in data.graph) {
    if (data.graph[stopId].length === 0) delete data.graph[stopId];
  }

  const { stops, routes, graph, routeStopSequences, services, schedules } = data;

  const stopById = {};
  stops.forEach(s => stopById[s.id] = s);
  const routeById = {};
  routes.forEach(r => routeById[r.id] = r);

  // --- Persist/restore state via localStorage ---
  const STORAGE_KEY = 'ferryMapper';
  function saveState() {
    const state = {
      from: fromSel.value,
      to: toSel.value,
      date: dateInput.value,
      time: timeInput.value,
      mode: document.getElementById('time-mode').value
    };
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch {}
  }
  function loadState() {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY)); } catch { return null; }
  }

  const dateInput = document.getElementById('date-input');
  const timeInput = document.getElementById('time-input');
  const fromSel = document.getElementById('from-select');
  const toSel = document.getElementById('to-select');
  const aboutTrigger = document.getElementById('about-trigger');
  const aboutModal = document.getElementById('about-modal');
  const aboutClose = document.getElementById('about-close');
  const sorted = [...stops].sort((a, b) => a.name.localeCompare(b.name));

  function openAboutModal() {
    aboutModal.hidden = false;
    document.body.classList.add('modal-open');
    aboutTrigger.setAttribute('aria-expanded', 'true');
    aboutClose.focus();
  }

  function closeAboutModal() {
    if (aboutModal.hidden) return;
    aboutModal.hidden = true;
    document.body.classList.remove('modal-open');
    aboutTrigger.setAttribute('aria-expanded', 'false');
    aboutTrigger.focus();
  }

  aboutTrigger.setAttribute('aria-expanded', 'false');
  aboutTrigger.addEventListener('click', openAboutModal);
  aboutClose.addEventListener('click', closeAboutModal);
  aboutModal.addEventListener('click', (e) => {
    if (e.target === aboutModal) closeAboutModal();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeAboutModal();
  });

  function populateSelect(sel) {
    sel.innerHTML = '<option value="">-- Select a stop --</option>';
    sorted.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  }
  populateSelect(fromSel);
  populateSelect(toSel);

  // Hydrate from saved state or default to now
  const saved = loadState();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTime = now.toTimeString().slice(0, 5);

  if (saved && saved.date >= todayStr) {
    dateInput.value = saved.date;
    timeInput.value = saved.time || nowTime;
    if (saved.from) fromSel.value = saved.from;
    if (saved.to) toSel.value = saved.to;
    if (saved.mode) document.getElementById('time-mode').value = saved.mode;
  } else {
    dateInput.value = todayStr;
    timeInput.value = nowTime;
  }

  // Save on any change
  for (const el of [fromSel, toSel, dateInput, timeInput, document.getElementById('time-mode')]) {
    el.addEventListener('change', saveState);
  }

  // Swap button
  document.getElementById('swap-btn').addEventListener('click', () => {
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
    saveState();
  });

  // --- Schedule helpers ---
  // Convert "HH:MM:SS" to minutes since midnight (GTFS allows >24:00 for overnight)
  function timeToMin(t) {
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
  }

  // Format minutes to "h:mm AM/PM"
  function formatTime(mins) {
    const h = Math.floor(mins / 60) % 24;
    const m = mins % 60;
    return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
  }

  // Format duration in minutes to human-readable
  function formatDuration(mins) {
    if (mins < 1) return 'less than a minute';
    const h = Math.floor(mins / 60);
    const m = Math.round(mins % 60);
    if (h === 0) return m + ' min';
    if (m === 0) return h + ' hr';
    return h + ' hr ' + m + ' min';
  }

  // Check if a service runs on a given date string "YYYY-MM-DD"
  function serviceRunsOn(serviceId, dateStr) {
    const svc = services[serviceId];
    if (!svc) return false;
    const ds = dateStr.replace(/-/g, ''); // "YYYYMMDD"

    // Check removed exceptions
    if (svc.removed && svc.removed.includes(ds)) return false;
    // Check added exceptions
    if (svc.added && svc.added.includes(ds)) return true;

    // Check date range
    if (ds < svc.start || ds > svc.end) return false;
    // Check day of week (GTFS: mon=0 ... sun=6 in our array, JS: sun=0 ... sat=6)
    const d = new Date(dateStr);
    const jsDay = d.getDay(); // 0=Sun, 1=Mon ... 6=Sat
    const gtfsIdx = jsDay === 0 ? 6 : jsDay - 1; // convert to Mon=0 ... Sun=6
    return svc.days[gtfsIdx] === 1;
  }

  // Get active trips for a route on a given date, sorted by departure at a given stop
  function getTripsForRoute(routeId, dateStr) {
    return schedules.filter(t => t.r === routeId && serviceRunsOn(t.s, dateStr));
  }

  // Index schedules by route for faster lookups
  const schedulesByRoute = {};
  for (const trip of schedules) {
    if (!schedulesByRoute[trip.r]) schedulesByRoute[trip.r] = [];
    schedulesByRoute[trip.r].push(trip);
  }

  // Find next trip on a route that departs from boardStop at or after departMin,
  // and passes through alightStop AFTER boardStop
  function findNextTrip(routeId, boardStopId, alightStopId, dateStr, departMin) {
    const trips = (schedulesByRoute[routeId] || []).filter(t => serviceRunsOn(t.s, dateStr));
    let best = null;
    let bestDep = Infinity;

    for (const trip of trips) {
      const boardIdx = trip.stops.findIndex(s => s.id === boardStopId);
      const alightIdx = trip.stops.findIndex(s => s.id === alightStopId);
      if (boardIdx === -1 || alightIdx === -1 || alightIdx <= boardIdx) continue;

      const depTime = timeToMin(trip.stops[boardIdx].dep);
      if (depTime >= departMin && depTime < bestDep) {
        bestDep = depTime;
        best = {
          tripId: trip.t,
          routeId,
          boardIdx,
          alightIdx,
          depTime,
          arrTime: timeToMin(trip.stops[alightIdx].arr),
          stops: trip.stops.slice(boardIdx, alightIdx + 1),
          toward: stopById[trip.stops[trip.stops.length - 1].id]?.name || ''
        };
      }
    }
    return best;
  }

  // Find next trip across ALL routes that connect boardStop -> alightStop
  function findNextTripAnyRoute(boardStopId, alightStopId, dateStr, departMin) {
    const boardRoutes = stopById[boardStopId].routes;
    const alightRoutes = stopById[alightStopId].routes;
    // Only try routes that serve both stops
    const commonRoutes = boardRoutes.filter(r => alightRoutes.includes(r));

    let best = null;
    for (const rid of commonRoutes) {
      const candidate = findNextTrip(rid, boardStopId, alightStopId, dateStr, departMin);
      if (candidate && (!best || candidate.depTime < best.depTime)) {
        best = candidate;
      }
    }
    return best;
  }

  // --- Candidate Topology Router (k-shortest-ish topologies) ---
  const MAX_CANDIDATES = 3;

  // Single bounded-weight shortest-path run. penaltyStops adds +1 cost to transfers at those stops.
  // Transfer edges are in {1,2} and same-route moves are 0, so we can use a 0/1/2 BFS bucket queue.
  function bfsRoute(fromId, toId, penaltyStops) {
    const INF = Infinity;
    const dist = {};
    const prev = {};

    function key(stop, route) { return stop + '|' + (route || ''); }
    function getDist(stop, route) { return dist[key(stop, route)] ?? INF; }
    function setDist(stop, route, d) { dist[key(stop, route)] = d; }
    function setPrev(stop, route, pStop, pRoute) { prev[key(stop, route)] = { stop: pStop, route: pRoute }; }

    const MAX_EDGE_COST = 2;
    const BUCKET_COUNT = MAX_EDGE_COST + 1;
    const buckets = Array.from({ length: BUCKET_COUNT }, () => []);
    const bucketHeads = new Array(BUCKET_COUNT).fill(0);
    let pending = 0;
    let currentCost = 0;

    function pushState(state) {
      const idx = state.cost % BUCKET_COUNT;
      buckets[idx].push(state);
      pending++;
    }

    function popNext() {
      while (pending > 0) {
        const idx = currentCost % BUCKET_COUNT;
        if (bucketHeads[idx] < buckets[idx].length) {
          const state = buckets[idx][bucketHeads[idx]++];
          pending--;
          // Reset fully-drained bucket to avoid unbounded array growth over time.
          if (bucketHeads[idx] === buckets[idx].length) {
            buckets[idx] = [];
            bucketHeads[idx] = 0;
          }
          return state;
        }
        currentCost++;
      }
      return null;
    }

    setDist(fromId, null, 0);
    pushState({ stop: fromId, route: null, cost: 0 });

    while (pending > 0) {
      const cur = popNext();
      if (!cur) break;
      if (cur.cost > getDist(cur.stop, cur.route)) continue;

      if (cur.stop === toId) {
        return { legs: pathToLegs(reconstructSinglePath(prev, cur.stop, cur.route, fromId)), cost: cur.cost };
      }

      const stopData = stopById[cur.stop];
      for (const rid of stopData.routes) {
        let transferCost = (cur.route === null || cur.route === rid) ? 0 : 1;
        // Penalize transfers at previously-used hubs to find alternatives
        if (transferCost > 0 && penaltyStops.has(cur.stop)) transferCost += 1;
        const newCost = cur.cost + transferCost;
        if (newCost < getDist(cur.stop, rid)) {
          setDist(cur.stop, rid, newCost);
          setPrev(cur.stop, rid, cur.stop, cur.route);
          pushState({ stop: cur.stop, route: rid, cost: newCost });
        }
      }

      if (cur.route) {
        for (const edge of graph[cur.stop]) {
          if (edge.route === cur.route) {
            const newCost = cur.cost;
            if (newCost < getDist(edge.to, cur.route)) {
              setDist(edge.to, cur.route, newCost);
              setPrev(edge.to, cur.route, cur.stop, cur.route);
              pushState({ stop: edge.to, route: cur.route, cost: newCost });
            }
          }
        }
      }
    }
    return null;
  }

  function reconstructSinglePath(prev, endStop, endRoute, startStop) {
    const path = [];
    let stop = endStop, route = endRoute;
    while (stop !== startStop || route !== null) {
      path.unshift({ stop, route });
      const k = stop + '|' + (route || '');
      const p = prev[k];
      if (!p) break;
      stop = p.stop;
      route = p.route;
    }
    path.unshift({ stop: startStop, route: null });
    return path;
  }

  // Find up to MAX_CANDIDATES unique topologies by re-running BFS
  // with penalties on transfer stops from previous results
  function findRoutes(fromId, toId) {
    const results = [];
    const seen = new Set();
    const penaltyStops = new Set();

    for (let i = 0; i < MAX_CANDIDATES; i++) {
      const result = bfsRoute(fromId, toId, penaltyStops);
      if (!result) break;

      // Signature = transfer stops (where route changes)
      const sig = result.legs.map(l => l.route + ':' + l.stops[0]).join('|');
      if (seen.has(sig)) break; // No new topology found
      seen.add(sig);
      results.push(result.legs);

      // Penalize transfer stops from this result for next BFS run
      for (let j = 1; j < result.legs.length; j++) {
        penaltyStops.add(result.legs[j].stops[0]);
      }
    }

    return results.length > 0 ? results : null;
  }

  // Single-path findRoute for backward compat
  function findRoute(fromId, toId) {
    const routes = findRoutes(fromId, toId);
    return routes ? routes[0] : null;
  }

  function pathToLegs(path) {
    const legs = [];
    let currentLeg = null;

    for (const step of path) {
      if (step.route === null) continue;
      if (!currentLeg || currentLeg.route !== step.route) {
        if (currentLeg) legs.push(currentLeg);
        currentLeg = { route: step.route, stops: [] };
        const prevStep = path[path.indexOf(step) - 1];
        if (prevStep && !currentLeg.stops.includes(prevStep.stop)) {
          currentLeg.stops.push(prevStep.stop);
        }
      }
      if (!currentLeg.stops.includes(step.stop)) {
        currentLeg.stops.push(step.stop);
      }
    }
    if (currentLeg) legs.push(currentLeg);
    return legs;
  }

  // Expand a leg to show all intermediate stops along a route
  function expandLegStops(fromId, toId, routeId) {
    const visited = new Set([fromId]);
    const prev = {};
    const queue = [fromId];

    while (queue.length > 0) {
      const cur = queue.shift();
      if (cur === toId) {
        const path = [toId];
        let node = toId;
        while (node !== fromId) { node = prev[node]; path.unshift(node); }
        return path;
      }
      for (const edge of graph[cur]) {
        if (edge.route === routeId && !visited.has(edge.to)) {
          visited.add(edge.to);
          prev[edge.to] = cur;
          queue.push(edge.to);
        }
      }
    }
    return null;
  }

  // Resolve schedule times for a set of legs starting at a given time
  function resolveScheduleAt(legs, dateStr, startMin) {
    let currentMin = startMin;
    const resolved = [];

    for (let i = 0; i < legs.length; i++) {
      const leg = legs[i];
      const boardStop = leg.stops[0];
      const alightStop = leg.stops[leg.stops.length - 1];

      // Try all routes that connect these two stops, pick earliest departure
      const trip = findNextTripAnyRoute(boardStop, alightStop, dateStr, currentMin);
      if (!trip) {
        resolved.push({
          ...leg,
          depTime: null, arrTime: null, waitMin: null, rideMin: null, tripStops: null
        });
        for (let j = i + 1; j < legs.length; j++) {
          resolved.push({ ...legs[j], depTime: null, arrTime: null, waitMin: null, rideMin: null, tripStops: null });
        }
        return resolved;
      }
      // Update leg route if a different route departs sooner
      if (trip.routeId !== leg.route) {
        leg.route = trip.routeId;
      }

      const waitMin = trip.depTime - currentMin;

      resolved.push({
        ...leg,
        depTime: trip.depTime,
        arrTime: trip.arrTime,
        waitMin: i === 0 ? null : waitMin,
        rideMin: trip.arrTime - trip.depTime,
        tripStops: trip.stops,
        toward: trip.toward
      });

      // Add minimum transfer time (10 min) for connections — ferries don't wait
      const MIN_TRANSFER = 10;
      currentMin = trip.arrTime + (i < legs.length - 1 ? MIN_TRANSFER : 0);
    }
    return resolved;
  }

  // Helpers for resolved schedules
  function getArrival(r) { return r[r.length - 1].arrTime; }
  function getDeparture(r) { return r[0].depTime; }
  function getTotalTime(r) {
    const a = getArrival(r), d = getDeparture(r);
    return (a !== null && d !== null) ? a - d : null;
  }
  function getMaxWait(r) {
    let max = 0;
    for (const l of r) if (l.waitMin !== null && l.waitMin > max) max = l.waitMin;
    return max;
  }
  function isComplete(r) { return getArrival(r) !== null; }

  // Resolve best itinerary across multiple topologies for a given departure time
  function resolveBest(allLegs, dateStr, tryMin, mode) {
    let best = null;
    for (const legs of allLegs) {
      const c = resolveScheduleAt(legs, dateStr, tryMin);
      if (!isComplete(c)) continue;
      if (!best) { best = c; continue; }
      // Pick by mode: depart = earliest arrival; arrive = latest departure
      if (mode === 'arrive') {
        if (getDeparture(c) > getDeparture(best)) best = c;
        else if (getDeparture(c) === getDeparture(best) && getTotalTime(c) < getTotalTime(best)) best = c;
      } else {
        if (getArrival(c) < getArrival(best)) best = c;
        else if (getArrival(c) === getArrival(best) && getTotalTime(c) < getTotalTime(best)) best = c;
      }
    }
    return best || resolveScheduleAt(allLegs[0], dateStr, tryMin);
  }

  // Generate 3 options: earlier/faster, requested time, later/less wait
  function findOptions(allLegs, dateStr, startMin, mode) {
    // Collect many candidates across a wide time window
    const candidates = [];
    // For arrive-by, scan much further back since we need departures
    // that are early enough to still arrive by the target time
    const backRange = mode === 'arrive' ? 360 : 120;
    const fwdRange = mode === 'arrive' ? 120 : 180;

    for (let offset = -backRange; offset <= fwdRange; offset += 5) {
      const tryMin = startMin + offset;
      if (tryMin < 0 || tryMin >= 24 * 60) continue;
      const c = resolveBest(allLegs, dateStr, tryMin, mode);
      if (isComplete(c)) candidates.push(c);
    }

    if (candidates.length === 0) {
      const fallback = resolveBest(allLegs, dateStr, startMin, mode);
      return [null, fallback, null];
    }

    // Sort by departure time
    candidates.sort((a, b) => getDeparture(a) - getDeparture(b));

    // Deduplicate by departure time (same dep = same trip)
    const unique = [];
    for (const c of candidates) {
      const dep = getDeparture(c);
      if (unique.length === 0 || getDeparture(unique[unique.length - 1]) !== dep) {
        unique.push(c);
      }
    }

    if (mode === 'arrive') {
      // "Arrive by": baseline = latest departure that arrives <= startMin
      // Earlier = one before that, Later = first that departs after baseline
      const validArrivals = unique.filter(c => getArrival(c) <= startMin);
      const baseline = validArrivals.length > 0 ? validArrivals[validArrivals.length - 1] : null;

      if (!baseline) {
        // Nothing arrives in time, show earliest available
        return [null, unique[0], unique[1] || null];
      }

      const baseIdx = unique.indexOf(baseline);
      const earlier = baseIdx > 0 ? unique[baseIdx - 1] : null;
      const later = baseIdx < unique.length - 1 ? unique[baseIdx + 1] : null;
      return [earlier, baseline, later];
    }

    // "Depart at": baseline = first departure >= startMin
    const baseIdx = unique.findIndex(c => getDeparture(c) >= startMin);
    if (baseIdx === -1) {
      // Nothing departing after requested time
      const last = unique[unique.length - 1];
      const prev = unique.length > 1 ? unique[unique.length - 2] : null;
      return [prev, last, null];
    }

    const baseline = unique[baseIdx];

    // Earlier: best option departing before baseline that arrives sooner
    let earlier = null;
    for (let i = baseIdx - 1; i >= 0; i--) {
      if (getArrival(unique[i]) < getArrival(baseline)) {
        earlier = unique[i];
        break;
      }
    }

    // Later: next departure after baseline (less transfer wait typically)
    let later = baseIdx < unique.length - 1 ? unique[baseIdx + 1] : null;

    return [earlier, baseline, later];
  }

  // --- Initialize map ---
  const map = L.map('map', { minZoom: 10 }).setView([40.7128, -74.006], 11);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 18
  }).addTo(map);

  const routePolylines = {};
  routes.forEach(r => {
    if (r.shape.length > 0) {
      routePolylines[r.id] = L.polyline(r.shape, {
        color: r.color, weight: 3, opacity: 0.35, interactive: false
      }).addTo(map);
    }
  });

  const stopMarkers = {};
  stops.forEach(s => {
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 5, fillColor: '#fff', fillOpacity: 1,
      color: '#333', weight: 1.5
    }).addTo(map);

    const typeLabel = '';
    const routeTags = s.routes.map(rid => {
      const r = routeById[rid];
      const textColor = isLightColor(r.color) ? '#333' : '#fff';
      return `<span style="background:${r.color};color:${textColor}">${r.name}</span>`;
    }).join('');

    marker.bindPopup(`<strong>${s.name}</strong>${typeLabel}<div class="stop-popup-routes">${routeTags}</div><div class="popup-actions"><button class="popup-start" data-stop="${s.id}">Start</button><button class="popup-end" data-stop="${s.id}">End</button></div>`);
    stopMarkers[s.id] = marker;
  });

  map.on('popupopen', () => {
    document.querySelectorAll('.popup-start').forEach(btn => {
      btn.addEventListener('click', () => {
        fromSel.value = btn.dataset.stop;
        saveState();
        map.closePopup();
        if (fromSel.value && toSel.value) document.getElementById('go-btn').click();
      });
    });
    document.querySelectorAll('.popup-end').forEach(btn => {
      btn.addEventListener('click', () => {
        toSel.value = btn.dataset.stop;
        saveState();
        map.closePopup();
        if (fromSel.value && toSel.value) document.getElementById('go-btn').click();
      });
    });
  });

  const allLatLngs = stops.map(s => [s.lat, s.lng]);
  if (allLatLngs.length) map.fitBounds(allLatLngs, { padding: [30, 30] });

  // --- Highlight layers ---
  let highlightLayers = [];

  function clearHighlights() {
    highlightLayers.forEach(l => map.removeLayer(l));
    highlightLayers = [];
    for (const rid in routePolylines) routePolylines[rid].setStyle({ weight: 3, opacity: 0.35 });
    for (const sid in stopMarkers) stopMarkers[sid].setStyle({ radius: 5, color: '#333', weight: 1.5, fillColor: '#fff' });
  }

  function addChevronToSegment(pts, color) {
    // Place a single chevron at the midpoint of a shape segment
    const segs = [];
    let totalLen = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = L.latLng(pts[i]), b = L.latLng(pts[i + 1]);
      const len = a.distanceTo(b);
      segs.push({ a, b, len });
      totalLen += len;
    }
    if (totalLen < 800) return; // too short, skip
    let target = totalLen / 2;
    for (const seg of segs) {
      if (target <= seg.len) {
        const t = target / seg.len;
        const lat = seg.a.lat + t * (seg.b.lat - seg.a.lat);
        const lng = seg.a.lng + t * (seg.b.lng - seg.a.lng);
        const angle = Math.atan2(seg.b.lng - seg.a.lng, seg.b.lat - seg.a.lat) * 180 / Math.PI;
        const svg = `<svg width="12" height="12" viewBox="0 0 12 12" style="transform:rotate(${angle}deg)"><path d="M2 8L6 2L10 8" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const m = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: svg, iconSize: [12, 12], iconAnchor: [6, 6] }),
          interactive: false
        }).addTo(map);
        highlightLayers.push(m);
        return;
      }
      target -= seg.len;
    }
  }

  function showRoute(legs) {
    clearHighlights();
    for (const rid in routePolylines) routePolylines[rid].setStyle({ weight: 2, opacity: 0.15 });

    const bounds = [];

    legs.forEach(leg => {
      const route = routeById[leg.route];
      for (let i = 0; i + 1 < leg.stops.length; i++) {
        const fromStop = stopById[leg.stops[i]];
        const toStop = stopById[leg.stops[i + 1]];
        const segment = getShapeSegment(route, fromStop, toStop);
        const noTrips = leg.depTime === null;
        const line = L.polyline(segment, {
          color: route.color, weight: noTrips ? 4 : 6,
          opacity: noTrips ? 0.5 : 0.9,
          dashArray: noTrips ? '8 6' : null,
          interactive: false
        }).addTo(map);
        highlightLayers.push(line);
        segment.forEach(p => bounds.push(p));
        // One chevron per stop-to-stop segment (skipped if too short)
        addChevronToSegment(segment, route.color);
      }
      leg.stops.forEach(sid => {
        stopMarkers[sid].setStyle({ radius: 7, color: route.color, weight: 3, fillColor: '#fff' });
      });
    });

    // Keep stop nodes above route overlays so clicks reliably open the pier popup card.
    for (const sid in stopMarkers) stopMarkers[sid].bringToFront();

    // Fill origin and destination dots with their leg's route color
    const originId = legs[0].stops[0];
    const destId = legs[legs.length - 1].stops[legs[legs.length - 1].stops.length - 1];
    const originColor = routeById[legs[0].route].color;
    const destColor = routeById[legs[legs.length - 1].route].color;
    stopMarkers[originId].setStyle({ fillColor: originColor });
    stopMarkers[destId].setStyle({ fillColor: destColor });

    if (bounds.length) map.fitBounds(bounds, { padding: [50, 50] });
  }

  function getShapeSegment(route, fromStop, toStop) {
    if (!route.shape || route.shape.length < 2) {
      return [[fromStop.lat, fromStop.lng], [toStop.lat, toStop.lng]];
    }
    let fromIdx = nearestPointOnShape(route.shape, fromStop);
    let toIdx = nearestPointOnShape(route.shape, toStop);
    if (fromIdx === toIdx) return [[fromStop.lat, fromStop.lng], [toStop.lat, toStop.lng]];
    if (fromIdx < toIdx) {
      return route.shape.slice(fromIdx, toIdx + 1);
    }
    return route.shape.slice(toIdx, fromIdx + 1).reverse();
  }

  function nearestPointOnShape(shape, stop) {
    let minDist = Infinity, minIdx = 0;
    shape.forEach((p, i) => {
      const d = (p[0] - stop.lat) ** 2 + (p[1] - stop.lng) ** 2;
      if (d < minDist) { minDist = d; minIdx = i; }
    });
    return minIdx;
  }

  // --- Directions display ---
  let currentOptions = [null, null, null];
  let lastSearch = null; // { legs, dateStr, startMin, mode, fromId, toId }

  function renderLegs(resolvedLegs) {
    let html = '<div class="timeline">';
    const lastLegIdx = resolvedLegs.length - 1;

    resolvedLegs.forEach((leg, i) => {
      const route = routeById[leg.route];
      const boardStop = stopById[leg.stops[0]].name;
      const alightStop = stopById[leg.stops[leg.stops.length - 1]].name;
      const numStops = leg.stops.length - 1;
      const isFirst = i === 0;
      const isLast = i === lastLegIdx;

      // Transfer between legs
      if (i > 0) {
        let transferText = '\u23F1 Transfer';
        if (leg.waitMin !== null && leg.waitMin >= 0) {
          transferText += ` \u00B7 ${formatDuration(leg.waitMin)} wait`;
        }
        html += `<div class="tl-transfer"><div class="tl-transfer-info">${transferText}</div></div>`;
      }

      // Departure station
      const originClass = isFirst ? ' tl-origin' : '';
      const depTimeStr = leg.depTime !== null ? formatTime(leg.depTime) : '';
      const depDotFill = isFirst ? route.color : '#fff';
      html += `<div class="tl-station${originClass}">` +
        `<div class="tl-dot" style="border-color:${route.color};background:${depDotFill}"></div>` +
        `<div class="tl-station-name">${boardStop}</div>` +
        (depTimeStr ? `<div class="tl-station-time">${depTimeStr}</div>` : '') +
        `</div>`;

      // Leg connector with route info
      html += `<div class="tl-leg" style="color:${route.color}">`;
      html += `<div class="tl-route">` +
        `<span class="tl-route-badge" style="background:${route.color}">\u26F4 ${route.name}</span>` +
        (leg.toward && leg.toward !== alightStop ? `<br><span class="tl-route-dir">Direction: ${leg.toward}</span>` : '') +
        `</div>`;
      if (leg.depTime !== null) {
        html += `<div class="tl-stops-row">` +
          `<span class="tl-stops-count">${numStops} stop${numStops !== 1 ? 's' : ''}</span>` +
          `<span class="tl-leg-dur">${formatDuration(leg.rideMin)}</span>` +
          `</div>`;
      } else {
        html += `<div class="tl-no-trips">No more trips today</div>`;
      }
      html += `</div>`;

      // Arrival station
      const destClass = isLast ? ' tl-dest' : '';
      const arrTimeStr = leg.arrTime !== null ? formatTime(leg.arrTime) : '';
      const arrDotFill = isLast ? route.color : '#fff';
      html += `<div class="tl-station${destClass}">` +
        `<div class="tl-dot" style="border-color:${route.color};background:${arrDotFill}"></div>` +
        `<div class="tl-station-name">${alightStop}</div>` +
        (arrTimeStr ? `<div class="tl-station-time">${arrTimeStr}</div>` : '') +
        `</div>`;
    });

    html += '</div>';

    // Summary bar
    const transfers = resolvedLegs.length - 1;
    const totalStops = resolvedLegs.reduce((sum, l) => sum + l.stops.length - 1, 0);
    let summaryParts = [`${totalStops} stops`, `${transfers} transfer${transfers !== 1 ? 's' : ''}`];
    if (resolvedLegs[0].depTime !== null) {
      const firstDep = resolvedLegs[0].depTime;
      const lastArr = resolvedLegs[lastLegIdx].arrTime;
      if (lastArr !== null) {
        const totalTime = lastArr - firstDep;
        summaryParts.push(`<strong>${formatDuration(totalTime)} total</strong> (${formatTime(firstDep)} &rarr; ${formatTime(lastArr)})`);
      }
    }
    html += `<div class="dir-summary">${summaryParts.join(' \u00B7 ')}</div>`;
    return html;
  }

  function buildTabHtml(option, label) {
    if (!option || !isComplete(option)) {
      return `<div class="option-tab disabled"><div class="tab-label">${label}</div><div class="tab-time">-</div></div>`;
    }
    const dep = getDeparture(option);
    const total = getTotalTime(option);
    const maxWait = getMaxWait(option);
    const waitInfo = maxWait > 0 ? `<div class="tab-transfer">${maxWait} min transfer</div>` : '';
    return `<div class="tab-label">${label}</div><div class="tab-time">${formatTime(dep)}</div><div class="tab-dur">${formatDuration(total)}</div>${waitInfo}`;
  }

  function shiftOptions(direction) {
    if (!lastSearch) return;
    const { allLegs, dateStr, mode, fromId, toId } = lastSearch;
    const ref = direction === -1 ? currentOptions[0] : currentOptions[2];
    if (!ref || !isComplete(ref)) return;
    // Offset by 1 min so we don't land on the same trip again
    // In arrive mode, shift by arrival time (since startMin = target arrival)
    const refTime = mode === 'arrive' ? getArrival(ref) : getDeparture(ref);
    const newStartMin = refTime + direction;
    lastSearch.startMin = newStartMin;
    const options = findOptions(allLegs, dateStr, newStartMin, mode);
    const activeIdx = 1;
    if (options[activeIdx] && isComplete(options[activeIdx])) {
      showRoute(options[activeIdx]);
    } else {
      const fb = options.findIndex(o => o && isComplete(o));
      if (fb >= 0) showRoute(options[fb]);
    }
    showDirections(options, fromId, toId, activeIdx);
  }

  function setDirections(html) {
    const dir = document.getElementById('directions');
    dir.innerHTML = html;
    dir.classList.add('visible');
    map.invalidateSize();
  }

  function showDirections(options, fromId, toId, activeIdx) {
    const dir = document.getElementById('directions');
    const from = stopById[fromId];
    const to = stopById[toId];
    currentOptions = options;

    if (!options[0] && !options[1] && !options[2]) {
      setDirections('<div class="error-msg">No route found between these stops.</div>');
      return;
    }

    if (!options[activeIdx] || !isComplete(options[activeIdx])) {
      activeIdx = options.findIndex(o => o && isComplete(o));
      if (activeIdx === -1) {
        setDirections('<div class="error-msg">No trips available for this date.</div>');
        return;
      }
    }

    let html = `<div class="dir-header">${from.name} &rarr; ${to.name}</div>`;

    const labels = ['Earlier', 'Requested', 'Later'];
    const canGoEarlier = options[0] && isComplete(options[0]);
    const canGoLater = options[2] && isComplete(options[2]);

    html += '<div class="option-tabs">';
    html += `<button class="nav-btn" id="nav-earlier" ${canGoEarlier ? '' : 'disabled'}>&lsaquo;</button>`;
    for (let i = 0; i < 3; i++) {
      const opt = options[i];
      const isActive = i === activeIdx;
      const isDisabled = !opt || !isComplete(opt);
      const cls = isDisabled ? 'option-tab disabled' : (isActive ? 'option-tab active' : 'option-tab');
      html += `<div class="${cls}" data-tab="${i}">${buildTabHtml(opt, labels[i])}</div>`;
    }
    html += `<button class="nav-btn" id="nav-later" ${canGoLater ? '' : 'disabled'}>&rsaquo;</button>`;
    html += '</div>';

    html += `<div id="option-detail">${renderLegs(options[activeIdx])}</div>`;

    setDirections(html);

    dir.querySelectorAll('.option-tab:not(.disabled)').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.dataset.tab);
        showRoute(currentOptions[idx]);
        showDirections(currentOptions, fromId, toId, idx);
      });
    });
    document.getElementById('nav-earlier')?.addEventListener('click', () => shiftOptions(-1));
    document.getElementById('nav-later')?.addEventListener('click', () => shiftOptions(1));
  }

  // --- Go button ---
  document.getElementById('go-btn').addEventListener('click', () => {
    const fromId = fromSel.value;
    const toId = toSel.value;
    const mode = document.getElementById('time-mode').value;

    if (!fromId || !toId) {
      setDirections('<div class="error-msg">Please select both a From and To stop.</div>');
      return;
    }
    if (fromId === toId) {
      setDirections('<div class="error-msg">Origin and destination are the same stop.</div>');
      return;
    }

    const allLegs = findRoutes(fromId, toId);
    if (!allLegs || allLegs.length === 0) {
      clearHighlights();
      setDirections('<div class="error-msg">No route found between these stops.</div>');
      return;
    }

    // Expand intermediate stops for all candidate topologies
    for (const legs of allLegs) {
      legs.forEach(leg => {
        if (leg.stops.length === 2) {
          const expanded = expandLegStops(leg.stops[0], leg.stops[leg.stops.length - 1], leg.route);
          if (expanded) leg.stops = expanded;
        }
      });
    }

    const dateStr = dateInput.value;
    const startMin = timeToMin(timeInput.value + ':00');
    const options = findOptions(allLegs, dateStr, startMin, mode);

    lastSearch = { allLegs, dateStr, startMin, mode, fromId, toId };

    const activeIdx = 1;
    if (options[activeIdx] && isComplete(options[activeIdx])) {
      showRoute(options[activeIdx]);
    } else {
      const fb = options.findIndex(o => o && isComplete(o));
      if (fb >= 0) showRoute(options[fb]);
      else clearHighlights();
    }
    showDirections(options, fromId, toId, activeIdx);
  });

  // Helper: is a hex color light?
  function isLightColor(hex) {
    hex = hex.replace('#', '');
    if (hex.length === 3) hex = hex[0]+hex[0]+hex[1]+hex[1]+hex[2]+hex[2];
    const r = parseInt(hex.substring(0, 2), 16);
    const g = parseInt(hex.substring(2, 4), 16);
    const b = parseInt(hex.substring(4, 6), 16);
    return (r * 299 + g * 587 + b * 114) / 1000 > 160;
  }
})();
