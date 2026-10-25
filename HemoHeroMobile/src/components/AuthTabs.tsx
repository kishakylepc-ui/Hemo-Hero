import {
  useRef,
  useState,
} from 'react';

import {
  Animated,
  Easing,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';

// ============================================================
// AUTH TABS (Sign In | Sign Up)
//
// iPhone-style segmented control: a white thumb slides across
// a grey track to the other tab, then the screen switches (the
// stack cross-fades). Both screens use replace, so switching
// never stacks duplicate screens.
// ============================================================

const COLORS = {
  redButton: '#B42323',
  white: '#FFFFFF',
  track: '#F2F2F4',
  inactive: '#666666',
};

// Space between the track's edge and the thumb.
const INSET = 3;

const SLIDE_MS = 170;

type Tab =
  | 'signin'
  | 'signup';

export default function AuthTabs({
  active,
  disabled,
  onSwitch,
}: {
  active: Tab;
  disabled?: boolean;
  // Called once the pill has slid over.
  onSwitch: (tab: Tab) => void;
}) {
  const [
    width,
    setWidth,
  ] = useState(0);

  const position = useRef(
    new Animated.Value(
      active === 'signin'
        ? 0
        : 1
    )
  ).current;

  // Label colors follow the pill as soon as it starts moving.
  const [
    shown,
    setShown,
  ] = useState<Tab>(active);

  const switching = useRef(false);

  function select(tab: Tab) {
    if (
      tab === active ||
      disabled ||
      switching.current
    ) {
      return;
    }

    switching.current = true;

    setShown(tab);

    Animated.timing(position, {
      toValue: tab === 'signin' ? 0 : 1,
      duration: SLIDE_MS,
      easing: Easing.out(Easing.cubic),
      useNativeDriver: Platform.OS !== 'web',
    }).start(() => {
      switching.current = false;

      onSwitch(tab);
    });
  }

  // Each half of the track, inside its inset.
  const tabWidth = Math.max(0, (width - INSET * 2) / 2);

  return (
    <View
      style={styles.tabs}
      accessibilityRole="tablist"
      onLayout={event =>
        setWidth(
          event.nativeEvent.layout.width
        )
      }
    >
      {width > 0 ? (
        <Animated.View
          pointerEvents="none"
          style={[
            styles.pill,
            {
              width: tabWidth,
              transform: [
                {
                  translateX: position.interpolate({
                    inputRange: [0, 1],
                    outputRange: [INSET, INSET + tabWidth],
                  }),
                },
              ],
            },
          ]}
        />
      ) : null}

      {(['signin', 'signup'] as const).map(tab => {
        const isActive = tab === shown;

        return (
          <Pressable
            key={tab}
            style={[
              styles.tab,

              // Before the row is measured there's no sliding pill.
              isActive &&
                width === 0 &&
                styles.tabStaticActive,
            ]}
            accessibilityRole="tab"
            accessibilityState={{
              selected: isActive,
            }}
            disabled={disabled}
            onPress={() => select(tab)}
          >
            <Text
              style={
                isActive
                  ? styles.activeText
                  : styles.inactiveText
              }
            >
              {tab === 'signin'
                ? 'Sign In'
                : 'Sign Up'}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  tabs: {
    height: 42,
    marginBottom: 20,
    padding: INSET,
    flexDirection: 'row',
    borderRadius: 13,
    backgroundColor: COLORS.track,
  },

  // The white thumb.
  pill: {
    position: 'absolute',
    top: INSET,
    left: 0,
    height: 42 - INSET * 2,
    borderRadius: 10,
    backgroundColor: COLORS.white,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.12,
    shadowRadius: 3,
    elevation: 2,
  },

  tab: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabStaticActive: {
    borderRadius: 10,
    backgroundColor: COLORS.white,
  },

  activeText: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  inactiveText: {
    color: COLORS.inactive,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },
});
