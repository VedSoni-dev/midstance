"use client";
// The person's numbers. Every change redraws the heatmap, the runner and the protocol at once.
import { useEffect, useId, useState } from "react";
import { LIMITS, type NumKey, type Session } from "@/lib/session";

function NumField({ k, value, onChange, unit, label }: { k: NumKey; value: number; onChange: (v: number) => void; unit: string; label: string }) {
  const [lo, hi, step] = LIMITS[k];
  const [text, setText] = useState(String(value));
  const [focused, setFocused] = useState(false);
  useEffect(() => {
    if (!focused) setText(String(value));
  }, [value, focused]);
  return (
    <span className="num">
      <input
        type="number"
        inputMode="decimal"
        aria-label={label}
        min={lo}
        max={hi}
        step={step}
        value={text}
        onFocus={() => setFocused(true)}
        onChange={(e) => {
          setText(e.target.value);
          const n = parseFloat(e.target.value);
          if (Number.isFinite(n)) onChange(n);
        }}
        onBlur={() => {
          setFocused(false);
          const n = parseFloat(text);
          const c = Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : value;
          const r = Math.round(c / step) * step;
          const v = Number(r.toFixed(3));
          onChange(v);
          setText(String(v));
        }}
      />
      <span className="num-unit">{unit}</span>
    </span>
  );
}

function Slider({ k, value, onChange, label, unit, display, hint }: { k: NumKey; value: number; onChange: (v: number) => void; label: string; unit: string; display?: string; hint?: string }) {
  const [lo, hi, step] = LIMITS[k];
  const id = useId();
  return (
    <div className="ed-row">
      <div className="ed-head">
        <label htmlFor={id}>{label}</label>
        {display ? <span className="ed-val">{display}</span> : <NumField k={k} value={value} onChange={onChange} unit={unit} label={label} />}
      </div>
      <input id={id} className="ed-range" type="range" min={lo} max={hi} step={step} value={Math.min(hi, Math.max(lo, value))} onChange={(e) => onChange(parseFloat(e.target.value))} />
      {hint && <p className="ed-hint">{hint}</p>}
    </div>
  );
}

function Pair({ l, r, s, update, label, unit, hint }: { l: NumKey; r: NumKey; s: Session; update: (p: Partial<Session>) => void; label: string; unit: string; hint?: string }) {
  return (
    <div className="ed-row ed-pair">
      <div className="ed-head">
        <span className="ed-label">{label}</span>
      </div>
      <div className="ed-lr">
        <span className="ed-side">L</span>
        <NumField k={l} value={s[l]} onChange={(v) => update({ [l]: v })} unit={unit} label={`${label}, left`} />
        <span className="ed-side">R</span>
        <NumField k={r} value={s[r]} onChange={(v) => update({ [r]: v })} unit={unit} label={`${label}, right`} />
      </div>
      {hint && <p className="ed-hint">{hint}</p>}
    </div>
  );
}

export function SessionEditor({ session: s, update }: { session: Session; update: (p: Partial<Session>) => void }) {
  const loadR = 100 - s.loadL;
  return (
    <section className="editor" aria-labelledby="ed-title">
      <p className="diag-eyebrow ed-eyebrow">
        <span className="dot-ring" aria-hidden />
        Your session
      </p>
      <h2 id="ed-title" className="sr-only">
        Session numbers
      </h2>
      <input className="ed-name" aria-label="Session name" value={s.name} maxLength={80} onChange={(e) => update({ name: e.target.value })} />
      <input className="ed-date" type="date" aria-label="Session date" value={s.date} onChange={(e) => e.target.value && update({ date: e.target.value })} />

      <p className="ed-where">Numbers from a treadmill gait analysis, a running watch or a coach. Change any of them and watch the map.</p>

      <Slider k="loadL" value={s.loadL} onChange={(v) => update({ loadL: v })} label="Load split" unit="%" display={`L ${s.loadL.toFixed(1)}% · R ${loadR.toFixed(1)}%`} hint="share of total load on each foot" />
      <Slider k="cadence" value={s.cadence} onChange={(v) => update({ cadence: v })} label="Cadence" unit="spm" />
      <Slider k="strideLength" value={s.strideLength} onChange={(v) => update({ strideLength: v })} label="Stride length" unit="m" hint="foot strike to the next foot strike, as watches report it" />
      <Pair l="contactL" r="contactR" s={s} update={update} label="Ground contact" unit="ms" />
      <Pair l="kneeL" r="kneeR" s={s} update={update} label="Peak knee flexion" unit="°" hint="the deepest knee bend in swing" />
      <Pair l="hipL" r="hipR" s={s} update={update} label="Hip range of motion" unit="°" hint="flexion plus extension over a stride" />
      <Pair l="pelvicDropL" r="pelvicDropR" s={s} update={update} label="Pelvic drop" unit="°" hint="hip drop on the opposite side during each leg's stance" />
      <Slider k="verticalOsc" value={s.verticalOsc} onChange={(v) => update({ verticalOsc: v })} label="Vertical oscillation" unit="cm" />

      <label className="ed-notes">
        <span>Notes</span>
        <textarea rows={2} maxLength={2000} placeholder="Treadmill at 12 km/h, new shoes…" value={s.notes} onChange={(e) => update({ notes: e.target.value })} />
      </label>
      <p className="ed-honest">A visualisation of the numbers you enter, not a medical device.</p>
    </section>
  );
}
