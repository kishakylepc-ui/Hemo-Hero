import {
  useCallback,
  useEffect,
  useRef,
} from 'react';

import {
  AppState,
  Platform,
} from 'react-native';

import {
  useFocusEffect,
} from 'expo-router';

import * as Notifications from 'expo-notifications';

// ============================================================
// LIVE REFRESH
//
// Keeps a screen's statuses current while it's on screen: it
// checks on a timer, when the app comes back, and when a
// notification arrives. It stops when you leave the screen or
// the app goes to the background.
//
// `refresh` has to be quiet: no spinners, nothing typed gets
// replaced, and a failed check leaves the screen as it is.
// ============================================================

export const LIVE_REFRESH_MS =
  10000;

// For screens that load more, like lists based on location.
export const LIVE_REFRESH_SLOW_MS =
  30000;

export function useLiveRefresh(
  refresh: () => unknown,
  intervalMs = LIVE_REFRESH_MS
) {
  // The latest version, so a check uses the current filters.
  const latestRefresh =
    useRef(refresh);

  useEffect(() => {
    latestRefresh.current =
      refresh;
  });

  useFocusEffect(
    useCallback(() => {
      let running =
        false;

      async function check() {
        if (
          running ||
          AppState.currentState !==
            'active'
        ) {
          return;
        }

        running = true;

        try {
          await latestRefresh.current();
        } catch (error) {
          console.log(
            'LIVE REFRESH ERROR:',
            error
          );
        } finally {
          running = false;
        }
      }

      const timer =
        setInterval(
          check,
          intervalMs
        );

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

      const received =
        Platform.OS === 'web'
          ? null
          : Notifications.addNotificationReceivedListener(
              () => {
                check();
              }
            );

      return () => {
        clearInterval(timer);

        appState.remove();

        received?.remove();
      };
    }, [intervalMs])
  );
}
