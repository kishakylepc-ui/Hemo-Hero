import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
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
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import MainBottomNav from '../components/MainBottomNav';

import {
  FadeInView,
  PressableScale,
} from '../components/Motion';

import {
  getAccessToken,
} from '../lib/session';

import {
  CoordinationInboxError,
  getCoordinationInbox,
} from '../lib/coordination';

import type {
  CoordinationInboxItem,
} from '../lib/coordination';

// ============================================================
// COLORS (same palette as Dashboard / Request Blood)
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  headerTop: '#D2151A',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  cardBorder: '#E8DADA',
  tileBorder: '#F0D6D6',

  pinkLight: '#FFF1F1',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  star: '#F2A516',

  overlay: 'rgba(0,0,0,0.45)',
};

// ============================================================
// HELPERS
// ============================================================

function initials(
  name: string
) {
  const parts =
    name
      .trim()
      .split(/\s+/)
      .filter(Boolean);

  return (
    parts.length > 1
      ? parts[0][0] +
        parts[
          parts.length - 1
        ][0]
      : parts[0]?.[0] ||
        'H'
  ).toUpperCase();
}

function firstName(
  item: CoordinationInboxItem
) {
  return (
    item.other_participant
      .first_name ||
    item.other_participant
      .full_name
      ?.split(' ')[0] ||
    'them'
  );
}

function activityLabel(
  value: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  const minutes =
    Math.floor(
      (Date.now() -
        date.getTime()) /
        60000
    );

  if (
    minutes >= 0 &&
    minutes < 1
  ) {
    return 'Now';
  }

  if (
    minutes >= 1 &&
    minutes < 60
  ) {
    return `${minutes}m`;
  }

  if (
    minutes >= 60 &&
    minutes < 1440
  ) {
    return `${Math.floor(
      minutes / 60
    )}h`;
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      ...(date.getFullYear() !==
      new Date().getFullYear()
        ? {
            year:
              'numeric' as const,
          }
        : {}),
    }
  );
}

function scheduleLabel(
  value: string
) {
  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return 'Scheduled';
  }

  const today =
    new Date();

  const tomorrow =
    new Date(
      today.getFullYear(),
      today.getMonth(),
      today.getDate() + 1
    );

  const day =
    date.toDateString() ===
    today.toDateString()
      ? 'Today'
      : date.toDateString() ===
          tomorrow.toDateString()
        ? 'Tomorrow'
        : date.toLocaleDateString(
            'en-US',
            {
              month: 'short',
              day: 'numeric',
            }
          );

  return `${day}, ${date.toLocaleTimeString(
    'en-US',
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  )}`;
}

// Finished conversations: the request closed, or the donor was
// marked as a no-show.
function isConversationClosed(
  item: CoordinationInboxItem
) {
  return (
    item.request_status !==
      'active' ||
    item.response_status ===
      'no_show'
  );
}

function previewText(
  item: CoordinationInboxItem
) {
  if (item.latest_message) {
    return `${
      item.latest_message.is_mine
        ? 'You: '
        : ''
    }${item.latest_message.message
      .replace(/\s+/g, ' ')
      .trim()}`;
  }

  return item.request_status ===
    'active'
    ? `Say hello to ${firstName(item)}.`
    : 'No messages';
}

// Where this donation stands, as one short line.
function getStatus(
  item: CoordinationInboxItem
): {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  tone: 'accent' | 'green' | 'orange' | 'blue' | 'muted';
} {
  const donation =
    item.donation;

  if (
    item.response_status ===
    'no_show'
  ) {
    return {
      icon: 'person-off',
      label:
        item.viewer_role ===
        'requester'
          ? `${firstName(item)} didn't show up`
          : 'Marked as a no-show',
      tone: 'orange',
    };
  }

  if (
    donation &&
    donation.status !==
      'rejected'
  ) {
    if (!donation.my_rating) {
      return {
        icon: 'star-outline',
        label: `Rate ${firstName(item)}`,
        tone: 'accent',
      };
    }

    if (
      donation.status ===
      'needs_review'
    ) {
      return {
        icon: 'hourglass-top',
        label: 'Donation under review',
        tone: 'orange',
      };
    }

    return {
      icon: 'task-alt',
      label: 'Donation recorded',
      tone: 'green',
    };
  }

  if (
    item.request_status !==
    'active'
  ) {
    return {
      icon: 'lock-outline',
      label: `Request ${item.request_status}`,
      tone: 'muted',
    };
  }

  if (
    donation?.status ===
    'rejected'
  ) {
    return {
      icon: 'error-outline',
      label: 'Record not accepted',
      tone: 'accent',
    };
  }

  if (item.schedule) {
    return {
      icon: 'event',
      label: scheduleLabel(
        item.schedule.scheduled_at
      ),
      tone: 'blue',
    };
  }

  return {
    icon: 'schedule',
    label: 'Set a meeting time',
    tone: 'muted',
  };
}

