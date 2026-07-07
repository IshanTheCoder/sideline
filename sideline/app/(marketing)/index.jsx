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

// The hero background: a volleyball spiker mid-jump (clean silhouette cut
// from the reference art, served from /public). GSAP raises him in from the
// bottom of the hero on load, like he's jumping into frame; the static
// (fully visible) state is untouched until GSAP loads, so crawlers, no-JS
// visitors, and reduced-motion users always see the finished hero.
function HeroPlayer() {
  return (
    <div className="mk-hero-player" aria-hidden="true">
      <img className="mk-hero-player-img" src="/spiker.png" alt="" width="687" height="1068" />
    </div>
  );
}

// The founders-section visual: a libero digging a ball (clean silhouette
// cut from the reference art, served from /public), with the observation a
// coach would say about it as the caption. Fades up once on scroll; static
// for reduced motion and no-JS.
function DigFigure() {
  const rootRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || prefersReducedMotion()) return undefined;
    const root = rootRef.current;
    if (!root) return undefined;

    let trigger;
    let tween;
    let cancelled = false;
    loadMarketingGsap().then((gsap) => {
      if (cancelled || !gsap) return;
      trigger = window.ScrollTrigger.create({
        trigger: root,
        start: 'top 80%',
        once: true,
        onEnter: () => {
          tween = gsap.fromTo(root, { opacity: 0, y: 30 }, { opacity: 1, y: 0, duration: 0.9, ease: 'power2.out' });
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
    <figure ref={rootRef} className="mk-dig">
      <img src="/digger.png" alt="Silhouette of a volleyball player digging a ball" width="504" height="428" />
      <figcaption className="mk-dig-caption">&ldquo;libero drifting too deep&rdquo;</figcaption>
    </figure>
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

// The "how it works" moment: when the card scrolls into view the quote
// settles in first, then the structured fields cascade in one by one, with
// the card lifting into place (GSAP ScrollTrigger, once). Statically
// rendered as the finished card, and only animated once GSAP has actually
// loaded, so crawlers, no-JS visitors, and reduced-motion users always see
// the complete card.
function WaveToNote() {
  const rootRef = useRef(null);

  useEffect(() => {
    if (Platform.OS !== 'web' || prefersReducedMotion()) return undefined;
    const root = rootRef.current;
    const card = root?.querySelector('.mk-wavecard-card');
    if (!card) return undefined;

    let trigger;
    let tl;
    let cancelled = false;
    loadMarketingGsap().then((gsap) => {
      if (cancelled || !gsap) return;
      trigger = window.ScrollTrigger.create({
        trigger: root,
        start: 'top 78%',
        once: true,
        onEnter: () => {
          tl = gsap.timeline();
          tl.fromTo(card, { opacity: 0, y: 26 }, { opacity: 1, y: 0, duration: 0.55, ease: 'power2.out' });
          tl.fromTo(
            card.querySelector('.mk-wavecard-quote'),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' },
            '-=0.2'
          );
          tl.fromTo(
            card.querySelectorAll('.mk-notecard-row'),
            { opacity: 0, y: 10 },
            { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out', stagger: 0.14 },
            '-=0.1'
          );
        },
      });
    });
    return () => {
      cancelled = true;
      if (trigger) trigger.kill();
      if (tl) tl.kill();
    };
  }, []);

  return (
    <div className="mk-wavecard" ref={rootRef}>
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
      <p className="mk-wavecard-caption">Said out loud during a rally. Filed before the next one.</p>
    </div>
  );
}

export default function MarketingHome() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;
  const heroRef = useRef(null);

  // Hero load animation: the background spiker jumps in from the bottom of
  // the hero. The static (fully visible) state is never touched until GSAP
  // has actually loaded, so crawlers, no-JS visitors, reduced-motion users,
  // and anyone on a connection where the CDN is slow or blocked always see
  // a complete hero.
  useEffect(() => {
    if (Platform.OS !== 'web' || prefersReducedMotion()) return undefined;
    const player = heroRef.current?.querySelector('.mk-hero-player-img');
    if (!player) return undefined;

    let tween;
    let cancelled = false;
    loadMarketingGsap().then((gsap) => {
      if (cancelled || !gsap) return;
      tween = gsap.fromTo(
        player,
        { opacity: 0, y: 180 },
        { opacity: 1, y: 0, duration: 1.4, ease: 'power3.out', delay: 0.15 }
      );
    });
    return () => {
      cancelled = true;
      if (tween) tween.kill();
      player.style.opacity = '';
      player.style.transform = '';
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
        <HeroPlayer />
        <div className="mk-container mk-hero-grid">
          <div>
            <p className="mk-eyebrow">Voice-first coaching notes</p>
            <h1>Remember everything you noticed during the game.</h1>
            <p className="mk-hero-sub">
              Sideline turns your five-second voice notes into structured, searchable
              feedback, organized by player, skill, and game.
            </p>
            <a className="mk-btn mk-btn-lg" href="/app">{signedIn ? 'Open Sideline' : 'Start recording'}</a>
            <p className="mk-hero-cta-note">
              {signedIn ? 'You’re signed in. Pick up where you left off.' : 'No clipboard. No typing. Just say what you saw.'}
            </p>
          </div>
          <NoteCardDemo />
        </div>
      </section>

      {/* how it works */}
      <section className="mk-section mk-section-how" id="how-it-works">
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
      <section className="mk-section mk-section-founders">
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
          <DigFigure />
        </div>
      </section>
    </main>
  );
}
