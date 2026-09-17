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
  router,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#7E0B0B',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#111111',

  background: '#F8F8F8',
  muted: '#666666',
  border: '#E5E5E5',
};

// ============================================================
// SCREEN
// ============================================================

export default function TermsOfServiceScreen() {
  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top']}
        >
          <StatusBar style="light" />

          {/* ==================================================
              HEADER
          ================================================== */}

          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              activeOpacity={0.7}
              onPress={() =>
                router.back()
              }
            >
              <MaterialIcons
                name="arrow-back"
                size={24}
                color={COLORS.white}
              />
            </TouchableOpacity>

            <View style={styles.headerTextContainer}>
              <Text style={styles.headerTitle}>
                Terms of Service
              </Text>

              <Text style={styles.headerSubtitle}>
                Hemo-Hero
              </Text>
            </View>

            <View style={styles.headerSpacer} />
          </View>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            style={styles.scroll}
            contentContainerStyle={
              styles.scrollContent
            }
            showsVerticalScrollIndicator={false}
          >
            <Text style={styles.updatedText}>
              Last updated: September 12, 2026
            </Text>

            <Text style={styles.intro}>
              Welcome to Hemo-Hero. These Terms of
              Service explain the rules and
              responsibilities that apply when you
              create an account or use Hemo-Hero.
            </Text>

            {/* 1 */}

            <Text style={styles.sectionTitle}>
              1. About Hemo-Hero
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero is a location-aware platform
              designed to help connect individuals
              requesting blood with potential donors
              and provide tools for blood-request
              coordination.
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero does not operate as a hospital,
              blood bank, medical facility, ambulance
              service, or emergency response provider.
              The application does not guarantee that a
              donor, blood supply, medical facility, or
              successful donation will be available.
            </Text>

            {/* 2 */}

            <Text style={styles.sectionTitle}>
              2. Medical and Emergency Disclaimer
            </Text>

            <Text style={styles.paragraph}>
              Information provided through Hemo-Hero is
              intended to support coordination and
              communication only. It is not medical
              advice, diagnosis, or treatment.
            </Text>

            <Text style={styles.paragraph}>
              In a medical emergency, users should
              contact the appropriate emergency service,
              hospital, blood bank, or healthcare
              professional directly. Users should not
              rely exclusively on Hemo-Hero during an
              emergency.
            </Text>

            {/* 3 */}

            <Text style={styles.sectionTitle}>
              3. User Accounts
            </Text>

            <Text style={styles.paragraph}>
              You are responsible for providing accurate
              information when creating and maintaining
              your Hemo-Hero account.
            </Text>

            <Text style={styles.paragraph}>
              You are responsible for protecting your
              password, verification codes, and account
              access. You must not share authentication
              credentials or allow another person to
              impersonate you.
            </Text>

            {/* 4 */}

            <Text style={styles.sectionTitle}>
              4. Blood Requests
            </Text>

            <Text style={styles.paragraph}>
              Blood requests submitted through
              Hemo-Hero must contain truthful and
              reasonably accurate information,
              including the requested blood type,
              facility, urgency, and other information
              necessary for coordination.
            </Text>

            <Text style={styles.paragraph}>
              Users must not create false, misleading,
              fraudulent, or intentionally harmful blood
              requests.
            </Text>

            {/* 5 */}

            <Text style={styles.sectionTitle}>
              5. Donor Participation
            </Text>

            <Text style={styles.paragraph}>
              A response to a blood request does not
              guarantee that an individual is medically
              eligible to donate blood.
            </Text>

            <Text style={styles.paragraph}>
              Final donor eligibility, compatibility,
              screening, and acceptance must be
              determined by qualified healthcare
              professionals or authorized blood
              collection facilities.
            </Text>

            {/* 6 */}

            <Text style={styles.sectionTitle}>
              6. Location Information
            </Text>

            <Text style={styles.paragraph}>
              Certain Hemo-Hero features may use
              location information to identify nearby
              blood requests, donors, hospitals, blood
              banks, or other relevant facilities.
            </Text>

            <Text style={styles.paragraph}>
              Location-dependent features may be less
              accurate or unavailable when location
              access is disabled or when device location
              information is inaccurate.
            </Text>

            {/* 7 */}

            <Text style={styles.sectionTitle}>
              7. Communication and Coordination
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero may provide communication and
              coordination features between users.
              Users must communicate respectfully and
              must not use these features for
              harassment, threats, fraud, spam,
              solicitation, or unlawful activity.
            </Text>

            {/* 8 */}

            <Text style={styles.sectionTitle}>
              8. Prohibited Use
            </Text>

            <Text style={styles.paragraph}>
              You must not use Hemo-Hero to:
            </Text>

            <Text style={styles.bullet}>
              • Submit intentionally false blood
              requests or donor information.
            </Text>

            <Text style={styles.bullet}>
              • Impersonate another person.
            </Text>

            <Text style={styles.bullet}>
              • Harass, threaten, exploit, or deceive
              another user.
            </Text>

            <Text style={styles.bullet}>
              • Attempt unauthorized access to another
              account or Hemo-Hero system.
            </Text>

            <Text style={styles.bullet}>
              • Distribute malicious software, spam, or
              harmful content.
            </Text>

            <Text style={styles.bullet}>
              • Use the service for activity prohibited
              by applicable law.
            </Text>

            {/* 9 */}

            <Text style={styles.sectionTitle}>
              9. Availability of the Service
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero may occasionally be unavailable
              because of maintenance, internet
              connectivity, third-party services,
              technical problems, or other conditions
              beyond our control.
            </Text>

            <Text style={styles.paragraph}>
              We do not guarantee uninterrupted or
              error-free operation of the service.
            </Text>

            {/* 10 */}

            <Text style={styles.sectionTitle}>
              10. Account Restrictions
            </Text>

            <Text style={styles.paragraph}>
              Access to Hemo-Hero may be restricted or
              suspended when an account is used for
              fraud, abuse, unauthorized access,
              deliberate misinformation, or other
              violations of these Terms.
            </Text>

            {/* 11 */}

            <Text style={styles.sectionTitle}>
              11. Privacy
            </Text>

            <Text style={styles.paragraph}>
              Information collected through Hemo-Hero
              is handled according to the Hemo-Hero
              Privacy Policy. Please review the Privacy
              Policy before creating an account.
            </Text>

            {/* 12 */}

            <Text style={styles.sectionTitle}>
              12. Changes to These Terms
            </Text>

            <Text style={styles.paragraph}>
              These Terms may be updated as Hemo-Hero
              develops new features, improves its
              services, or changes its operational or
              legal requirements.
            </Text>

            {/* 13 */}

            <Text style={styles.sectionTitle}>
              13. Acceptance
            </Text>

            <Text style={styles.paragraph}>
              By creating a Hemo-Hero account and
              selecting the agreement checkbox, you
              confirm that you have read and agree to
              these Terms of Service and the Hemo-Hero
              Privacy Policy.
            </Text>

            <View style={styles.footer}>
              <Text style={styles.footerText}>
                Hemo-Hero
              </Text>

              <Text style={styles.footerSubtext}>
                Connect to Donors Near You
              </Text>
            </View>
          </ScrollView>
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
        ? '#1E1E1E'
        : COLORS.background,
  },

  phone: {
    width:
      Platform.OS === 'web'
        ? 440
        : '100%',

    height:
      Platform.OS === 'web'
        ? '100%'
        : '100%',

    maxWidth: '100%',

    overflow: 'hidden',

    backgroundColor:
      COLORS.background,
  },

  safeArea: {
    flex: 1,

    backgroundColor:
      COLORS.redDark,
  },

  header: {
    height: 80,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 18,

    backgroundColor:
      COLORS.redDark,
  },

  backButton: {
    width: 42,
    height: 42,

    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTextContainer: {
    flex: 1,

    alignItems: 'center',
  },

  headerTitle: {
    color:
      COLORS.white,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 18,
  },

  headerSubtitle: {
    marginTop: 1,

    color:
      'rgba(255,255,255,0.8)',

    fontFamily:
      'Inter_400Regular',

    fontSize: 10,
  },

  headerSpacer: {
    width: 42,
  },

  scroll: {
    flex: 1,

    backgroundColor:
      COLORS.background,
  },

  scrollContent: {
    paddingHorizontal: 22,

    paddingTop: 24,
    paddingBottom: 50,
  },

  updatedText: {
    marginBottom: 18,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 11,
  },

  intro: {
    marginBottom: 24,

    color:
      COLORS.black,

    fontFamily:
      'Inter_400Regular',

    fontSize: 13,

    lineHeight: 21,
  },

  sectionTitle: {
    marginTop: 8,
    marginBottom: 8,

    color:
      COLORS.redDark,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 15,
  },

  paragraph: {
    marginBottom: 12,

    color:
      '#333333',

    fontFamily:
      'Inter_400Regular',

    fontSize: 12,

    lineHeight: 20,
  },

  bullet: {
    marginBottom: 8,

    paddingLeft: 8,

    color:
      '#333333',

    fontFamily:
      'Inter_400Regular',

    fontSize: 12,

    lineHeight: 19,
  },

  footer: {
    marginTop: 30,

    paddingTop: 22,

    borderTopWidth: 1,

    borderTopColor:
      COLORS.border,

    alignItems: 'center',
  },

  footerText: {
    color:
      COLORS.redButton,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 14,
  },

  footerSubtext: {
    marginTop: 3,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 10,
  },
});