const TONES = {
  accent: {
    color: COLORS.redButton,
    background: COLORS.pinkLight,
  },
  green: {
    color: COLORS.green,
    background: COLORS.greenLight,
  },
  orange: {
    color: COLORS.orange,
    background: COLORS.orangeLight,
  },
  blue: {
    color: COLORS.blue,
    background: COLORS.blueLight,
  },
  muted: {
    color: COLORS.muted,
    background: COLORS.page,
  },
};

type Filter =
  | 'active'
  | 'closed';

// ============================================================
// CHAT SCREEN
// ============================================================

export default function ChatScreen() {
  const [
    conversations,
    setConversations,
  ] = useState<
    CoordinationInboxItem[]
  >([]);

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    error,
    setError,
  ] = useState('');

  const [
    search,
    setSearch,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<Filter>('active');

  const refreshRef =
    useRef<
      null | (() => void)
    >(null);

  // ==========================================================
  // LOAD CONVERSATIONS
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        let focused =
          true;

        let busy =
          false;

        let controller:
          AbortController | null =
          null;

        setLoading(true);

        setError('');

        // Prevent a previous account's cached rows
        // from staying visible during a new session.
        setConversations([]);

        async function load(
          mode:
            | 'initial'
            | 'pull'
            | 'background'
        ) {
          if (
            !focused ||
            busy
          ) {
            return;
          }

          busy = true;

          if (
            mode === 'pull'
          ) {
            setRefreshing(true);
          }

          controller =
            new AbortController();

          // Stop a stalled request after 20 seconds.
          const timeout =
            setTimeout(
              () =>
                controller?.abort(),
              20000
            );

          try {
            const token =
              await getAccessToken();

            if (!focused) {
              return;
            }

            if (!token) {
              setConversations([]);

              router.replace('/');

              return;
            }

            const result =
              await getCoordinationInbox(
                token,
                controller.signal
              );

            if (!focused) {
              return;
            }

            setConversations(
              result.conversations
            );

            setError('');
          } catch (loadError) {
            if (!focused) {
              return;
            }

            if (
              loadError instanceof
                CoordinationInboxError &&
              loadError.status ===
                401
            ) {
              setConversations([]);

              router.replace('/');

              return;
            }

            setError(
              loadError instanceof
                Error &&
                loadError.name !==
                  'AbortError'
                ? loadError.message
                : 'The connection timed out. Pull down or tap Try again.'
            );
          } finally {
            clearTimeout(timeout);

            busy = false;

            if (focused) {
              setLoading(false);

              setRefreshing(false);
            }
          }
        }

        refreshRef.current =
          () => {
            void load('pull');
          };

        void load('initial');

        // Background refresh while the app is open.
        const interval =
          setInterval(
            () => {
              if (
                AppState.currentState ===
                  'active' ||
                (Platform.OS ===
                  'web' &&
                  AppState.currentState ==
                    null)
              ) {
                void load(
                  'background'
                );
              }
            },
            4000
          );

        const subscription =
          AppState.addEventListener(
            'change',
            state => {
              if (
                state === 'active'
              ) {
                void load(
                  'background'
                );
              }
            }
          );

        return () => {
          focused = false;

          clearInterval(interval);

          subscription.remove();

          controller?.abort();

          refreshRef.current =
            null;
        };
      },
      []
    )
  );

  // ==========================================================
  // FILTER + SEARCH
  // ==========================================================

  const counts =
    useMemo(
      () => ({
        active:
          conversations.filter(
            item =>
              !isConversationClosed(
                item
              )
          ).length,

        closed:
          conversations.filter(
            item =>
              isConversationClosed(
                item
              )
          ).length,
      }),
      [conversations]
    );

  const unreadTotal =
    conversations.reduce(
      (total, item) =>
        total +
        (item.unread_count || 0),
      0
    );

  const visible =
    useMemo(() => {
      const query =
        search
          .trim()
          .toLowerCase();

      return conversations.filter(
        item => {
          const inTab =
            filter === 'active'
              ? !isConversationClosed(
                  item
                )
              : isConversationClosed(
                  item
                );

          if (!inTab) {
            return false;
          }

          if (!query) {
            return true;
          }

          return [
            item.other_participant
              .full_name,
            item.facility_name,
            item.blood_type,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase()
            .includes(query);
        }
      );
    }, [
      conversations,
      filter,
      search,
    ]);

  function openConversation(
    item: CoordinationInboxItem
  ) {
    router.push(
      `/blood-request/${item.request_id}/coordination/${item.response_id}` as any
    );
  }

  // ==========================================================
  // CONVERSATION ROW
  // ==========================================================

  function renderConversation({
    item,
    index,
  }: {
    item: CoordinationInboxItem;
    index: number;
  }) {
    const person =
      item.other_participant;

    const name =
      person.full_name ||
      'Hemo-Hero User';

    const role =
      item.viewer_role ===
      'requester'
        ? 'Donor'
        : 'Requester';

    const unread =
      item.unread_count || 0;

    const status =
      getStatus(item);

    const tone =
      TONES[status.tone];

    return (
      <FadeInView
        delay={Math.min(
          index * 45,
          270
        )}
      >
        <PressableScale
          style={styles.row}
          accessibilityRole="button"
          accessibilityLabel={`Conversation with ${name}, ${role}, ${item.blood_type}, ${item.facility_name}. ${status.label}.${unread ? ` ${unread} unread.` : ''}`}
          onPress={() =>
            openConversation(item)
          }
        >
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>
              {initials(name)}
            </Text>

            {unread > 0 ? (
              <View style={styles.avatarDot} />
            ) : null}
          </View>

          <View style={styles.rowBody}>
            <View style={styles.rowTop}>
              <Text
                numberOfLines={1}
                style={[
                  styles.name,

                  unread > 0 &&
                    styles.nameUnread,
                ]}
              >
                {name}
              </Text>

              {person.role ===
                'donor' &&
              person.verified ? (
                <MaterialIcons
                  name="verified"
                  size={14}
                  color={COLORS.green}
                  accessibilityLabel="Verified donor"
                />
              ) : null}

              <Text
                style={[
                  styles.time,

                  unread > 0 &&
                    styles.timeUnread,
                ]}
              >
                {activityLabel(
                  item.last_activity_at
                )}
              </Text>
            </View>

            <Text
              numberOfLines={1}
              style={styles.meta}
            >
              {role} · {item.blood_type} · {item.facility_name}
            </Text>

            <View style={styles.previewRow}>
              <Text
                numberOfLines={1}
                style={[
                  styles.preview,

                  unread > 0 &&
                    styles.previewUnread,
                ]}
              >
                {previewText(item)}
              </Text>

              {unread > 0 ? (
                <View style={styles.unreadBadge}>
                  <Text style={styles.unreadText}>
                    {unread > 9
                      ? '9+'
                      : unread}
                  </Text>
                </View>
              ) : null}
            </View>

            <View
              style={[
                styles.status,

                {
                  backgroundColor:
                    tone.background,
                },
              ]}
            >
              <MaterialIcons
                name={status.icon}
                size={13}
                color={tone.color}
              />

              <Text
                numberOfLines={1}
                style={[
                  styles.statusText,

                  {
                    color:
                      tone.color,
                  },
                ]}
              >
                {status.label}
              </Text>
            </View>
          </View>
        </PressableScale>
      </FadeInView>
    );
  }

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={[
            'top',
            'bottom',
            'left',
            'right',
          ]}
        >
          <StatusBar style="light" />

          {/* HEADER (same as the Requests tab) */}

          <LinearGradient
            colors={[
              '#CF1115',
              COLORS.redDark,
            ]}
            style={styles.header}
          >
            <View style={styles.headerCircleLeft} />

            <View style={styles.headerCircleRight} />

            <View style={styles.headerTop}>
              <View style={styles.headerText}>
                <Text style={styles.eyebrow}>
                  CHAT
                </Text>

                <Text
                  accessibilityRole="header"
                  style={styles.title}
                >
                  Messages
                </Text>

                <Text style={styles.subtitle}>
                  Coordinate your donations
                </Text>
              </View>

              {unreadTotal > 0 ? (
                <FadeInView
                  key={unreadTotal}
                  offset={0}
                  style={styles.newPill}
                >
                  <View style={styles.newDot} />

                  <Text style={styles.newText}>
                    {unreadTotal} new
                  </Text>
                </FadeInView>
              ) : null}
            </View>

            <View style={styles.searchBox}>
              <MaterialIcons
                name="search"
                size={20}
                color={COLORS.lightMuted}
              />

              <TextInput
                value={search}
                onChangeText={setSearch}
                placeholder="Search name or place"
                placeholderTextColor={COLORS.lightMuted}
                returnKeyType="search"
                style={styles.searchInput}
              />

              {search ? (
                <TouchableOpacity
                  accessibilityLabel="Clear search"
                  onPress={() =>
                    setSearch('')
                  }
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={COLORS.muted}
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </LinearGradient>

          {/* CONTENT */}

          <View style={styles.content}>
            <View style={styles.tabBar}>
              {(
                [
                  'active',
                  'closed',
                ] as const
              ).map(value => {
                const selected =
                  filter === value;

                return (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.tabButton,

                      selected &&
                        styles.tabButtonActive,
                    ]}
                    activeOpacity={0.8}
                    accessibilityState={{
                      selected,
                    }}
                    onPress={() =>
                      setFilter(value)
                    }
                  >
                    <MaterialIcons
                      name={
                        value === 'active'
                          ? 'forum'
                          : 'lock-outline'
                      }
                      size={16}
                      color={
                        selected
                          ? COLORS.redButton
                          : COLORS.muted
                      }
                    />

                    <Text
                      style={[
                        styles.tabText,

                        selected &&
                          styles.tabTextActive,
                      ]}
                    >
                      {value === 'active'
                        ? 'Active'
                        : 'Closed'}
                    </Text>

                    <View style={styles.tabCount}>
                      <Text style={styles.tabCountText}>
                        {counts[value]}
                      </Text>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
            {error &&
            conversations.length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                style={styles.warning}
                onPress={() =>
                  refreshRef.current?.()
                }
              >
                <MaterialIcons
                  name="refresh"
                  size={17}
                  color={COLORS.redButton}
                />

                <Text style={styles.warningText}>
                  Couldn’t refresh. Tap to try again.
                </Text>
              </TouchableOpacity>
            ) : null}

            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.redButton}
                />

                <Text style={styles.stateText}>
                  Loading your conversations…
                </Text>
              </View>
            ) : (
              <FlatList
                data={visible}
                keyExtractor={item =>
                  item.response_id
                }
                renderItem={
                  renderConversation
                }
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
                style={styles.list}
                contentContainerStyle={[
                  styles.listContent,

                  !visible.length &&
                    styles.listEmpty,
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={
                      refreshing
                    }
                    onRefresh={() =>
                      refreshRef.current?.()
                    }
                    tintColor={
                      COLORS.redButton
                    }
                    colors={[
                      COLORS.redButton,
                    ]}
                  />
                }
                ListEmptyComponent={
                  <FadeInView
                    style={styles.centerState}
                  >
                    <View style={styles.emptyIcon}>
                      <MaterialIcons
                        name={
                          error
                            ? 'cloud-off'
                            : search
                              ? 'search-off'
                              : 'chat-bubble-outline'
                        }
                        size={28}
                        color={COLORS.redButton}
                      />
                    </View>

                    <Text
                      accessibilityRole="header"
                      style={styles.stateTitle}
                    >
                      {error
                        ? 'Unable to load conversations'
                        : search
                          ? 'No matches'
                          : filter ===
                              'active'
                            ? 'No active conversations'
                            : 'No closed conversations'}
                    </Text>

                    <Text style={styles.stateText}>
                      {error ||
                        (search
                          ? 'Try a different name or place.'
                          : filter ===
                              'active'
                            ? 'A conversation starts when a donor offer is accepted, as a requester or a donor.'
                            : 'Finished, cancelled, and no-show conversations appear here.')}
                    </Text>

                    {error ? (
                      <TouchableOpacity
                        accessibilityRole="button"
                        style={styles.stateButton}
                        activeOpacity={0.85}
                        onPress={() =>
                          refreshRef.current?.()
                        }
                      >
                        <Text style={styles.stateButtonText}>
                          Try Again
                        </Text>
                      </TouchableOpacity>
                    ) : null}
                  </FadeInView>
                }
              />
            )}
          </View>

          <MainBottomNav activeTab="chat" />
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  desktopBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Platform.OS === 'web'
        ? '#242424'
        : COLORS.page,
  },

  phone: {
    width: '100%',
    height: '100%',
    maxWidth:
      Platform.OS === 'web'
        ? 440
        : undefined,
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.redDark,
  },

  // HEADER (same as the Requests tab)

  header: {
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 16,
    overflow: 'hidden',
  },

  headerCircleLeft: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    left: -95,
    top: -105,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  headerCircleRight: {
    position: 'absolute',
    width: 180,
    height: 180,
    borderRadius: 90,
    right: -100,
    top: -110,
    backgroundColor: 'rgba(255,255,255,0.07)',
  },

  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  eyebrow: {
    marginBottom: 3,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.3,
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
  },

  subtitle: {
    marginTop: 2,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  newPill: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.18)',
  },

  newDot: {
    width: 7,
    height: 7,
    borderRadius: 4,
    backgroundColor: COLORS.white,
  },

  newText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  searchBox: {
    height: 46,
    marginTop: 14,
    paddingHorizontal: 13,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 13,
    backgroundColor: COLORS.white,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 13.5,
    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  // TABS (same as the Requests tab)

  tabBar: {
    minHeight: 52,
    marginHorizontal: 16,
    marginTop: 14,
    padding: 4,
    flexDirection: 'row',
    borderRadius: 14,
    backgroundColor: '#ECE5E5',
  },

  tabButton: {
    flex: 1,
    minWidth: 0,
    paddingHorizontal: 3,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    borderRadius: 11,
  },

  tabButtonActive: {
    backgroundColor: COLORS.white,
    shadowColor: '#000000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.07,
    shadowRadius: 3,
    elevation: 2,
  },

  tabText: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },

  tabTextActive: {
    color: COLORS.redButton,
  },

  tabCount: {
    minWidth: 19,
    height: 19,
    paddingHorizontal: 4,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  tabCountText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },

  // CONTENT

  content: {
    flex: 1,
    backgroundColor: COLORS.page,
  },

  warning: {
    marginHorizontal: 16,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },

  warningText: {
    flex: 1,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  list: {
    flex: 1,
  },

  listContent: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 20,
  },

  listEmpty: {
    flexGrow: 1,
  },

  row: {
    marginBottom: 10,
    padding: 13,
    flexDirection: 'row',
    gap: 12,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  avatar: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.tileBorder,
    backgroundColor: COLORS.pinkLight,
  },

  avatarText: {
    color: COLORS.redButton,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
  },

  avatarDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: COLORS.white,
    backgroundColor: COLORS.red,
  },

  rowBody: {
    flex: 1,
    minWidth: 0,
  },

  rowTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },

  name: {
    flexShrink: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
  },

  nameUnread: {
    fontFamily: 'Poppins_600SemiBold',
  },

  time: {
    marginLeft: 'auto',
    paddingLeft: 8,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
  },

  timeUnread: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
  },

  meta: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  previewRow: {
    marginTop: 6,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },

  preview: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
  },

  previewUnread: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
  },

  unreadBadge: {
    minWidth: 20,
    height: 20,
    paddingHorizontal: 6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 10,
    backgroundColor: COLORS.red,
  },

  unreadText: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
    fontSize: 11,
  },

  status: {
    marginTop: 9,
    alignSelf: 'flex-start',
    maxWidth: '100%',
    paddingHorizontal: 9,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
  },

  statusText: {
    flexShrink: 1,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },

  // STATES

  centerState: {
    flex: 1,
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },

  emptyIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  stateTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },

  stateText: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },

  stateButton: {
    height: 42,
    marginTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.redButton,
  },

  stateButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
});
