"use client";
// The sample session's live readouts. Every number on the page comes from here, so the heatmap labels,
// the readout row and the protocol always agree. Values drift around a fixed sample session (it is a
// demo: no sensor is attached), in step with the runner's gait phase.
import { useEffect, useState } from "react";
import { subscribe, now } from "./clock";
import { CYCLE, footLoad } from "./pose";

export type Readings = {
  t: number;
  phase: number;
  asym: number; // gait asymmetry, degrees
  loadPressure: number; // the heatmap's left label
  medialLoad: number; // the heatmap's right label
  edge: number; // the small vertical number on the heatmap's edge
  cadence: number; // steps per minute
  contactL: number; // ground contact, ms
  contactR: number;
  peakL: number; // peak plantar load, kPa
  peakR: number;
  strideLength: number; // m
  verticalOsc: number; // cm
  pelvicDropL: number; // degrees
  pelvicDropR: number;
  loadNear: number; // 0..1, the foot loading right now
  loadFar: number;
};

const s = Math.sin;

export function readingsAt(t: number): Readings {
  const phase = (((t / CYCLE) % 1) + 1) % 1;
  const fl = footLoad(phase);
  return {
    t,
    phase,
    asym: 29 + 0.55 * s(t * 0.31) + 0.35 * s(t * 1.07 + 1),
    loadPressure: 47.3 + 1.1 * s(t * 0.83) + 0.5 * fl.near,
    medialLoad: 29 + 0.8 * s(t * 0.47 + 2) + 0.4 * fl.far,
    edge: 35 + 1.4 * s(t * 0.29 + 0.5),
    cadence: 172 + 1.2 * s(t * 0.21),
    contactL: 248 + 3 * s(t * 0.37 + 0.3),
    contactR: 262 + 3 * s(t * 0.41 + 1.1),
    peakL: 318 + 9 * s(t * 0.53) + 22 * fl.near,
    peakR: 352 + 9 * s(t * 0.49 + 2.2) + 24 * fl.far,
    strideLength: 1.32 + 0.01 * s(t * 0.33),
    verticalOsc: 8.1 + 0.15 * s(t * 0.61),
    pelvicDropL: 4.2 + 0.2 * s(t * 0.57),
    pelvicDropR: 6.8 + 0.25 * s(t * 0.52 + 1),
    loadNear: fl.near,
    loadFar: fl.far,
  };
}

/** live readings, re-rendered a few times a second (not every frame) */
export function useReadings(hz = 6) {
  const [r, setR] = useState<Readings>(() => readingsAt(now()));
  useEffect(() => {
    let last = -1;
    return subscribe((t, dt) => {
      if (dt === 0 || last < 0 || Math.abs(t - last) >= 1 / hz) {
        last = t;
        setR(readingsAt(t));
      }
    });
  }, [hz]);
  return r;
}

export const fmt = {
  deg0: (v: number) => `${Math.round(v)}°`,
  deg1: (v: number) => `${v.toFixed(1)}°`,
  int: (v: number) => `${Math.round(v)}`,
};
