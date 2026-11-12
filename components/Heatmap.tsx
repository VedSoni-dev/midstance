"use client";
// The plantar / hip load map: a pixelated halftone in four blues, mirrored left to right, generated
// live. The two load lobes swell on each foot contact (in step with the runner on the other panel),
// the contours drift, and hovering reads the load under the pointer.
import { useMemo, useRef, useState } from "react";
import { useHalftone, rgba } from "@/lib/halftone";
import { makeNoise3, hash3, smooth, clamp } from "@/lib/noise";
import { CYCLE, footLoad } from "@/lib/pose";
import { fmt, type Readings } from "@/lib/readings";

const C = {
  top: rgba("#c8e0ef"),
  pale: rgba("#bad6e8"),
  core: rgba("#9bbdd9"),
  c2: rgba("#7cb0e0"),
  c3: rgba("#3a84cd"),
  c4: rgba("#0d6dbd"),
  c5: rgba("#085fb1"),
};

// half-width of the central column (0 = centre line, 1 = panel edge) down the map
const CORE: [number, number][] = [
  [0, 0.1], [0.08, 0.19], [0.2, 0.27], [0.3, 0.27], [0.4, 0.2], [0.48, 0.14], [0.56, 0.15],
  [0.66, 0.21], [0.8, 0.23], [1, 0.22],
];
function coreWidth(v: number) {
  for (let k = 1; k < CORE.length; k++) {
    if (v <= CORE[k][0]) {
      const [v0, w0] = CORE[k - 1];
      const [v1, w1] = CORE[k];
      const tt = (v - v0) / (v1 - v0);
      const e = tt * tt * (3 - 2 * tt);
      return w0 + (w1 - w0) * e;
    }
  }
  return CORE[CORE.length - 1][1];
}

export type Probe = { x: number; y: number; kpa: number; side: "L" | "R" | "C" } | null;

