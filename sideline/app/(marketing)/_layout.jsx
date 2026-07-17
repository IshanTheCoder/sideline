// Marketing site layout: shared nav and footer for the public pages
// (/ and /about). These pages are plain HTML/CSS documents, separate
// from the app shell: no auth gate, no mobile column, no react-native
// components. Web-only; on native the group redirects into the app.
import { Slot, Redirect } from 'expo-router';
import Head from 'expo-router/head';
import { Platform } from 'react-native';
import { useAuth } from '@/contexts/AuthContext';
import './marketing.css';

export const SITE_URL = 'https://tapsideline.com';
export const CONTACT_EMAIL = 'sarda.ish@gmail.com';

export default function MarketingLayout() {
  const { user, loading } = useAuth();
  const signedIn = !loading && !!user;

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
          href="https://fonts.googleapis.com/css2?family=Source+Serif+4:ital,opsz,wght@0,8..60,400;0,8..60,500;0,8..60,600;0,8..60,700;1,8..60,400;1,8..60,500&family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700&display=swap"
        />
      </Head>

      <header className="mk-nav">
        <div className="mk-container mk-nav-inner">
          <a className="mk-logo mk-logo-nav" href="/">
            <img src="/sideline-whistle.png" alt="" width="38" height="38" />
            Sideline
          </a>
          <nav className="mk-navlinks" aria-label="Site">
            <a href="/about">About</a>
            <a className="mk-btn mk-btn-sm" href="/app">{signedIn ? 'Open the app' : 'Try Sideline'}</a>
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
              <li><a href="/app">Open the app</a></li>
              <li><a href="/about">About</a></li>
              <li><a href={`mailto:${CONTACT_EMAIL}`}>Contact</a></li>
            </ul>
          </div>
          <p className="mk-footer-fine">© 2026 Sideline. Built by Ishan Sarda and Sidhant Damarapati.</p>
        </div>
      </footer>
    </div>
  );
}
