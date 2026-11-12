"use client";
// /app: the gait-assessment workspace. The person's own sessions (saved in this browser), the editor for
// their numbers, the two panels drawing those numbers, and the protocol built from them.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Backdrop } from "./Backdrop";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import { ProtocolSheet } from "./ProtocolSheet";
import { SessionEditor } from "./SessionEditor";
import { Onboarding } from "./Onboarding";
import { Mark } from "./Mark";
import { PRESETS, SessionScope, newSession, sanitize, useSessions } from "@/lib/session";

const REPO = "https://github.com/VedSoni-dev/midstance";

export function Workspace() {
  const st = useSessions();
  const [open, setOpen] = useState(false);
  const [help, setHelp] = useState(false);
  const [toast, setToast] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const newRef = useRef<HTMLDetailsElement>(null);

  const clean = useMemo(() => (st.current ? sanitize(st.current, newSession()) : null), [st.current]);

  useEffect(() => {
    if (st.ready && window.location.hash === "#protocol") setOpen(true);
  }, [st.ready]);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(id);
  }, [toast]);

  const show = useCallback(() => {
    setOpen(true);
    history.replaceState(null, "", "#protocol");
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  if (!st.ready || !st.current || !clean) {
    return <div className="ws-loading" aria-busy>Loading your sessions…</div>;
  }
  const first = !st.onboarded;

  const applyPreset = (id: string) => {
    const p = PRESETS.find((x) => x.id === id)!;
    if (first) {
      st.update({ ...p.values });
      setToast(`Started from “${p.label}”. Replace any number with yours.`);
    } else {
      st.add(newSession(id, `New session (${p.label.toLowerCase()})`));
      setToast(`New session from “${p.label}”.`);
    }
    st.setOnboarded(true);
    setHelp(false);
  };
  const own = () => {
    st.setOnboarded(true);
    setHelp(false);
    setTimeout(() => document.querySelector<HTMLInputElement>(".ed-name")?.select(), 50);
  };
  const exportAll = () => {
    const blob = new Blob([st.exportJson() + "\n"], { type: "application/json" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `midstance-sessions-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setToast(`Exported ${st.sessions.length} session${st.sessions.length === 1 ? "" : "s"}.`);
  };
  const importFile = async (f: File | undefined) => {
    if (!f) return;
    const res = st.importJson(await f.text());
    setToast(res.ok ? `Imported ${res.count} session${res.count === 1 ? "" : "s"}.` : res.error);
    if (fileRef.current) fileRef.current.value = "";
  };
  const del = () => {
    if (window.confirm(`Delete “${st.current!.name}” from this browser? This can't be undone (export first to keep a copy).`)) {
      st.remove(st.current!.id);
      setToast("Session deleted.");
    }
  };

  return (
    <>
      <div className="stage ws">
        <Backdrop />
        <header className="topbar ws-top">
          <a className="brand" href="/" aria-label="Midstance home">
            <Mark />
            Midstance
          </a>
          <div className="ws-tools" role="toolbar" aria-label="Sessions">
            <label className="sr-only" htmlFor="ws-pick">
              Session
            </label>
            <select id="ws-pick" className="ws-select" value={st.current.id} onChange={(e) => st.select(e.target.value)}>
              {st.sessions.map((x) => (
                <option key={x.id} value={x.id}>
                  {x.name} · {x.date}
                </option>
              ))}
            </select>
            <details className="ws-menu" ref={newRef}>
              <summary className="ws-btn">New</summary>
              <div className="ws-pop" role="menu">
                {PRESETS.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      st.add(newSession(p.id, `New session (${p.label.toLowerCase()})`));
                      newRef.current?.removeAttribute("open");
                      setToast(`New session from “${p.label}”.`);
                    }}
                  >
                    <strong>{p.label}</strong>
                    <span>{p.blurb}</span>
                  </button>
                ))}
              </div>
            </details>
            <button type="button" className="ws-btn" onClick={st.duplicate}>
              Duplicate
            </button>
            <button type="button" className="ws-btn" onClick={del}>
              Delete
            </button>
          </div>
          <div className="ws-tools ws-io">
            <button type="button" className="ws-btn" onClick={() => fileRef.current?.click()}>
              Import
            </button>
            <input ref={fileRef} type="file" accept="application/json,.json" hidden onChange={(e) => importFile(e.target.files?.[0])} />
            <button type="button" className="ws-btn" onClick={exportAll}>
              Export
            </button>
            <button type="button" className="ws-btn" onClick={() => setHelp(true)}>
              How it works
            </button>
          </div>
        </header>
        <main className="ws-main">
          <SessionEditor session={st.current} update={st.update} />
          <SessionScope session={clean} live={false}>
            <div className="ws-panels">
              <DiagnosticsPanel onOpen={show} />
              <TelemetryPanel />
            </div>
          </SessionScope>
        </main>
        <footer className="credit">
          <span>
            Design by{" "}
            <a href="https://x.com/praveenisomer" target="_blank" rel="noopener noreferrer">
              Praveen Kumar
            </a>{" "}
            (praveenisomer on X). Rebuilt in code by{" "}
            <a href="https://x.com/forkthis_ai" target="_blank" rel="noopener noreferrer">
              @forkthis_ai
            </a>
            . A visualisation of the numbers you enter, not a medical device.
          </span>
          <span>
            Saved in this browser ·{" "}
            <a href={REPO} target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
          </span>
        </footer>
        <p className="ws-toast" role="status" aria-live="polite">
          {toast}
        </p>
      </div>
      <ProtocolSheet open={open} onClose={hide} session={clean} />
      <Onboarding open={first || help} first={first} onPreset={applyPreset} onOwn={own} onClose={() => (first ? own() : setHelp(false))} />
    </>
  );
}
