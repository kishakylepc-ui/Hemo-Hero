import {
  useCallback,
  useEffect,
  useState,
} from 'react';

import {
  ActivityIndicator,
  AppState,
  Linking,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import * as Notifications from 'expo-notifications';

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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import MainBottomNav, { useBottomNavSpace } from '../../components/MainBottomNav';

import AppModal from '../../components/AppModal';

import {
  FadeInView,
} from '../../components/Motion';

import {
  getNotificationPreferences,
  updateNotificationPreferences,
} from '../../lib/api';

import type {
  NotificationPreferences,
} from '../../lib/api';

import {
  DEFAULT_NOTIFICATION_PREFERENCES,
} from '../../lib/notificationPreferences';

import type {
  NotificationCategory,
} from '../../lib/notificationPreferences';

import {
  ensurePushRegistered,
  getPushMode,
  setAlertPreferences,
} from '../../lib/pushNotifications';

import {
  getAccessToken,
} from '../../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  redDark: '#8F1111',
  redButton: '#B42323',
  headerTop: '#D2151A',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  cardBorder: '#E8DADA',
  divider: '#F3E9E9',

  pinkLight: '#FFF1F1',

  green: '#16834A',
  greenSoft: '#EAF7EF',

  orange: '#B45309',
  orangeSoft: '#FFF4E5',
};

// ============================================================
// SETTINGS
// ============================================================

const CATEGORIES: {
  key: NotificationCategory;
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    key: 'donation_requests',
    icon: 'volunteer-activism',
    title: 'Donation requests',
    text: 'A requester asks you to donate.',
  },
  {
    key: 'request_updates',
    icon: 'assignment',
    title: 'Request updates',
    text: 'Offers on your request, accepted or declined offers, and closed requests.',
  },
  {
    key: 'messages',
    icon: 'chat-bubble-outline',
    title: 'Messages and meet-ups',
    text: 'Chat messages, meet-up times, and live trip updates.',
  },
  {
    key: 'donations',
    icon: 'favorite-border',
    title: 'Donations and feedback',
    text: 'Recorded donations and ratings.',
  },
];

// What this phone allows (web never shows phone alerts).
type PhonePermission =
  | 'loading'
  | 'granted'
  | 'denied'
  | 'undetermined'
  | 'web';

// ============================================================
// SCREEN
// ============================================================

