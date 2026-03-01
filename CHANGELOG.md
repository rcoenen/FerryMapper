# FerryMapperNYC Changelog

## [Unreleased]

## [1.1.0] - 2024-03-01
### Added
- Comprehensive code quality improvements and architectural refactoring
- Modular codebase structure with 7 focused modules:
  - `data.js`: Data loading and processing
  - `state.js`: State management and localStorage integration
  - `ui.js`: UI components and DOM manipulation
  - `utils.js`: Utility functions (sanitization, validation, debounce/throttle)
  - `routing.js`: Route finding algorithms and time formatting
  - `map.js`: Map integration with Leaflet and location tracking
  - `main.js`: Main application entry point

### Changed
- **Architecture**: Complete refactoring from monolithic `app.js` to modular ES6 modules
- **Error Handling**: Added comprehensive try-catch blocks with user-friendly error messages
- **Naming Conventions**: Standardized to camelCase for variables, UPPER_CASE for constants
- **Performance**: Optimized routing algorithms with debounce/throttle utilities
- **Security**: Implemented input sanitization and validation
- **Map Styles**: Restored original map styles (positron, darkMatter, osm) with proper defaults
- **Location Tracking**: Updated to Google Maps-style blue pulse dot animation

### Fixed
- Hamburger menu/settings drawer functionality
- Location tracking implementation with proper map parameter passing
- Map style switching with localStorage persistence
- Various edge cases in state management and error handling

### Technical Improvements
- **Separation of Concerns**: Clear division between data, logic, and presentation layers
- **Maintainability**: Modular structure makes future changes easier
- **Testability**: Decoupled components enable easier unit testing
- **Performance**: Optimized algorithms and efficient data structures
- **Documentation**: Added JSDoc comments and clear module boundaries

### Breaking Changes
- None - all existing functionality preserved
- Backward compatible with previous data formats and APIs

### Development Process
- Added proper co-author attribution for Mistral Vibe contributions
- Created comprehensive task tracking and specification documents
- Implemented OpenSpec proposal system for future development

## [1.0.0] - 2024-02-27
### Added
- Initial release of FerryMapperNYC
- NYC Ferry route planning with transfers
- Interactive map with Leaflet integration
- Real-time schedule lookup
- Mobile-responsive design
- Location-based services
- Multiple map style options

[Unreleased]: https://github.com/rcoenen/FerryMapperNYC/compare/v1.1.0...HEAD
[1.1.0]: https://github.com/rcoenen/FerryMapperNYC/compare/v1.0.0...v1.1.0
[1.0.0]: https://github.com/rcoenen/FerryMapperNYC/releases/tag/v1.0.0