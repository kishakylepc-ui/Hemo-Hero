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
// The red pill slides to the other tab, then the screen
// switches (the stack cross-fades). Both screens use replace,
// so switching never stacks duplicate screens.
// ============================================================

const COLORS = {
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
};

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

  // Each tab is half the row minus the 7px side margins.
  const tabWidth = Math.max(0, width / 2 - 14);

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
                    outputRange: [7, width / 2 + 7],
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
    height: 43,
    marginBottom: 22,
    flexDirection: 'row',
  },

  pill: {
    position: 'absolute',
    top: 0,
    left: 0,
    height: 43,
    borderRadius: 22,
    backgroundColor: COLORS.redButton,
  },

  tab: {
    flex: 1,
    height: 43,
    marginHorizontal: 7,
    alignItems: 'center',
    justifyContent: 'center',
  },

  tabStaticActive: {
    borderRadius: 22,
    backgroundColor: COLORS.redButton,
  },

  activeText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13,
  },

  inactiveText: {
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 13,
  },
});
