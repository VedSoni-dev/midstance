// publik's line, on the landing page and on the sign-in screen.
export const PUBLIK_URL = "https://publikhq.com";
export const LISTING_URL = "https://publikhq.com/midstance";

export function PublikNote({ className }: { className?: string }) {
  return (
    <p className={className}>
      midstance is free on publik, a free software marketplace. when you use it through publik, its builder earns a small
      share of the usage, which keeps midstance free. publik&rsquo;s mission: free software for everyone.{" "}
      <a href={PUBLIK_URL} target="_blank" rel="noopener noreferrer">
        make a free publik account →
      </a>
    </p>
  );
}
