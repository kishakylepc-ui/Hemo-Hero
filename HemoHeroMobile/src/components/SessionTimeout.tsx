import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  AppState,
  Keyboard,
  Platform,
  StyleSheet,
  View,
} from 'react-native';

import { usePathname } from 'expo-router';

import AppModal from './AppModal';

import {
  getAccessToken,
  getLastActivity,
  getLogoutReason,
  SESSION_STORAGE_KEYS,
  setLastActivity,
  setLogoutReason,
} from '../lib/session';

import {
  endIdleSession,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
} from '../lib/sessionTimeout';

import { goToSignIn } from '../lib/signInRoute';

// ============================================================
// SESSION TIMEOUT
//
// Wraps the whole app (app/_layout.tsx):
//
// - 15 minutes without a touch or typing signs the user out,
//   with a warning and a countdown 1 minute before
//   (lib/sessionTimeout.ts). Coming back to the app after 15
//   minutes in the background signs out too.
// - Web: a typed address or the Back button after signing out
//   goes to Sign In, and signing out in one tab sends every
//   other tab to Sign In.
// ============================================================

// Screens that work without signing in.
const PUBLIC_ROUTES = [
  '/',
  '/signup',
  '/verify-email',
  '/forgot-password',
  '/reset-password',
  '/privacy-policy',
  '/terms-of-service',
];

// How often activity is saved (survives closing the app; other
// browser tabs see it).
const SAVE_EVERY_MS = 5000;

function formatSeconds(seconds: number) {
  return `${Math.floor(seconds / 60)}:${String(
    seconds % 60
  ).padStart(2, '0')}`;
}

