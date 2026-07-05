// Marketing homepage (/) — hero with a real structured-note example,
// how-it-works, an editorial "built for the sideline" band, and the founders
// section. Statically rendered for SEO; the app itself lives at /home.
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL, CONTACT_EMAIL } from './_layout';

const TITLE = 'Sideline — Voice-first coaching notes for volleyball coaches';
const DESCRIPTION =
  'Sideline turns a coach’s five-second voice notes into structured, searchable feedback — organized by player, skill, and priority. Record during the game, review before practice.';

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

function MicIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="3" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v3" />
    </svg>
  );
}

function EarIcon() {
  return (
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
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
    <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="5" y="4" width="14" height="17" rx="2" />
      <path d="M9 4.5V3h6v1.5" />
      <path d="M9 10h6" />
      <path d="M9 14h6" />
      <path d="M9 18h3" />
    </svg>
  );
}

// Simple line drawing of half a volleyball court, annotated the way a coach
// would mark it up — the founders-section visual.
function CourtSketch() {
  return (
    <svg className="mk-court" viewBox="0 0 380 300" fill="none" role="img" aria-label="Hand-drawn diagram of a volleyball court with a coaching note pointing at the libero's position">
      <rect x="40" y="30" width="300" height="240" rx="3" stroke="#979797" strokeWidth="1.5" />
      <line x1="40" y1="30" x2="340" y2="30" stroke="#4a6340" strokeWidth="3" />
      <line x1="40" y1="110" x2="340" y2="110" stroke="#979797" strokeWidth="1.2" strokeDasharray="6 6" />
      <circle cx="120" cy="215" r="9" stroke="#75975e" strokeWidth="1.8" />
      <circle cx="230" cy="170" r="9" stroke="#c9c4b6" strokeWidth="1.6" />
      <circle cx="290" cy="220" r="9" stroke="#c9c4b6" strokeWidth="1.6" />
      <path d="M120 204 C 118 185, 122 172, 128 160" stroke="#75975e" strokeWidth="1.6" strokeDasharray="4 5" strokeLinecap="round" />
      <path d="M128 160 l -7 2 M128 160 l -1 7" stroke="#75975e" strokeWidth="1.6" strokeLinecap="round" />
      <text x="52" y="292" fill="#6b6b6b" fontFamily="'Source Serif 4', Georgia, serif" fontStyle="italic" fontSize="15">
        &ldquo;libero drifting too deep&rdquo;
      </text>
      <path d="M112 284 C 108 265, 110 245, 117 228" stroke="#c4785b" strokeWidth="1.3" strokeDasharray="1 4" strokeLinecap="round" />
    </svg>
  );
}

export default function MarketingHome() {
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
      <section className="mk-hero">
        <div className="mk-container mk-hero-grid">
          <div>
            <p className="mk-eyebrow">Voice-first coaching notes</p>
            <h1>Remember everything you noticed during the game.</h1>
            <p className="mk-hero-sub">
              Sideline records your voice notes and turns them into structured, searchable
              feedback — by player, by skill, by game.
            </p>
            <a className="mk-btn mk-btn-lg" href="/welcome">Start recording</a>
            <p className="mk-hero-cta-note">Works in the browser, on the phone already in your hand.</p>
          </div>

          <div>
            <figure className="mk-notecard" aria-label="Example of a voice note turned into a structured coaching note">
              <div className="mk-notecard-quote mk-rise">
                <MicIcon />
                <div>
                  <p className="mk-notecard-quote-text">&ldquo;Block closing late on the outside&rdquo;</p>
                  <p className="mk-notecard-time">Voice note · 0:04</p>
                </div>
              </div>
              <div className="mk-notecard-flow mk-rise mk-rise-1" aria-hidden="true">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M12 4v16" /><path d="M6 14l6 6 6-6" />
                </svg>
              </div>
              <div className="mk-notecard-rows">
                <div className="mk-notecard-row mk-rise mk-rise-2">
                  <span className="mk-notecard-label">Player</span>
                  <span className="mk-notecard-value">#7 (Sarah K.)</span>
                </div>
                <div className="mk-notecard-row mk-rise mk-rise-3">
                  <span className="mk-notecard-label">Skill</span>
                  <span className="mk-notecard-value">Blocking — timing</span>
                </div>
                <div className="mk-notecard-row mk-rise mk-rise-4">
                  <span className="mk-notecard-label">Priority</span>
                  <span className="mk-notecard-value"><span className="mk-badge-high">High</span></span>
                </div>
                <div className="mk-notecard-row mk-rise mk-rise-5">
                  <span className="mk-notecard-label">Game</span>
                  <span className="mk-notecard-value">vs. Ridge, Set 2</span>
                </div>
              </div>
            </figure>
            <p className="mk-notecard-caption mk-rise mk-rise-6">
              A five-second voice note, organized before the set ends.
            </p>
          </div>
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
              <MicIcon />
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
                Your note is transcribed and organized by player, skill area, and priority —
                while the rally is still going. No typing, no tagging, no dropdown menus.
              </p>
              <p className="mk-moment-example">#12 · Serving — toss consistency · Medium</p>
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
        </div>
      </section>

      {/* built for the sideline */}
      <section className="mk-band mk-section">
        <div className="mk-container">
          <p className="mk-eyebrow">Built for the sideline</p>
          <p className="mk-band-text">
            You just noticed your setter&rsquo;s tempo is off, but the next rally is already
            starting. With Sideline, you tap, talk for five seconds, and get back to coaching.
            Your observation is saved, transcribed, and organized <em>before the set ends</em> —
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
              Two high school athletes from New Jersey. Sid teaches taekwondo; we&rsquo;ve both
              spent years around coaches who see everything and get to write down almost none
              of it. We built Sideline because we kept watching good observations — the toss
              that drifts, the block that closes late — disappear into the chaos of a live game.
            </p>
            <p className="mk-founders-note">
              We&rsquo;re looking for our first ten volleyball coaches to try Sideline this
              season. If that&rsquo;s you, <a className="mk-link-underline" href={`mailto:${CONTACT_EMAIL}`}>email us</a> —
              we&rsquo;ll set you up and we&rsquo;ll actually read your feedback.
            </p>
          </div>
          <CourtSketch />
        </div>
      </section>
    </main>
  );
}
