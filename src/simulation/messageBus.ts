/**
 * Turn simulation events into human-readable TSP / V2I log lines.
 * Stays stateless: the hook owns the running message list; this only formats rows.
 */
import { FAKE_EPOCH, SCENARIO } from '../data/scenario';
import * as T from '../data/messageTemplates';
import type { CommsMessage, CommsSource } from '../types';
import type { LightSimEvent } from './trafficLightLogic';

/** Matches CEN in messageTemplates; duplicated so we don't export an internal. */
const CEN_LABEL = 'CTRL-7A';

let msgCounter = 0;

function nextId(): string {
  msgCounter += 1;
  return `M-${String(msgCounter).padStart(5, '0')}`;
}

/**
 * Formats a fake wall-clock from simulation ms for the terminal.
 * Demo trick: FAKE_EPOCH + sim time makes it look "live."
 */
function simToIsoOffset(simTimeMs: number): string {
  const d = new Date(FAKE_EPOCH.getTime() + simTimeMs);
  return d.toISOString().replace('T', ' ').replace('Z', ' UTC');
}

type Args = { lightId: string; rssi: number; eta: number; hold: number; simTimeMs: number };

type PartialRow = {
  simTimeMs: number;
  line: string;
  kind: CommsMessage['kind'];
  source: CommsSource;
};

function toMessagesFromStart(a: Args, rowOffset: number): PartialRow[] {
  const simIso = simToIsoOffset(a.simTimeMs + rowOffset);
  const rssi = a.rssi;
  const base = { lightId: a.lightId, rssi, etaSec: a.eta, holdSec: a.hold, simIso };
  return [
    // Vehicle-originated preempt request ⇒ attributed to the AVL Provider feed.
    { simTimeMs: a.simTimeMs, line: T.v2iRequest(base), kind: 'v2i', source: 'AVL' },
    // Controller ACK ⇒ Public Works Department owns the signal controllers.
    {
      simTimeMs: a.simTimeMs + 2,
      line: T.v2iAck({ ...base, simIso: simToIsoOffset(a.simTimeMs + rowOffset + 8) }),
      kind: 'ack',
      source: 'PWD',
    },
    // Central grant ⇒ East Bay Regional Comms System coordinates the corridor.
    {
      simTimeMs: a.simTimeMs + 4,
      line: T.v2iGrantFromCentral({ ...base, simIso: simToIsoOffset(a.simTimeMs + rowOffset + 15) }),
      kind: 'dispatch',
      source: 'EBRICS',
    },
  ];
}

// Session id per light for paired GRANT/RELEASE; reset when user hits Reset.
let sessionMap: Record<string, string> = {};

/**
 * Produces 0+ new `CommsMessage` items for a single engine event. Caller
 * flattens into the on-screen list (newest at bottom, auto-scrolled).
 */
export function comsFromEvent(
  ev: LightSimEvent,
  simTimeMs: number,
  distanceAhead: number,
): CommsMessage[] {
  if (ev.type === 'preempt_start') {
    if (!sessionMap[ev.lightId]) {
      sessionMap[ev.lightId] = `TSP-${ev.lightId}-${Math.floor(1000 + Math.random() * 8999)}`;
    }
    // distanceAhead is in meters; 22 m/s ≈ 80 km/h gives a plausible ETA.
    const eta = Math.max(0.1, (distanceAhead / 22) * 1.1);
    const rssi = -64 - (distanceAhead / 20) * 0.1;
    const hold = 18 + (distanceAhead / 200) * 0.2;
    const parts = toMessagesFromStart(
      { lightId: ev.lightId, rssi, eta, hold, simTimeMs },
      0,
    );
    return parts.map((p) => ({
      id: nextId(),
      simTimeMs: p.simTimeMs,
      line: p.line,
      kind: p.kind,
      source: p.source,
    }));
  }
  if (ev.type === 'preempt_end') {
    const sid = sessionMap[ev.lightId] ?? `TSP-${ev.lightId}-END`;
    const t = simToIsoOffset(simTimeMs);
    return [
      {
        id: nextId(),
        simTimeMs,
        line: T.v2iReleaseFromCentral({ lightId: ev.lightId, simIso: t, sessionId: sid }),
        kind: 'dispatch' as const,
        source: 'EBRICS',
      },
      {
        id: nextId(),
        simTimeMs: simTimeMs + 1,
        line: T.v2iReleaseFromLight({ lightId: ev.lightId, simIso: simToIsoOffset(simTimeMs + 1), sessionId: sid }),
        kind: 'v2i' as const,
        source: 'PWD',
      },
    ];
  }
  return [];
}

/** Reset (new run): clear session id cache; next Start gets fresh TSP session ids. */
export function resetCommsState(): void {
  sessionMap = {};
  msgCounter = 0;
}

/** Shown once when the first preempt opens the corridor. */
export function makeGreenWaveNotice(simTimeMs: number, active: true): CommsMessage {
  return {
    id: nextId(),
    simTimeMs,
    line: T.systemGreenWave(simToIsoOffset(simTimeMs), active),
    kind: 'sys' as const,
    source: 'EBRICS',
  };
}

/** Welcome line on app load / after reset, so the log is not empty. */
export function makeBootMessage(): CommsMessage {
  return {
    id: nextId(),
    simTimeMs: 0,
    line: `[BOOT] V2I radio=${SCENARIO.regionCode} link=SEC-TLS-1.3 unit=${SCENARIO.unitId} scenario=hospital_transfer_demo`,
    kind: 'sys' as const,
    source: 'ITSS',
  };
}

/** Synthetic AVL handshake shown right after Start to fill the "route predicted" step. */
export function makeRoutePredictedMessage(simTimeMs: number): CommsMessage {
  const iso = simToIsoOffset(simTimeMs);
  return {
    id: nextId(),
    simTimeMs,
    line: `[${iso}] AVL → ${CEN_LABEL}: ROUTE_SOLVED unit=${SCENARIO.unitId} legs=3 corridor=METRO-7A eta_v2i=88s eta_baseline=175s`,
    kind: 'dispatch' as const,
    source: 'AVL',
  };
}
