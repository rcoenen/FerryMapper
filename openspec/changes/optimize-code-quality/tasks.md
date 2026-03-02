# Tasks: Optimize Code Quality and Modularize

5 phases, each independently committable and testable.

## Phase 1 — Popup listener scoping

- [ ] 1.1 In `popupopen` handler (`app.js:1096-1128`), use `e.popup.getElement()` to get the popup DOM element
- [ ] 1.2 Scope `.popup-start` and `.popup-end` queries to that element instead of `document`
- [ ] 1.3 Verify: open popups, click Start/End 5+ times, confirm correct stop is set each time

## Phase 2 — Shape segment cache

- [ ] 2.1 In `showRoute()` (`app.js:1231-1271`), store segments from the first loop in an array
- [ ] 2.2 Reuse cached segments in the chevron loop instead of calling `getShapeSegment()` again
- [ ] 2.3 Verify: search a multi-leg route, confirm polylines and chevrons render identically

## Phase 3 — CSS improvements

- [ ] 3.1 Add `:root` block with custom properties for repeated color/spacing values in `styles.css`
- [ ] 3.2 Add `@media (prefers-reduced-motion: reduce)` to disable transitions and animations
- [ ] 3.3 Add `:focus-visible` outline styles for interactive elements
- [ ] 3.4 Verify: visual check unchanged, keyboard-tab through controls, toggle reduced-motion in DevTools

## Phase 4 — Data pipeline optimization

- [ ] 4.1 Move `stopTimesByTrip` map build (`prepare-data.mjs:388-392`) to before the route-edge loop at line 280
- [ ] 4.2 Replace `rawStopTimes.filter(st => st.trip_id === t.trip_id)` at line 286 with `stopTimesByTrip[t.trip_id]` lookup
- [ ] 4.3 Remove unused `createUnzip` import from line 4
- [ ] 4.4 Name any remaining magic numbers as constants
- [ ] 4.5 Verify: run `npm run prepare-data`, diff `data/ferry-data.json` — must be byte-identical to previous output

## Phase 5 — Modularize app.js into ES modules

Split the 2100-line IIFE into native ES modules. No bundler — `<script type="module">`.

### Module plan (~12 files)

| Module | Responsibility |
|--------|---------------|
| `js/data.js` | Fetch `ferry-data.json`, filter shuttles, build `stopById`/`routeById`/`schedulesByRoute` lookups |
| `js/state.js` | Shared mutable state (`lastSearch`, `currentOptions`, `shiftCount`, etc.), localStorage save/load |
| `js/time-utils.js` | `timeToMin`, `formatTime`, `formatDuration`, `serviceRunsOn`, `getTripsForRoute` |
| `js/routing.js` | 0-1 BFS (`bfsRoute`, `findRoutes`), `pathToLegs`, `expandLegStops`, `resolveScheduleAt`, `findOptions` |
| `js/map-core.js` | Leaflet init, tile layers, stop markers with popups, return-to-NYC overlay, preview markers |
| `js/route-drawing.js` | `highlightLayers`, `clearHighlights`, `smoothLine`, `getShapeSegment`, `showRoute`, `addChevronToSegment` |
| `js/directions.js` | `renderLegs`, `buildTabHtml`, `showDirections`, tab swipe handler, nav arrows |
| `js/datetime-input.js` | Date/time input normalization, date-picker modal, display formatting |
| `js/modals.js` | About modal, nerd modal, body-lock utilities |
| `js/sheet.js` | Bottom sheet drag, snap states, resize handling, map overlay |
| `js/settings.js` | Settings drawer, map style switching, time format, geolocation |
| `app.js` | Entry point — imports all modules, orchestrates init, handles GO button + share + URL params |

### Implementation steps

- [ ] 5.1 Create `js/` directory
- [ ] 5.2 Extract `js/data.js` — data loading, filtering, lookups
- [ ] 5.3 Extract `js/state.js` — shared state object + localStorage persistence
- [ ] 5.4 Extract `js/time-utils.js` — time parsing/formatting, schedule helpers
- [ ] 5.5 Extract `js/routing.js` — BFS, path resolution, option finding
- [ ] 5.6 Extract `js/map-core.js` — Leaflet setup, markers, popups, return overlay
- [ ] 5.7 Extract `js/route-drawing.js` — highlight/polyline/chevron rendering
- [ ] 5.8 Extract `js/directions.js` — directions display, tab UI, swipe handler
- [ ] 5.9 Extract `js/datetime-input.js` — date/time input management
- [ ] 5.10 Extract `js/modals.js` — modal open/close, body lock
- [ ] 5.11 Extract `js/sheet.js` — bottom sheet, drag, snap
- [ ] 5.12 Extract `js/settings.js` — settings drawer, geolocation
- [ ] 5.13 Rewrite `app.js` as entry point — imports + orchestration
- [ ] 5.14 Update `index.html` — add `type="module"` to dynamic script tag
- [ ] 5.15 Verify: full regression — all features work, no console errors, mobile + desktop

## Verification Matrix

| Phase | Verification |
|-------|-------------|
| 1 | Open popups, click Start/End 5+ times, confirm correct stop set |
| 2 | Search multi-leg route, confirm polylines + chevrons identical |
| 3 | Visual check, keyboard-tab controls, toggle reduced-motion in DevTools |
| 4 | `npm run prepare-data`, diff ferry-data.json — must be byte-identical |
| 5 | Full regression — search, swipe tabs, mobile sheet, settings, share, URL params |
