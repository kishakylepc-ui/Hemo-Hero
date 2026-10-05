import {
  type ComponentProps,
  useCallback,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  getAdminNotifications,
  getAdminUnreadNotificationCount,
  markAdminNotificationRead,
  markAllAdminNotificationsRead,
  type AdminNotification,
  type AdminProfile,
} from '../lib/api';

import {
  getAdminAccessToken,
} from '../lib/session';

import { isSuperAdmin } from '../lib/roles';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  card:
    '#0B142A',

  cardLight:
    '#101A35',

  border:
    '#243554',

  red:
    '#DB0A0A',

  redBright:
    '#EF3340',

  white:
    '#FFFFFF',

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',

  green:
    '#35C982',

  orange:
    '#F3A34A',

  blue:
    '#4A8CFF',
};

// Refresh the unread badge while a screen stays open.
const UNREAD_REFRESH_MS =
  60 * 1000;

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// TYPES
// ============================================================

type AdminHeaderProps = {
  profile:
    AdminProfile | null;

  scale:
    number;

  fontScale:
    number;

  // Optional override for the bell (not used by default).
  onNotificationPress?:
    () => void;
};

// ============================================================
// HEADER
// ============================================================

export default function AdminHeader({
  profile,
  scale,
  fontScale,
  onNotificationPress,
}: AdminHeaderProps) {
  const {
    width: windowWidth,
  } =
    useWindowDimensions();

  // ==========================================================
  // ADMIN NAME
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

  const adminInitial =
    adminName
      .charAt(0)
      .toUpperCase();

  // ==========================================================
  // NOTIFICATION STATE
  // ==========================================================

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

  const [
    panelVisible,
    setPanelVisible,
  ] =
    useState(false);

  const [
    panelPosition,
    setPanelPosition,
  ] =
    useState({
      top: 0,
      right: 0,
    });

  const [
    notifications,
    setNotifications,
  ] =
    useState<AdminNotification[]>([]);

  const [
    panelLoading,
    setPanelLoading,
  ] =
    useState(false);

  const [
    panelError,
    setPanelError,
  ] =
    useState('');

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  const bellRef =
    useRef<View>(null);

  // ==========================================================
  // UNREAD COUNT
  //
  // Loads when the screen gains focus and refreshes every
  // minute while it stays focused. Stops when the screen
  // loses focus, so hidden screens do not keep polling.
  // ==========================================================

  const refreshUnreadCount =
    useCallback(
      async () => {
        try {
          const token =
            await getAdminAccessToken();

          if (!token) {
            setUnreadCount(0);

            return;
          }

          const result =
            await getAdminUnreadNotificationCount(
              token
            );

          setUnreadCount(
            Number(
              result.unread_count ||
                0
            )
          );
        } catch (error) {
          // Keep the last known value; the badge is not
          // critical enough to show an error for.
          console.log(
            'ADMIN UNREAD COUNT ERROR:',
            error
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(
      () => {
        refreshUnreadCount();

        const timer =
          setInterval(
            refreshUnreadCount,
            UNREAD_REFRESH_MS
          );

        return () =>
          clearInterval(
            timer
          );
      },
      [
        refreshUnreadCount,
      ]
    )
  );

  // ==========================================================
  // PANEL
  // ==========================================================

  async function loadNotifications() {
    try {
      setPanelLoading(true);

      setPanelError('');

      const token =
        await getAdminAccessToken();

      if (!token) {
        setNotifications([]);

        return;
      }

      const result =
        await getAdminNotifications(
          token,
          30
        );

      setNotifications(
        result.notifications ||
          []
      );

      setUnreadCount(
        Number(
          result.unread_count ||
            0
        )
      );
    } catch (error) {
      setPanelError(
        error instanceof Error
          ? error.message
          : 'Unable to load notifications.'
      );
    } finally {
      setPanelLoading(false);
    }
  }

  function openPanel() {
    if (
      onNotificationPress
    ) {
      onNotificationPress();

      return;
    }

    // Anchor the panel under the bell, wherever the
    // header is on screen (the web canvas is centered).
    bellRef.current?.measureInWindow(
      (x, y, width, height) => {
        setPanelPosition({
          top:
            y +
            height +
            10 * scale,

          right:
            Math.max(
              windowWidth -
                (x + width),
              12
            ),
        });

        setPanelVisible(true);

        loadNotifications();
      }
    );
  }

  function closePanel() {
    setPanelVisible(false);
  }

  async function handleOpenNotification(
    notification: AdminNotification
  ) {
    closePanel();

    // Mark read first (optimistic), then navigate.
    if (
      !notification.is_read
    ) {
      setNotifications(
        current =>
          current.map(
            item =>
              item.id ===
              notification.id
                ? {
                    ...item,
                    is_read: true,
                  }
                : item
          )
      );

      setUnreadCount(
        current =>
          Math.max(
            current - 1,
            0
          )
      );

      try {
        const token =
          await getAdminAccessToken();

        if (token) {
          await markAdminNotificationRead(
            token,
            notification.id
          );
        }
      } catch (error) {
        console.log(
          'MARK NOTIFICATION READ ERROR:',
          error
        );
      }
    }

    const route =
      typeof notification
        .data
        ?.route ===
      'string'
        ? notification
            .data
            .route
        : getFallbackRoute(
            notification.type
          );

    if (route) {
      router.push(
        route as any
      );
    }
  }

  async function handleMarkAllRead() {
    if (
      markingAll ||
      unreadCount === 0
    ) {
      return;
    }

    try {
      setMarkingAll(true);

      const token =
        await getAdminAccessToken();

      if (!token) {
        return;
      }

      await markAllAdminNotificationsRead(
        token
      );

      setNotifications(
        current =>
          current.map(
            item => ({
              ...item,
              is_read: true,
            })
          )
      );

      setUnreadCount(0);
    } catch (error) {
      setPanelError(
        error instanceof Error
          ? error.message
          : 'Unable to mark notifications as read.'
      );
    } finally {
      setMarkingAll(false);
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={[
        styles.header,

        {
          height:
            96 * scale,

          paddingHorizontal:
            48 * scale,
        },
      ]}
    >
      {/* ======================================================
          BRAND
      ====================================================== */}

      <Pressable
        onPress={() =>
          router.replace(
            '/dashboard'
          )
        }
        style={({
          pressed,
        }) => [
          styles.brandArea,

          pressed &&
            styles.pressed,
        ]}
      >
        <View
          style={[
            styles.logoCircle,

            {
              width:
                52 * scale,

              height:
                52 * scale,

              borderRadius:
                26 * scale,
            },
          ]}
        >
          <Image
            source={require('../assets/images/hemo-hero-logo.png')}
            resizeMode="contain"
            style={{
              width:
                46 * scale,

              height:
                46 * scale,
            }}
          />
        </View>

        <View>
          <Text
            style={[
              styles.brand,

              {
                fontSize:
                  26 * fontScale,

                lineHeight:
                  31 * fontScale,
              },
            ]}
          >
            <Text
              style={
                styles.brandRed
              }
            >
              Hemo-
            </Text>

            Hero
          </Text>

          <Text
            style={[
              styles.portal,

              {
                fontSize:
                  11 * fontScale,

                lineHeight:
                  15 * fontScale,

                letterSpacing:
                  1.4 * scale,
              },
            ]}
          >
            ADMIN PORTAL
          </Text>
        </View>
      </Pressable>

      {/* ======================================================
          RIGHT SIDE
      ====================================================== */}

      <View
        style={[
          styles.rightSection,

          {
            gap:
              18 * scale,
          },
        ]}
      >
        {/* ====================================================
            NOTIFICATION BELL
        ==================================================== */}

        <View
          ref={bellRef}
          collapsable={false}
        >
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={
              unreadCount > 0
                ? `Notifications, ${unreadCount} unread`
                : 'Notifications'
            }
            onPress={
              openPanel
            }
            style={({
              pressed,
            }) => [
              styles.notificationButton,

              {
                width:
                  46 * scale,

                height:
                  46 * scale,

                borderRadius:
                  23 * scale,
              },

              panelVisible &&
                styles.notificationButtonActive,

              pressed &&
                styles.pressed,
            ]}
          >
            <MaterialIcons
              name={
                unreadCount > 0
                  ? 'notifications'
                  : 'notifications-none'
              }
              size={
                24 * scale
              }
              color={
                COLORS.white
              }
            />

            {unreadCount >
            0 ? (
              <View
                style={[
                  styles.notificationBadge,

                  {
                    minWidth:
                      18 * scale,

                    height:
                      18 * scale,

                    borderRadius:
                      9 * scale,

                    paddingHorizontal:
                      4 * scale,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.notificationBadgeText,

                    {
                      fontSize:
                        10 * fontScale,
                    },
                  ]}
                >
                  {unreadCount >
                  99
                    ? '99+'
                    : unreadCount}
                </Text>
              </View>
            ) : null}
          </Pressable>
        </View>

        {/* ====================================================
            DIVIDER
        ==================================================== */}

        <View
          style={[
            styles.divider,

            {
              height:
                36 * scale,
            },
          ]}
        />

        {/* ====================================================
            ADMIN PROFILE
        ==================================================== */}

        <Pressable
          onPress={() =>
            router.push(
              '/settings'
            )
          }
          style={({
            pressed,
          }) => [
            styles.adminArea,

            {
              gap:
                11 * scale,
            },

            pressed &&
              styles.pressed,
          ]}
        >
          <View
            style={[
              styles.adminAvatar,

              {
                width:
                  48 * scale,

                height:
                  48 * scale,

                borderRadius:
                  24 * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.adminAvatarText,

                {
                  fontSize:
                    16 * fontScale,
                },
              ]}
            >
              {
                adminInitial
              }
            </Text>
          </View>

          <View
            style={
              styles.adminInfo
            }
          >
            <Text
              numberOfLines={
                1
              }
              style={[
                styles.adminName,

                {
                  fontSize:
                    14 * fontScale,

                  lineHeight:
                    19 * fontScale,
                },
              ]}
            >
              {
                adminName
              }
            </Text>

            <Text
              style={[
                styles.adminRole,

                {
                  fontSize:
                    12 * fontScale,

                  lineHeight:
                    17 * fontScale,
                },
              ]}
            >
              {isSuperAdmin(profile?.role)
                ? 'Super Admin'
                : 'Admin'}
            </Text>
          </View>

          <MaterialIcons
            name="keyboard-arrow-down"
            size={
              20 * scale
            }
            color={
              COLORS.muted
            }
          />
        </Pressable>
      </View>

      {/* ======================================================
          NOTIFICATION PANEL
      ====================================================== */}

      <Modal
        transparent
        visible={
          panelVisible
        }
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closePanel
        }
      >
        <Pressable
          style={
            styles.panelBackdrop
          }
          onPress={
            closePanel
          }
        />

        <View
          style={[
            styles.panel,

            {
              top:
                panelPosition.top,

              right:
                panelPosition.right,

              width:
                Math.min(
                  420 * Math.max(scale, 0.8),
                  windowWidth - 24
                ),

              borderRadius:
                16 * scale,
            },
          ]}
        >
          {/* PANEL HEADER */}

          <View
            style={[
              styles.panelHeader,

              {
                paddingHorizontal:
                  18 * scale,

                paddingVertical:
                  15 * scale,
              },
            ]}
          >
            <View>
              <Text
                style={[
                  styles.panelTitle,

                  {
                    fontSize:
                      16 * fontScale,
                  },
                ]}
              >
                Notifications
              </Text>

              <Text
                style={[
                  styles.panelSubtitle,

                  {
                    fontSize:
                      11.5 * fontScale,

                    marginTop:
                      2 * scale,
                  },
                ]}
              >
                {unreadCount > 0
                  ? `${unreadCount} unread`
                  : 'All caught up'}
              </Text>
            </View>

            <Pressable
              disabled={
                unreadCount ===
                  0 ||
                markingAll
              }
              onPress={
                handleMarkAllRead
              }
              style={({
                pressed,
              }) => [
                styles.markAllButton,

                {
                  height:
                    32 * scale,

                  paddingHorizontal:
                    11 * scale,

                  borderRadius:
                    8 * scale,

                  gap:
                    5 * scale,
                },

                (unreadCount ===
                  0 ||
                  markingAll) &&
                  styles.disabled,

                pressed &&
                  styles.pressed,
              ]}
            >
              {markingAll ? (
                <ActivityIndicator
                  size="small"
                  color={
                    COLORS.soft
                  }
                />
              ) : (
                <>
                  <MaterialIcons
                    name="done-all"
                    size={
                      16 * scale
                    }
                    color={
                      COLORS.soft
                    }
                  />

                  <Text
                    style={[
                      styles.markAllText,

                      {
                        fontSize:
                          12 * fontScale,
                      },
                    ]}
                  >
                    Mark all read
                  </Text>
                </>
              )}
            </Pressable>
          </View>

          {/* PANEL BODY */}

          {panelLoading &&
          notifications.length ===
            0 ? (
            <View
              style={[
                styles.panelState,

                {
                  paddingVertical:
                    40 * scale,
                },
              ]}
            >
              <ActivityIndicator
                color={
                  COLORS.redBright
                }
              />
            </View>
          ) : panelError &&
            notifications.length ===
              0 ? (
            <View
              style={[
                styles.panelState,

                {
                  paddingVertical:
                    32 * scale,

                  paddingHorizontal:
                    24 * scale,
                },
              ]}
            >
              <MaterialIcons
                name="error-outline"
                size={
                  30 * scale
                }
                color={
                  COLORS.redBright
                }
              />

              <Text
                style={[
                  styles.panelStateTitle,

                  {
                    fontSize:
                      14 * fontScale,

                    marginTop:
                      9 * scale,
                  },
                ]}
              >
                Unable to load notifications
              </Text>

              <Text
                style={[
                  styles.panelStateText,

                  {
                    fontSize:
                      12 * fontScale,

                    marginTop:
                      3 * scale,
                  },
                ]}
              >
                {panelError}
              </Text>

              <Pressable
                onPress={
                  loadNotifications
                }
                style={({
                  pressed,
                }) => [
                  styles.markAllButton,

                  {
                    height:
                      34 * scale,

                    paddingHorizontal:
                      14 * scale,

                    borderRadius:
                      8 * scale,

                    marginTop:
                      14 * scale,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.markAllText,

                    {
                      fontSize:
                        12 * fontScale,
                    },
                  ]}
                >
                  Try Again
                </Text>
              </Pressable>
            </View>
          ) : notifications.length ===
            0 ? (
            <View
              style={[
                styles.panelState,

                {
                  paddingVertical:
                    38 * scale,
                },
              ]}
            >
              <View
                style={[
                  styles.emptyIcon,

                  {
                    width:
                      52 * scale,

                    height:
                      52 * scale,

                    borderRadius:
                      26 * scale,
                  },
                ]}
              >
                <MaterialIcons
                  name="notifications-none"
                  size={
                    27 * scale
                  }
                  color={
                    COLORS.muted
                  }
                />
              </View>

              <Text
                style={[
                  styles.panelStateTitle,

                  {
                    fontSize:
                      14 * fontScale,

                    marginTop:
                      11 * scale,
                  },
                ]}
              >
                You're all caught up
              </Text>

              <Text
                style={[
                  styles.panelStateText,

                  {
                    fontSize:
                      12 * fontScale,

                    marginTop:
                      3 * scale,
                  },
                ]}
              >
                New applications, reports, and urgent requests will appear here.
              </Text>
            </View>
          ) : (
            <ScrollView
              style={{
                maxHeight:
                  440 * Math.max(scale, 0.8),
              }}
              showsVerticalScrollIndicator={
                false
              }
            >
              {notifications.map(
                (
                  notification,
                  index
                ) => (
                  <NotificationItem
                    key={
                      notification.id
                    }
                    notification={
                      notification
                    }
                    scale={
                      scale
                    }
                    fontScale={
                      fontScale
                    }
                    last={
                      index ===
                      notifications.length -
                        1
                    }
                    onPress={() =>
                      handleOpenNotification(
                        notification
                      )
                    }
                  />
                )
              )}
            </ScrollView>
          )}
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// NOTIFICATION ITEM
// ============================================================

function NotificationItem({
  notification,
  scale,
  fontScale,
  last,
  onPress,
}: {
  notification:
    AdminNotification;

  scale:
    number;

  fontScale:
    number;

  last:
    boolean;

  onPress:
    () => void;
}) {
  const visual =
    getNotificationVisual(
      notification.type
    );

  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.item,

        {
          paddingHorizontal:
            18 * scale,

          paddingVertical:
            13 * scale,

          gap:
            12 * scale,
        },

        !notification.is_read &&
          styles.itemUnread,

        last &&
          styles.itemLast,

        pressed &&
          styles.itemPressed,
      ]}
    >
      <View
        style={[
          styles.itemIcon,

          {
            width:
              38 * scale,

            height:
              38 * scale,

            borderRadius:
              10 * scale,

            backgroundColor:
              visual.tint,
          },
        ]}
      >
        <MaterialIcons
          name={
            visual.icon
          }
          size={
            19 * scale
          }
          color={
            visual.color
          }
        />
      </View>

      <View
        style={
          styles.itemBody
        }
      >
        <View
          style={
            styles.itemTop
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={[
              styles.itemTitle,

              {
                fontSize:
                  13 * fontScale,
              },

              notification.is_read &&
                styles.itemTitleRead,
            ]}
          >
            {
              notification.title
            }
          </Text>

          <Text
            style={[
              styles.itemTime,

              {
                fontSize:
                  11 * fontScale,

                marginLeft:
                  8 * scale,
              },
            ]}
          >
            {formatRelativeTime(
              notification.created_at
            )}
          </Text>
        </View>

        <Text
          numberOfLines={
            2
          }
          style={[
            styles.itemMessage,

            {
              fontSize:
                12 * fontScale,

              lineHeight:
                17 * fontScale,

              marginTop:
                3 * scale,
            },
          ]}
        >
          {
            notification.message
          }
        </Text>
      </View>

      {!notification.is_read ? (
        <View
          style={[
            styles.unreadDot,

            {
              width:
                8 * scale,

              height:
                8 * scale,

              borderRadius:
                4 * scale,

              marginTop:
                5 * scale,
            },
          ]}
        />
      ) : null}
    </Pressable>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getNotificationVisual(
  type: string
): {
  icon: IconName;
  color: string;
  tint: string;
} {
  switch (type) {
    case 'admin_donor_application':
      return {
        icon: 'assignment-ind',
        color: COLORS.orange,
        tint: 'rgba(243,163,74,0.12)',
      };

    case 'admin_user_report':
      return {
        icon: 'flag',
        color: COLORS.redBright,
        tint: 'rgba(239,51,64,0.12)',
      };

    case 'admin_urgent_blood_request':
      return {
        icon: 'bloodtype',
        color: COLORS.redBright,
        tint: 'rgba(239,51,64,0.12)',
      };

    case 'admin_donation_recorded':
      return {
        icon: 'volunteer-activism',
        color: COLORS.green,
        tint: 'rgba(53,201,130,0.12)',
      };

    case 'admin_donation_flagged':
      return {
        icon: 'flag',
        color: COLORS.orange,
        tint: 'rgba(243,163,74,0.12)',
      };

    // A blood request hidden after several reports.
    case 'admin_request_flagged':
      return {
        icon: 'visibility-off',
        color: COLORS.orange,
        tint: 'rgba(243,163,74,0.12)',
      };

    default:
      return {
        icon: 'notifications',
        color: COLORS.blue,
        tint: 'rgba(74,140,255,0.12)',
      };
  }
}

// Used only if a notification has no data.route.
function getFallbackRoute(
  type: string
) {
  switch (type) {
    case 'admin_donor_application':
      return '/applications';

    case 'admin_user_report':
    case 'admin_request_flagged':
      return '/issues';

    case 'admin_urgent_blood_request':
      return '/requests';

    case 'admin_donation_recorded':
    case 'admin_donation_flagged':
      return '/donations';

    default:
      return null;
  }
}

function formatRelativeTime(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  const time =
    date.getTime();

  if (
    Number.isNaN(time)
  ) {
    return '';
  }

  const seconds =
    Math.max(
      0,
      Math.floor(
        (Date.now() - time) /
          1000
      )
    );

  if (seconds < 60) {
    return 'Just now';
  }

  const minutes =
    Math.floor(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours =
    Math.floor(
      minutes / 60
    );

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days =
    Math.floor(
      hours / 24
    );

  if (days < 7) {
    return `${days}d ago`;
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
    }
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    // ========================================================
    // BRAND
    // ========================================================

    brandArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        14,
    },

    logoCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.white,
    },

    brand: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    brandRed: {
      color:
        COLORS.redBright,
    },

    portal: {
      marginTop:
        1,

      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // RIGHT
    // ========================================================

    rightSection: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    // ========================================================
    // NOTIFICATION BELL
    // ========================================================

    notificationButton: {
      position:
        'relative',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    notificationButtonActive: {
      borderColor:
        COLORS.redBright,
    },

    notificationBadge: {
      position:
        'absolute',

      top:
        -3,

      right:
        -3,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        2,

      borderColor:
        '#050B19',

      backgroundColor:
        COLORS.redBright,
    },

    notificationBadgeText: {
      color:
        COLORS.white,

      textAlign:
        'center',

      fontFamily:
        'Inter_700Bold',
    },

    divider: {
      width:
        1,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // ADMIN
    // ========================================================

    adminArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingVertical:
        4,
    },

    adminAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    adminAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminInfo: {
      minWidth:
        0,
    },

    adminName: {
      maxWidth:
        175,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      marginTop:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // PANEL
    // ========================================================

    panelBackdrop: {
      ...StyleSheet.absoluteFill,

      backgroundColor:
        'rgba(2,4,10,0.35)',
    },

    panel: {
      position:
        'absolute',

      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOpacity:
        0.4,

      shadowRadius:
        24,

      shadowOffset: {
        width:
          0,

        height:
          14,
      },

      elevation:
        18,
    },

    panelHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    panelTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    panelSubtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    markAllButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    markAllText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    panelState: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        24,
    },

    panelStateTitle: {
      color:
        COLORS.white,

      textAlign:
        'center',

      fontFamily:
        'Poppins_600SemiBold',
    },

    panelStateText: {
      color:
        COLORS.muted,

      textAlign:
        'center',

      fontFamily:
        'Inter_400Regular',
    },

    emptyIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    // ========================================================
    // ITEM
    // ========================================================

    item: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderBottomWidth:
        1,

      borderBottomColor:
        'rgba(36,53,84,0.58)',
    },

    itemUnread: {
      backgroundColor:
        'rgba(239,51,64,0.05)',
    },

    itemLast: {
      borderBottomWidth:
        0,
    },

    itemPressed: {
      backgroundColor:
        'rgba(255,255,255,0.04)',
    },

    itemIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    itemBody: {
      flex:
        1,

      minWidth:
        0,
    },

    itemTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    itemTitle: {
      flex:
        1,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    itemTitleRead: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_500Medium',
    },

    itemTime: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    itemMessage: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    unreadDot: {
      backgroundColor:
        COLORS.redBright,
    },

    // ========================================================
    // INTERACTION
    // ========================================================

    pressed: {
      opacity:
        0.76,
    },

    disabled: {
      opacity:
        0.45,
    },
  });
