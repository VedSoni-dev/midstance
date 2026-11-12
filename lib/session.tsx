"use client";
// A gait session: the numbers a person brings (from a treadmill gait analysis, a running watch or a coach).
// Everything Midstance draws and says is computed from one of these. Sessions live in this browser
// (localStorage) and can be exported and imported as JSON.
import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { now as nowT } from "./clock";

export type Session = {
  id: string;
  name: string;
  date: string; // yyyy-mm-dd
  loadL: number; // % of total load on the left foot; right = 100 - left
  cadence: number; // steps per minute
  strideLength: number; // m, foot strike to the next foot strike (the running-watch convention)
  contactL: number; // ground contact time, ms
  contactR: number;
  kneeL: number; // peak knee flexion in swing, degrees
  kneeR: number;
  hipL: number; // hip range of motion in the stride (flexion + extension), degrees
  hipR: number;
  pelvicDropL: number; // contralateral pelvic drop in stance, degrees
  pelvicDropR: number;
  verticalOsc: number; // vertical oscillation, cm
  notes: string;
};

export type NumKey = Exclude<keyof Session, "id" | "name" | "date" | "notes">;

export const LIMITS: Record<NumKey, [number, number, number]> = {
  // [min, max, step]
  loadL: [35, 65, 0.5],
  cadence: [130, 210, 1],
  strideLength: [0.6, 2.4, 0.01],
  contactL: [150, 400, 1],
  contactR: [150, 400, 1],
  kneeL: [60, 140, 1],
  kneeR: [60, 140, 1],
  hipL: [30, 90, 1],
  hipR: [30, 90, 1],
  pelvicDropL: [0, 12, 0.1],
  pelvicDropR: [0, 12, 0.1],
  verticalOsc: [4, 14, 0.1],
};

type Numbers = Omit<Session, "id" | "name" | "date" | "notes">;

export const PRESETS: { id: string; label: string; blurb: string; values: Numbers }[] = [
  {
    id: "even",
    label: "Even",
    blurb: "a balanced recreational runner",
    values: { loadL: 50, cadence: 166, strideLength: 1.24, contactL: 252, contactR: 254, kneeL: 114, kneeR: 115, hipL: 60, hipR: 61, pelvicDropL: 4, pelvicDropR: 4.2, verticalOsc: 8.6 },
  },
  {
    id: "right-heavy",
    label: "Right-heavy",
    blurb: "loads and drops more on the right",
    values: { loadL: 47, cadence: 172, strideLength: 1.32, contactL: 248, contactR: 262, kneeL: 118, kneeR: 109, hipL: 64, hipR: 57, pelvicDropL: 4.2, pelvicDropR: 6.8, verticalOsc: 8.1 },
  },
  {
    id: "overstrider",
    label: "Overstrider",
    blurb: "long, slow, bouncy steps",
    values: { loadL: 50.5, cadence: 156, strideLength: 1.48, contactL: 286, contactR: 290, kneeL: 98, kneeR: 100, hipL: 72, hipR: 71, pelvicDropL: 5.2, pelvicDropR: 5.4, verticalOsc: 10.6 },
  },
  {
    id: "guarding-left",
    label: "Guarding the left",
    blurb: "shies off a sore left leg",
    values: { loadL: 43, cadence: 168, strideLength: 1.2, contactL: 238, contactR: 266, kneeL: 104, kneeR: 117, hipL: 52, hipR: 63, pelvicDropL: 6.9, pelvicDropR: 4.1, verticalOsc: 8.9 },
  },
];

/** The landing page's showcase: the right-heavy preset, as a sample. */
export const SAMPLE: Session = { id: "sample", name: "Sample session", date: "2026-11-12", notes: "", ...PRESETS[1].values };

const newId = () => (typeof crypto !== "undefined" && "randomUUID" in crypto ? crypto.randomUUID() : `s${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`);
const today = () => new Date().toISOString().slice(0, 10);

export function newSession(presetId = "even", name = "New session"): Session {
  const p = PRESETS.find((x) => x.id === presetId) ?? PRESETS[0];
  return { id: newId(), name, date: today(), notes: "", ...p.values };
}

