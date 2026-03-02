## ADDED Requirements

### Requirement: Event Listener Scoping
Popup button event listeners SHALL be scoped to the popup DOM element rather than querying the global document, preventing listener accumulation across popup opens.

#### Scenario: Popup button targets correct stop
- **WHEN** a user opens a stop popup and clicks the "Start" or "End" button
- **THEN** only the button within that popup is activated, setting the correct stop value

#### Scenario: Repeated popup opens do not accumulate handlers
- **WHEN** a user opens and closes multiple popups in sequence
- **THEN** each popup open attaches listeners only to the current popup's buttons

### Requirement: Route Rendering Computation Cache
The `showRoute()` function SHALL cache shape segment lookups from the polyline rendering loop and reuse them in the chevron placement loop, eliminating duplicate `getShapeSegment()` calls per leg.

#### Scenario: Cached segments produce identical output
- **WHEN** a multi-leg route is displayed on the map
- **THEN** polylines and directional chevrons render identically to the uncached version

### Requirement: CSS Accessibility Features
The stylesheet SHALL include a `prefers-reduced-motion` media query that disables transitions and animations, and `:focus-visible` outline styles for keyboard navigation.

#### Scenario: Reduced motion preference honored
- **WHEN** the user has `prefers-reduced-motion: reduce` enabled in their OS settings
- **THEN** all CSS transitions and animations are disabled

#### Scenario: Keyboard focus indicators visible
- **WHEN** a user navigates interactive elements using the keyboard
- **THEN** focused elements display a visible outline via `:focus-visible`

### Requirement: Data Pipeline Efficiency
The data preparation script SHALL pre-build a `stopTimesByTrip` lookup map before iterating over trips for route-edge collection, replacing the O(n*m) linear filter with an O(1) map lookup per trip.

#### Scenario: Pre-built map eliminates redundant filtering
- **WHEN** the `prepare-data.mjs` script processes trip stop sequences at the route-edge loop
- **THEN** it uses the pre-built `stopTimesByTrip` map instead of filtering `rawStopTimes` for each trip

#### Scenario: Output data unchanged
- **WHEN** the data pipeline runs with the optimization
- **THEN** the output `ferry-data.json` is byte-identical to the previous version

### Requirement: ES Module Architecture
The application SHALL be structured as native ES modules loaded via `<script type="module">`, with no bundler required. The monolithic `app.js` SHALL be split into focused modules each owning a single domain (data, routing, map, drawing, directions, sheet, modals, settings, etc.), with shared mutable state centralized in a dedicated state module.

#### Scenario: Modules load without bundler
- **WHEN** the application is served as static files
- **THEN** all modules load via native `import`/`export` with `<script type="module">` and no build step is required

#### Scenario: Module boundaries enforce separation of concerns
- **WHEN** a developer modifies routing logic
- **THEN** the change is isolated to the routing module and does not require editing map rendering or UI code

#### Scenario: Application behavior unchanged after modularization
- **WHEN** the monolithic `app.js` is replaced with ES modules
- **THEN** all existing features (search, route display, mobile sheet, settings, sharing, URL params) work identically
