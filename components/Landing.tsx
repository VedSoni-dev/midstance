"use client";
// The public front door at /: what Midstance is, the real UI running live, the design credit and the
// way in. No sign-in here; the app at /app opens with Sign in with publik.
import { Backdrop } from "./Backdrop";
import { DiagnosticsPanel } from "./DiagnosticsPanel";
import { TelemetryPanel } from "./TelemetryPanel";
import { Mark } from "./Mark";
import { PublikNote, LISTING_URL } from "./PublikNote";

const REPO = "https://github.com/VedSoni-dev/midstance";
const FILM = "https://vedsoni-dev.github.io/midstance/";

const FEATURES: [string, string, string][] = [
  [
    "01",
    "A live halftone heatmap",
    "A mirrored load map in four blues, computed every frame on a pixel grid. The two lobes swell on each foot contact, in step with the runner. Hover it to read the load in kPa.",
  ],
  [
    "02",
    "A runner drawn in code",
    "No photo, no video: a gait cycle written from biomechanics, real motion blur, and a dashed motion-capture skeleton with glowing markers. Hover a joint for its angle; click to freeze the frame.",
  ],
  [
    "03",
    "A protocol that opens",
    "View Protocol builds a gait readout from the session: left and right symmetry, findings and a three-phase corrective plan. Copy it, download it or print it.",
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
              Midstance is a working, open-source rebuild of a fitness &amp; healthcare dashboard designed by Praveen Kumar. The
              load heatmap is generated live, the runner is drawn in code with a motion-capture skeleton tracking it, and the
              protocol opens for real.
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
          <div className="lp-stage" aria-label="The real Midstance interface, running live">
            <DiagnosticsPanel titleAs="h2" onOpen={() => window.location.assign("/app#protocol")} />
            <TelemetryPanel />
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

        <section className="lp-publik" aria-label="Midstance on publik">
          <PublikNote className="lp-publik-note" />
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
            visual here is generated in code (canvas, SVG and CSS). The numbers are a sample session, not a measurement, and the
            protocol is not medical advice.
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
