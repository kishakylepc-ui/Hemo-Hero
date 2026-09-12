import { useCallback, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  AppState,
  FlatList,
  Platform,
  RefreshControl,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFonts } from 'expo-font';
import {
  Poppins_600SemiBold,
  Poppins_700Bold,
} from '@expo-google-fonts/poppins';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { getAccessToken } from '../lib/session';
import {
  CoordinationInboxError,
  getCoordinationInbox,
} from '../lib/coordination';
import type { CoordinationInboxItem } from '../lib/coordination';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
  page: '#FFF8F8',
  muted: '#666666',
  border: '#EAE1E1',
  pink: '#FFF0F0',
  green: '#2E7D32',
  gray: '#F5F5F5',
};

function initials(name: string) {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  return (
    parts.length > 1
      ? parts[0][0] + parts[parts.length - 1][0]
      : parts[0]?.[0] || 'H'
  ).toUpperCase();
}

function activityLabel(value: string | null) {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const minutes = Math.floor((Date.now() - date.getTime()) / 60000);
  if (minutes >= 0 && minutes < 1) return 'Now';
  if (minutes >= 1 && minutes < 60) return `${minutes}m`;
  if (minutes >= 60 && minutes < 1440) return `${Math.floor(minutes / 60)}h`;
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    ...(date.getFullYear() !== new Date().getFullYear()
      ? { year: 'numeric' as const }
      : {}),
  });
}

function scheduleLabel(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Donation scheduled';
  const today = new Date();
  const tomorrow = new Date(
    today.getFullYear(),
    today.getMonth(),
    today.getDate() + 1,
  );
  const day =
    date.toDateString() === today.toDateString()
      ? 'Today'
      : date.toDateString() === tomorrow.toDateString()
        ? 'Tomorrow'
        : date.toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            ...(date.getFullYear() !== today.getFullYear()
              ? { year: 'numeric' as const }
              : {}),
          });
  return `${day} · ${date.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })}`;
}

function previewText(item: CoordinationInboxItem) {
  if (item.latest_message) {
    return `${item.latest_message.is_mine ? 'You: ' : ''}${item.latest_message.message.replace(/\s+/g, ' ').trim()}`;
  }
  if (item.schedule) return scheduleLabel(item.schedule.scheduled_at);
  return item.request_status === 'active'
    ? 'Start coordinating your donation.'
    : 'Conversation closed · Read only';
}

