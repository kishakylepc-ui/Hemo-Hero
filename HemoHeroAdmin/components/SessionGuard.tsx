import {
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import { usePathname } from 'expo-router';

import { useAdminCanvas } from './AdminCanvas';

import { logoutAdmin } from '../lib/api';

import { isAdminRole } from '../lib/roles';

import {
  ADMIN_STORAGE_KEYS,
  clearAdminSession,
  getAdminAccessToken,
  getAdminLastActivity,
  getAdminLogoutReason,
  getAdminProfile,
  setAdminLastActivity,
  setAdminLogoutReason,
} from '../lib/session';

import {
  endIdleAdminSession,
  IDLE_TIMEOUT_MS,
  IDLE_WARNING_MS,
} from '../lib/sessionTimeout';

import { goToAdminSignIn } from '../lib/signInRoute';

// ============================================================
// SESSION GUARD
//
// Wraps every Admin Portal screen (app/_layout.tsx):
//
// - Pages other than sign-in open only with a saved admin
//   session, so a typed URL or the Back button after signing
//   out goes to sign-in (the page stays covered until checked).
// - 15 minutes without activity signs the admin out, with a
//   warning and a countdown 1 minute before
//   (lib/sessionTimeout.ts).
// - Signing out in one tab sends every other tab to sign-in.
// ============================================================

const COLORS = {
  screen: '#050812',
  card: '#0B142A',
  cardLight: '#101A35',
  border: '#243554',
  white: '#FFFFFF',
  soft: '#B7C1D8',
  orange: '#F3A34A',
  orangeTint: 'rgba(243,163,74,0.12)',
  red: '#DB0A0A',
  redBright: '#EF3340',
};

// How often activity is written to storage for the other tabs.
const SAVE_EVERY_MS =
  5000;

function formatSeconds(
  seconds: number
) {
  return `${Math.floor(
    seconds / 60
  )}:${String(
    seconds % 60
  ).padStart(2, '0')}`;
}

export default function SessionGuard({
  children,
}: {
  children: ReactNode;
}) {
  const pathname =
    usePathname();

  const tablet =
    useAdminCanvas();

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  const fs =
    Math.max(
      tablet.scale,
      0.92
    );

  const onSignIn =
    pathname === '/';

  // ==========================================================
  // STATE
  // ==========================================================

  // Signed in, checked for this tab.
  const [
    verified,
    setVerified,
  ] = useState(false);

  // Seconds left while the warning shows.
  const [
    warningSeconds,
    setWarningSeconds,
  ] = useState<number | null>(
    null
  );

  const [
    signingOut,
    setSigningOut,
  ] = useState(false);

  // Read inside listeners and timers.
  const verifiedRef =
    useRef(false);

  const onSignInRef =
    useRef(onSignIn);

  onSignInRef.current =
    onSignIn;

  const lastActivityRef =
    useRef(Date.now());

  const lastSavedRef =
    useRef(0);

  const warningRef =
    useRef(false);

  const endingRef =
    useRef(false);

  const retryAfterRef =
    useRef(0);

  function hideWarning() {
    warningRef.current =
      false;

    setWarningSeconds(null);
  }

  function endLocally() {
    verifiedRef.current =
      false;

    setVerified(false);

    hideWarning();
  }

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  async function signOutForInactivity() {
    if (
      endingRef.current ||
      Date.now() <
        retryAfterRef.current
    ) {
      return;
    }

    endingRef.current =
      true;

    setSigningOut(true);

    try {
      const result =
        await endIdleAdminSession();

      // Another tab is signing out; this tab follows when the
      // session is cleared. Check again later in case that tab
      // was closed.
      if (
        result ===
        'other_tab'
      ) {
        retryAfterRef.current =
          Date.now() +
          5000;

        return;
      }

      endLocally();

      goToAdminSignIn(
        'inactivity'
      );
    } finally {
      endingRef.current =
        false;

      setSigningOut(false);
    }
  }

  // "Sign Out" in the warning.
  async function signOutNow() {
    if (
      endingRef.current
    ) {
      return;
    }

    endingRef.current =
      true;

    setSigningOut(true);

    try {
      const token =
        await getAdminAccessToken();

      // Before clearing, so other tabs show why.
      await setAdminLogoutReason(
        'signed_out'
      );

      if (token) {
        try {
          await logoutAdmin(
            token
          );
        } catch (error) {
          console.log(
            'ADMIN SERVER LOGOUT ERROR:',
            error
          );
        }
      }

      await clearAdminSession();

      endLocally();

      goToAdminSignIn();
    } finally {
      endingRef.current =
        false;

      setSigningOut(false);
    }
  }

  // ==========================================================
  // ACTIVITY
  // ==========================================================

  const markActive =
    useCallback(
      (
        force = false
      ) => {
        if (
          !verifiedRef.current ||
          endingRef.current
        ) {
          return;
        }

        // Once the warning shows, only its button keeps the
        // session (not a stray mouse move).
        if (
          warningRef.current &&
          !force
        ) {
          return;
        }

        const now =
          Date.now();

        lastActivityRef.current =
          now;

        if (
          force ||
          now -
            lastSavedRef.current >=
            SAVE_EVERY_MS
        ) {
          lastSavedRef.current =
            now;

          void setAdminLastActivity(
            now
          );
        }

        if (
          warningRef.current
        ) {
          hideWarning();
        }
      },
      []
    );

  // ==========================================================
  // PAGE GUARD
  // ==========================================================

  // isCurrent: false once a newer check has started.
  async function verifySession(
    isCurrent: () => boolean
  ) {
    const token =
      await getAdminAccessToken();

    const profile =
      await getAdminProfile();

    if (!isCurrent()) {
      return;
    }

    if (
      !token ||
      !isAdminRole(
        profile?.role
      )
    ) {
      endLocally();

      goToAdminSignIn();

      return;
    }

    if (
      verifiedRef.current
    ) {
      return;
    }

    // First page of this session in this tab: the session may
    // have gone unused (browser closed and reopened).
    const lastActivity =
      await getAdminLastActivity();

    if (!isCurrent()) {
      return;
    }

    if (
      lastActivity !==
        null &&
      Date.now() -
        lastActivity >=
        IDLE_TIMEOUT_MS
    ) {
      void signOutForInactivity();

      return;
    }

    lastActivityRef.current =
      lastActivity ??
      Date.now();

    if (
      lastActivity ===
      null
    ) {
      void setAdminLastActivity(
        lastActivityRef.current
      );
    }

    verifiedRef.current =
      true;

    setVerified(true);
  }

  useEffect(
    () => {
      let active = true;

      if (onSignIn) {
        endLocally();

        return;
      }

      void verifySession(
        () => active
      );

      return () => {
        active = false;
      };
    },
    [
      pathname,
    ]
  );

  // Browser Back can bring a whole page back from its cache,
  // as it was. Cover it and check the session again.
  useEffect(
    () => {
      if (
        Platform.OS !==
          'web' ||
        typeof window ===
          'undefined'
      ) {
        return;
      }

      function onPageShow(
        event: PageTransitionEvent
      ) {
        if (
          !event.persisted ||
          onSignInRef.current
        ) {
          return;
        }

        verifiedRef.current =
          false;

        setVerified(false);

        void verifySession(
          () => true
        );
      }

      window.addEventListener(
        'pageshow',
        onPageShow
      );

      return () =>
        window.removeEventListener(
          'pageshow',
          onPageShow
        );
    },
    []
  );

  // ==========================================================
  // TIMER
  // ==========================================================

  useEffect(
    () => {
      if (!verified) {
        return;
      }

      function check() {
        const idle =
          Date.now() -
          lastActivityRef.current;

        if (
          idle >=
          IDLE_TIMEOUT_MS
        ) {
          void signOutForInactivity();

          return;
        }

        if (
          idle >=
          IDLE_TIMEOUT_MS -
            IDLE_WARNING_MS
        ) {
          warningRef.current =
            true;

          setWarningSeconds(
            Math.max(
              1,
              Math.ceil(
                (IDLE_TIMEOUT_MS -
                  idle) /
                  1000
              )
            )
          );
        } else if (
          warningRef.current
        ) {
          hideWarning();
        }
      }

      check();

      const timer =
        setInterval(
          check,
          1000
        );

      // iPad: timers pause in the background; check on return.
      const appState =
        AppState.addEventListener(
          'change',
          state => {
            if (
              state ===
              'active'
            ) {
              check();
            }
          }
        );

      return () => {
        clearInterval(timer);

        appState.remove();
      };
    },
    [
      verified,
    ]
  );

  // ==========================================================
  // BROWSER: ACTIVITY + OTHER TABS
  // ==========================================================

  useEffect(
    () => {
      if (
        Platform.OS !==
          'web' ||
        typeof window ===
          'undefined'
      ) {
        return;
      }

      const onActivity =
        () =>
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
            ADMIN_STORAGE_KEYS.lastActivity &&
          event.newValue
        ) {
          const time =
            Number(
              event.newValue
            );

          if (
            Number.isFinite(time) &&
            time >
              lastActivityRef.current
          ) {
            lastActivityRef.current =
              time;

            if (
              warningRef.current
            ) {
              hideWarning();
            }
          }

          return;
        }

        // Signed out in another tab (or storage cleared).
        const signedOut =
          (event.key ===
            ADMIN_STORAGE_KEYS.accessToken &&
            !event.newValue) ||
          event.key === null;

        if (
          !signedOut ||
          onSignInRef.current
        ) {
          return;
        }

        void (async () => {
          const reason =
            await getAdminLogoutReason();

          endLocally();

          goToAdminSignIn(
            reason
          );
        })();
      }

      window.addEventListener(
        'storage',
        onStorage
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
      };
    },
    [
      markActive,
    ]
  );

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={styles.root}
      // Every touch (iPad) counts as activity; never takes
      // the touch from the screen.
      onStartShouldSetResponderCapture={() => {
        markActive();

        return false;
      }}
    >
      {children}

      {/* Covers a page until the session is checked */}

      {!onSignIn &&
      !verified ? (
        <View
          style={styles.cover}
        >
          <ActivityIndicator
            size="large"
            color={
              COLORS.redBright
            }
          />
        </View>
      ) : null}

      <Modal
        transparent
        visible={
          warningSeconds !==
          null
        }
        animationType="fade"
        statusBarTranslucent
        supportedOrientations={[
          'portrait',
          'landscape',
        ]}
        onRequestClose={() =>
          markActive(true)
        }
      >
        <View
          style={
            styles.backdrop
          }
        >
          <View
            style={[
              styles.card,

              {
                width:
                  500 * s,

                borderRadius:
                  18 * s,

                padding:
                  26 * s,
              },
            ]}
          >
            <View
              style={[
                styles.iconWrap,

                {
                  width:
                    56 * s,

                  height:
                    56 * s,

                  borderRadius:
                    28 * s,
                },
              ]}
            >
              <MaterialIcons
                name="timer"
                size={
                  29 * s
                }
                color={
                  COLORS.orange
                }
              />
            </View>

            <Text
              style={[
                styles.title,

                {
                  fontSize:
                    20 * fs,

                  lineHeight:
                    27 * fs,

                  marginTop:
                    17 * s,
                },
              ]}
            >
              Are you still there?
            </Text>

            <Text
              style={[
                styles.message,

                {
                  fontSize:
                    14 * fs,

                  lineHeight:
                    22 * fs,

                  marginTop:
                    8 * s,
                },
              ]}
            >
              {signingOut
                ? 'Signing you out...'
                : `You haven't used the Admin Portal for a while. For security, you'll be signed out in ${formatSeconds(
                    warningSeconds ||
                      0
                  )}.`}
            </Text>

            <View
              style={[
                styles.actions,

                {
                  gap:
                    10 * s,

                  marginTop:
                    24 * s,
                },
              ]}
            >
              <Pressable
                disabled={
                  signingOut
                }
                onPress={() =>
                  void signOutNow()
                }
                style={({
                  pressed,
                }) => [
                  styles.secondaryButton,

                  {
                    height:
                      48 * s,

                    borderRadius:
                      10 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.secondaryText,

                    {
                      fontSize:
                        13 * fs,
                    },
                  ]}
                >
                  Sign Out
                </Text>
              </Pressable>

              <Pressable
                disabled={
                  signingOut
                }
                onPress={() =>
                  markActive(true)
                }
                style={({
                  pressed,
                }) => [
                  styles.primaryButton,

                  {
                    height:
                      48 * s,

                    borderRadius:
                      10 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                {signingOut ? (
                  <ActivityIndicator
                    color={
                      COLORS.white
                    }
                  />
                ) : (
                  <Text
                    style={[
                      styles.primaryText,

                      {
                        fontSize:
                          13 * fs,
                      },
                    ]}
                  >
                    Stay Signed In
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles =
  StyleSheet.create({
    root: {
      flex: 1,
    },

    cover: {
      position: 'absolute',
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.screen,
    },

    backdrop: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        'rgba(2,4,10,0.78)',
    },

    card: {
      maxWidth: '88%',
      alignItems: 'center',
      borderWidth: 1,
      borderColor:
        COLORS.orange,
      backgroundColor:
        COLORS.card,
      shadowColor: '#000000',
      shadowOpacity: 0.35,
      shadowRadius: 24,
      shadowOffset: {
        width: 0,
        height: 14,
      },
      elevation: 18,
    },

    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.orangeTint,
    },

    title: {
      color: COLORS.white,
      fontFamily:
        'Poppins_600SemiBold',
      textAlign: 'center',
    },

    message: {
      maxWidth: 430,
      color: COLORS.soft,
      fontFamily:
        'Inter_400Regular',
      textAlign: 'center',
    },

    actions: {
      width: '100%',
      flexDirection: 'row',
      alignItems: 'center',
    },

    secondaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor:
        COLORS.border,
      backgroundColor:
        COLORS.cardLight,
    },

    secondaryText: {
      color: COLORS.soft,
      fontFamily:
        'Inter_600SemiBold',
    },

    primaryButton: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor:
        COLORS.red,
    },

    primaryText: {
      color: COLORS.white,
      fontFamily:
        'Inter_600SemiBold',
    },

    pressed: {
      opacity: 0.82,
    },
  });
