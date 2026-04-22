/**
 * Drives the whole demo: time, ambulance progress, traffic FSM, comms.
 * `requestAnimationFrame` keeps the ambulance and lights smooth.
 *
 * The authoritative sim lives in `simRef`. Read `playSpeed` and `running` from
 * refs inside the rAF so we do not re-create the loop every render; that also
 * keeps the React 19 "no ref access during render" rule happy.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommsMessage, SolutionStep, TrafficLightState } from '../types';
import {
  SCENARIO,
  SCENARIO_DURATION_SEC,
  BASELINE_DURATION_SEC,
  BASE_CRUISE_KMH,
} from '../data/scenario';
import { getNextManeuver, getTotalRouteLength, sampleRoute } from '../data/route';
import { INITIAL_TRAFFIC_LIGHTS } from '../data/cityLayout';
import { advanceTrafficLights, PREEMPT_LOOKAHEAD } from './trafficLightLogic';
import {
  comsFromEvent,
  makeBootMessage,
  makeGreenWaveNotice,
  makeRoutePredictedMessage,
  resetCommsState,
} from './messageBus';

function cloneLights(x: TrafficLightState[]): TrafficLightState[] {
  return x.map((L) => ({ ...L }));
}

function initialComms(): CommsMessage[] {
  return [makeBootMessage()];
}

export type UseSimulationReturn = {
  running: boolean;
  playSpeed: number;
  setPlaySpeed: (n: number) => void;
  simTimeMs: number;
  progress: number;
  lights: TrafficLightState[];
  comms: CommsMessage[];
  completed: boolean;
  reset: () => void;
  start: () => void;
  pause: () => void;
  speedKmh: number;
  etaSec: number;
  nextManeuver: string;
  greenCorridor: boolean;
  ambulance: { x: number; y: number };
  ambulanceHeading: number;
  scenario: typeof SCENARIO;
  /** Current phase of the V2I flow — drives the SolutionSteps tracker. */
  solutionStep: SolutionStep;
  /** How many seconds this run has already saved vs. a no-V2I baseline. */
  timeSavedSec: number;
  /** Projected total time with V2I (s) — constant for the scenario. */
  actualTotalSec: number;
  /** Projected total time without V2I (s) — constant, used in the impact strip. */
  baselineTotalSec: number;
  /** Live ETA to hospital assuming V2I remains active. */
  actualEtaSec: number;
  /** Live projected ETA if the same trip were run WITHOUT preemption. */
  baselineEtaSec: number;
  /** Lookahead distance used by the preemption engine (for map overlay). */
  lookaheadDist: number;
};

type SimRef = {
  simTimeMs: number;
  progress: number;
  lights: TrafficLightState[];
  completed: boolean;
  lastRaf: number;
};

const PATH_LEN = getTotalRouteLength();

/**
 * Short "planning" window after Start during which no preempts are granted yet.
 * Gives the `predicted` step visible air time (AVL solves the corridor) before
 * the first signals flip green. At playSpeed=1 this is ~1.2s of wall clock.
 */
const PLANNING_DELAY_MS = 1200;

