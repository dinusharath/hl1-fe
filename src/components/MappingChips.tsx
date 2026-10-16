import type { Suggestion } from "../types";

/**
 * The before→after mapping as chips:
 *  - composite → several source fields JOINED into one target (firstName + lastName → name)
 *  - alias     → one source → target (with optional fallbacks)
 *  - enum/format → value → value
 */
export function MappingChips({ s }: { s: Suggestion }) {
  if (s.kind === "composite") {
    const sources = [s.sourcePath, ...(s.fallback ?? [])];
    return (
      <div className="maprow">
        {sources.map((src, i) => (
          <span key={src} className="chip">{i > 0 ? <span className="plus">+ </span> : null}{src}</span>
        ))}
        <span className="arrow">→</span>
        <span className="chip target">{s.targetPath ?? "?"}</span>
        <span className="muted">— joined together</span>
      </div>
    );
  }

  const isValue = s.kind !== "alias";
  const from = isValue ? Object.keys(s.valueMap ?? {})[0] ?? "?" : s.sourcePath;
  const to = isValue ? Object.values(s.valueMap ?? {})[0] ?? "?" : s.targetPath ?? "?";
  return (
    <div className="maprow">
      <span className="chip">{from}</span>
      <span className="arrow">→</span>
      <span className="chip target">{to}</span>
      {!isValue && s.fallback && s.fallback.length > 0 && (
        <span className="muted">— or {s.fallback.join(", ")} if blank</span>
      )}
    </div>
  );
}
