/**
 * The stylized "neon city" map: streets + route + traffic lights + ambulance.
 * All geometry is in viewBox 0 0 920 520; parent controls width/height in CSS.
 */
import { Ambulance } from './Ambulance';
import { TrafficLight } from './TrafficLight';
import { ROUTE } from '../data/route';
import { MAP_VIEW, STREET_SEGMENTS } from '../data/cityLayout';
import type { TrafficLightState } from '../types';

type P = {
  /** Live states from the simulation (includes decorative lights). */
  lights: TrafficLightState[];
  ambulance: { x: number; y: number };
  headingRad: number;
};

const vb = `0 0 ${MAP_VIEW.w} ${MAP_VIEW.h}`;

export function CityMap(p: P) {
  const pts = ROUTE.waypoints.map((w) => `${w.x},${w.y}`).join(' ');

  return (
    <svg
      className="city-map"
      viewBox={vb}
      width="100%"
      height="100%"
      role="img"
      aria-label="Stylized map with ambulance route, traffic lights, and vehicle position"
    >
      <defs>
        <filter id="glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.2" result="b" />
          <feMerge>
            <feMergeNode in="b" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="glowCyan" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3df5ff" stopOpacity="0.7" />
          <stop offset="100%" stopColor="#3df5ff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sirenA" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#ff3b3b" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#ff3b3b" stopOpacity="0" />
        </radialGradient>
        <radialGradient id="sirenB" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#3b7dff" stopOpacity="0.9" />
          <stop offset="100%" stopColor="#3b7dff" stopOpacity="0" />
        </radialGradient>
        <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
          <path d="M 20 0 L 0 0 0 20" fill="none" stroke="rgba(80,100,150,0.12)" strokeWidth="0.5" />
        </pattern>
      </defs>

      <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="#060912" />
      <rect width={MAP_VIEW.w} height={MAP_VIEW.h} fill="url(#grid)" opacity={0.4} />

      {STREET_SEGMENTS.map((sg) => (
        <g key={sg.id}>
          <line
            x1={sg.from.x}
            y1={sg.from.y}
            x2={sg.to.x}
            y2={sg.to.y}
            stroke="rgba(45, 55, 85,0.5)"
            strokeWidth={4}
            strokeLinecap="round"
          />
          <line
            x1={sg.from.x}
            y1={sg.from.y}
            x2={sg.to.x}
            y2={sg.to.y}
            stroke="rgba(120, 140, 200,0.16)"
            strokeWidth={1.2}
            strokeLinecap="round"
          />
        </g>
      ))}

      <polyline
        points={pts}
        fill="none"
        stroke="rgba(40,0,0,0.3)"
        strokeWidth={8}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={pts}
        fill="none"
        stroke="#ff3355"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="10 20"
        filter="url(#glow)"
        className="route-line"
      />

      {p.lights.map((L) => (
        <TrafficLight
          key={L.id}
          x={L.x}
          y={L.y}
          size={L.onCorridor ? 0.9 : 0.75}
          id={L.id}
          phase={L.phase}
          mode={L.mode}
          onCorridor={L.onCorridor}
        />
      ))}

      <Ambulance x={p.ambulance.x} y={p.ambulance.y} rad={p.headingRad} scale={0.9} />
    </svg>
  );
}
