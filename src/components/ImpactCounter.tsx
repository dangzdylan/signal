/**
 * Route Telemetry — six real-time timing metrics for the dispatch dashboard.
 * ETA is the primary metric; Time Saved is last and not the hero.
 * Shows a loading overlay during the routing phase.
 */
import { FAKE_EPOCH } from '../data/scenario';

type DemoPhase = 'incoming' | 'routing' | 'ready';

type P = {
  phase: DemoPhase;
  timeSavedSec: number;
  actualEtaSec: number;
  baselineEtaSec: number;
  actualTotalSec: number;
  baselineTotalSec: number;
  completed: boolean;
  running: boolean;
  progress: number;
};

function fmtSec(s: number): string {
  const clamped = Math.max(0, s);
  if (clamped >= 60) {
    const m = Math.floor(clamped / 60);
    const r = Math.round(clamped % 60);
    return `${m}m ${r.toString().padStart(2, '0')}s`;
  }
  return `${Math.round(clamped)}s`;
}

function fmtClock(epochMs: number, offsetSec: number): string {
  const d = new Date(epochMs + offsetSec * 1000);
  const h = d.getUTCHours().toString().padStart(2, '0');
  const m = d.getUTCMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
}

export function ImpactCounter(p: P) {
  const idle = !p.running && p.progress === 0;
  const runLabel = p.completed ? 'COMPLETE' : idle ? 'READY' : 'LIVE';

  const elapsedSec = p.progress * p.actualTotalSec;
  const pctComplete = Math.min(100, p.progress * 100);

  // Simulated wall-clock arrival = scenario start + elapsed so far + remaining ETA
  const arrivalClock = fmtClock(FAKE_EPOCH.getTime(), elapsedSec + p.actualEtaSec);

  return (
    <section
      className={`impact-counter ${idle ? 'idle' : ''}`}
      aria-label="Route telemetry"
    >
      <div className="ic-head">
        <div className="ic-title">Route Telemetry</div>
        <div className={`ic-pill ${p.completed ? 'done' : idle ? '' : 'live'}`}>{runLabel}</div>
      </div>

      <div className="ic-grid">
        {/* Row 1 — primary operational metrics */}
        <div className="ic-metric primary">
          <div className="ic-label">ETA to Hospital</div>
          <div className="ic-num primary">{p.completed ? '0s' : fmtSec(p.actualEtaSec)}</div>
          <div className="ic-foot">remaining with V2I active</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">Time Elapsed</div>
          <div className="ic-num">{fmtSec(elapsedSec)}</div>
          <div className="ic-foot">since departure</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">Route Complete</div>
          <div className="ic-num">{pctComplete.toFixed(0)}<span className="ic-unit">%</span></div>
          <div className="ic-foot">of MLK Jr Way corridor</div>
        </div>

        {/* Row 2 — comparative & derived */}
        <div className="ic-metric">
          <div className="ic-label">Est. Arrival</div>
          <div className="ic-num">{arrivalClock}</div>
          <div className="ic-foot">wall clock (UTC)</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">Baseline ETA</div>
          <div className="ic-num warn">{p.completed ? fmtSec(0) : fmtSec(p.baselineEtaSec)}</div>
          <div className="ic-foot">no preemption, mixed signals</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">Time Saved</div>
          <div className="ic-num">
            {fmtSec(p.timeSavedSec)}
            <span className="ic-trail"> ↑</span>
          </div>
          <div className="ic-foot">vs. baseline run</div>
        </div>
      </div>

      <div
        className="ic-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(pctComplete)}
      >
        <div
          className="ic-progress-fill v2i"
          style={{ width: `${pctComplete}%` }}
        />
        <div
          className="ic-progress-fill baseline"
          style={{
            width: `${Math.min(100, p.progress * 100 * (p.actualTotalSec / p.baselineTotalSec))}%`,
          }}
        />
        <div className="ic-progress-labels">
          <span className="v2i-mark">● V2I run</span>
          <span className="base-mark">○ Baseline (same clock)</span>
        </div>
      </div>

      {p.phase === 'routing' && (
        <div className="ic-loading-overlay">
          <div className="ic-loading-spinner" />
          <div className="ic-loading-text">Calculating route…</div>
        </div>
      )}
    </section>
  );
}
