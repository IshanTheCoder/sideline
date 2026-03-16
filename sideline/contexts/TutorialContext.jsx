import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'sideline.hasCompletedOnboarding';

const TUTORIAL_STEPS = [
  // ── Phase 1: Home Screen ──
  {
    phase: 1,
    phaseLabel: 'Home Screen',
    title: 'Welcome to Sideline!',
    body: 'This is your home screen. From here you can start recording game sessions or review your previous games.',
    route: '/(tabs)',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    phase: 1,
    phaseLabel: 'Home Screen',
    title: 'Start Recording',
    body: "Tap here when you're ready to record during a game. We'll set up game details first.",
    route: '/(tabs)',
    targetKey: 'home:startRecording',
    tooltipPosition: 'bottom',
  },
  {
    phase: 1,
    phaseLabel: 'Home Screen',
    title: 'Recent Games',
    body: "Your recent games will appear here. Let's first set up your profile.",
    route: '/(tabs)',
    targetKey: 'home:recentGames',
    tooltipPosition: 'top',
  },

  // ── Phase 2: Settings ──
  {
    phase: 2,
    phaseLabel: 'Settings',
    title: 'Your Profile',
    body: 'Update your display name to your team name so recordings are easy to identify.',
    route: '/(tabs)/settings',
    targetKey: 'settings:profile',
    tooltipPosition: 'bottom',
  },
  {
    phase: 2,
    phaseLabel: 'Settings',
    title: 'Profile Picture',
    body: 'Tap the pencil icon on your avatar to upload your team logo as your profile picture.',
    route: '/(tabs)/settings',
    targetKey: 'settings:profilePic',
    tooltipPosition: 'bottom',
  },
  {
    phase: 2,
    phaseLabel: 'Settings',
    title: 'Security Settings',
    body: 'In the Privacy section you can update your email or password anytime.',
    route: '/(tabs)/settings',
    targetKey: 'settings:privacy',
    tooltipPosition: 'bottom',
  },

  // ── Phase 3: Hamburger Menu ──
  {
    phase: 3,
    phaseLabel: 'Navigation',
    title: 'Navigation Menu',
    body: 'Tap the menu icon to access all sections of the app.',
    route: '/(tabs)',
    targetKey: 'home:hamburger',
    tooltipPosition: 'bottom',
  },
  {
    phase: 3,
    phaseLabel: 'Navigation',
    title: 'App Sections',
    body: 'From here you can navigate to Start Recording, View Games, Roster, Settings, and more.\n\nTap the ✕ button to close the menu, then tap Next.',
    route: '/(tabs)',
    action: 'openMenu',
    targetKey: null,
    tooltipPosition: 'center',
  },

  // ── Phase 4: Roster ──
  {
    phase: 4,
    phaseLabel: 'Roster',
    title: 'Adding Players',
    body: "There are two ways to build your roster:\n\n1️⃣  \"Add player\" — manually enter a name, jersey number, and position.\n\n2️⃣  \"Import from screenshot\" — snap a photo of your roster sheet and AI will extract player info automatically.\n\nYour roster helps Sideline personalize transcriptions and AI summaries.",
    route: '/(tabs)/roster',
    action: 'closeMenu',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    phase: 4,
    phaseLabel: 'Roster',
    title: 'Build Your Roster',
    body: "Try it out! The buttons above are active — tap \"Add player\" or \"Import from screenshot\" to add at least 2 players, then tap Next.",
    route: '/(tabs)/roster',
    targetKey: null,
    tooltipPosition: 'center',
    interactive: true,
    requirePlayerCount: 2,
  },

  // ── Phase 5: Recording Flow ──
  {
    phase: 5,
    phaseLabel: 'Recording',
    title: 'Set Up a Test Game',
    body: "Fill in the form:\n\n1️⃣  Opponent — type \"Test Run\"\n2️⃣  Match type — select \"Practice\"\n\nThen tap Next.",
    route: '/(tabs)/record-details',
    targetKey: null,
    tooltipPosition: 'bottom',
    interactive: true,
    requireGameForm: true,
    onNextAction: 'submitGameForm',
  },
  {
    phase: 5,
    phaseLabel: 'Recording',
    title: 'Select a Set',
    body: 'Before recording, select a set number above. This tags your recordings so you can review them by set later.',
    route: '/(tabs)/record',
    targetKey: 'record:setSelector',
    tooltipPosition: 'bottom',
    interactive: true,
    requireSet: true,
  },
  {
    phase: 5,
    phaseLabel: 'Recording',
    title: 'Try Recording!',
    dynamicBody: true,
    body: "Tap the record button below to capture a clip. Create at least 3 recordings, then tap Next.",
    route: '/(tabs)/record',
    targetKey: null,
    tooltipPosition: 'top',
    interactive: true,
    requireRecordingCount: 3,
  },

  // ── Phase 6: Review Flow ──
  {
    phase: 6,
    phaseLabel: 'Review',
    title: 'Game Library',
    body: 'All your recorded games appear here, sorted by date. Your new game is highlighted above.',
    route: '/(tabs)/review',
    targetKey: 'review:tutorialGame',
    tooltipPosition: 'bottom',
  },
  {
    phase: 6,
    phaseLabel: 'Review',
    title: 'Generate AI Labels',
    body: 'Tap "Generate Recording Names" to let AI analyze your transcriptions and create descriptive labels for each recording.',
    routeKey: 'tutorialGame',
    targetKey: 'game:generateLabels',
    tooltipPosition: 'bottom',
  },
  {
    phase: 6,
    phaseLabel: 'Review',
    title: 'Listen to Recordings',
    body: 'Tap the play button on any recording to listen back. A player with seek controls will appear below the clip.',
    routeKey: 'tutorialGame',
    targetKey: 'game:firstRecording',
    tooltipPosition: 'bottom',
  },
  {
    phase: 6,
    phaseLabel: 'Review',
    title: 'Transcription & Notes',
    body: 'Tap the pencil icon to view the AI transcription and add your own manual notes. Notes are auto-saved.',
    routeKey: 'tutorialGame',
    targetKey: 'game:pencilButton',
    tooltipPosition: 'top',
  },
  {
    phase: 6,
    phaseLabel: 'Review',
    title: 'Edit Categories',
    body: 'This is the full detail view. Here you can update the recording name, skill category, position, feedback type, and tag specific players.',
    routeKey: 'tutorialRecording',
    targetKey: null,
    tooltipPosition: 'center',
  },

  // ── Phase 7: Post-Game Summary ──
  {
    phase: 7,
    phaseLabel: 'Insights',
    title: 'Post-Game Summary',
    body: 'Tap the summary icon in the top-right corner to see charts, player mentions, and AI coaching insights.',
    routeKey: 'tutorialGame',
    targetKey: 'game:summaryButton',
    tooltipPosition: 'bottom',
  },
  {
    phase: 7,
    phaseLabel: 'Insights',
    title: 'Post-Game Insights',
    body: 'This page shows skill distribution charts, player mentions, match flow timeline, and AI-synthesized coaching themes — all generated from your recordings.',
    routeKey: 'tutorialGameSummary',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    phase: 7,
    phaseLabel: 'Insights',
    title: "You're All Set!",
    body: "Sideline is ready to help you coach smarter. You can replay this tutorial anytime from Settings.\n\nHappy coaching! 🏐",
    route: '/(tabs)',
    targetKey: null,
    tooltipPosition: 'center',
  },
];

