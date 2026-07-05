// Blog post (/blog/coaching-notes-tips) — "How to Take Better Coaching Notes
// During Practice" (~900 words, Coaching Tips).
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL } from '../_layout';

const TITLE = 'How to Take Better Coaching Notes During Practice';
const DESCRIPTION =
  'Practical habits for volleyball coaches: write notes you can retrieve, name the player and the skill, capture observations in the moment, and review before you plan.';
const DATE = 'July 2, 2026';
const DATE_ISO = '2026-07-02';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: TITLE,
  description: DESCRIPTION,
  datePublished: DATE_ISO,
  url: `${SITE_URL}/blog/coaching-notes-tips`,
  author: { '@type': 'Organization', name: 'Sideline' },
  publisher: { '@type': 'Organization', name: 'Sideline', url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}/blog/coaching-notes-tips`,
};

export default function CoachingNotesTips() {
  if (Platform.OS !== 'web') return null;

  return (
    <main className="mk-prose-page">
      <Head>
        <title>{`${TITLE} — Sideline Blog`}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/blog/coaching-notes-tips`} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Sideline" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/blog/coaching-notes-tips`} />
        <meta property="article:published_time" content={DATE_ISO} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Head>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mk-container">
        <article className="mk-prose">
          <a className="mk-backlink" href="/blog">← All posts</a>
          <h1>How to Take Better Coaching Notes During Practice</h1>
          <p className="mk-byline">
            <span className="mk-cat">Coaching Tips</span> · <time dateTime={DATE_ISO}>{DATE}</time> · 5 min read
          </p>

          <div className="mk-article-body">
            <p>
              Every coach takes notes. Very few coaches ever use them. Somewhere in your gym
              bag there&rsquo;s a legal pad with &ldquo;passing!!&rdquo; underlined three times,
              and you have no idea which practice it came from, which passer it was about, or
              what you planned to do next. The note did its job for about four seconds — it
              made you feel like you&rsquo;d captured something — and then it quietly died.
            </p>
            <p>
              The problem usually isn&rsquo;t discipline. It&rsquo;s that most of us write notes
              for the moment of writing, not the moment of reading. Here are the habits that
              fix that.
            </p>

            <h2>Write for the coach who reads it, not the one who writes it</h2>
            <p>
              A week from now, &ldquo;fix footwork&rdquo; means nothing. Whose footwork? On what
              — the approach, the block, the transition off the net? A useful note answers
              three questions: <strong>who, what skill, and what would better look like.</strong>{' '}
              &ldquo;Jess — middle — late closing on the swing block, watch her first step&rdquo;
              costs you six more words in the moment and saves you the entire memory.
            </p>

            <h2>Name names</h2>
            <p>
              General notes produce general practices. &ldquo;Serve receive was shaky&rdquo;
              leads to another all-team pepper warm-up that helps nobody in particular. But
              &ldquo;Ava shanked four to her left, all off short float serves&rdquo; leads to a
              station where Ava sees fifty short floats to her left on Tuesday. Specific notes
              are how you avoid coaching the average of your roster instead of the players on it.
            </p>

            <h2>Capture it when you see it — or accept that it&rsquo;s gone</h2>
            <p>
              Coaching memory research isn&rsquo;t flattering: what you notice mid-drill gets
              overwritten by the next thing you notice, and the next. The observations that
              survive to the end of practice are the loudest ones, not the most important ones.
              The quiet, valuable stuff — a setter&rsquo;s tempo creeping faster, a libero
              cheating a half-step too deep — evaporates first.
            </p>
            <p>
              This is the one habit where the tooling honestly matters. Stopping to write is a
              real cost mid-drill, which is why we built{' '}
              <a className="mk-link-underline" href="/">Sideline</a> the way we did: you tap
              once, say &ldquo;libero drifting too deep in serve receive,&rdquo; and it becomes
              a structured note — player, skill, priority — without you looking down from the
              court. But whatever your method, the principle is the same: shrink the gap
              between noticing and recording to seconds, not minutes.
            </p>

            <h2>Keep observations and plans in separate piles</h2>
            <p>
              An observation is what happened: &ldquo;Blockers watching the ball, not the
              hitter&rsquo;s shoulders.&rdquo; A plan is what you&rsquo;ll do about it:
              &ldquo;Add eye-sequence work before blocking reps Thursday.&rdquo; When the two
              get mashed together, your notes read like a to-do list written during a fire
              drill. Capture observations during practice; turn them into plans after, when
              you can see the whole session at once. You&rsquo;ll often find three observations
              point to one fix.
            </p>

            <h2>Be stingy with &ldquo;high priority&rdquo;</h2>
            <p>
              If everything is urgent, nothing is. A priority tag only works when most notes
              don&rsquo;t have one. A decent rule: <em>high</em> means &ldquo;this costs us
              points right now,&rdquo; <em>medium</em> means &ldquo;this becomes a problem
              against good teams,&rdquo; and everything else is just worth remembering. Three
              honest highs will shape a better practice than fifteen inflated ones.
            </p>

            <h2>Read your notes before you plan — not while you plan</h2>
            <p>
              The best ten minutes of practice planning happen away from the whiteboard. Sit
              with the last two or three sessions of notes and just read. Patterns show up
              fast: the same passer, the same rotation, the same skill appearing under three
              different drills. Then plan. Coaches who skip straight to drill-picking end up
              running their favorite practice instead of the one their team needs this week.
            </p>

            <h2>The test of a good note</h2>
            <p>
              Here&rsquo;s the whole article in one question: <strong>when you read a note a
              week later, does it tell you what to do?</strong> &ldquo;Passing!!&rdquo; fails.
              &ldquo;Ava — serve receive — shanks short floats to her left — station work
              Tuesday&rdquo; passes. Write fewer notes if you have to. Write ones that pass.
            </p>
            <p>
              And if the writing itself is the part that keeps failing you — mid-drill, ball
              cart in one hand, whistle in your mouth — that&rsquo;s exactly the gap{' '}
              <a className="mk-link-underline" href="/">Sideline</a> exists to close. Say it
              in five seconds, and it&rsquo;s waiting for you, organized, when you plan on
              Sunday night.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
