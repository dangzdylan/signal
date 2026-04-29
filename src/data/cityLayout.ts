/**
 * Berkeley intersection layout: corridor traffic lights along MLK Jr Way/Ashby
 * (the active V2I corridor). Coordinates are real-world OSM `traffic_signals`
 * node positions (Point2: x = lng, y = lat). Background city streetlights are
 * fetched live from the City of Berkeley dataset (dz4s-un9u) in MapShell.
 */
import type { LightPhase, TrafficLightState } from '../types';
import { ROUTE, getCumulativeAt } from './route';

/**
 * Map view defaults consumed by the Leaflet container.
 * Center is mid-route on MLK Jr Way. The route runs from Station 2
 * (lat 37.873, lng -122.269) → west on Berkeley Way → south on MLK Jr Way
 * (lng -122.272 to -122.273) → east on Ashby Ave → Alta Bates (lng -122.258).
 */
export const MAP_VIEW = {
  center: [37.864, -122.265] as [number, number],
  zoom: 15,
  bounds: [
    [37.852, -122.276],
    [37.876, -122.255],
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
 * Build initial traffic light states for the corridor. Skips waypoints 0 and
 * 15 (fire-station driveway and hospital ER bay, which are not real signals).
 * Waypoints 1-14 are real OSM traffic_signals nodes on MLK Jr Way and Ashby Ave.
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
