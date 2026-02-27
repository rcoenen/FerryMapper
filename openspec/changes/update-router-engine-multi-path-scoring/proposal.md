# Change: Improve Router Engine with Schedule-Scored Candidate Paths

## Why
The current router chooses a single topology (fewest transfers, then fewest stops) before applying schedules. This can produce suboptimal transfer choices when a near-best path has a much better timed connection (for example, different transfer hubs such as East 34th St vs Pier 11).

## What Changes
- Add bounded multi-path candidate search for routing topologies instead of selecting only one abstract path.
- Score candidate paths using real GTFS schedule outcomes before choosing the displayed itinerary.
- Apply the same candidate-path scoring to `Earlier / Requested / Later` option generation.
- Add router decision metadata so the app can explain why a transfer point/path was chosen.
- Add performance safeguards (candidate caps, indexing/caching) to avoid regressions in client-side search time.

## Impact
- Affected specs: `trip-routing`
- Affected code: `/Users/rob/Dev/FerryMapper/app.js` (`findRoute`, schedule resolution, option generation, UI rendering of route-choice reasoning), possible lightweight data-index support in `/Users/rob/Dev/FerryMapper/app.js`
- Behavioral impact: itinerary selection may change for some searches because results will be optimized by actual schedule outcomes instead of topology alone
