/**
 * User controls: start, pause, reset, and playback rate. Wires to the
 * `useSimulation` actions so the map and HUD always stay in sync.
 */
type P = {
  running: boolean;
  onStart: () => void;
  onPause: () => void;
  onReset: () => void;
  playSpeed: number;
  onSpeed: (n: number) => void;
};

const SPEEDS = [0.5, 1, 2, 4] as const;

export function ControlBar(p: P) {
  return (
    <div className="control-bar">
      <div className="cb-left">
        <button type="button" className="btn primary" onClick={p.onStart}>
          Start
        </button>
        <button type="button" className="btn" onClick={p.onPause} disabled={!p.running}>
          Pause
        </button>
        <button type="button" className="btn" onClick={p.onReset}>
          Reset
        </button>
        <span className="cb-hint mono">{p.running ? '▶ simulating' : '⏸ paused'}</span>
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
            {n}x
          </button>
        ))}
      </div>
    </div>
  );
}
