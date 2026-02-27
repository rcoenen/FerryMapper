# Project Context

## Purpose
NYC Ferry Trip Planner — a lightweight web app for planning routes across the NYC Ferry system. Users pick origin/destination stops on an interactive map, choose a date/time, and get step-by-step ferry directions with real schedule data, transfer times, and multiple trip options.

## Tech Stack
- **Frontend**: Single `index.html` (HTML + CSS + JS) — no frameworks, no build tools
- **Map**: Leaflet.js via CDN, OpenStreetMap tiles
- **Data pipeline**: Node.js script (`prepare-data.mjs`) — downloads and parses GTFS feed
- **Package manager**: npm
- **Dependencies**: `unzipper` (for GTFS zip extraction), `serve` (local dev server)
- **Hosting**: GitHub Pages (static site served from `master` branch)

## Project Conventions

### Code Style
- Client code split into `index.html` (markup), `styles.css`, and `app.js`
- No TypeScript, no JSX, no transpilation — plain vanilla JS
- 24-hour military time format for all time displays
- Template literals for HTML generation
- `const`/`let` only (no `var`)

### Architecture Patterns
- **No-build app**: `index.html` + `styles.css` + `app.js` — no module bundling
- **0-1 BFS routing**: State = `(stopId, routeId)`, transfers cost 1, same-route travel costs 0. Minimizes transfers first, then stops.
- **Schedule resolution**: After BFS finds abstract route, `resolveScheduleAt()` maps it onto real GTFS trip times. `findNextTripAnyRoute()` checks ALL routes serving a stop pair, not just the BFS-suggested route.
- **3-option display**: Earlier/Requested/Later tabs with ‹/› nav buttons to shift the window
- **Client-side filtering**: Shuttle bus routes (RES/RWS) are filtered out client-side after loading `ferry-data.json`
- **localStorage persistence**: Search state (from, to, date, time, mode) saved across sessions

### Testing Strategy
- Manual testing via Chrome DevTools MCP or browser
- No automated test suite currently
- Test routes: Atlantic Ave→Greenpoint, Atlantic Ave→East 90th St, Atlantic Ave→Beach Channel Dr

### Git Workflow
- Single `master` branch, push directly
- Commit messages: imperative mood, brief description of what changed
- Co-authored with Claude: `Co-Authored-By: Claude Opus 4.6 <noreply@anthropic.com>`
- GitHub Pages auto-deploys from `master`

## Domain Context
- **GTFS**: General Transit Feed Specification — standard format for public transit data
- **NYC Ferry**: Operated by Hornblower, ~25 ferry stops across 5 active routes (Astoria, East River, Rockaway-Soundview, South Brooklyn, St. George)
- **Shuttle bus routes** (RES/RWS): Bus connections in the Rockaways — excluded from routing as they're not ferries
- **Transfer time**: 10-minute minimum between ferry connections. Ferries don't coordinate schedules with each other. At large piers like Pier 11, slips can be 400-600ft apart.
- **Stop deduplication**: GTFS has duplicate stop entries per route; the data pipeline merges stops by name and proximity (<200m)
- **Route shapes**: GTFS provides multiple shapes per route (different trip patterns); we pick the longest shape to cover the full route path

## Important Constraints
- No build step — must work as static files served directly
- All routing is client-side (no backend server)
- GTFS data is baked into `data/ferry-data.json` at build time via `npm run prepare-data`
- Route `RW` (Rockaway) is defined in GTFS but has no active trips

## External Dependencies
- **GTFS feed**: `https://nycferry.connexionz.net/rtt/public/utility/gtfs.aspx` — NYC Ferry schedule data (zip file)
- **Leaflet CDN**: `unpkg.com/leaflet@1.9.4` — map library
- **OpenStreetMap tiles**: `tile.openstreetmap.org` — map tile imagery
- **GitHub Pages**: `rcoenen.github.io/FerryMapper` — live hosting

## Key Files
| File | Purpose |
|------|---------|
| `index.html` | Page markup and structure |
| `styles.css` | All CSS styles |
| `app.js` | All client-side JavaScript |
| `prepare-data.mjs` | Downloads GTFS zip, parses CSVs, outputs `ferry-data.json` |
| `data/ferry-data.json` | Generated data: 25 stops, 5 routes, 503 trip schedules, routing graph |
| `package.json` | Scripts: `prepare-data`, `start` |
