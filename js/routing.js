// 0-1 BFS pathfinding, schedule resolution, and option generation

import { stopById, graph, routeStopSequences, schedulesByRoute } from './data.js';
import { timeToMin, serviceRunsOn } from './time-utils.js';
import { CONFIG } from './config.js';

/**
 * @typedef {Object} TripInfo
 * @property {string} tripId - Trip identifier
 * @property {string} routeId - Route identifier
 * @property {number} boardIdx - Boarding stop index
 * @property {number} alightIdx - Alighting stop index
 * @property {number} depTime - Departure time in minutes
 * @property {number} arrTime - Arrival time in minutes
 * @property {any[]} stops - Stop objects
 * @property {string} toward - Destination name
 */

/**
 * @typedef {Object} RouteLeg
 * @property {string} route - Route ID
 * @property {string[]} stops - Stop IDs
 * @property {number|null} depTime - Departure time in minutes
 * @property {number|null} arrTime - Arrival time in minutes
 * @property {number|null} waitMin - Wait time before this leg
 * @property {number|null} rideMin - Ride duration
 * @property {any[]|null} tripStops - Trip stop objects
 * @property {string} toward - Destination name
 */

/**
 * Find next trip for a route after a given time
 * @param {string} routeId - Route ID
 * @param {string} boardStopId - Boarding stop ID
 * @param {string} alightStopId - Alighting stop ID
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {number} departMin - Departure time in minutes
 * @returns {TripInfo|null} Trip info or null
 */
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

/**
 * Find next trip on any route between two stops
 * @param {string} boardStopId - Boarding stop ID
 * @param {string} alightStopId - Alighting stop ID
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {number} departMin - Departure time in minutes
 * @returns {TripInfo|null} Trip info or null
 */
