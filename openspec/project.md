# Project Context

## Purpose
FerryMapperNYC is a web application that helps users plan NYC Ferry trips with transfers across multiple ferry lines. It provides route planning, schedule information, and interactive mapping for the NYC Ferry system.

## Tech Stack
- **Frontend**: Vanilla JavaScript (ES modules), HTML5, CSS3
- **Mapping**: Leaflet.js for interactive maps
- **Data Processing**: Node.js with custom CSV parsing
- **Build**: No build system (served as static files)
- **Data Source**: NYC Ferry GTFS feed
- **Dependencies**: Leaflet, Font Awesome, unzipper

## Project Conventions

### Code Style
- Vanilla JavaScript with modern ES6+ features
- IIFE pattern for main application code
- Minimal framework usage - direct DOM manipulation
- Inline comments for complex logic
- LocalStorage for client-side state persistence

### Architecture Patterns
- Single-page application with client-side routing
- Data-driven architecture with pre-processed ferry data
- Event-driven UI updates
- Separation of data processing (Node.js) and presentation (browser JS)

### Testing Strategy
- Manual testing in browser
- No automated test suite currently
- Data validation during GTFS processing

### Git Workflow
- Single master branch
- Direct commits to master
- No formal pull request process
- Version tracking via build.json

## Domain Context
- NYC Ferry system with multiple routes and transfer points
- GTFS (General Transit Feed Specification) data format
- Real-time schedule planning with transfer calculations
- Geographic routing between ferry terminals

## Important Constraints
- Must work offline after initial load (data cached)
- Mobile-first responsive design
- No backend service - all processing client-side
- Data updates require manual GTFS download and processing

## External Dependencies
- NYC Ferry GTFS feed (https://nycferry.connexionz.net)
- Leaflet.js CDN (https://unpkg.com/leaflet@1.9.4)
- Font Awesome CDN (https://cdnjs.cloudflare.com)
- unzipper npm package for GTFS processing
