import {
  useEffect,
  useState,
} from 'react';

import {
  Keyboard,
  Platform,
} from 'react-native';

// ============================================================
// KEYBOARD OPEN
//
// True while the on-screen keyboard is showing. Screens use it
// to hide a bottom button bar while typing, so the bar stays at
// the bottom instead of riding up on top of the keyboard.
// (No keyboard events on web: always false there.)
// ============================================================

export function useKeyboardOpen() {
  const [
    open,
    setOpen,
  ] = useState(false);

  useEffect(() => {
    // iOS has "will" events, so the bar goes as the keyboard
    // starts to move; Android only has "did".
    const showEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillShow'
        : 'keyboardDidShow';

    const hideEvent =
      Platform.OS === 'ios'
        ? 'keyboardWillHide'
        : 'keyboardDidHide';

    const showSubscription =
      Keyboard.addListener(
        showEvent,
        () => setOpen(true)
      );

    const hideSubscription =
      Keyboard.addListener(
        hideEvent,
        () => setOpen(false)
      );

    return () => {
      showSubscription.remove();
      hideSubscription.remove();
    };
  }, []);

  return open;
}
