import { router } from 'expo-router';

import type { AppNotification } from './api';

// ============================================================
// NOTIFICATION DESTINATIONS
//
// Where tapping a notification leads. Shared by the
// Notifications screen and by tapping a push notification, so
// both always open the same screen.
//
// fromNotificationsScreen: the tap came from the list itself,
// so notices with nowhere else to go (an admin warning) stay
// there instead of opening the list again.
// ============================================================

export function openNotificationDestination(
  notification: Pick<
    AppNotification,
    'type' | 'data' | 'related_request_id'
  >,
  options: {
    fromNotificationsScreen?: boolean;
  } = {}
) {
  const data =
    notification.data ||
    {};

  const requestId =
    String(
      data.request_id ||
        notification
          .related_request_id ||
        ''
    ).trim();

  const responseId =
    String(
      data.response_id ||
        ''
    ).trim();

  const invitationId =
    String(
      data.invitation_id ||
        ''
    ).trim();

  const notificationKind =
    String(
      data.kind ||
        ''
    )
      .trim()
      .toLowerCase();

  // ========================================================
  // DIRECT DONOR INVITATION
  //
  // Requester selected this donor directly.
  //
  // Opens:
  //
  // /blood-request/donor/:requestId
  // ?invitationId=:invitationId
  //
  // The donor then sees the full request and can accept
  // or decline it.
  // ========================================================

  if (
    notificationKind ===
    'donor_invitation'
  ) {
    if (
      requestId &&
      invitationId
    ) {
      router.push({
        pathname:
          `/blood-request/donor/${requestId}` as any,

        params: {
          invitationId,
        },
      } as any);

      return;
    }

    // ------------------------------------------------------
    // FALLBACK:
    // Request exists but invitation ID is unavailable.
    // ------------------------------------------------------

    if (
      requestId
    ) {
      router.push(
        `/blood-request/donor/${requestId}` as any
      );

      return;
    }

    // ------------------------------------------------------
    // FINAL FALLBACK:
    // Open Requests so donor can access Invites manually.
    // ------------------------------------------------------

    router.push(
      '/requests' as any
    );

    return;
  }

  // ========================================================
  // DONOR INVITATION ACCEPTED
  //
  // This notification is sent to the requester.
  // Existing donor-response flow can handle it.
  // ========================================================

  if (
    notificationKind ===
      'donor_invitation_accepted' &&
    requestId
  ) {
    router.push(
      `/blood-request/${requestId}` as any
    );

    return;
  }

  // ========================================================
  // DONOR INVITATION DECLINED
  //
  // Requester can return to their blood request.
  // ========================================================

  if (
    notificationKind ===
      'donor_invitation_declined' &&
    requestId
  ) {
    router.push(
      `/blood-request/${requestId}` as any
    );

    return;
  }

  // ========================================================
  // DONOR OFFER ACCEPTED
  // ========================================================

  if (
    notification.type ===
    'donor_response_accepted'
  ) {
    if (
      requestId &&
      responseId
    ) {
      router.push(
        `/blood-request/${requestId}/coordination/${responseId}` as any
      );

      return;
    }

    router.replace(
      '/dashboard' as any
    );

    return;
  }

  // ========================================================
  // REQUESTER RECEIVED / LOST DONOR RESPONSE
  // ========================================================

  if (
    notification.type ===
      'donor_response_received' ||
    notification.type ===
      'donor_response_withdrawn'
  ) {
    if (
      requestId
    ) {
      router.push(
        `/blood-request/${requestId}` as any
      );

      return;
    }
  }

  // ========================================================
  // DONOR OFFER REJECTED
  // ========================================================

  if (
    notification.type ===
    'donor_response_rejected'
  ) {
    if (
      requestId
    ) {
      router.push(
        `/blood-request/donor/${requestId}` as any
      );

      return;
    }
  }

  // ========================================================
  // COORDINATION
  // ========================================================

  if (
    notification.type ===
      'coordination_message' ||
    notification.type ===
      'coordination_schedule'
  ) {
    if (
      requestId &&
      responseId
    ) {
      router.push(
        `/blood-request/${requestId}/coordination/${responseId}` as any
      );

      return;
    }
  }

  // ========================================================
  // DONOR ON THE WAY / ALMOST THERE / ARRIVED (requester)
  // ========================================================

  if (
    notification.type ===
      'coordination_trip_started' ||
    notification.type ===
      'coordination_trip_near' ||
    notification.type ===
      'coordination_trip_arrived'
  ) {
    if (
      requestId &&
      responseId
    ) {
      router.push(
        `/blood-request/${requestId}/coordination/${responseId}/trip` as any
      );

      return;
    }
  }

  // ========================================================
  // DONATION RECORD (confirmed / verified / not verified)
  //
  // Sent to both sides; data.recipient_role says which.
  // Donor -> their view of the request.
  // Requester -> their request (donor cards show status).
  // ========================================================

  if (
    notification.type ===
      'donation_recorded' ||
    notification.type ===
      'donation_verified' ||
    notification.type ===
      'donation_rejected' ||
    notification.type ===
      'donation_disputed' ||
    notification.type ===
      'donation_feedback_received'
  ) {
    if (
      requestId
    ) {
      router.push(
        (data.recipient_role ===
        'requester'
          ? `/blood-request/${requestId}`
          : `/blood-request/donor/${requestId}`) as any
      );

      return;
    }
  }

  // ========================================================
  // DONOR APPLICATION
  // ========================================================

  if (
    notification.type ===
      'donor_application_approved' ||
    notification.type ===
      'donor_application_rejected'
  ) {
    router.push(
      '/profile' as any
    );

    return;
  }

  // ========================================================
  // NO-SHOW REPORTED (open the conversation to explain)
  // ========================================================

  if (
    notification.type ===
    'coordination_no_show'
  ) {
    if (
      requestId &&
      responseId
    ) {
      router.push(
        `/blood-request/${requestId}/coordination/${responseId}` as any
      );

      return;
    }
  }

  // ========================================================
  // REQUEST REMOVED BY HEMO-HERO (sent to the requester)
  // ========================================================

  if (
    notification.type ===
      'blood_request_removed' &&
    requestId
  ) {
    router.push(
      `/blood-request/${requestId}` as any
    );

    return;
  }

  // ========================================================
  // FULFILLED / CANCELLED
  //
  // Sent to accepted donors; their view of the request shows
  // the outcome and where to rate the donation.
  // ========================================================

  // Requests closed automatically (expired, or closed as
  // fulfilled after their date) also tell the requester; their
  // notification has recipient_role 'requester'.
  if (
    notification.type ===
      'blood_request_fulfilled' ||
    notification.type ===
      'blood_request_cancelled' ||
    notification.type ===
      'blood_request_expired'
  ) {
    router.push(
      (requestId
        ? data.recipient_role ===
          'requester'
          ? `/blood-request/${requestId}`
          : `/blood-request/donor/${requestId}`
        : '/dashboard') as any
    );

    return;
  }

  // ========================================================
  // REPORT / FEEDBACK REVIEWED BY AN ADMIN
  //
  // From a chat -> back to that conversation.
  // Chat no longer open (e.g. the other person's account was
  // deactivated) -> the request, as requester or donor.
  // About a request (the reporter is never its requester)
  // -> the donor view of that request.
  // ========================================================

  if (
    notification.type ===
    'report_reviewed'
  ) {
    if (
      requestId &&
      responseId
    ) {
      router.push(
        `/blood-request/${requestId}/coordination/${responseId}` as any
      );

      return;
    }

    if (
      requestId
    ) {
      router.push(
        (data.recipient_role ===
        'requester'
          ? `/blood-request/${requestId}`
          : `/blood-request/donor/${requestId}`) as any
      );

      return;
    }
  }

  // ========================================================
  // ADMIN WARNING (and a review with nothing to open)
  //
  // The whole message is the content, and the Notifications
  // list shows it in full (a push cuts it short).
  // ========================================================

  if (
    notification.type ===
      'account_warning' ||
    notification.type ===
      'report_reviewed'
  ) {
    if (
      !options.fromNotificationsScreen
    ) {
      router.push(
        '/notifications' as any
      );
    }

    return;
  }

  // ========================================================
  // FALLBACK
  // ========================================================

  if (
    requestId
  ) {
    router.push(
      `/blood-request/${requestId}` as any
    );

    return;
  }

  router.replace(
    '/dashboard' as any
  );
}
