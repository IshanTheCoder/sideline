// About page (/about) — the longer founder story, what makes Sideline
// different from film-and-roster tools, and how to reach us.
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL, CONTACT_EMAIL } from './_layout';

const TITLE = 'About Sideline — built by two athletes who watched coaches lose their notes';
const DESCRIPTION =
  'Sideline is a voice-first note-taking tool for volleyball coaches, built by two high school athletes from New Jersey. Here’s why we made it and what makes it different.';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'AboutPage',
  name: 'About Sideline',
  url: `${SITE_URL}/about`,
  description: DESCRIPTION,
  mainEntity: {
    '@type': 'Organization',
    name: 'Sideline',
    url: SITE_URL,
    email: CONTACT_EMAIL,
    foundingLocation: 'New Jersey, United States',
  },
};

export default function AboutPage() {
  if (Platform.OS !== 'web') return null;

  return (
    <main className="mk-prose-page">
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/about`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Sideline" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/about`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Head>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mk-container">
        <div className="mk-prose">
          <p className="mk-eyebrow">About</p>
          <h1>Built by two people who spend their evenings in gyms.</h1>

          <p>
            We&rsquo;re Sid and Ishan — high school athletes from New Jersey. Sid teaches
            taekwondo a few nights a week, which means he&rsquo;s been on both sides of the
            clipboard: the athlete being corrected, and the person trying to remember
            twelve corrections at once.
          </p>
          <p>
            Sideline started with something we kept seeing courtside. A coach notices the
            libero drifting too deep in serve receive. It&rsquo;s a real, specific, fixable
            thing — and it&rsquo;s gone ninety seconds later, buried under a timeout, a
            substitution, and a 6-point run. Multiply that by an entire match and a coach
            walks out of the gym having <em>seen</em> thirty things and being able to
            <em> recall</em> maybe four.
          </p>
          <p>
            The tools that exist don&rsquo;t really help in that moment. Film breakdown happens
            days later. Clipboards and phone notes mean looking down while the play is
            happening. So observations either interrupt the coaching or they evaporate.
            We built Sideline to catch them without asking for the coach&rsquo;s eyes — just
            their voice, for about five seconds.
          </p>

          <h2>What Sideline actually does</h2>
          <p>
            You tap once and say what you saw: <em>&ldquo;Block closing late on the
            outside.&rdquo;</em> Sideline transcribes it and structures it — which player,
            which skill, how urgent, which game and set — into notes you can actually
            search and review before the next practice. No typing during play. No tagging.
            No reorganizing a notes app at 11pm.
          </p>

          <h2>How that&rsquo;s different</h2>
          <p>
            Hudl is film — excellent for college and pro programs with staff and budget,
            heavy for a part-time club coach who just needs to remember what she saw.
            TeamSnap and SportEasy handle schedules and rosters, not observations.
            Nothing we could find was built for the actual moment of coaching: the ten
            seconds between noticing something and losing it.
          </p>
          <p>That&rsquo;s the whole product. Three choices follow from it:</p>
          <ul>
            <li>
              <strong>Voice-first, because your eyes are busy.</strong> Everything works
              from a five-second spoken note, captured without looking away from the court.
            </li>
            <li>
              <strong>Structured automatically, because you won&rsquo;t do it later.</strong>{' '}
              Notes organize themselves by player, skill, and priority the moment you stop talking.
            </li>
            <li>
              <strong>Built for games, not just film review.</strong> Sideline assumes noise,
              adrenaline, and thirty seconds of attention — a timeout, not a desk.
            </li>
          </ul>

          <h2>Where we are</h2>
          <p>
            Sideline is young, and we&rsquo;re not going to pretend otherwise. The core works
            today — record, transcribe, structure, review — and we&rsquo;re shaping the rest
            with the coaches who use it. We&rsquo;re looking for our first ten volleyball
            coaches to run it for a season and tell us, bluntly, what&rsquo;s missing.
          </p>
          <p>
            If you coach volleyball — high school, club, or rec — we&rsquo;d genuinely love
            to hear from you: <a className="mk-link-underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            Every email gets read by one of the two people who built this.
          </p>
        </div>
      </div>
    </main>
  );
}
