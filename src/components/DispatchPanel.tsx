/**
 * Top strip: dispatch metadata. Static except for the corridor-status badge.
 */
import type { ScenarioInfo } from '../types';

type P = { scenario: ScenarioInfo; greenCorridor: boolean; completed: boolean };

export function DispatchPanel(p: P) {
  return (
    <header className="dispatch-panel">
      <div className="dp-row">
        <div className="dp-brand">Ambulance V2I Signal Priority</div>
        <div className={`dp-badge ${p.greenCorridor ? 'on' : ''}`}>
          {p.greenCorridor ? '● CORRIDOR ACTIVE' : '○ Corridor Standby'}
        </div>
        <div className="dp-badge light">{p.completed ? '✓ TRIP COMPLETE' : 'LIVE DEMO'}</div>
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
          <div className="label">Patient</div>
          <div className="value">{p.scenario.patientSummary}</div>
        </div>
      </div>
    </header>
  );
}
