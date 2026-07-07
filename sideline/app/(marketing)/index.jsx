// Marketing homepage (/): hero with a live cycling demo of the note card
// (voice notes type out and organize themselves), how-it-works, an editorial
// "built for the sideline" band, and the founders section. Statically
// rendered for SEO; the web app lives at /app.
import Head from 'expo-router/head';
import { useEffect, useRef, useState } from 'react';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import { loadMarketingGsap, prefersReducedMotion } from '@/lib/marketingGsap';
import { SITE_URL, CONTACT_EMAIL } from './_layout';

const TITLE = 'Sideline: Voice-first coaching notes for volleyball coaches';
const DESCRIPTION =
  'Sideline turns a coach’s five-second voice notes into structured, searchable feedback, organized by player, skill, and priority. Record during the game, review before practice.';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Sideline',
  applicationCategory: 'SportsApplication',
  operatingSystem: 'iOS, Android, Web',
  url: SITE_URL,
  description: DESCRIPTION,
  creator: {
    '@type': 'Organization',
    name: 'Sideline',
    email: CONTACT_EMAIL,
  },
};

// The rotating demo: real observations a coach would actually say
const DEMO_NOTES = [
  {
    quote: 'Block closing late on the outside',
    time: '0:04',
    player: '#7 (Sarah K.)',
    skill: 'Block timing',
    priority: 'High',
    game: 'vs. Ridge, Set 2',
  },
  {
    quote: 'Libero drifting too deep in serve receive',
    time: '0:05',
    player: '#12 (Maya R.)',
    skill: 'Serve-receive positioning',
    priority: 'Medium',
    game: 'vs. Metuchen, Set 1',
  },
  {
    quote: 'Setter tempo too fast on outside sets',
    time: '0:03',
    player: '#4 (Priya S.)',
    skill: 'Set tempo',
    priority: 'High',
    game: 'Tuesday practice',
  },
];

function MicIcon({ live }) {
  return (
    <svg className={live ? 'mk-mic mk-mic-live' : 'mk-mic'} width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function EarIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4 12h2" />
      <path d="M4 8h4" />
      <path d="M4 16h4" />
      <path d="M12 4c3.9 0 7 3 7 6.5 0 2.8-2 3.9-2 6a3.5 3.5 0 0 1-6.9.8" />
      <path d="M12.5 8a3 3 0 0 1 3 3c0 1.6-1.3 2.1-1.3 3.5" />
    </svg>
  );
}

function ClipboardIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3" />
    </svg>
  );
}

