import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
  muted: '#666666',
  lightMuted: '#9A9A9A',
  pageTop: '#F3B5B7',
  pageBottom: '#D90B12',
  card: '#FAFAFA',
  border: '#D5D5D5',
  pinkLight: '#FFF1F1',
  pinkBorder: '#E7A6A6',
  green: '#159447',
  greenLight: '#EDF8F1',
  greenBorder: '#B9DFC8',
  amber: '#8A5A00',
  amberLight: '#FFF8E8',
  amberBorder: '#EAD8A9',
};

const COMPLETED_STEPS = [
  { label: 'Blood', icon: 'bloodtype' as const },
  { label: 'History', icon: 'history' as const },
  { label: 'Availability', icon: 'location-on' as const },
  { label: 'Verification', icon: 'verified-user' as const },
];

export default function DonorApplicationSuccessScreen() {
  const params = useLocalSearchParams<{ status?: string }>();

  const status = params.status || 'pending';
  const approved = status === 'approved';
  const pending = status === 'pending';

  const statusLabel = approved
    ? 'Approved'
    : pending
      ? 'Pending review'
      : status.replace(/_/g, ' ');

  const statusColor = approved
    ? COLORS.green
    : pending
      ? COLORS.amber
      : COLORS.muted;

  const statusBackground = approved
    ? COLORS.greenLight
    : pending
      ? COLORS.amberLight
      : '#F5F5F5';

  const statusBorder = approved
    ? COLORS.greenBorder
    : pending
      ? COLORS.amberBorder
      : COLORS.border;

  const nextSteps = approved
    ? [
        {
          icon: 'search' as const,
          title: 'Browse blood requests',
          description: 'Look for compatible requests from people who need blood.',
        },
        {
          icon: 'volunteer-activism' as const,
          title: 'Offer to donate',
          description: 'Respond to a request when you are available to help.',
        },
        {
          icon: 'forum' as const,
          title: 'Coordinate safely',
          description: 'Once accepted, coordinate the donation details with the requester.',
        },
      ]
    : [
        {
          icon: 'manage-search' as const,
          title: 'Application review',
          description: 'Your submitted donor information will be reviewed by the administrator.',
        },
        {
          icon: 'verified-user' as const,
          title: 'Verification',
          description: 'Your eligibility and submitted identification will be checked.',
        },
        {
          icon: 'notifications-none' as const,
          title: 'Status update',
          description: 'Once approved, your donor access will become available in the app.',
        },
      ];

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar style="light" />

          <LinearGradient
            colors={['#D2151A', COLORS.redDark]}
            style={styles.header}
          >
            <View style={styles.headerCircleLeft} />
            <View style={styles.headerCircleRight} />

            <View style={styles.headerRow}>
              <View style={styles.headerIcon}>
                <MaterialIcons
                  name="volunteer-activism"
                  size={23}
                  color={COLORS.white}
                />
              </View>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Donor Application</Text>
                <Text style={styles.headerSubtitle}>Application status</Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.pageTop, COLORS.pageBottom]}
            style={styles.body}
          >
            <View style={styles.card}>
              <ScrollView
                contentContainerStyle={styles.content}
                showsVerticalScrollIndicator={false}
                bounces={false}
              >
                <View style={styles.confirmation}>
                  <View
                    style={[
                      styles.iconCircle,
                      approved && styles.iconApproved,
                    ]}
                  >
                    <MaterialIcons
                      name={
                        approved
                          ? 'verified'
                          : pending
                            ? 'task-alt'
                            : 'info-outline'
                      }
                      size={36}
                      color={approved ? COLORS.green : COLORS.redButton}
                    />
                  </View>

                  <Text style={styles.title}>
                    {approved
                      ? 'You’re approved!'
                      : pending
                        ? 'Application submitted'
                        : 'Application status'}
                  </Text>

                  <Text style={styles.description}>
                    {approved
                      ? 'Your donor profile is active. You can now help with compatible blood requests.'
                      : pending
                        ? 'Your donor application was submitted successfully and is now waiting for review.'
                        : 'Check the status below for your donor application.'}
                  </Text>
                </View>

                <View
                  style={[
                    styles.statusCard,
                    {
                      backgroundColor: statusBackground,
                      borderColor: statusBorder,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.statusIcon,
                      { backgroundColor: COLORS.white },
                    ]}
                  >
                    <MaterialIcons
                      name={approved ? 'verified-user' : 'schedule'}
                      size={21}
                      color={statusColor}
                    />
                  </View>

                  <View style={styles.statusContent}>
                    <Text style={styles.statusLabel}>Application status</Text>
                    <Text
                      style={[
                        styles.statusText,
                        { color: statusColor },
                      ]}
                    >
                      {statusLabel}
                    </Text>
                  </View>

                  <View
                    style={[
                      styles.statusDot,
                      { backgroundColor: statusColor },
                    ]}
                  />
                </View>

                <Text style={styles.sectionTitle}>Application complete</Text>

                <View style={styles.completedCard}>
                  {COMPLETED_STEPS.map((step, index) => (
                    <View
                      key={step.label}
                      style={[
                        styles.completedRow,
                        index !== COMPLETED_STEPS.length - 1 &&
                          styles.completedRowBorder,
                      ]}
                    >
                      <View style={styles.completedIcon}>
                        <MaterialIcons
                          name={step.icon}
                          size={18}
                          color={COLORS.redButton}
                        />
                      </View>

                      <Text style={styles.completedLabel}>{step.label}</Text>

                      <MaterialIcons
                        name="check-circle"
                        size={19}
                        color={COLORS.green}
                      />
                    </View>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>
                  {approved ? 'What you can do now' : 'What happens next'}
                </Text>

                <View style={styles.nextCard}>
                  {nextSteps.map((step, index) => (
                    <View
                      key={step.title}
                      style={
                        index === nextSteps.length - 1
                          ? styles.nextStepLast
                          : styles.nextStep
                      }
                    >
                      <View style={styles.timelineColumn}>
                        <View style={styles.timelineCircle}>
                          <MaterialIcons
                            name={step.icon}
                            size={16}
                            color={COLORS.redButton}
                          />
                        </View>

                        {index !== nextSteps.length - 1 ? (
                          <View style={styles.timelineLine} />
                        ) : null}
                      </View>

                      <View style={styles.nextStepContent}>
                        <Text style={styles.nextStepTitle}>{step.title}</Text>
                        <Text style={styles.nextStepDescription}>
                          {step.description}
                        </Text>
                      </View>
                    </View>
                  ))}
                </View>

                {pending ? (
                  <View style={styles.noteCard}>
                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color={COLORS.redButton}
                    />

                    <Text style={styles.noteText}>
                      You can return to the dashboard while your application is being reviewed.
                    </Text>
                  </View>
                ) : null}

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.homeButton}
                  activeOpacity={0.85}
                  onPress={() => router.replace('/dashboard')}
                >
                  <Text style={styles.homeButtonText}>Back to Home</Text>
                </TouchableOpacity>
              </ScrollView>
            </View>
          </LinearGradient>
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
    backgroundColor: Platform.OS === 'web' ? '#242424' : COLORS.pageBottom,
  },

  phone: {
    width: Platform.OS === 'web' ? 440 : '100%',
    height: '100%',
    maxWidth: '100%',
    overflow: 'hidden',
    backgroundColor: COLORS.pageBottom,
  },

  safeArea: {
    flex: 1,
    backgroundColor: COLORS.red,
  },

  header: {
    height: Platform.OS === 'web' ? 118 : 108,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'web' ? 18 : 6,
    overflow: 'hidden',
  },

  headerCircleLeft: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    left: -98,
    top: -73,
    backgroundColor: 'rgba(255,255,255,0.06)',
  },

  headerCircleRight: {
    position: 'absolute',
    width: 170,
    height: 170,
    borderRadius: 85,
    right: -73,
    top: -78,
    backgroundColor: 'rgba(255,255,255,0.08)',
  },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 1,
  },

  headerIcon: {
    width: 43,
    height: 43,
    marginRight: 17,
    borderRadius: 22,
    borderWidth: 3,
    borderColor: COLORS.white,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerCopy: {
    flex: 1,
    minWidth: 0,
  },

  headerTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 20,
    lineHeight: 27,
  },

  headerSubtitle: {
    marginTop: 1,
    color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular',
    fontSize: 11,
    lineHeight: 17,
  },

  body: {
    flex: 1,
    paddingHorizontal: 18,
    paddingBottom: 16,
  },

  card: {
    flex: 1,
    marginTop: -14,
    borderRadius: 27,
    overflow: 'hidden',
    backgroundColor: COLORS.card,
    shadowColor: '#000000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16,
    shadowRadius: 7,
    elevation: 6,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 21,
    paddingTop: 22,
    paddingBottom: 30,
  },

  confirmation: {
    alignItems: 'center',
    paddingTop: 8,
  },

  iconCircle: {
    width: 66,
    height: 66,
    borderRadius: 33,
    backgroundColor: COLORS.pinkLight,
    alignItems: 'center',
    justifyContent: 'center',
  },

  iconApproved: {
    backgroundColor: COLORS.greenLight,
  },

  title: {
    marginTop: 15,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 19,
    lineHeight: 27,
    textAlign: 'center',
  },

  description: {
    maxWidth: 310,
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 11.5,
    lineHeight: 17,
    textAlign: 'center',
  },

  statusCard: {
    minHeight: 70,
    marginTop: 22,
    paddingHorizontal: 13,
    paddingVertical: 11,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 11,
  },

  statusIcon: {
    width: 38,
    height: 38,
    marginRight: 10,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statusContent: {
    flex: 1,
    paddingRight: 8,
  },

  statusLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 10,
    lineHeight: 15,
  },

  statusText: {
    marginTop: 2,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
    lineHeight: 18,
    textTransform: 'capitalize',
  },

  statusDot: {
    width: 9,
    height: 9,
    borderRadius: 5,
  },

  sectionTitle: {
    marginTop: 23,
    marginBottom: 9,
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
    lineHeight: 20,
  },

  completedCard: {
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E8E2E3',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },

  completedRow: {
    minHeight: 54,
    flexDirection: 'row',
    alignItems: 'center',
  },

  completedRowBorder: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#E8E8E8',
  },

  completedIcon: {
    width: 33,
    height: 33,
    marginRight: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  completedLabel: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
  },

  nextCard: {
    paddingHorizontal: 13,
    paddingTop: 13,
    paddingBottom: 4,
    borderWidth: 1,
    borderColor: '#E8E2E3',
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },

  nextStep: {
    minHeight: 65,
    flexDirection: 'row',
  },

  nextStepLast: {
    minHeight: 55,
    flexDirection: 'row',
  },

  timelineColumn: {
    width: 34,
    alignItems: 'center',
  },

  timelineCircle: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  timelineLine: {
    width: 1.5,
    flex: 1,
    marginVertical: 3,
    backgroundColor: '#E3E3E3',
  },

  nextStepContent: {
    flex: 1,
    paddingLeft: 10,
    paddingTop: 2,
    paddingBottom: 11,
  },

  nextStepTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11,
    lineHeight: 16,
  },

  nextStepDescription: {
    marginTop: 3,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 9.5,
    lineHeight: 14,
  },

  noteCard: {
    minHeight: 58,
    marginTop: 14,
    paddingHorizontal: 12,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderWidth: 1,
    borderColor: COLORS.pinkBorder,
    borderRadius: 10,
    backgroundColor: COLORS.pinkLight,
  },

  noteText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 9.5,
    lineHeight: 14,
  },

  homeButton: {
    minHeight: 49,
    marginTop: 22,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    borderRadius: 9,
    backgroundColor: COLORS.redButton,
  },

  homeButtonText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    lineHeight: 18,
    flexShrink: 1,
  },
});
