/**
 * Privacy Policy — root-level screen (not inside (marketing) or (auth)) so it's
 * reachable both from the public marketing footer and from the native signup
 * screen's required checkbox, without duplicating the copy into two pages.
 * Exempted from the root layout's signed-out redirect in app/_layout.jsx.
 */
import { StatusBar } from 'expo-status-bar';
import { ChevronLeft } from 'lucide-react-native';
import { Linking, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Brand } from '@/constants/brand';
import { useAppBack } from '@/hooks/use-app-back';

const CONTACT_EMAIL = 'sarda.ish@gmail.com';

function Section({ title, children }) {
  return (
    <View style={styles.section}>
      <Text style={styles.sectionTitle}>{title}</Text>
      {children}
    </View>
  );
}

export default function PrivacyPolicyScreen() {
  const goBack = useAppBack('/welcome');

  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <TouchableOpacity
          style={styles.backBtn}
          onPress={goBack}
          activeOpacity={0.7}
          accessibilityLabel="Go back"
        >
          <ChevronLeft size={18} color={Brand.ink} strokeWidth={2.4} />
        </TouchableOpacity>

        <Text style={styles.title}>Privacy Policy</Text>
        <Text style={styles.subtitle}>Last updated August 21, 2026</Text>

        <Section title="What we collect">
          <Text style={styles.body}>
            When you use Sideline, we collect:
          </Text>
          <Text style={styles.bullet}>• Your account email address, used to sign you in.</Text>
          <Text style={styles.bullet}>
            • Team roster information you enter, like player names, jersey numbers, and
            positions — typed in by you or read from a roster screenshot you upload.
          </Text>
          <Text style={styles.bullet}>• Voice recordings you make during games and practices.</Text>
          <Text style={styles.bullet}>
            • The transcriptions and summaries our AI generates from those recordings.
          </Text>
          <Text style={styles.body}>
            We don&rsquo;t collect anything beyond what the app needs to work — no location
            tracking, no browsing history, no data from other apps on your device.
          </Text>
        </Section>

        <Section title="How we use it">
          <Text style={styles.body}>
            We use your data for one purpose: to run Sideline for you. That means transcribing
            your voice notes, organizing them by player and skill, and showing them back to you
            during timeouts, practices, and post-game review.
          </Text>
          <Text style={styles.body}>
            <Text style={styles.bold}>We do not sell your data, to anyone, ever.</Text>
          </Text>
          <Text style={styles.body}>
            We do not share your data with third parties, except the services that power the app
            itself:
          </Text>
          <Text style={styles.bullet}>
            • Groq, which transcribes your voice recordings and generates summaries.
          </Text>
          <Text style={styles.bullet}>
            • Supabase, which securely stores your account, roster, and recording data.
          </Text>
          <Text style={styles.body}>
            These providers process your data only to perform that specific task for Sideline —
            they don&rsquo;t use it for anything else, and we don&rsquo;t hand it to advertisers
            or data brokers.
          </Text>
        </Section>

        <Section title="Who can see it">
          <Text style={styles.body}>
            Only you — the coach who created the account — can see your team&rsquo;s roster,
            recordings, transcriptions, and summaries. Other coaches using Sideline cannot see
            your data, and we don&rsquo;t display it publicly anywhere.
          </Text>
          <Text style={styles.body}>
            Sideline is an independent product built by two students. It is not affiliated with,
            endorsed by, or operated on behalf of any school, school district, or athletic
            association.
          </Text>
        </Section>

        <Section title="Data on minors">
          <Text style={styles.body}>
            Because Sideline is a coaching tool, team rosters often include the names of students
            who are minors. That information is entered by the coach — an adult using the app —
            not collected directly from students. We don&rsquo;t ask players to create accounts,
            sign in, or provide any information themselves.
          </Text>
          <Text style={styles.body}>
            Roster data is used only to help the coach organize their own voice-note observations
            (for example, tagging a note to a specific player). We don&rsquo;t use it for anything
            else.
          </Text>
        </Section>

        <Section title="Data retention & deletion">
          <Text style={styles.body}>
            We keep your data for as long as your account is active, so your recordings and notes
            stay available to you across the season.
          </Text>
          <Text style={styles.body}>
            If you&rsquo;d like your account and all associated data deleted — roster, recordings,
            transcriptions, everything — email us at{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>{' '}
            and we&rsquo;ll take care of it.
          </Text>
        </Section>

        <Section title="Contact">
          <Text style={styles.body}>
            Questions about this policy, or anything else about how Sideline handles your data?
            Email us at{' '}
            <Text
              style={styles.link}
              onPress={() => Linking.openURL(`mailto:${CONTACT_EMAIL}`)}
            >
              {CONTACT_EMAIL}
            </Text>
            . We&rsquo;re a two-person team, and we read every message ourselves.
          </Text>
        </Section>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Brand.bg,
  },
  scrollContent: {
    paddingHorizontal: 26,
    paddingTop: 56,
    paddingBottom: 56,
  },
  backBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    backgroundColor: Brand.hairline,
    alignItems: 'center',
    justifyContent: 'center',
  },
  title: {
    fontSize: 30,
    fontWeight: '800',
    letterSpacing: -0.4,
    color: Brand.ink,
    marginTop: 26,
  },
  subtitle: {
    fontSize: 14,
    color: Brand.muted,
    marginTop: 6,
  },
  section: {
    marginTop: 28,
  },
  sectionTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: Brand.ink,
    marginBottom: 10,
  },
  body: {
    fontSize: 15,
    color: Brand.inkSoft,
    lineHeight: 22,
    marginTop: 8,
  },
  bullet: {
    fontSize: 15,
    color: Brand.inkSoft,
    lineHeight: 22,
    marginTop: 6,
    paddingLeft: 2,
  },
  bold: {
    fontWeight: '700',
    color: Brand.ink,
  },
  link: {
    color: Brand.greenLink,
    fontWeight: '700',
  },
});
