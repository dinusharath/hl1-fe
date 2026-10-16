import { useEffect, useState } from "react";
import { approveDrift, dismissDrift, listDrift } from "../api";
import type { DriftObservation } from "../types";
import { MappingChips } from "./MappingChips";

const TITLE: Record<string, string> = {
  likely_rename: "A field stopped arriving",
  unmapped_enum: "A value we don’t recognise",
  format_change: "A format changed",
};

export function ReviewTab() {
  const [obs, setObs] = useState<DriftObservation[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const load = () => listDrift().then(setObs).catch(() => {});
  useEffect(() => {
    load();
    const t = setInterval(load, 3000);
    return () => clearInterval(t);
  }, []);

  const act = async (id: string, p: Promise<unknown>) => {
    setError("");
    setBusyId(id);
    try {
      await p;
      setObs((prev) => prev.filter((x) => x.id !== id)); // optimistic: drop it immediately
      await load();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusyId(null);
    }
  };

  if (obs.length === 0) {
    return <div className="empty">Nothing to review — no schema drift to act on.<br /><span className="muted">Forms waiting on a human are under Forms → Needs review.</span></div>;
  }
  return (
    <div className="list">
      {error && <div className="errbanner">Couldn’t complete that action: {error}</div>}
      {obs.map((o) => (
        <div key={o.id} className="card issue">
          <div className="irow">
            <div>
              <div className="ititle">{TITLE[o.type] ?? o.type}: <code>{o.fieldPath}</code></div>
              <div className="muted">{o.count} form{o.count !== 1 ? "s" : ""} affected</div>
            </div>
            <div className={`conf ${o.confidence !== null && o.confidence >= 0.85 ? "high" : "mid"}`}>
              {o.confidenceLabel}{o.confidence !== null ? ` · ${Math.round(o.confidence * 100)}%` : ""}
            </div>
          </div>
          {o.suggestion ? (
            <>
              <MappingChips s={o.suggestion} />
              {o.confidence !== null && (
                <div className="meter"><i style={{ width: `${Math.round(o.confidence * 100)}%` }} /></div>
              )}
              <div className="actions">
                <button className="btn primary" disabled={busyId === o.id} onClick={() => act(o.id, approveDrift(o.id))}>
                  {busyId === o.id ? "Approving…" : "Approve fix"}
                </button>
                <button className="btn ghost" disabled={busyId === o.id} onClick={() => act(o.id, dismissDrift(o.id))}>Dismiss</button>
              </div>
            </>
          ) : (
            <>
              <div className="muted" style={{ margin: "10px 0" }}>No confident suggestion — needs a manual mapping (see the Mappings tab).</div>
              <div className="actions"><button className="btn ghost" disabled={busyId === o.id} onClick={() => act(o.id, dismissDrift(o.id))}>Dismiss</button></div>
            </>
          )}
        </div>
      ))}
    </div>
  );
}
