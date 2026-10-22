import { router } from 'expo-router';

import type { AdminLogoutReason } from './session';

// ============================================================
// BACK TO SIGN-IN
//
// Used whenever a session ends. Closes every open screen first
// so Back (or the iPad back swipe) can't return to an admin
// page, then shows the sign-in screen with the reason, if any.
// ============================================================

export function goToAdminSignIn(
  reason?: AdminLogoutReason | null
) {
  try {
    if (router.canDismiss()) {
      router.dismissAll();
    }
  } catch {
    // Nothing to close.
  }

  router.replace(
    reason
      ? {
          pathname: '/',
          params: {
            signedOut: reason,
          },
        }
      : '/'
  );
}
