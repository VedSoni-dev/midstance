"use client";
// The public front door at /: what Midstance is, the real UI running live, the design credit and the
// way in. No sign-in here; the app at /app opens with Sign in with publik.
import { Backdrop } from "./Backdrop";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import { Mark } from "./Mark";
import { PublikPitch } from "./PublikGate";
import { SAMPLE, SessionScope } from "@/lib/session";

const LISTING_URL = "https://publikhq.com/midstance";

const REPO = "https://github.com/VedSoni-dev/midstance";
const FILM = "https://vedsoni-dev.github.io/midstance/";

const FEATURES: [string, string, string][] = [
  [
    "01",
    "Your numbers in",
    "Load split, cadence, stride length, contact time, knee and hip angles, pelvic drop: from a gait lab, a running watch or a coach. Start from a preset or type your own. Sessions save in your browser and export as JSON.",
  ],
  [
    "02",
    "A live halftone load map",
    "A mirrored map in four blues, computed every frame on a pixel grid. Each lobe grows with that foot's share of the load and pulses on contact for as long as your contact time. Hover it to read the load.",
  ],
  [
    "03",
    "A runner on your angles",
    "No photo, no video: a gait cycle drawn in code from your knee fold, hip swing, bounce and cadence, with real motion blur and a dashed motion-capture skeleton. Hover a joint for its angle.",
  ],
  [
    "04",
    "A protocol from your data",
    "View Protocol turns your numbers into findings, left/right symmetry and a three-phase plan aimed at the side they point to. Copy it, download it or print it, then retest in two weeks.",
  ],
];

export function Landing() {
  return (
    <div className="landing">
      <Backdrop />
      <header className="topbar lp-top">
        <a className="brand" href="/">
          <Mark />
          Midstance
        </a>
        <nav className="lp-nav" aria-label="Links">
          <a href={REPO} target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href={LISTING_URL} target="_blank" rel="noopener noreferrer">
            publik
          </a>
          <a className="lp-btn lp-btn-sm" href="/app">
            Open the app <span aria-hidden>→</span>
          </a>
        </nav>
      </header>

      <main>
        <section className="lp-hero">
          <div className="lp-copy">
            <p className="lp-eyebrow">
              <span className="dot-ring" aria-hidden />
              Free &amp; open source · on publik
            </p>
            <h1 className="lp-title">
              The gait-lab dashboard,
              <br />
              alive.
            </h1>
            <p className="lp-lede">
              Midstance is an open-source rebuild of a fitness &amp; healthcare dashboard designed by Praveen Kumar, made into a
              gait-assessment workspace. Enter your running numbers and the halftone load map, the motion-capture runner and your
              protocol all redraw from them.
            </p>
            <div className="lp-actions">
              <a className="lp-btn" href="/app">
                Open the app <span aria-hidden>→</span>
              </a>
              <a className="lp-btn lp-ghost" href={REPO} target="_blank" rel="noopener noreferrer">
                Source on GitHub
              </a>
            </div>
            <p className="lp-credit">
              Design by{" "}
              <a href="https://x.com/praveenisomer" target="_blank" rel="noopener noreferrer">
                Praveen Kumar
              </a>{" "}
              (praveenisomer on X). Rebuilt in code by{" "}
              <a href="https://x.com/forkthis_ai" target="_blank" rel="noopener noreferrer">
                @forkthis_ai
              </a>
              .
            </p>
          </div>
          <div className="lp-stage" aria-label="The real Midstance interface, running live on a sample session">
            <SessionScope session={SAMPLE} live>
              <DiagnosticsPanel titleAs="h2" onOpen={() => window.location.assign("/app")} />
              <TelemetryPanel />
            </SessionScope>
            <p className="lp-caption">Live, on a sample session. In the app it runs on yours.</p>
          </div>
        </section>

        <div className="lp-body">
        <section className="lp-features" aria-labelledby="lp-inside">
          <h2 id="lp-inside" className="lp-h2">
            What&rsquo;s inside
          </h2>
          <ol className="lp-grid">
            {FEATURES.map(([n, title, body]) => (
              <li key={n}>
                <span className="lp-n">{n}</span>
                <h3>{title}</h3>
                <p>{body}</p>
              </li>
            ))}
          </ol>
        </section>

        <section className="lp-publik" aria-labelledby="lp-free">
          <div>
            <h2 id="lp-free" className="lp-h2">
              Free, because of publik
            </h2>
            <PublikPitch appName="Midstance" className="lp-publik-note" />
          </div>
          <a className="lp-btn" href="/app">
            Open the app <span aria-hidden>→</span>
          </a>
        </section>

        <section className="lp-about" aria-labelledby="lp-credit-h">
          <h2 id="lp-credit-h" className="lp-h2">
            Credit
          </h2>
          <p>
            The visual design is Praveen Kumar&rsquo;s, posted as a branding reel for a fitness &amp; healthcare brand. Someone
            asked &ldquo;can u make this?&rdquo;, so @forkthis_ai built it as real, working code. &ldquo;Midstance&rdquo; is a
            placeholder brand: the client&rsquo;s name and logos are not used, no images from the original post are used, and every
            visual here is generated in code (canvas, SVG and CSS). Midstance visualises the numbers you enter; it is not a
            medical device, and the protocol is not medical advice.
          </p>
          <p className="lp-links">
            <a href="/app">Open the app</a>
            <a href={LISTING_URL} target="_blank" rel="noopener noreferrer">
              publik listing
            </a>
            <a href={REPO} target="_blank" rel="noopener noreferrer">
              Source (MIT)
            </a>
            <a href={FILM} target="_blank" rel="noopener noreferrer">
              The film &amp; receipts
            </a>
          </p>
        </section>

        <footer className="credit lp-foot">
          <span>Free &amp; open source (MIT). Built by @forkthis_ai, an AI that open-sources software on request.</span>
          <span>Not affiliated with the designer or the brand the design was made for.</span>
        </footer>
        </div>
      </main>
    </div>
  );
}
