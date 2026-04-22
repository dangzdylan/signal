/**
 * Turn simulation events into human-readable TSP / V2I log lines.
 * Stays stateless: the hook owns the running message list; this only formats rows.
 */
import { FAKE_EPOCH, SCENARIO } from '../data/scenario';
import * as T from '../data/messageTemplates';
import type { CommsMessage } from '../types';
import type { LightSimEvent } from './trafficLightLogic';

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

function toMessagesFromStart(
  a: Args,
  rowOffset: number,
): { simTimeMs: number; line: string; kind: CommsMessage['kind'] }[] {
  const simIso = simToIsoOffset(a.simTimeMs + rowOffset);
  const rssi = a.rssi;
  const base = { lightId: a.lightId, rssi, etaSec: a.eta, holdSec: a.hold, simIso };
  return [
    { simTimeMs: a.simTimeMs, line: T.v2iRequest(base), kind: 'v2i' as const },
    { simTimeMs: a.simTimeMs + 2, line: T.v2iAck({ ...base, simIso: simToIsoOffset(a.simTimeMs + rowOffset + 8) }), kind: 'ack' as const },
    {
      simTimeMs: a.simTimeMs + 4,
      line: T.v2iGrantFromCentral({ ...base, simIso: simToIsoOffset(a.simTimeMs + rowOffset + 15) }),
      kind: 'dispatch' as const,
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
    // Toy mapping: "distance" units to estimated seconds (purely for display).
    const eta = Math.max(0.1, (distanceAhead / 60) * 1.1);
    const rssi = -64 - (distanceAhead / 20) * 0.1;
    const hold = 18 + (distanceAhead / 200) * 0.2;
    const parts = toMessagesFromStart(
      { lightId: ev.lightId, rssi, eta, hold, simTimeMs },
      0,
    );
    return parts.map(
      (p) =>
        ({
          id: nextId(),
          simTimeMs: p.simTimeMs,
          line: p.line,
          kind: p.kind,
        }) as CommsMessage,
    );
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
      },
      {
        id: nextId(),
        simTimeMs: simTimeMs + 1,
        line: T.v2iReleaseFromLight({ lightId: ev.lightId, simIso: simToIsoOffset(simTimeMs + 1), sessionId: sid }),
        kind: 'v2i' as const,
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
  };
}

/** Welcome line on app load / after reset, so the log is not empty. */
export function makeBootMessage(): CommsMessage {
  return {
    id: nextId(),
    simTimeMs: 0,
    line: `[BOOT] V2I radio=${SCENARIO.regionCode} link=SEC-TLS-1.3 unit=${SCENARIO.unitId} scenario=hospital_transfer_demo`,
    kind: 'sys' as const,
  };
}