export default function ChatScreen() {
  const [fontsLoaded, fontError] = useFonts({
    Poppins_600SemiBold,
    Poppins_700Bold,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
  });
  const [conversations, setConversations] = useState<CoordinationInboxItem[]>(
    [],
  );
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');
  const refreshRef = useRef<null | (() => void)>(null);

  useFocusEffect(
    useCallback(() => {
      let focused = true;
      let busy = false;
      let controller: AbortController | null = null;
      setLoading(true);
      setError('');
      // Clear another account's cached rows on each new focus/session load.
      setConversations([]);

      async function load(mode: 'initial' | 'pull' | 'background') {
        if (!focused || busy) return;
        busy = true;
        if (mode === 'pull') setRefreshing(true);
        controller = new AbortController();
        // Bound a stalled request so the refresh button can recover.
        const timeout = setTimeout(() => controller?.abort(), 20000);
        try {
          const token = await getAccessToken();
          if (!focused) return;
          if (!token) {
            setConversations([]);
            router.replace('/');
            return;
          }
          const result = await getCoordinationInbox(token, controller.signal);
          if (!focused) return;
          setConversations(result.conversations);
          setError('');
        } catch (loadError) {
          if (!focused) return;
          if (
            loadError instanceof CoordinationInboxError &&
            loadError.status === 401
          ) {
            setConversations([]);
            router.replace('/');
            return;
          }
          setError(
            loadError instanceof Error && loadError.name !== 'AbortError'
              ? loadError.message
              : 'The connection timed out. Pull down or tap Try again.',
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

      refreshRef.current = () => {
        void load('pull');
      };
      void load('initial');
      const interval = setInterval(() => {
        if (
          AppState.currentState === 'active' ||
          (Platform.OS === 'web' && AppState.currentState == null)
        ) {
          void load('background');
        }
      }, 4000);
      const subscription = AppState.addEventListener('change', (state) => {
        if (state === 'active') void load('background');
      });
      return () => {
        focused = false;
        clearInterval(interval);
        subscription.remove();
        controller?.abort();
        refreshRef.current = null;
      };
    }, []),
  );

  function openConversation(item: CoordinationInboxItem) {
    router.push(
      `/blood-request/${item.request_id}/coordination/${item.response_id}` as any,
    );
  }

  function showComingSoon(page: string) {
    const message = `${page} will be connected as we continue building Hemo-Hero.`;
    if (Platform.OS === 'web' && typeof window !== 'undefined')
      window.alert(message);
    else Alert.alert(page, message);
  }

  function renderConversation({ item }: { item: CoordinationInboxItem }) {
    const person = item.other_participant;
    const name = person.full_name || 'Hemo-Hero User';
    const role =
      item.viewer_role === 'requester' ? 'Accepted Donor' : 'Blood Requester';
    const closed = item.request_status !== 'active';
    return (
      <TouchableOpacity
        style={styles.conversation}
        activeOpacity={0.75}
        accessibilityRole="button"
        accessibilityLabel={`Open conversation with ${name}, ${role}, ${item.blood_type}, ${item.facility_name}${closed ? ', read only' : ''}`}
        onPress={() => openConversation(item)}
      >
        <View style={styles.avatar}>
          <Text style={styles.avatarText}>{initials(name)}</Text>
        </View>
        <View style={styles.conversationBody}>
          <View style={styles.nameRow}>
            <Text numberOfLines={1} style={styles.personName}>
              {name}
            </Text>
            <Text style={styles.time}>
              {activityLabel(item.last_activity_at)}
            </Text>
          </View>
          <View style={styles.roleRow}>
            <Text style={styles.role}>{role}</Text>
            {person.role === 'donor' && person.verified ? (
              <MaterialIcons
                name="verified"
                size={15}
                color={COLORS.green}
                accessibilityLabel="Verified donor"
                accessible
              />
            ) : null}
          </View>
          <View style={styles.requestRow}>
            <View style={styles.bloodBadge}>
              <Text style={styles.bloodText}>{item.blood_type}</Text>
            </View>
            <Text numberOfLines={1} style={styles.facility}>
              {item.facility_name}
            </Text>
          </View>
          <Text numberOfLines={2} style={styles.preview}>
            {previewText(item)}
          </Text>
          {closed ? (
            <View style={styles.closedRow}>
              <MaterialIcons
                name="lock-outline"
                size={12}
                color={COLORS.muted}
              />
              <Text style={styles.closedText}>
                {item.request_status.charAt(0).toUpperCase() +
                  item.request_status.slice(1)}{' '}
                · Read only
              </Text>
            </View>
          ) : null}
        </View>
      </TouchableOpacity>
    );
  }

  if (fontError) {
    return (
      <SafeAreaView style={styles.fontFallback}>
        <Text>Unable to load the screen fonts. Please reload Hemo-Hero.</Text>
      </SafeAreaView>
    );
  }
  if (!fontsLoaded) {
    return (
      <SafeAreaView style={styles.fontFallback}>
        <ActivityIndicator
          color={COLORS.red}
          accessibilityLabel="Loading screen"
        />
      </SafeAreaView>
    );
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top', 'bottom', 'left', 'right']}
        >
          <StatusBar style="light" />
          <LinearGradient
            colors={[COLORS.red, COLORS.redDark]}
            style={styles.header}
          >
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Back to Home"
              style={styles.headerButton}
              onPress={() => router.replace('/dashboard' as any)}
            >
              <MaterialIcons name="arrow-back" size={24} color={COLORS.white} />
            </TouchableOpacity>
            <View style={styles.headerText}>
              <Text style={styles.eyebrow}>CHAT</Text>
              <Text accessibilityRole="header" style={styles.title}>
                Donation Conversations
              </Text>
            </View>
          </LinearGradient>
          <View style={styles.content}>
            <View style={styles.intro}>
              <Text style={styles.introText}>
                Coordinate with your accepted donors and requesters.
              </Text>
              {!loading && !error ? (
                <Text style={styles.count}>
                  {conversations.length}{' '}
                  {conversations.length === 1
                    ? 'conversation'
                    : 'conversations'}
                </Text>
              ) : null}
            </View>
            {error && conversations.length > 0 ? (
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Refresh conversations"
                style={styles.refreshWarning}
                onPress={() => refreshRef.current?.()}
              >
                <MaterialIcons
                  name="refresh"
                  size={18}
                  color={COLORS.redButton}
                />
                <Text style={styles.warningText}>
                  Couldn’t refresh. Tap to try again.
                </Text>
              </TouchableOpacity>
            ) : null}
            {loading ? (
              <View style={styles.centerState}>
                <ActivityIndicator size="large" color={COLORS.red} />
                <Text style={styles.stateDescription}>
                  Loading your conversations…
                </Text>
              </View>
            ) : (
              <FlatList
                data={conversations}
                keyExtractor={(item) => item.response_id}
                renderItem={renderConversation}
                showsVerticalScrollIndicator={false}
                style={styles.list}
                contentContainerStyle={[
                  styles.listContent,
                  !conversations.length && styles.emptyList,
                ]}
                refreshControl={
                  <RefreshControl
                    refreshing={refreshing}
                    onRefresh={() => refreshRef.current?.()}
                    tintColor={COLORS.red}
                    colors={[COLORS.red]}
                  />
                }
                ListEmptyComponent={
                  <View style={styles.centerState}>
                    <View style={styles.emptyIcon}>
                      <MaterialIcons
                        name={error ? 'cloud-off' : 'chat-bubble-outline'}
                        size={30}
                        color={COLORS.redButton}
                      />
                    </View>
                    <Text accessibilityRole="header" style={styles.stateTitle}>
                      {error
                        ? 'Unable to load conversations'
                        : 'No conversations yet'}
                    </Text>
                    <Text style={styles.stateDescription}>
                      {error ||
                        'A conversation appears here when a donor offer is accepted. You can be a requester or a donor.'}
                    </Text>
                    <TouchableOpacity
                      accessibilityRole="button"
                      style={styles.stateButton}
                      onPress={() =>
                        error
                          ? refreshRef.current?.()
                          : router.replace('/dashboard' as any)
                      }
                    >
                      <Text style={styles.stateButtonText}>
                        {error ? 'Try again' : 'Back to Home'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                }
              />
            )}
          </View>
          <View style={styles.bottomNav}>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Home"
              style={styles.navItem}
              onPress={() => router.replace('/dashboard' as any)}
            >
              <MaterialIcons name="home" size={25} color="#E6BDBD" />
              <Text style={styles.navText}>Home</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Search"
              style={styles.navItem}
              onPress={() => showComingSoon('Search')}
            >
              <MaterialIcons name="person-search" size={25} color="#E6BDBD" />
              <Text style={styles.navText}>Search</Text>
            </TouchableOpacity>
            <View
              accessible
              accessibilityRole="tab"
              accessibilityState={{ selected: true }}
              accessibilityLabel="Chat"
              style={styles.navItem}
            >
              <MaterialIcons
                name="chat-bubble"
                size={25}
                color={COLORS.white}
              />
              <Text style={styles.navTextActive}>Chat</Text>
            </View>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Notifications"
              style={styles.navItem}
              onPress={() => showComingSoon('Notifications')}
            >
              <MaterialIcons
                name="notifications-none"
                size={25}
                color="#E6BDBD"
              />
              <Text style={styles.navText}>Notifications</Text>
            </TouchableOpacity>
            <TouchableOpacity
              accessibilityRole="button"
              accessibilityLabel="Profile"
              style={styles.navItem}
              onPress={() => showComingSoon('Profile')}
            >
              <MaterialIcons name="person-outline" size={25} color="#E6BDBD" />
              <Text style={styles.navText}>Profile</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopBackground: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Platform.OS === 'web' ? '#242424' : COLORS.page,
  },
  phone: {
    width: '100%',
    height: '100%',
    maxWidth: Platform.OS === 'web' ? 402 : undefined,
    maxHeight: Platform.OS === 'web' ? 874 : undefined,
    backgroundColor: COLORS.page,
    overflow: 'hidden',
  },
  safeArea: { flex: 1, backgroundColor: COLORS.redDark },
  fontFallback: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: COLORS.white,
  },
  header: {
    minHeight: 104,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 20,
  },
  headerButton: {
    width: 40,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 8,
  },
  headerText: { flex: 1, minWidth: 0 },
  eyebrow: {
    fontFamily: 'Inter_500Medium',
    fontSize: 11,
    letterSpacing: 1.4,
    color: COLORS.white,
    marginBottom: 6,
  },
  title: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 20,
    lineHeight: 29,
    color: COLORS.white,
  },
  content: { flex: 1, backgroundColor: COLORS.page },
  intro: { paddingHorizontal: 20, paddingTop: 20, paddingBottom: 14 },
  introText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.muted,
  },
  count: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
    color: COLORS.muted,
    marginTop: 10,
  },
  list: { flex: 1 },
  listContent: { paddingHorizontal: 16, paddingBottom: 20 },
  emptyList: { flexGrow: 1 },
  conversation: {
    flexDirection: 'row',
    padding: 16,
    marginBottom: 12,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.white,
  },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: 22,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pink,
  },
  avatarText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 14,
    color: COLORS.redButton,
  },
  conversationBody: { flex: 1, minWidth: 0 },
  nameRow: { flexDirection: 'row', alignItems: 'baseline', gap: 8 },
  personName: {
    flex: 1,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.black,
  },
  time: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.muted,
    flexShrink: 0,
  },
  roleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 5,
    marginTop: 3,
  },
  role: {
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  requestRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    gap: 7,
  },
  bloodBadge: {
    paddingHorizontal: 7,
    paddingVertical: 3,
    borderRadius: 6,
    backgroundColor: COLORS.pink,
  },
  bloodText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    color: COLORS.redButton,
  },
  facility: {
    flex: 1,
    minWidth: 0,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.muted,
  },
  preview: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 21,
    color: COLORS.black,
    marginTop: 10,
  },
  closedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 9,
  },
  closedText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    color: COLORS.muted,
  },
  centerState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 22,
    paddingVertical: 30,
  },
  emptyIcon: {
    width: 64,
    height: 64,
    borderRadius: 22,
    backgroundColor: COLORS.pink,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
  },
  stateTitle: {
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 17,
    lineHeight: 25,
    textAlign: 'center',
    color: COLORS.black,
  },
  stateDescription: {
    fontFamily: 'Inter_400Regular',
    fontSize: 14,
    lineHeight: 22,
    color: COLORS.muted,
    textAlign: 'center',
    marginTop: 10,
  },
  stateButton: {
    minHeight: 46,
    paddingHorizontal: 22,
    paddingVertical: 12,
    marginTop: 20,
    borderRadius: 12,
    backgroundColor: COLORS.redButton,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stateButtonText: {
    fontFamily: 'Inter_500Medium',
    fontSize: 14,
    color: COLORS.white,
  },
  refreshWarning: {
    minHeight: 44,
    marginHorizontal: 16,
    marginBottom: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.pink,
    borderRadius: 10,
  },
  warningText: {
    flex: 1,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
    lineHeight: 18,
    color: COLORS.redButton,
  },
  bottomNav: {
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 68,
    paddingVertical: 9,
    paddingHorizontal: 4,
    backgroundColor: COLORS.redDark,
  },
  navItem: {
    flex: 1,
    minHeight: 48,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  navText: {
    fontFamily: 'Inter_400Regular',
    fontSize: 9,
    color: '#E6BDBD',
    textAlign: 'center',
  },
  navTextActive: {
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    color: COLORS.white,
    textAlign: 'center',
  },
});
