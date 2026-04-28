/**
 * Root layout: dispatch strip, solution steps, main map + HUD, impact counter,
 * V2I log, and controls. All state comes from `useSimulation` (single source
 * of truth).
 */
import { CommsLog } from './components/CommsLog';
import { ControlBar } from './components/ControlBar';
import { DispatchPanel } from './components/DispatchPanel';
import { DriverHUD } from './components/DriverHUD';
import { ImpactCounter } from './components/ImpactCounter';
import { MapShell } from './components/MapShell';
import { SolutionSteps } from './components/SolutionSteps';
import { useSimulation } from './simulation/useSimulation';

export default function App() {
  const sim = useSimulation();
  return (
    <div className="app-shell">
      <DispatchPanel
        scenario={sim.scenario}
        greenCorridor={sim.greenCorridor}
        completed={sim.completed}
      />
      <SolutionSteps step={sim.solutionStep} />
      <div className="main-panels">
        <div className="map-wrap">
          <div className="map-caption">Live view · Ambulance + predictive corridor · Berkeley</div>
          <div className="map-overlay-corners" />
          <MapShell
            lights={sim.lights}
            ambulance={sim.ambulance}
            headingRad={sim.ambulanceHeading}
            progress={sim.progress}
            lookaheadDist={sim.lookaheadDist}
            greenCorridor={sim.greenCorridor}
          />
        </div>
        <DriverHUD
          scenario={sim.scenario}
          speedKmh={sim.speedKmh}
          etaSec={sim.etaSec}
          nextManeuver={sim.nextManeuver}
          greenCorridor={sim.greenCorridor}
          completed={sim.completed}
        />
      </div>
      <ImpactCounter
        timeSavedSec={sim.timeSavedSec}
        actualEtaSec={sim.actualEtaSec}
        baselineEtaSec={sim.baselineEtaSec}
        actualTotalSec={sim.actualTotalSec}
        baselineTotalSec={sim.baselineTotalSec}
        completed={sim.completed}
        running={sim.running}
        progress={sim.progress}
      />
      <CommsLog items={sim.comms} />
      <ControlBar
        running={sim.running}
        onStart={sim.start}
        onPause={sim.pause}
        onReset={sim.reset}
        playSpeed={sim.playSpeed}
        onSpeed={sim.setPlaySpeed}
      />
    </div>
  );
}
