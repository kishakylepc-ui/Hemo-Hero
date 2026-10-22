import { router } from 'expo-router';

import type { LogoutReason } from './session';

// ============================================================
// BACK TO SIGN-IN
//
// Used whenever a session ends. Closes every open screen first
// so Android's Back button (or the browser's) can't return to
// a signed-in screen, then shows Sign In with the reason.
// ============================================================

export function goToSignIn(
  reason?: LogoutReason | null
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
