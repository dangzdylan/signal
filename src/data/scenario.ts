/**
 * 100% fake but plausible dispatch data. Shown in the top strip and driver HUD.
 */
import type { ScenarioInfo } from '../types';

export const SCENARIO: ScenarioInfo = {
  callId: 'E-2026-0428-0312',
  patientSummary: 'Unresponsive → responsive; suspected STEMI',
  vitals: { hr: 112, spo2: 95, bp: '148/92' },
  incidentLabel: 'Berkeley Fire Station 2 · 2029 Berkeley Way',
  hospitalLabel: 'Alta Bates Summit Medical Center · ER Bay',
  unitId: 'AMB-7',
  regionCode: 'EBRICS-Z4',
};

/** Wall-clock base to format timestamps in the comms log. Matches call date on IncomingCall. */
export const FAKE_EPOCH = new Date('2026-04-28T08:41:00.000Z');

/**
 * How long a full run from incident to hospital should take at 1.0x speed, seconds.
 * All ETA / progress derivations are tied to this for consistency.
 */
export const SCENARIO_DURATION_SEC = 88;

/**
 * Projected run time on the same route WITHOUT V2I preemption (no green wave).
 * (175 − 88) / 175 ≈ 50% faster response, within the envelope of the
 * Fremont pilot cited on slide 11 (Code 3 ~18.6%, Code 2 ~69.2%, blended ~50%).
 * Only used for the on-screen impact comparison — nothing simulation-critical
 * depends on the exact value.
 */
export const BASELINE_DURATION_SEC = 175;

/**
 * "Typical" cruise speed in km/h for the HUD. The number is a blend of
 * display fantasy + slight variation; not physics-accurate.
 */
export const BASE_CRUISE_KMH = 48;
