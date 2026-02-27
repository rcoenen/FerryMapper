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
  const STORAGE_KEY = 'ferryMapperNYC';
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
  const dateDisplay = document.getElementById('date-display');
  const timeInput = document.getElementById('time-input');
  const fromSel = document.getElementById('from-select');
  const toSel = document.getElementById('to-select');
  const aboutTrigger = document.getElementById('about-trigger');
  const aboutModal = document.getElementById('about-modal');
  const aboutClose = document.getElementById('about-close');
  const nerdTrigger = document.getElementById('nerd-trigger');
  const nerdModal = document.getElementById('nerd-modal');
  const nerdClose = document.getElementById('nerd-close');
  const sorted = [...stops].sort((a, b) => a.name.localeCompare(b.name));

  function syncModalBodyLock() {
    const hasOpenModal = !aboutModal.hidden || !nerdModal.hidden;
    document.body.classList.toggle('modal-open', hasOpenModal);
  }

  function openAboutModal() {
    closeNerdModal({ restoreFocus: false });
    aboutModal.hidden = false;
    syncModalBodyLock();
    aboutTrigger.setAttribute('aria-expanded', 'true');
    aboutClose.focus();
  }

  function closeAboutModal({ restoreFocus = true } = {}) {
    if (aboutModal.hidden) return;
    aboutModal.hidden = true;
    syncModalBodyLock();
    aboutTrigger.setAttribute('aria-expanded', 'false');
    if (restoreFocus) aboutTrigger.focus();
  }

  function openNerdModal() {
    closeAboutModal({ restoreFocus: false });
    nerdModal.hidden = false;
    syncModalBodyLock();
    nerdClose.focus();
  }

  function closeNerdModal({ restoreFocus = true } = {}) {
    if (nerdModal.hidden) return;
    nerdModal.hidden = true;
    syncModalBodyLock();
    if (restoreFocus) aboutTrigger.focus();
  }

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
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      closeNerdModal();
      closeAboutModal();
      if (typeof closeMapOverlay === 'function') closeMapOverlay();
    }
  });

  function populateSelect(sel, placeholder) {
    sel.innerHTML = `<option value="">${placeholder}</option>`;
    sorted.forEach(s => {
      const opt = document.createElement('option');
      opt.value = s.id;
      opt.textContent = s.name;
      sel.appendChild(opt);
    });
  }
  populateSelect(fromSel, 'From:');
  populateSelect(toSel, 'To:');

  function formatDateForDisplay(dateStr) {
    if (!dateStr) return '';
    const dt = new Date(dateStr + 'T00:00:00');
    if (Number.isNaN(dt.getTime())) return dateStr;
    return new Intl.DateTimeFormat(undefined, {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    }).format(dt);
  }

  function syncDateDisplay() {
    if (!dateDisplay) return;
    dateDisplay.value = formatDateForDisplay(dateInput.value);
  }

  // Hydrate from saved state or default to now
  const saved = loadState();
  const now = new Date();
  const todayStr = now.toISOString().slice(0, 10);
  const nowTime = now.toTimeString().slice(0, 5);

  // Always restore stops and mode from saved state
  if (saved) {
    if (saved.from) fromSel.value = saved.from;
    if (saved.to) toSel.value = saved.to;
    if (saved.mode) document.getElementById('time-mode').value = saved.mode;
  }
  // For date/time: keep saved value only if it's still in the future, otherwise use now
  const savedDateTime = saved?.date && saved?.time ? new Date(saved.date + 'T' + saved.time) : null;
  if (savedDateTime && savedDateTime > now) {
    dateInput.value = saved.date;
    timeInput.value = saved.time;
  } else {
    dateInput.value = todayStr;
    timeInput.value = nowTime;
  }
  syncDateDisplay();

  // Save on any change
  for (const el of [fromSel, toSel, dateInput, timeInput, document.getElementById('time-mode')]) {
    el.addEventListener('change', saveState);
  }
  dateInput.addEventListener('change', syncDateDisplay);
  dateInput.addEventListener('input', syncDateDisplay);

  function checkPastTime() {
    const now = new Date();
    const selDate = dateInput.value;
    const today = now.toISOString().slice(0, 10);
    const pastDate = selDate < today;
    const pastTime = selDate === today && timeInput.value < now.toTimeString().slice(0, 5);
    dateInput.style.color = dateDisplay.style.color = pastDate ? '#c62828' : '';
    timeInput.style.color = (pastDate || pastTime) ? '#c62828' : '';
  }
  dateInput.addEventListener('change', checkPastTime);
  timeInput.addEventListener('change', checkPastTime);
  checkPastTime();
  setInterval(checkPastTime, 30000);


  // When stop selection changes while a route is active, clear state and start fresh
  function resetRoute() {
    if (!lastSearch) return;
    clearHighlights();
    const dir = document.getElementById('directions');
    dir.classList.remove('visible');
    dir.innerHTML = '';
    controls.style.display = '';
    lastSearch = null;
    currentOptions = [null, null, null];
    shiftCount = 0;
    if (isMobile()) setSheetSnap('peek');
  }
  fromSel.addEventListener('change', resetRoute);
  toSel.addEventListener('change', resetRoute);

  const controls = document.querySelector('.controls');

  // Swap button
  document.getElementById('swap-btn').addEventListener('click', () => {
    const tmp = fromSel.value;
    fromSel.value = toSel.value;
    toSel.value = tmp;
    resetRoute();
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
    // Use the canonical stop sequence for this route to get all intermediate stops
    const seq = routeStopSequences[routeId];
    if (seq) {
      const fromIdx = seq.indexOf(fromId);
      const toIdx = seq.indexOf(toId);
      if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
        if (fromIdx < toIdx) return seq.slice(fromIdx, toIdx + 1);
        return seq.slice(toIdx, fromIdx + 1).reverse();
      }
    }
    // Fallback: BFS on graph edges
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
  const DEFAULT_VIEW = { lat: 40.6989, lng: -73.9922, zoom: 13 };
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
  const STYLE_STORAGE_KEY = 'ferryMapperNYCStyle';
  let activeStyleKey = 'positron';
  try { activeStyleKey = localStorage.getItem(STYLE_STORAGE_KEY) || 'positron'; } catch {}
  if (!MAP_STYLES[activeStyleKey]) activeStyleKey = 'positron';

  const map = L.map('map', { minZoom: 11 }).setView([DEFAULT_VIEW.lat, DEFAULT_VIEW.lng], DEFAULT_VIEW.zoom);
  let currentTileLayer = L.tileLayer(MAP_STYLES[activeStyleKey].url, {
    attribution: MAP_STYLES[activeStyleKey].attribution,
    maxZoom: MAP_STYLES[activeStyleKey].maxZoom
  }).addTo(map);

  const routeOutlines = {};
  const routePolylines = {};
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

  const stopMarkers = {};
  stops.forEach(s => {
    const marker = L.circleMarker([s.lat, s.lng], {
      radius: 8, fillColor: '#fff', fillOpacity: 1,
      color: '#333', weight: 1.5
    }).addTo(map);

    const typeLabel = '';
    const routeTags = s.routes.map(rid => {
      const r = routeById[rid];
      const textColor = isLightColor(r.color) ? '#333' : '#fff';
      return `<span style="background:${r.color};color:${textColor}">${r.name}</span>`;
    }).join('');

    marker.bindPopup(`<strong>${s.name}</strong>${typeLabel}<div class="stop-popup-routes">${routeTags}</div><div class="popup-actions"><button class="popup-start" data-stop="${s.id}"><span class="ab-marker ab-a">A</span> From</button><button class="popup-end" data-stop="${s.id}"><span class="ab-marker ab-b">B</span> To</button></div>`);
    stopMarkers[s.id] = marker;
  });

  map.on('popupopen', () => {
    document.querySelectorAll('.popup-start').forEach(btn => {
      btn.addEventListener('click', () => {
        fromSel.value = btn.dataset.stop;
        resetRoute();
        saveState();
        map.closePopup();
      });
    });
    document.querySelectorAll('.popup-end').forEach(btn => {
      btn.addEventListener('click', () => {
        toSel.value = btn.dataset.stop;
        resetRoute();
        saveState();
        map.closePopup();
      });
    });
  });

  const allLatLngs = stops.map(s => [s.lat, s.lng]);
  const stopsBounds = allLatLngs.length ? L.latLngBounds(allLatLngs) : null;

  // --- "Return to NYC" overlay when panned away ---
  const returnOverlay = document.createElement('div');
  returnOverlay.className = 'return-nyc-overlay';
  returnOverlay.innerHTML = '<div class="nyc-icon">\uD83D\uDDFD</div>' +
    '<div class="nyc-msg">Oy vey, you\'re outside NYC!</div>' +
    '<button class="nyc-back-btn" type="button">Take me back</button>';
  document.getElementById('map-overlay').appendChild(returnOverlay);

  // Pad the bounds generously so users can explore the NYC metro area
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

  // --- Highlight layers ---
  let highlightLayers = [];

  function clearHighlights() {
    highlightLayers.forEach(l => map.removeLayer(l));
    highlightLayers = [];
    for (const rid in routeOutlines) routeOutlines[rid].setStyle({ weight: 5, opacity: 0.35 });
    for (const rid in routePolylines) routePolylines[rid].setStyle({ weight: 3, opacity: 0.35 });
    for (const sid in stopMarkers) stopMarkers[sid].setStyle({ radius: 5, color: '#333', weight: 1.5, fillColor: '#fff' });
  }

  function addChevronToSegment(pts, color, lineWeight) {
    // Place a simple black chevron at the midpoint, sized to the line weight.
    // Skip spur/branch segments (path much longer than straight line).
    const segs = [];
    let totalLen = 0;
    for (let i = 0; i + 1 < pts.length; i++) {
      const a = L.latLng(pts[i]), b = L.latLng(pts[i + 1]);
      const len = a.distanceTo(b);
      segs.push({ a, b, len });
      totalLen += len;
    }
    const straightLine = L.latLng(pts[0]).distanceTo(L.latLng(pts[pts.length - 1]));
    if (straightLine < 200 || totalLen > straightLine * 1.8) return;
    let target = totalLen / 2;
    for (const seg of segs) {
      if (target <= seg.len) {
        const t = target / seg.len;
        const lat = seg.a.lat + t * (seg.b.lat - seg.a.lat);
        const lng = seg.a.lng + t * (seg.b.lng - seg.a.lng);
        const angle = Math.atan2(seg.b.lng - seg.a.lng, seg.b.lat - seg.a.lat) * 180 / Math.PI;
        // Chevron width ~lineWeight * 2.5 so wings extend slightly past the line
        const s = Math.round(lineWeight * 2.5);
        const sw = Math.max(2, Math.round(lineWeight * 0.45));
        const half = Math.round(s / 2);
        const svg = `<svg width="${s}" height="${s}" viewBox="0 0 ${s} ${s}" style="transform:rotate(${angle}deg)"><path d="M${s * 0.2} ${s * 0.75}L${half} ${s * 0.2}L${s * 0.8} ${s * 0.75}" fill="none" stroke="black" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round"/></svg>`;
        const m = L.marker([lat, lng], {
          icon: L.divIcon({ className: '', html: svg, iconSize: [s, s], iconAnchor: [half, half] }),
          interactive: false
        }).addTo(map);
        highlightLayers.push(m);
        return;
      }
      target -= seg.len;
    }
  }

  function smoothLine(pts, iterations = 3) {
    if (pts.length < 3) return pts;
    let result = pts.map(p => [p[0], p[1]]);
    for (let iter = 0; iter < iterations; iter++) {
      const smooth = [result[0]];
      for (let i = 0; i < result.length - 1; i++) {
        const [ax, ay] = result[i], [bx, by] = result[i + 1];
        smooth.push([ax * 0.75 + bx * 0.25, ay * 0.75 + by * 0.25]);
        smooth.push([ax * 0.25 + bx * 0.75, ay * 0.25 + by * 0.75]);
      }
      smooth.push(result[result.length - 1]);
      result = smooth;
    }
    return result;
  }

  function showRoute(legs) {
    clearHighlights();
    for (const rid in routeOutlines) routeOutlines[rid].setStyle({ weight: 4, opacity: 0.15 });
    for (const rid in routePolylines) routePolylines[rid].setStyle({ weight: 2, opacity: 0.15 });

    const bounds = [];

    const originId = legs[0].stops[0];
    const destId = legs[legs.length - 1].stops[legs[legs.length - 1].stops.length - 1];

    legs.forEach(leg => {
      const route = routeById[leg.route];
      // Collect all raw shape points for the entire leg
      const allRaw = [];
      const segBoundaries = [0]; // indices where each stop-to-stop segment starts in allRaw
      for (let i = 0; i + 1 < leg.stops.length; i++) {
        const fromStop = stopById[leg.stops[i]];
        const toStop = stopById[leg.stops[i + 1]];
        const seg = getShapeSegment(route, fromStop, toStop);
        if (i === 0) {
          seg.forEach(p => allRaw.push(p));
        } else {
          // skip first point (duplicate of previous segment's last)
          for (let j = 1; j < seg.length; j++) allRaw.push(seg[j]);
        }
        segBoundaries.push(allRaw.length - 1);
      }
      // Smooth the entire leg as one continuous polyline
      const smoothed = smoothLine(allRaw);
      const noTrips = leg.depTime === null;
      const outline = L.polyline(smoothed, {
        color: '#fff', weight: noTrips ? 8 : 10,
        opacity: 1,
        interactive: false
      }).addTo(map);
      highlightLayers.push(outline);
      const line = L.polyline(smoothed, {
        color: route.color, weight: noTrips ? 4 : 6,
        opacity: noTrips ? 0.5 : 0.9,
        dashArray: noTrips ? '8 6' : null,
        interactive: false
      }).addTo(map);
      highlightLayers.push(line);
      smoothed.forEach(p => bounds.push(p));
      // Place chevrons per stop-to-stop segment (smooth each so chevron lands on the curved line)
      for (let i = 0; i + 1 < leg.stops.length; i++) {
        const fromStop = stopById[leg.stops[i]];
        const toStop = stopById[leg.stops[i + 1]];
        const seg = getShapeSegment(route, fromStop, toStop);
        addChevronToSegment(smoothLine(seg), route.color, noTrips ? 4 : 6);
      }
      leg.stops.forEach(sid => {
        const isEndpoint = sid === originId || sid === destId;
        if (isEndpoint) {
          stopMarkers[sid].setStyle({ radius: 7, color: route.color, weight: 3, fillColor: route.color, fillOpacity: 1 });
        } else {
          stopMarkers[sid].setStyle({ radius: 5, color: route.color, weight: 2, fillColor: '#fff', fillOpacity: 1 });
        }
      });
    });

    // Keep stop nodes above route overlays so clicks reliably open the pier popup card.
    for (const sid in stopMarkers) stopMarkers[sid].bringToFront();

    // Add Start/End pill markers at origin and destination
    const originStop = stopById[originId];
    const destStop = stopById[destId];

    const startMarker = L.marker([originStop.lat, originStop.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="start-end-marker">Start</div>',
        iconSize: [52, 36],
        iconAnchor: [26, 36]
      }),
      interactive: false
    }).addTo(map);
    highlightLayers.push(startMarker);

    const endMarker = L.marker([destStop.lat, destStop.lng], {
      icon: L.divIcon({
        className: '',
        html: '<div class="start-end-marker">End</div>',
        iconSize: [44, 36],
        iconAnchor: [22, 36]
      }),
      interactive: false
    }).addTo(map);
    highlightLayers.push(endMarker);

    if (bounds.length) {
      if (isMobile()) {
        const ZOOM = 14;
        // Defer until after the bottom sheet has fully expanded
        setTimeout(() => {
          const sheetHeight = document.getElementById('bottom-sheet').offsetHeight;
          const mapHeight = document.getElementById('map').offsetHeight;
          const visibleHeight = mapHeight - sheetHeight;
          const originPx = map.project([originStop.lat, originStop.lng], ZOOM);
          const centeredPx = L.point(originPx.x, originPx.y + sheetHeight / 2);
          map.setView(map.unproject(centeredPx, ZOOM), ZOOM);
        }, 350);
      } else {
        map.fitBounds(bounds, { padding: [50, 50] });
      }
    }
  }

  function getShapeSegment(route, fromStop, toStop) {
    if (!route.shape || route.shape.length < 2) {
      return [[fromStop.lat, fromStop.lng], [toStop.lat, toStop.lng]];
    }
    let fromIdx = nearestPointOnShape(route.shape, fromStop);
    let toIdx = nearestPointOnShape(route.shape, toStop);
    if (fromIdx === toIdx) return [[fromStop.lat, fromStop.lng], [toStop.lat, toStop.lng]];
    let pts;
    if (fromIdx < toIdx) {
      pts = route.shape.slice(fromIdx, toIdx + 1);
    } else {
      pts = route.shape.slice(toIdx, fromIdx + 1).reverse();
    }
    // Anchor endpoints to actual stop coordinates so the line connects through the markers
    pts[0] = [fromStop.lat, fromStop.lng];
    pts[pts.length - 1] = [toStop.lat, toStop.lng];
    return pts;
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
  const BASE_LABELS = ['Earlier', 'Best', 'Later'];
  let currentOptions = [null, null, null];
  let currentActiveIdx = 1;
  let shiftCount = 0; // negative = shifted earlier, positive = shifted later
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
      const depTimeClass = isFirst ? ' tl-station-time-strong' : '';
      const depDotFill = route.color;
      html += `<div class="tl-station${originClass}">` +
        `<div class="tl-dot" style="border-color:${route.color};background:${depDotFill}"></div>` +
        `<div class="tl-station-name">${boardStop}</div>` +
        (depTimeStr ? `<div class="tl-station-time${depTimeClass}">${depTimeStr}</div>` : '') +
        `</div>`;

      // Leg connector with route info
      html += `<div class="tl-leg" style="color:${route.color}">`;
      html += `<div class="tl-route">` +
        `<span class="tl-route-badge" style="background:${route.color}">\u26F4 ${route.name}</span>` +
        (leg.toward && leg.toward !== alightStop ? `<br><span class="tl-route-dir">Direction: ${leg.toward}</span>` : '') +
        `</div>`;
      if (leg.depTime !== null) {
        html += `<div class="tl-stops-row">` +
          `<span class="tl-stops-count">${numStops} stop${numStops !== 1 ? 's' : ''} (${formatDuration(leg.rideMin)})</span>` +
          `</div>`;
      } else {
        html += `<div class="tl-no-trips">No more trips today</div>`;
      }
      html += `</div>`;

      // Arrival station
      const destClass = isLast ? ' tl-dest' : '';
      const arrTimeStr = leg.arrTime !== null ? formatTime(leg.arrTime) : '';
      const arrTimeClass = isLast ? ' tl-station-time-strong' : '';
      const arrDotFill = route.color;
      html += `<div class="tl-station${destClass}">` +
        `<div class="tl-dot" style="border-color:${route.color};background:${arrDotFill}"></div>` +
        `<div class="tl-station-name">${alightStop}</div>` +
        (arrTimeStr ? `<div class="tl-station-time${arrTimeClass}">${arrTimeStr}</div>` : '') +
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
        summaryParts.push(`<strong>${formatDuration(totalTime)} total</strong>`);
      }
    }
    html += `<div class="dir-summary">${summaryParts.join(' \u00B7 ')}</div>`;
    return html;
  }

  function buildTabHtml(option, label) {
    const labelHtml = `<div class="tab-label">${label || '&nbsp;'}</div>`;
    if (!option || !isComplete(option)) {
      return `<div class="option-tab disabled">${labelHtml}<div class="tab-time">-</div></div>`;
    }
    const dep = getDeparture(option);
    const total = getTotalTime(option);
    const maxWait = getMaxWait(option);
    const transferClass = maxWait > 20 ? ' tab-transfer-long' : '';
    const waitInfo = maxWait > 0 ? `<div class="tab-transfer${transferClass}">${maxWait} min transfer</div>` : '';
    return `${labelHtml}<div class="tab-time">${formatTime(dep)}</div><div class="tab-dur">${formatDuration(total)}</div>${waitInfo}`;
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
    shiftCount += direction;
    if (options[activeIdx] && isComplete(options[activeIdx])) {
      showRoute(options[activeIdx]);
    } else {
      const fb = options.findIndex(o => o && isComplete(o));
      if (fb >= 0) showRoute(options[fb]);
    }
    showDirections(options, fromId, toId, activeIdx);
  }

  function setDirections(html, hasRoute) {
    const dir = document.getElementById('directions');
    if (isMobile()) {
      closeMapOverlay();
      setSheetSnap('full');
      if (hasRoute) {
        controls.style.display = 'none';
        html += '<div class="route-actions"><button class="route-action-btn" id="clear-route-btn">New route</button><button class="route-action-btn" id="show-map-btn">Show full route</button></div>';
      } else {
        controls.style.display = '';
      }
    }
    dir.innerHTML = html;
    dir.classList.add('visible');
    if (isMobile() && hasRoute) {
      document.getElementById('show-map-btn')?.addEventListener('click', openMapOverlay);
      document.getElementById('clear-route-btn')?.addEventListener('click', resetRoute);
    }
    map.invalidateSize();
  }

  function showDirections(options, fromId, toId, activeIdx) {
    const dir = document.getElementById('directions');
    const from = stopById[fromId];
    const to = stopById[toId];
    currentOptions = options;
    currentActiveIdx = activeIdx;

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

    let html = '';

    const labels = [0, 1, 2].map(k => {
      const orig = k + shiftCount;
      return (orig >= 0 && orig < 3) ? BASE_LABELS[orig] : '';
    });
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

    setDirections(html, true);

    dir.querySelectorAll('.option-tab:not(.disabled)').forEach(tab => {
      tab.addEventListener('click', () => {
        const idx = parseInt(tab.dataset.tab);
        showRoute(currentOptions[idx]);
        showDirections(currentOptions, fromId, toId, idx);
      });
    });
    document.getElementById('nav-earlier')?.addEventListener('click', () => shiftOptions(-1));
    document.getElementById('nav-later')?.addEventListener('click', () => shiftOptions(1));

    // Horizontal swipe on option tabs
    const tabsEl = dir.querySelector('.option-tabs');
    if (tabsEl) {
      let startX = 0;
      let currentX = 0;
      let swiping = false;
      const tabs = tabsEl.querySelectorAll('.option-tab');

      tabsEl.addEventListener('touchstart', e => {
        startX = e.touches[0].clientX;
        currentX = startX;
        swiping = true;
      }, { passive: true });

      tabsEl.addEventListener('touchmove', e => {
        if (!swiping) return;
        currentX = e.touches[0].clientX;
        const dx = currentX - startX;
        tabs.forEach(t => t.style.transform = `translateX(${dx}px)`);
      }, { passive: true });

      tabsEl.addEventListener('touchend', () => {
        if (!swiping) return;
        swiping = false;
        const dx = currentX - startX;
        tabs.forEach(t => t.style.transform = '');
        if (Math.abs(dx) > 50) {
          shiftOptions(dx < 0 ? 1 : -1);
        }
      });
    }
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
        const full = [];
        for (let i = 0; i < leg.stops.length - 1; i++) {
          const seg = expandLegStops(leg.stops[i], leg.stops[i + 1], leg.route);
          if (seg) {
            if (i === 0) full.push(...seg);
            else full.push(...seg.slice(1));
          } else {
            if (i === 0) full.push(leg.stops[i]);
            full.push(leg.stops[i + 1]);
          }
        }
        if (full.length > leg.stops.length) leg.stops = full;
      });
    }

    const dateStr = dateInput.value;
    const startMin = timeToMin(timeInput.value + ':00');
    const options = findOptions(allLegs, dateStr, startMin, mode);

    lastSearch = { allLegs, dateStr, startMin, mode, fromId, toId };
    shiftCount = 0;

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

  // --- Mobile bottom sheet ---
  function isMobile() { return window.innerWidth <= 640; }

  const sheet = document.getElementById('bottom-sheet');
  const handle = document.getElementById('sheet-handle');
  const mapOverlay = document.getElementById('map-overlay');
  const mapCloseBtn = document.getElementById('map-close');
  let currentSnap = 'peek';

  function setSheetSnap(snap) {
    currentSnap = snap;
    sheet.classList.remove('snap-collapsed', 'snap-peek', 'snap-full');
    sheet.classList.add('snap-' + snap);
    // Let map recalculate its size after transition
    setTimeout(() => map.invalidateSize(), 320);
  }

  // --- Map overlay (mobile fullscreen map) ---
  function openMapOverlay() {
    mapOverlay.classList.add('open');
    document.body.style.overflow = 'hidden';
    setTimeout(() => {
      map.invalidateSize();
      if (highlightLayers.length) {
        const bounds = [];
        highlightLayers.forEach(l => {
          if (l.getBounds) bounds.push(l.getBounds());
          else if (l.getLatLng) bounds.push(l.getLatLng());
        });
        if (bounds.length) {
          const group = L.featureGroup(highlightLayers);
          map.fitBounds(group.getBounds(), { padding: [50, 50] });
        }
      }
    }, 50);
  }

  function closeMapOverlay() {
    if (!mapOverlay.classList.contains('open')) return;
    mapOverlay.classList.remove('open');
    document.body.style.overflow = '';
    setTimeout(() => map.invalidateSize(), 50);
  }

  mapCloseBtn.addEventListener('click', closeMapOverlay);

  // Initialize sheet position on mobile
  function initSheet() {
    if (isMobile()) {
      closeMapOverlay();
      sheet.classList.remove('snap-collapsed', 'snap-peek', 'snap-full');
      sheet.style.transform = '';
      setSheetSnap('peek');
    } else {
      sheet.classList.remove('snap-collapsed', 'snap-peek', 'snap-full');
      sheet.style.transform = '';
      // Ensure overlay is closed and map is visible on desktop
      mapOverlay.classList.remove('open');
      document.body.style.overflow = '';
    }
  }
  initSheet();

  let resizeTimer;
  window.addEventListener('resize', () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(() => {
      initSheet();
      map.invalidateSize();
    }, 150);
  });

  // Touch drag on handle (with velocity tracking for magnetic snap)
  let dragStartY = 0;
  let dragStartTranslate = 0;
  let isDragging = false;
  let lastTouchY = 0;
  let lastTouchTime = 0;
  let dragDistance = 0;
  let velocity = 0; // px/ms, positive = dragging down (closing)

  function getSheetTranslateY() {
    const style = window.getComputedStyle(sheet);
    const matrix = new DOMMatrix(style.transform);
    return matrix.m42;
  }

  handle.addEventListener('touchstart', (e) => {
    if (!isMobile()) return;
    isDragging = true;
    dragStartY = e.touches[0].clientY;
    dragStartTranslate = getSheetTranslateY();
    lastTouchY = dragStartY;
    lastTouchTime = Date.now();
    dragDistance = 0;
    velocity = 0;
    sheet.classList.add('dragging');
    handle.classList.add('pressed');
  }, { passive: true });

  document.addEventListener('touchmove', (e) => {
    if (!isDragging) return;
    const touchY = e.touches[0].clientY;
    const now = Date.now();
    const dt = now - lastTouchTime;
    if (dt > 0) velocity = (touchY - lastTouchY) / dt;
    lastTouchY = touchY;
    lastTouchTime = now;
    const dy = touchY - dragStartY;
    dragDistance = Math.max(dragDistance, Math.abs(dy));
    let newY = dragStartTranslate + dy;
    const maxY = sheet.offsetHeight - 52;
    if (newY < 0) newY = newY * 0.3; // rubber band: follow finger with resistance
    sheet.style.transform = `translateY(${Math.min(newY, maxY)}px)`;
  }, { passive: true });

  const FLICK_THRESHOLD = 0.4; // px/ms — above this, snap in throw direction
  const snaps = ['full', 'peek', 'collapsed']; // ordered open → closed

  document.addEventListener('touchend', () => {
    if (!isDragging) return;
    isDragging = false;
    sheet.classList.remove('dragging');
    handle.classList.remove('pressed');

    // Rubber band snap-back: if dragged above max expansion, spring back
    if (getSheetTranslateY() < 0) {
      sheet.style.transform = '';
      setSheetSnap('full');
      return;
    }

    const currentIdx = snaps.indexOf(currentSnap);

    // Fast flick: magnetic snap one step in the throw direction
    if (Math.abs(velocity) > FLICK_THRESHOLD) {
      sheet.style.transform = '';
      const dir = velocity > 0 ? 1 : -1; // positive = closing, negative = opening
      const nextIdx = Math.max(0, Math.min(snaps.length - 1, currentIdx + dir));
      setSheetSnap(snaps[nextIdx]);
      return;
    }

    // Slow drag: stay exactly where released (keep current inline transform)
  });

  function toggleSheetFromHandle() {
    if (!isMobile()) return;
    const currentY = getSheetTranslateY();
    // If partially dragged or collapsed, snap open; if already fully open, collapse
    if (currentSnap === 'collapsed' || currentY > 10) {
      sheet.style.transform = '';
      setSheetSnap('peek');
    } else {
      setSheetSnap('collapsed');
    }
  }

  handle.addEventListener('touchend', (e) => {
    if (!isMobile()) return;
    // Treat small/no movement as tap for immediate toggle on mobile.
    if (dragDistance <= 6) {
      e.preventDefault();
      toggleSheetFromHandle();
    }
  }, { passive: false });

  // Click fallback (desktop/simulators and non-touch interactions)
  handle.addEventListener('click', toggleSheetFromHandle);

  // --- Settings drawer ---
  const settingsToggle = document.getElementById('settings-toggle');
  const settingsDrawer = document.getElementById('settings-drawer');
  const mapStyleSelect = document.getElementById('map-style-select');
  const locationToggle = document.getElementById('location-toggle');

  // Restore map style select to match active style
  mapStyleSelect.value = activeStyleKey;

  function openSettingsDrawer() {
    settingsDrawer.hidden = false;
    settingsToggle.setAttribute('aria-expanded', 'true');
  }

  function closeSettingsDrawer() {
    settingsDrawer.hidden = true;
    settingsToggle.setAttribute('aria-expanded', 'false');
  }

  settingsToggle.addEventListener('click', () => {
    if (settingsDrawer.hidden) openSettingsDrawer();
    else closeSettingsDrawer();
  });

  // Close on click outside
  document.addEventListener('click', (e) => {
    if (!settingsDrawer.hidden && !settingsDrawer.contains(e.target) && !settingsToggle.contains(e.target)) {
      closeSettingsDrawer();
    }
  });

  // Close on Escape (extend existing handler)
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeSettingsDrawer();
  });

  // --- Map style switching ---
  mapStyleSelect.addEventListener('change', () => {
    const key = mapStyleSelect.value;
    const s = MAP_STYLES[key];
    if (!s) return;
    map.removeLayer(currentTileLayer);
    currentTileLayer = L.tileLayer(s.url, { attribution: s.attribution, maxZoom: s.maxZoom }).addTo(map);
    // Push tile layer to back so markers/routes stay on top
    currentTileLayer.bringToBack();
    activeStyleKey = key;
    try { localStorage.setItem(STYLE_STORAGE_KEY, key); } catch {}
  });

  // --- Geolocation toggle ---
  const LOC_STORAGE_KEY = 'ferryMapperNYCLocation';
  let geoWatchId = null;
  let geoMarker = null;

  function createGeoMarker(lat, lng) {
    const icon = L.divIcon({
      className: '',
      html: '<div class="location-dot"><div class="location-dot-pulse"></div><div class="location-dot-inner"></div></div>',
      iconSize: [16, 16],
      iconAnchor: [8, 8]
    });
    return L.marker([lat, lng], { icon, interactive: false, zIndexOffset: 1000 }).addTo(map);
  }

  function clearGeoLocation() {
    if (geoWatchId !== null) {
      navigator.geolocation.clearWatch(geoWatchId);
      geoWatchId = null;
    }
    if (geoMarker) {
      map.removeLayer(geoMarker);
      geoMarker = null;
    }
  }

  function enableGeolocation() {
    if (!navigator.geolocation) {
      locationToggle.checked = false;
      try { localStorage.removeItem(LOC_STORAGE_KEY); } catch {}
      return;
    }
    geoWatchId = navigator.geolocation.watchPosition(
      (pos) => {
        const { latitude, longitude } = pos.coords;
        if (geoMarker) {
          geoMarker.setLatLng([latitude, longitude]);
        } else {
          geoMarker = createGeoMarker(latitude, longitude);
        }
      },
      (err) => {
        locationToggle.checked = false;
        clearGeoLocation();
        try { localStorage.removeItem(LOC_STORAGE_KEY); } catch {}
        if (err.code === err.PERMISSION_DENIED) {
          alert('Location access was denied. To re-enable it, click the lock/settings icon in your browser\'s address bar and allow location access, then try again.');
        }
      },
      { enableHighAccuracy: true, maximumAge: 10000 }
    );
  }

  locationToggle.addEventListener('change', () => {
    if (locationToggle.checked) {
      try { localStorage.setItem(LOC_STORAGE_KEY, '1'); } catch {}
      enableGeolocation();
    } else {
      try { localStorage.removeItem(LOC_STORAGE_KEY); } catch {}
      clearGeoLocation();
    }
  });

  // Restore location toggle on load
  try {
    if (localStorage.getItem(LOC_STORAGE_KEY) === '1') {
      locationToggle.checked = true;
      enableGeolocation();
    }
  } catch {}
})();
