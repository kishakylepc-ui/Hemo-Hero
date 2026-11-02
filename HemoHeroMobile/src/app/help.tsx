import {
  useState,
} from 'react';

import {
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
};

// ============================================================
// CONTENT
//
// Describes the app as it works today: the full request ->
// donation -> feedback cycle.
// ============================================================

const STEPS: {
  icon: keyof typeof MaterialIcons.glyphMap;
  title: string;
  text: string;
}[] = [
  {
    icon: 'how-to-reg',
    title: 'Become a donor',
    text: 'Add your blood type with proof in your profile, then apply with a valid ID. Once an admin approves it, you are a Verified Donor.',
  },
  {
    icon: 'bloodtype',
    title: 'Request blood',
    text: 'Post the blood type, bags needed, donation place, and when. Compatible donors nearby can see it.',
  },
  {
    icon: 'volunteer-activism',
    title: 'Get an offer',
    text: 'Donors offer to help, or you invite a donor you found in Search.',
  },
  {
    icon: 'chat-bubble-outline',
    title: 'Coordinate',
    text: 'Accept a donor and use the chat to agree on the donation schedule.',
  },
  {
    icon: 'task-alt',
    title: 'Confirm the donation',
    text: 'After the donor donates, confirm it in your chat with them. It is saved to both of your donation histories.',
  },
  {
    icon: 'star-outline',
    title: 'Rate each other',
    text: 'In the chat, both of you can leave a rating and a short note about how it went.',
  },
];

const FAQS: {
  question: string;
  answer: string;
}[] = [
  {
    question: 'Who can see my blood request?',
    answer: 'Verified donors near the donation place whose blood type is compatible with the type you need.',
  },
  {
    question: 'Why can\'t I offer to donate?',
    answer: 'You need an approved donor application, and your blood type must be compatible with the request.',
  },
  {
    question: 'Is my exact location shared?',
    answer: 'No. Others only see your city and an approximate distance. Requests show the donation place, not your home.',
  },
  {
    question: 'What if something goes wrong?',
    answer: 'In the donor chat, open support to send feedback or report a problem. Donors can also tap "Report a problem" on a recorded donation. Hemo-Hero reviews every report.',
  },
  {
    question: 'Is Hemo-Hero an emergency service?',
    answer: 'No. In an emergency, contact the hospital or your local emergency number directly.',
  },
];

// ============================================================
// SCREEN
// ============================================================

export default function HelpScreen() {
  // Full screen: the red header reaches the top edge, with its
  // content kept below the clock. The bottom bar floats over the
  // content, so the scroll content ends with the space it covers.
  const insets = useSafeAreaInsets();
  const navSpace = useBottomNavSpace();

  const [
    openQuestion,
    setOpenQuestion,
  ] = useState<number | null>(
    null
  );

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
                  Help Center
                </Text>

                <Text style={styles.headerSubtitle}>
                  How Hemo-Hero works
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
              {/* APP TOUR (replay) */}
              <TouchableOpacity
                style={styles.tourCard}
                activeOpacity={0.85}
                accessibilityRole="button"
                onPress={() =>
                  router.replace({
                    pathname: '/dashboard',
                    params: {
                      tour: '1',
                    },
                  } as any)
                }
              >
                <View style={styles.tourIcon}>
                  <MaterialIcons
                    name="play-circle-outline"
                    size={24}
                    color={COLORS.white}
                  />
                </View>

                <View style={styles.tourText}>
                  <Text style={styles.tourTitle}>
                    Take the app tour
                  </Text>

                  <Text style={styles.tourSubtitle}>
                    See the main buttons on your Home screen.
                  </Text>
                </View>

                <MaterialIcons
                  name="chevron-right"
                  size={22}
                  color={COLORS.redButton}
                />
              </TouchableOpacity>

              {/* STEPS */}

              <Text style={styles.sectionTitle}>
                From Request to Donation
              </Text>

              <View style={styles.card}>
                {STEPS.map((step, index) => (
                  <FadeInView
                    key={step.title}
                    delay={index * 45}
                    style={[
                      styles.stepRow,

                      index <
                        STEPS.length - 1 &&
                        styles.stepRowDivider,
                    ]}
                  >
                    <View style={styles.stepIcon}>
                      <MaterialIcons
                        name={step.icon}
                        size={20}
                        color={COLORS.redButton}
                      />
                    </View>

                    <View style={styles.stepBody}>
                      <Text style={styles.stepTitle}>
                        {index + 1}. {step.title}
                      </Text>

                      <Text style={styles.stepText}>
                        {step.text}
                      </Text>
                    </View>
                  </FadeInView>
                ))}
              </View>

              {/* FAQ */}

              <Text style={styles.sectionTitle}>
                Questions
              </Text>

              <View style={styles.card}>
                {FAQS.map((faq, index) => {
                  const open =
                    openQuestion === index;

                  return (
                    <View
                      key={faq.question}
                      style={
                        index <
                          FAQS.length - 1 &&
                        styles.stepRowDivider
                      }
                    >
                      <TouchableOpacity
                        style={styles.faqQuestion}
                        activeOpacity={0.7}
                        accessibilityRole="button"
                        accessibilityState={{
                          expanded: open,
                        }}
                        onPress={() =>
                          setOpenQuestion(
                            open
                              ? null
                              : index
                          )
                        }
                      >
                        <Text style={styles.faqQuestionText}>
                          {faq.question}
                        </Text>

                        <MaterialIcons
                          name={
                            open
                              ? 'expand-less'
                              : 'expand-more'
                          }
                          size={22}
                          color={COLORS.lightMuted}
                        />
                      </TouchableOpacity>

                      {open ? (
                        <FadeInView offset={4}>
                          <Text style={styles.faqAnswer}>
                            {faq.answer}
                          </Text>
                        </FadeInView>
                      ) : null}
                    </View>
                  );
                })}
              </View>

              {/* POLICIES */}

              <Text style={styles.sectionTitle}>
                Policies
              </Text>

              <View style={styles.card}>
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

  tourCard: {
    marginBottom: 20,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  tourIcon: {
    width: 44,
    height: 44,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  tourText: {
    flex: 1,
  },

  tourTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14.5,
  },

  tourSubtitle: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
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

  stepRow: {
    paddingVertical: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },

  stepRowDivider: {
    borderBottomWidth: 1,
    borderBottomColor: COLORS.divider,
  },

  stepIcon: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  stepBody: {
    flex: 1,
    minWidth: 0,
  },

  stepTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  stepText: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
  },

  faqQuestion: {
    minHeight: 50,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },

  faqQuestionText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13.5,
  },

  faqAnswer: {
    paddingBottom: 13,
    color: COLORS.muted,
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
});
