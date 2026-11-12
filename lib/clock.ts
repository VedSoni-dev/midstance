"use client";
// One animation clock for the whole page, so the heatmap, the runner and the readouts stay in step.
// It honours prefers-reduced-motion (a single still frame), stops while the tab is hidden, and can be
// paused or scrubbed: window.__midstance.hold() then .setTime(seconds) (handy for screenshots).
import { useSyncExternalStore } from "react";

type Sub = (t: number, dt: number) => void;

/** The time the page starts on, and the still frame shown with reduced motion: a clean mid-stride pose. */
export const START_T = 3.8;

const subs = new Set<Sub>();
const listeners = new Set<() => void>();
let t = START_T;
let last = 0;
let raf = 0;
let paused = false;
let held = false; // stopped by a script (screenshots), without showing the paused state
let reduced = false;
let started = false;

function emit(dt: number) {
  subs.forEach((fn) => fn(t, dt));
}

function frame(now: number) {
  raf = 0;
  if (paused || held || reduced || document.hidden) {
    last = 0;
    return;
  }
  const dt = last ? Math.min(0.1, (now - last) / 1000) : 0;
  last = now;
  t += dt;
  emit(dt);
  raf = requestAnimationFrame(frame);
}

function kick() {
  if (!raf && !paused && !held && !reduced && typeof document !== "undefined" && !document.hidden) {
    raf = requestAnimationFrame(frame);
  }
}

function notify() {
  listeners.forEach((l) => l());
}

function init() {
  if (started || typeof window === "undefined") return;
  started = true;
  const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
  reduced = mq.matches;
  mq.addEventListener("change", () => {
    reduced = mq.matches;
    if (reduced) t = START_T;
    emit(0);
    notify();
    kick();
  });
  document.addEventListener("visibilitychange", kick);
  (window as unknown as { __midstance: unknown }).__midstance = {
    pause: () => setPaused(true),
    play: () => {
      held = false;
      setPaused(false);
    },
    hold: () => {
      held = true;
    },
    setTime: (s: number) => setTime(s),
    time: () => t,
  };
}

export function subscribe(fn: Sub) {
  init();
  subs.add(fn);
  fn(t, 0);
  kick();
  return () => {
    subs.delete(fn);
  };
}

export function now() {
  return t;
}

export function setTime(s: number) {
  t = s;
  emit(0);
}

export function setPaused(p: boolean) {
  paused = p;
  notify();
  kick();
}

export function togglePaused() {
  setPaused(!paused);
}

type ClockState = { paused: boolean; reduced: boolean };
let snap: ClockState = { paused, reduced };
function getSnap() {
  if (snap.paused !== paused || snap.reduced !== reduced) snap = { paused, reduced };
  return snap;
}
const serverSnap: ClockState = { paused: false, reduced: false };

export function useClockState() {
  return useSyncExternalStore(
    (l) => {
      init();
      listeners.add(l);
      return () => listeners.delete(l);
    },
    getSnap,
    () => serverSnap,
  );
}
