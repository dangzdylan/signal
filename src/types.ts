/**
 * Shared TypeScript types for the ambulance / traffic light routing demo.
 * Everything is in-memory: no network, no database.
 */

/**
 * Single 2D point used by the simulation. Encoded as `x = longitude`,
 * `y = latitude` (real-world WGS84). Distances between Point2 values are
 * computed in meters via Haversine in `data/route.ts`.
 */
export type Point2 = { x: number; y: number };

/**
 * A polyline the ambulance follows, built from this list in order.
 * Each leg is a straight line between consecutive waypoints.
 */
export type RouteDefinition = {
  waypoints: Point2[];
  /** Sum of all segment lengths; computed once in route.ts. */
  totalLength: number;
};

/**
 * Phases a traffic light can show. We keep a simple 3-lamp model.
 * In "preempt" mode we force GREEN for the emergency corridor.
 */
export type LightPhase = 'red' | 'yellow' | 'green';

/**
 * - normal:  the light cycles on a fixed timer.
 * - arming:  controller has acknowledged the V2I request and is transitioning
 *            the cross street through its yellow/red clearance before granting
 *            green to the corridor. Visible as yellow + amber halo.
 * - preempt: V2I priority is fully granted; solid green for the ambulance.
 */
export type LightMode = 'normal' | 'arming' | 'preempt';

/**
 * One traffic light in the city. `distanceAlongPath` is where the ambulance
 * "passes" this intersection along the main route (meters in sim units).
 */
export type TrafficLightState = {
  id: string;
  x: number;
  y: number;
  /**
   * Cumulative distance from route start, used for preemption range checks.
   * -1 = decorative (background) light; never takes preemption, only free cycles.
   */
  distanceAlongPath: number;
  /** false = background only; V2I does not target this one. */
  onCorridor: boolean;
  phase: LightPhase;
  mode: LightMode;
  /**
   * When in preempt, simulation time (ms) until we release the corridor
   * for this light (turn back to normal cycling).
   */
  preemptReleaseAt: number | null;
  /**
   * Offset in ms so not every light syncs the same; makes the "normal" city
   * look more organic before the ambulance approaches.
   */
  cycleTimeOffset: number;
};

/** Hardcoded 911 + hospital metadata shown in the dispatch strip. */
export type ScenarioInfo = {
  callId: string;
  patientSummary: string;
  vitals: { hr: number; spo2: number; bp: string };
  incidentLabel: string;
  hospitalLabel: string;
  unitId: string;
  regionCode: string;
};

/**
 * Originating department / external system for a comms line. Mirrors the
 * partner stack called out in slides 9 & 17:
 *   AVL    — AVL Provider (vehicle location telemetry)
 *   PWD    — Public Works Department (owns signal controllers)
 *   EBRICS — East Bay Regional Comms System (central dispatch / coordination)
 *   ITSS   — IT Systems / integration + boot messages
 */
export type CommsSource = 'AVL' | 'PWD' | 'EBRICS' | 'ITSS';

/** One row in the bottom comms / V2I log. */
export type CommsMessage = {
  id: string;
  /** Simulation clock in ms, used for display (fake wall-clock from scenario start). */
  simTimeMs: number;
  line: string;
  /** Slight color coding in the terminal. */
  kind: 'v2i' | 'ack' | 'sys' | 'dispatch';
  /** Which department / external system emitted this message. */
  source: CommsSource;
};

/**
 * High-level phase of the end-to-end V2I flow, matching slide 8 ("Solution Steps").
 *   dispatch  — 911 call received, unit not yet dispatched
 *   predicted — AVL + central project the ambulance route
 *   corridor  — first signals preempted; green wave is forming
 *   enroute   — ambulance traveling under sustained preemption
 *   arrived   — unit at hospital bay; corridor released
 */
export type SolutionStep = 'dispatch' | 'predicted' | 'corridor' | 'enroute' | 'arrived';
