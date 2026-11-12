// A running gait cycle, written from plain biomechanics (hip flexion, knee flexion in swing, opposite
// arm swing, forward lean, vertical bounce), shaped by a session's numbers. Units: leg length = 1, origin
// at the hip, +x forward (the runner faces right), +y down. Angles are measured from straight down,
// positive = forward. The near leg (drawn in front) is the right leg.
import type { GaitParams } from "./session";

export type Pt = { x: number; y: number };

type Side = { knee: Pt; ankle: Pt; toe: Pt; elbow: Pt; hand: Pt; thigh: number; knee_flex: number };
export type Pose = { hip: Pt; neck: Pt; head: Pt; near: Side; far: Side };

export const SEG = { thigh: 0.5, shin: 0.5, foot: 0.2, torso: 0.86, upper: 0.34, fore: 0.31, head: 0.24 };

/** defaults: hip range of motion ~73 deg, peak knee flexion ~123 deg, 8 cm bounce */
export const DEFAULT_GAIT: GaitParams = { kneeNear: 2.14, kneeFar: 2.14, hipNear: 1.28, hipFar: 1.28, bounce: 0.045, stanceNear: 0.36, stanceFar: 0.36 };

const TAU = Math.PI * 2;
const wrap = (p: number) => ((p % 1) + 1) % 1;
/** a soft bump around c on the unit circle of phase */
function bump(p: number, c: number, w: number) {
  let d = Math.abs(wrap(p) - c);
  if (d > 0.5) d = 1 - d;
  return Math.exp(-((d / w) ** 2));
}
const along = (o: Pt, a: number, len: number): Pt => ({ x: o.x + Math.sin(a) * len, y: o.y + Math.cos(a) * len });

/** hip flexion (thigh angle): forward peak late in swing, back peak at toe-off. rom = full range, radians */
export const thighAngle = (p: number, rom = 1.28) => 0.14 + (rom / 2) * Math.cos(TAU * (wrap(p) - 0.79));
/** knee flexion: a small loading bend in stance, a deep fold in swing up to `peak` radians */
export const kneeFlex = (p: number, peak = 2.14) => 0.14 + 0.32 * bump(p, 0.1, 0.08) + Math.max(0.4, peak - 0.14) * bump(p, 0.5, 0.16);

function leg(hip: Pt, p: number, rom: number, peak: number) {
  const th = thighAngle(p, rom);
  const kf = kneeFlex(p, peak);
  const knee = along(hip, th, SEG.thigh);
  const shin = th - kf;
  const ankle = along(knee, shin, SEG.shin);
  const foot = shin + 1.5 - 0.55 * bump(p, 0.34, 0.07) + 0.15 * bump(p, 0.95, 0.06);
  const toe = along(ankle, foot, SEG.foot);
  return { knee, ankle, toe, thigh: th, knee_flex: kf };
}

function arm(shoulder: Pt, legPhase: number, rom: number) {
  // the arm swings against the same-side leg, further back than forward, elbow bent near 100 degrees
  const s = -((thighAngle(legPhase, rom) - 0.14) / (rom / 2));
  const upper = -0.42 + 0.98 * s;
  const elbow = along(shoulder, upper, SEG.upper);
  const fore = upper + 1.72 + 0.12 * s;
  const hand = along(elbow, fore, SEG.fore);
  return { elbow, hand };
}

/** pose at gait phase p (0..1). p = 0 is the near (right) foot's contact. */
export function pose(p: number, g: GaitParams = DEFAULT_GAIT): Pose {
  const bounce = g.bounce * Math.cos(2 * TAU * (wrap(p) - 0.12)); // lowest at mid-stance, highest in flight
  const lean = 0.17 + 0.03 * Math.cos(2 * TAU * (wrap(p) - 0.2));
  const hip = { x: 0, y: bounce };
  const neck = along(hip, Math.PI - lean, SEG.torso);
  const head = along(neck, Math.PI - lean - 0.36, SEG.head * 0.55);
  const nl = leg(hip, p, g.hipNear, g.kneeNear);
  const fl = leg(hip, p + 0.5, g.hipFar, g.kneeFar);
  const shoulder = { x: neck.x - 0.04, y: neck.y + 0.08 };
  const na = arm(shoulder, p, g.hipNear);
  const fa = arm(shoulder, p + 0.5, g.hipFar);
  return { hip, neck, head, near: { ...nl, ...na }, far: { ...fl, ...fa } };
}

/** live joint angles in degrees */
export function angles(p: number, g: GaitParams = DEFAULT_GAIT) {
  const deg = (r: number) => Math.round((r * 180) / Math.PI);
  return {
    nearHip: deg(thighAngle(p, g.hipNear)),
    farHip: deg(thighAngle(p + 0.5, g.hipFar)),
    nearKnee: deg(kneeFlex(p, g.kneeNear)),
    farKnee: deg(kneeFlex(p + 0.5, g.kneeFar)),
  };
}

/** how hard each foot is loading right now (0..1): a pulse through each stance, as long as the contact time */
export function footLoad(p: number, g: GaitParams = DEFAULT_GAIT) {
  return { near: bump(p, g.stanceNear * 0.4, g.stanceNear * 0.42), far: bump(p, 0.5 + g.stanceFar * 0.4, g.stanceFar * 0.42) };
}
