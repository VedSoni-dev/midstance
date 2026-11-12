"use client";
import { useMemo, useRef } from "react";
import { useHalftone, rgba } from "@/lib/halftone";
import { hash3, smooth } from "@/lib/noise";
import { useReadings, fmt, type Readings } from "@/lib/readings";
import { Heatmap } from "./Heatmap";

const DOT = rgba("#cfd4d8");
const DOT2 = rgba("#c2c8cd");
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];

/** the fine grey dot texture that fades in under the headline */
function Texture() {
  const ref = useRef<HTMLCanvasElement>(null);
  useHalftone(ref, {
    pitch: (w) => Math.max(3, Math.round(w / 118)),
    dot: (p) => Math.max(1, Math.round(p * 0.42)),
    fps: 4,
    render(buf, cols, rows, t) {
      // ordered (Bayer) dithering of a soft vertical ramp, with a slow shimmer of a few dots
      const tick = Math.floor(t * 0.8);
      for (let j = 0; j < rows; j++) {
        const v = (j + 0.5) / rows;
        const p = Math.pow(smooth(0.0, 0.5, v), 0.7);
        for (let i = 0; i < cols; i++) {
          const th = (BAYER[(j & 3) * 4 + (i & 3)] + 0.5) / 16 + (hash3(i, j, tick) - 0.5) * 0.16;
          if (th < p * 1.02) buf[j * cols + i] = v > 0.72 && hash3(i, j, 9) > 0.6 ? DOT2 : DOT;
        }
      }
    },
  });
  return (
    <div className="diag-texture" aria-hidden>
      <canvas ref={ref} className="halftone" />
    </div>
  );
}

function readoutText(r: Readings) {
  const lines = [
    `Isolating Gait Asymmetry ${fmt.deg0(r.asym)}`,
    `Sampling Ground Contact ${Math.round(r.contactR)} ms`,
    `Resolving Pelvic Drop ${fmt.deg1(r.pelvicDropR)}`,
  ];
  const span = 7; // seconds per line
  const k = Math.floor(r.t / span);
  const line = lines[((k % lines.length) + lines.length) % lines.length];
  const into = r.t - k * span;
  const shown = Math.min(line.length, Math.floor(into * 38));
  return { full: line, shown: line.slice(0, Math.max(0, shown)), typing: shown < line.length };
}

export function DiagnosticsPanel({ onOpen, titleAs = "h1" }: { onOpen: () => void; titleAs?: "h1" | "h2" }) {
  const Title = titleAs;
  const r = useReadings(15);
  const ro = useMemo(() => readoutText(r), [r]);

  return (
    <section className="panel diag" aria-labelledby="diag-title">
      <p className="diag-eyebrow">
        <span className="dot-ring" aria-hidden />
        Post-Session Diagnostics
      </p>
      <Title id="diag-title" className="diag-title">
        Structural Kinetic
        <br />
        Assessment.
      </Title>
      <Texture />
      <div className="diag-row">
        <p className="diag-readout" aria-live="off" title={ro.full}>
          <span>{ro.shown}</span>
          {ro.typing && <span className="caret" aria-hidden />}
        </p>
        <button type="button" className="diag-btn" onClick={onOpen}>
          View Protocol <span aria-hidden>→</span>
        </button>
      </div>
      <Heatmap readings={r} />
    </section>
  );
}
