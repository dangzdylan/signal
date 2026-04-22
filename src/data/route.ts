/**
 * Ambulance path through the stylized city.
 * The route is a single polyline: the ambulance never leaves this line;
 * "routing" in this demo is really preemption along this fixed path.
 */
import type { Point2, RouteDefinition } from '../types';

/** All route vertices, in order: incident (south) to hospital (northeast). */
const WAYPOINTS: Point2[] = [
  { x: 80, y: 400 },
  { x: 80, y: 200 },
  { x: 80, y: 120 },
  { x: 200, y: 120 },
  { x: 400, y: 120 },
  { x: 600, y: 120 },
  { x: 800, y: 120 },
];

/** Euclidean length of one segment. */
function segmentLength(a: Point2, b: Point2): number {
  const dx = b.x - a.x;
  const dy = b.y - a.y;
  return Math.hypot(dx, dy);
}

/** Precompute full polyline length for progress → position mapping. */
const SEGMENT_LENGTHS: number[] = [];
for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
  SEGMENT_LENGTHS.push(segmentLength(WAYPOINTS[i]!, WAYPOINTS[i + 1]!));
}
const TOTAL_LENGTH = SEGMENT_LENGTHS.reduce((a, b) => a + b, 0);

/**
 * The route object consumed by the sim and map: same waypoints, cached length.
 * Exported for CityMap to draw the polyline and for useSimulation to sample position.
 */
export const ROUTE: RouteDefinition = {
  waypoints: WAYPOINTS,
  totalLength: TOTAL_LENGTH,
};

/**
 * Cumulative distance from route start to each waypoint (for intersection placement).
 * Index i is distance to WAYPOINTS[i]; last equals total length.
 */
const CUMULATIVE: number[] = [0];
for (const len of SEGMENT_LENGTHS) {
  CUMULATIVE.push(CUMULATIVE[CUMULATIVE.length - 1]! + len);
}

/**
 * Map progress p in [0,1] to a point, heading, and the index of the segment
 * the ambulance is on (0 .. waypoints-2).
 */
export function sampleRoute(p: number): {
  point: Point2;
  headingRad: number;
  segmentIndex: number;
} {
  if (p <= 0) {
    const a = WAYPOINTS[0]!;
    const b = WAYPOINTS[1]!;
    return {
      point: { ...a },
      headingRad: Math.atan2(b.y - a.y, b.x - a.x),
      segmentIndex: 0,
    };
  }
  if (p >= 1) {
    const a = WAYPOINTS[WAYPOINTS.length - 2]!;
    const b = WAYPOINTS[WAYPOINTS.length - 1]!;
    return {
      point: { ...b },
      headingRad: Math.atan2(b.y - a.y, b.x - a.x),
      segmentIndex: WAYPOINTS.length - 2,
    };
  }
  const d = p * TOTAL_LENGTH;
  let acc = 0;
  for (let i = 0; i < SEGMENT_LENGTHS.length; i += 1) {
    const len = SEGMENT_LENGTHS[i]!;
    if (d <= acc + len) {
      const t = (d - acc) / len;
      const a = WAYPOINTS[i]!;
      const b = WAYPOINTS[i + 1]!;
      return {
        point: {
          x: a.x + t * (b.x - a.x),
          y: a.y + t * (b.y - a.y),
        },
        headingRad: Math.atan2(b.y - a.y, b.x - a.x),
        segmentIndex: i,
      };
    }
    acc += len;
  }
  const end = WAYPOINTS[WAYPOINTS.length - 1]!;
  const prev = WAYPOINTS[WAYPOINTS.length - 2]!;
  return {
    point: { ...end },
    headingRad: Math.atan2(end.y - prev.y, end.x - prev.x),
    segmentIndex: WAYPOINTS.length - 2,
  };
}

/** Total path length in the same units as the SVG (synthetic, not real meters). */
export function getTotalRouteLength(): number {
  return TOTAL_LENGTH;
}

/**
 * Build the polyline from the ambulance's current position extending
 * `aheadDist` units along the route. Used by CityMap to draw the
 * predictive "green wave" corridor that slide 6 describes.
 *
 * Returns 2+ points: [current position, ...intermediate waypoints, endpoint].
 * If we are already at the end, returns a single point.
 */
export function getLookaheadPath(progress: number, aheadDist: number): Point2[] {
  const p = Math.max(0, Math.min(1, progress));
  const startDist = p * TOTAL_LENGTH;
  const endDist = Math.min(TOTAL_LENGTH, startDist + Math.max(0, aheadDist));

  const startSample = sampleRoute(p);
  const out: Point2[] = [{ x: startSample.point.x, y: startSample.point.y }];

  // Intermediate corridor waypoints that fall strictly inside (startDist, endDist).
  for (let i = 1; i < WAYPOINTS.length - 1; i += 1) {
    const wpDist = CUMULATIVE[i]!;
    if (wpDist > startDist + 0.01 && wpDist < endDist - 0.01) {
      out.push({ ...WAYPOINTS[i]! });
    }
  }

  if (endDist > startDist + 0.5) {
    const endSample = sampleRoute(endDist / TOTAL_LENGTH);
    out.push({ x: endSample.point.x, y: endSample.point.y });
  }

  return out;
}

/**
 * Returns (distance to next full stop / major maneuver, label).
 * Simplified: we use segment boundaries for "turn" text.
 */
export function getNextManeuver(
  p: number,
): { nextManeuver: string; distanceAlongRemaining: number } {
  const d = p * TOTAL_LENGTH;
  // Next major change: at each internal waypoint, describe turn.
  for (let i = 1; i < CUMULATIVE.length; i += 1) {
    if (CUMULATIVE[i]! > d + 0.1) {
      const dist = CUMULATIVE[i]! - d;
      if (i === 1) {
        return { nextManeuver: 'CONTINUE NORTH on Main — priority corridor', distanceAlongRemaining: dist };
      }
      if (i === 2) {
        return { nextManeuver: 'TURN RIGHT onto East Ave — follow green wave', distanceAlongRemaining: dist };
      }
      return {
        nextManeuver: 'CONTINUE EAST to City General (ambulance entrance)',
        distanceAlongRemaining: dist,
      };
    }
  }
  return { nextManeuver: 'ARRIVE at emergency bay', distanceAlongRemaining: 0 };
}
