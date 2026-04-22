/**
 * 100% fake but plausible dispatch data. Shown in the top strip and driver HUD.
 */
import type { ScenarioInfo } from '../types';

export const SCENARIO: ScenarioInfo = {
  callId: '911-2026-04-22-0841',
  patientSummary: 'Unresponsive → responsive; suspected STEMI, priority 1',
  vitals: { hr: 112, spo2: 95, bp: '148/92' },
  incidentLabel: '5th & Main (south plaza)',
  hospitalLabel: 'City General — Emergency (Bay 3)',
  unitId: 'AMB-042',
  regionCode: 'METRO-7A',
};

/** Wall-clock "base" to format fake timestamps in the comms log. */
export const FAKE_EPOCH = new Date('2026-04-22T12:34:00.000Z');

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
