"use client";
// The page ground: very light grey with huge, soft halftone blobs that bleed off the edges and drift.
import { useMemo, useRef } from "react";
import { useHalftone, rgba } from "@/lib/halftone";
import { makeNoise3, hash3, smooth } from "@/lib/noise";

const PAL = [0, rgba("#d3dae0"), rgba("#c0d1e3"), rgba("#a8c0dd"), rgba("#e4ecf4")];

export function Backdrop() {
  const ref = useRef<HTMLCanvasElement>(null);
  const noise = useMemo(() => makeNoise3(11), []);
  const pitchRef = useRef(6);

  useHalftone(ref, {
    pitch: (w) => (pitchRef.current = w >= 1100 ? 6 : 5),
    dot: 0.64,
    round: 0.12,
    fps: 12,
    render(buf, cols, rows, t) {
      const pitch = pitchRef.current;
      const sc = pitch / 520;
      const tx = t * 0.010;
      const ty = -t * 0.006;
      const tz = t * 0.018;
      const tick = Math.floor(t * 0.7);
      for (let j = 0; j < rows; j++) {
        const ny = j * sc;
        const v = j / rows;
        for (let i = 0; i < cols; i++) {
          const nx = i * sc;
          const u = i / cols;
          const edge = Math.abs(u - 0.5) * 2;
          let f =
            noise(nx + tx, ny + ty, tz) * 0.62 +
            noise(nx * 2.4 + 5, ny * 2.4 - tx, tz * 1.6 + 9) * 0.28 +
            noise(nx * 6.5, ny * 6.5, tz * 2 + 21) * 0.08;
          // dots gather at the sides and corners; the middle (behind the panels) stays quiet
          f += smooth(0.28, 0.98, edge) * 0.95 - 0.52 + (u - 0.5) * 0.18 + smooth(0.75, 0, v) * 0.08 * (u > 0.5 ? 1 : 0);
          let lv = 0;
          if (f > 0.42) lv = hash3(i, j, tick) > 0.975 ? 4 : 3;
          else if (f > 0.2) lv = 2;
          else if (f > -0.02) lv = 1;
          if (lv) buf[j * cols + i] = PAL[lv];
        }
      }
    },
  });

  return (
    <div className="backdrop" aria-hidden>
      <canvas ref={ref} className="halftone" />
    </div>
  );
}