export default function NotificationSettingsScreen() {
  // Full screen: the red header reaches the top edge, with its
  // content kept below the clock. The bottom bar floats over the
  // content, so the scroll content ends with the space it covers.
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();

  const [
    preferences,
    setPreferences,
  ] = useState<NotificationPreferences>(
    DEFAULT_NOTIFICATION_PREFERENCES
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    loadError,
    setLoadError,
  ] = useState('');

  // Setting being saved right now.
  const [
    saving,
    setSaving,
  ] = useState<
    keyof NotificationPreferences | null
  >(null);

  const [
    permission,
    setPermission,
  ] = useState<PhonePermission>(
    Platform.OS === 'web'
      ? 'web'
      : 'loading'
  );

  const [
    canAskPermission,
    setCanAskPermission,
  ] = useState(false);

  const [
    message,
    setMessage,
  ] = useState<{
    title: string;
    text: string;
  } | null>(null);

  // ----------------------------------------------------------
  // LOAD
  // ----------------------------------------------------------

  const loadPreferences =
    useCallback(
      async () => {
        try {
          setLoading(true);
          setLoadError('');

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          const result =
            await getNotificationPreferences(
              token
            );

          setPreferences(
            result.preferences
          );

          setAlertPreferences(
            result.preferences
          );
        } catch (error) {
          setLoadError(
            error instanceof Error
              ? error.message
              : 'Unable to load your notification settings.'
          );
        } finally {
          setLoading(false);
        }
      },
      []
    );

  const checkPermission =
    useCallback(
      async () => {
        if (Platform.OS === 'web') {
          return;
        }

        try {
          const result =
            await Notifications.getPermissionsAsync();

          setPermission(
            result.granted
              ? 'granted'
              : result.status === 'denied'
                ? 'denied'
                : 'undetermined'
          );

          setCanAskPermission(
            !result.granted &&
              result.canAskAgain
          );
        } catch {
          setPermission('undetermined');
        }
      },
      []
    );

  useFocusEffect(
    useCallback(
      () => {
        loadPreferences();
        checkPermission();
      },
      [
        loadPreferences,
        checkPermission,
      ]
    )
  );

  // Coming back from the phone's Settings app.
  useEffect(() => {
    const subscription =
      AppState.addEventListener(
        'change',
        state => {
          if (state === 'active') {
            checkPermission();
          }
        }
      );

    return () =>
      subscription.remove();
  }, [checkPermission]);

  // ----------------------------------------------------------
  // SAVE ONE SETTING
  // ----------------------------------------------------------

  async function changeSetting(
    key: keyof NotificationPreferences,
    value: boolean
  ) {
    if (saving) {
      return;
    }

    const previous =
      preferences;

    setPreferences({
      ...preferences,
      [key]: value,
    });

    setSaving(key);

    try {
      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const result =
        await updateNotificationPreferences(
          token,
          {
            [key]: value,
          }
        );

      setPreferences(
        result.preferences
      );

      setAlertPreferences(
        result.preferences
      );
    } catch (error) {
      setPreferences(previous);

      setMessage({
        title: 'Not Saved',
        text:
          error instanceof Error
            ? error.message
            : 'Unable to save your notification settings.',
      });
    } finally {
      setSaving(null);
    }
  }

  // ----------------------------------------------------------
  // PHONE PERMISSION
  // ----------------------------------------------------------

  async function allowAlerts() {
    if (canAskPermission) {
      try {
        const result =
          await Notifications.requestPermissionsAsync();

        if (result.granted) {
          await ensurePushRegistered();
        }
      } catch (error) {
        console.log(
          'NOTIFICATION PERMISSION ERROR:',
          error
        );
      }

      await checkPermission();

      return;
    }

    Linking.openSettings().catch(() =>
      setMessage({
        title: 'Open Settings',
        text: 'Open your phone’s Settings, find Expo Go or Hemo-Hero, and turn on notifications.',
      })
    );
  }

  const pushOn =
    preferences.push_enabled;

  const localOnly =
    permission === 'granted' &&
    getPushMode() === 'local';

  // ----------------------------------------------------------
  // RENDER
  // ----------------------------------------------------------

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          // Top and bottom are drawn edge to edge by the header
          // and MainBottomNav.
          edges={[
            'left',
            'right',
          ]}
        >
          <StatusBar style="light" />

          <LinearGradient
            colors={[
              COLORS.headerTop,
              COLORS.redDark,
            ]}
            style={styles.header}
          >
            <View
              style={[
                styles.headerCircleLeft,
                { transform: [{ translateY: insets.top }] },
              ]}
            />

            <View
              style={[
                styles.headerCircleRight,
                { transform: [{ translateY: insets.top }] },
              ]}
            />

            {/* Status-bar height: keeps the content below the clock */}
            <View style={{ height: insets.top }} />

            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.75}
                accessibilityLabel="Go back"
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(
                        '/profile' as any
                      )
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={23}
                  color={COLORS.white}
                />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>
                  Notification Settings
                </Text>

                <Text style={styles.headerSubtitle}>
                  Choose what alerts your phone
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            {loading ? (
              <View style={styles.center}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.redButton}
                />

                <Text style={styles.centerText}>
                  Loading your settings...
                </Text>
              </View>
            ) : loadError ? (
              <View style={styles.center}>
                <MaterialIcons
                  name="error-outline"
                  size={38}
                  color={COLORS.redButton}
                />

                <Text style={styles.centerTitle}>
                  Couldn’t load your settings
                </Text>

                <Text style={styles.centerText}>
                  {loadError}
                </Text>

                <TouchableOpacity
                  style={styles.retryButton}
                  activeOpacity={0.85}
                  onPress={loadPreferences}
                >
                  <MaterialIcons
                    name="refresh"
                    size={18}
                    color={COLORS.white}
                  />

                  <Text style={styles.retryText}>
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <ScrollView
                style={styles.flex}
                contentContainerStyle={[
                  styles.scrollContent,
                  { paddingBottom: 24 + navSpace },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* THIS PHONE */}

                <FadeInView>
                  <PhoneStatus
                    permission={permission}
                    canAsk={canAskPermission}
                    localOnly={localOnly}
                    onAllow={allowAlerts}
                  />
                </FadeInView>

                {/* MAIN SWITCH */}

                <FadeInView delay={40}>
                  <View style={styles.card}>
                    <SettingRow
                      icon={
                        pushOn
                          ? 'notifications-active'
                          : 'notifications-off'
                      }
                      title="Phone alerts"
                      text={
                        pushOn
                          ? 'On for the updates you choose below.'
                          : 'Off. Updates still arrive in your Notifications inbox.'
                      }
                      value={pushOn}
                      busy={saving === 'push_enabled'}
                      disabled={Boolean(saving)}
                      onChange={value =>
                        changeSetting(
                          'push_enabled',
                          value
                        )
                      }
                    />
                  </View>
                </FadeInView>

                {/* CATEGORIES */}

                <Text style={styles.sectionTitle}>
                  Alert me about
                </Text>

                <FadeInView delay={80}>
                  <View
                    style={[
                      styles.card,

                      !pushOn &&
                        styles.cardDimmed,
                    ]}
                  >
                    {CATEGORIES.map(category => (
                      <View
                        key={category.key}
                        style={styles.rowDivider}
                      >
                        <SettingRow
                          icon={category.icon}
                          title={category.title}
                          text={category.text}
                          value={
                            pushOn &&
                            preferences[
                              category.key
                            ]
                          }
                          busy={
                            saving ===
                            category.key
                          }
                          disabled={
                            !pushOn ||
                            Boolean(saving)
                          }
                          onChange={value =>
                            changeSetting(
                              category.key,
                              value
                            )
                          }
                        />
                      </View>
                    ))}

                    <View style={styles.settingRow}>
                      <View style={styles.settingIcon}>
                        <MaterialIcons
                          name="verified-user"
                          size={20}
                          color={COLORS.redButton}
                        />
                      </View>

                      <View style={styles.settingBody}>
                        <Text style={styles.settingTitle}>
                          Account updates
                        </Text>

                        <Text style={styles.settingText}>
                          Donor application results and account notices.
                        </Text>
                      </View>

                      <Text style={styles.alwaysOn}>
                        {pushOn
                          ? 'Always on'
                          : 'Off'}
                      </Text>
                    </View>
                  </View>
                </FadeInView>

                {/* INBOX NOTE */}

                <TouchableOpacity
                  style={styles.inboxNote}
                  activeOpacity={0.75}
                  accessibilityRole="button"
                  onPress={() =>
                    router.push(
                      '/notifications' as any
                    )
                  }
                >
                  <MaterialIcons
                    name="inbox"
                    size={20}
                    color={COLORS.muted}
                  />

                  <Text style={styles.inboxText}>
                    Your Notifications inbox keeps every update, including the ones that don’t alert your phone.
                  </Text>

                  <MaterialIcons
                    name="chevron-right"
                    size={22}
                    color={COLORS.lightMuted}
                  />
                </TouchableOpacity>
              </ScrollView>
            )}
          </View>

          <MainBottomNav activeTab="profile" />
        </SafeAreaView>
      </View>

      <AppModal
        visible={Boolean(message)}
        variant="error"
        title={message?.title || ''}
        message={message?.text}
        confirmLabel="OK"
        onConfirm={() => setMessage(null)}
        onClose={() => setMessage(null)}
      />
    </View>
  );
}

