/**
 * Ambulance path through Berkeley.
 * The route is a single polyline: the ambulance never leaves this line;
 * "routing" in this demo is really preemption along this fixed path.
 *
 * Coordinates are real-world lat/lng, encoded into the legacy `Point2`
 * shape as `x = longitude`, `y = latitude`. Distances are computed in
 * meters via Haversine so all sim constants (PREEMPT_LOOKAHEAD, etc.)
 * are tuned in real-world units.
 */
import type { Point2, RouteDefinition } from '../types';

/**
 * Route: Berkeley Fire Station 2 (2029 Berkeley Way) → south on Shattuck →
 * left onto Ashby → Alta Bates Summit Medical Center (2450 Ashby Ave).
 *
 * Intersection coordinates are the actual OpenStreetMap `traffic_signals`
 * node positions for each junction (queried from Overpass), so the in-app
 * markers line up precisely with the road geometry on the basemap.
 */
const WAYPOINTS: Point2[] = [
  { x: -122.2706, y: 37.8721 }, //  0 Station 2 driveway (Berkeley Way)
  { x: -122.2678, y: 37.8722 }, //  1 Shattuck Ave & Berkeley Way — turn south
  { x: -122.2677, y: 37.8712 }, //  2 Shattuck Ave & University Ave
  { x: -122.2678, y: 37.8704 }, //  3 Shattuck Ave & Center St
  { x: -122.2678, y: 37.8685 }, //  4 Shattuck Ave & Bancroft Way
  { x: -122.2674, y: 37.8649 }, //  5 Shattuck Ave & Dwight Way
  { x: -122.2665, y: 37.8553 }, //  6 Shattuck Ave & Ashby Ave — turn east
  { x: -122.2635, y: 37.8557 }, //  7 Ashby Ave & Adeline St
  { x: -122.2598, y: 37.8552 }, //  8 Ashby Ave & Telegraph Ave
  { x: -122.2545, y: 37.8556 }, //  9 Alta Bates Summit ER bay
];

/** Earth radius (m) for Haversine. */
const R_EARTH_M = 6_371_000;

/**
 * Great-circle distance between two lat/lng points in meters.
 * Accurate enough for sub-km segments at Berkeley scale.
 */
function haversineMeters(a: Point2, b: Point2): number {
  const lat1 = (a.y * Math.PI) / 180;
  const lat2 = (b.y * Math.PI) / 180;
  const dLat = lat2 - lat1;
  const dLng = ((b.x - a.x) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLng / 2) ** 2;
  return 2 * R_EARTH_M * Math.asin(Math.min(1, Math.sqrt(s)));
}

/** Precompute full polyline length for progress → position mapping. */
const SEGMENT_LENGTHS: number[] = [];
for (let i = 0; i < WAYPOINTS.length - 1; i += 1) {
  SEGMENT_LENGTHS.push(haversineMeters(WAYPOINTS[i]!, WAYPOINTS[i + 1]!));
}
const TOTAL_LENGTH = SEGMENT_LENGTHS.reduce((a, b) => a + b, 0);

/**
 * The route object consumed by the sim and map: same waypoints, cached length.
 * Exported for MapShell to draw the polyline and for useSimulation to sample position.
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
 *
 * Heading is computed in lng/lat space and converted to a screen-friendly
 * angle in radians: 0 = +x (east), increasing clockwise on screen because
 * latitude increases northward (so we negate dy when feeding atan2).
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
      headingRad: Math.atan2(-(b.y - a.y), b.x - a.x),
      segmentIndex: 0,
    };
  }
  if (p >= 1) {
    const a = WAYPOINTS[WAYPOINTS.length - 2]!;
    const b = WAYPOINTS[WAYPOINTS.length - 1]!;
    return {
      point: { ...b },
      headingRad: Math.atan2(-(b.y - a.y), b.x - a.x),
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
        headingRad: Math.atan2(-(b.y - a.y), b.x - a.x),
        segmentIndex: i,
      };
    }
    acc += len;
  }
  const end = WAYPOINTS[WAYPOINTS.length - 1]!;
  const prev = WAYPOINTS[WAYPOINTS.length - 2]!;
  return {
    point: { ...end },
    headingRad: Math.atan2(-(end.y - prev.y), end.x - prev.x),
    segmentIndex: WAYPOINTS.length - 2,
  };
}

/** Total path length in meters. */
export function getTotalRouteLength(): number {
  return TOTAL_LENGTH;
}

/**
 * Distance (m) along the route to WAYPOINTS[index]. Used by cityLayout to
 * place corridor traffic lights.
 */
export function getCumulativeAt(index: number): number {
  return CUMULATIVE[index] ?? 0;
}

/**
 * Build the polyline from the ambulance's current position extending
 * `aheadDist` meters along the route. Used by MapShell to draw the
 * predictive "green wave" corridor.
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
    if (wpDist > startDist + 0.5 && wpDist < endDist - 0.5) {
      out.push({ ...WAYPOINTS[i]! });
    }
  }

  if (endDist > startDist + 1) {
    const endSample = sampleRoute(endDist / TOTAL_LENGTH);
    out.push({ x: endSample.point.x, y: endSample.point.y });
  }

  return out;
}

/**
 * Returns (distance to next major maneuver in meters, label).
 * Maneuver labels reference the real Berkeley streets along the route.
 */
export function getNextManeuver(
  p: number,
): { nextManeuver: string; distanceAlongRemaining: number } {
  const d = p * TOTAL_LENGTH;
  // WAYPOINTS index 1 = Shattuck Ave & Berkeley Way (turn south)
  // index 6 = Shattuck Ave & Ashby Ave (turn east)
  // index 9 = Alta Bates ER bay
  for (let i = 1; i < CUMULATIVE.length; i += 1) {
    if (CUMULATIVE[i]! > d + 0.5) {
      const dist = CUMULATIVE[i]! - d;
      if (i === 1) {
        return {
          nextManeuver: 'EXIT Station 2 — onto Shattuck Ave (priority corridor)',
          distanceAlongRemaining: dist,
        };
      }
      if (i <= 5) {
        return {
          nextManeuver: 'CONTINUE SOUTH on Shattuck — priority corridor',
          distanceAlongRemaining: dist,
        };
      }
      if (i === 6) {
        return {
          nextManeuver: 'TURN LEFT onto Ashby Ave — follow green wave',
          distanceAlongRemaining: dist,
        };
      }
      return {
        nextManeuver: 'CONTINUE EAST to Alta Bates (ER bay)',
        distanceAlongRemaining: dist,
      };
    }
  }
  return { nextManeuver: 'ARRIVE at emergency bay', distanceAlongRemaining: 0 };
}