function BigMicIcon() {
  return (
    <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

// The hero's one flourish: a single line tracing a serve trajectory. A slow
// toss rising from the left, a peak past midcourt, then a steep, fast spike
// down on the right. GSAP draws it on load (see the effect in MarketingHome);
// it renders fully drawn for crawlers, no-JS visitors, and anyone with
// reduced motion enabled.
function ServeArc() {
  return (
    <svg className="mk-serve-arc" viewBox="0 0 440 150" fill="none" aria-hidden="true">
      <path
        className="mk-serve-arc-path"
        d="M8 132 C 72 92, 150 34, 252 20 C 286 15, 312 22, 326 38 L 360 142"
        stroke="#75975e"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}

// Flat volleyball spiker silhouette, sports-pictogram style: thick
// round-capped strokes for the limbs, filled circles for head and ball.
// Sits behind the hero at 10% opacity as background texture.
function SpikerSilhouette() {
  return (
    <svg className="mk-hero-spiker" viewBox="0 0 220 260" fill="none" aria-hidden="true">
      <g stroke="#75975e" strokeLinecap="round" fill="none">
        <path d="M102 78 C 110 98, 108 118, 100 136" strokeWidth="22" />
        <path d="M105 84 C 118 74, 134 58, 150 42" strokeWidth="14" />
        <path d="M98 86 C 86 88, 74 80, 70 64" strokeWidth="13" />
        <path d="M100 134 C 114 152, 118 168, 108 184 C 100 196, 88 202, 78 204" strokeWidth="16" />
        <path d="M97 136 C 90 160, 88 180, 98 196 C 104 205, 112 210, 120 213" strokeWidth="16" />
      </g>
      <circle cx="100" cy="58" r="14" fill="#75975e" />
      <circle cx="166" cy="26" r="13" fill="#75975e" />
    </svg>
  );
}

// Half a volleyball court, annotated the way a coach would mark it up:
// cream court with a sage border, player circles with a soft sage fill,
// a dashed coaching arrow, and a faint terracotta drift path. On scroll,
// GSAP drifts the libero circle down that path over 1.5s, acting out the
// observation in the quote. Static (undrifted) for reduced motion and no-JS.
function CourtSketch() {
  const svgRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || prefersReducedMotion()) return undefined;
    const svg = svgRef.current;
    const libero = svg?.querySelector('.mk-court-libero');
    if (!libero) return undefined;

    let trigger;
    let tween;
    let cancelled = false;
    loadMarketingGsap().then((gsap) => {
      if (cancelled || !gsap) return;
      trigger = window.ScrollTrigger.create({
        trigger: svg,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          tween = gsap.to(libero, { x: -8, y: 40, duration: 1.5, ease: 'power1.inOut' });
        },
      });
    });
    return () => {
      cancelled = true;
      if (trigger) trigger.kill();
      if (tween) tween.kill();
    };
  }, []);

  return (
    <svg ref={svgRef} className="mk-court" viewBox="0 0 380 330" fill="none" role="img" aria-label="Diagram of a volleyball court with a coaching note about the libero drifting too deep">
      <rect x="40" y="26" width="300" height="232" rx="4" fill="#f5f3ee" stroke="#75975e" strokeWidth="1.5" />
      <line x1="40" y1="26" x2="340" y2="26" stroke="#4a6340" strokeWidth="3" strokeLinecap="round" />
      <line x1="40" y1="102" x2="340" y2="102" stroke="#75975e" strokeWidth="1.2" strokeDasharray="7 7" strokeLinecap="round" opacity="0.5" />
      <circle cx="232" cy="150" r="11" fill="#75975e" fillOpacity="0.2" stroke="#c9c4b6" strokeWidth="1.5" />
      <circle cx="292" cy="204" r="11" fill="#75975e" fillOpacity="0.2" stroke="#c9c4b6" strokeWidth="1.5" />
      <path d="M120 172 C 122 156, 128 142, 138 130" stroke="#75975e" strokeWidth="1.8" strokeDasharray="5 7" strokeLinecap="round" fill="none" />
      <path d="M138 130 l -8 1.5 M138 130 l -2.5 7.5" stroke="#75975e" strokeWidth="1.8" strokeLinecap="round" />
      <path d="M120 200 C 119 214, 116 226, 112 236" stroke="#C4785B" strokeWidth="1.6" strokeDasharray="1.5 6" strokeLinecap="round" opacity="0.4" fill="none" />
      <circle className="mk-court-libero" cx="120" cy="188" r="11" fill="#75975e" fillOpacity="0.2" stroke="#75975e" strokeWidth="1.8" />
      <text x="40" y="314" fill="#565650" fontFamily="'Source Serif 4', Georgia, serif" fontStyle="italic" fontSize="17">
        &ldquo;libero drifting too deep&rdquo;
      </text>
    </svg>
  );
}