// ============================================================
// PHONE STATUS
// ============================================================

function PhoneStatus({
  permission,
  canAsk,
  localOnly,
  onAllow,
}: {
  permission: PhonePermission;
  canAsk: boolean;
  localOnly: boolean;
  onAllow: () => void;
}) {
  if (permission === 'loading') {
    return null;
  }

  const allowed =
    permission === 'granted';

  const web =
    permission === 'web';

  const title = web
    ? 'Alerts are for the phone app'
    : allowed
      ? 'Alerts are allowed on this phone'
      : 'Alerts are blocked on this phone';

  const text = web
    ? 'Open Hemo-Hero on your phone to get alerts. These settings apply there too.'
    : allowed
      ? localOnly
        ? 'In Expo Go on Android, alerts show while Hemo-Hero is open.'
        : 'Alerts arrive even when Hemo-Hero is closed.'
      : 'Turn on notifications for this app to get the alerts below.';

  return (
    <View
      style={[
        styles.statusCard,

        {
          backgroundColor:
            allowed || web
              ? COLORS.greenSoft
              : COLORS.orangeSoft,
        },
      ]}
    >
      <MaterialIcons
        name={
          web
            ? 'smartphone'
            : allowed
              ? 'check-circle'
              : 'notifications-off'
        }
        size={22}
        color={
          allowed || web
            ? COLORS.green
            : COLORS.orange
        }
      />

      <View style={styles.statusBody}>
        <Text style={styles.statusTitle}>
          {title}
        </Text>

        <Text style={styles.statusText}>
          {text}
        </Text>

        {!allowed && !web ? (
          <TouchableOpacity
            style={styles.statusButton}
            activeOpacity={0.85}
            accessibilityRole="button"
            onPress={onAllow}
          >
            <Text style={styles.statusButtonText}>
              {canAsk
                ? 'Allow Alerts'
                : 'Open Phone Settings'}
            </Text>
          </TouchableOpacity>
        ) : null}
      </View>
    </View>
  );
}

