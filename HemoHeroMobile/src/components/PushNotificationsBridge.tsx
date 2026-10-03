import { useEffect } from 'react';

import {
  AppState,
  Platform,
} from 'react-native';

import * as Notifications from 'expo-notifications';

import {
  markNotificationAsRead,
} from '../lib/api';

import {
  openNotificationDestination,
} from '../lib/notificationRoutes';

import {
  ensurePushRegistered,
  startLocalNotifications,
} from '../lib/pushNotifications';

import {
  getAccessToken,
} from '../lib/session';

// ============================================================
// PUSH NOTIFICATIONS BRIDGE (mounted once in the root layout)
//
// - turns on notifications for the signed-in account when the
//   app starts or comes back to the front
// - in Android Expo Go, shows new notifications while the app
//   runs (lib/pushNotifications 'local' mode)
// - tapping a notification opens the same screen as tapping
//   it in the Notifications list
//
// A notification tapped while the app was closed is kept until
// the dashboard is ready (or the person signs in), then opened.
// ============================================================

let pendingTap:
  | Record<string, unknown>
  | null = null;

const handledTaps =
  new Set<string>();

// True once the dashboard has asked for the pending tap.
let dashboardReady = false;

async function openTap(
  data: Record<string, unknown>
) {
  const notificationId =
    typeof data.notification_id === 'string'
      ? data.notification_id
      : null;

  const accessToken =
    await getAccessToken();

  if (
    accessToken &&
    notificationId
  ) {
    markNotificationAsRead(
      accessToken,
      notificationId
    ).catch(error =>
      console.log(
        'PUSH MARK READ ERROR:',
        error
      )
    );
  }

  openNotificationDestination({
    type: String(data.type || ''),
    data: data as any,
    related_request_id:
      typeof data.related_request_id === 'string'
        ? data.related_request_id
        : null,
  });
}

// Called by the dashboard once it's on screen.
export function openPendingNotification() {
  dashboardReady = true;

  const data = pendingTap;

  pendingTap = null;

  if (data) {
    void openTap(data);
  }
}

function tapData(
  response: Notifications.NotificationResponse
) {
  const id =
    response.notification.request.identifier;

  if (handledTaps.has(id)) {
    return null;
  }

  handledTaps.add(id);

  return (response.notification.request.content.data ||
    {}) as Record<string, unknown>;
}

export default function PushNotificationsBridge() {
  useEffect(() => {
    if (Platform.OS === 'web') {
      return;
    }

    void ensurePushRegistered();

    const stopLocal =
      startLocalNotifications();

    const appState =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            void ensurePushRegistered();
          }
        }
      );

    // Tapped while the app was open or in the background.
    const tapSubscription =
      Notifications.addNotificationResponseReceivedListener(
        response => {
          const data = tapData(response);

          if (data) {
            void openTap(data);
          }
        }
      );

    // Tapped while the app was closed: open it from the
    // dashboard (after sign-in if needed).
    Notifications.getLastNotificationResponseAsync()
      .then(response => {
        const data =
          response
            ? tapData(response)
            : null;

        if (!data) {
          return;
        }

        if (dashboardReady) {
          void openTap(data);
        } else {
          pendingTap = data;
        }
      })
      .catch(() => {});

    return () => {
      appState.remove();
      tapSubscription.remove();
      stopLocal();
    };
  }, []);

  return null;
}
