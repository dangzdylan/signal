/**
 * Playback controls: resume/pause/reset and speed multiplier.
 */
type P = {
  running: boolean;
  progress: number;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  playSpeed: number;
  onSpeed: (n: number) => void;
};

const SPEEDS = [0.5, 1, 2, 4] as const;

export function ControlBar(p: P) {
  const midRun = p.progress > 0 && p.progress < 1;
  const startLabel = midRun && !p.running ? 'Resume' : 'Start';

  return (
    <div className="control-bar">
      <div className="cb-left">
        <button type="button" className="btn primary" onClick={p.onStart} disabled={p.running}>
          {startLabel}
        </button>
        <button type="button" className="btn" onClick={p.onPause} disabled={!p.running}>
          Pause
        </button>
        <button type="button" className="btn" onClick={p.onReset}>
          Reset
        </button>
      </div>
      <div className="cb-right">
        <span className="label">Speed</span>
        {SPEEDS.map((n) => (
          <button
            type="button"
            key={n}
            className={`btn sm ${p.playSpeed === n ? 'on' : ''}`}
            onClick={() => p.onSpeed(n)}
          >
            {n}×
          </button>
        ))}
      </div>
    </div>
  );
}
