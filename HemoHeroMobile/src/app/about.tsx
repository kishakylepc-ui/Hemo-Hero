import {
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import * as Application from 'expo-application';

import Constants, {
  ExecutionEnvironment,
} from 'expo-constants';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import {
  router,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import MainBottomNav, { useBottomNavSpace } from '../components/MainBottomNav';

import {
  FadeInView,
} from '../components/Motion';

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

  orange: '#B45309',
  orangeSoft: '#FFF4E5',
};

// ============================================================
// CONTENT
//
// Describes the app as it works today.
// ============================================================

// From app.json. The server and admin portal share it
// (see scripts/version.js in the project folder).
const APP_VERSION =
  Constants.expoConfig?.version ||
  '1.0.0';

// The build number EAS raises on every APK build. Expo Go
// reports its own build, so it only shows in an installed app.
const BUILD_NUMBER =
  Platform.OS === 'web' ||
  Constants.executionEnvironment ===
    ExecutionEnvironment.StoreClient
    ? null
    : Application.nativeBuildVersion;

const VERSION_LABEL =
  BUILD_NUMBER
    ? `${APP_VERSION} (build ${BUILD_NUMBER})`
    : APP_VERSION;

const FEATURES: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    icon: 'bloodtype',
    title: 'Request blood',
    text: 'Post the blood type, bags needed, donation place and time.',
  },
  {
    icon: 'people-outline',
    title: 'Reach compatible donors',
    text: 'Nearby donors whose blood type can be given to the patient see the request, and you can invite donors you find.',
  },
  {
    icon: 'chat-bubble-outline',
    title: 'Coordinate in one place',
    text: 'Chat, agree on a meet-up time, and follow the donor’s trip to the donation place.',
  },
  {
    icon: 'task-alt',
    title: 'Keep a record',
    text: 'Donations are saved to both histories, and both sides can leave feedback.',
  },
];

const SAFETY: {
  icon: keyof typeof MaterialIcons.glyphMap;
  text: string;
}[] = [
  {
    icon: 'verified-user',
    text: 'Donors are verified. An admin reviews their ID and blood type proof first.',
  },
  {
    icon: 'lock-outline',
    text: 'Your phone number, email and home location are never shown to other users.',
  },
  {
    icon: 'event-available',
    text: 'Donors wait 90 days between donations, and the app keeps track of it.',
  },
  {
    icon: 'flag',
    text: 'You can report a problem at any time, and Hemo-Hero staff review every report.',
  },
];

// ============================================================
// SCREEN
// ============================================================

