import { useEffect, useState, type ReactNode } from "react";
import type { FormDetail, FormConflict, SchemaMeta } from "../types";
import { applyFormConflict, dismissFormConflict, getConflicts, getFormPayload, getSchema, manualMap } from "../api";

function Row({ k, v }: { k: string; v: ReactNode }) {
  return <div className="kv"><span className="k">{k}</span><span className="v">{v}</span></div>;
}

const isDeadLetter = (s: string) => s === "NEEDS_REVIEW" || s === "FAILED";

export function FormDetailPanel({ detail, onReplay }: { detail: FormDetail | null; onReplay: (id: string) => void }) {
  if (!detail) return null;
  const d = detail;
  const deliveries = d.outbox.length ? d.outbox.map((o) => `${o.type}=${o.status}`).join(", ") : "—";
  return (
    <div className="detail">
      <Row k="Form id" v={<span className="mono">{d.id}</span>} />
      <Row k="Status" v={<span className={`pill ${d.status}`}>{d.status.replace("_", " ")}</span>} />
      <div className="muted statusmsg">{d.statusMessage}</div>
      <Row k="Idempotency key" v={<span className="mono">{d.sessionId ?? "—"}</span>} />
      <Row k="Attempts" v={d.attempts} />
      <Row k="Duplicates seen" v={d.duplicateCount} />
      <Row k="Deliveries" v={<span className="mono">{deliveries}</span>} />
      <Row k="Transformed" v={d.transformed.exists ? (d.transformed.geocoded ? "yes · geocoded" : "yes") : "not yet"} />
      <div className="flags">
        Flags:{" "}
        {d.flags.length === 0 ? <span className="muted">none</span> : d.flags.map((f, i) => (
          <span key={i} className="flag" title={f.detail}>{f.code}</span>
        ))}
      </div>
      {d.lastError && <Row k="Last error" v={<span className="mono">{d.lastError}</span>} />}

      {d.pendingConflicts > 0 && <ConflictsPanel formId={d.id} count={d.pendingConflicts} />}

      {isDeadLetter(d.status) && (
        <div className="actions"><button className="btn primary" onClick={() => onReplay(d.id)}>Replay this form</button></div>
      )}

      {d.status === "NEEDS_REVIEW" && <ManualMapPanel formId={d.id} />}
    </div>
  );
}

/**
 * A session_id resent with different data never overwrites the original (see ingest.service on
 * the API) — the conflicting payload waits here, unredacted, so an operator can see both versions
 * and pick the real one. Apply re-enters the pipeline with the chosen payload; Dismiss keeps the
 * original exactly as it was.
 */
function ConflictsPanel({ formId, count }: { formId: string; count: number }) {
  const [conflicts, setConflicts] = useState<FormConflict[]>([]);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");

  const load = () => getConflicts(formId).then(setConflicts).catch(() => {});
  useEffect(() => { void load(); }, [formId, count]);

  const act = async (id: string, p: Promise<unknown>) => {
    setError(""); setBusyId(id);
    try { await p; await load(); } catch (e) { setError((e as Error).message); } finally { setBusyId(null); }
  };

  const pending = conflicts.filter((c) => c.resolution === null);
  if (pending.length === 0) return null;

  return (
    <div className="card issue" style={{ marginTop: 14 }}>
      <div className="ititle">This session was resent with different data</div>
      <div className="muted">The original above was never changed. Pick which version is correct.</div>
      {error && <div className="errbanner">{error}</div>}
      {pending.map((c) => (
        <div key={c.id} style={{ marginTop: 10 }}>
          <pre className="mono" style={{ fontSize: 12, whiteSpace: "pre-wrap", background: "var(--surface2)", border: "1px solid var(--border)", borderRadius: 8, padding: 10, margin: "6px 0" }}>
            {JSON.stringify(c.payload, null, 2)}
          </pre>
          <div className="muted" style={{ marginBottom: 6 }}>received {new Date(c.receivedAt).toLocaleString()}</div>
          <div className="actions">
            <button className="btn primary" disabled={busyId === c.id} onClick={() => act(c.id, applyFormConflict(formId, c.id))}>
              {busyId === c.id ? "Applying…" : "Use this version"}
            </button>
            <button className="btn ghost" disabled={busyId === c.id} onClick={() => act(c.id, dismissFormConflict(formId, c.id))}>Keep original</button>
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * The dead-end fix: when there's no (or no confident) drift suggestion, an operator maps the
 * stuck form's own fields by hand and sends it on — persisting the rule for future forms, or
 * applying it to just this one.
 */
function ManualMapPanel({ formId }: { formId: string }) {
  const [open, setOpen] = useState(false);
  const [fields, setFields] = useState<string[]>([]);
  const [schema, setSchema] = useState<SchemaMeta | null>(null);
  const [selected, setSelected] = useState<string[]>([]); // source fields, in order picked
  const [target, setTarget] = useState("");
  const [save, setSave] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);

  const onOpen = async () => {
    setOpen(true);
    setError("");
    try {
      const [payload, s] = await Promise.all([getFormPayload(formId), getSchema()]);
      setFields(Object.keys(payload));
      setSchema(s);
      setTarget(s.targetFields[0] ?? "");
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const toggle = (f: string) => setSelected((prev) => (prev.includes(f) ? prev.filter((x) => x !== f) : [...prev, f]));

  const apply = async () => {
    if (selected.length === 0 || !target) return setError("Pick at least one field and a target.");
    setError(""); setBusy(true);
    try {
      const rule = selected.length === 1
        ? { kind: "alias" as const, sourcePath: selected[0], targetPath: target }
        : { kind: "composite" as const, sourcePath: selected[0], fallback: selected.slice(1), targetPath: target };
      await manualMap(formId, [rule], save);
      setDone(true);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return <div className="card" style={{ marginTop: 14 }}><div className="muted">Sent — this form will reprocess in a moment.{save ? " The mapping was saved for future forms too." : ""}</div></div>;
  }

  if (!open) {
    return (
      <div className="actions" style={{ marginTop: 10 }}>
        <button className="btn ghost" onClick={onOpen}>Map fields by hand</button>
      </div>
    );
  }

  return (
    <div className="card form" style={{ marginTop: 14 }}>
      <h3>Map fields by hand</h3>
      <div className="muted" style={{ marginBottom: 10 }}>
        Pick the field(s) this form actually sent, and which schema field they belong to. Picking more than one combines them (e.g. a first name and a last name into one name).
      </div>
      {error && <div className="errbanner">{error}</div>}
      <div className="row" style={{ flexWrap: "wrap" }}>
        {fields.map((f) => (
          <label key={f} className="muted" style={{ display: "flex", alignItems: "center", gap: 4 }}>
            <input type="checkbox" checked={selected.includes(f)} onChange={() => toggle(f)} />
            <span className="mono">{f}</span>
          </label>
        ))}
      </div>
      <div className="row">
        <span className="arrow">→</span>
        <select value={target} onChange={(e) => setTarget(e.target.value)}>
          {schema?.targetFields.map((f) => <option key={f} value={f}>{f}</option>)}
        </select>
      </div>
      <div className="row">
        <label className="muted"><input type="checkbox" checked={save} onChange={(e) => setSave(e.target.checked)} /> Save this as a mapping for future forms too</label>
      </div>
      <div className="actions">
        <button className="btn primary" disabled={busy} onClick={apply}>{busy ? "Sending…" : "Apply & send"}</button>
        <button className="btn ghost" disabled={busy} onClick={() => setOpen(false)}>Cancel</button>
      </div>
    </div>
  );
}
