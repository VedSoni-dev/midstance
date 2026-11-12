"use client";
// First run: "start your first session" with a three-step how-to. Reopened from "How it works".
import { useEffect, useRef } from "react";
import { PRESETS } from "@/lib/session";

export function Onboarding({ open, first, onPreset, onOwn, onClose }: { open: boolean; first: boolean; onPreset: (id: string) => void; onOwn: () => void; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog ref={ref} className="sheet onboard" aria-labelledby="ob-title" onClose={onClose} onCancel={(e) => { if (first) { e.preventDefault(); onOwn(); } }}>
      <div className="sheet-inner" tabIndex={-1} autoFocus>
        <p className="diag-eyebrow sheet-eyebrow">
          <span className="dot-ring" aria-hidden />
          {first ? "Start your first session" : "How it works"}
        </p>
        <h2 id="ob-title" className="sheet-title">
          Three steps to your gait map.
        </h2>
        <ol className="ob-steps">
          <li>
            <span className="ph-n">01</span>
            <div>
              <h3>Enter your numbers.</h3>
              <p>From a treadmill gait analysis, a running watch or a coach: load split, cadence, stride length, contact time, knee and hip angles, pelvic drop. Not sure of some? Start from a preset and change what you know.</p>
            </div>
          </li>
          <li>
            <span className="ph-n">02</span>
            <div>
              <h3>Read the map.</h3>
              <p>The halftone lobes grow with each foot&rsquo;s share of the load. The runner moves with your knee and hip angles at your cadence (shown at half speed). Hover the map or a joint to read it.</p>
            </div>
          </li>
          <li>
            <span className="ph-n">03</span>
            <div>
              <h3>Open the protocol.</h3>
              <p>View Protocol turns your numbers into findings and a three-phase plan. Sessions save in this browser; export them as JSON and retest in two weeks.</p>
            </div>
          </li>
        </ol>
        <p className="ob-label">{first ? "Start from a preset" : "New session from a preset"}</p>
        <div className="ob-presets">
          {PRESETS.map((p) => (
            <button key={p.id} type="button" className="ghost-btn ob-preset" onClick={() => onPreset(p.id)}>
              <strong>{p.label}</strong>
              <span>{p.blurb}</span>
            </button>
          ))}
        </div>
        <div className="sheet-actions ob-actions">
          <button type="button" className="diag-btn" onClick={onOwn}>
            {first ? "Enter my own numbers" : "Back to my session"} <span aria-hidden>→</span>
          </button>
        </div>
        <p className="ed-honest">Midstance visualises the numbers you enter. It is not a medical device and gives no medical advice.</p>
      </div>
    </dialog>
  );
}
