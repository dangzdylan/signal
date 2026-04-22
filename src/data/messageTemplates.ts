/**
 * V2I-style message lines (vehicle-to-infrastructure + acknowledgements).
 * Interpolation uses: unit id, light id, rssi, etaSec, holdSec, sim clock.
 */
import { SCENARIO } from './scenario';

const UNIT = () => SCENARIO.unitId;
const CEN = 'CTRL-7A';

type Args = {
  lightId: string;
  rssi: number;
  etaSec: number;
  holdSec: number;
  simIso: string;
};

const fmt = (a: Args) => ({
  request: `[${a.simIso}] ${UNIT()} → ${
    a.lightId
  }: EMERG_V2I REQ_PREEMPT eta=${a.etaSec.toFixed(1)}s rssi=${a.rssi.toFixed(0)}dBm pr=STEMI-1`,

  ack: `[${a.simIso}] ${a.lightId} → ${
    UNIT()
  }: V2I_ACK plan=HOLD phase=GRN hold_s=${a.holdSec.toFixed(1)} sync=GPSCORR+1.2m`,

  grant: `[${a.simIso}] ${CEN} → ${a.lightId}: TSP_GRANT id=${a.lightId} until_release`,

  releaseFromCentral: (sid: string) =>
    `[${a.simIso}] ${CEN} → ${a.lightId}: TSP_END session=${sid} revert=NORMAL_FSM`,

  releaseLocal: (sid: string) =>
    `[${a.simIso}] ${a.lightId} → ${CEN}: TSP_CLEARED session=${sid} sensor=OUTBOUND_OK`,
});

export function v2iRequest(args: Args): string {
  return fmt(args).request;
}

export function v2iAck(args: Args): string {
  return fmt(args).ack;
}

export function v2iGrantFromCentral(args: Args): string {
  return fmt(args).grant;
}

export function v2iReleaseFromCentral(args: { lightId: string; simIso: string; sessionId: string }): string {
  return fmt({ ...args, rssi: 0, etaSec: 0, holdSec: 0, lightId: args.lightId }).releaseFromCentral(
    args.sessionId,
  );
}

export function v2iReleaseFromLight(args: { lightId: string; simIso: string; sessionId: string }): string {
  return fmt({ ...args, rssi: 0, etaSec: 0, holdSec: 0, lightId: args.lightId }).releaseLocal(
    args.sessionId,
  );
}

export function systemGreenWave(simIso: string, active: boolean): string {
  if (active) {
    return `[${simIso}] ${CEN} → ${UNIT()}: EVENT priority_corridor=ACTIVE t_offset=+0.0s`;
  }
  return `[${simIso}] ${CEN} → ${UNIT()}: EVENT priority_corridor=IDLE`;
}
