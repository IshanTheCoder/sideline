// About page (/about). Builder framing: who we are, where Sideline started,
// the problem it solves, what it does, how it differs from film-and-roster
// tools and plain voice memos, and how to reach us.
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL, CONTACT_EMAIL } from './_layout';

const TITLE = 'About Sideline. Helping coaches stay focused when it matters.';
const DESCRIPTION =
  'Sideline is a voice-first note-taking tool for volleyball coaches, built by two students from New Jersey. It captures in-game observations in the moment so nothing gets lost before practice.';

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
    founder: [
      { '@type': 'Person', name: 'Ishan Sarda' },
      { '@type': 'Person', name: 'Sidhant Damarapati' },
    ],
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
          <h1>We&rsquo;re helping coaches stay focused when it matters.</h1>

          <p>
            We&rsquo;re Ishan and Sid, students at West Windsor-Plainsboro High School
            South in New Jersey. We love sports, we love AI, and we love using technology
            to solve real problems.
          </p>

          <h2>Where this started</h2>
          <p>
            Sideline started at a volleyball game. We were watching from the stands and
            counting everything happening at once: footwork, tempo, rotations, etc. We kept coming back to the same
            question: how does one person keep track of all of this? After the match we
            asked the coach, and he told us he loses most of what he notices before he can
            do anything about it. That was all we needed to start building.
          </p>

          <h2>The problem</h2>
          <p>
            During live play, coaches notice dozens of things worth fixing. The rally
            doesn&rsquo;t stop for note-taking, so those observations live in memory, and
            memory doesn&rsquo;t survive a five-set match. By the next practice, most of
            what a coach saw is gone.
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
            A voice memos app gets you halfway there, then leaves you with forty unlabeled
            recordings to replay at midnight. Sideline transcribes and organizes each note
            the moment you record it. Film tools like Hudl work days after the game. Roster
            tools like TeamSnap handle schedules, not observations. Sideline is built for
            the actual moment of coaching: the ten seconds between noticing something and
            losing it.
          </p>

          <h2>Get in touch</h2>
          <p>
            Sideline has already run games with our school&rsquo;s team at WW-P South, a
            top-five program in the state. Now we&rsquo;re looking for our first ten
            volleyball coaches to run it for a season, boys&rsquo; and girls&rsquo; programs
            alike. If that&rsquo;s you, email{' '}
            <a className="mk-link-underline" href={`mailto:${CONTACT_EMAIL}`}>{CONTACT_EMAIL}</a>.
            Every email gets read by one of the two people who built this.
          </p>
        </div>
      </div>
    </main>
  );
}
