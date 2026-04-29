/**
 * Real Berkeley map for the V2I demo: a react-leaflet MapContainer with
 * CartoDB Positron tiles, plus an absolutely-positioned SVG overlay that
 * holds the ambulance, traffic-light placeholders, route polyline, predictive
 * corridor, and live Berkeley streetlights fetched from the City dataset.
 *
 * The simulation works in lat/lng (Point2: x = lng, y = lat). Every render
 * we project those into container pixels via `map.latLngToContainerPoint`
 * so the existing SVG-based rendering and animations carry over unchanged.
 */
import { useEffect, useLayoutEffect, useState } from 'react';
import { MapContainer, TileLayer, useMap, useMapEvents } from 'react-leaflet';
import { Ambulance } from './Ambulance';
import { TrafficLight } from './TrafficLight';
import { ROUTE, getLookaheadPath } from '../data/route';
import { MAP_VIEW } from '../data/cityLayout';
import type { TrafficLightState } from '../types';

/** A single streetlight record from the City of Berkeley dataset (dz4s-un9u). */
type Streetlight = {
  id: string;
  lat: number;
  lng: number;
  /** Deterministic cycle offset derived from the facility ID. */
  offset: number;
};

/** Simple hash → spread offsets across the 9-second cycle. */
function hashOffset(id: string): number {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) & 0x7fffffff;
  return h % 9000;
}

const CYCLE_MS = 9000;
const RED_END = 4000;
const YELLOW_END = 5500;

function streetlightPhase(cityTimeMs: number, offset: number): 'red' | 'yellow' | 'green' {
  const c = (cityTimeMs + offset) % CYCLE_MS;
  if (c < RED_END) return 'red';
  if (c < YELLOW_END) return 'yellow';
  return 'green';
}

const PHASE_FILL: Record<'red' | 'yellow' | 'green', string> = {
  red: '#e53e3e',
  yellow: '#d97706',
  green: '#16a34a',
};

type P = {
  /** Live states from the simulation (corridor lights). */
  lights: TrafficLightState[];
  ambulance: { x: number; y: number };
  headingRad: number;
  /** 0..1 progress along the route; drives the predictive overlay. */
  progress: number;
  /** Preempt lookahead in meters; the glowing corridor extends this far. */
  lookaheadDist: number;
  /** Whether the corridor has actively taken at least one signal green. */
  greenCorridor: boolean;
  /** Always-running wall-clock ms — drives background light cycling. */
  cityTimeMs: number;
  /** Hide the ambulance sprite (used during the routing-calculation phase). */
  showAmbulance?: boolean;
  /** Suppress all SVG overlay content — map tiles still show (incoming-call phase). */
  hideOverlay?: boolean;
  /** Whether the map is in full-screen expanded mode; triggers invalidateSize. */
  expanded?: boolean;
};

export function MapShell(p: P) {
  const [streetlights, setStreetlights] = useState<Streetlight[]>([]);

  useEffect(() => {
    const bounds = MAP_VIEW.bounds;
    const [sw, ne] = bounds;
    const url =
      `https://data.cityofberkeley.info/resource/dz4s-un9u.json` +
      `?$limit=500` +
      `&$select=facilityid,latitude,longitude` +
      `&$where=latitude>${sw[0]} AND latitude<${ne[0]} AND longitude>${sw[1]} AND longitude<${ne[1]}`;

    fetch(url)
      .then((r) => r.json())
      .then((rows: { facilityid: string; latitude: string; longitude: string }[]) => {
        setStreetlights(
          rows
            .filter((r) => r.latitude && r.longitude)
            .map((r) => ({
              id: r.facilityid,
              lat: parseFloat(r.latitude),
              lng: parseFloat(r.longitude),
              offset: hashOffset(r.facilityid),
            })),
        );
      })
      .catch(() => {
        // Silently degrade — demo works without the extra lights.
      });
  }, []);

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
        url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
        subdomains="abcd"
        maxZoom={19}
      />
      <SvgOverlay {...p} streetlights={streetlights} hideOverlay={p.hideOverlay} expanded={p.expanded} />
    </MapContainer>
  );
}

type OverlayP = P & { streetlights: Streetlight[]; hideOverlay?: boolean; expanded?: boolean };

/**
 * Inner component that has access to the Leaflet map via `useMap()`. It
 * re-renders on every map move/zoom event, projecting all simulation lat/lng
 * points into container pixel coordinates.
 */
function SvgOverlay(p: OverlayP) {
  const map = useMap();
  const [, setTick] = useState(0);
  useMapEvents({
    move: () => setTick((t) => t + 1),
    zoomend: () => setTick((t) => t + 1),
    resize: () => setTick((t) => t + 1),
  });

  // When the map container changes size (expand/collapse), tell Leaflet so it
  // re-renders tiles to fill the new viewport. useLayoutEffect fires after the
  // DOM update so the container already has its new dimensions.
  useLayoutEffect(() => {
    map.invalidateSize({ animate: false });
  }, [map, p.expanded]);

  const size = map.getSize();

  // During the incoming-call phase show only the bare map tiles.
  if (p.hideOverlay) return null;

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

      {/* Berkeley streetlights — fetched live from City dataset dz4s-un9u */}
      <g aria-hidden>
        {p.streetlights.map((sl) => {
          const pt = project(sl.lng, sl.lat);
          const phase = streetlightPhase(p.cityTimeMs, sl.offset);
          return (
            <circle
              key={sl.id}
              cx={pt.x}
              cy={pt.y}
              r={3}
              fill={PHASE_FILL[phase]}
              opacity={0.55}
            />
          );
        })}
      </g>

      <polyline
        points={routeStr}
        fill="none"
        stroke="rgba(180,0,30,0.18)"
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
            stroke="rgba(0,140,70,0.22)"
            strokeWidth={18}
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#glow)"
            className="lookahead-wide"
          />
          <polyline
            points={lookaheadStr}
            fill="none"
            stroke="#00a050"
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

      {/* Destination marker — Alta Bates Summit ER */}
      {(() => {
        const dest = ROUTE.waypoints[ROUTE.waypoints.length - 1]!;
        const dpt = project(dest.x, dest.y);
        return (
          <g
            transform={`translate(${dpt.x.toFixed(1)},${dpt.y.toFixed(1)})`}
            aria-label="Alta Bates Summit ER — destination"
          >
            <circle r={22} fill="none" stroke="#c0001a" strokeWidth={1.2} className="dest-ring" />
            <circle r={13} fill="rgba(255,255,255,0.92)" stroke="#c0001a" strokeWidth={1.8} />
            <path d="M0,-5.5 L0,5.5 M-5.5,0 L5.5,0" stroke="#c0001a" strokeWidth={2.5} strokeLinecap="round" />
            <text
              y={30}
              textAnchor="middle"
              fontSize={9}
              fontWeight="700"
              fill="#c0001a"
              fontFamily="system-ui,sans-serif"
              style={{ pointerEvents: 'none' }}
            >
              Alta Bates ER
            </text>
          </g>
        );
      })()}

      {p.showAmbulance !== false && (
        <Ambulance x={ambPt.x} y={ambPt.y} rad={p.headingRad} scale={0.9} />
      )}
    </svg>
  );
}
