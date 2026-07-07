// GSAP loader for the marketing pages. Loads GSAP core + ScrollTrigger from
// the cdnjs CDN on demand (once, cached), registers the plugin, and resolves
// to the gsap instance, or null if the CDN is unreachable, so callers can
// fall back to the static page. Also exports the prefers-reduced-motion
// check callers use to skip animation (and the ~40KB download) entirely.

const GSAP_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/gsap.min.js';
const SCROLLTRIGGER_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.12.5/ScrollTrigger.min.js';

let gsapPromise = null;

function loadScript(src) {
  return new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = src;
    script.async = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error(`Failed to load ${src}`));
    document.head.appendChild(script);
  });
}

export function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    typeof window.matchMedia === 'function' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  );
}

export function loadMarketingGsap() {
  if (typeof document === 'undefined') return Promise.resolve(null);
  if (!gsapPromise) {
    gsapPromise = loadScript(GSAP_SRC)
      .then(() => loadScript(SCROLLTRIGGER_SRC))
      .then(() => {
        window.gsap.registerPlugin(window.ScrollTrigger);
        return window.gsap;
      })
      .catch(() => {
        gsapPromise = null; // allow a retry on a later navigation
        return null;
      });
  }
  return gsapPromise;
}
