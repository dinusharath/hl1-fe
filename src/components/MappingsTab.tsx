import { useEffect, useState } from "react";
import { createMapping, deactivateMapping, getSchema, listMappings } from "../api";
import type { FieldMapping, SchemaMeta, Suggestion } from "../types";

export function MappingsTab() {
  const [rows, setRows] = useState<FieldMapping[]>([]);
  const [schema, setSchema] = useState<SchemaMeta | null>(null);
  const [includeInactive, setIncludeInactive] = useState(false);
  const [kind, setKind] = useState<"alias" | "enum" | "composite">("alias");
  const [sourceField, setSourceField] = useState(""); // open: the incoming field name
  const [combineFields, setCombineFields] = useState(""); // open: comma-separated fields, in order
  const [targetField, setTargetField] = useState(""); // constrained: a known schema field
  const [enumField, setEnumField] = useState(""); // constrained: a field with allowed values
  const [incomingValue, setIncomingValue] = useState(""); // open: the new value seen
  const [recordAs, setRecordAs] = useState(""); // constrained: an allowed value
  const [err, setErr] = useState("");

  const load = () => listMappings(includeInactive).then(setRows).catch(() => {});
  useEffect(() => { load(); }, [includeInactive]);
  useEffect(() => {
    getSchema().then((s) => {
      setSchema(s);
      setTargetField(s.targetFields[0] ?? "");
      setEnumField(s.enumFields[0] ?? "");
    }).catch(() => {});
  }, []);

  const allowedValues = schema && enumField ? schema.enumValues[enumField] ?? [] : [];

  const add = async () => {
    setErr("");
    let payload: Suggestion;
    if (kind === "alias") {
      if (!sourceField || !targetField) return setErr("Enter the incoming field and choose the schema field.");
      payload = { kind: "alias", sourcePath: sourceField, targetPath: targetField };
    } else if (kind === "composite") {
      const sources = combineFields.split(",").map((s) => s.trim()).filter(Boolean);
      if (sources.length < 2 || !targetField) return setErr("Enter at least two incoming fields (comma-separated, in order) and choose the schema field.");
      payload = { kind: "composite", sourcePath: sources[0], fallback: sources.slice(1), targetPath: targetField };
    } else {
      if (!enumField || !incomingValue || !recordAs) return setErr("Choose the field, enter the incoming value, and choose what to record it as.");
      payload = { kind: "enum", sourcePath: enumField, valueMap: { [incomingValue]: recordAs } };
    }
    try {
      await createMapping(payload);
      setSourceField(""); setIncomingValue(""); setCombineFields("");
      load();
    } catch (e) {
      setErr((e as Error).message);
    }
  };

  const describe = (m: FieldMapping): string => {
    if (m.kind === "alias") return `${m.sourcePath} → ${m.targetPath}`;
    if (m.kind === "composite") return `${[m.sourcePath, ...(m.fallback ?? [])].join(" + ")} → ${m.targetPath}`;
    const entries = Object.entries(m.valueMap ?? {});
    return entries.length ? `${m.sourcePath}: ${entries.map(([k, v]) => `${k} → ${v}`).join(", ")}` : m.sourcePath;
  };

  return (
    <>
      <div className="card form">
        <h3>Add a mapping</h3>
        <div className="row">
          <select value={kind} onChange={(e) => setKind(e.target.value as "alias" | "enum" | "composite")}>
            <option value="alias">Rename a field</option>
            <option value="composite">Combine fields</option>
            <option value="enum">Map a value</option>
          </select>

          {kind === "alias" ? (
            <>
              <input placeholder="incoming field (e.g. work_email)" value={sourceField} onChange={(e) => setSourceField(e.target.value)} />
              <span className="arrow">→</span>
              <select value={targetField} onChange={(e) => setTargetField(e.target.value)}>
                {schema?.targetFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </>
          ) : kind === "composite" ? (
            <>
              <input placeholder="incoming fields in order (e.g. firstName, lastName)" value={combineFields} onChange={(e) => setCombineFields(e.target.value)} />
              <span className="arrow">→</span>
              <select value={targetField} onChange={(e) => setTargetField(e.target.value)}>
                {schema?.targetFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
            </>
          ) : (
            <>
              <select value={enumField} onChange={(e) => { setEnumField(e.target.value); setRecordAs(""); }}>
                {schema?.enumFields.map((f) => <option key={f} value={f}>{f}</option>)}
              </select>
              <input placeholder="incoming value (e.g. nonbinary)" value={incomingValue} onChange={(e) => setIncomingValue(e.target.value)} />
              <span className="arrow">→</span>
              <select value={recordAs} onChange={(e) => setRecordAs(e.target.value)}>
                <option value="">record as…</option>
                {allowedValues.map((v) => <option key={v} value={v}>{v}</option>)}
              </select>
            </>
          )}
          <button className="btn primary" onClick={add}>Add</button>
        </div>
        <div className="muted" style={{ marginTop: 8 }}>
          The target {kind === "enum" ? "value" : "field"} is picked from the schema — you can’t point a mapping at something that doesn’t exist.
        </div>
        {err && <div className="muted" style={{ color: "var(--crit)" }}>{err}</div>}
      </div>

      <div className="row" style={{ margin: "4px 0 12px" }}>
        <label className="muted"><input type="checkbox" checked={includeInactive} onChange={(e) => setIncludeInactive(e.target.checked)} /> show inactive (history)</label>
      </div>

      <div className="list">
        {rows.length === 0 && <div className="empty">No mappings yet — add one above.</div>}
        {rows.map((m) => (
          <div key={m.id} className={`card amap${m.active ? "" : " inactive"}`}>
            <div className="irow">
              <div>
                <div className="ititle mono">{describe(m)}</div>
                <div className="muted">v{m.version} · {m.kind} · by {m.approvedBy}{m.active ? "" : " · inactive"}</div>
              </div>
              {m.active && <span className="badge-active">active</span>}
            </div>
            {m.active && (
              <div className="actions">
                <button className="btn ghost" onClick={async () => { await deactivateMapping(m.id); load(); }}>Deactivate</button>
              </div>
            )}
          </div>
        ))}
      </div>
    </>
  );
}
