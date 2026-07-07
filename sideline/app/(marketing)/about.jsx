// About page (/about). Short builder framing: who we are, what Sideline
// does, how it differs from film-and-roster tools, and how to reach us.
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL, CONTACT_EMAIL } from './_layout';

const TITLE = 'About Sideline. Tools that reduce the cognitive workload of coaches.';
const DESCRIPTION =
  'Sideline is a voice-first note-taking tool for volleyball coaches. It captures in-game observations in the moment so nothing gets lost before practice.';

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
          <h1>We build tools that reduce the cognitive workload of coaches.</h1>

          <p>
            We are Sid and Ishan. During live play, coaches notice dozens of things they
            need to remember. Most of those observations disappear before practice the
            next day. Sideline captures them in the moment so nothing gets lost.
          </p>

          <h2>What Sideline does</h2>
          <p>
            You tap once and say what you saw: <em>&ldquo;Block closing late on the
            outside.&rdquo;</em> Sideline transcribes it and structures it into searchable
            notes, organized by player, skill, priority, and game. No typing during play.
            No tagging. No reorganizing a notes app at 11pm.
          </p>

          <h2>How that&rsquo;s different</h2>
          <p>
            Film tools like Hudl work days after the game. Roster tools like TeamSnap
            handle schedules, not observations. Sideline is built for the actual moment
            of coaching: the ten seconds between noticing something and losing it.
          </p>

          <h2>Get in touch</h2>
          <p>
            We&rsquo;re looking for our first ten volleyball coaches to run Sideline for a
            season, boys&rsquo; and girls&rsquo; programs alike. If that&rsquo;s you, email{' '}
            <a className="mk-link-underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            Every email gets read by one of the two people who built this.
          </p>
        </div>
      </div>
    </main>
  );
}
