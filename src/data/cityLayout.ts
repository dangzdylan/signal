/**
 * Stylized neon city: street segments for the SVG and traffic light locations.
 * Coordinates are arbitrary but consistent with the route in `route.ts`.
 */
import type { StreetSegment, TrafficLightState, LightPhase } from '../types';
import { ROUTE } from './route';

const W = 880;
const H = 480;

/**
 * A sparse grid: horizontal and vertical "arteries" the brain reads as a city.
 * We draw these below the active route, so the red ambulance path still pops.
 */
function buildStreets(): StreetSegment[] {
  const hYs = [100, 200, 300, 400];
  const vXs = [100, 200, 300, 400, 500, 600, 700, 800];
  const segs: StreetSegment[] = [];
  let n = 0;
  hYs.forEach((y) => {
    n += 1;
    segs.push({ from: { x: 40, y }, to: { x: W, y }, id: `h${n}` });
  });
  vXs.forEach((x) => {
    n += 1;
    segs.push({ from: { x, y: 40 }, to: { x, y: H + 20 }, id: `v${n}` });
  });
  return segs;
}

export const STREET_SEGMENTS: StreetSegment[] = buildStreets();

/** Canvas size the map is designed for. */
export const MAP_VIEW = { w: 920, h: 520, pad: 20 };

const PHASES: LightPhase[] = ['red', 'yellow', 'green', 'red', 'green', 'red', 'yellow'];

/**
 * Cumulative path distance to each route waypoint, aligned with `ROUTE.waypoints`.
 * Must match the segment-by-segment sum in `route.ts`.
 */
function cumulativeDistToWaypointIndex(index: number): number {
  const w = ROUTE.waypoints;
  let s = 0;
  for (let j = 0; j < index; j += 1) {
    const a = w[j]!;
    const b = w[j + 1]!;
    s += Math.hypot(b.x - a.x, b.y - a.y);
  }
  return s;
}

/**
 * Build initial traffic light states: corridor (V2I target) + background (visual only).
 */
function buildInitialLights(): TrafficLightState[] {
  const wps = ROUTE.waypoints;
  const corridor: TrafficLightState[] = wps.map((p, i) => ({
    id: `TL-${String(i + 1).padStart(2, '0')}`,
    x: p.x,
    y: p.y,
    distanceAlongPath: cumulativeDistToWaypointIndex(i),
    phase: PHASES[i % PHASES.length]!,
    mode: 'normal' as const,
    preemptReleaseAt: null,
    // Stagger the free-run cycle in ms so the city does not "blink" in unison.
    cycleTimeOffset: 800 * i,
    onCorridor: true,
  }));

  // Decorative: small intersections that never get REQ_PRIORITY in the log.
  const bg: Omit<TrafficLightState, 'id'>[] = [
    { x: 200, y: 200, distanceAlongPath: -1, phase: 'green', mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 200, onCorridor: false },
    { x: 400, y: 200, distanceAlongPath: -1, phase: 'red', mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 500, onCorridor: false },
    { x: 600, y: 200, distanceAlongPath: -1, phase: 'yellow', mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 120, onCorridor: false },
    { x: 200, y: 300, distanceAlongPath: -1, phase: 'red', mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 900, onCorridor: false },
    { x: 500, y: 400, distanceAlongPath: -1, phase: 'green', mode: 'normal', preemptReleaseAt: null, cycleTimeOffset: 400, onCorridor: false },
  ];
  const bgWithIds: TrafficLightState[] = bg.map((b, k) => ({
    ...b,
    id: `TL-B${k + 1}`,
  }));

  return [...corridor, ...bgWithIds];
}

/**
 * One-time seed for the engine; a fresh copy is cloned in `useSimulation` on reset
 * so the user can replay the same choreography.
 */
export const INITIAL_TRAFFIC_LIGHTS: TrafficLightState[] = buildInitialLights();
