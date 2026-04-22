/**
 * Shared TypeScript types for the ambulance / traffic light routing demo.
 * Everything is in-memory: no network, no database.
 */

/** Single point in our stylized 2D city (SVG / simulation space). */
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
 * - normal: the light cycles on a fixed timer.
 * - preempt: V2I has granted priority; hold green for the ambulance.
 */
export type LightMode = 'normal' | 'preempt';

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

/**
 * A line segment for drawing streets (and optionally lane centers).
 * Stored as two endpoints; stroke width and glow are CSS on the line.
 */
export type StreetSegment = { from: Point2; to: Point2; id: string };

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

/** One row in the bottom comms / V2I log. */
export type CommsMessage = {
  id: string;
  /** Simulation clock in ms, used for display (fake wall-clock from scenario start). */
  simTimeMs: number;
  line: string;
  /** Slight color coding in the terminal. */
  kind: 'v2i' | 'ack' | 'sys' | 'dispatch';
};
