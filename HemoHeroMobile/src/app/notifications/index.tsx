import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  router,
  useFocusEffect,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import MainBottomNav from '../../components/MainBottomNav';

import {
  FadeInView,
} from '../../components/Motion';

import {
  AppNotification,
  getNotifications,
  markAllNotificationsAsRead,
  markNotificationAsRead,
} from '../../lib/api';

import {
  getAccessToken,
} from '../../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',
  card: '#FFFFFF',

  muted: '#666666',
  lightMuted: '#969696',

  border: '#E4D7D7',

  green: '#159447',
  orange: '#DF721D',
  blue: '#3478F6',

  pinkLight: '#FFF0F0',
  greenLight: '#EAF7EF',
  orangeLight: '#FFF5E8',
  blueLight: '#EEF4FF',
  grayLight: '#F4F4F5',
};

// ============================================================
// TYPES
// ============================================================

type FilterType =
  | 'all'
  | 'unread';

// ============================================================
// NOTIFICATIONS SCREEN
// ============================================================

export default function NotificationsScreen() {
  const [
    notifications,
    setNotifications,
  ] =
    useState<
      AppNotification[]
    >([]);

  const [
    unreadCount,
    setUnreadCount,
  ] =
    useState(0);

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(false);

  const [
    markingAll,
    setMarkingAll,
  ] =
    useState(false);

  const [
    filter,
    setFilter,
  ] =
    useState<FilterType>(
      'all'
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  // ==========================================================
  // LOAD NOTIFICATIONS
  // ==========================================================

  const loadNotifications =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (
            !silent
          ) {
            setLoading(
              true
            );
          }

          setErrorMessage(
            ''
          );

          const token =
            await getAccessToken();

          if (
            !token
          ) {
            router.replace(
              '/'
            );

            return;
          }

          const result =
            await getNotifications(
              token,
              100
            );

          const rows =
            Array.isArray(
              result
                ?.notifications
            )
              ? result.notifications
              : [];

          setNotifications(
            rows
          );

          setUnreadCount(
            Number(
              result
                ?.unread_count
            ) || 0
          );
        } catch (
          error
        ) {
          console.log(
            'LOAD NOTIFICATIONS ERROR:',
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : 'Unable to load notifications.'
          );
        } finally {
          if (
            !silent
          ) {
            setLoading(
              false
            );
          }
        }
      },
      []
    );

  // ==========================================================
  // REFRESH ON FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadNotifications();
      },
      [
        loadNotifications,
      ]
    )
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  async function handleRefresh() {
    try {
      setRefreshing(
        true
      );

      await loadNotifications(
        true
      );
    } finally {
      setRefreshing(
        false
      );
    }
  }

  // ==========================================================
  // FILTER
  // ==========================================================

  const visibleNotifications =
    useMemo(
      () => {
        if (
          filter ===
          'unread'
        ) {
          return notifications.filter(
            item =>
              !item.is_read
          );
        }

        return notifications;
      },
      [
        notifications,
        filter,
      ]
    );

  // ==========================================================
  // LOCAL READ STATE
  // ==========================================================

  function setNotificationReadLocally(
    notificationId: string
  ) {
    let changed =
      false;

    setNotifications(
      current =>
        current.map(
          item => {
            if (
              item.id !==
              notificationId
            ) {
              return item;
            }

            if (
              item.is_read
            ) {
              return item;
            }

            changed =
              true;

            return {
              ...item,

              is_read:
                true,

              read_at:
                new Date()
                  .toISOString(),
            };
          }
        )
    );

    if (
      changed
    ) {
      setUnreadCount(
        current =>
          Math.max(
            0,
            current -
              1
          )
      );
    }
  }

  // ==========================================================
  // OPEN NOTIFICATION DESTINATION
  // ==========================================================

  function openNotificationDestination(
    notification:
      AppNotification
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

    if (
      notification.type ===
        'blood_request_fulfilled' ||
      notification.type ===
        'blood_request_cancelled'
    ) {
      router.push(
        (requestId
          ? `/blood-request/donor/${requestId}`
          : '/dashboard') as any
      );

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

  // ==========================================================
  // PRESS NOTIFICATION
  // ==========================================================

  async function handleNotificationPress(
    notification:
      AppNotification
  ) {
    if (
      !notification.is_read
    ) {
      try {
        const token =
          await getAccessToken();

        if (
          token
        ) {
          await markNotificationAsRead(
            token,
            notification.id
          );

          setNotificationReadLocally(
            notification.id
          );
        }
      } catch (
        error
      ) {
        console.log(
          'MARK NOTIFICATION READ ERROR:',
          error
        );
      }
    }

    openNotificationDestination(
      notification
    );
  }

  // ==========================================================
  // MARK ALL READ
  // ==========================================================

  async function handleMarkAllRead() {
    if (
      markingAll ||
      unreadCount ===
        0
    ) {
      return;
    }

    try {
      setMarkingAll(
        true
      );

      setErrorMessage(
        ''
      );

      const token =
        await getAccessToken();

      if (
        !token
      ) {
        router.replace(
          '/'
        );

        return;
      }

      await markAllNotificationsAsRead(
        token
      );

      const now =
        new Date()
          .toISOString();

      setNotifications(
        current =>
          current.map(
            item => ({
              ...item,

              is_read:
                true,

              read_at:
                item.read_at ||
                now,
            })
          )
      );

      setUnreadCount(
        0
      );
    } catch (
      error
    ) {
      console.log(
        'MARK ALL NOTIFICATIONS READ ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to mark notifications as read.'
      );
    } finally {
      setMarkingAll(
        false
      );
    }
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.desktopBackground
      }
    >
      <View
        style={
          styles.phone
        }
      >
        <SafeAreaView
          style={
            styles.safeArea
          }
          edges={[
            'top',
            'bottom',
          ]}
        >
          <StatusBar
            style="light"
          />

          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              '#D2151A',
              COLORS.redDark,
            ]}
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerCircleLeft
              }
            />

            <View
              style={
                styles.headerCircleRight
              }
            />

            {/* BACK */}

            <TouchableOpacity
              style={
                styles.headerSideButton
              }
              activeOpacity={
                0.75
              }
              accessibilityRole="button"
              accessibilityLabel="Go back"
              onPress={() =>
                router.back()
              }
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>

            {/* TITLE */}

            <View
              style={
                styles.headerCenter
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                Notifications
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Your latest Hemo-Hero activity
              </Text>
            </View>

            {/* MARK ALL READ */}

            <TouchableOpacity
              style={
                styles.headerSideButton
              }
              activeOpacity={
                unreadCount >
                0
                  ? 0.75
                  : 1
              }
              disabled={
                unreadCount ===
                  0 ||
                markingAll
              }
              accessibilityRole="button"
              accessibilityLabel="Mark all notifications as read"
              onPress={
                handleMarkAllRead
              }
            >
              <MaterialIcons
                name="done-all"
                size={22}
                color={
                  unreadCount >
                  0
                    ? COLORS.white
                    : 'rgba(255,255,255,0.42)'
                }
              />
            </TouchableOpacity>
          </LinearGradient>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            style={
              styles.content
            }
            contentContainerStyle={
              styles.contentContainer
            }
            showsVerticalScrollIndicator={
              false
            }
            bounces={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  handleRefresh
                }
                tintColor={
                  COLORS.redButton
                }
              />
            }
          >
            {/* ==================================================
                SUMMARY
            ================================================== */}

            <View
              style={
                styles.summaryCard
              }
            >
              <View
                style={
                  styles.summaryIcon
                }
              >
                <MaterialIcons
                  name={
                    unreadCount >
                    0
                      ? 'notifications-active'
                      : 'done-all'
                  }
                  size={24}
                  color={
                    unreadCount >
                    0
                      ? COLORS.redButton
                      : COLORS.green
                  }
                />
              </View>

              <View
                style={
                  styles.summaryContent
                }
              >
                <Text
                  style={
                    styles.summaryTitle
                  }
                >
                  {unreadCount >
                  0
                    ? 'New Activity'
                    : 'All Caught Up'}
                </Text>

                <Text
                  style={
                    styles.summarySubtitle
                  }
                >
                  {unreadCount >
                  0
                    ? `${unreadCount} unread notification${unreadCount === 1 ? '' : 's'}`
                    : 'You have no unread notifications'}
                </Text>
              </View>

              {unreadCount >
              0 ? (
                <View
                  style={
                    styles.summaryBadge
                  }
                >
                  <Text
                    style={
                      styles.summaryBadgeText
                    }
                  >
                    {unreadCount >
                    99
                      ? '99+'
                      : unreadCount}
                  </Text>
                </View>
              ) : null}
            </View>

            {/* ==================================================
                FILTER
            ================================================== */}

            <View
              style={
                styles.filterBar
              }
            >
              <TouchableOpacity
                style={[
                  styles.filterButton,

                  filter ===
                    'all' &&
                    styles.filterButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setFilter(
                    'all'
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,

                    filter ===
                      'all' &&
                      styles.filterTextActive,
                  ]}
                >
                  All
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.filterButton,

                  filter ===
                    'unread' &&
                    styles.filterButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setFilter(
                    'unread'
                  )
                }
              >
                <Text
                  style={[
                    styles.filterText,

                    filter ===
                      'unread' &&
                      styles.filterTextActive,
                  ]}
                >
                  Unread
                </Text>

                {unreadCount >
                0 ? (
                  <View
                    style={
                      styles.filterBadge
                    }
                  >
                    <Text
                      style={
                        styles.filterBadgeText
                      }
                    >
                      {unreadCount >
                      99
                        ? '99+'
                        : unreadCount}
                    </Text>
                  </View>
                ) : null}
              </TouchableOpacity>
            </View>

            {/* ==================================================
                ERROR
            ================================================== */}

            {errorMessage ? (
              <View
                style={
                  styles.errorCard
                }
              >
                <MaterialIcons
                  name="error-outline"
                  size={20}
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.errorText
                  }
                >
                  {
                    errorMessage
                  }
                </Text>
              </View>
            ) : null}

            {/* ==================================================
                LOADING
            ================================================== */}

            {loading ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.stateIcon
                  }
                >
                  <MaterialIcons
                    name="notifications-none"
                    size={31}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Loading Notifications
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  Checking your latest Hemo-Hero activity...
                </Text>
              </View>
            ) : null}

            {/* ==================================================
                EMPTY
            ================================================== */}

            {!loading &&
            visibleNotifications
              .length ===
              0 ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.stateIcon
                  }
                >
                  <MaterialIcons
                    name={
                      filter ===
                      'unread'
                        ? 'done-all'
                        : 'notifications-none'
                    }
                    size={31}
                    color={
                      filter ===
                      'unread'
                        ? COLORS.green
                        : COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  {filter ===
                  'unread'
                    ? 'All Caught Up'
                    : 'No Notifications Yet'}
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  {filter ===
                  'unread'
                    ? 'You have no unread notifications.'
                    : 'Blood requests, donor offers, approvals, invitations, and coordination updates will appear here.'}
                </Text>
              </View>
            ) : null}

            {/* ==================================================
                NOTIFICATION LIST
            ================================================== */}

            {!loading &&
              visibleNotifications.map(
                (notification, index) => (
                  <FadeInView
                    key={
                      notification.id
                    }
                    delay={Math.min(
                      index * 40,
                      280
                    )}
                  >
                    <NotificationCard
                      notification={
                        notification
                      }
                      onPress={() =>
                        handleNotificationPress(
                          notification
                        )
                      }
                    />
                  </FadeInView>
                )
              )}

            <View
              style={
                styles.bottomSpacing
              }
            />
          </ScrollView>

          {/* ==================================================
              SHARED BOTTOM NAVIGATION
          ================================================== */}

          <MainBottomNav />
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// NOTIFICATION CARD
// ============================================================

