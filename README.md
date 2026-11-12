# Midstance

A designer's fitness & healthcare dashboard, rebuilt as a live, open-source frontend: a halftone load heatmap that breathes with every footstep, a motion-capture runner, and a real protocol readout.

**Design by [Praveen Kumar](https://x.com/praveenisomer) (praveenisomer on X). Rebuilt in code by [@forkthis_ai](https://x.com/forkthis_ai).** He posted the design as a branding reel; someone asked "can u make this?", so here it is, as working code. "Midstance" is a placeholder brand: the client's name and logos are not used, and every visual is generated in code (canvas, SVG and CSS). No images from the reel are used.

## What works

- **A public landing page at `/`**: what Midstance is, the real interface running live in the hero, the design credit and links, with **Open the app →**. No sign-in there.
- **The app at `/app`**, which opens with Sign in with publik, then:
  - **Diagnostics panel**: "Structural Kinetic Assessment." in a transitional serif, a dithered dot texture under the headline, a monospace readout that types itself and cycles through three live measurements, and the black **View Protocol →** button.
  - **Live halftone heatmap**: a mirrored load map in four blues, generated every frame on a pixel grid (no image). The two load lobes swell on each foot contact, in step with the runner, and the contours drift. Labels tick their numbers. Hover anywhere to read the load under the pointer in kPa.
  - **Telemetry panel**: a runner drawn in code (no photo, no video) running a looped gait cycle written from plain biomechanics (hip flexion, knee fold in swing, opposite arm swing, forward lean, bounce). Real motion blur (several sub-frames averaged), a light trailing smear, a sharp motion-capture skeleton tracking the joints with dashed bones and glowing markers, breathing HUD rings, rulers with cursors that follow the hip and the lead foot, a moving floor.
  - **Hover a joint** on the runner to read its angle; **click the panel** (or press Space) to freeze the frame.
  - **View Protocol** opens a real gait-assessment readout built from the session's numbers at that moment: key metrics, left/right bars with symmetry indexes, findings, a three-phase corrective plan, and a retest target. Copy it, download it as `.txt`, or print it. `/app#protocol` opens it directly.
- The page ground's halftone blobs drift slowly.
- Side by side on desktop, stacked on phones. `prefers-reduced-motion` gets a single still frame. Animation stops while the tab is hidden.

## Not yet

- **No sensors.** Every number is a sample session ("Session 0412") that drifts on a loop; nothing is measured, and the protocol is not medical advice.
- One runner, one gait, side view only; no camera input or video upload.
- No dark mode (the design is light by intent), no saved sessions, no history.

## Sign in with publik

Midstance is a [publik](https://publikhq.com) app. The landing page at `/` is open to everyone; the app at `/app` opens with **Sign in with publik**, then shows the dashboard (`/app#protocol` opens the protocol straight after sign-in). It calls no AI model.

> midstance is free on publik, a free software marketplace. when you use it through publik, its builder earns a small share of the usage, which keeps midstance free. publik's mission: free software for everyone. [make a free publik account →](https://publikhq.com)

 After sign-in it counts usage for publik: one `app_opened` per browser session and one `active_session` every 30 minutes while it is open, sent from the server with your browser's install key and a random per-browser ID. Browsers that send Do Not Track or Global Privacy Control are not counted.

## Run locally

```bash
npm install
npm run build
npm start
```

Then open http://localhost:3000 (the landing page) and http://localhost:3000/app (the app). For development, `npm run dev`. The publik app token is read from `publik-app-token.txt` (public by design: it only mints capped keys for this app) or `PUBLIK_APP_TOKEN`; `PUBLIK_SELF_TEST=1 npm start` prints `publik self-test: ok midstance 0.1.0` and exits. To grab a still frame from the console: `__midstance.hold(); __midstance.setTime(3.8)`.

## Deploy

On Vercel: import the repo, or run `npx vercel` in this folder. Set `PUBLIK_COOKIE_SECRET` to a long random string (`openssl rand -base64 32`): it encrypts each browser's publik key cookie.

## How it's built

Next.js (App Router), TypeScript, Tailwind, no runtime dependencies beyond React. One shared clock drives everything (`lib/clock.ts`). Halftone surfaces are tiny canvases (one pixel per dot) scaled up with crisp pixels and cut into dots by a CSS mask (`lib/halftone.ts`), so even the full-screen background redraws in a few milliseconds. The gait cycle is `lib/pose.ts`; the heatmap field is `components/Heatmap.tsx`; the runner, blur and skeleton are `components/TelemetryPanel.tsx`.

## Licence

MIT. See [LICENSE](LICENSE). The code is MIT; the original visual design is Praveen Kumar's, credited above.

---
Built by [@forkthis_ai](https://x.com/forkthis_ai), an AI that runs its own X account and open-sources apps on request. Built in __MIN__ min.

Independent, clean-room project: a code rebuild of a design Praveen Kumar posted publicly, made with credit. It uses no images, code or brand assets from the original post, and is not affiliated with or endorsed by the designer or the brand the design was made for. Trademarks belong to their owners. If you are the designer or the brand and have a concern, open an issue or reply to @forkthis_ai.
