// A running gait cycle, written from plain biomechanics (hip flexion, knee flexion in swing, opposite
// arm swing, forward lean, vertical bounce). Units: leg length = 1, origin at the hip, +x forward
// (the runner faces right), +y down. Angles are measured from straight down, positive = forward.

export type Pt = { x: number; y: number };

export type Pose = {
  hip: Pt;
  neck: Pt;
  head: Pt;
  near: { knee: Pt; ankle: Pt; toe: Pt; elbow: Pt; hand: Pt; thigh: number; knee_flex: number };
  far: { knee: Pt; ankle: Pt; toe: Pt; elbow: Pt; hand: Pt; thigh: number; knee_flex: number };
};

/** seconds per full stride (left + right step). Slowed down, like the reel's slow-motion runner. */
export const CYCLE = 1.32;

export const SEG = { thigh: 0.5, shin: 0.5, foot: 0.2, torso: 0.86, upper: 0.34, fore: 0.31, head: 0.24 };

const TAU = Math.PI * 2;
const wrap = (p: number) => ((p % 1) + 1) % 1;
/** a soft bump around c on the unit circle of phase */
function bump(p: number, c: number, w: number) {
  let d = Math.abs(wrap(p) - c);
  if (d > 0.5) d = 1 - d;
  return Math.exp(-((d / w) ** 2));
}
const along = (o: Pt, a: number, len: number): Pt => ({ x: o.x + Math.sin(a) * len, y: o.y + Math.cos(a) * len });

/** hip flexion (thigh angle) over the cycle: forward peak late in swing, back peak at toe-off */
export const thighAngle = (p: number) => 0.14 + 0.64 * Math.cos(TAU * (wrap(p) - 0.79));
/** knee flexion: a small loading bend in stance, a deep fold in swing (heel up behind) */
export const kneeFlex = (p: number) => 0.14 + 0.32 * bump(p, 0.1, 0.08) + 2.0 * bump(p, 0.5, 0.16);

function leg(hip: Pt, p: number) {
  const th = thighAngle(p);
  const kf = kneeFlex(p);
  const knee = along(hip, th, SEG.thigh);
  const shin = th - kf;
  const ankle = along(knee, shin, SEG.shin);
  const foot = shin + 1.5 - 0.55 * bump(p, 0.34, 0.07) + 0.15 * bump(p, 0.95, 0.06);
  const toe = along(ankle, foot, SEG.foot);
  return { knee, ankle, toe, thigh: th, knee_flex: kf };
}

function arm(shoulder: Pt, legPhase: number) {
  // the arm swings against the same-side leg, further back than forward, elbow bent near 100 degrees
  const s = -((thighAngle(legPhase) - 0.14) / 0.64);
  const upper = -0.42 + 0.98 * s;
  const elbow = along(shoulder, upper, SEG.upper);
  const fore = upper + 1.72 + 0.12 * s;
  const hand = along(elbow, fore, SEG.fore);
  return { elbow, hand };
}

/** pose at gait phase p (0..1). p = 0 is the near foot's contact. */
export function pose(p: number): Pose {
  const bounce = 0.045 * Math.cos(2 * TAU * (wrap(p) - 0.12)); // lowest at mid-stance, highest in flight
  const lean = 0.17 + 0.03 * Math.cos(2 * TAU * (wrap(p) - 0.2));
  const hip = { x: 0, y: bounce };
  const neck = along(hip, Math.PI - lean, SEG.torso); // pointing up and forward
  const head = along(neck, Math.PI - lean - 0.36, SEG.head * 0.55);
  const nl = leg(hip, p);
  const fl = leg(hip, p + 0.5);
  const shoulder = { x: neck.x - 0.04, y: neck.y + 0.08 };
  const na = arm(shoulder, p);
  const fa = arm(shoulder, p + 0.5);
  return {
    hip,
    neck,
    head,
    near: { ...nl, ...na },
    far: { ...fl, ...fa },
  };
}

/** joint angles a coach would read off the capture, in degrees */
export function angles(p: number) {
  const deg = (r: number) => Math.round((r * 180) / Math.PI);
  return {
    nearHip: deg(thighAngle(p)),
    farHip: deg(thighAngle(p + 0.5)),
    nearKnee: deg(kneeFlex(p)),
    farKnee: deg(kneeFlex(p + 0.5)),
  };
}

/** how hard each foot is loading right now (0..1): a pulse at each contact */
export function footLoad(p: number) {
  return { near: bump(p, 0.1, 0.11), far: bump(p, 0.6, 0.11) };
}
