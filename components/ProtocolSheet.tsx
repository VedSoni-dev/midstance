"use client";
// "View Protocol": a gait-assessment readout built from the session's numbers at the moment it opens,
// with a three-phase corrective plan. Copy it, download it, or print it.
import { useEffect, useMemo, useRef, useState } from "react";
import { readingsAt, type Readings } from "@/lib/readings";
import { now } from "@/lib/clock";

const SESSION = "0412";

type Phase = { n: string; name: string; weeks: string; items: [string, string][] };

function build(r: Readings) {
  const si = (l: number, rr: number) => (Math.abs(rr - l) / ((rr + l) / 2)) * 100;
  const contactSI = si(r.contactL, r.contactR);
  const loadSI = si(r.peakL, r.peakR);
  const dropSI = si(r.pelvicDropL, r.pelvicDropR);
  const heavier = r.peakR >= r.peakL ? "Right" : "Left";
  const targetCadence = Math.round(r.cadence * 1.035);
  const metrics: [string, string][] = [
    ["Gait asymmetry", `${Math.round(r.asym)}°`],
    ["Cadence", `${Math.round(r.cadence)} spm`],
    ["Stride length", `${r.strideLength.toFixed(2)} m`],
    ["Vertical oscillation", `${r.verticalOsc.toFixed(1)} cm`],
  ];
  const bars = [
    { label: "Ground contact", unit: "ms", l: r.contactL, r: r.contactR, si: contactSI, max: 320 },
    { label: "Peak plantar load", unit: "kPa", l: r.peakL, r: r.peakR, si: loadSI, max: 420 },
    { label: "Pelvic drop", unit: "°", l: r.pelvicDropL, r: r.pelvicDropR, si: dropSI, max: 9 },
  ];
  const findings = [
    `${heavier} side loads ${Math.round(loadSI)}% harder and stays on the ground ${Math.round(Math.abs(r.contactR - r.contactL))} ms longer.`,
    `Right pelvic drop of ${r.pelvicDropR.toFixed(1)}° (left ${r.pelvicDropL.toFixed(1)}°) points to under-active right hip abductors.`,
    `Cadence of ${Math.round(r.cadence)} spm is fine; a ${targetCadence} spm cue shortens the overstride that feeds the asymmetry.`,
  ];
  const phases: Phase[] = [
    {
      n: "01", name: "Isolate", weeks: "Weeks 1–2",
      items: [
        ["Side-lying hip abduction", "3 × 15 right · 2 × 15 left"],
        ["Single-leg glute bridge", "3 × 12 each, right first"],
        ["Banded lateral walk", "3 × 12 m each way"],
      ],
    },
    {
      n: "02", name: "Load", weeks: "Weeks 3–4",
      items: [
        ["Rear-foot-elevated split squat", "3 × 8 each, 3-1-1 tempo"],
        ["Single-leg Romanian deadlift", "3 × 8 each"],
        ["Eccentric step-down, 20 cm box", "3 × 10 right"],
      ],
    },
    {
      n: "03", name: "Re-pattern", weeks: "Weeks 5–6",
      items: [
        ["A-skips", "4 × 20 m"],
        [`Metronome run at ${targetCadence} spm`, "6 × 1 min, 1 min easy"],
        ["Hill strides", "6 × 15 s, walk back"],
      ],
    },
  ];
  const retest = `Retest in 14 days. Targets: asymmetry under 10°, right pelvic drop under 5°, contact-time difference under 3%.`;
  return { metrics, bars, findings, phases, retest };
}

function asText(r: Readings, p: ReturnType<typeof build>) {
  const lines = [
    `MIDSTANCE · Corrective Gait Protocol · Session ${SESSION}`,
    `(sample session data, not medical advice)`,
    ``,
    ...p.metrics.map(([k, v]) => `${k}: ${v}`),
    ...p.bars.map((b) => `${b.label}: L ${b.l.toFixed(b.unit === "°" ? 1 : 0)}${b.unit === "°" ? "°" : " " + b.unit} · R ${b.r.toFixed(b.unit === "°" ? 1 : 0)}${b.unit === "°" ? "°" : " " + b.unit} · symmetry index ${b.si.toFixed(1)}%`),
    ``,
    `Findings`,
    ...p.findings.map((f) => `- ${f}`),
    ``,
    ...p.phases.flatMap((ph) => [`${ph.n} ${ph.name} (${ph.weeks})`, ...ph.items.map(([a, b]) => `  - ${a}: ${b}`)]),
    ``,
    p.retest,
  ];
  void r;
  return lines.join("\n");
}

