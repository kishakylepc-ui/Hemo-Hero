import type {
  NotificationPreferences,
} from './api';

// ============================================================
// NOTIFICATION SETTINGS
//
// Same groups as the server
// (server/src/services/notificationPreferenceService.js). They
// choose which notifications alert the phone; the Notifications
// inbox always keeps everything. Account and donor application
// updates always alert.
// ============================================================

export type NotificationCategory =
  Exclude<
    keyof NotificationPreferences,
    'push_enabled'
  >;

export const DEFAULT_NOTIFICATION_PREFERENCES: NotificationPreferences = {
  push_enabled: true,
  donation_requests: true,
  request_updates: true,
  messages: true,
  donations: true,
};

export function getNotificationCategory(
  type?: string | null
): NotificationCategory | null {
  const value =
    String(
      type ||
      ''
    );

  if (
    value === 'request' ||
    value === 'match'
  ) {
    return 'donation_requests';
  }

  if (
    value.startsWith('donor_response_') ||
    value.startsWith('blood_request_')
  ) {
    return 'request_updates';
  }

  if (
    value.startsWith('coordination_')
  ) {
    return 'messages';
  }

  if (
    value.startsWith('donation_')
  ) {
    return 'donations';
  }

  return null;
}

export function wantsAlert(
  preferences:
    | NotificationPreferences
    | null
    | undefined,
  type?: string | null
) {
  const settings =
    preferences ||
    DEFAULT_NOTIFICATION_PREFERENCES;

  if (!settings.push_enabled) {
    return false;
  }

  const category =
    getNotificationCategory(
      type
    );

  return (
    !category ||
    settings[category] !==
      false
  );
}
