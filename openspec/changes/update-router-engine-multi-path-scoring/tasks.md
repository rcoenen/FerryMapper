## 1. Implementation
- [ ] 1.1 Add bounded candidate-path enumeration in the router engine (multiple unique topology paths, not just one)
- [ ] 1.2 Deduplicate candidate paths by normalized leg/transfer sequence before schedule scoring
- [ ] 1.3 Refactor schedule resolution to score a set of candidate paths and return the best complete itinerary for a given search time/mode
- [ ] 1.4 Update `findOptions()` to use candidate-path scoring for `Earlier`, `Requested`, and `Later` options
- [ ] 1.5 Add mode-aware ranking comparators (`depart` vs `arrive`) with explicit tie-breakers
- [ ] 1.6 Capture router decision metadata (chosen path summary, runner-up summary, reason text) and surface it to the UI/debug output
- [ ] 1.7 Add performance safeguards (candidate cap, schedule lookup indexing/caching) and verify no major UX regression

## 2. Validation
- [ ] 2.1 Manual regression test common routes (including Atlantic Ave/BBP Pier 6 -> East 90th St) in both `Depart at` and `Arrive by`
- [ ] 2.2 Confirm `Earlier / Requested / Later` tabs still navigate correctly and may change transfer hubs when schedule-optimal
- [ ] 2.3 Compare at least 10 sample searches before/after and record cases where route choice improves or remains equivalent
- [ ] 2.4 Run `openspec validate update-router-engine-multi-path-scoring --strict`
