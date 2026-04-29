/**
 * Berkeley intersection layout: corridor traffic lights along Shattuck/Ashby
 * (the active V2I corridor). Coordinates are real-world OSM `traffic_signals`
 * node positions (Point2: x = lng, y = lat). Background city streetlights are
 * fetched live from the City of Berkeley dataset (dz4s-un9u) in MapShell.
 */
import type { LightPhase, TrafficLightState } from '../types';
import { ROUTE, getCumulativeAt } from './route';

/**
 * Map view defaults consumed by the Leaflet container.
 * Center is roughly mid-corridor on Shattuck near Bancroft so the entire
 * route fits at default zoom.
 */
export const MAP_VIEW = {
  center: [37.8640, -122.2660] as [number, number],
  zoom: 15,
  bounds: [
    [37.8540, -122.2740],
    [37.8740, -122.2530],
  ] as [[number, number], [number, number]],
};

/** Free-cycle phase math (mirrors trafficLightLogic.phaseFromFreeCycle). */
const CYCLE_MS = 9000;
const RED_END = 4000;
const YELLOW_END = 5500;

function phaseAt(timeMs: number, offset: number): LightPhase {
  const c = (timeMs + offset) % CYCLE_MS;
  if (c < RED_END) return 'red';
  if (c < YELLOW_END) return 'yellow';
  return 'green';
}

/**
 * Build initial traffic light states: corridor (V2I target) + background
 * (visual only). Corridor lights skip the route's start/end waypoints
 * (fire-station driveway, hospital ER bay) which are not real signals.
 */
function buildInitialLights(): TrafficLightState[] {
  const wps = ROUTE.waypoints;
  const corridor: TrafficLightState[] = wps.slice(1, -1).map((p, k) => {
    const i = k + 1; // waypoint index in ROUTE
    // Spread offsets across the full cycle so initial colors look like a
    // real intersection grid rather than a synthetic stagger.
    const offset = (k * 1600) % CYCLE_MS;
    return {
      id: `TL-${String(i).padStart(2, '0')}`,
      x: p.x,
      y: p.y,
      distanceAlongPath: getCumulativeAt(i),
      phase: phaseAt(0, offset),
      mode: 'normal' as const,
      preemptReleaseAt: null,
      cycleTimeOffset: offset,
      onCorridor: true,
    };
  });

  return corridor;
}

/**
 * One-time seed for the engine; a fresh copy is cloned in `useSimulation` on
 * reset so the user can replay the same choreography.
 */
export const INITIAL_TRAFFIC_LIGHTS: TrafficLightState[] = buildInitialLights();
