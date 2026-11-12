"use client";
import { useCallback, useEffect, useState } from "react";
import { Backdrop } from "./Backdrop";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import { ProtocolSheet } from "./ProtocolSheet";
import { Mark } from "./Mark";

export const REPO = "https://github.com/VedSoni-dev/midstance";

export function Stage() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (window.location.hash === "#protocol") setOpen(true);
  }, []);

  const show = useCallback(() => {
    setOpen(true);
    history.replaceState(null, "", "#protocol");
  }, []);
  const hide = useCallback(() => {
    setOpen(false);
    if (window.location.hash) history.replaceState(null, "", window.location.pathname + window.location.search);
  }, []);

  return (
    <>
    <div className="stage">
      <Backdrop />
      <header className="topbar">
        <a className="brand" href="/" aria-label="Midstance home">
          <Mark />
          Midstance
        </a>
        <span className="session">
          <span className="live" aria-hidden />
          Session 0412 · sample data
        </span>
      </header>
      <main className="panels">
        <DiagnosticsPanel onOpen={show} />
        <TelemetryPanel />
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
          .
        </span>
        <span>
          Free &amp; open source ·{" "}
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
        </span>
      </footer>
    </div>
    <ProtocolSheet open={open} onClose={hide} />
    </>
  );
}
