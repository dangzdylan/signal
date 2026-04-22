/**
 * Drives the whole demo: time, ambulance progress, traffic FSM, comms.
 * `requestAnimationFrame` keeps the ambulance and lights smooth.
 *
 * The authoritative sim lives in `simRef`. Read `playSpeed` and `running` from
 * refs inside the rAF so we do not re-create the loop every render; that also
 * keeps the React 19 "no ref access during render" rule happy.
 */
import { useCallback, useEffect, useRef, useState } from 'react';
import type { CommsMessage, TrafficLightState } from '../types';
import { SCENARIO, SCENARIO_DURATION_SEC, BASE_CRUISE_KMH } from '../data/scenario';
import { getNextManeuver, getTotalRouteLength, sampleRoute } from '../data/route';
import { INITIAL_TRAFFIC_LIGHTS } from '../data/cityLayout';
import { advanceTrafficLights } from './trafficLightLogic';
import { comsFromEvent, makeBootMessage, makeGreenWaveNotice, resetCommsState } from './messageBus';

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
};

type SimRef = {
  simTimeMs: number;
  progress: number;
  lights: TrafficLightState[];
  completed: boolean;
  lastRaf: number;
};

const PATH_LEN = getTotalRouteLength();

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
        const { next, events } = advanceTrafficLights(s.lights, s.simTimeMs, distA);
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
  };
}
