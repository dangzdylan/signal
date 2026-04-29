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
  'Linking V2I corridor on MLK Jr Way…',
  'Pre-clearing signal sequence…',
  'Route optimized — ready',
];

/** Expand/collapse icon button rendered inside the map caption bar. */
function MapToggleBtn({ expanded, onToggle }: { expanded: boolean; onToggle: () => void }) {
  return (
    <button
      type="button"
      className="map-expand-btn"
      onClick={onToggle}
      title={expanded ? 'Collapse map (Esc)' : 'Expand map'}
      aria-label={expanded ? 'Collapse map' : 'Expand map'}
    >
      {expanded ? (
        <>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M6 2H2v4M10 2h4v4M6 14H2v-4M10 14h4v-4" />
          </svg>
          Collapse
        </>
      ) : (
        <>
          <svg viewBox="0 0 16 16" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round">
            <path d="M2 6V2h4M14 6V2h-4M2 10v4h4M14 10v4h-4" />
          </svg>
          Expand Map
        </>
      )}
    </button>
  );
}

export default function App() {
  const sim = useSimulation();
  const [phase, setPhase] = useState<DemoPhase>('incoming');
  const [routingStep, setRoutingStep] = useState(0);
  const [mapExpanded, setMapExpanded] = useState(false);
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

  // Auto-start the simulation as soon as the routing phase finishes.
  const simStart = sim.start;
  useEffect(() => {
    if (phase === 'ready') simStart();
  }, [phase, simStart]);

  // Escape key collapses the map.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && mapExpanded) setMapExpanded(false);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [mapExpanded]);

  // Clean up timers on unmount.
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
        <div className={`map-wrap${mapExpanded ? ' map-expanded' : ''}`}>
          <div className="map-caption">
            AMB-7 · MLK Jr Way → Ashby Ave · Berkeley, CA
          </div>
          <MapToggleBtn expanded={mapExpanded} onToggle={() => setMapExpanded((v) => !v)} />
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
            expanded={mapExpanded}
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

          {/* Mini HUD visible only in expanded mode */}
          {mapExpanded && (
            <div className="map-mini-hud">
              <div className="mmh-stat">
                <span className="mmh-label">Speed</span>
                <span className="mmh-value mono">{sim.speedKmh.toFixed(0)} km/h</span>
              </div>
              <div className="mmh-divider" />
              <div className="mmh-stat">
                <span className="mmh-label">ETA</span>
                <span className="mmh-value mono">{sim.etaSec.toFixed(0)} s</span>
              </div>
              <div className="mmh-divider" />
              <div className="mmh-stat">
                <span className="mmh-label">Corridor</span>
                <span className={`mmh-value mmh-corridor ${sim.greenCorridor ? 'on' : ''}`}>
                  {sim.greenCorridor ? '● Priority Active' : '○ Standby'}
                </span>
              </div>
              <div className="mmh-divider" />
              <div className="mmh-stat">
                <span className="mmh-label">Saved</span>
                <span className="mmh-value mono mmh-saved">
                  {Math.max(0, sim.timeSavedSec).toFixed(0)} s
                </span>
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
        progress={sim.progress}
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
