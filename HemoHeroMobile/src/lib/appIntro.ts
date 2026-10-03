// ============================================================
// APP INTRO STATE
//
// The opening animation (components/AppIntro) plays once per
// app launch on top of the first screen. Sign in / sign up wait
// for it before playing their own entrance, so it isn't hidden
// underneath.
// ============================================================

let introDone = false;

const listeners = new Set<() => void>();

export function markIntroDone() {
  if (introDone) {
    return;
  }

  introDone = true;

  listeners.forEach(listener => listener());

  listeners.clear();
}

// Runs the callback once the intro has finished (right away if
// it already has). Returns an unsubscribe for effect cleanup.
export function whenIntroDone(
  callback: () => void
) {
  if (introDone) {
    callback();

    return () => {};
  }

  listeners.add(callback);

  return () => {
    listeners.delete(callback);
  };
}

// ------------------------------------------------------------
// HOLD
//
// The first screen can keep the intro up while it decides where
// to go (e.g. restoring a saved sign-in), so people go straight
// from the intro to the right screen. The intro waits at most
// MAX_HOLD_MS for the release.
// ------------------------------------------------------------

const MAX_HOLD_MS = 2000;

let holds = 0;

const releaseListeners = new Set<() => void>();

export function holdIntro() {
  holds += 1;

  let released = false;

  return function releaseIntro() {
    if (released) {
      return;
    }

    released = true;

    holds = Math.max(0, holds - 1);

    if (holds === 0) {
      releaseListeners.forEach(listener => listener());

      releaseListeners.clear();
    }
  };
}

// Resolves when nothing holds the intro (or after MAX_HOLD_MS).
export function waitForIntroRelease() {
  return new Promise<void>(resolve => {
    if (holds === 0) {
      resolve();

      return;
    }

    const timer = setTimeout(done, MAX_HOLD_MS);

    function done() {
      clearTimeout(timer);

      releaseListeners.delete(done);

      resolve();
    }

    releaseListeners.add(done);
  });
}