const TutorialContext = createContext(undefined);

export function TutorialProvider({ children }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const [rosterPlayerCount, setRosterPlayerCount] = useState(0);
  const [rosterPlayerNames, setRosterPlayerNames] = useState([]);
  const [gameOpponent, setGameOpponent] = useState('');
  const [gameMatchType, setGameMatchType] = useState(null);
  const [recordingCount, setRecordingCount] = useState(0);
  const [setSelected, setSetSelected] = useState(false);
  const [tutorialGameId, setTutorialGameId] = useState(null);
  const [tutorialRecordingId, setTutorialRecordingId] = useState(null);
  const targetsRef = useRef(new Map());
  const callbacksRef = useRef(new Map());
  const prevRouteRef = useRef(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const rawStep = TUTORIAL_STEPS[currentStepIndex] ?? null;
  const totalSteps = TUTORIAL_STEPS.length;

  const currentStep = useMemo(() => {
    if (!rawStep) return null;
    if (rawStep.dynamicBody && rosterPlayerNames.length >= 2) {
      const firstName = (full) => full.replace(/^#\d+\s*/, '').split(' ')[0];
      const n1 = firstName(rosterPlayerNames[0]);
      const n2 = firstName(rosterPlayerNames[1]);
      return {
        ...rawStep,
        body: `Tap the record button below. Try saying "${n1}, great kill!" or "${n2}, work on positioning." Record at least 3 clips, then tap Next.`,
      };
    }
    return rawStep;
  }, [rawStep, rosterPlayerNames]);

  const canAdvance = useMemo(() => {
    if (!rawStep) return true;
    if (rawStep.requirePlayerCount) {
      return rosterPlayerCount >= rawStep.requirePlayerCount;
    }
    if (rawStep.requireGameForm) {
      const oppOk = gameOpponent.trim().toLowerCase() === 'test run';
      const typeOk = gameMatchType === 'Practice';
      return oppOk && typeOk;
    }
    if (rawStep.requireSet) {
      return setSelected;
    }
    if (rawStep.requireRecordingCount) {
      return recordingCount >= rawStep.requireRecordingCount;
    }
    return true;
  }, [rawStep, rosterPlayerCount, gameOpponent, gameMatchType, setSelected, recordingCount]);

  useEffect(() => {
    if (authLoading || !user) return;

    let cancelled = false;
    (async () => {
      try {
        const seen = await AsyncStorage.getItem(STORAGE_KEY);
        if (!cancelled && !seen) {
          setCurrentStepIndex(0);
          setIsTutorialActive(true);
        }
      } catch {
        if (!cancelled) {
          setCurrentStepIndex(0);
          setIsTutorialActive(true);
        }
      } finally {
        if (!cancelled) setHasCheckedStorage(true);
      }
    })();
    return () => { cancelled = true; };
  }, [user, authLoading]);

  const registerTarget = useCallback((key, layout) => {
    if (layout && layout.width > 0 && layout.height > 0) {
      targetsRef.current.set(key, layout);
    }
  }, []);

  const getTarget = useCallback((key) => {
    if (!key) return null;
    return targetsRef.current.get(key) ?? null;
  }, []);

  const clearTargets = useCallback(() => {
    targetsRef.current.clear();
  }, []);

  const registerCallback = useCallback((key, fn) => {
    callbacksRef.current.set(key, fn);
    return () => callbacksRef.current.delete(key);
  }, []);

  const invokeCallback = useCallback((key, ...args) => {
    const fn = callbacksRef.current.get(key);
    if (fn) fn(...args);
  }, []);

  const executeStepAction = useCallback((step) => {
    if (!step?.action) return;
    if (step.action === 'openMenu') invokeCallback('openMenu');
    if (step.action === 'closeMenu') invokeCallback('closeMenu');
  }, [invokeCallback]);

  const resolveStepRoute = useCallback((step) => {
    if (!step) return null;
    if (step.route) return step.route;
    if (step.routeKey === 'tutorialGame' && tutorialGameId) {
      return `/(tabs)/review/game/${tutorialGameId}`;
    }
    if (step.routeKey === 'tutorialRecording' && tutorialRecordingId) {
      return `/(tabs)/review/${tutorialRecordingId}`;
    }
    if (step.routeKey === 'tutorialGameSummary' && tutorialGameId) {
      return `/(tabs)/review/game/summary/${tutorialGameId}`;
    }
    return null;
  }, [tutorialGameId, tutorialRecordingId]);

  const navigateAndSetup = useCallback((step, prevStep) => {
    const stepRoute = resolveStepRoute(step);
    const prevRoute = resolveStepRoute(prevStep);
    const routeChanged = stepRoute !== prevRoute;

    if (routeChanged && stepRoute) {
      clearTargets();
      try {
        router.replace(stepRoute);
      } catch {
        // Non-blocking
      }
    }

    const actionDelay = routeChanged ? 500 : 50;
    setTimeout(() => executeStepAction(step), actionDelay);

    prevRouteRef.current = stepRoute;
  }, [router, clearTargets, executeStepAction, resolveStepRoute]);

  const goToStep = useCallback((index) => {
    if (index < 0 || index >= totalSteps) return;
    const prevStep = TUTORIAL_STEPS[currentStepIndex] ?? null;
    const step = TUTORIAL_STEPS[index];
    setCurrentStepIndex(index);
    navigateAndSetup(step, prevStep);
  }, [totalSteps, currentStepIndex, navigateAndSetup]);

  const endTutorial = useCallback(async () => {
    setIsTutorialActive(false);
    invokeCallback('closeMenu');
    clearTargets();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Non-blocking
    }
    router.replace('/(tabs)');
  }, [router, invokeCallback, clearTargets]);

  const startTutorial = useCallback(() => {
    clearTargets();
    prevRouteRef.current = null;
    setCurrentStepIndex(0);
    setTutorialGameId(null);
    setTutorialRecordingId(null);
    setSetSelected(false);
    setIsTutorialActive(true);
    router.replace('/(tabs)');
  }, [router, clearTargets]);

  const nextStep = useCallback(() => {
    if (currentStepIndex >= totalSteps - 1) {
      endTutorial();
      return;
    }
    const currentRawStep = TUTORIAL_STEPS[currentStepIndex];
    if (currentRawStep?.onNextAction) {
      invokeCallback(currentRawStep.onNextAction);
      setCurrentStepIndex(currentStepIndex + 1);
      return;
    }
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, totalSteps, goToStep, endTutorial, invokeCallback]);

  const prevStep = useCallback(() => {
    if (currentStepIndex <= 0) return;
    goToStep(currentStepIndex - 1);
  }, [currentStepIndex, goToStep]);

  const value = useMemo(() => ({
    isTutorialActive,
    currentStep,
    currentStepIndex,
    totalSteps,
    hasCheckedStorage,
    canAdvance,
    rosterPlayerCount,
    tutorialGameId,
    tutorialRecordingId,
    startTutorial,
    nextStep,
    prevStep,
    endTutorial,
    registerTarget,
    getTarget,
    clearTargets,
    registerCallback,
    invokeCallback,
    setRosterPlayerCount,
    setRosterPlayerNames,
    setGameOpponent,
    setGameMatchType,
    recordingCount,
    setRecordingCount,
    setSetSelected,
    setTutorialGameId,
    setTutorialRecordingId,
  }), [
    isTutorialActive, currentStep, currentStepIndex, totalSteps, hasCheckedStorage,
    canAdvance, rosterPlayerCount, recordingCount, setSelected, tutorialGameId, tutorialRecordingId,
    startTutorial, nextStep, prevStep, endTutorial,
    registerTarget, getTarget, clearTargets,
    registerCallback, invokeCallback,
  ]);

  return (
    <TutorialContext.Provider value={value}>
      {children}
    </TutorialContext.Provider>
  );
}

export function useTutorial() {
  const ctx = useContext(TutorialContext);
  if (!ctx) throw new Error('useTutorial must be used within TutorialProvider');
  return ctx;
}

export { TUTORIAL_STEPS };
