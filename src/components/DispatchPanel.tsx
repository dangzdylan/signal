/**
 * The top strip: dispatch / call metadata (100% static except connection badge).
 * Gives context that this is a pre-hospital → hospital transfer with priority.
 */
import type { ScenarioInfo } from '../types';

type P = { scenario: ScenarioInfo; greenCorridor: boolean; completed: boolean };

export function DispatchPanel(p: P) {
  return (
    <header className="dispatch-panel">
      <div className="dp-row">
        <div className="dp-brand">METRO-EMERGENCY TSP + V2I</div>
        <div className={`dp-badge ${p.greenCorridor ? 'on' : ''}`}>
          {p.greenCorridor ? 'PRIORITY CORRIDOR: ACTIVE' : 'PRIORITY CORRIDOR: STANDBY'}
        </div>
        <div className="dp-badge light">{p.completed ? 'TRIP: COMPLETE' : 'LIVE: SIMULATION'}</div>
      </div>
      <div className="dp-grid">
        <div>
          <div className="label">Call</div>
          <div className="value mono">{p.scenario.callId}</div>
        </div>
        <div>
          <div className="label">Unit</div>
          <div className="value mono">{p.scenario.unitId}</div>
        </div>
        <div>
          <div className="label">From</div>
          <div className="value">{p.scenario.incidentLabel}</div>
        </div>
        <div>
          <div className="label">To</div>
          <div className="value">{p.scenario.hospitalLabel}</div>
        </div>
        <div className="span-2">
          <div className="label">Patient (fake)</div>
          <div className="value">{p.scenario.patientSummary}</div>
        </div>
      </div>
    </header>
  );
}
