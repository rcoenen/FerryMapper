// FerryMapperNYC - Documented configuration constants

export const CONFIG = {
  // === Routing Algorithm ===
  MAX_CANDIDATE_ROUTES: 3,        // Number of alternative routes to show
  MIN_TRANSFER_TIME_MIN: 10,      // Minimum transfer time between ferries (minutes)
  TRANSFER_PENALTY_COST: 2,       // Extra penalty cost for transfers at busy stops
  
  // === Data Processing ===
  STOP_MERGE_DISTANCE_M: 200,     // Merge stops within this distance (meters)
  
  // === Schedule Search ===
  SCHEDULE_SEARCH_BACK_ARRIVE_MIN: 360,  // How far back to search for 'arrive by' mode (minutes)
  SCHEDULE_SEARCH_FWD_ARRIVE_MIN: 120,   // Forward search for 'arrive by' mode (minutes)
  SCHEDULE_SEARCH_BACK_DEPART_MIN: 120,  // Backward search for 'depart at' mode (minutes)
  SCHEDULE_SEARCH_FWD_DEPART_MIN: 180,   // Forward search for 'depart at' mode (minutes)
  SCHEDULE_SEARCH_STEP_MIN: 5,           // Search interval (minutes)
  
  // === UI Thresholds ===
  SHEET_BREAKPOINT_PX: 1024,      // Desktop/mobile breakpoint (pixels)
  FLICK_VELOCITY_THRESHOLD: 0.4,  // px/ms for flick gesture detection
  DRAG_TOGGLE_PERCENT: 35,        // % of sheet height to trigger snap toggle
  MAP_RETURN_OVERLAY_DIST_M: 5000, // meters from NYC to show "return to NYC" overlay
  
  // === BFS Algorithm ===
  MAX_EDGE_COST: 2,               // Maximum edge weight for bucket queue sizing
  
  // === Storage Keys ===
  STORAGE_KEY: 'ferryMapperNYC',
  STORAGE_KEY_STYLE: 'ferryMapperNYCStyle',
  STORAGE_KEY_LOCATION: 'ferryMapperNYCLocation',
  STORAGE_KEY_TIME_FMT: 'ferryMapperNYCTimeFmt',
  
  // === Shuttle Routes (to filter out) ===
  SHUTTLE_ROUTE_IDS: ['RES', 'RWS'],
};

export default CONFIG;
