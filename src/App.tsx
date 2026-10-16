import { useCallback, useEffect, useState } from "react";
import { API_BASE, getForm, getStats, listDrift, listForms, replayForm } from "./api";
import type { FormDetail, FormSummary, Stats } from "./types";
import { Dashboard } from "./components/Dashboard";
import { SubmitForm } from "./components/SubmitForm";
import { FormsTable } from "./components/FormsTable";
import { FormDetailPanel } from "./components/FormDetail";
import { ReviewTab } from "./components/ReviewTab";
import { MappingsTab } from "./components/MappingsTab";

type Tab = "forms" | "review" | "mappings";

export function App() {
  const [tab, setTab] = useState<Tab>("forms");
  const [forms, setForms] = useState<FormSummary[]>([]);
  const [filter, setFilter] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [detail, setDetail] = useState<FormDetail | null>(null);
  const [stats, setStats] = useState<Stats | null>(null);
  const [driftCount, setDriftCount] = useState(0);
  const [connected, setConnected] = useState(false);

  const refresh = useCallback(async () => {
    try {
      const [list, s] = await Promise.all([listForms(filter || undefined), getStats()]);
      setForms(list);
      setStats(s);
      setConnected(true);
    } catch {
      setConnected(false);
    }
  }, [filter]);

  useEffect(() => {
    if (tab !== "forms") return;
    void refresh();
    const t = setInterval(refresh, 2000);
    return () => clearInterval(t);
  }, [refresh, tab]);

  // Open drift-observation count — drives the Review tab badge on every tab, matching the Review page.
  useEffect(() => {
    const poll = () => listDrift().then((d) => setDriftCount(d.length)).catch(() => {});
    void poll();
    const t = setInterval(poll, 3000);
    return () => clearInterval(t);
  }, []);

  useEffect(() => {
    if (!selectedId) { setDetail(null); return; }
    let cancelled = false;
    const load = () => getForm(selectedId).then((d) => !cancelled && setDetail(d)).catch(() => {});
    void load();
    const t = setInterval(load, 2000);
    return () => { cancelled = true; clearInterval(t); };
  }, [selectedId]);

  const onReplay = async (id: string) => {
    await replayForm(id);
    void refresh();
  };

  const tabs: [Tab, string, number | undefined][] = [
    ["forms", "Forms", stats?.total],
    ["review", "Review", driftCount],
    ["mappings", "Mappings", undefined],
  ];

  return (
    <div className="app">
      <header className="topbar">
        <strong>Healthtech Ingestion</strong>
        <span className="muted">Operator Console</span>
        <span className="api"><span className={connected ? "dot ok" : "dot"} /> API {API_BASE}</span>
      </header>

      <nav className="tabs wrapwide">
        {tabs.map(([key, label, n]) => (
          <button key={key} className={`tab${tab === key ? " on" : ""}`} onClick={() => setTab(key)}>
            {label}{n !== undefined ? <span className="n">{n}</span> : null}
          </button>
        ))}
      </nav>

      {tab === "forms" && (
        <>
          <section className="wrapwide"><Dashboard stats={stats} filter={filter} onPick={setFilter} /></section>
          <main className="grid">
            <SubmitForm onSubmitted={refresh} />
            <section className="card">
              <h2>Forms <span className="muted">({forms.length})</span></h2>
              <FormsTable forms={forms} filter={filter} onFilter={setFilter} onSelect={setSelectedId} onReplay={onReplay} selectedId={selectedId} />
              <FormDetailPanel detail={detail} onReplay={onReplay} />
            </section>
          </main>
        </>
      )}

      {tab === "review" && (
        <main className="wrapwide">
          <h2 className="tabhead">Schema drift to review</h2>
          <ReviewTab />
        </main>
      )}

      {tab === "mappings" && (
        <main className="wrapwide">
          <h2 className="tabhead">Field mappings</h2>
          <MappingsTab />
        </main>
      )}
    </div>
  );
}