export default function SessionTimeout({
  children,
}: {
  children: ReactNode;
}) {
  const pathname = usePathname();

  // ==========================================================
  // STATE
  // ==========================================================

  // A session this app has checked.
  const [signedIn, setSignedIn] =
    useState(false);

  // Seconds left while the warning shows.
  const [warningSeconds, setWarningSeconds] =
    useState<number | null>(null);

  const [signingOut, setSigningOut] =
    useState(false);

  // Read inside listeners and timers.
  const pathnameRef = useRef(pathname);

  pathnameRef.current = pathname;

  const signedInRef = useRef(false);
  const lastActivityRef = useRef(Date.now());
  const lastSavedRef = useRef(0);
  const warningRef = useRef(false);
  const endingRef = useRef(false);
  const retryAfterRef = useRef(0);

  function hideWarning() {
    warningRef.current = false;

    setWarningSeconds(null);
  }

  function endLocally() {
    signedInRef.current = false;

    setSignedIn(false);

    hideWarning();
  }

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  async function signOutForInactivity() {
    if (
      endingRef.current ||
      Date.now() < retryAfterRef.current
    ) {
      return;
    }

    endingRef.current = true;

    setSigningOut(true);

    try {
      const result =
        await endIdleSession();

      // Another browser tab is signing out; this tab follows
      // when the session is cleared.
      if (result === 'other_tab') {
        retryAfterRef.current =
          Date.now() + 5000;

        return;
      }

      endLocally();

      goToSignIn('inactivity');
    } finally {
      endingRef.current = false;

      setSigningOut(false);
    }
  }

  // ==========================================================
  // SESSION CHECK
  //
  // On every screen change and when the app comes back.
  // ==========================================================

  const checkSession =
    useCallback(async () => {
      const token =
        await getAccessToken();

      if (!token) {
        if (signedInRef.current) {
          endLocally();
        }

        // Web: a typed address, or Back after signing out.
        if (
          Platform.OS === 'web' &&
          !PUBLIC_ROUTES.includes(
            pathnameRef.current
          )
        ) {
          goToSignIn();
        }

        return;
      }

      if (signedInRef.current) {
        return;
      }

      // Just signed in, or the app was opened again: the
      // session may have gone unused too long.
      const lastActivity =
        await getLastActivity();

      if (
        lastActivity !== null &&
        Date.now() - lastActivity >=
          IDLE_TIMEOUT_MS
      ) {
        void signOutForInactivity();

        return;
      }

      const now = Date.now();

      if (lastActivity === null) {
        // A new session.
        await setLastActivity(now);
        await setLogoutReason(null);
      }

      lastActivityRef.current =
        lastActivity ?? now;

      signedInRef.current = true;

      setSignedIn(true);
    }, []);

  useEffect(() => {
    void checkSession();
  }, [pathname, checkSession]);

  // ==========================================================
  // ACTIVITY
  // ==========================================================

  const markActive = useCallback(
    (force = false) => {
      if (
        !signedInRef.current ||
        endingRef.current
      ) {
        return;
      }

      // Once the warning shows, only its button keeps the
      // session.
      if (
        warningRef.current &&
        !force
      ) {
        return;
      }

      const now = Date.now();

      lastActivityRef.current = now;

      if (
        force ||
        now - lastSavedRef.current >=
          SAVE_EVERY_MS
      ) {
        lastSavedRef.current = now;

        void setLastActivity(now);
      }

      if (warningRef.current) {
        hideWarning();
      }
    },
    []
  );

  // Typing (the keyboard is outside the app's touch area).
  useEffect(() => {
    const shown =
      Keyboard.addListener(
        'keyboardDidShow',
        () => markActive()
      );

    return () => shown.remove();
  }, [markActive]);

  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(() => {
    if (!signedIn) {
      return;
    }

    function check() {
      const idle =
        Date.now() -
        lastActivityRef.current;

      if (idle >= IDLE_TIMEOUT_MS) {
        void signOutForInactivity();

        return;
      }

      if (
        idle >=
        IDLE_TIMEOUT_MS - IDLE_WARNING_MS
      ) {
        warningRef.current = true;

        setWarningSeconds(
          Math.max(
            1,
            Math.ceil(
              (IDLE_TIMEOUT_MS - idle) /
                1000
            )
          )
        );
      } else if (warningRef.current) {
        hideWarning();
      }
    }

    check();

    const timer = setInterval(
      check,
      1000
    );

    // Timers stop in the background; check on return.
    const appState =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            check();
          }
        }
      );

    return () => {
      clearInterval(timer);

      appState.remove();
    };
  }, [signedIn]);

  // Signed out elsewhere while in the background (e.g. the
  // session expired): check the session on return.
  useEffect(() => {
    const appState =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            void checkSession();
          }
        }
      );

    return () => appState.remove();
  }, [checkSession]);

  // ==========================================================
  // BROWSER: ACTIVITY + OTHER TABS
  // ==========================================================

  useEffect(() => {
    if (
      Platform.OS !== 'web' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    const onActivity = () =>
      markActive();

    const activityEvents = [
      'mousedown',
      'mousemove',
      'keydown',
      'touchstart',
      'wheel',
      'scroll',
    ];

    for (const name of activityEvents) {
      window.addEventListener(
        name,
        onActivity,
        {
          capture: true,
          passive: true,
        }
      );
    }

    function onStorage(
      event: StorageEvent
    ) {
      // Activity in another tab.
      if (
        event.key ===
          SESSION_STORAGE_KEYS.lastActivity &&
        event.newValue
      ) {
        const time = Number(
          event.newValue
        );

        if (
          Number.isFinite(time) &&
          time > lastActivityRef.current
        ) {
          lastActivityRef.current = time;

          if (warningRef.current) {
            hideWarning();
          }
        }

        return;
      }

      // Signed out in another tab (or storage cleared).
      const signedOut =
        (event.key ===
          SESSION_STORAGE_KEYS.accessToken &&
          !event.newValue) ||
        event.key === null;

      if (
        !signedOut ||
        PUBLIC_ROUTES.includes(
          pathnameRef.current
        )
      ) {
        return;
      }

      void (async () => {
        const reason =
          await getLogoutReason();

        endLocally();

        goToSignIn(reason);
      })();
    }

    window.addEventListener(
      'storage',
      onStorage
    );

    // Browser Back can bring a whole page back from its cache,
    // as it was: check the session again.
    function onPageShow(
      event: PageTransitionEvent
    ) {
      if (event.persisted) {
        signedInRef.current = false;

        void checkSession();
      }
    }

    window.addEventListener(
      'pageshow',
      onPageShow
    );

    return () => {
      for (const name of activityEvents) {
        window.removeEventListener(
          name,
          onActivity,
          true
        );
      }

      window.removeEventListener(
        'storage',
        onStorage
      );

      window.removeEventListener(
        'pageshow',
        onPageShow
      );
    };
  }, [markActive, checkSession]);

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={styles.root}
      // Every touch counts as activity; never takes the touch
      // from the screen.
      onStartShouldSetResponderCapture={() => {
        markActive();

        return false;
      }}
    >
      {children}

      <AppModal
        visible={warningSeconds !== null}
        variant="warning"
        icon="timer"
        title="Are you still there?"
        message={
          signingOut
            ? 'Signing you out...'
            : `You haven't used Hemo-Hero for a while. For your security, you'll be signed out in ${formatSeconds(
                warningSeconds || 0
              )}.`
        }
        confirmLabel="Stay Signed In"
        loading={signingOut}
        onConfirm={() => markActive(true)}
        onClose={() => markActive(true)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
});