function NotificationCard({
  notification,
  onPress,
}: {
  notification:
    AppNotification;

  onPress:
    () => void;
}) {
  const appearance =
    getNotificationAppearance(
      notification
    );

  return (
    <TouchableOpacity
      style={[
        styles.notificationCard,

        !notification.is_read &&
          styles.notificationCardUnread,
      ]}
      activeOpacity={
        0.84
      }
      onPress={
        onPress
      }
    >
      <View
        style={[
          styles.notificationIcon,

          {
            backgroundColor:
              appearance.background,
          },
        ]}
      >
        <MaterialIcons
          name={
            appearance.icon
          }
          size={21}
          color={
            appearance.color
          }
        />
      </View>

      <View
        style={
          styles.notificationBody
        }
      >
        <View
          style={
            styles.notificationTitleRow
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={[
              styles.notificationTitle,

              !notification.is_read &&
                styles.notificationTitleUnread,
            ]}
          >
            {
              notification.title
            }
          </Text>

          {!notification.is_read ? (
            <View
              style={
                styles.unreadDot
              }
            />
          ) : null}
        </View>

        <Text
          style={
            styles.notificationMessage
          }
        >
          {
            notification.message
          }
        </Text>

        <View
          style={
            styles.notificationFooter
          }
        >
          <MaterialIcons
            name="schedule"
            size={12}
            color={
              COLORS.lightMuted
            }
          />

          <Text
            style={
              styles.notificationTime
            }
          >
            {formatRelativeTime(
              notification
                .created_at
            )}
          </Text>

          <View
            style={
              styles.footerSpacer
            }
          />

          <Text
            style={
              styles.viewText
            }
          >
            View
          </Text>

          <MaterialIcons
            name="chevron-right"
            size={17}
            color={
              COLORS.redButton
            }
          />
        </View>
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// NOTIFICATION APPEARANCE
// ============================================================

function getNotificationAppearance(
  notification:
    AppNotification
): {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  color:
    string;

  background:
    string;
} {
  const kind =
    String(
      notification
        .data
        ?.kind ||
        ''
    )
      .trim()
      .toLowerCase();

  // ==========================================================
  // DIRECT DONOR INVITATION
  // ==========================================================

  if (
    kind ===
    'donor_invitation'
  ) {
    return {
      icon:
        'mail-outline',

      color:
        COLORS.redButton,

      background:
        COLORS.pinkLight,
    };
  }

  // ==========================================================
  // INVITATION ACCEPTED
  // ==========================================================

  if (
    kind ===
    'donor_invitation_accepted'
  ) {
    return {
      icon:
        'how-to-reg',

      color:
        COLORS.green,

      background:
        COLORS.greenLight,
    };
  }

  // ==========================================================
  // INVITATION DECLINED
  // ==========================================================

  if (
    kind ===
    'donor_invitation_declined'
  ) {
    return {
      icon:
        'person-off',

      color:
        COLORS.orange,

      background:
        COLORS.orangeLight,
    };
  }

  // ==========================================================
  // NORMAL NOTIFICATION TYPES
  // ==========================================================

  switch (
    notification.type
  ) {
    case 'donor_response_received':
      return {
        icon:
          'volunteer-activism',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    case 'donor_response_withdrawn':
      return {
        icon:
          'person-remove',

        color:
          COLORS.orange,

        background:
          COLORS.orangeLight,
      };

    case 'donor_response_accepted':
      return {
        icon:
          'check-circle',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'donor_response_rejected':
      return {
        icon:
          'cancel',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    case 'blood_request_fulfilled':
      return {
        icon:
          'favorite',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'blood_request_cancelled':
      return {
        icon:
          'event-busy',

        color:
          COLORS.orange,

        background:
          COLORS.orangeLight,
      };

    case 'blood_request_removed':
      return {
        icon:
          'block',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    case 'coordination_no_show':
      return {
        icon:
          'person-off',

        color:
          COLORS.orange,

        background:
          COLORS.orangeLight,
      };

    case 'donor_application_approved':
      return {
        icon:
          'verified',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'donor_application_rejected':
      return {
        icon:
          'gpp-bad',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    case 'coordination_message':
      return {
        icon:
          'chat-bubble-outline',

        color:
          COLORS.blue,

        background:
          COLORS.blueLight,
      };

    case 'coordination_schedule':
      return {
        icon:
          'event',

        color:
          COLORS.blue,

        background:
          COLORS.blueLight,
      };

    case 'donation_recorded':
      return {
        icon:
          'task-alt',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'donation_disputed':
      return {
        icon:
          'hourglass-top',

        color:
          COLORS.orange,

        background:
          COLORS.orangeLight,
      };

    case 'donation_feedback_received':
      return {
        icon:
          'star',

        color:
          COLORS.orange,

        background:
          COLORS.orangeLight,
      };

    case 'donation_verified':
      return {
        icon:
          'verified',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'donation_rejected':
      return {
        icon:
          'error-outline',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    default:
      return {
        icon:
          'notifications',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };
  }
}

// ============================================================
// RELATIVE TIME
// ============================================================

function formatRelativeTime(
  value:
    string
) {
  if (
    !value
  ) {
    return '';
  }

  const date =
    new Date(
      value
    );

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const now =
    Date.now();

  const difference =
    Math.max(
      0,
      now -
        date.getTime()
    );

  const minute =
    60 *
    1000;

  const hour =
    60 *
    minute;

  const day =
    24 *
    hour;

  if (
    difference <
    minute
  ) {
    return 'Just now';
  }

  if (
    difference <
    hour
  ) {
    return `${Math.floor(
      difference /
        minute
    )}m ago`;
  }

  if (
    difference <
    day
  ) {
    return `${Math.floor(
      difference /
        hour
    )}h ago`;
  }

  if (
    difference <
    day *
      2
  ) {
    return 'Yesterday';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month:
        'short',

      day:
        'numeric',

      year:
        date.getFullYear() !==
        new Date()
          .getFullYear()
          ? 'numeric'
          : undefined,
    }
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    desktopBackground: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS ===
        'web'
          ? '#242424'
          : COLORS.page,
    },

    phone: {
      width:
        Platform.OS ===
        'web'
          ? 440
          : '100%',

      height:
        Platform.OS ===
        'web'
          ? '100%'
          : '100%',

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.page,
    },

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height:
        88,

      paddingHorizontal:
        14,

      flexDirection:
        'row',

      alignItems:
        'center',

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        170,

      height:
        170,

      borderRadius:
        85,

      left:
        -95,

      top:
        -112,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      right:
        -98,

      top:
        -115,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerSideButton: {
      width:
        44,

      height:
        44,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerCenter: {
      flex:
        1,

      alignItems:
        'center',
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        21,
    },

    headerSubtitle: {
      marginTop:
        1,

      color:
        'rgba(255,255,255,0.80)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },

    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },

    contentContainer: {
      paddingHorizontal:
        18,

      paddingTop:
        18,

      paddingBottom:
        25,
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryCard: {
      minHeight:
        72,

      marginBottom:
        14,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        15,

      backgroundColor:
        COLORS.white,
    },

    summaryIcon: {
      width:
        42,

      height:
        42,

      marginRight:
        10,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    summaryContent: {
      flex:
        1,
    },

    summaryTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    summarySubtitle: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    summaryBadge: {
      minWidth:
        32,

      height:
        32,

      paddingHorizontal:
        7,

      borderRadius:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    summaryBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    // ========================================================
    // FILTER
    // ========================================================

    filterBar: {
      height:
        42,

      marginBottom:
        14,

      padding:
        4,

      flexDirection:
        'row',

      borderRadius:
        12,

      backgroundColor:
        '#ECE5E5',
    },

    filterButton: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      borderRadius:
        9,
    },

    filterButtonActive: {
      backgroundColor:
        COLORS.white,
    },

    filterText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,
    },

    filterTextActive: {
      color:
        COLORS.black,
    },

    filterBadge: {
      minWidth:
        18,

      height:
        18,

      paddingHorizontal:
        4,

      borderRadius:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    filterBadgeText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      minHeight:
        52,

      marginBottom:
        12,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        '#EAB0B0',

      borderRadius:
        12,

      backgroundColor:
        COLORS.pinkLight,
    },

    errorText: {
      flex:
        1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,
    },

    // ========================================================
    // NOTIFICATION CARD
    // ========================================================

    notificationCard: {
      marginBottom:
        10,

      paddingHorizontal:
        12,

      paddingVertical:
        13,

      flexDirection:
        'row',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        14,

      backgroundColor:
        COLORS.white,
    },

    notificationCardUnread: {
      borderColor:
        '#EDB5B5',

      backgroundColor:
        '#FFFCFC',
    },

    notificationIcon: {
      width:
        42,

      height:
        42,

      marginRight:
        11,

      borderRadius:
        21,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBody: {
      flex:
        1,

      minWidth:
        0,
    },

    notificationTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    notificationTitle: {
      flex:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        13.5,
    },

    notificationTitleUnread: {
      fontFamily:
        'Inter_600SemiBold',
    },

    unreadDot: {
      width:
        7,

      height:
        7,

      marginLeft:
        6,

      borderRadius:
        4,

      backgroundColor:
        COLORS.red,
    },

    notificationMessage: {
      marginTop:
        4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    notificationFooter: {
      marginTop:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    notificationTime: {
      marginLeft:
        4,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    footerSpacer: {
      flex:
        1,
    },

    viewText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    // ========================================================
    // STATE
    // ========================================================

    stateCard: {
      minHeight:
        245,

      paddingHorizontal:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,
    },

    stateIcon: {
      width:
        62,

      height:
        62,

      marginBottom:
        12,

      borderRadius:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    stateTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        15,
    },

    stateDescription: {
      maxWidth:
        275,

      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,

      textAlign:
        'center',
    },

    bottomSpacing: {
      height:
        6,
    },
  });