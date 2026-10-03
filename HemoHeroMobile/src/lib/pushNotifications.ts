import { Platform } from 'react-native';

import Constants from 'expo-constants';
import { isRunningInExpoGo } from 'expo';
import * as Notifications from 'expo-notifications';

import { authorizedFetch } from './authFetch';
import { API_URL } from './apiUrl';
import { getNotifications } from './api';
import type { AppNotification } from './api';
import {
  getAccessToken,
  onSessionClear,
} from './session';

// ============================================================
// PUSH NOTIFICATIONS
//
// Two ways a phone gets Hemo-Hero notifications:
//
//   'remote'  The phone registers an Expo push token with the
//             server, and every notification is pushed to it,
//             even when the app is closed. Works in iOS Expo Go
//             and in development/store builds.
//
//   'local'   Android Expo Go can't receive remote pushes
//             (SDK 53+). The app checks for new notifications
//             while it's running and shows each one as a system
//             notification.
//
// Notifications are not shown for the chat the person is
// currently looking at.
// ============================================================

export type PushMode =
  | 'remote'
  | 'local'
  | 'off';

const CHANNEL_ID = 'default';

// How often 'local' mode checks for new notifications.
const LOCAL_POLL_MS = 15000;

let registeredToken: string | null = null;

let mode: PushMode = 'off';

let registration: Promise<PushMode> | null = null;

// Chat on screen right now (its message alerts stay quiet).
let activeConversationId: string | null = null;

export function setActiveConversation(
  responseId: string | null
) {
  activeConversationId = responseId;
}

// ------------------------------------------------------------
// FOREGROUND DISPLAY
// ------------------------------------------------------------

if (Platform.OS !== 'web') {
  Notifications.setNotificationHandler({
    handleNotification: async notification => {
      const data =
        (notification.request.content.data || {}) as Record<string, unknown>;

      const inThisChat =
        Boolean(activeConversationId) &&
        data.response_id === activeConversationId &&
        data.type === 'coordination_message';

      return {
        shouldShowBanner: !inThisChat,
        shouldShowList: !inThisChat,
        shouldPlaySound: !inThisChat,
        shouldSetBadge: false,
      };
    },
  });
}

// ------------------------------------------------------------
// REGISTER
// ------------------------------------------------------------

function getProjectId() {
  return (
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId ??
    null
  );
}

async function register(): Promise<PushMode> {
  if (Platform.OS === 'web') {
    return 'off';
  }

  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync(CHANNEL_ID, {
      name: 'Hemo-Hero alerts',
      importance: Notifications.AndroidImportance.HIGH,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#B42323',
    });
  }

  let permission = await Notifications.getPermissionsAsync();

  if (!permission.granted && permission.canAskAgain) {
    permission = await Notifications.requestPermissionsAsync();
  }

  if (!permission.granted) {
    return 'off';
  }

  const projectId = getProjectId();

  if (
    (Platform.OS === 'android' && isRunningInExpoGo()) ||
    !projectId
  ) {
    return 'local';
  }

  try {
    const { data: token } =
      await Notifications.getExpoPushTokenAsync({ projectId });

    const response = await authorizedFetch(
      `${API_URL}/api/notifications/push-token`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${await getAccessToken()}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          token,
          platform: Platform.OS,
        }),
      }
    );

    if (!response.ok) {
      throw new Error(`Push token not saved (${response.status}).`);
    }

    registeredToken = token;

    return 'remote';
  } catch (error) {
    // No remote push here: still show notifications while the
    // app is running.
    console.log('PUSH REGISTRATION ERROR:', error);

    return 'local';
  }
}

// Once per signed-in session. Safe to call often (app start,
// returning to the app, the dashboard).
export async function ensurePushRegistered(): Promise<PushMode> {
  if (!(await getAccessToken())) {
    return 'off';
  }

  if (!registration) {
    registration = register()
      .then(result => {
        mode = result;

        return result;
      })
      .catch(error => {
        console.log('PUSH SETUP ERROR:', error);

        registration = null;

        return 'off' as PushMode;
      });
  }

  return registration;
}

export function getPushMode() {
  return mode;
}

// ------------------------------------------------------------
// UNREGISTER (signing out)
//
// Plain fetch: this runs while the session is ending, so it
// must not try to refresh it.
// ------------------------------------------------------------

export async function unregisterPushNotifications(
  accessToken: string | null
) {
  const token = registeredToken;

  registeredToken = null;
  registration = null;
  mode = 'off';
  seenNotificationIds = null;

  if (!token || !accessToken) {
    return;
  }

  try {
    await fetch(`${API_URL}/api/notifications/push-token`, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ token }),
    });
  } catch (error) {
    console.log('PUSH UNREGISTER ERROR:', error);
  }
}

// Any sign-out path (expired session, password change...).
onSessionClear(unregisterPushNotifications);

// ------------------------------------------------------------
// 'LOCAL' MODE: show new notifications while the app runs
// ------------------------------------------------------------

// Null until the first check, which only records what's there.
let seenNotificationIds: Set<string> | null = null;

async function checkForNewNotifications() {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return;
  }

  const result = await getNotifications(accessToken, 20);

  const notifications: AppNotification[] =
    result?.notifications || [];

  if (!seenNotificationIds) {
    seenNotificationIds = new Set(
      notifications.map(item => item.id)
    );

    return;
  }

  for (const item of [...notifications].reverse()) {
    if (seenNotificationIds.has(item.id)) {
      continue;
    }

    seenNotificationIds.add(item.id);

    if (item.is_read || item.type.startsWith('admin_')) {
      continue;
    }

    await Notifications.scheduleNotificationAsync({
      content: {
        title: item.title,
        body: item.message,
        sound: 'default',
        data: {
          ...(item.data || {}),
          type: item.type,
          notification_id: item.id,
          related_request_id: item.related_request_id || null,
        },
      },
      trigger:
        Platform.OS === 'android'
          ? { channelId: CHANNEL_ID }
          : null,
    });
  }
}

// Returns a stop function.
export function startLocalNotifications() {
  let stopped = false;

  async function tick() {
    if (stopped || mode !== 'local') {
      return;
    }

    try {
      await checkForNewNotifications();
    } catch (error) {
      console.log('LOCAL NOTIFICATIONS ERROR:', error);
    }
  }

  void tick();

  const timer = setInterval(tick, LOCAL_POLL_MS);

  return () => {
    stopped = true;

    clearInterval(timer);
  };
}
