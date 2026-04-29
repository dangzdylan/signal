/**
 * Realtime impact strip — the visual proof of V2I benefit.
 * Shows live ETA with vs. without preemption, seconds saved, and % improvement.
 */

type P = {
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
  return `${clamped.toFixed(0)}s`;
}

export function ImpactCounter(p: P) {
  const pctFaster = (1 - p.actualTotalSec / p.baselineTotalSec) * 100;
  const idle = !p.running && p.progress === 0;
  const runLabel = p.completed ? 'COMPLETE' : idle ? 'READY' : 'LIVE';
  return (
    <section
      className={`impact-counter ${idle ? 'idle' : ''}`}
      aria-label="Realtime V2I impact counter"
    >
      <div className="ic-head">
        <div className="ic-title">Realtime V2I Impact</div>
        <div className="ic-sub-title">
          Baseline: Fremont pilot ·{' '}
          <span className="ic-hl">{pctFaster.toFixed(0)}% faster</span> projected
        </div>
        <div className={`ic-pill ${p.completed ? 'done' : idle ? '' : 'live'}`}>{runLabel}</div>
      </div>
      <div className="ic-grid">
        <div className="ic-metric hero">
          <div className="ic-label">Time Saved</div>
          <div className="ic-num good">
            {fmtSec(p.timeSavedSec)}
            <span className="ic-trail"> ↑</span>
          </div>
          <div className="ic-foot">vs. same route without preemption</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">ETA · With V2I</div>
          <div className="ic-num">{fmtSec(p.actualEtaSec)}</div>
          <div className="ic-foot">corridor held green</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">ETA · Baseline</div>
          <div className="ic-num warn">{fmtSec(p.baselineEtaSec)}</div>
          <div className="ic-foot">no preemption, mixed cycle</div>
        </div>
        <div className="ic-metric">
          <div className="ic-label">Total Improvement</div>
          <div className="ic-num">{pctFaster.toFixed(0)}%</div>
          <div className="ic-foot">at arrival</div>
        </div>
      </div>
      <div
        className="ic-progress"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(Math.min(1, p.progress) * 100)}
      >
        <div
          className="ic-progress-fill v2i"
          style={{ width: `${Math.min(100, p.progress * 100)}%` }}
        />
        <div
          className="ic-progress-fill baseline"
          style={{
            width: `${Math.min(100, p.progress * 100 * (p.actualTotalSec / p.baselineTotalSec))}%`,
          }}
        />
        <div className="ic-progress-labels">
          <span className="v2i-mark">● With V2I</span>
          <span className="base-mark">○ Baseline (same clock)</span>
        </div>
      </div>
    </section>
  );
}
