"use client";
// The cinematic panel: a blurred runner (drawn here, not a photo) in a looped gait cycle, a sharp
// motion-capture skeleton tracking it, breathing HUD rings and rulers. Click to freeze the frame;
// hover a joint to read its angle.
import { useEffect, useRef } from "react";
import { subscribe, togglePaused, useClockState } from "@/lib/clock";
import { CYCLE, pose, angles, type Pose, type Pt } from "@/lib/pose";
import { hash3 } from "@/lib/noise";

const HIP = { x: 0.53, y: 0.535 }; // where the hip sits in the panel (fractions)
const UNIT = 0.335; // leg length as a fraction of panel height

type Geo = { w: number; h: number; U: number; ox: number; oy: number };

function geo(w: number, h: number): Geo {
  return { w, h, U: h * UNIT, ox: w * HIP.x, oy: h * HIP.y };
}
const P = (g: Geo, p: Pt) => ({ x: g.ox + p.x * g.U, y: g.oy + p.y * g.U });

function seg(ctx: CanvasRenderingContext2D, a: Pt, b: Pt, w: number) {
  ctx.lineWidth = w;
  ctx.beginPath();
  ctx.moveTo(a.x, a.y);
  ctx.lineTo(b.x, b.y);
  ctx.stroke();
}
function disc(ctx: CanvasRenderingContext2D, c: Pt, r: number) {
  ctx.beginPath();
  ctx.arc(c.x, c.y, r, 0, Math.PI * 2);
  ctx.fill();
}

/** one opaque silhouette of the runner at pose `ps`, shifted by dx */
function drawRunner(ctx: CanvasRenderingContext2D, g: Geo, ps: Pose, dx: number, tone: { near: string; far: string; body: string }) {
  const U = g.U;
  const q = (p: Pt) => {
    const s = P(g, p);
    return { x: s.x + dx, y: s.y };
  };
  ctx.lineCap = "round";
  ctx.lineJoin = "round";
  const limb = (side: Pose["near"], color: string, shoulder: Pt) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    seg(ctx, q(shoulder), q(side.elbow), U * 0.125);
    seg(ctx, q(side.elbow), q(side.hand), U * 0.1);
    disc(ctx, q(side.hand), U * 0.06);
  };
  const leg = (side: Pose["near"], color: string) => {
    ctx.strokeStyle = color;
    ctx.fillStyle = color;
    seg(ctx, q(ps.hip), q(side.knee), U * 0.2);
    seg(ctx, q(side.knee), q(side.ankle), U * 0.135);
    seg(ctx, q(side.ankle), q(side.toe), U * 0.115);
  };
  const shoulder = { x: ps.neck.x - 0.04, y: ps.neck.y + 0.08 };
  // far side first, so the near limbs overlap it
  limb(ps.far, tone.far, shoulder);
  leg(ps.far, tone.far);
  // torso: a hooded top, broad at the shoulders, rounded over the back
  ctx.strokeStyle = tone.body;
  ctx.fillStyle = tone.body;
  const sx = ps.neck.x - ps.hip.x;
  const sy = ps.neck.y - ps.hip.y;
  const len = Math.hypot(sx, sy);
  const nx = -sy / len; // perpendicular, pointing forward
  const ny = sx / len;
  const at = (f: number, side: number) => q({ x: ps.hip.x + sx * f + nx * side, y: ps.hip.y + sy * f + ny * side });
  // the trunk as one rounded shape: pelvis, belly, chest, shoulders, then the hunched back
  const outline = [at(0, 0.15), at(0.3, 0.17), at(0.62, 0.2), at(0.92, 0.16), at(1.04, 0.02), at(0.98, -0.2), at(0.7, -0.27), at(0.36, -0.2), at(0.04, -0.17)];
  ctx.beginPath();
  ctx.moveTo((outline[0].x + outline[outline.length - 1].x) / 2, (outline[0].y + outline[outline.length - 1].y) / 2);
  for (let i = 0; i < outline.length; i++) {
    const p0 = outline[i];
    const p1 = outline[(i + 1) % outline.length];
    ctx.quadraticCurveTo(p0.x, p0.y, (p0.x + p1.x) / 2, (p0.y + p1.y) / 2);
  }
  ctx.closePath();
  ctx.fill();
  disc(ctx, q(ps.hip), U * 0.165);
  // head and hood
  seg(ctx, q({ x: ps.neck.x - 0.02, y: ps.neck.y + 0.04 }), q(ps.head), U * 0.14);
  disc(ctx, q({ x: ps.head.x - 0.03, y: ps.head.y + 0.012 }), U * 0.125);
  disc(ctx, q(ps.head), U * 0.108);
  leg(ps.near, tone.near);
  limb(ps.near, tone.near, shoulder);
}