export function useSimulation(): UseSimulationReturn {
  const [running, setRunning] = useState(false);
  const [playSpeed, setPlaySpeed] = useState(1);
  const [simTimeMs, setSimTimeMs] = useState(0);
  const [progress, setProgress] = useState(0);
  const [lights, setLights] = useState<TrafficLightState[]>(() => cloneLights(INITIAL_TRAFFIC_LIGHTS));
  const [comms, setComms] = useState<CommsMessage[]>(initialComms);
  const [completed, setCompleted] = useState(false);

  const simRef = useRef<SimRef>({
    simTimeMs: 0,
    progress: 0,
    lights: cloneLights(INITIAL_TRAFFIC_LIGHTS),
    completed: false,
    lastRaf: 0,
  });
  const greenAnnounced = useRef(false);
  const playSpeedRef = useRef(1);
  const shouldRun = useRef(false);
  const rafId = useRef<number | null>(null);

  useEffect(() => {
    shouldRun.current = running;
  }, [running]);

  useEffect(() => {
    playSpeedRef.current = playSpeed;
  }, [playSpeed]);

  const wobble = 4 * Math.sin(simTimeMs / 4200);
  const speedKmh = running || progress > 0 ? Math.min(64, Math.max(32, BASE_CRUISE_KMH + wobble)) : 0;
  const { nextManeuver, distanceAlongRemaining } = getNextManeuver(progress);
  const etaSec =
    progress < 0.99 ? Math.max(0, (distanceAlongRemaining / 120) * 45 * (1 / playSpeed)) : 0;
  const greenCorridor = lights.some((L) => L.mode === 'preempt' && L.onCorridor);
  const sample = sampleRoute(progress);

  // --- Impact & flow derivations (slide 8 steps, slide 11 impact) ---
  // Clamp progress for display math so the counters don't tick past 1.0.
  const pClamped = Math.max(0, Math.min(1, progress));
  // Wall-clock time that has elapsed in our V2I run.
  const elapsedRealSec = pClamped * SCENARIO_DURATION_SEC;
  const actualEtaSec = (1 - pClamped) * SCENARIO_DURATION_SEC;
  // A baseline (no-V2I) ambulance that started at the same instant is only
  // `elapsedRealSec / BASELINE_DURATION_SEC` of the way through, so its ETA is
  // `BASELINE_DURATION_SEC - elapsedRealSec`.
  const baselineEtaSec = Math.max(0, BASELINE_DURATION_SEC - elapsedRealSec);
  // At our arrival we've saved (BASELINE - SCENARIO) seconds; linearly interp.
  const timeSavedSec = pClamped * (BASELINE_DURATION_SEC - SCENARIO_DURATION_SEC);

  // Step derivation: purely from progress + completed, so pause/resume is stable
  // and Reset returns cleanly to the dispatch phase.
  let solutionStep: SolutionStep;
  if (completed || pClamped >= 0.995) {
    solutionStep = 'arrived';
  } else if (pClamped >= 0.22) {
    solutionStep = 'enroute';
  } else if (pClamped >= 0.04 || greenCorridor) {
    solutionStep = 'corridor';
  } else if (running || pClamped > 0) {
    solutionStep = 'predicted';
  } else {
    solutionStep = 'dispatch';
  }

  const pumpUiFromRef = useCallback(() => {
    const s = simRef.current;
    setSimTimeMs(s.simTimeMs);
    setProgress(s.progress);
    setLights([...s.lights]);
    setCompleted(s.completed);
  }, []);

  // One rAF loop for the lifetime of the hook; reads latest flags from refs.
  useEffect(() => {
    const tick = (t: number) => {
      rafId.current = requestAnimationFrame(tick);
      const s = simRef.current;
      if (s.lastRaf === 0) {
        s.lastRaf = t;
      }
      const dt = Math.min(80, t - s.lastRaf) * playSpeedRef.current;
      s.lastRaf = t;

      if (shouldRun.current && !s.completed) {
        s.simTimeMs += dt;
        s.progress = Math.min(1, s.progress + dt / (SCENARIO_DURATION_SEC * 1000));
        const distA = s.progress * PATH_LEN;
        // During the planning window the signal controller hasn't granted
        // priority yet; passing a huge negative distance keeps every light's
        // `ahead` above the lookahead threshold so no preempt events fire.
        const gatedDist = s.simTimeMs < PLANNING_DELAY_MS ? -1e6 : distA;
        const { next, events } = advanceTrafficLights(s.lights, s.simTimeMs, gatedDist);
        s.lights = next;
        for (const ev of events) {
          const dAhead = ev.type === 'preempt_start' ? ev.distanceAhead : 0;
          const rows = comsFromEvent(ev, s.simTimeMs, dAhead);
          if (ev.type === 'preempt_start' && !greenAnnounced.current) {
            greenAnnounced.current = true;
            setComms((prev) => [
              ...prev,
              ...rows,
              makeGreenWaveNotice(s.simTimeMs, true),
            ]);
          } else {
            setComms((prev) => (rows.length ? [...prev, ...rows] : prev));
          }
        }
        if (s.progress >= 1) {
          s.completed = true;
          setRunning(false);
        }
        pumpUiFromRef();
      }
    };
    rafId.current = requestAnimationFrame(tick);
    return () => {
      if (rafId.current) {
        cancelAnimationFrame(rafId.current);
      }
    };
  }, [pumpUiFromRef]);

  const reset = useCallback(() => {
    const s = simRef.current;
    s.simTimeMs = 0;
    s.progress = 0;
    s.lights = cloneLights(INITIAL_TRAFFIC_LIGHTS);
    s.completed = false;
    s.lastRaf = 0;
    greenAnnounced.current = false;
    resetCommsState();
    setComms(initialComms());
    setRunning(false);
    pumpUiFromRef();
  }, [pumpUiFromRef]);

  const start = useCallback(() => {
    const s = simRef.current;
    if (s.completed) {
      reset();
    }
    s.lastRaf = 0;
    // Emit the "route predicted" line once per run, right when we first press Start
    // on a fresh/reset sim. This populates the 2nd step of the flow tracker.
    if (s.progress === 0) {
      setComms((prev) => [...prev, makeRoutePredictedMessage(s.simTimeMs)]);
    }
    setRunning(true);
  }, [reset]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  return {
    running,
    playSpeed,
    setPlaySpeed,
    simTimeMs,
    progress,
    lights,
    comms,
    completed,
    reset,
    start,
    pause,
    speedKmh,
    etaSec,
    nextManeuver,
    greenCorridor,
    ambulance: { x: sample.point.x, y: sample.point.y },
    ambulanceHeading: sample.headingRad,
    scenario: SCENARIO,
    solutionStep,
    timeSavedSec,
    actualTotalSec: SCENARIO_DURATION_SEC,
    baselineTotalSec: BASELINE_DURATION_SEC,
    actualEtaSec,
    baselineEtaSec,
    lookaheadDist: PREEMPT_LOOKAHEAD,
  };
}
