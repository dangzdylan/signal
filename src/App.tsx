/**
 * Root layout. Three demo phases before the normal dashboard:
 *   'incoming' → IncomingCall modal (full screen)
 *   'routing'  → route calculation overlay on the map (2 s)
 *   'ready'    → normal dashboard
 */
import { useEffect, useRef, useState } from 'react';
import { CommsLog } from './components/CommsLog';
import { ControlBar } from './components/ControlBar';
import { DispatchPanel } from './components/DispatchPanel';
import { DriverHUD } from './components/DriverHUD';
import { ImpactCounter } from './components/ImpactCounter';
import { IncomingCall } from './components/IncomingCall';
import { MapShell } from './components/MapShell';
import { SolutionSteps } from './components/SolutionSteps';
import { useSimulation } from './simulation/useSimulation';

type DemoPhase = 'incoming' | 'routing' | 'ready';

const ROUTING_STEPS = [
  'Locating unit AMB-7…',
  'Linking V2I corridor on Shattuck Ave…',
  'Pre-clearing signal sequence…',
  'Route optimized — ready',
];

export default function App() {
  const sim = useSimulation();
  const [phase, setPhase] = useState<DemoPhase>('incoming');
  const [routingStep, setRoutingStep] = useState(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);

  const handleAccept = () => {
    setPhase('routing');
    setRoutingStep(0);

    const delays = [0, 700, 1300, 1850];
    delays.forEach((d, i) => {
      timers.current.push(setTimeout(() => setRoutingStep(i), d));
    });
    timers.current.push(
      setTimeout(() => {
        setPhase('ready');
      }, 2400),
    );
  };

  // Clean up on unmount.
  useEffect(() => {
    const ids = timers.current;
    return () => ids.forEach(clearTimeout);
  }, []);

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
            cityTimeMs={sim.cityTimeMs}
            showAmbulance={phase === 'ready'}
            hideOverlay={phase === 'incoming'}
          />
          {phase === 'routing' && (
            <div className="routing-overlay">
              <div className="routing-card">
                <div className="routing-spinner" />
                <div className="routing-steps">
                  {ROUTING_STEPS.map((s, i) => (
                    <div
                      key={s}
                      className={`routing-step ${i <= routingStep ? 'routing-step-visible' : ''} ${i === ROUTING_STEPS.length - 1 && i === routingStep ? 'routing-step-done' : ''}`}
                    >
                      {i < routingStep ? '✓' : i === routingStep && i === ROUTING_STEPS.length - 1 ? '✓' : '◌'}{' '}
                      {s}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
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

      {phase === 'incoming' && <IncomingCall onAccept={handleAccept} />}
    </div>
  );
}
