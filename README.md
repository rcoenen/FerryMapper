# NYC Ferry Trip Planner

A lightweight, no-framework trip planner for the NYC Ferry system. Plan routes across all active ferry lines with real schedule data, transfer times, and multiple trip options.

![Screenshot](screenshot.png)

## Features

- **Route planning** across 39 stops and 7 active ferry routes
- **Schedule-aware** — uses real GTFS departure/arrival times
- **Transfer optimization** — 10-minute minimum transfer time, finds fastest connections
- **3 trip options** with Earlier/Requested/Later tabs and navigation
- **Depart at / Arrive by** mode
- **Interactive map** with route highlighting, stop popups, and clickable A/B markers
- **Persists search state** in localStorage across sessions

## How it works

1. **Data pipeline** (`prepare-data.mjs`) downloads the NYC Ferry GTFS feed, parses stop/route/schedule data, deduplicates stops, and builds a routing graph
2. **Client-side routing** uses 0-1 BFS to find optimal paths minimizing transfers first, then stops
3. **Schedule resolution** maps abstract routes onto real trip times, checking all serving routes per leg

## Getting started

```bash
npm install
npm run prepare-data   # downloads GTFS feed → data/ferry-data.json
npm start              # serves on localhost
```

## Tech stack

- Single `index.html` — no build tools, no frameworks
- [Leaflet](https://leafletjs.com/) + OpenStreetMap tiles
- Node.js script for GTFS data preparation
- GTFS source: [NYC Ferry Connexionz feed](https://nycferry.connexionz.net/rtt/public/utility/gtfs.aspx)

## Data

The `data/ferry-data.json` file contains:
- **39 stops** (ferry terminals + shuttle bus stops)
- **7 active routes** (Astoria, East River, South Brooklyn, Soundview, St. George, plus shuttles)
- **503 trip schedules** with full stop times
- Pre-built routing graph with edges from all trip patterns per route