// The signature moment: a note card that demos the app. Voice notes type out
// like a live transcription, then the structured fields assemble themselves.
// Statically rendered fully-formed (first note) so crawlers and no-JS
// visitors see a complete card; cycling starts after hydration.
function NoteCardDemo() {
  const [idx, setIdx] = useState(0);
  const [charCount, setCharCount] = useState(DEMO_NOTES[0].quote.length);
  const [cycling, setCycling] = useState(false);
  const note = DEMO_NOTES[idx];
  const typing = charCount < note.quote.length;

  // Hold the first card for a beat after load, then start the loop
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return undefined;
    const t = setTimeout(() => setCycling(true), 4200);
    return () => clearTimeout(t);
  }, []);

  // Type the quote out character by character
  useEffect(() => {
    if (!cycling) return undefined;
    setCharCount(0);
    const iv = setInterval(() => {
      setCharCount((c) => {
        if (c >= DEMO_NOTES[idx].quote.length) {
          clearInterval(iv);
          return c;
        }
        return c + 1;
      });
    }, 42);
    return () => clearInterval(iv);
  }, [idx, cycling]);

  // Once fully typed, hold, then move to the next note
  useEffect(() => {
    if (!cycling || typing) return undefined;
    const t = setTimeout(() => setIdx((i) => (i + 1) % DEMO_NOTES.length), 4600);
    return () => clearTimeout(t);
  }, [cycling, typing, idx]);

  const shownQuote = cycling ? note.quote.slice(0, charCount) : note.quote;

  return (
    <div>
      <figure className="mk-notecard" aria-label="Live example of voice notes turning into structured coaching notes">
        <div className="mk-notecard-quote mk-rise">
          <MicIcon live={cycling && typing} />
          <div>
            <p className="mk-notecard-quote-text">
              &ldquo;{shownQuote}
              {cycling && typing ? <span className="mk-caret" aria-hidden="true" /> : <>&rdquo;</>}
            </p>
            <p className="mk-notecard-time">
              {cycling && typing ? 'Listening…' : `Voice note · ${note.time}`}
            </p>
          </div>
        </div>
        <div className="mk-notecard-flow mk-rise mk-rise-1" aria-hidden="true">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 4v16" /><path d="M6 14l6 6 6-6" />
          </svg>
        </div>
        {cycling && typing ? (
          <div className="mk-notecard-rows mk-notecard-rows-pending" aria-hidden="true">
            <div className="mk-notecard-row"><span className="mk-notecard-label">Player</span><span className="mk-skeleton" /></div>
            <div className="mk-notecard-row"><span className="mk-notecard-label">Skill</span><span className="mk-skeleton mk-skeleton-w2" /></div>
            <div className="mk-notecard-row"><span className="mk-notecard-label">Priority</span><span className="mk-skeleton mk-skeleton-w3" /></div>
            <div className="mk-notecard-row"><span className="mk-notecard-label">Game</span><span className="mk-skeleton mk-skeleton-w2" /></div>
          </div>
        ) : (
          <div className="mk-notecard-rows" key={`${idx}-${cycling}`}>
            <div className="mk-notecard-row mk-rise mk-rise-2">
              <span className="mk-notecard-label">Player</span>
              <span className="mk-notecard-value">{note.player}</span>
            </div>
            <div className="mk-notecard-row mk-rise mk-rise-3">
              <span className="mk-notecard-label">Skill</span>
              <span className="mk-notecard-value">{note.skill}</span>
            </div>
            <div className="mk-notecard-row mk-rise mk-rise-4">
              <span className="mk-notecard-label">Priority</span>
              <span className="mk-notecard-value">
                <span className={note.priority === 'High' ? 'mk-badge-high' : 'mk-badge-med'}>{note.priority}</span>
              </span>
            </div>
            <div className="mk-notecard-row mk-rise mk-rise-5">
              <span className="mk-notecard-label">Game</span>
              <span className="mk-notecard-value">{note.game}</span>
            </div>
          </div>
        )}
      </figure>
      <div className="mk-notecard-foot mk-rise mk-rise-6">
        <p className="mk-notecard-caption">A five-second voice note, organized before the set ends.</p>
        <div className="mk-dots" role="tablist" aria-label="Example notes">
          {DEMO_NOTES.map((n, i) => (
            <button
              key={n.quote}
              type="button"
              className={i === idx ? 'mk-dot mk-dot-on' : 'mk-dot'}
              aria-label={`Show example ${i + 1}`}
              onClick={() => {
                setCycling(true);
                if (i !== idx) setIdx(i);
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

// The note a coach's voice becomes in the voice-to-note morph below.
const WAVE_NOTE = {
  quote: 'Maya’s toss is drifting left on her jump serve.',
  player: '#12 (Maya R.)',
  skill: 'Serve toss consistency',
  priority: 'Medium',
};

// Builds the voice-to-note timeline: the six bars oscillate like a live
// waveform for ~1s, then the outer four reshape into the card's frame (the
// two at the edges stretch into the side borders; two rotate 90° into the
// top and bottom) while the middle pair fades. The real card crossfades in
// underneath. Transforms and opacity only; no layout, no canvas.
function buildWaveTimeline(gsap, card, bars) {
  const cardRect = card.getBoundingClientRect();
  const rects = bars.map((b) => b.getBoundingClientRect());
  const barW = rects[0].width;
  const barH = rects[0].height;
  // GSAP x/y are deltas from each bar's resting center to a border midpoint.
  const moveTo = (i, targetX, targetY) => ({
    x: targetX - (rects[i].left + rects[i].right) / 2,
    y: targetY - (rects[i].top + rects[i].bottom) / 2,
  });
  const midX = cardRect.left + cardRect.width / 2;
  const midY = cardRect.top + cardRect.height / 2;
  const frame = {
    left: { ...moveTo(0, cardRect.left + barW / 2, midY), rotation: 0, scaleY: cardRect.height / barH },
    top: { ...moveTo(1, midX, cardRect.top + barW / 2), rotation: 90, scaleY: cardRect.width / barH },
    bottom: { ...moveTo(4, midX, cardRect.bottom - barW / 2), rotation: 90, scaleY: cardRect.width / barH },
    right: { ...moveTo(5, cardRect.right - barW / 2, midY), rotation: 0, scaleY: cardRect.height / barH },
  };

  const tl = gsap.timeline({ defaults: { transformOrigin: '50% 50%' } });
  // ~1s of "listening": each bar re-rolls a random height every beat
  tl.to(bars, {
    scaleY: 'random(0.3, 2.3)',
    duration: 0.14,
    ease: 'sine.inOut',
    repeat: 6,
    repeatRefresh: true,
    stagger: { each: 0.02, from: 'random' },
  });
  tl.to(bars, { scaleY: 1, duration: 0.16, ease: 'sine.out' });
  // the waveform becomes the card frame
  tl.add('morph');
  tl.to(bars[0], { ...frame.left, duration: 0.6, ease: 'power3.inOut' }, 'morph');
  tl.to(bars[1], { ...frame.top, duration: 0.6, ease: 'power3.inOut' }, 'morph');
  tl.to(bars[4], { ...frame.bottom, duration: 0.6, ease: 'power3.inOut' }, 'morph');
  tl.to(bars[5], { ...frame.right, duration: 0.6, ease: 'power3.inOut' }, 'morph');
  tl.to([bars[2], bars[3]], { scaleY: 0.2, opacity: 0, duration: 0.3, ease: 'power2.in' }, 'morph');
  // the frame hands off to the real card
  tl.to(card, { opacity: 1, duration: 0.45, ease: 'power1.out' }, 'morph+=0.45');
  tl.fromTo(
    card.querySelectorAll('.mk-wavecard-quote, .mk-notecard-row'),
    { opacity: 0, y: 6 },
    { opacity: 1, y: 0, duration: 0.35, ease: 'power2.out', stagger: 0.06 },
    'morph+=0.5'
  );
  tl.to(bars, { opacity: 0, duration: 0.3, ease: 'power1.out' }, 'morph+=0.6');
  return tl;
}

// The "how it works" moment: a sound waveform that collapses into the
// structured note card when scrolled into view (GSAP ScrollTrigger, once).
// Statically rendered as the finished card; the bars only appear after JS
// arms the animation, so crawlers, no-JS visitors, and reduced-motion users
// always see the complete card.
function WaveToNote() {
  const rootRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || prefersReducedMotion()) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;
    const card = root.querySelector('.mk-wavecard-card');
    const bars = Array.from(root.querySelectorAll('.mk-wavecard-bar'));
    if (!card || bars.length === 0) return undefined;

    let trigger;
    let tl;
    let cancelled = false;
    root.classList.add('is-armed');
    loadMarketingGsap().then((gsap) => {
      if (cancelled) return;
      if (!gsap) {
        root.classList.remove('is-armed'); // CDN failed; show the static card
        return;
      }
      trigger = window.ScrollTrigger.create({
        trigger: root,
        start: 'top 75%',
        once: true,
        onEnter: () => {
          tl = buildWaveTimeline(gsap, card, bars);
        },
      });
    });
    return () => {
      cancelled = true;
      if (trigger) trigger.kill();
      if (tl) tl.kill();
      root.classList.remove('is-armed');
    };
  }, []);

  return (
    <div className="mk-wavecard" ref={rootRef}>
      <div className="mk-wavecard-stage">
        <div className="mk-wavecard-bars" aria-hidden="true">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <span key={i} className="mk-wavecard-bar" />
          ))}
        </div>
        <figure className="mk-wavecard-card" aria-label="A five-second voice note shown as the structured note it becomes">
          <p className="mk-wavecard-quote">&ldquo;{WAVE_NOTE.quote}&rdquo;</p>
          <div className="mk-wavecard-rows">
            <div className="mk-notecard-row">
              <span className="mk-notecard-label">Player</span>
              <span className="mk-notecard-value">{WAVE_NOTE.player}</span>
            </div>
            <div className="mk-notecard-row">
              <span className="mk-notecard-label">Skill</span>
              <span className="mk-notecard-value">{WAVE_NOTE.skill}</span>
            </div>
            <div className="mk-notecard-row">
              <span className="mk-notecard-label">Priority</span>
              <span className="mk-notecard-value"><span className="mk-badge-med">{WAVE_NOTE.priority}</span></span>
            </div>
          </div>
        </figure>
      </div>
      <p className="mk-wavecard-caption">Said out loud during a rally. Filed before the next one.</p>
    </div>
  );
}

