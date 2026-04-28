/**
 * A single traffic light: three lamps + optional "TSP" ring when the controller
 * has granted preemption to the emergency vehicle.
 */
import type { LightPhase, LightMode } from '../types';

type P = {
  x: number;
  y: number;
  /** Visual scale. */
  size?: number;
  phase: LightPhase;
  mode: LightMode;
  id: string;
  /** `false` = background intersection (smaller, dimmer). */
  onCorridor: boolean;
};

const COLORS: Record<LightPhase, { fill: string; glow: string }> = {
  red: { fill: '#ff2d2d', glow: 'rgba(255,60,60,0.7)' },
  yellow: { fill: '#ffd54a', glow: 'rgba(255,220,80,0.7)' },
  green: { fill: '#4dff88', glow: 'rgba(80,255,140,0.7)' },
};

export function TrafficLight(p: P) {
  const s = p.size ?? 1;
  const r = 5 * s;
  /** Pixel spacing from center: three bulbs, top to bottom. */
  const step = 12 * s;
  const c = (k: 0 | 1 | 2) =>
    ({ x: p.x, y: p.y + (k - 1) * step } as const);
  const isPre = p.mode === 'preempt' && p.onCorridor;
  const isArming = p.mode === 'arming' && p.onCorridor;
  const dim = p.onCorridor ? 1 : 0.55;
  // Red on top, yellow center, green bottom (N.A. style layout).
  const onIdx = p.phase === 'red' ? 0 : p.phase === 'yellow' ? 1 : 2;

  return (
    <g>
      {isArming ? (
        <circle
          cx={p.x}
          cy={p.y}
          r={r + 12 * s}
          fill="none"
          stroke="rgba(255, 190, 70, 0.85)"
          strokeWidth={2 * s}
          strokeDasharray="3 3"
          className="tsp-arming"
          opacity={0.85}
        />
      ) : null}
      {isPre ? (
        <circle
          cx={p.x}
          cy={p.y}
          r={r + 16 * s}
          fill="none"
          stroke="url(#glowCyan)"
          strokeWidth={2.5 * s}
          className="tsp-pulse"
          opacity={0.95}
        />
      ) : null}
      {([0, 1, 2] as const).map((k) => {
        const pos = c(k);
        const on = onIdx === k;
        const ph = (['red', 'yellow', 'green'] as const)[k] ?? 'red';
        const col = COLORS[on ? ph : 'red'];
        return (
          <g key={k}>
            {on && (
              <circle
                cx={pos.x}
                cy={pos.y}
                r={r + 4}
                fill="none"
                stroke={col.glow}
                strokeWidth={4}
                opacity={0.6 * dim}
                filter="url(#glow)"
              />
            )}
            <circle
              cx={pos.x}
              cy={pos.y}
              r={r}
              fill={on ? col.fill : '#1a1d28'}
              stroke="#2a2f3d"
              strokeWidth={1}
              opacity={on ? 1 * dim : 0.35 * dim}
            />
          </g>
        );
      })}
      <text
        x={p.x + r + 2}
        y={p.y + 4 * s}
        fill="rgba(200,220,255,0.45)"
        fontSize={7 * s}
        className="mono"
        style={{ userSelect: 'none' }}
      >
        {p.id}
      </text>
    </g>
  );
}
