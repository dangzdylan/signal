/**
 * The ambulance mark: a simple car silhouette + a pulsing siren field so the
 * eye can track the vehicle along the red route.
 */
type P = {
  x: number;
  y: number;
  /** Heading in radians, +x = 0. */
  rad: number;
  scale?: number;
};

export function Ambulance(p: P) {
  const { x, y, rad } = p;
  const s = p.scale ?? 1;
  const a = (rad * 180) / Math.PI;
  return (
    <g transform={`translate(${x},${y}) rotate(${a})`}>
      <circle r={22 * s} className="siren-pulse" fill="url(#sirenA)" opacity={0.45} />
      <circle r={18 * s} className="siren-pulse" fill="url(#sirenB)" opacity={0.4} style={{ animationDelay: '0.2s' }} />
      <rect x={-20 * s} y={-8 * s} width={40 * s} height={16 * s} rx={3} fill="#f5f6fa" stroke="#b8c0d0" />
      <rect x={-6 * s} y={-10 * s} width={20 * s} height={6 * s} rx={2} fill="#e0e3ea" />
      <rect x={-14 * s} y={-4 * s} width={8 * s} height={4 * s} fill="#d91a1a" />
      <rect x={-3 * s} y={-4 * s} width={5 * s} height={4 * s} fill="#1a4fd9" />
      <text
        x={-12 * s}
        y={4 * s}
        fontSize={7 * s}
        fill="#333"
        className="mono"
        style={{ userSelect: 'none' }}
      >
        AMB
      </text>
    </g>
  );
}
