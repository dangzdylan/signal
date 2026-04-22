/**
 * Right column: what a crew might glance at along the route. Numbers are
 * synthetic but tied to the play speed and remaining distance of the sim.
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
      <div className="hud-block hud-title">CREW / DRIVER (simulated)</div>
      <div className="hud-block">
        <div className="label">Speed</div>
        <div className="hud-metric">
          {p.speedKmh.toFixed(0)} <span className="unit">km/h</span>
        </div>
      </div>
      <div className="hud-block">
        <div className="label">ETA (display)</div>
        <div className="hud-metric sm">{p.etaSec.toFixed(0)} s</div>
      </div>
      <div className="hud-block">
        <div className="label">Next</div>
        <div className="hud-nav">{p.nextManeuver}</div>
      </div>
      <div className="hud-block">
        <div className="label">Green wave</div>
        <div className={`hud-pill ${p.greenCorridor ? 'on' : ''}`}>
          {p.greenCorridor ? 'HOLD / PREEMPT' : 'OFF'}
        </div>
      </div>
      <div className="hud-block">
        <div className="label">Patient vitals (fake feed)</div>
        <div className="hud-vitals">
          <span>HR {p.scenario.vitals.hr}</span>
          <span>SpO₂ {p.scenario.vitals.spo2}%</span>
          <span>BP {p.scenario.vitals.bp}</span>
        </div>
      </div>
      {p.completed ? (
        <div className="hud-block arrive">Arrived at emergency bay. Handoff ready.</div>
      ) : null}
    </aside>
  );
}
