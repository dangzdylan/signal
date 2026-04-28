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

A fully hardcoded, in-browser demo of ambulance V2I (Vehicle-to-Infrastructure) traffic signal preemption. No network calls, no backend — everything runs in React state and `requestAnimationFrame`. The ambulance follows a fixed polyline route; "routing" is purely simulated preemption along that path.

## Architecture

### Single source of truth: `useSimulation` (`src/simulation/useSimulation.ts`)

All simulation state lives here. A single `requestAnimationFrame` loop advances time and delegates to:

- `advanceTrafficLights()` — traffic light FSM
- `comsFromEvent()` — V2I log message generation

Mutable sim state is kept in a `simRef` (avoids closure staling in the rAF loop); derived display values (`speedKmh`, `etaSec`, `solutionStep`, impact counters) are computed on every render from the React state snapshot. `pumpUiFromRef()` syncs the ref into React state each frame.

### Traffic light FSM (`src/simulation/trafficLightLogic.ts`)

Two modes per light:
- **normal** — free-running cycle (red 0–4 s, yellow 4–5.5 s, green 5.5–9 s) offset per intersection so they don't sync.
- **preempt** — forced green when the ambulance is within `PREEMPT_LOOKAHEAD` (420 path units) ahead of the light. Released `POST_PASS_BUFFER` (35 units) after the ambulance passes.

Lights with `onCorridor: false` never receive preemption (background decoration only). Lights with `distanceAlongPath: -1` are also decorative.

### Message / comms bus (`src/simulation/messageBus.ts`)

Translates `LightSimEvent` values into `CommsMessage` rows attributed to one of four `CommsSource` departments: `AVL`, `PWD`, `EBRICS`, `ITSS`. Module-level mutable state (`sessionMap`, `msgCounter`) must be reset via `resetCommsState()` when the user hits Reset.

### Static data (`src/data/`)

| File | Contents |
|---|---|
| `route.ts` | Fixed WAYPOINTS polyline, `sampleRoute(p)`, `getLookaheadPath()`, `getNextManeuver()` |
| `cityLayout.ts` | `INITIAL_TRAFFIC_LIGHTS` array with `distanceAlongPath` values matching the route |
| `scenario.ts` | Fake dispatch metadata, `SCENARIO_DURATION_SEC` (88 s), `BASELINE_DURATION_SEC` (175 s) |
| `messageTemplates.ts` | String-template functions for each log line type |

All timing derivations (ETA, `timeSavedSec`, `solutionStep` transitions) are proportional to `SCENARIO_DURATION_SEC` / `BASELINE_DURATION_SEC`.

### UI layout (`src/App.tsx` + `src/components/`)

`App.tsx` receives the full `UseSimulationReturn` object from `useSimulation()` and fans props into stateless display components. Components do not own simulation logic.

Key layout pieces: `DispatchPanel` (top strip), `SolutionSteps` (5-phase tracker), `CityMap` (SVG map with lights, ambulance, and lookahead corridor overlay), `DriverHUD` (right panel), `ImpactCounter` (time-saved strip), `CommsLog` (scrolling V2I terminal), `ControlBar` (Start/Pause/Reset + speed buttons).

### Coordinates

SVG viewBox is `0 0 880 500`. Route waypoints and traffic light positions are in this space. `distanceAlongPath` on each `TrafficLightState` is Euclidean path length in those same units (not real meters).
