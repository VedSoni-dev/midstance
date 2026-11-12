"use client";
// What the panels display, computed from a session at time t. In the workspace (live = false) every number
// is exactly the person's own. On the landing page's showcase (live = true) the sample drifts a little,
// like a live feed, so the poster feels alive.
import { useEffect, useState } from "react";
import { subscribe, now } from "./clock";
import { footLoad } from "./pose";
import { gaitParams, metrics, phaseAt, type Session } from "./session";

export type Readings = ReturnType<typeof readingsAt>;

const s = Math.sin;

export function readingsAt(t: number, session: Session, live: boolean) {
  const d = (a: number, f: number, ph = 0) => (live ? a * s(t * f + ph) : 0);
  const v: Session = {
    ...session,
    loadL: session.loadL + d(0.35, 0.41),
    cadence: session.cadence + d(1, 0.21),
    strideLength: session.strideLength + d(0.01, 0.33),
    contactL: session.contactL + d(3, 0.37, 0.3),
    contactR: session.contactR + d(3, 0.41, 1.1),
    pelvicDropL: session.pelvicDropL + d(0.2, 0.57),
    pelvicDropR: session.pelvicDropR + d(0.25, 0.52, 1),
    verticalOsc: session.verticalOsc + d(0.15, 0.61),
  };
  const m = metrics(v);
  const phase = phaseAt(t);
  const fl = footLoad(phase, gaitParams(session));
  return { t, phase, v, m, loadR: m.loadR, asym: m.asym, loadNear: fl.near, loadFar: fl.far };
}

/** live readings, re-rendered a few times a second (not every frame) */
export function useReadings(session: Session, live: boolean, hz = 6) {
  const [r, setR] = useState(() => readingsAt(now(), session, live));
  useEffect(() => {
    let last = -1;
    setR(readingsAt(now(), session, live));
    return subscribe((t, dt) => {
      if (dt === 0 || last < 0 || Math.abs(t - last) >= 1 / hz) {
        last = t;
        setR(readingsAt(t, session, live));
      }
    });
  }, [hz, session, live]);
  return r;
}

export const fmt = {
  deg0: (v: number) => `${Math.round(v)}°`,
  deg1: (v: number) => `${v.toFixed(1)}°`,
  pct1: (v: number) => `${v.toFixed(1)}%`,
  int: (v: number) => `${Math.round(v)}`,
};