export default function MarketingHome() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;
  const heroRef = useRef(null);

  // Hero load animation: the serve-trajectory line draws itself over 1.5s,
  // then the headline fades in. The static (fully drawn, fully visible)
  // state is never touched until GSAP has actually loaded, so crawlers,
  // no-JS visitors, reduced-motion users, and anyone on a connection where
  // the CDN is slow or blocked always see a complete hero.
  useEffect(() => {
    if (Platform.OS !== 'web' || prefersReducedMotion()) return undefined;
    const hero = heroRef.current;
    const path = hero?.querySelector('.mk-serve-arc-path');
    const headline = hero?.querySelector('h1');
    if (!path || !headline) return undefined;

    let tl;
    let cancelled = false;
    loadMarketingGsap().then((gsap) => {
      if (cancelled || !gsap) return;
      const length = path.getTotalLength();
      tl = gsap.timeline();
      tl.set(path, { strokeDasharray: length, strokeDashoffset: length });
      tl.to(path, { strokeDashoffset: 0, duration: 1.5, ease: 'power1.inOut' });
      tl.fromTo(headline, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.6, ease: 'power2.out' }, '-=0.05');
    });
    return () => {
      cancelled = true;
      if (tl) tl.kill();
      path.style.strokeDasharray = '';
      path.style.strokeDashoffset = '';
      headline.style.opacity = '';
      headline.style.transform = '';
    };
  }, []);

  if (Platform.OS !== 'web') return null;

  return (
    <main>
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Sideline" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Head>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      {/* hero */}
      <section className="mk-hero" ref={heroRef}>
        <SpikerSilhouette />
        <div className="mk-container mk-hero-grid">
          <div>
            <ServeArc />
            <p className="mk-eyebrow">Voice-first coaching notes</p>
            <h1>Remember everything you noticed during the game.</h1>
            <p className="mk-hero-sub">
              Sideline records your voice notes and turns them into structured, searchable
              feedback. Organized by player, by skill, by game.
            </p>
            <a className="mk-btn mk-btn-lg" href="/app">{signedIn ? 'Open Sideline' : 'Start recording'}</a>
            <p className="mk-hero-cta-note">
              {signedIn ? 'You’re signed in. Pick up where you left off.' : 'For boys’ and girls’ teams. No clipboard. No typing. Just say what you saw.'}
            </p>
          </div>
          <NoteCardDemo />
        </div>
      </section>

      {/* how it works */}
      <section className="mk-section" id="how-it-works" style={{ paddingTop: 0 }}>
        <div className="mk-container">
          <p className="mk-eyebrow">How it works</p>
          <h2 className="mk-section-title">Three moments. None of them involve a keyboard.</h2>
          <p className="mk-section-sub">
            Sideline is built around the way coaching actually happens: fast, out loud, and
            in the middle of everything else.
          </p>

          <div className="mk-moments">
            <div className="mk-moment">
              <BigMicIcon />
              <h3>Tap and talk.</h3>
              <p>
                During a timeout, between sets, on the bus home. Just say what you noticed,
                the way you&rsquo;d say it to an assistant.
              </p>
              <p className="mk-moment-example">&ldquo;Maya&rsquo;s toss is drifting left on her jump serve.&rdquo;</p>
            </div>
            <div className="mk-moment">
              <EarIcon />
              <h3>Sideline listens.</h3>
              <p>
                Your note is transcribed and organized by player, skill area, and priority,
                while the rally is still going. No typing, no tagging, no dropdown menus.
              </p>
              <p className="mk-moment-example">#12 · Serve toss consistency · Medium</p>
            </div>
            <div className="mk-moment">
              <ClipboardIcon />
              <h3>Review before practice.</h3>
              <p>
                Pull up everything from last Tuesday&rsquo;s game, grouped by player and skill.
                Walk into the gym knowing exactly what to work on.
              </p>
              <p className="mk-moment-example">Tuesday vs. Ridge: six notes on serve receive. Start there.</p>
            </div>
          </div>

          <WaveToNote />
        </div>
      </section>

      {/* built for the sideline */}
      <section className="mk-band mk-section">
        <div className="mk-container">
          <p className="mk-eyebrow">Built for the sideline</p>
          <p className="mk-band-text">
            You just noticed your setter&rsquo;s tempo is off, but the next rally is already
            starting. With Sideline, you tap, talk for five seconds, and get back to coaching.
            Your observation is saved, transcribed, and organized <em>before the set ends</em>,
            not scribbled on a clipboard you&rsquo;ll never decode, not lost by the third rotation.
          </p>
        </div>
      </section>

      {/* founders */}
      <section className="mk-section">
        <div className="mk-container mk-founders-grid">
          <div>
            <p className="mk-eyebrow">Who&rsquo;s building this</p>
            <h2 className="mk-section-title">We&rsquo;re Sid and Ishan.</h2>
            <p className="mk-section-sub">
              We build tools that reduce the cognitive workload of coaches. During live play,
              coaches notice dozens of things they need to remember, and most of those
              observations disappear before practice the next day. Sideline captures them
              in the moment so nothing gets lost.
            </p>
            <p className="mk-founders-note">
              We&rsquo;re looking for our first ten volleyball coaches to try Sideline this
              season, boys&rsquo; and girls&rsquo; programs alike. If that&rsquo;s you,{' '}
              <a className="mk-link-underline" href={`mailto:${CONTACT_EMAIL}`}>email us</a>.
              We&rsquo;ll set you up, and we&rsquo;ll actually read your feedback.
            </p>
          </div>
          <CourtSketch />
        </div>
      </section>
    </main>
  );
}
