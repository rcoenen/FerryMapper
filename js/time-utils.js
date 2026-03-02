// Time parsing, formatting, and GTFS schedule helpers

import { state } from './state.js';
import { services, schedulesByRoute } from './data.js';

export function timeToMin(t) {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

export function formatTime(mins) {
  const h = Math.floor(mins / 60) % 24;
  const m = mins % 60;
  if (state.use12h) {
    const period = h < 12 ? 'AM' : 'PM';
    const h12 = h % 12 || 12;
    return `${h12}:${String(m).padStart(2, '0')} ${period}`;
  }
  return String(h).padStart(2, '0') + ':' + String(m).padStart(2, '0');
}

export function formatDuration(mins) {
  if (mins < 1) return 'less than a minute';
  const h = Math.floor(mins / 60);
  const m = Math.round(mins % 60);
  if (h === 0) return m + ' min';
  if (m === 0) return h + ' hr';
  return h + ' hr ' + m + ' min';
}

export function serviceRunsOn(serviceId, dateStr) {
  const svc = services[serviceId];
  if (!svc) return false;
  const ds = dateStr.replace(/-/g, '');
  if (svc.removed && svc.removed.includes(ds)) return false;
  if (svc.added && svc.added.includes(ds)) return true;
  if (ds < svc.start || ds > svc.end) return false;
  const d = new Date(dateStr);
  const jsDay = d.getDay();
  const gtfsIdx = jsDay === 0 ? 6 : jsDay - 1;
  return svc.days[gtfsIdx] === 1;
}

export function getTripsForRoute(routeId, dateStr) {
  return (schedulesByRoute[routeId] || []).filter(t => serviceRunsOn(t.s, dateStr));
}
