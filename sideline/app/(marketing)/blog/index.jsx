// Blog listing (/blog) — card list of posts with title, date, excerpt.
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { SITE_URL } from '../_layout';

const TITLE = 'The Sideline Blog — practical notes on coaching volleyball';
const DESCRIPTION =
  'Short, practical writing for volleyball coaches: taking better notes, running tighter practices, and remembering what you saw during games.';

const POSTS = [
  {
    href: '/blog/coaching-notes-tips',
    category: 'Coaching Tips',
    date: 'July 2, 2026',
    dateTime: '2026-07-02',
    title: 'How to Take Better Coaching Notes During Practice',
    excerpt:
      'Most practice notes fail at the same point — not the writing, the retrieving. Six habits that make notes useful the next time you walk into the gym.',
  },
  {
    href: '/blog/why-coaches-need-a-system',
    category: 'Coaching Tips',
    date: 'June 24, 2026',
    dateTime: '2026-06-24',
    title: 'Why Every Coach Needs a System for Practice Notes',
    excerpt:
      'Your memory is not a system. What a real one looks like, why most coaches never build one, and how little it actually takes.',
  },
];

const JSON_LD = {
  '@context': 'https://schema.org',
  '@type': 'Blog',
  name: 'The Sideline Blog',
  url: `${SITE_URL}/blog`,
  description: DESCRIPTION,
  blogPost: POSTS.map((p) => ({
    '@type': 'BlogPosting',
    headline: p.title,
    url: `${SITE_URL}${p.href}`,
    datePublished: p.dateTime,
  })),
};

export default function BlogIndex() {
  if (Platform.OS !== 'web') return null;

  return (
    <main className="mk-prose-page">
      <Head>
        <title>{TITLE}</title>
        <meta name="description" content={DESCRIPTION} />
        <link rel="canonical" href={`${SITE_URL}/blog`} />
        <meta property="og:type" content="website" />
        <meta property="og:site_name" content="Sideline" />
        <meta property="og:title" content={TITLE} />
        <meta property="og:description" content={DESCRIPTION} />
        <meta property="og:url" content={`${SITE_URL}/blog`} />
        <meta name="twitter:card" content="summary" />
        <meta name="twitter:title" content={TITLE} />
        <meta name="twitter:description" content={DESCRIPTION} />
      </Head>
      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(JSON_LD) }} />

      <div className="mk-container">
        <p className="mk-eyebrow">Blog</p>
        <h1 className="mk-section-title">Notes on coaching, from the sideline.</h1>
        <p className="mk-section-sub">
          Short, practical writing for volleyball coaches. No growth hacks, no ten-step
          funnels — just the craft of noticing things and doing something about them.
        </p>

        <div className="mk-postlist">
          {POSTS.map((post) => (
            <a key={post.href} className="mk-postcard" href={post.href}>
              <p className="mk-postcard-meta">
                <span className="mk-cat">{post.category}</span> · <time dateTime={post.dateTime}>{post.date}</time>
              </p>
              <h2>{post.title}</h2>
              <p>{post.excerpt}</p>
              <span className="mk-postcard-read">Read →</span>
            </a>
          ))}
        </div>
      </div>
    </main>
  );
}
