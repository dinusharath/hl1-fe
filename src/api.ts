import type { DriftObservation, FieldMapping, FormConflict, FormDetail, FormSummary, SchemaMeta, Stats, Suggestion } from "./types";

/** API base — configurable per environment (.env → VITE_API_BASE). */
export const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3000";

export interface IngestResult {
  httpStatus: number;
  body: { id?: string; outcome?: string; status?: string; error?: string };
}

export async function ingest(payload: string): Promise<IngestResult> {
  const res = await fetch(`${API_BASE}/ingest`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: payload,
  });
  const body = await res.json().catch(() => ({}));
  return { httpStatus: res.status, body };
}

export async function listForms(status?: string): Promise<FormSummary[]> {
  const res = await fetch(`${API_BASE}/forms${status ? `?status=${status}` : ""}`);
  if (!res.ok) throw new Error(`GET /forms failed: ${res.status}`);
  return res.json();
}

export async function getForm(id: string): Promise<FormDetail> {
  const res = await fetch(`${API_BASE}/forms/${id}`);
  if (!res.ok) throw new Error(`GET /forms/${id} failed: ${res.status}`);
  return res.json();
}

export async function getStats(): Promise<Stats> {
  const res = await fetch(`${API_BASE}/stats`);
  if (!res.ok) throw new Error(`GET /stats failed: ${res.status}`);
  return res.json();
}

async function post(path: string, body?: unknown): Promise<Response> {
  return fetch(`${API_BASE}${path}`, {
    method: "POST",
    headers: body ? { "content-type": "application/json" } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
}

export async function replayForm(id: string): Promise<void> {
  await post(`/forms/${id}/replay`);
}

export async function getSchema(): Promise<SchemaMeta> {
  const res = await fetch(`${API_BASE}/schema`);
  if (!res.ok) throw new Error(`GET /schema failed: ${res.status}`);
  return res.json();
}

export async function listMappings(includeInactive = false): Promise<FieldMapping[]> {
  const res = await fetch(`${API_BASE}/mappings${includeInactive ? "?includeInactive=true" : ""}`);
  if (!res.ok) throw new Error(`GET /mappings failed: ${res.status}`);
  return res.json();
}

export async function createMapping(input: Suggestion & { scope?: string }): Promise<FieldMapping> {
  const res = await post("/mappings", input);
  if (!res.ok) throw new Error(`POST /mappings failed: ${res.status}`);
  return res.json();
}

export async function deactivateMapping(id: string): Promise<void> {
  await post(`/mappings/${id}/deactivate`);
}

export async function listDrift(): Promise<DriftObservation[]> {
  const res = await fetch(`${API_BASE}/drift`);
  if (!res.ok) throw new Error(`GET /drift failed: ${res.status}`);
  return res.json();
}

export async function approveDrift(id: string): Promise<{ ok: boolean; mappingId?: string }> {
  const res = await post(`/drift/${id}/approve`);
  return res.json();
}

export async function dismissDrift(id: string): Promise<void> {
  await post(`/drift/${id}/dismiss`);
}

export async function getConflicts(formId: string): Promise<FormConflict[]> {
  const res = await fetch(`${API_BASE}/forms/${formId}/conflicts`);
  if (!res.ok) throw new Error(`GET /forms/${formId}/conflicts failed: ${res.status}`);
  return res.json();
}

export async function applyFormConflict(formId: string, conflictId: string): Promise<void> {
  const res = await post(`/forms/${formId}/conflicts/${conflictId}/apply`);
  if (!res.ok) throw new Error(`apply conflict failed: ${res.status}`);
}

export async function dismissFormConflict(formId: string, conflictId: string): Promise<void> {
  const res = await post(`/forms/${formId}/conflicts/${conflictId}/dismiss`);
  if (!res.ok) throw new Error(`dismiss conflict failed: ${res.status}`);
}

export async function getFormPayload(formId: string): Promise<Record<string, unknown>> {
  const res = await fetch(`${API_BASE}/forms/${formId}/payload`);
  if (!res.ok) throw new Error(`GET /forms/${formId}/payload failed: ${res.status}`);
  const body = await res.json();
  return body.rawPayload ?? {};
}

export async function manualMap(formId: string, rules: (Suggestion & Record<string, unknown>)[], save: boolean): Promise<{ ok: boolean }> {
  const res = await post(`/forms/${formId}/manual-map`, { rules, save });
  const body = await res.json().catch(() => ({ ok: false }));
  if (!res.ok) throw new Error(body.error ?? `manual-map failed: ${res.status}`);
  return body;
}
