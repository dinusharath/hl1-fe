import type { FormSummary } from "../types";

const STATUSES = ["", "PENDING", "DONE", "NEEDS_REVIEW", "FAILED"];
const isDeadLetter = (s: string) => s === "NEEDS_REVIEW" || s === "FAILED";

interface Props {
  forms: FormSummary[];
  filter: string;
  onFilter: (s: string) => void;
  onSelect: (id: string) => void;
  onReplay: (id: string) => void;
  selectedId: string | null;
}

export function FormsTable({ forms, filter, onFilter, onSelect, onReplay, selectedId }: Props) {
  return (
    <>
      <div className="filters">
        {STATUSES.map((s) => (
          <button key={s || "all"} className={`fchip${filter === s ? " on" : ""}`} onClick={() => onFilter(s)}>
            {s ? s.replace("_", " ") : "All"}
          </button>
        ))}
      </div>
      <table>
        <thead>
          <tr><th>Reference</th><th>Status</th><th>Dupes</th><th>Flags</th><th></th></tr>
        </thead>
        <tbody>
          {forms.length === 0 && <tr><td colSpan={5} className="muted">No forms — submit one.</td></tr>}
          {forms.map((f) => (
            <tr key={f.id} className={`clk${selectedId === f.id ? " sel" : ""}`} onClick={() => onSelect(f.id)}>
              <td>{f.applicationReference ?? f.id.slice(0, 8)}</td>
              <td><span className={`pill ${f.status}`}>{f.status.replace("_", " ")}</span></td>
              <td>{f.duplicateCount || ""}</td>
              <td>{f.flagsCount || ""}</td>
              <td style={{ textAlign: "right" }}>
                {isDeadLetter(f.status) && (
                  <button className="btn tiny" onClick={(e) => { e.stopPropagation(); onReplay(f.id); }}>Replay</button>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