const clampNum = (v: unknown, [lo, hi]: [number, number, number], fallback: number) => {
  const n = typeof v === "number" ? v : parseFloat(String(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(hi, Math.max(lo, n));
};

/** a session with every number inside its range (what the views draw) */
export function sanitize(s: Partial<Session>, base: Session = SAMPLE): Session {
  const out = { ...base, ...s } as Session;
  (Object.keys(LIMITS) as NumKey[]).forEach((k) => {
    out[k] = clampNum(s[k], LIMITS[k], base[k]);
  });
  out.name = String(s.name ?? base.name).slice(0, 80) || "Untitled session";
  out.date = /^\d{4}-\d{2}-\d{2}$/.test(String(s.date)) ? String(s.date) : base.date;
  out.notes = String(s.notes ?? "").slice(0, 2000);
  out.id = String(s.id ?? base.id);
  return out;
}

/** symmetry index, % */
export const si = (l: number, r: number) => (l + r === 0 ? 0 : (Math.abs(r - l) / ((r + l) / 2)) * 100);

export function metrics(s: Session) {
  const loadR = 100 - s.loadL;
  const siLoad = si(s.loadL, loadR);
  const siContact = si(s.contactL, s.contactR);
  const siKnee = si(s.kneeL, s.kneeR);
  const siHip = si(s.hipL, s.hipR);
  const siDrop = si(s.pelvicDropL, s.pelvicDropR);
  const asym = (siLoad + siContact + siKnee + siHip) / 4;
  const speed = (s.strideLength * s.cadence) / 60; // m/s
  const paceSec = speed > 0 ? 1000 / speed : 0; // s per km
  return { loadR, siLoad, siContact, siKnee, siHip, siDrop, asym, speed, paceSec };
}

export const fmtPace = (sec: number) => `${Math.floor(sec / 60)}:${String(Math.round(sec % 60)).padStart(2, "0")} /km`;

// ---------------- the gait clock: phase stays continuous when the cadence changes ----------------
/** the runner is shown at half speed, like the reel's slow-motion runner */
export const SLOWMO = 2;
let cyc = 1.4;
let off = 0;
const wrap = (p: number) => ((p % 1) + 1) % 1;
export const cycleFor = (s: Session) => (120 / s.cadence) * SLOWMO;
export function setCycle(c: number, t: number) {
  if (Math.abs(c - cyc) < 1e-6) return;
  const p = t / cyc + off;
  cyc = c;
  off = p - t / c;
}
export const phaseAt = (t: number) => wrap(t / cyc + off);

/** the runner's joint parameters from a session. In side view the near leg is the right one. */
export function gaitParams(s: Session) {
  const rad = (d: number) => (d * Math.PI) / 180;
  const real = 120 / s.cadence; // seconds per stride, real time
  return {
    kneeNear: rad(s.kneeR),
    kneeFar: rad(s.kneeL),
    hipNear: rad(s.hipR),
    hipFar: rad(s.hipL),
    bounce: s.verticalOsc / 180, // half of peak-to-peak, in leg lengths (leg ~ 0.9 m)
    stanceNear: Math.min(0.48, s.contactR / 1000 / real),
    stanceFar: Math.min(0.48, s.contactL / 1000 / real),
  };
}
export type GaitParams = ReturnType<typeof gaitParams>;

// ---------------- the session a view draws ----------------
type ViewCtx = { session: Session; live: boolean };
const SessionCtx = createContext<ViewCtx>({ session: SAMPLE, live: true });
export const SessionView = SessionCtx.Provider;
export const useSessionView = () => useContext(SessionCtx);

/** a ref that always holds the latest value, for canvas loops */
export function useLatest<T>(v: T) {
  const r = useRef(v);
  r.current = v;
  return r;
}

// ---------------- the workspace's store (localStorage) ----------------
const KEY = "midstance:v1";
type Stored = { sessions: Session[]; current: string; onboarded: boolean };

export type ImportResult = { ok: true; count: number } | { ok: false; error: string };

export function useSessions() {
  const [store, setStore] = useState<Stored | null>(null);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    let s: Stored | null = null;
    try {
      const raw = localStorage.getItem(KEY);
      if (raw) {
        const j = JSON.parse(raw);
        const sessions = Array.isArray(j.sessions) ? j.sessions.map((x: Partial<Session>) => sanitize(x, newSession())) : [];
        if (sessions.length) s = { sessions, current: sessions.some((x: Session) => x.id === j.current) ? j.current : sessions[0].id, onboarded: !!j.onboarded };
      }
    } catch {
      /* storage blocked or corrupt: start fresh */
    }
    if (!s) {
      const first = newSession("even", "My first session");
      s = { sessions: [first], current: first.id, onboarded: false };
    }
    setStore(s);
  }, []);

  useEffect(() => {
    if (!store) return;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(() => {
      try {
        localStorage.setItem(KEY, JSON.stringify(store));
      } catch {
        /* private mode: keep working without saving */
      }
    }, 250);
  }, [store]);

  const current = useMemo(() => store?.sessions.find((x) => x.id === store.current) ?? store?.sessions[0] ?? null, [store]);

  const update = useCallback((patch: Partial<Session>) => {
    setStore((st) => (st ? { ...st, sessions: st.sessions.map((x) => (x.id === st.current ? { ...x, ...patch } : x)) } : st));
  }, []);
  const select = useCallback((id: string) => setStore((st) => (st ? { ...st, current: id } : st)), []);
  const add = useCallback((s: Session) => setStore((st) => (st ? { ...st, sessions: [...st.sessions, s], current: s.id } : st)), []);
  const duplicate = useCallback(() => {
    setStore((st) => {
      if (!st) return st;
      const cur = st.sessions.find((x) => x.id === st.current);
      if (!cur) return st;
      const copy = { ...cur, id: newId(), name: `${cur.name} (copy)`, date: today() };
      return { ...st, sessions: [...st.sessions, copy], current: copy.id };
    });
  }, []);
  const remove = useCallback((id: string) => {
    setStore((st) => {
      if (!st) return st;
      let sessions = st.sessions.filter((x) => x.id !== id);
      if (!sessions.length) sessions = [newSession("even", "My first session")];
      return { ...st, sessions, current: sessions.some((x) => x.id === st.current) ? st.current : sessions[sessions.length - 1].id };
    });
  }, []);
  const setOnboarded = useCallback((v: boolean) => setStore((st) => (st ? { ...st, onboarded: v } : st)), []);

  const exportJson = useCallback(
    () => JSON.stringify({ app: "midstance", version: 1, exported: new Date().toISOString(), sessions: store?.sessions ?? [] }, null, 2),
    [store],
  );
  const importJson = useCallback((text: string): ImportResult => {
    let j: unknown;
    try {
      j = JSON.parse(text);
    } catch {
      return { ok: false, error: "That file isn't JSON." };
    }
    const list: unknown[] = Array.isArray(j) ? j : j && typeof j === "object" && Array.isArray((j as { sessions?: unknown[] }).sessions) ? (j as { sessions: unknown[] }).sessions : j && typeof j === "object" ? [j] : [];
    const valid = list.filter((x) => x && typeof x === "object" && "cadence" in (x as object)) as Partial<Session>[];
    if (!valid.length) return { ok: false, error: "No Midstance sessions in that file." };
    setStore((st) => {
      if (!st) return st;
      const ids = new Set(st.sessions.map((x) => x.id));
      const incoming = valid.map((x) => {
        const s = sanitize(x, newSession());
        if (ids.has(s.id)) s.id = newId();
        ids.add(s.id);
        return s;
      });
      return { ...st, sessions: [...st.sessions, ...incoming], current: incoming[0].id };
    });
    return { ok: true, count: valid.length };
  }, []);

  return { ready: !!store, sessions: store?.sessions ?? [], current, onboarded: store?.onboarded ?? true, update, select, add, duplicate, remove, setOnboarded, exportJson, importJson };
}

/** Provides the session a group of views draws, and keeps the runner's stride time in step with its cadence. */
export function SessionScope({ session, live, children }: { session: Session; live: boolean; children: React.ReactNode }) {
  setCycle(cycleFor(session), nowT());
  const value = useMemo(() => ({ session, live }), [session, live]);
  return <SessionCtx.Provider value={value}>{children}</SessionCtx.Provider>;
}
