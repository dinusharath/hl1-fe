export type FormStatus =
  | "PENDING" | "PROCESSING" | "TRANSFORMED" | "GEOCODED" | "DISPATCHED" | "DONE" | "NEEDS_REVIEW" | "FAILED";

export interface OutboxEntry {
  type: "FORMBOT" | "EMAIL";
  status: "PENDING" | "SENDING" | "DELIVERED" | "FAILED";
}

export interface Flag {
  code: string;
  detail: string;
}

export interface FormSummary {
  id: string;
  applicationReference: string | null;
  sessionId: string | null;
  status: FormStatus;
  statusMessage: string;
  attempts: number;
  duplicateCount: number;
  flagsCount: number;
  outbox: OutboxEntry[];
  receivedAt: string;
}

export interface FormDetail extends FormSummary {
  flags: Flag[];
  lastError: string | null;
  transformed: { exists: boolean; geocoded?: boolean };
  pendingConflicts: number;
}

export interface FormConflict {
  id: string;
  payload: Record<string, unknown>;
  receivedAt: string;
  resolution: string | null;
  resolvedAt: string | null;
}

export interface Stats {
  total: number;
  inProgress: number;
  done: number;
  needsReview: number;
  failed: number;
  byStatus: Record<string, number>;
}

export interface Suggestion {
  kind: "alias" | "enum" | "format" | "route" | "composite";
  sourcePath: string;
  targetPath?: string | null;
  valueMap?: Record<string, string> | null;
  fallback?: string[];
}

export interface FieldMapping {
  id: string;
  kind: string;
  sourcePath: string;
  targetPath: string | null;
  valueMap: Record<string, string> | null;
  fallback: string[];
  scope: string;
  version: number;
  active: boolean;
  confidence: number | null;
  sourceEngine: string | null;
  approvedBy: string;
  createdAt: string;
}

export interface SchemaMeta {
  targetFields: string[];
  enumFields: string[];
  enumValues: Record<string, string[]>;
}

export interface DriftObservation {
  id: string;
  type: string;
  fieldPath: string;
  observedShape: { missing?: string; arrived?: string[]; field?: string } | null;
  count: number;
  status: string;
  suggestion: Suggestion | null;
  confidence: number | null;
  confidenceLabel: string;
  sampleFormIds: string[];
}