export function Heatmap({ readings }: { readings: Readings }) {
  const ref = useRef<HTMLCanvasElement>(null);
  const noise = useMemo(() => makeNoise3(23), []);
  const grid = useRef({ cols: 1, rows: 1, pitch: 4 });
  const loads = useRef<Float32Array>(new Float32Array(1));
  const [probe, setProbe] = useState<Probe>(null);

  useHalftone(ref, {
    pitch: (w) => Math.max(3, Math.round(w / 148)),
    dot: (p) => p - 1,
    gap: 0.8,
    fps: 30,
    onGrid: (g) => {
      grid.current = g;
      loads.current = new Float32Array(g.cols * g.rows);
    },
    render(buf, cols, rows, t) {
      const map = loads.current.length === cols * rows ? loads.current : (loads.current = new Float32Array(cols * rows));
      const phase = (((t / CYCLE) % 1) + 1) % 1;
      const fl = footLoad(phase);
      const tz = t * 0.085;
      const tick = Math.floor(t * 2.2);
      for (let j = 0; j < rows; j++) {
        const v = (j + 0.5) / rows;
        const cw = coreWidth(v);
        const lift = clamp((0.72 - v) / 0.42);
        const sink = clamp((v - 0.75) / 0.25);
        for (let i = 0; i < cols; i++) {
          const u = (i + 0.5) / cols;
          const right = u > 0.5;
          const x = Math.abs(u - 0.5) * 2;
          const idx = j * cols + i;
          // mirrored noise: the same field on both sides
          const n1 = noise(x * 5, v * 5, tz);
          // body outline: shoulders at the top, a waist, then the lobes reach the edges
          let outline = 0.95 + 0.04 * smooth(0, 0.05, v) - 0.075 * Math.exp(-(((v - 0.2) / 0.075) ** 2));
          outline += n1 * 0.03 + (hash3(i >> 1, j >> 1, 5) - 0.5) * 0.025;
          outline = outline + (1.3 - outline) * smooth(0.27, 0.35, v);
          if (x > outline) {
            map[idx] = 0;
            continue;
          }
          let col = v < 0.25 + hash3(i, j, 3) * 0.05 ? C.top : C.pale;
          let kpa = 70 + 40 * (1 - v) + n1 * 10;
          if (x < cw + noise(x * 4, v * 12, tz + 2) * 0.016) {
            col = C.core;
            kpa = 150 + n1 * 14 + 10 * (1 - v);
          } else {
            // the load lobe: an ellipse that leans outward toward its top, with contour bands
            const load = right ? fl.far : fl.near;
            const k = (right ? 1.03 : 1) * (1 + 0.05 * load);
            const cx = 0.585 + 0.2 * lift - 0.07 * sink;
            const rx = (0.42 - 0.1 * lift) * k;
            const ry = 0.38 * k;
            const ex = (x - cx) / rx;
            const ey = (v - 0.69) / ry;
            let d = Math.sqrt(ex * ex + ey * ey);
            // feathered streaks reaching up and in from the lobe's top
            const along = x * 0.8 + v * 0.6;
            const across = x * 0.6 - v * 0.8;
            d += noise(along * 2.4, across * 30, tz * 0.6 + 4) * 0.09 * smooth(0.7, 0.36, v);
            d += n1 * 0.022;
            // a lighter, streaky tongue reaching into the lobe from its upper-inner side
            const hx = (x - 0.48) / 0.27;
            const hy = (v - 0.47) / 0.1;
            const hollow = 1 - (hx * hx + hy * hy);
            if (hollow > 0) d += hollow * (0.32 + 0.18 * noise(along * 3, across * 24, tz + 7));
            d -= 0.05 * load + (right ? 0.012 : 0);
            if (d < 1) {
              const mottle = noise(x * 7 + 3, v * 7, tz * 0.8 + 11);
              col = d < 0.5 + mottle * 0.18 ? C.c5 : d < 0.79 ? C.c4 : d < 0.9 ? C.c3 : C.c2;
              kpa = 190 + (1 - d) * 420 * (right ? 1.06 : 1);
            } else {
              // white specks in the light field, thicker along the column's shoulder
              const nearCore = Math.abs(x - cw) < 0.07 && v < 0.42;
              if (hash3(i, j, tick) > (nearCore ? 0.93 : 0.988)) {
                map[idx] = kpa;
                continue;
              }
            }
          }
          buf[idx] = col;
          map[idx] = kpa;
        }
      }
    },
  });

  const onMove = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    const py = e.clientY - r.top;
    const g = grid.current;
    const i = Math.floor(px / g.pitch);
    const j = Math.floor(py / g.pitch);
    if (i < 0 || j < 0 || i >= g.cols || j >= g.rows) return setProbe(null);
    const kpa = loads.current[j * g.cols + i] || 0;
    const u = px / r.width;
    setProbe({ x: px, y: py, kpa, side: Math.abs(u - 0.5) < 0.12 ? "C" : u < 0.5 ? "L" : "R" });
  };

  return (
    <div
      className="heatmap"
      onPointerMove={onMove}
      onPointerLeave={() => setProbe(null)}
      role="img"
      aria-label={`Load map. Left peak ${Math.round(readings.peakL)} kilopascals, right peak ${Math.round(readings.peakR)} kilopascals.`}
    >
      <canvas ref={ref} className="halftone" />
      <span className="hm-label" style={{ left: "10.5%", top: "88.5%" }}>
        Load Pressure {fmt.deg1(readings.loadPressure)}
      </span>
      <span className="hm-label" style={{ left: "51.5%", top: "49.5%" }}>
        Medial Femoral Load {fmt.deg0(readings.medialLoad)}
      </span>
      <span className="hm-label hm-vert" style={{ right: "2.6%", top: "64%" }}>
        {fmt.int(readings.edge)}
      </span>
      {probe && (
        <>
          <span className="hm-cross hm-cross-x" style={{ top: probe.y }} />
          <span className="hm-cross hm-cross-y" style={{ left: probe.x }} />
          <span
            className="hm-probe"
            style={{
              left: probe.x + (probe.x > 200 ? -10 : 10),
              top: probe.y - 10,
              transform: probe.x > 200 ? "translate(-100%, -100%)" : "translate(0, -100%)",
            }}
          >
            {probe.side} · {probe.kpa > 0 ? `${Math.round(probe.kpa)} kPa` : "no contact"}
          </span>
        </>
      )}
    </div>
  );
}
