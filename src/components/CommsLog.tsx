/**
 * V2I / central office style scrollback. Grows with new lines; the container
 * auto-scrolls the bottom into view for a "live" feel.
 *
 * Each line is tagged with its originating department (slide 9 stack):
 * AVL Provider, Public Works, East Bay Regional Comms, IT Systems.
 */
import { useEffect, useRef } from 'react';
import type { CommsMessage, CommsSource } from '../types';

type P = { items: CommsMessage[] };

const SOURCE_META: Record<CommsSource, { label: string; full: string; hint: string }> = {
  AVL: {
    label: 'AVL',
    full: 'AVL Provider',
    hint: 'Vehicle location telemetry feed',
  },
  PWD: {
    label: 'PWD',
    full: 'Public Works Dept.',
    hint: 'NTCIP-enabled signal controllers',
  },
  EBRICS: {
    label: 'EBRICS',
    full: 'East Bay Regional Comms',
    hint: 'Central dispatch & corridor grant authority',
  },
  ITSS: {
    label: 'ITSS',
    full: 'IT Systems',
    hint: 'Integration + boot / session mgmt',
  },
};

const SOURCES: CommsSource[] = ['AVL', 'EBRICS', 'PWD', 'ITSS'];

export function CommsLog(p: P) {
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [p.items.length]);

  return (
    <section className="comms-log" aria-label="V2I communication log">
      <div className="comms-header">
        <span>V2I Communication Log · Real-time signal preemption messages</span>
        <div className="comms-legend" aria-label="Department legend">
          {SOURCES.map((src) => {
            const meta = SOURCE_META[src];
            return (
              <span
                key={src}
                className={`src-badge legend src-${src.toLowerCase()}`}
                title={`${meta.full} — ${meta.hint}`}
              >
                {meta.label}
              </span>
            );
          })}
        </div>
      </div>
      <div className="comms-body mono">
        {p.items.map((m) => {
          const meta = SOURCE_META[m.source];
          return (
            <div key={m.id} className={`comms-line k-${m.kind}`}>
              <span
                className={`src-badge src-${m.source.toLowerCase()}`}
                title={`${meta.full} — ${meta.hint}`}
              >
                {meta.label}
              </span>
              <span className="comms-text">{m.line}</span>
            </div>
          );
        })}
        <div ref={end} />
      </div>
    </section>
  );
}
