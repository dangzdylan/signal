/**
 * Full-screen incoming dispatch notification. Shown before the demo starts.
 * Gives the impression of a CAD (Computer-Aided Dispatch) alert popping up
 * over the operator's dashboard.
 */
type P = {
  onAccept: () => void;
};

export function IncomingCall({ onAccept }: P) {
  return (
    <div className="ic-screen">
      <div className="ic-card">
        <div className="ic-alert-bar">
          <span className="ic-alert-dot" />
          INCOMING EMERGENCY DISPATCH
        </div>

        <div className="ic-card-body">
          <div className="ic-section">
            <div className="ic-row">
              <Cell label="Call ID" value="E-2026-0428-0312" mono />
              <Cell label="Priority" value="P1 — Life Threatening" accent="red" />
            </div>
            <div className="ic-row">
              <Cell label="Unit" value="AMB-7 · Berkeley Fire Station 2" mono />
              <Cell label="Region" value="East Bay / EBRICS Zone 4" />
            </div>
          </div>

          <div className="ic-divider" />

          <div className="ic-section">
            <div className="ic-route-row">
              <div className="ic-route-point">
                <span className="ic-route-icon origin">▲</span>
                <div>
                  <div className="ic-route-label">Origin</div>
                  <div className="ic-route-value">Berkeley Fire Station 2 · 2029 Berkeley Way</div>
                </div>
              </div>
              <div className="ic-route-line" />
              <div className="ic-route-point">
                <span className="ic-route-icon dest">✚</span>
                <div>
                  <div className="ic-route-label">Destination</div>
                  <div className="ic-route-value">Alta Bates Summit Medical Center · ER Bay</div>
                </div>
              </div>
            </div>
          </div>

          <div className="ic-divider" />

          <div className="ic-section">
            <div className="ic-patient-header">Patient (auto-populated from CAD)</div>
            <div className="ic-patient-row">
              <Cell label="Chief Complaint" value="Unresponsive → responsive; suspected STEMI" />
              <Cell label="Vitals" value="HR 112 · SpO₂ 95% · BP 148/92" mono />
            </div>
          </div>

          <div className="ic-divider" />

          <div className="ic-v2i-note">
            <span className="ic-v2i-icon">📡</span>
            V2I corridor available on Shattuck Ave · Signal preemption will be requested automatically
          </div>
        </div>

        <div className="ic-actions">
          <button type="button" className="ic-btn ignore">
            Ignore
          </button>
          <button type="button" className="ic-btn accept" onClick={onAccept}>
            Accept Dispatch
          </button>
        </div>
      </div>
    </div>
  );
}

function Cell({
  label,
  value,
  mono,
  accent,
}: {
  label: string;
  value: string;
  mono?: boolean;
  accent?: 'red';
}) {
  return (
    <div className="ic-cell">
      <div className="ic-cell-label">{label}</div>
      <div
        className={`ic-cell-value ${mono ? 'mono' : ''} ${accent === 'red' ? 'ic-cell-red' : ''}`}
      >
        {value}
      </div>
    </div>
  );
}
