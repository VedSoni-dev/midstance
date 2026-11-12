"use client";
// "View Protocol": a gait-assessment readout built from the person's own session: their numbers, the
// left/right symmetry, findings from plain rules of thumb, and a three-phase corrective plan aimed at the
// side and the issue the numbers point to. Copy it, download it, or print it. Not medical advice.
import { useEffect, useMemo, useRef, useState } from "react";
import { fmtPace, metrics, type Session } from "@/lib/session";

type Phase = { n: string; name: string; weeks: string; items: [string, string][] };
type Bar = { label: string; unit: string; l: number; r: number; si: number; max: number; dec: number };

export function buildProtocol(s: Session) {
  const m = metrics(s);
  const loadR = m.loadR;
  const heavy = loadR > s.loadL ? "right" : "left";
  const light = heavy === "right" ? "left" : "right";
  const dropSide = s.pelvicDropR >= s.pelvicDropL ? "right" : "left";
  const dropMax = Math.max(s.pelvicDropL, s.pelvicDropR);
  const longContact = s.contactR >= s.contactL ? "right" : "left";
  const lowKnee = s.kneeR <= s.kneeL ? "right" : "left";
  const cueCadence = Math.min(185, Math.round(s.cadence * (s.cadence < 165 ? 1.05 : 1.03)));

  const metricsRow: [string, string][] = [
    ["Gait asymmetry", `${m.asym.toFixed(1)}%`],
    ["Cadence", `${Math.round(s.cadence)} spm`],
    ["Pace", `${fmtPace(m.paceSec)}`],
    ["Vertical oscillation", `${s.verticalOsc.toFixed(1)} cm`],
  ];
  const bars: Bar[] = [
    { label: "Load share", unit: "%", l: s.loadL, r: loadR, si: m.siLoad, max: 70, dec: 1 },
    { label: "Ground contact", unit: "ms", l: s.contactL, r: s.contactR, si: m.siContact, max: 400, dec: 0 },
    { label: "Peak knee flexion", unit: "°", l: s.kneeL, r: s.kneeR, si: m.siKnee, max: 140, dec: 0 },
    { label: "Hip range of motion", unit: "°", l: s.hipL, r: s.hipR, si: m.siHip, max: 90, dec: 0 },
    { label: "Pelvic drop", unit: "°", l: s.pelvicDropL, r: s.pelvicDropR, si: m.siDrop, max: 12, dec: 1 },
  ];

  // findings: plain rules of thumb, worst first
  const findings: string[] = [];
  const share = Math.abs(loadR - s.loadL) / 2;
  if (share >= 1.5) findings.push(`The ${heavy} side carries ${Math.max(loadR, s.loadL).toFixed(1)}% of the load, ${share.toFixed(1)} points over an even split.`);
  if (m.siContact >= 3) findings.push(`The ${longContact} foot stays on the ground ${Math.round(Math.abs(s.contactR - s.contactL))} ms longer (symmetry index ${m.siContact.toFixed(1)}%).`);
  if (dropMax >= 6) findings.push(`${dropSide === "right" ? "Right" : "Left"}-leg stance lets the pelvis drop ${dropMax.toFixed(1)}°: the ${dropSide} hip abductors are the usual suspect.`);
  else if (m.siDrop >= 25 && dropMax >= 4.5) findings.push(`Pelvic drop is uneven (${s.pelvicDropL.toFixed(1)}° left, ${s.pelvicDropR.toFixed(1)}° right).`);
  if (m.siKnee >= 6) findings.push(`The ${lowKnee} knee folds ${Math.round(Math.abs(s.kneeR - s.kneeL))}° less in swing: a shorter heel recovery on that side.`);
  if (m.siHip >= 8) findings.push(`Hip range differs by ${Math.round(Math.abs(s.hipR - s.hipL))}° (${Math.round(s.hipL)}° left, ${Math.round(s.hipR)}° right).`);
  if (s.cadence < 165) findings.push(`Cadence of ${Math.round(s.cadence)} spm with ${s.strideLength.toFixed(2)} m strides suggests overstriding; a ${cueCadence} spm cue shortens it.`);
  if (s.verticalOsc > 10) findings.push(`${s.verticalOsc.toFixed(1)} cm of vertical oscillation: energy going up instead of forward.`);
  if (!findings.length) findings.push("Every left/right difference is inside the usual range. Keep doing what you're doing; the plan below is maintenance.");

  const asymmetric = share >= 1.5 || m.siContact >= 3 || dropMax >= 6 || m.siKnee >= 6;
  const target = dropMax >= 6 ? dropSide : asymmetric ? light : "both";
  const T = target === "both" ? "each side" : target;
  const phases: Phase[] = [
    {
      n: "01", name: "Isolate", weeks: "Weeks 1–2",
      items: [
        ["Side-lying hip abduction", target === "both" ? "3 × 15 each" : `3 × 15 ${T} · 2 × 15 other`],
        ["Single-leg glute bridge", target === "both" ? "3 × 12 each" : `3 × 12 each, ${T} first`],
        [m.siKnee >= 6 ? "Prone hamstring curl, banded" : "Banded lateral walk", m.siKnee >= 6 ? `3 × 12 ${lowKnee}` : "3 × 12 m each way"],
      ],
    },
    {
      n: "02", name: "Load", weeks: "Weeks 3–4",
      items: [
        ["Rear-foot-elevated split squat", "3 × 8 each, 3-1-1 tempo"],
        ["Single-leg Romanian deadlift", target === "both" ? "3 × 8 each" : `3 × 8 each, +1 set ${T}`],
        ["Eccentric step-down, 20 cm box", target === "both" ? "3 × 10 each" : `3 × 10 ${T}`],
      ],
    },
    {
      n: "03", name: "Re-pattern", weeks: "Weeks 5–6",
      items: [
        ["A-skips", "4 × 20 m"],
        [`Metronome run at ${cueCadence} spm`, "6 × 1 min, 1 min easy"],
        [s.verticalOsc > 10 ? "Quiet-feet strides" : "Hill strides", "6 × 15 s, walk back"],
      ],
    },
  ];
  const retest = `Retest in 14 days and log it as a new session. Targets: load split within 48–52%, contact-time difference under 3%, pelvic drop under 5° on both sides${s.cadence < 165 ? `, cadence near ${cueCadence} spm` : ""}.`;
  return { metrics: metricsRow, bars, findings, phases, retest };
}

