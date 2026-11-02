import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  AppState,
  Platform,
} from 'react-native';

import {
  useFocusEffect,
} from 'expo-router';

import * as Notifications from 'expo-notifications';

import {
  getUnreadMessageCount,
} from './api';

import {
  getAccessToken,
  onSessionClear,
} from './session';

// ============================================================
// UNREAD MESSAGES
//
// The number on the Chat tab. Every screen has its own bottom
// bar, so the count is shared from here: one timer runs while
// any bar is open, and a bar that just opened shows the right
// number straight away.
// ============================================================

const REFRESH_MS =
  15000;

let unread =
  0;

let latestLoad =
  0;

let stopWatching:
  | (() => void)
  | null = null;

const listeners =
  new Set<
    (count: number) => void
  >();

function publish(
  count: number
) {
  unread = count;

  listeners.forEach(
    listener =>
      listener(count)
  );
}

async function refreshUnreadMessages() {
  if (
    AppState.currentState !==
    'active'
  ) {
    return;
  }

  latestLoad += 1;

  const load =
    latestLoad;

  try {
    const token =
      await getAccessToken();

    if (!token) {
      return;
    }

    const result =
      await getUnreadMessageCount(
        token
      );

    // Skip an answer that arrives after signing out, or after
    // a newer load started.
    if (
      load ===
      latestLoad
    ) {
      publish(
        result.unread_count ||
          0
      );
    }
  } catch {
    // Offline or server busy: keep the last number.
  }
}

function startWatching() {
  const timer =
    setInterval(
      refreshUnreadMessages,
      REFRESH_MS
    );

  const appState =
    AppState.addEventListener(
      'change',
      state => {
        if (
          state ===
          'active'
        ) {
          refreshUnreadMessages();
        }
      }
    );

  // A notification arrived while the app is open.
  const received =
    Platform.OS === 'web'
      ? null
      : Notifications.addNotificationReceivedListener(
          () => {
            refreshUnreadMessages();
          }
        );

  return () => {
    clearInterval(timer);

    appState.remove();

    received?.remove();
  };
}

onSessionClear(() => {
  latestLoad += 1;

  publish(0);
});

export function useUnreadMessages() {
  const [
    count,
    setCount,
  ] = useState(unread);

  useEffect(() => {
    listeners.add(setCount);

    setCount(unread);

    if (!stopWatching) {
      stopWatching =
        startWatching();
    }

    return () => {
      listeners.delete(setCount);

      if (
        !listeners.size &&
        stopWatching
      ) {
        stopWatching();

        stopWatching = null;
      }
    };
  }, []);

  // Back on this screen, e.g. after reading a chat.
  useFocusEffect(
    useCallback(() => {
      refreshUnreadMessages();
    }, [])
  );

  return count;
}
