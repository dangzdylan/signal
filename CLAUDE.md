# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev       # start Vite dev server (hot reload)
npm run build     # tsc -b && vite build → dist/
npm run lint      # eslint .
npm run preview   # serve the dist/ build locally
```

No test framework is configured.

## What this is

A fully hardcoded, in-browser demo of ambulance V2I (Vehicle-to-Infrastructure) traffic signal preemption. No network calls, no backend — everything runs in React state and `requestAnimationFrame`. The ambulance follows a fixed polyline route along Shattuck Ave and Ashby Ave in Berkeley; "routing" is purely simulated preemption along that path.

## Architecture

### Single source of truth: `useSimulation` (`src/simulation/useSimulation.ts`)

All simulation state lives here. A single `requestAnimationFrame` loop advances time and delegates to:

- `advanceTrafficLights()` — traffic light FSM
- `comsFromEvent()` — V2I log message generation

Mutable sim state is kept in a `simRef` (avoids closure staling in the rAF loop); derived display values (`speedKmh`, `etaSec`, `solutionStep`, impact counters) are computed on every render from the React state snapshot. `pumpUiFromRef()` syncs the ref into React state each frame.

### Traffic light FSM (`src/simulation/trafficLightLogic.ts`)

Three modes per corridor light:
- **normal** — free-running cycle (red 0–4 s, yellow 4–5.5 s, green 5.5–9 s) offset per intersection so they don't all sync.
- **arming** — ambulance entered lookahead range; light transitions through yellow clearance (800–2600 ms, closer = faster) before locking green. Shown with an amber dashed halo.
- **preempt** — forced solid green. Released `POST_PASS_BUFFER` (40 m) after the ambulance passes. Shown with cyan TSP ring.

`PREEMPT_LOOKAHEAD = 600 m` covers ~3 Shattuck intersections ahead. Background lights (`onCorridor: false` or `distanceAlongPath: -1`) never receive preemption.

### Message / comms bus (`src/simulation/messageBus.ts`)

Translates `LightSimEvent` values into `CommsMessage` rows attributed to one of four `CommsSource` departments: `AVL`, `PWD`, `EBRICS`, `ITSS`. Module-level mutable state (`sessionMap`, `msgCounter`) must be reset via `resetCommsState()` when the user hits Reset.

### Static data (`src/data/`)

| File | Contents |
|---|---|
| `route.ts` | Fixed WAYPOINTS polyline (lat/lng), `sampleRoute(p)`, `getLookaheadPath()`, `getNextManeuver()`, Haversine distance helpers |
| `cityLayout.ts` | `INITIAL_TRAFFIC_LIGHTS` — corridor lights from OSM traffic_signals nodes, decorative lights from Berkeley streetlight dataset |
| `scenario.ts` | Fake dispatch metadata, `SCENARIO_DURATION_SEC` (88 s), `BASELINE_DURATION_SEC` (175 s) |
| `messageTemplates.ts` | String-template functions for each log line type |

All timing derivations (ETA, `timeSavedSec`, `solutionStep` transitions) are proportional to `SCENARIO_DURATION_SEC` / `BASELINE_DURATION_SEC`.

### Coordinate system

`Point2 { x, y }` encodes **`x = longitude`, `y = latitude`** (decimal degrees). Route segments use Haversine distance in meters. All simulation constants (`PREEMPT_LOOKAHEAD`, `POST_PASS_BUFFER`) are in meters.

Corridor traffic light positions come from OSM Overpass API `traffic_signals` nodes along Shattuck/Ashby. Decorative background light positions come from the City of Berkeley Streetlights dataset (`dz4s-un9u`, 2014-2015 LED conversion survey), fetched at planning time and hardcoded.

### Map rendering (`src/components/MapShell.tsx`)

`MapShell` wraps a react-leaflet `MapContainer` with CartoDB Positron (light) tiles. Inside it, `SvgOverlay` (an inner component that calls `useMap()`) absolutely positions a full-size `<svg>` over the map at `z-index: 450`.

On every Leaflet `move`, `zoomend`, and `resize` event, `SvgOverlay` calls `map.latLngToContainerPoint([lat, lng])` for every waypoint, traffic light, and ambulance position, and re-renders all SVG elements with the resulting pixel coordinates. The `Ambulance` and `TrafficLight` components accept arbitrary `x, y` pixel numbers and require no changes when the map pans or zooms.

### UI layout (`src/App.tsx` + `src/components/`)

`App.tsx` receives the full `UseSimulationReturn` object from `useSimulation()` and fans props into stateless display components. Components do not own simulation logic.

Key layout pieces: `DispatchPanel` (top strip), `SolutionSteps` (5-phase tracker), `MapShell` (Leaflet map + SVG overlay), `DriverHUD` (right panel), `ImpactCounter` (time-saved strip), `CommsLog` (scrolling V2I terminal), `ControlBar` (Start/Pause/Reset + speed buttons).

### Theme

Light mode. CSS custom properties in `src/styles/globals.css`:
- `--ink: #1a2035` — primary text
- `--panel: #ffffff` — panel backgrounds
- `--line: rgba(80,100,150,0.18)` — borders
- `--accent: #0f6cbd` — interactive blue
- `--warn: #c96000` — amber warning
- `--ok: #1a7a40` — success green

All values pass WCAG AA contrast on white. Traffic light SVG housings intentionally keep dark fills (realistic signal head appearance).
