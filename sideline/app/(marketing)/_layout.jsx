// Marketing site layout — shared nav and footer for the public pages
// (/, /about, /blog/...). These pages are plain HTML/CSS documents, separate
// from the app shell: no auth, no mobile column, no react-native components.
// Web-only; on native the group redirects into the app.
import { Slot, Redirect } from 'expo-router';
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import './marketing.css';

export const SITE_URL = 'https://sideline-ai.pages.dev';
export const CONTACT_EMAIL = 'sarda.ish@gmail.com';

export default function MarketingLayout() {
  if (Platform.OS !== 'web') {
    return <Redirect href="/(auth)/welcome" />;
  }

  return (
    <div className="mk-root">
      <Head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;1,8..60,400;1,8..60,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600&display=swap"
        />
      </Head>

      <header className="mk-nav">
        <div className="mk-container mk-nav-inner">
          <a className="mk-logo" href="/">Sideline</a>
          <nav className="mk-navlinks" aria-label="Site">
            <a className="mk-nav-hidesm" href="/#how-it-works">How it works</a>
            <a href="/about">About</a>
            <a href="/blog">Blog</a>
            <a className="mk-btn" href="/welcome">Try Sideline</a>
          </nav>
        </div>
      </header>

      <Slot />

      <footer className="mk-footer">
        <div className="mk-container">
          <div className="mk-footer-inner">
            <div className="mk-footer-brand">
              <a className="mk-logo" href="/">Sideline</a>
              <p>Voice-first coaching notes. Made in New Jersey.</p>
            </div>
            <ul className="mk-footer-links">
              <li><a href="/welcome">Open the app</a></li>
              <li><a href="/about">About</a></li>
              <li><a href="/blog">Blog</a></li>
              <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
            </ul>
          </div>
          <p className="mk-footer-fine">© 2026 Sideline. Built by two high schoolers who spend a lot of time in gyms.</p>
        </div>
      </footer>
    </div>
  );
}
