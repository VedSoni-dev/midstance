"use client";
// A halftone surface: a tiny canvas (one pixel per dot) scaled up with crisp pixels, then cut into a
// dot grid by a CSS mask. The canvas only ever holds cols x rows pixels, so even a full-screen field
// redraws in a few milliseconds and the dots stay razor sharp at any pixel density.
import { useEffect, useRef } from "react";
import { now, subscribe } from "./clock";

export type HalftoneRender = (buf: Uint32Array, cols: number, rows: number, t: number) => void;

export type HalftoneOptions = {
  /** dot pitch in CSS px for a given surface size (rounded to a whole number) */
  pitch: (w: number, h: number) => number;
  /** square dot size as a fraction of the pitch, or in whole CSS px for a given pitch */
  dot: number | ((pitch: number) => number);
  /** corner radius as a fraction of the dot */
  round?: number;
  /** how much colour shows in the gaps between dots (0 = none, the ground shows through) */
  gap?: number;
  /** redraws per second (the clock still runs at display rate) */
  fps: number;
  render: HalftoneRender;
  /** called after each resize with the grid */
  onGrid?: (g: { cols: number; rows: number; pitch: number }) => void;
};

/** "#rrggbb" or "#rrggbbaa" to a little-endian RGBA word for a Uint32Array over ImageData */
export function rgba(hex: string, alpha = 1) {
  const h = hex.replace("#", "");
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  const a = h.length >= 8 ? parseInt(h.slice(6, 8), 16) : Math.round(alpha * 255);
  return ((a << 24) | (b << 16) | (g << 8) | r) >>> 0;
}

function dotMask(pitch: number, dot: number | ((p: number) => number), round: number, gap: number) {
  const d = typeof dot === "function" ? dot(pitch) : Math.max(1, Math.round(pitch * dot * 100) / 100);
  const r = Math.round(d * round * 100) / 100;
  const under = gap > 0 ? `<rect width='${pitch}' height='${pitch}' fill='black' fill-opacity='${gap}'/>` : "";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='${pitch}' height='${pitch}'>${under}<rect width='${d}' height='${d}' rx='${r}' fill='black'/></svg>`;
  return `url("data:image/svg+xml;utf8,${encodeURIComponent(svg)}")`;
}

export function useHalftone(canvasRef: React.RefObject<HTMLCanvasElement | null>, opts: HalftoneOptions) {
  const optsRef = useRef(opts);
  optsRef.current = opts;

  useEffect(() => {
    const canvas = canvasRef.current;
    const host = canvas?.parentElement;
    if (!canvas || !host) return;
    const ctx = canvas.getContext("2d", { alpha: true });
    if (!ctx) return;

    let cols = 0;
    let rows = 0;
    let img: ImageData | null = null;
    let buf: Uint32Array | null = null;
    let lastDraw = -1;

    const draw = (t: number) => {
      if (!img || !buf) return;
      buf.fill(0);
      optsRef.current.render(buf, cols, rows, t);
      ctx.putImageData(img, 0, 0);
      lastDraw = t;
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      const o = optsRef.current;
      const pitch = Math.max(2, Math.round(o.pitch(w, h)));
      const c = Math.ceil(w / pitch);
      const r = Math.ceil(h / pitch);
      if (c !== cols || r !== rows || canvas.dataset.pitch !== String(pitch)) {
        cols = c;
        rows = r;
        canvas.width = cols;
        canvas.height = rows;
        canvas.style.width = `${cols * pitch}px`;
        canvas.style.height = `${rows * pitch}px`;
        const m = dotMask(pitch, o.dot, o.round ?? 0, o.gap ?? 0);
        canvas.style.setProperty("mask-image", m);
        canvas.style.setProperty("-webkit-mask-image", m);
        canvas.style.setProperty("mask-size", `${pitch}px ${pitch}px`);
        canvas.style.setProperty("-webkit-mask-size", `${pitch}px ${pitch}px`);
        canvas.dataset.pitch = String(pitch);
        img = ctx.createImageData(cols, rows);
        buf = new Uint32Array(img.data.buffer);
        o.onGrid?.({ cols, rows, pitch });
        draw(now());
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();

    const unsub = subscribe((t, dt) => {
      const fps = optsRef.current.fps;
      if (dt === 0 || lastDraw < 0 || t - lastDraw >= 1 / fps || t < lastDraw) draw(t);
    });
    return () => {
      ro.disconnect();
      unsub();
    };
  }, [canvasRef]);
}
