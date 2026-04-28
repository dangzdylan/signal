/**
 * Berkeley intersection layout: corridor traffic lights along Shattuck/Ashby
 * (the active V2I corridor) plus a few decorative off-corridor lights on
 * parallel streets to make the surrounding city feel alive.
 *
 * All coordinates are real-world OSM `traffic_signals` node positions
 * (Point2: x = lng, y = lat). Cycle offsets are spread across the full
 * 9-second free cycle so the city shows a realistic mix of red/yellow/green
 * before any V2I priority is requested.
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

  // Decorative: signalized Berkeley intersections on parallel streets, off
  // the active corridor. Coordinates are real OSM signal nodes so they sit
  // exactly on the road geometry.
  const bg: Omit<TrafficLightState, 'id'>[] = [
    // University Ave & Milvia St (one block west of Shattuck)
    { x: -122.2730, y: 37.8716, distanceAlongPath: -1, phase: phaseAt(0, 700), mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 700, onCorridor: false },
    // Bancroft Way & Milvia St
    { x: -122.2727, y: 37.8688, distanceAlongPath: -1, phase: phaseAt(0, 5200), mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 5200, onCorridor: false },
    // Bancroft Way & Telegraph Ave (east side of campus)
    { x: -122.2592, y: 37.8687, distanceAlongPath: -1, phase: phaseAt(0, 2900), mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 2900, onCorridor: false },
    // Dwight Way & Telegraph Ave
    { x: -122.2586, y: 37.8642, distanceAlongPath: -1, phase: phaseAt(0, 7400), mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 7400, onCorridor: false },
    // Ashby Ave & Martin Luther King Jr Way (west of corridor end)
    { x: -122.2692, y: 37.8549, distanceAlongPath: -1, phase: phaseAt(0, 4100), mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 4100, onCorridor: false },
  ];
  const bgWithIds: TrafficLightState[] = bg.map((b, k) => ({
    ...b,
    id: `TL-B${k + 1}`,
  }));

  return [...corridor, ...bgWithIds];
}

/**
 * One-time seed for the engine; a fresh copy is cloned in `useSimulation` on
 * reset so the user can replay the same choreography.
 */
export const INITIAL_TRAFFIC_LIGHTS: TrafficLightState[] = buildInitialLights();
