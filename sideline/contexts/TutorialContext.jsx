import React, { createContext, useContext, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const TUTORIAL_COMPLETED_KEY = 'sideline_tutorial_completed';

const TutorialContext = createContext(undefined);

/**
 * Tutorial steps define the guided onboarding flow.
 * Each step has:
 *  - id: unique identifier
 *  - screen: which screen the step appears on
 *  - title: bold heading in the tooltip
 *  - message: body text
 *  - position: where the tooltip appears ('top', 'center', 'bottom')
 *  - action: optional - what the user should tap ('next' = just continue, 'navigate' = go somewhere)
 *  - navigateTo: route to push when step completes (if action === 'navigate')
 *  - highlightArea: hint for which UI element to draw attention to
 */
export const TUTORIAL_STEPS = [
  // === HOME SCREEN INTRO ===
  {
    id: 'home_welcome',
    screen: 'home',
    title: 'Welcome to Sideline!',
    message: 'This is your home screen. From here you can start recording games and view your previous game sessions. Let\'s walk through how everything works!',
    position: 'center',
    action: 'next',
  },
  {
    id: 'home_start_recording',
    screen: 'home',
    title: 'Start Recording',
    message: 'Tap here to start a new recording session. You\'ll set up the game details first, then begin recording voice memos during the match.',
    position: 'top',
    highlightArea: 'startRecording',
    action: 'next',
  },
  {
    id: 'home_recent_games',
    screen: 'home',
    title: 'Recent Games',
    message: 'Your past game recordings will show up here, organized by opponent. You can tap any game to review recordings.',
    position: 'bottom',
    highlightArea: 'recentGames',
    action: 'next',
  },
  // === NAVIGATE TO SETTINGS ===
  {
    id: 'home_go_settings',
    screen: 'home',
    title: 'Let\'s Set Up Your Profile',
    message: 'Tap the settings gear icon in the top-right corner to customize your profile.',
    position: 'top',
    highlightArea: 'settingsButton',
    action: 'navigate',
    navigateTo: '/(tabs)/settings',
  },
  // === SETTINGS SCREEN ===
  {
    id: 'settings_profile',
    screen: 'settings',
    title: 'Your Profile',
    message: 'Tap the edit button (pencil icon) to change your name to your team name. You can also upload your team logo as your profile picture!',
    position: 'top',
    highlightArea: 'profileSection',
    action: 'next',
  },
  {
    id: 'settings_privacy',
    screen: 'settings',
    title: 'Email & Password',
    message: 'If you ever need to change your email or password, you can do it from the Privacy section here.',
    position: 'center',
    highlightArea: 'privacySection',
    action: 'next',
  },
  {
    id: 'settings_back_home',
    screen: 'settings',
    title: 'Back to Home',
    message: 'Great! Now let\'s head back to the home screen to explore more features.',
    position: 'center',
    action: 'navigate',
    navigateTo: '/(tabs)',
  },
  // === HAMBURGER MENU ===
  {
    id: 'home_open_menu',
    screen: 'home',
    title: 'Navigation Menu',
    message: 'Tap the hamburger menu (three lines) in the top-left to access all the app\'s features.',
    position: 'top',
    highlightArea: 'hamburgerButton',
    action: 'open_menu',
  },
  {
    id: 'menu_overview',
    screen: 'hamburger_menu',
    title: 'Your Menu',
    message: 'From here you can navigate to Home, Start Recording, View Games, Roster, and Settings. Let\'s check out the Roster next!',
    position: 'center',
    action: 'next',
  },
  {
    id: 'menu_go_roster',
    screen: 'hamburger_menu',
    title: 'Go to Roster',
    message: 'Tap "Roster" to manage your team\'s player list.',
    position: 'center',
    highlightArea: 'rosterItem',
    action: 'navigate',
    navigateTo: '/(tabs)/roster',
  },
  // === ROSTER SCREEN ===
  {
    id: 'roster_intro',
    screen: 'roster',
    title: 'Team Roster',
    message: 'This is where you manage your players. Adding players helps the AI correctly identify names in your recordings and generate better summaries.',
    position: 'center',
    action: 'next',
  },
  {
    id: 'roster_add_methods',
    screen: 'roster',
    title: 'Two Ways to Add Players',
    message: '1. "Add player" - Manually enter each player\'s name, number, and position.\n\n2. "Import from CSV" - Copy player data from a spreadsheet (Excel or Google Sheets) and paste it in. Great for large rosters!',
    position: 'center',
    highlightArea: 'toolbar',
    action: 'next',
  },
  {
    id: 'roster_back_home',
    screen: 'roster',
    title: 'Back to Home',
    message: 'Nice! Now let\'s go back and learn how to record a game.',
    position: 'center',
    action: 'navigate',
    navigateTo: '/(tabs)',
  },
  // === RECORDING FLOW ===
  {
    id: 'home_go_record',
    screen: 'home',
    title: 'Start a Recording',
    message: 'Tap "Start Recording" to begin. You\'ll first enter the game details, then start recording voice memos.',
    position: 'top',
    highlightArea: 'startRecording',
    action: 'navigate',
    navigateTo: '/(tabs)/record-details',
  },
  {
    id: 'record_details_intro',
    screen: 'record-details',
    title: 'Game Details',
    message: 'Before recording, fill in the opponent name, game date, and match type. This helps organize your recordings by game.',
    position: 'center',
    action: 'next',
  },
  {
    id: 'record_details_fields',
    screen: 'record-details',
    title: 'Fill In the Details',
    message: 'Enter the opponent name (e.g., "Lincoln High"), select today\'s date, and pick a match type (Regular Season, Practice, etc.). Then tap "Start Recording".',
    position: 'bottom',
    action: 'next',
  },
  {
    id: 'record_details_tip',
    screen: 'record-details',
    title: 'Recording Tips',
    message: 'Once you start, try saying things like:\n\n"Sarah, great serve receive on that play"\n"Number 7, work on your approach angle"\n"Good block by the middle, keep that timing"\n\nRecord 3-5 short clips during the match!',
    position: 'center',
    action: 'next',
  },
  // === REVIEW FLOW ===
  {
    id: 'home_go_review',
    screen: 'home',
    title: 'Review Your Recordings',
    message: 'After recording a game, tap "View All" or a game card to review your recordings. Let\'s explore the review section!',
    position: 'bottom',
    highlightArea: 'recentGames',
    action: 'navigate',
    navigateTo: '/(tabs)/review',
  },
  {
    id: 'review_intro',
    screen: 'review',
    title: 'All Your Games',
    message: 'This screen shows all your games. You can search recordings, filter by skill category, feedback type, or player name.',
    position: 'center',
    action: 'next',
  },
  {
    id: 'review_game_tap',
    screen: 'review',
    title: 'Tap a Game',
    message: 'Tap any game to see all the individual recordings from that match. You can listen back, view transcriptions, and edit details.',
    position: 'center',
    action: 'next',
  },
  {
    id: 'review_recording_features',
    screen: 'review',
    title: 'Recording Features',
    message: 'For each recording you can:\n\n- Listen to the audio playback\n- Tap the pencil icon to view the AI transcription\n- Add your own manual notes\n- Press "Edit" to change recording details',
    position: 'center',
    action: 'next',
  },
  {
    id: 'review_summary',
    screen: 'review',
    title: 'Post-Game Summary',
    message: 'Each game has a "Match Reflection" summary. It shows your most common coaching points, skill breakdowns, player mentions, and a timeline of the match. Check it after every game!',
    position: 'center',
    action: 'next',
  },
  // === FINISH ===
  {
    id: 'tutorial_complete',
    screen: 'review',
    title: 'You\'re All Set!',
    message: 'That\'s the full tour! You can replay this tutorial anytime from Settings. Now go record your next game!',
    position: 'center',
    action: 'finish',
  },
];

export function TutorialProvider({ children }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCompletedTutorial, setHasCompletedTutorial] = useState(null);

  // Check if tutorial was completed before
  const checkTutorialStatus = useCallback(async () => {
    try {
      const completed = await AsyncStorage.getItem(TUTORIAL_COMPLETED_KEY);
      setHasCompletedTutorial(completed === 'true');
      return completed === 'true';
    } catch {
      setHasCompletedTutorial(false);
      return false;
    }
  }, []);

  const startTutorial = useCallback(() => {
    setCurrentStepIndex(0);
    setIsTutorialActive(true);
  }, []);

  const nextStep = useCallback(() => {
    setCurrentStepIndex((prev) => {
      const next = prev + 1;
      if (next >= TUTORIAL_STEPS.length) {
        // Tutorial complete
        setIsTutorialActive(false);
        AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true').catch(() => {});
        setHasCompletedTutorial(true);
        return 0;
      }
      return next;
    });
  }, []);

  const skipTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setCurrentStepIndex(0);
    AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true').catch(() => {});
    setHasCompletedTutorial(true);
  }, []);

  const finishTutorial = useCallback(() => {
    setIsTutorialActive(false);
    setCurrentStepIndex(0);
    AsyncStorage.setItem(TUTORIAL_COMPLETED_KEY, 'true').catch(() => {});
    setHasCompletedTutorial(true);
  }, []);

  const currentStep = isTutorialActive ? TUTORIAL_STEPS[currentStepIndex] : null;

  const value = {
    isTutorialActive,
    currentStep,
    currentStepIndex,
    totalSteps: TUTORIAL_STEPS.length,
    hasCompletedTutorial,
    startTutorial,
    nextStep,
    skipTutorial,
    finishTutorial,
    checkTutorialStatus,
  };

  return (
    <TutorialContext.Provider value={value}>{children}</TutorialContext.Provider>
  );
}

export function useTutorial() {
  const context = useContext(TutorialContext);
  if (context === undefined) {
    throw new Error('useTutorial must be used within a TutorialProvider');
  }
  return context;
}
