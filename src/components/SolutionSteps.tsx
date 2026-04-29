/**
 * Horizontal 5-step flow tracker mirroring slide 8 ("Solution Steps").
 * The active step is driven from the sim state so the demo visibly progresses
 * through the same phases the audience just saw on the slide.
 */
import type { SolutionStep } from '../types';

type P = { step: SolutionStep };

type StepDef = {
  id: SolutionStep;
  label: string;
  sub: string;
};

const STEPS: StepDef[] = [
  { id: 'dispatch', label: 'Dispatch', sub: '911 → unit assigned' },
  { id: 'predicted', label: 'Route Predicted', sub: 'Corridor computed' },
  { id: 'corridor', label: 'Corridor Active', sub: 'Signals preempting' },
  { id: 'enroute', label: 'En Route', sub: 'Green wave held' },
  { id: 'arrived', label: 'Arrived', sub: 'Handoff at ER bay' },
];

export function SolutionSteps(p: P) {
  const activeIdx = STEPS.findIndex((s) => s.id === p.step);
  return (
    <nav
      className="solution-steps"
      aria-label="V2I solution flow steps"
      data-active={p.step}
    >
      {STEPS.map((s, i) => {
        const state = i < activeIdx ? 'done' : i === activeIdx ? 'active' : 'pending';
        return (
          <div key={s.id} className={`step step-${state}`}>
            <div className="step-marker">
              {state === 'done' ? (
                <svg viewBox="0 0 16 16" width="10" height="10" aria-hidden>
                  <path
                    d="M3 8.5l3 3 7-7"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                <span>{i + 1}</span>
              )}
            </div>
            <div className="step-body">
              <div className="step-label">{s.label}</div>
              <div className="step-sub">{s.sub}</div>
            </div>
            {i < STEPS.length - 1 ? <div className="step-sep" aria-hidden /> : null}
          </div>
        );
      })}
    </nav>
  );
}