const TONE = { near: "#050b17", far: "#10213f", body: "#071122" };
const GHOST = { near: "#b4d3f0", far: "#b4d3f0", body: "#a9cbec" };

function phaseAt(t: number) {
  return (((t / CYCLE) % 1) + 1) % 1;
}

const JOINT_NAMES: Record<string, string> = {
  neck: "C7 · trunk lean",
  nearHand: "Wrist · lead",
  farHand: "Wrist · trail",
  nearAnkle: "Ankle · lead",
  farAnkle: "Ankle · trail",
  nearKnee: "Knee · lead",
  farKnee: "Knee · trail",
  hip: "Pelvis",
};

export function TelemetryPanel() {
  const wrap = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<HTMLCanvasElement>(null);
  const fxRef = useRef<HTMLCanvasElement>(null);
  const figRef = useRef<HTMLCanvasElement>(null);
  const hudRef = useRef<HTMLCanvasElement>(null);
  const pointer = useRef<Pt | null>(null);
  const { paused, reduced } = useClockState();

  useEffect(() => {
    const host = wrap.current;
    const scene = sceneRef.current;
    const fx = fxRef.current;
    const fig = figRef.current;
    const hud = hudRef.current;
    if (!host || !scene || !fx || !fig || !hud) return;
    const sctx = scene.getContext("2d")!;
    const fxc = fx.getContext("2d")!;
    const fc = fig.getContext("2d")!;
    const hc = hud.getContext("2d")!;
    const sample = document.createElement("canvas");
    const sc = sample.getContext("2d")!;
    let g = geo(1, 1);
    let dpr = 1;
    let lastT = 0;

    const paintScene = () => {
      const { w, h } = g;
      scene.width = Math.round(w * 0.5);
      scene.height = Math.round(h * 0.5);
      const c = sctx;
      c.setTransform(0.5, 0, 0, 0.5, 0, 0);
      const base = c.createLinearGradient(0, 0, 0, h);
      base.addColorStop(0, "#2a6d98");
      base.addColorStop(0.5, "#3881ab");
      base.addColorStop(1, "#2c6c96");
      c.fillStyle = base;
      c.fillRect(0, 0, w, h);
      const glow = (x: number, y: number, rx: number, stops: [number, string][], ry = rx) => {
        c.save();
        c.translate(x, y);
        c.scale(1, ry / rx);
        const gr = c.createRadialGradient(0, 0, 0, 0, 0, rx);
        stops.forEach(([o, col]) => gr.addColorStop(o, col));
        c.fillStyle = gr;
        c.fillRect(-rx, -rx, rx * 2, rx * 2);
        c.restore();
      };
      glow(w * 0.9, h * 0.08, w * 0.9, [[0, "rgba(104,170,204,0.5)"], [1, "rgba(104,170,204,0)"]]);
      glow(w * 0.02, h * 0.02, w * 0.7, [[0, "rgba(16,48,92,0.6)"], [1, "rgba(16,48,92,0)"]]);
      glow(0, h * 0.5, w * 0.22, [[0, "rgba(18,52,96,0.55)"], [1, "rgba(18,52,96,0)"]], h * 0.5);
      // window light down the right side
      glow(w * 1.02, h * 0.62, w * 0.42, [[0, "rgba(226,236,244,0.95)"], [0.55, "rgba(200,222,238,0.5)"], [1, "rgba(200,222,238,0)"]], h * 0.3);
      // the floor: a bright, snowy slope rising to the right
      c.beginPath();
      c.moveTo(w * 0.02, h);
      c.bezierCurveTo(w * 0.3, h * 0.84, w * 0.6, h * 0.76, w, h * 0.46);
      c.lineTo(w, h);
      c.closePath();
      const fl = c.createLinearGradient(w * 0.3, h, w, h * 0.5);
      fl.addColorStop(0, "#eef3f7");
      fl.addColorStop(0.5, "#e3edf4");
      fl.addColorStop(1, "rgba(196,218,236,0.9)");
      c.fillStyle = fl;
      c.fill();
      glow(w * 0.74, h * 0.84, w * 0.48, [[0, "rgba(255,255,255,1)"], [0.6, "rgba(255,255,255,0.7)"], [1, "rgba(255,255,255,0)"]], h * 0.13);
      // a dark ridge in the bottom-left corner
      c.beginPath();
      c.moveTo(0, h * 0.76);
      c.bezierCurveTo(w * 0.18, h * 0.77, w * 0.38, h * 0.84, w * 0.6, h * 0.95);
      c.lineTo(w * 0.66, h);
      c.lineTo(0, h);
      c.closePath();
      c.fillStyle = "rgba(22,64,108,0.96)";
      c.fill();
      // a cool, darker strip along the very bottom, where the bottom ruler sits
      const bot = c.createLinearGradient(0, h * 0.88, 0, h);
      bot.addColorStop(0, "rgba(88,128,166,0)");
      bot.addColorStop(1, "rgba(88,128,166,0.55)");
      c.fillStyle = bot;
      c.fillRect(0, h * 0.88, w, h * 0.12);
    };

    const resize = () => {
      const w = host.clientWidth;
      const h = host.clientHeight;
      if (!w || !h) return;
      dpr = Math.min(2, window.devicePixelRatio || 1);
      g = geo(w, h);
      for (const [cv, scale] of [[fx, 0.5], [fig, 1], [sample, 1]] as const) {
        cv.width = Math.round(w * scale);
        cv.height = Math.round(h * scale);
      }
      hud.width = Math.round(w * dpr);
      hud.height = Math.round(h * dpr);
      paintScene();
      draw(lastT);
    };

    const draw = (t: number) => {
      lastT = t;
      const { w, h, U } = g;
      const ph = phaseAt(t);

      // --- fx: floor streaks, a contact shadow, and the trailing haze (half res, heavily blurred)
      fxc.setTransform(0.5, 0, 0, 0.5, 0, 0);
      fxc.clearRect(0, 0, w, h);
      const speed = U * 1.9; // ground speed, px per second, matched to the stance foot
      for (let k = 0; k < 18; k++) {
        const y = h * (0.82 + hash3(k, 1, 0) * 0.17);
        const len = w * (0.12 + hash3(k, 2, 0) * 0.3);
        const span = w + len;
        const x = w - ((((hash3(k, 3, 0) * span + t * speed * (0.8 + hash3(k, 4, 0) * 0.5)) % span) + span) % span);
        fxc.fillStyle = `rgba(255,255,255,${0.18 + hash3(k, 5, 0) * 0.3})`;
        fxc.fillRect(x, y, len, 2 + hash3(k, 6, 0) * 4);
      }
      const ps = pose(ph);
      const lowFoot = Math.max(P(g, ps.near.ankle).y, P(g, ps.far.ankle).y);
      fxc.fillStyle = "rgba(20,48,84,0.16)";
      fxc.beginPath();
      fxc.ellipse(g.ox + U * 0.2, Math.max(lowFoot + U * 0.1, h * 0.87), w * 0.3, h * 0.03, 0, 0, Math.PI * 2);
      fxc.fill();
      for (let k = 1; k <= 5; k++) {
        fxc.globalAlpha = 0.55 - k * 0.08;
        drawRunner(fxc, g, pose(phaseAt(t - k * 0.05)), -k * U * 0.13, GHOST);
      }
      fxc.globalAlpha = 1;

      // --- the figure: average of several sub-frames = real motion blur on the fast limbs
      fc.globalCompositeOperation = "source-over";
      fc.clearRect(0, 0, w, h);
      const N = 6;
      const spread = 0.06; // seconds of "shutter"
      fc.globalCompositeOperation = "lighter";
      fc.globalAlpha = 1 / N;
      for (let k = 0; k < N; k++) {
        sc.clearRect(0, 0, w, h);
        const tt = t - spread * (k / (N - 1));
        drawRunner(sc, g, pose(phaseAt(tt)), -(k / (N - 1)) * U * 0.05, TONE);
        fc.drawImage(sample, 0, 0);
      }
      fc.globalAlpha = 1;
      // light it: a warm glow low on the torso, a cool rim from the upper right
      fc.globalCompositeOperation = "source-atop";
      const hip = P(g, ps.hip);
      const wx = hip.x + U * 0.1;
      const wy = hip.y - U * 0.22;
      const warm = fc.createRadialGradient(wx, wy, 0, wx, wy, U * 0.24);
      warm.addColorStop(0, "rgba(200,48,36,0.58)");
      warm.addColorStop(0.5, "rgba(170,40,40,0.2)");
      warm.addColorStop(1, "rgba(170,40,40,0)");
      fc.fillStyle = warm;
      fc.fillRect(0, 0, w, h);
      const rim = fc.createLinearGradient(w, 0, w * 0.35, h * 0.6);
      rim.addColorStop(0, "rgba(90,140,200,0.38)");
      rim.addColorStop(1, "rgba(90,140,200,0)");
      fc.fillStyle = rim;
      fc.fillRect(0, 0, w, h);
      fc.globalCompositeOperation = "source-over";

      // --- the HUD: a sharp motion-capture skeleton on top (full resolution)
      hc.setTransform(dpr, 0, 0, dpr, 0, 0);
      hc.clearRect(0, 0, w, h);
      const j = {
        neck: P(g, { x: ps.neck.x - 0.02, y: ps.neck.y + 0.02 }),
        hip: P(g, ps.hip),
        nearKnee: P(g, ps.near.knee),
        nearAnkle: P(g, ps.near.ankle),
        farKnee: P(g, ps.far.knee),
        farAnkle: P(g, ps.far.ankle),
        nearElbow: P(g, ps.near.elbow),
        nearHand: P(g, ps.near.hand),
        farElbow: P(g, ps.far.elbow),
        farHand: P(g, ps.far.hand),
      };
      const lw = Math.max(1, w / 420);
      hc.setLineDash([4.5 * lw, 4 * lw]);
      hc.lineDashOffset = -t * 14;
      hc.lineWidth = 1.15 * lw;
      hc.strokeStyle = "rgba(255,255,255,0.88)";
      hc.lineJoin = "round";
      const path = (pts: Pt[]) => {
        hc.beginPath();
        hc.moveTo(pts[0].x, pts[0].y);
        for (let i = 1; i < pts.length; i++) hc.lineTo(pts[i].x, pts[i].y);
        hc.stroke();
      };
      path([j.farHand, j.farElbow, j.neck, j.nearElbow, j.nearHand]);
      path([j.neck, j.hip]);
      path([j.hip, j.nearKnee, j.nearAnkle]);
      path([j.hip, j.farKnee, j.farAnkle]);
      hc.setLineDash([]);
      // small nodes at the bends
      hc.fillStyle = "rgba(255,255,255,0.9)";
      for (const p of [j.hip, j.nearKnee, j.farKnee, j.nearElbow, j.farElbow]) disc(hc, p, 1.3 * lw);
      // glowing markers on the tracked points
      for (const p of [j.neck, j.nearHand, j.farHand, j.nearAnkle, j.farAnkle]) {
        const gl = hc.createRadialGradient(p.x, p.y, 0, p.x, p.y, 11 * lw);
        gl.addColorStop(0, "rgba(64,170,255,0.75)");
        gl.addColorStop(1, "rgba(64,170,255,0)");
        hc.fillStyle = gl;
        disc(hc, p, 11 * lw);
        hc.fillStyle = "rgba(225,242,255,0.95)";
        disc(hc, p, 4 * lw);
        hc.fillStyle = "#2e9bff";
        disc(hc, p, 2.7 * lw);
      }
      // ruler cursors: hip height on the left ruler, lead foot on the bottom one
      hc.fillStyle = "#7fd0ff";
      hc.fillRect(w * 0.036, j.hip.y - 0.75 * lw, w * 0.05, 1.5 * lw);
      const lead = j.nearAnkle.x > j.farAnkle.x ? j.nearAnkle : j.farAnkle;
      hc.fillRect(lead.x - 0.75 * lw, h * 0.902, 1.5 * lw, h * 0.03);

      // hover: the nearest joint's reading
      const pt = pointer.current;
      if (pt) {
        let best: [string, Pt] | null = null;
        let bd = 30 * lw;
        for (const [k, p] of Object.entries(j)) {
          if (!JOINT_NAMES[k]) continue;
          const d = Math.hypot(p.x - pt.x, p.y - pt.y);
          if (d < bd) {
            bd = d;
            best = [k, p];
          }
        }
        if (best) {
          const a = angles(ph);
          const [k, p] = best;
          const val =
            k === "nearKnee" || k === "nearAnkle" ? `${a.nearKnee}° flex` :
            k === "farKnee" || k === "farAnkle" ? `${a.farKnee}° flex` :
            k === "neck" ? `${Math.round(14 + 1.7 * Math.cos(4 * Math.PI * (ph - 0.2)))}°` :
            k === "hip" ? `${a.nearHip}° / ${a.farHip}°` :
            k === "nearHand" ? `${-a.nearHip}° swing` : `${-a.farHip}° swing`;
          const label = `${JOINT_NAMES[k]}  ${val}`;
          hc.font = `${Math.round(10 * lw)}px ui-monospace, "Geist Mono", monospace`;
          const tw = hc.measureText(label).width;
          const bx = Math.min(w - tw - 22 * lw, p.x + 12 * lw);
          const by = p.y - 26 * lw;
          hc.fillStyle = "rgba(6,22,44,0.72)";
          hc.fillRect(bx, by, tw + 14 * lw, 18 * lw);
          hc.fillStyle = "#cfe9ff";
          hc.fillText(label, bx + 7 * lw, by + 12.5 * lw);
          hc.strokeStyle = "rgba(127,208,255,0.9)";
          hc.lineWidth = 1 * lw;
          hc.beginPath();
          hc.arc(p.x, p.y, 7 * lw, 0, Math.PI * 2);
          hc.stroke();
        }
      }
    };

    const ro = new ResizeObserver(resize);
    ro.observe(host);
    resize();
    const unsub = subscribe((t) => draw(t));
    const move = (e: PointerEvent) => {
      const r = host.getBoundingClientRect();
      pointer.current = { x: e.clientX - r.left, y: e.clientY - r.top };
      draw(lastT);
    };
    const leave = () => {
      pointer.current = null;
      draw(lastT);
    };
    host.addEventListener("pointermove", move);
    host.addEventListener("pointerleave", leave);
    return () => {
      ro.disconnect();
      unsub();
      host.removeEventListener("pointermove", move);
      host.removeEventListener("pointerleave", leave);
    };
  }, []);

  const label = reduced ? "Motion is reduced on this device" : paused ? "Paused. Click to resume" : "Click to freeze the frame";

  return (
    <section
      ref={wrap}
      className={`panel tele${paused ? " is-paused" : ""}`}
      aria-label="Biometric telemetry: a motion-capture view of a runner"
      onClick={() => !reduced && togglePaused()}
      onKeyDown={(e) => {
        if (!reduced && (e.key === " " || e.key === "Enter")) {
          e.preventDefault();
          togglePaused();
        }
      }}
      tabIndex={0}
      role="button"
      aria-pressed={paused}
    >
      <canvas ref={sceneRef} className="tele-scene" aria-hidden />
      <canvas ref={fxRef} className="tele-fx" aria-hidden />
      <canvas ref={figRef} className="tele-fig" aria-hidden />
      <svg className="tele-svg" viewBox="0 0 1000 1575" preserveAspectRatio="none" aria-hidden>
        <g className="rings">
          <circle className="ring ring-a" cx="505" cy="805" r="415" />
          <circle className="ring ring-b" cx="505" cy="805" r="276" />
          <circle className="ring ring-c" cx="505" cy="805" r="128" />
          <circle className="ring ring-d" cx="505" cy="805" r="438" />
        </g>
        <g className="ruler">
          {Array.from({ length: 92 }, (_, i) => {
            const y = 292 + i * 10;
            const major = i % 5 === 0;
            return <line key={`l${i}`} x1="38" x2={major ? 66 : 54} y1={y} y2={y} />;
          })}
          {Array.from({ length: 82 }, (_, i) => {
            const x = 112 + i * 10;
            const major = i % 5 === 0;
            return <line key={`b${i}`} x1={x} x2={x} y1="1468" y2={major ? 1440 : 1453} />;
          })}
        </g>
      </svg>
      <canvas ref={hudRef} className="tele-hud" aria-hidden />
      <div className="tele-vignette" aria-hidden />
      <p className="tele-eyebrow">
        <span className="dot-target" aria-hidden />
        Biometric Telemetry / V.04
      </p>
      <p className="tele-word">Biomechanics !</p>
      <span className="tele-hint">{label}</span>
    </section>
  );
}
