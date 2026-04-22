/**
 * V2I / central office style scrollback. Grows with new lines; the container
 * auto-scrolls the bottom into view for a "live" feel.
 */
import { useEffect, useRef } from 'react';
import type { CommsMessage } from '../types';

type P = { items: CommsMessage[] };

export function CommsLog(p: P) {
  const end = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    end.current?.scrollIntoView({ behavior: 'smooth' });
  }, [p.items.length]);

  return (
    <section className="comms-log" aria-label="V2I communication log">
      <div className="comms-header">Vehicle ↔ Intersection (V2I) + Central</div>
      <div className="comms-body mono">
        {p.items.map((m) => (
          <div key={m.id} className={`comms-line k-${m.kind}`}>
            {m.line}
          </div>
        ))}
        <div ref={end} />
      </div>
    </section>
  );
}
