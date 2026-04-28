/**
 * Real Berkeley map for the V2I demo: a react-leaflet MapContainer with
 * CartoDB Dark Matter tiles, plus an absolutely-positioned SVG overlay that
 * holds the ambulance, traffic-light placeholders, route polyline, and
 * predictive corridor.
 *
 * The simulation works in lat/lng (Point2: x = lng, y = lat). Every render
 * we project those into container pixels via `map.latLngToContainerPoint`
 * so the existing SVG-based rendering and animations carry over unchanged.
 *
 * Zoom animation is disabled so each zoom step snaps and the overlay stays
 * locked to the underlying map without mid-animation drift.
 */
import { useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Ambulance } from './Ambulance';
import { TrafficLight } from './TrafficLight';
import { ROUTE, getLookaheadPath } from '../data/route';
import { MAP_VIEW } from '../data/cityLayout';
import type { TrafficLightState } from '../types';

type P = {
  /** Live states from the simulation (includes decorative lights). */
  lights: TrafficLightState[];
  ambulance: { x: number; y: number };
  headingRad: number;
  /** 0..1 progress along the route; drives the predictive overlay. */
  progress: number;
  /** Preempt lookahead in meters; the glowing corridor extends this far. */
  lookaheadDist: number;
  /** Whether the corridor has actively taken at least one signal green. */
  greenCorridor: boolean;
};

export function MapShell(p: P) {
  return (
    <MapContainer
      className="city-map"
      center={MAP_VIEW.center}
      zoom={MAP_VIEW.zoom}
      minZoom={13}
      maxZoom={18}
      style={{ width: '100%', height: '100%' }}
      zoomAnimation={false}
      markerZoomAnimation={false}
      attributionControl
      zoomControl
    >
      <TileLayer
        url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <SvgOverlay {...p} />
    </MapContainer>
  );
}

/**
 * Inner component that has access to the Leaflet map via `useMap()`. It
 * re-renders on every map move/zoom event, projecting all simulation lat/lng
 * points into container pixel coordinates.
 */
function SvgOverlay(p: P) {
  const map = useMap();
  const [, setTick] = useState(0);
  useMapEvents({
    move: () => setTick((t) => t + 1),
    zoomend: () => setTick((t) => t + 1),
    resize: () => setTick((t) => t + 1),
  });

  const size = map.getSize();

  const project = (lng: number, lat: number) => {
    const pt = map.latLngToContainerPoint([lat, lng]);
    return { x: pt.x, y: pt.y };
  };

  const routeStr = ROUTE.waypoints
    .map((w) => project(w.x, w.y))
    .map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');

  const lookaheadCoords =
    p.progress < 0.995
      ? getLookaheadPath(p.progress, p.lookaheadDist).map((w) => project(w.x, w.y))
      : [];
  const lookaheadStr = lookaheadCoords
    .map((pt) => `${pt.x.toFixed(1)},${pt.y.toFixed(1)}`)
    .join(' ');
  const showLookahead = lookaheadCoords.length > 1;

  const ambPt = project(p.ambulance.x, p.ambulance.y);

  return (
    <svg
      className="city-map-overlay"
      width={size.x}
      height={size.y}
      viewBox={`0 0 ${size.x} ${size.y}`}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
        zIndex: 450,
      }}
      role="img"
      aria-label="Ambulance route, traffic lights, and vehicle position"
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
      </defs>

      <polyline
        points={routeStr}
        fill="none"
        stroke="rgba(40,0,0,0.55)"
        strokeWidth={9}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <polyline
        points={routeStr}
        fill="none"
        stroke="#ff3355"
        strokeWidth={3.5}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="10 20"
        filter="url(#glow)"
        className="route-line"
      />

      {showLookahead ? (
        <g className="lookahead-group" aria-hidden>
          <polyline
            points={lookaheadStr}
            fill="none"
            stroke="rgba(80,255,150,0.28)"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="lookahead-wide"
          />
          <polyline
            points={lookaheadStr}
            fill="none"
            stroke="#4dff88"
            strokeWidth={3}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeDasharray="6 10"
            className={`lookahead-core ${p.greenCorridor ? 'active' : ''}`}
            opacity={0.95}
          />
        </g>
      ) : null}

      {p.lights.map((L) => {
        const pt = project(L.x, L.y);
        return (
          <TrafficLight
            key={L.id}
            x={pt.x}
            y={pt.y}
            size={L.onCorridor ? 0.9 : 0.75}
            id={L.id}
            phase={L.phase}
            mode={L.mode}
            onCorridor={L.onCorridor}
          />
        );
      })}

      <Ambulance x={ambPt.x} y={ambPt.y} rad={p.headingRad} scale={0.9} />
    </svg>
  );
}