export default function AboutScreen() {
  // Full screen: the red header reaches the top edge, with its
  // content kept below the clock. The bottom bar floats over the
  // content, so the scroll content ends with the space it covers.
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();

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
                  About Hemo-Hero
                </Text>

                <Text style={styles.headerSubtitle}>
                  What the app is for
                </Text>
              </View>
            </View>
          </LinearGradient>

          <View style={styles.body}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={[
                styles.scrollContent,
                { paddingBottom: 24 + navSpace },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* IDENTITY */}

              <FadeInView style={styles.heroCard}>
                <View style={styles.logoWrap}>
                  <Image
                    source={require(
                      '../../assets/images/LifeLine (5).png'
                    )}
                    style={styles.logo}
                    resizeMode="contain"
                    accessibilityIgnoresInvertColors
                  />
                </View>

                <Text style={styles.appName}>
                  Hemo-Hero
                </Text>

                <Text style={styles.tagline}>
                  Connecting people who need blood with verified donors nearby.
                </Text>

                <View style={styles.versionPill}>
                  <Text style={styles.versionText}>
                    Version {VERSION_LABEL}
                  </Text>
                </View>
              </FadeInView>

              {/* MISSION */}

              <Text style={styles.sectionTitle}>
                Why Hemo-Hero
              </Text>

              <FadeInView
                delay={40}
                style={styles.textCard}
              >
                <Text style={styles.paragraph}>
                  Finding a blood donor quickly is hard, especially for urgent needs. Hemo-Hero puts the whole process in one app: asking for blood, finding compatible donors near the donation place, agreeing on a time, and recording the donation.
                </Text>
              </FadeInView>

              {/* FEATURES */}

              <Text style={styles.sectionTitle}>
                What You Can Do
              </Text>

              <View style={styles.card}>
                {FEATURES.map((feature, index) => (
                  <FadeInView
                    key={feature.title}
                    delay={80 + index * 40}
                    style={[
                      styles.row,

                      index <
                        FEATURES.length - 1 &&
                        styles.rowDivider,
                    ]}
                  >
                    <View style={styles.rowIcon}>
                      <MaterialIcons
                        name={feature.icon}
                        size={20}
                        color={COLORS.redButton}
                      />
                    </View>

                    <View style={styles.rowBody}>
                      <Text style={styles.rowTitle}>
                        {feature.title}
                      </Text>

                      <Text style={styles.rowText}>
                        {feature.text}
                      </Text>
                    </View>
                  </FadeInView>
                ))}
              </View>

              {/* SAFETY */}

              <Text style={styles.sectionTitle}>
                Safety and Privacy
              </Text>

              <View style={styles.card}>
                {SAFETY.map((item, index) => (
                  <View
                    key={item.text}
                    style={[
                      styles.safetyRow,

                      index <
                        SAFETY.length - 1 &&
                        styles.rowDivider,
                    ]}
                  >
                    <MaterialIcons
                      name={item.icon}
                      size={19}
                      color={COLORS.redButton}
                    />

                    <Text style={styles.safetyText}>
                      {item.text}
                    </Text>
                  </View>
                ))}
              </View>

              {/* NOT AN EMERGENCY SERVICE */}

              <View style={styles.noticeCard}>
                <MaterialIcons
                  name="local-hospital"
                  size={21}
                  color={COLORS.orange}
                />

                <Text style={styles.noticeText}>
                  Hemo-Hero is not a hospital, blood bank or emergency service. In an emergency, contact the hospital or your local emergency number directly.
                </Text>
              </View>

              {/* MORE */}

              <Text style={styles.sectionTitle}>
                Learn More
              </Text>

              <View style={styles.card}>
                <LinkRow
                  icon="help-outline"
                  title="Help Center"
                  onPress={() =>
                    router.push(
                      '/help' as any
                    )
                  }
                />

                <View style={styles.linkDivider} />

                <LinkRow
                  icon="description"
                  title="Terms of Service"
                  onPress={() =>
                    router.push(
                      '/terms-of-service' as any
                    )
                  }
                />

                <View style={styles.linkDivider} />

                <LinkRow
                  icon="privacy-tip"
                  title="Privacy Policy"
                  onPress={() =>
                    router.push(
                      '/privacy-policy' as any
                    )
                  }
                />
              </View>

              <Text style={styles.footer}>
                Hemo-Hero · Version {VERSION_LABEL}
              </Text>
            </ScrollView>
          </View>

          <MainBottomNav activeTab="profile" />
        </SafeAreaView>
      </View>
    </View>
  );
}

function LinkRow({
  icon,
  title,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  onPress: () => void;
}) {
  return (
    <TouchableOpacity
      style={styles.linkRow}
      activeOpacity={0.7}
      accessibilityRole="button"
      onPress={onPress}
    >
      <MaterialIcons
        name={icon}
        size={20}
        color={COLORS.redButton}
      />

      <Text style={styles.linkText}>
        {title}
      </Text>

      <MaterialIcons
        name="chevron-right"
        size={22}
        color={COLORS.lightMuted}
      />
    </TouchableOpacity>
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

  heroCard: {
    marginBottom: 20,
    paddingHorizontal: 18,
    paddingVertical: 22,
    alignItems: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  logoWrap: {
    width: 84,
    height: 84,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: COLORS.white,
    borderWidth: 1,
    borderColor: COLORS.divider,
  },

  logo: {
    width: 104,
    height: 104,
  },

  appName: {
    marginTop: 12,
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 22,
  },

  tagline: {
    marginTop: 4,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 19,
    textAlign: 'center',
  },

  versionPill: {
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: COLORS.pinkLight,
  },

  versionText: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },

  sectionTitle: {
    marginBottom: 9,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  textCard: {
    marginBottom: 20,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  paragraph: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    lineHeight: 20,
  },

  card: {
    marginBottom: 20,
    paddingHorizontal: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  row: {
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  rowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  rowIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  rowBody: {
    flex: 1,
    minWidth: 0,
  },

  rowTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  rowText: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  safetyRow: {
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
  },

  safetyText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  noticeCard: {
    marginBottom: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 11,
    borderRadius: 14,
    backgroundColor: COLORS.orangeSoft,
  },

  noticeText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  linkRow: {
    height: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },

  linkText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  linkDivider: {
    height: 1,
    backgroundColor: COLORS.divider,
  },

  footer: {
    marginTop: 2,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    textAlign: 'center',
  },
});
