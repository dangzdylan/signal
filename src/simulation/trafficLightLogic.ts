/**
 * Traffic light FSM: free-running city cycle + emergency TSP (Transit Signal
 * Preemption) style hold when the ambulance is within a lookahead range.
 * "Decorative" lights (onCorridor === false) never take preemption.
 */
import type { LightPhase, TrafficLightState } from '../types';
import { getTotalRouteLength } from '../data/route';

/**
 * How far ahead of the unit (in path length units) we start negotiating.
 * Tuned to keep ~3 corridor intersections pre-cleared in front of the ambulance,
 * which is what slide 6 promises ("pre-clears a green wave of lights ahead").
 */
export const PREEMPT_LOOKAHEAD = 420;

/**
 * How far past a stop line we go before the controller releases the junction.
 * (Still on the same abstract unit scale as the route polyline.)
 */
const POST_PASS_BUFFER = 35;

const CYCLE_MS = 9000;
const RED_END = 4000;
const YELLOW_END = 5500;
// 5500..9000 green

type PhaseFromCycle = LightPhase;

/**
 * Phases in the absence of preemption, driven only by a repeating timeline.
 * Each light uses `cycleTimeOffset` so intersections do not sync perfectly.
 */
function phaseFromFreeCycle(tMs: number, offset: number): PhaseFromCycle {
  const c = (tMs + offset) % CYCLE_MS;
  if (c < RED_END) {
    return 'red';
  }
  if (c < YELLOW_END) {
    return 'yellow';
  }
  return 'green';
}

export type LightSimEvent =
  | { type: 'preempt_start'; lightId: string; distanceAhead: number }
  | { type: 'preempt_end'; lightId: string };

/**
 * For each light, decide mode/phase. Emits at most one start + one end per light
 * per run (caller tracks which lights already had events using sets if needed;
 * we emit when crossing thresholds).
 */
export function advanceTrafficLights(
  lights: TrafficLightState[],
  simTimeMs: number,
  distanceAmbulanceAlong: number,
): { next: TrafficLightState[]; events: LightSimEvent[] } {
  const pathLen = getTotalRouteLength();
  // Guard when route length is 0 (should never happen in this demo).
  if (pathLen <= 0) {
    return { next: lights, events: [] };
  }

  const events: LightSimEvent[] = [];
  const next = lights.map((L) => {
    // Background: always free cycle, never TSP.
    if (!L.onCorridor || L.distanceAlongPath < 0) {
      return {
        ...L,
        mode: 'normal' as const,
        preemptReleaseAt: null,
        phase: phaseFromFreeCycle(simTimeMs, L.cycleTimeOffset),
      };
    }

    const dL = L.distanceAlongPath;
    const ahead = dL - distanceAmbulanceAlong; // + = light still in front of us

    if (L.mode === 'preempt') {
      // If the run is about to end, clear any TSP (last intersection shares the hospital vertex).
      const shouldRelease =
        distanceAmbulanceAlong > dL + POST_PASS_BUFFER ||
        distanceAmbulanceAlong >= pathLen - 0.5;
      if (shouldRelease) {
        events.push({ type: 'preempt_end', lightId: L.id });
        return {
          ...L,
          mode: 'normal' as const,
          preemptReleaseAt: null,
          phase: phaseFromFreeCycle(simTimeMs, L.cycleTimeOffset),
        };
      }
      // Hold solid green in corridor mode until release.
      return { ...L, phase: 'green' as const };
    }

    // Not yet in preempt: check whether we are inside the window to request.
    if (ahead > 0 && ahead < PREEMPT_LOOKAHEAD) {
      events.push({ type: 'preempt_start', lightId: L.id, distanceAhead: ahead });
      return {
        ...L,
        mode: 'preempt' as const,
        phase: 'green' as const,
        preemptReleaseAt: null,
      };
    }

    // Default: no corridor priority, keep normal timing.
    return {
      ...L,
      mode: 'normal' as const,
      preemptReleaseAt: null,
      phase: phaseFromFreeCycle(simTimeMs, L.cycleTimeOffset),
    };
  });

  return { next, events };
}
