import AsyncStorage from '@react-native-async-storage/async-storage';

// ============================================================
// SIGN-IN LOCK (this phone)
//
// The server keeps the real lockout, so closing the app never
// clears it. This copy only lets the Sign In screen show the
// countdown and the CAPTCHA again right after the app reopens,
// instead of waiting for the next attempt to find out.
// ============================================================

const LOGIN_LOCK_KEY =
  '@hemohero/login_lock';

export type SavedLoginLock = {
  email: string;

  // When the lockout ends, by this phone's clock. null when
  // only the CAPTCHA is needed.
  lockedUntil: number | null;

  captchaRequired: boolean;
};

export async function saveLoginLock(
  lock: SavedLoginLock
) {
  try {
    await AsyncStorage.setItem(
      LOGIN_LOCK_KEY,
      JSON.stringify(lock)
    );
  } catch (error) {
    console.log(
      'SAVE LOGIN LOCK ERROR:',
      error
    );
  }
}

export async function getLoginLock(): Promise<SavedLoginLock | null> {
  try {
    const value =
      await AsyncStorage.getItem(
        LOGIN_LOCK_KEY
      );

    if (!value) {
      return null;
    }

    const lock =
      JSON.parse(value);

    if (
      typeof lock?.email !==
      'string'
    ) {
      return null;
    }

    return {
      email:
        lock.email,

      lockedUntil:
        typeof lock.lockedUntil ===
        'number'
          ? lock.lockedUntil
          : null,

      captchaRequired:
        lock.captchaRequired ===
        true,
    };
  } catch {
    return null;
  }
}

export async function clearLoginLock() {
  try {
    await AsyncStorage.removeItem(
      LOGIN_LOCK_KEY
    );
  } catch (error) {
    console.log(
      'CLEAR LOGIN LOCK ERROR:',
      error
    );
  }
}
