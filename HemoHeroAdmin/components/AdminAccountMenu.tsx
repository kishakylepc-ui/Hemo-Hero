import {
  type ComponentProps,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Modal,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';

import { router } from 'expo-router';

import {
  logoutAdmin,
  type AdminProfile,
} from '../lib/api';

import { isSuperAdmin } from '../lib/roles';

import {
  clearAdminSession,
  getAdminAccessToken,
  setAdminLogoutReason,
} from '../lib/session';

import { goToAdminSignIn } from '../lib/signInRoute';

// =======================================================
// ACCOUNT MENU (the name in the header)
//
// Quick links and Sign Out, which asks once before ending
// the session. Data Backups is for the super admin only.
// =======================================================

const COLORS = {
  card: '#0B142A',
  cardLight: '#101A35',
  border: '#243554',
  red: '#DB0A0A',
  redBright: '#EF3340',
  white: '#FFFFFF',
  muted: '#7F889F',
  soft: '#B7C1D8',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

export default function AdminAccountMenu({
  visible,
  position,
  scale,
  fontScale,
  profile,
  name,
  initial,
  onClose,
}: {
  visible: boolean;
  position: {
    top: number;
    right: number;
  };
  scale: number;
  fontScale: number;
  profile: AdminProfile | null;
  name: string;
  initial: string;
  onClose: () => void;
}) {
  const {
    width: windowWidth,
  } =
    useWindowDimensions();

  const [confirming, setConfirming] =
    useState(false);

  const [signingOut, setSigningOut] =
    useState(false);

  // Back to the links each time it opens.
  useEffect(() => {
    if (visible) {
      setConfirming(false);
    }
  }, [visible]);

  const superAdmin =
    isSuperAdmin(profile?.role);

  function openScreen(
    route: string
  ) {
    onClose();

    router.navigate(
      route as any
    );
  }

  async function signOut() {
    if (signingOut) {
      return;
    }

    try {
      setSigningOut(true);

      const token =
        await getAdminAccessToken();

      // Revoke the server session. If the server cannot be
      // reached, still sign out here.
      if (token) {
        try {
          await logoutAdmin(token);
        } catch (error) {
          console.log(
            'ADMIN SERVER LOGOUT ERROR:',
            error
          );
        }
      }
    } finally {
      // Other open tabs follow and say why (SessionGuard).
      await setAdminLogoutReason(
        'signed_out'
      );

      await clearAdminSession();

      setSigningOut(false);

      onClose();

      goToAdminSignIn();
    }
  }

  const rowProps = {
    scale,
    fontScale,
  };

  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      supportedOrientations={[
        'portrait',
        'landscape',
      ]}
      onRequestClose={onClose}
    >
      <Pressable
        accessibilityLabel="Close account menu"
        style={StyleSheet.absoluteFill}
        disabled={signingOut}
        onPress={onClose}
      />

      <View
        style={[
          styles.menu,

          {
            top: position.top,
            right: position.right,
            width: Math.min(
              300 * Math.max(scale, 0.8),
              windowWidth - 24
            ),
            borderRadius: 16 * scale,
          },
        ]}
      >
        {/* WHO IS SIGNED IN */}

        <View
          style={[
            styles.account,

            {
              gap: 12 * scale,
              padding: 16 * scale,
            },
          ]}
        >
          <View
            style={[
              styles.avatar,

              {
                width: 44 * scale,
                height: 44 * scale,
                borderRadius: 22 * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.avatarText,

                {
                  fontSize: 16 * fontScale,
                },
              ]}
            >
              {initial}
            </Text>
          </View>

          <View style={styles.flexFill}>
            <Text
              numberOfLines={1}
              style={[
                styles.name,

                {
                  fontSize: 14 * fontScale,
                },
              ]}
            >
              {name}
            </Text>

            {profile?.email ? (
              <Text
                numberOfLines={1}
                style={[
                  styles.email,

                  {
                    fontSize: 12 * fontScale,
                    marginTop: 1 * scale,
                  },
                ]}
              >
                {profile.email}
              </Text>
            ) : null}

            <View
              style={[
                styles.rolePill,

                {
                  paddingHorizontal: 8 * scale,
                  paddingVertical: 2 * scale,
                  borderRadius: 999,
                  marginTop: 6 * scale,
                },
              ]}
            >
              <Text
                style={[
                  styles.roleText,

                  {
                    fontSize: 11 * fontScale,
                  },
                ]}
              >
                {superAdmin
                  ? 'Super Admin'
                  : 'Admin'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.line} />

        {confirming ? (
          // SIGN OUT: ASK ONCE
          <View
            style={{
              padding: 16 * scale,
            }}
          >
            <Text
              style={[
                styles.confirmText,

                {
                  fontSize: 13 * fontScale,
                  lineHeight: 19 * fontScale,
                },
              ]}
            >
              End your administrator session on this device?
            </Text>

            <View
              style={[
                styles.confirmButtons,

                {
                  gap: 8 * scale,
                  marginTop: 14 * scale,
                },
              ]}
            >
              <Pressable
                disabled={signingOut}
                onPress={() =>
                  setConfirming(false)
                }
                style={({ pressed }) => [
                  styles.cancelButton,

                  {
                    height: 42 * scale,
                    borderRadius: 10 * scale,
                  },

                  pressed && styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.cancelText,

                    {
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={signingOut}
                onPress={signOut}
                style={({ pressed }) => [
                  styles.signOutButton,

                  {
                    height: 42 * scale,
                    borderRadius: 10 * scale,
                  },

                  signingOut && styles.disabled,

                  pressed && styles.pressed,
                ]}
              >
                {signingOut ? (
                  <ActivityIndicator
                    size="small"
                    color={COLORS.white}
                  />
                ) : (
                  <Text
                    style={[
                      styles.signOutText,

                      {
                        fontSize: 13 * fontScale,
                      },
                    ]}
                  >
                    Sign Out
                  </Text>
                )}
              </Pressable>
            </View>
          </View>
        ) : (
          <>
            {/* QUICK LINKS */}

            <View
              style={{
                paddingVertical: 6 * scale,
              }}
            >
              <MenuRow
                {...rowProps}
                icon="settings"
                label="Account Settings"
                onPress={() =>
                  openScreen('/settings')
                }
              />

              <MenuRow
                {...rowProps}
                icon="password"
                label="Change Password"
                onPress={() =>
                  openScreen(
                    '/settings?open=password'
                  )
                }
              />

              {superAdmin ? (
                <MenuRow
                  {...rowProps}
                  icon="backup"
                  label="Data Backups"
                  onPress={() =>
                    openScreen('/backups')
                  }
                />
              ) : null}
            </View>

            <View style={styles.line} />

            <View
              style={{
                paddingVertical: 6 * scale,
              }}
            >
              <MenuRow
                {...rowProps}
                icon="logout"
                label="Sign Out"
                danger
                onPress={() =>
                  setConfirming(true)
                }
              />
            </View>
          </>
        )}
      </View>
    </Modal>
  );
}

function MenuRow({
  icon,
  label,
  danger = false,
  scale,
  fontScale,
  onPress,
}: {
  icon: IconName;
  label: string;
  danger?: boolean;
  scale: number;
  fontScale: number;
  onPress: () => void;
}) {
  const [hovered, setHovered] =
    useState(false);

  return (
    <Pressable
      accessibilityRole="button"
      onPress={onPress}
      onHoverIn={() => setHovered(true)}
      onHoverOut={() => setHovered(false)}
      style={({ pressed }) => [
        styles.row,

        {
          gap: 12 * scale,
          paddingHorizontal: 16 * scale,
          height: 44 * scale,
        },

        (hovered || pressed) &&
          styles.rowActive,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={19 * scale}
        color={
          danger
            ? COLORS.redBright
            : COLORS.soft
        }
      />

      <Text
        style={[
          styles.rowText,

          danger && styles.rowTextDanger,

          {
            fontSize: 13.5 * fontScale,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  menu: {
    position: 'absolute',
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 18,
  },

  account: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.cardLight,
  },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  avatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  flexFill: {
    flex: 1,
  },

  name: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  email: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  rolePill: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(239,51,64,0.14)',
  },

  roleText: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  line: {
    height: 1,
    backgroundColor: COLORS.border,
  },

  row: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  rowActive: {
    backgroundColor: COLORS.cardLight,
  },

  rowText: {
    color: COLORS.white,
    fontFamily: 'Inter_500Medium',
  },

  rowTextDanger: {
    color: COLORS.redBright,
  },

  confirmText: {
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
  },

  confirmButtons: {
    flexDirection: 'row',
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  cancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  signOutButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  signOutText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  disabled: {
    opacity: 0.6,
  },

  pressed: {
    opacity: 0.82,
  },
});