function findNextTripAnyRoute(boardStopId, alightStopId, dateStr, departMin) {
  const boardRoutes = stopById[boardStopId].routes;
  const alightRoutes = stopById[alightStopId].routes;
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

/**
 * Convert BFS path to route legs
 * @param {Array<{stop: string, route: string|null}>} path - BFS path
 * @returns {RouteLeg[]} Array of route legs
 */
export function pathToLegs(path) {
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

  function pushState(s) {
    const idx = s.cost % BUCKET_COUNT;
    buckets[idx].push(s);
    pending++;
  }

  function popNext() {
    while (pending > 0) {
      const idx = currentCost % BUCKET_COUNT;
      if (bucketHeads[idx] < buckets[idx].length) {
        const s = buckets[idx][bucketHeads[idx]++];
        pending--;
        if (bucketHeads[idx] === buckets[idx].length) {
          buckets[idx] = [];
          bucketHeads[idx] = 0;
        }
        return s;
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

/**
 * Expand leg stops using route sequence
 * @param {string} fromId - Origin stop ID
 * @param {string} toId - Destination stop ID
 * @param {string} routeId - Route ID
 * @returns {string[]|null} Array of stop IDs or null
 */
export function expandLegStops(fromId, toId, routeId) {
  const seq = routeStopSequences[routeId];
  if (seq) {
    const fromIdx = seq.indexOf(fromId);
    const toIdx = seq.indexOf(toId);
    if (fromIdx !== -1 && toIdx !== -1 && fromIdx !== toIdx) {
      if (fromIdx < toIdx) return seq.slice(fromIdx, toIdx + 1);
      return seq.slice(toIdx, fromIdx + 1).reverse();
    }
  }
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

/**
 * Find routes between two stops using 0-1 BFS
 * @param {string} fromId - Origin stop ID
 * @param {string} toId - Destination stop ID
 * @returns {RouteLeg[][]|null} Array of route options, or null if none found
 */
export function findRoutes(fromId, toId) {
  const results = [];
  const seen = new Set();
  const penaltyStops = new Set();

  for (let i = 0; i < CONFIG.MAX_CANDIDATE_ROUTES; i++) {
    const result = bfsRoute(fromId, toId, penaltyStops);
    if (!result) break;

    const sig = result.legs.map(l => l.route + ':' + l.stops[0]).join('|');
    if (seen.has(sig)) break;
    seen.add(sig);
    results.push(result.legs);

    for (let j = 1; j < result.legs.length; j++) {
      penaltyStops.add(result.legs[j].stops[0]);
    }
  }

  return results.length > 0 ? results : null;
}

function resolveScheduleAt(legs, dateStr, startMin) {
  let currentMin = startMin;
  const resolved = [];

  for (let i = 0; i < legs.length; i++) {
    const leg = legs[i];
    const boardStop = leg.stops[0];
    const alightStop = leg.stops[leg.stops.length - 1];

    const trip = findNextTripAnyRoute(boardStop, alightStop, dateStr, currentMin);
    if (!trip) {
      resolved.push({
        ...leg, depTime: null, arrTime: null, waitMin: null, rideMin: null, tripStops: null
      });
      for (let j = i + 1; j < legs.length; j++) {
        resolved.push({ ...legs[j], depTime: null, arrTime: null, waitMin: null, rideMin: null, tripStops: null });
      }
      return resolved;
    }
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

    currentMin = trip.arrTime + (i < legs.length - 1 ? CONFIG.MIN_TRANSFER_TIME_MIN : 0);
  }
  return resolved;
}

/**
 * Get arrival time from route option
 * @param {RouteLeg[]} r - Route legs
 * @returns {number|null} Arrival time in minutes
 */
export function getArrival(r) { return r[r.length - 1].arrTime; }

/**
 * Get departure time from route option
 * @param {RouteLeg[]} r - Route legs
 * @returns {number|null} Departure time in minutes
 */
export function getDeparture(r) { return r[0].depTime; }

/**
 * Get total travel time
 * @param {RouteLeg[]} r - Route legs
 * @returns {number|null} Total time in minutes
 */
export function getTotalTime(r) {
  const a = getArrival(r), d = getDeparture(r);
  return (a !== null && d !== null) ? a - d : null;
}

/**
 * Get maximum wait time between legs
 * @param {RouteLeg[]} r - Route legs
 * @returns {number} Maximum wait time in minutes
 */
export function getMaxWait(r) {
  let max = 0;
  for (const l of r) if (l.waitMin !== null && l.waitMin > max) max = l.waitMin;
  return max;
}

/**
 * Check if route option is complete (has valid times)
 * @param {RouteLeg[]} r - Route legs
 * @returns {boolean} True if complete
 */
export function isComplete(r) { return getArrival(r) !== null; }

function resolveBest(allLegs, dateStr, tryMin, mode) {
  let best = null;
  for (const legs of allLegs) {
    const c = resolveScheduleAt(legs, dateStr, tryMin);
    if (!isComplete(c)) continue;
    if (!best) { best = c; continue; }
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

/**
 * Find route options in a time window
 * @param {RouteLeg[][]} allLegs - All route topologies
 * @param {string} dateStr - Date string (YYYY-MM-DD)
 * @param {number} startMin - Start time in minutes
 * @param {'depart'|'arrive'} mode - Search mode
 * @returns {RouteLeg[][]} Array of [earlier, best, later] options
 */
export function findOptions(allLegs, dateStr, startMin, mode) {
  const candidates = [];
  const backRange = mode === 'arrive' ? CONFIG.SCHEDULE_SEARCH_BACK_ARRIVE_MIN : CONFIG.SCHEDULE_SEARCH_BACK_DEPART_MIN;
  const fwdRange = mode === 'arrive' ? CONFIG.SCHEDULE_SEARCH_FWD_ARRIVE_MIN : CONFIG.SCHEDULE_SEARCH_FWD_DEPART_MIN;

  for (let offset = -backRange; offset <= fwdRange; offset += CONFIG.SCHEDULE_SEARCH_STEP_MIN) {
    const tryMin = startMin + offset;
    if (tryMin < 0 || tryMin >= 24 * 60) continue;
    const c = resolveBest(allLegs, dateStr, tryMin, mode);
    if (isComplete(c)) candidates.push(c);
  }

  if (candidates.length === 0) {
    const fallback = resolveBest(allLegs, dateStr, startMin, mode);
    return [null, fallback, null];
  }

  candidates.sort((a, b) => getDeparture(a) - getDeparture(b));

  const unique = [];
  for (const c of candidates) {
    const dep = getDeparture(c);
    if (unique.length === 0 || getDeparture(unique[unique.length - 1]) !== dep) {
      unique.push(c);
    }
  }

  if (mode === 'arrive') {
    const validArrivals = unique.filter(c => getArrival(c) <= startMin);
    const baseline = validArrivals.length > 0 ? validArrivals[validArrivals.length - 1] : null;

    if (!baseline) {
      return [null, unique[0], unique[1] || null];
    }

    const baseIdx = unique.indexOf(baseline);
    const earlier = baseIdx > 0 ? unique[baseIdx - 1] : null;
    const later = baseIdx < unique.length - 1 ? unique[baseIdx + 1] : null;
    return [earlier, baseline, later];
  }

  const baseIdx = unique.findIndex(c => getDeparture(c) >= startMin);
  if (baseIdx === -1) {
    const last = unique[unique.length - 1];
    const prev = unique.length > 1 ? unique[unique.length - 2] : null;
    return [prev, last, null];
  }

  const baseline = unique[baseIdx];

  let earlier = null;
  for (let i = baseIdx - 1; i >= 0; i--) {
    if (getArrival(unique[i]) < getArrival(baseline)) {
      earlier = unique[i];
      break;
    }
  }

  let later = baseIdx < unique.length - 1 ? unique[baseIdx + 1] : null;

  return [earlier, baseline, later];
}