export function ProtocolSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [r, setR] = useState<Readings>(() => readingsAt(now()));
  const [toast, setToast] = useState("");
  const p = useMemo(() => build(r), [r]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) {
      setR(readingsAt(now()));
      d.showModal();
    } else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const text = asText(r, p);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setToast("Copied to clipboard");
    } catch {
      setToast("Copy failed: select the text instead");
    }
  };
  const download = () => {
    const blob = new Blob([text + "\n"], { type: "text/plain" });
    const a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = `midstance-protocol-${SESSION}.txt`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    setToast("Downloaded");
  };

  return (
    <dialog
      ref={ref}
      className="sheet"
      aria-labelledby="sheet-title"
      onClose={onClose}
      onClick={(e) => {
        if (e.target === ref.current) onClose();
      }}
    >
      <div className="sheet-inner" tabIndex={-1} autoFocus>
        <header className="sheet-head">
          <p className="diag-eyebrow sheet-eyebrow">
            <span className="dot-ring" aria-hidden />
            Protocol / Session {SESSION}
          </p>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close protocol">
            ×
          </button>
        </header>
        <h2 id="sheet-title" className="sheet-title">
          Corrective Gait Protocol.
        </h2>
        <p className="sheet-note">Built from this session&rsquo;s readout. Sample session data, not medical advice.</p>

        <dl className="sheet-metrics">
          {p.metrics.map(([k, v]) => (
            <div key={k}>
              <dt>{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>

        <div className="sheet-bars" role="table" aria-label="Left and right comparison">
          <div className="bars-head" role="row">
            <span role="columnheader">Left</span>
            <span role="columnheader" />
            <span role="columnheader">Right</span>
          </div>
          {p.bars.map((b) => {
            const dec = b.unit === "°" ? 1 : 0;
            const u = b.unit === "°" ? "°" : ` ${b.unit}`;
            return (
              <div key={b.label} className="bars-row" role="row">
                <div className="bar bar-l" role="cell" aria-label={`Left ${b.l.toFixed(dec)}${u}`}>
                  <span className="bar-v">{b.l.toFixed(dec)}{u}</span>
                  <span className="bar-fill" style={{ width: `${(b.l / b.max) * 100}%` }} />
                </div>
                <div className="bars-mid" role="cell">
                  <span>{b.label}</span>
                  <span className="si">SI {b.si.toFixed(1)}%</span>
                </div>
                <div className="bar bar-r" role="cell" aria-label={`Right ${b.r.toFixed(dec)}${u}`}>
                  <span className="bar-fill" style={{ width: `${(b.r / b.max) * 100}%` }} />
                  <span className="bar-v">{b.r.toFixed(dec)}{u}</span>
                </div>
              </div>
            );
          })}
        </div>

        <h3 className="sheet-h3">Findings</h3>
        <ul className="sheet-findings">
          {p.findings.map((f) => (
            <li key={f}>{f}</li>
          ))}
        </ul>

        <ol className="sheet-phases">
          {p.phases.map((ph) => (
            <li key={ph.n}>
              <div className="ph-head">
                <span className="ph-n">{ph.n}</span>
                <span className="ph-name">{ph.name}</span>
                <span className="ph-weeks">{ph.weeks}</span>
              </div>
              <ul>
                {ph.items.map(([a, b]) => (
                  <li key={a}>
                    <span>{a}</span>
                    <span className="dose">{b}</span>
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ol>
        <p className="sheet-retest">{p.retest}</p>

        <div className="sheet-actions">
          <button type="button" className="diag-btn" onClick={copy}>
            Copy protocol
          </button>
          <button type="button" className="ghost-btn" onClick={download}>
            Download .txt
          </button>
          <button type="button" className="ghost-btn" onClick={() => window.print()}>
            Print
          </button>
          <span className="sheet-toast" role="status" aria-live="polite">
            {toast}
          </span>
        </div>
      </div>
    </dialog>
  );
}