// ============================================================
// SETTING ROW
// ============================================================

function SettingRow({
  icon,
  title,
  text,
  value,
  busy,
  disabled,
  onChange,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  text: string;
  value: boolean;
  busy: boolean;
  disabled: boolean;
  onChange: (value: boolean) => void;
}) {
  return (
    <View style={styles.settingRow}>
      <View style={styles.settingIcon}>
        <MaterialIcons
          name={icon}
          size={20}
          color={COLORS.redButton}
        />
      </View>

      <View style={styles.settingBody}>
        <Text style={styles.settingTitle}>
          {title}
        </Text>

        <Text style={styles.settingText}>
          {text}
        </Text>
      </View>

      {busy ? (
        <ActivityIndicator
          size="small"
          color={COLORS.redButton}
          style={styles.switchSpinner}
        />
      ) : (
        <Switch
          value={value}
          disabled={disabled}
          onValueChange={onChange}
          trackColor={{
            false: '#D9CFCF',
            true: '#E8A3A3',
          }}
          thumbColor={
            value
              ? COLORS.redButton
              : '#FFFFFF'
          }
          accessibilityLabel={title}
        />
      )}
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

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
    width:
      Platform.OS === 'web'
        ? 440
        : '100%',
    height: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.headerTop,
  },

  header: {
    paddingHorizontal: 20,
    paddingTop:
      Platform.OS === 'web'
        ? 18
        : 10,
    paddingBottom: 38,
    overflow: 'hidden',
  },

  headerCircleLeft: {
    position: 'absolute',
    width: 165,
    height: 165,
    borderRadius: 83,
    left: -100,
    top: -70,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  headerCircleRight: {
    position: 'absolute',
    width: 175,
    height: 175,
    borderRadius: 88,
    right: -70,
    top: -80,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    width: 40,
    height: 40,
    marginRight: 12,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
  },

  headerText: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 21,
    lineHeight: 29,
  },

  headerSubtitle: {
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
  },

  body: {
    flex: 1,
    marginTop: -22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  // paddingBottom is set inline: it includes the space the
  // floating bottom bar covers.
  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
  },

  center: {
    flex: 1,
    paddingHorizontal: 32,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },

  centerTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },

  centerText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  retryButton: {
    height: 42,
    marginTop: 6,
    paddingHorizontal: 18,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    borderRadius: 21,
    backgroundColor: COLORS.redButton,
  },

  retryText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  statusCard: {
    marginBottom: 16,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    borderRadius: 14,
  },

  statusBody: {
    flex: 1,
    minWidth: 0,
  },

  statusTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  statusText: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  statusButton: {
    alignSelf: 'flex-start',
    height: 36,
    marginTop: 10,
    paddingHorizontal: 14,
    justifyContent: 'center',
    borderRadius: 18,
    backgroundColor: COLORS.redButton,
  },

  statusButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12.5,
  },

  sectionTitle: {
    marginBottom: 9,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  card: {
    marginBottom: 20,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  cardDimmed: {
    opacity: 0.55,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  settingRow: {
    minHeight: 64,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  settingIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  settingBody: {
    flex: 1,
    minWidth: 0,
  },

  settingTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  settingText: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 17,
  },

  switchSpinner: {
    width: 51,
  },

  alwaysOn: {
    color: COLORS.lightMuted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },

  inboxNote: {
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  inboxText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },
});
