## ADDED Requirements

### Requirement: Candidate Path Enumeration
The router engine SHALL enumerate and evaluate multiple unique topology candidate paths between the selected origin and destination before selecting an itinerary to display.

#### Scenario: Distinct transfer hubs are both considered
- **WHEN** two or more paths have similar topology cost but transfer at different hubs
- **THEN** the router includes multiple unique candidate paths in the evaluation set
- **AND** the final choice is not limited to the first topology path discovered

#### Scenario: Candidate search is bounded
- **WHEN** many alternative topology paths exist between the same stops
- **THEN** the router limits candidate enumeration using a configured cap and pruning strategy
- **AND** the search returns a deterministic candidate set for the same inputs and data

### Requirement: Schedule-Scored Itinerary Selection
The router engine SHALL select the displayed itinerary using resolved GTFS schedule outcomes for candidate paths rather than topology metrics alone.

#### Scenario: A near-best topology wins because of better timing
- **WHEN** a candidate path has equal or slightly worse topology cost but yields an earlier arrival (or valid later departure for arrive-by) after schedule resolution
- **THEN** the router selects that candidate path as the displayed itinerary
- **AND** topology metrics are used only as tie-breakers after schedule-based ranking criteria

#### Scenario: Incomplete schedule resolutions are deprioritized
- **WHEN** one or more candidate paths cannot be fully resolved for the requested date/time
- **THEN** the router prefers complete resolved itineraries over incomplete candidates
- **AND** the search still returns the best available complete itinerary if one exists

### Requirement: Mode-Aware Ranking Semantics
The router engine SHALL rank resolved candidate itineraries using mode-specific criteria for `Depart at` and `Arrive by` searches.

#### Scenario: Depart-at prioritizes travel outcome after requested time
- **WHEN** the user performs a `Depart at` search
- **THEN** candidate itineraries are ranked primarily by actual arrival outcome after the requested departure window
- **AND** ties are broken using total travel time, transfer count, and transfer wait metrics in a deterministic order

#### Scenario: Arrive-by prioritizes latest feasible departure
- **WHEN** the user performs an `Arrive by` search
- **THEN** the router prefers itineraries that arrive on or before the target time
- **AND** among valid on-time itineraries, it selects the itinerary with the latest departure
- **AND** ties are broken using total travel time, transfer count, and transfer wait metrics in a deterministic order

### Requirement: Candidate-Scored Option Tabs
The router engine SHALL apply candidate-path schedule scoring when computing the `Earlier`, `Requested`, and `Later` option tabs.

#### Scenario: Option tabs can choose different transfer hubs
- **WHEN** the best itinerary for the `Requested` time differs from the best itinerary for an `Earlier` or `Later` option due to schedule timing
- **THEN** each option tab may display a different candidate path or transfer hub
- **AND** each displayed option reflects the best scored candidate itinerary for that option's time window

#### Scenario: Tab navigation remains stable
- **WHEN** the user shifts the option window with `‹` or `›`
- **THEN** the router recomputes options using the same candidate-path scoring process
- **AND** tab labels and selected itinerary remain internally consistent with the recomputed results

### Requirement: Router Decision Metadata
The router engine SHALL expose structured metadata describing why the selected itinerary was chosen over evaluated alternatives.

#### Scenario: Selection reason is available for debugging or UI display
- **WHEN** the router returns a selected itinerary
- **THEN** the result includes metadata identifying the chosen candidate path summary (including transfer stop(s))
- **AND** the metadata includes at least one schedule-based reason for selection (for example, earlier arrival or later feasible departure)
- **AND** the metadata can include runner-up candidate summaries for inspection
