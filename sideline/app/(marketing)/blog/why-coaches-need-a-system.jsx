// Blog post (/blog/why-coaches-need-a-system) — "Why Every Coach Needs a
// System for Practice Notes" (~800 words, Coaching Tips).
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL } from '../_layout';

const TITLE = 'Why Every Coach Needs a System for Practice Notes';
const DESCRIPTION =
  'Your memory is not a system. Why volleyball coaches lose their best observations, what a real note-taking system looks like, and how little it takes to build one.';
const DATE = 'June 24, 2026';
const DATE_ISO = '2026-06-24';

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'BlogPosting',
  headline: TITLE,
  description: DESCRIPTION,
  datePublished: DATE_ISO,
  url: `${SITE_URL}/blog/why-coaches-need-a-system`,
  author: { '@type': 'Organization', name: 'Sideline' },
  publisher: { '@type': 'Organization', name: 'Sideline', url: SITE_URL },
  mainEntityOfPage: `${SITE_URL}/blog/why-coaches-need-a-system`,
};

export default function WhyCoachesNeedASystem() {
  if (Platform.OS !== 'web') return null;

  return (
    <main className="mk-prose-page">
      <Head>
        <title>{`${TITLE} — Sideline Blog`}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/blog/why-coaches-need-a-system`} />
        <meta property="og:type" content="article" />
        <meta property="og:site_name" content="Sideline" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/blog/why-coaches-need-a-system`} />
        <meta property="article:published_time" content={DATE_ISO} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Head>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mk-container">
        <article className="mk-prose">
          <a className="mk-backlink" href="/blog">← All posts</a>
          <h1>Why Every Coach Needs a System for Practice Notes</h1>
          <p className="mk-byline">
            <span className="mk-cat">Coaching Tips</span> · <time dateTime={DATE_ISO}>{DATE}</time> · 4 min read
          </p>

          <div className="mk-article-body">
            <p>
              Ask a coach how they track what they see in practice and you&rsquo;ll usually get
              one of three answers: &ldquo;I just remember it,&rdquo; &ldquo;I jot things
              down,&rdquo; or a slightly guilty laugh. All three are the same answer. None of
              them is a system.
            </p>
            <p>
              Here&rsquo;s the uncomfortable math. In a two-hour volleyball practice you&rsquo;ll
              notice something worth acting on every few minutes — a passer&rsquo;s platform
              angle, a hitter telegraphing line shots, a rotation that keeps leaking points.
              Call it twenty or thirty real observations. By the time you&rsquo;re locking the
              gym, you can reliably recall four or five, and they&rsquo;ll be the most recent
              or most dramatic ones — not the most important. Everything else is gone, and you
              paid two hours of attention to collect it.
            </p>

            <h2>Memory is a filter, not a shelf</h2>
            <p>
              We like to think memory stores things and we retrieve them later. It doesn&rsquo;t
              work that way under load. During practice you&rsquo;re managing drills, the clock,
              fourteen teenagers, and a parent hovering by the door. In that state, each new
              observation doesn&rsquo;t get shelved — it shoves the previous one out. The coach
              who &ldquo;just remembers&rdquo; isn&rsquo;t remembering; they&rsquo;re sampling.
            </p>
            <p>
              And the sample is biased in the worst direction. Dramatic moments stick — the
              shanked pass that ended a drill, the argument at the net. The quiet patterns
              that actually decide matches, like a setter&rsquo;s tempo drifting or a middle
              hesitating on her crossover step, are precisely the ones that fade first.
            </p>

            <h2>What a system actually is</h2>
            <p>
              A system isn&rsquo;t an app, a binder, or a color-coding scheme. It&rsquo;s three
              promises you can keep on your worst day:
            </p>
            <ul>
              <li><strong>Capture</strong> — every observation gets recorded within seconds of noticing it.</li>
              <li><strong>Structure</strong> — each note is findable later by player and by skill, not buried in a scroll of text.</li>
              <li><strong>Review</strong> — you actually look at the notes before planning the next practice.</li>
            </ul>
            <p>
              Miss any leg and the whole thing collapses. Capture without structure gives you
              a haystack. Structure without review gives you a beautiful archive nobody opens.
              And review without capture gives you a planning session built on four biased
              memories — which is where most of us started.
            </p>

            <h2>Why most coaches never build one</h2>
            <p>
              Because every traditional version taxes the exact resource coaching runs on:
              attention. Writing on a clipboard means eyes off the court. Typing into a notes
              app means fifteen seconds of thumbs while the drill runs itself. Filming
              everything means two more hours at a laptop that a volunteer coach with a day
              job does not have. So the system loses to the sport, every time, and coaches
              conclude they&rsquo;re just &ldquo;not note-takers.&rdquo; They&rsquo;re
              note-takers with tools that cost too much mid-practice.
            </p>
            <p>
              This is the specific problem we built{' '}
              <a className="mk-link-underline" href="/">Sideline</a> around: capture had to
              cost less than five seconds and zero glances. You say &ldquo;Middles late closing
              on the outside — work it Thursday,&rdquo; and the structure — player, skill,
              priority, game — happens on its own. But the tool matters less than the bar it
              has to clear: if your capture method makes you choose between the note and the
              next rep, you&rsquo;ll choose the rep, and you should.
            </p>

            <h2>The compounding part</h2>
            <p>
              The real payoff isn&rsquo;t any single note — it&rsquo;s what notes do when they
              accumulate. One note says Ava shanked a pass. Six weeks of notes say Ava&rsquo;s
              passing breaks down specifically against short float serves, in rotation two,
              late in sets. That&rsquo;s not a reminder anymore; that&rsquo;s scouting your own
              team. Players notice, too. When feedback arrives with receipts —
              &ldquo;this is the third practice in a row&rdquo; — it stops sounding like a
              mood and starts sounding like coaching.
            </p>

            <h2>Start smaller than you think</h2>
            <p>
              You don&rsquo;t need to capture everything. You need to capture something,
              tonight, in a way you can find next week. Five specific notes per practice,
              reviewed once before you plan, will outperform a season of &ldquo;I&rsquo;ll
              remember it.&rdquo; If a legal pad clears that bar for you, wonderful — use the
              legal pad. If it never has, try saying your next observation out loud into{' '}
              <a className="mk-link-underline" href="/">Sideline</a> instead, and see what
              it&rsquo;s like to walk into Sunday planning with the whole practice still there.
            </p>
          </div>
        </article>
      </div>
    </main>
  );
}
