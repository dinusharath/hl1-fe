import type { Stats } from "../types";

interface Tile {
  key: string;        // filter value ("" = all)
  label: string;
  value: number;
  tone: "" | "info" | "ok" | "warn" | "crit";
}

interface Props {
  stats: Stats | null;
  filter: string;
  onPick: (status: string) => void;
}

/** Metrics dashboard — real counts from GET /stats. Tiles double as status filters. */
export function Dashboard({ stats, filter, onPick }: Props) {
  if (!stats) return null;
  const tiles: Tile[] = [
    { key: "", label: "All forms", value: stats.total, tone: "" },
    { key: "PENDING", label: "In progress", value: stats.inProgress, tone: "info" },
    { key: "DONE", label: "Done", value: stats.done, tone: "ok" },
    { key: "NEEDS_REVIEW", label: "Needs review", value: stats.needsReview, tone: "warn" },
    { key: "FAILED", label: "Failed", value: stats.failed, tone: "crit" },
  ];
  return (
    <div className="metrics">
      {tiles.map((t) => (
        <button
          key={t.key || "all"}
          className={`metric ${t.tone}${filter === t.key ? " on" : ""}`}
          onClick={() => onPick(t.key)}
          title={t.key === "PENDING" ? "PENDING + PROCESSING + TRANSFORMED + GEOCODED + DISPATCHED" : undefined}
        >
          <div className="v">{t.value}</div>
          <div className="k">{t.label}</div>
        </button>
      ))}
    </div>
  );
}