const unitOf = (b: Bar, v: number) => `${v.toFixed(b.dec)}${b.unit === "%" || b.unit === "°" ? b.unit : ` ${b.unit}`}`;

function asText(s: Session, p: ReturnType<typeof buildProtocol>) {
  const lines = [
    `MIDSTANCE · Corrective gait protocol · ${s.name} (${s.date})`,
    `A visualisation of the numbers entered, not a medical device or medical advice.`,
    ``,
    ...p.metrics.map(([k, v]) => `${k}: ${v}`),
    `Stride length: ${s.strideLength.toFixed(2)} m · speed ${(metrics(s).speed * 3.6).toFixed(1)} km/h`,
    ...p.bars.map((b) => `${b.label}: L ${unitOf(b, b.l)} · R ${unitOf(b, b.r)} · symmetry index ${b.si.toFixed(1)}%`),
    ``,
    `Findings`,
    ...p.findings.map((f) => `- ${f}`),
    ``,
    ...p.phases.flatMap((ph) => [`${ph.n} ${ph.name} (${ph.weeks})`, ...ph.items.map(([a, b]) => `  - ${a}: ${b}`)]),
    ``,
    p.retest,
    ...(s.notes ? [``, `Notes: ${s.notes}`] : []),
  ];
  return lines.join("\n");
}

export function ProtocolSheet({ open, onClose, session }: { open: boolean; onClose: () => void; session: Session }) {
  const ref = useRef<HTMLDialogElement>(null);
  const [toast, setToast] = useState("");
  const p = useMemo(() => buildProtocol(session), [session]);

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    else if (!open && d.open) d.close();
  }, [open]);

  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(""), 1800);
    return () => clearTimeout(id);
  }, [toast]);

  const text = asText(session, p);
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
    a.download = `midstance-protocol-${session.date}-${session.name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "") || "session"}.txt`;
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
            Protocol / {session.name} · {session.date}
          </p>
          <button type="button" className="sheet-x" onClick={onClose} aria-label="Close protocol">
            ×
          </button>
        </header>
        <h2 id="sheet-title" className="sheet-title">
          Corrective Gait Protocol.
        </h2>
        <p className="sheet-note">Built from the numbers in this session. A visualisation of what you entered, not a medical device or medical advice.</p>

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
            return (
              <div key={b.label} className="bars-row" role="row">
                <div className="bar bar-l" role="cell" aria-label={`Left ${unitOf(b, b.l)}`}>
                  <span className="bar-v">{unitOf(b, b.l)}</span>
                  <span className="bar-fill" style={{ width: `${(b.l / b.max) * 100}%` }} />
                </div>
                <div className="bars-mid" role="cell">
                  <span>{b.label}</span>
                  <span className="si">SI {b.si.toFixed(1)}%</span>
                </div>
                <div className="bar bar-r" role="cell" aria-label={`Right ${unitOf(b, b.r)}`}>
                  <span className="bar-fill" style={{ width: `${(b.r / b.max) * 100}%` }} />
                  <span className="bar-v">{unitOf(b, b.r)}</span>
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
