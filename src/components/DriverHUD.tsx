/**
 * Right column: what a crew might glance at along the route.
 */
import type { ScenarioInfo } from '../types';

type P = {
  scenario: ScenarioInfo;
  speedKmh: number;
  etaSec: number;
  nextManeuver: string;
  greenCorridor: boolean;
  completed: boolean;
};

export function DriverHUD(p: P) {
  return (
    <aside className="driver-hud" aria-label="Ambulance driver display">
      <div className="hud-block hud-title">{p.scenario.unitId} · En Route</div>
      <div className="hud-block">
        <div className="label">Speed</div>
        <div className="hud-metric">
          {p.speedKmh.toFixed(0)} <span className="unit">km/h</span>
        </div>
      </div>
      <div className="hud-block">
        <div className="label">ETA to Hospital</div>
        <div className="hud-metric sm">{p.etaSec.toFixed(0)} s</div>
      </div>
      <div className="hud-block">
        <div className="label">Next</div>
        <div className="hud-nav">{p.nextManeuver}</div>
      </div>
      <div className="hud-block">
        <div className="label">Corridor Status</div>
        <div className={`hud-pill ${p.greenCorridor ? 'on' : ''}`}>
          {p.greenCorridor ? '● PREEMPT ACTIVE' : '○ Standby'}
        </div>
      </div>
      <div className="hud-block">
        <div className="label">Patient Vitals</div>
        <div className="hud-vitals">
          <span>HR {p.scenario.vitals.hr}</span>
          <span>SpO₂ {p.scenario.vitals.spo2}%</span>
          <span>BP {p.scenario.vitals.bp}</span>
        </div>
      </div>
      {p.completed ? (
        <div className="hud-block arrive">Arrived at emergency bay · Handoff ready</div>
      ) : null}
    </aside>
  );
}
