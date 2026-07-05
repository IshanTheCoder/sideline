import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { useAuth } from '@/contexts/AuthContext';

const STORAGE_KEY = 'sideline.hasCompletedOnboarding';

const TUTORIAL_STEPS = [
  {
    title: 'Welcome to Sideline!',
    body: 'This is your home base. Start recordings, view recent games, and access every feature from here.',
    route: '/(tabs)/home',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    title: 'Start Recording',
    body: "Tap here to record during a game. You'll set up game details first.",
    route: '/(tabs)/home',
    targetKey: 'home:startRecording',
    tooltipPosition: 'bottom',
  },
  {
    title: 'Recent Games',
    body: 'Your recorded games show up here sorted by date. Tap any game to review it.',
    route: '/(tabs)/home',
    targetKey: 'home:recentGames',
    tooltipPosition: 'top',
  },
  {
    title: 'Navigation Menu',
    body: 'Open the menu to jump between Home, Roster, Recording, Review, and Settings.',
    route: '/(tabs)/home',
    targetKey: 'home:hamburger',
    tooltipPosition: 'bottom',
  },
  {
    title: 'Roster',
    body: 'Build your team roster here. Add players manually or import from a photo of your roster.',
    route: '/(tabs)/roster',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    title: 'Game Setup',
    body: 'Before recording, enter your opponent and match type to keep sessions organized.',
    route: '/(tabs)/record-details',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    title: 'Recording',
    body: 'During a game, select a set and tap record. Recordings are auto-transcribed by AI.',
    route: '/(tabs)/record',
    targetKey: 'record:recordButton',
    tooltipPosition: 'top',
  },
  {
    title: 'Game Library',
    body: 'All games live here. Tap one to listen back, view transcriptions, and get AI insights.',
    route: '/(tabs)/review',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    title: 'Settings',
    body: 'Update your profile, team name, and account security. Replay this tutorial anytime here.',
    route: '/(tabs)/settings',
    targetKey: null,
    tooltipPosition: 'center',
  },
  {
    title: "You're All Set!",
    body: "Sideline is ready to help you coach smarter. Happy coaching! 🏐",
    route: '/(tabs)/home',
    targetKey: null,
    tooltipPosition: 'center',
  },
];

const TutorialContext = createContext(undefined);

export function TutorialProvider({ children }) {
  const [isTutorialActive, setIsTutorialActive] = useState(false);
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [hasCheckedStorage, setHasCheckedStorage] = useState(false);
  const targetsRef = useRef(new Map());
  const prevRouteRef = useRef(null);
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();

  const currentStep = TUTORIAL_STEPS[currentStepIndex] ?? null;
  const totalSteps = TUTORIAL_STEPS.length;

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

  const navigateToStep = useCallback((step, prevStep) => {
    const routeChanged = step.route !== (prevStep?.route ?? null);

    if (routeChanged && step.route) {
      clearTargets();
      try {
        router.replace(step.route);
      } catch {
        // Non-blocking
      }
    }

    prevRouteRef.current = step.route;
  }, [router, clearTargets]);

  const goToStep = useCallback((index) => {
    if (index < 0 || index >= totalSteps) return;
    const prevStep = TUTORIAL_STEPS[currentStepIndex] ?? null;
    const step = TUTORIAL_STEPS[index];
    setCurrentStepIndex(index);
    navigateToStep(step, prevStep);
  }, [totalSteps, currentStepIndex, navigateToStep]);

  const endTutorial = useCallback(async () => {
    setIsTutorialActive(false);
    clearTargets();
    try {
      await AsyncStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Non-blocking
    }
    router.replace('/(tabs)/home');
  }, [router, clearTargets]);

  const startTutorial = useCallback(() => {
    clearTargets();
    prevRouteRef.current = null;
    setCurrentStepIndex(0);
    setIsTutorialActive(true);
    router.replace('/(tabs)/home');
  }, [router, clearTargets]);

  const nextStep = useCallback(() => {
    if (currentStepIndex >= totalSteps - 1) {
      endTutorial();
      return;
    }
    goToStep(currentStepIndex + 1);
  }, [currentStepIndex, totalSteps, goToStep, endTutorial]);

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
    startTutorial,
    nextStep,
    prevStep,
    endTutorial,
    registerTarget,
    getTarget,
    clearTargets,
  }), [
    isTutorialActive, currentStep, currentStepIndex, totalSteps, hasCheckedStorage,
    startTutorial, nextStep, prevStep, endTutorial,
    registerTarget, getTarget, clearTargets,
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
