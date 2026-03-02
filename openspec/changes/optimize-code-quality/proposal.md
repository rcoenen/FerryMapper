# Change: Optimize Code Quality and Modularize

## Why

A code audit of the codebase at `1541c3f` found event listener scoping bugs, duplicate computation in route rendering, missing CSS accessibility features, an O(n*m) data pipeline inefficiency, and a 2100-line monolithic `app.js` that mixes routing, map rendering, UI state, and input handling in a single IIFE.

## What Changes

1. **Popup listener scoping** — Scope `.popup-start`/`.popup-end` queries to the popup element instead of `document`, preventing stale listeners from accumulating (`app.js:1096-1128`)
2. **Shape segment cache** — Cache segments from the polyline loop and reuse in the chevron loop, eliminating duplicate `getShapeSegment()` calls (`app.js:1231-1271`)
3. **CSS improvements** — Add `:root` custom properties, `prefers-reduced-motion` media query, and `:focus-visible` outline styles (`styles.css`)
4. **Data pipeline optimization** — Move `stopTimesByTrip` map build before line 280 to eliminate O(n*m) filter, remove unused `createUnzip` import, name magic numbers (`prepare-data.mjs`)
5. **Modularize app.js** — Split the 2100-line IIFE into ~12 native ES modules under `js/`. No bundler — uses `<script type="module">` and `import`/`export`. Each module owns its domain: data loading, routing, map, drawing, directions, sheet, modals, settings, etc. Shared mutable state lives in `js/state.js`. The entry point (`app.js`) imports and orchestrates initialization.

Phase 5 absorbs the originally planned "extract swipe handler" and "group global state" tasks — those happen naturally when splitting into modules.

## Impact

- Affected specs: `code-quality` (new capability)
- Affected code: `app.js`, `styles.css`, `prepare-data.mjs`, `index.html`, new `js/*.js` files
- No breaking changes — all fixes are behavior-preserving
- Phases 1–4 are independently committable before the modularization
