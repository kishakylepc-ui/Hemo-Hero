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

export default function PrivacyPolicyScreen() {
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
                Privacy Policy
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
              Hemo-Hero respects the privacy of its
              users. This Privacy Policy explains the
              types of information Hemo-Hero may
              collect, how that information is used,
              and how it is protected.
            </Text>

            {/* 1 */}

            <Text style={styles.sectionTitle}>
              1. Information We Collect
            </Text>

            <Text style={styles.paragraph}>
              Depending on the features you use,
              Hemo-Hero may collect the following
              information:
            </Text>

            <Text style={styles.bullet}>
              • Account information such as your email
              address and authentication information.
            </Text>

            <Text style={styles.bullet}>
              • Profile information such as first name,
              middle name, last name, suffix, phone
              number, date of birth, and gender.
            </Text>

            <Text style={styles.bullet}>
              • Blood type and other information
              provided for blood donation and request
              coordination.
            </Text>

            <Text style={styles.bullet}>
              • Address information including barangay,
              city, and province.
            </Text>

            <Text style={styles.bullet}>
              • Location coordinates when you grant
              Hemo-Hero permission to use your device
              location.
            </Text>

            <Text style={styles.bullet}>
              • Profile photo information when you
              choose to provide a profile image.
            </Text>

            <Text style={styles.bullet}>
              • Blood requests, donor responses,
              coordination information, and related
              activity within the application.
            </Text>

            <Text style={styles.bullet}>
              • Messages or other information you
              provide when using communication
              features.
            </Text>

            {/* 2 */}

            <Text style={styles.sectionTitle}>
              2. How We Use Your Information
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero may use collected information
              to:
            </Text>

            <Text style={styles.bullet}>
              • Create and authenticate user accounts.
            </Text>

            <Text style={styles.bullet}>
              • Maintain user profiles.
            </Text>

            <Text style={styles.bullet}>
              • Display and manage blood requests.
            </Text>

            <Text style={styles.bullet}>
              • Help identify nearby blood requests,
              donors, or facilities when location
              features are enabled.
            </Text>

            <Text style={styles.bullet}>
              • Support blood-request and donor
              coordination.
            </Text>

            <Text style={styles.bullet}>
              • Allow users to communicate through
              supported Hemo-Hero features.
            </Text>

            <Text style={styles.bullet}>
              • Improve application reliability,
              security, and functionality.
            </Text>

            <Text style={styles.bullet}>
              • Prevent misuse, unauthorized access,
              fraud, and abusive activity.
            </Text>

            {/* 3 */}

            <Text style={styles.sectionTitle}>
              3. Blood Type and Health-Related Information
            </Text>

            <Text style={styles.paragraph}>
              Blood type and blood-request information
              may be considered sensitive because it
              relates to health and medical
              coordination.
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero uses this information only for
              application functions related to blood
              requests, donor matching, coordination,
              and related services.
            </Text>

            {/* 4 */}

            <Text style={styles.sectionTitle}>
              4. Location Information
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero may request permission to
              access your location in order to provide
              nearby blood requests, nearby facilities,
              or other location-aware features.
            </Text>

            <Text style={styles.paragraph}>
              Location access depends on your device
              permissions. You may deny or disable
              location permission through your device
              settings, although some Hemo-Hero
              features may then become unavailable or
              less accurate.
            </Text>

            {/* 5 */}

            <Text style={styles.sectionTitle}>
              5. How Information Is Shared
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero does not intend to sell user
              personal information.
            </Text>

            <Text style={styles.paragraph}>
              Information may be shared only when
              necessary to provide application
              features, support coordination between
              users, operate the underlying technical
              services, comply with applicable law, or
              protect users and the Hemo-Hero system.
            </Text>

            {/* 6 */}

            <Text style={styles.sectionTitle}>
              6. Third-Party Services
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero uses third-party services to
              support application functionality.
            </Text>

            <Text style={styles.paragraph}>
              Supabase is used for services including
              authentication, application data, and
              related backend functionality.
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero may also use an email delivery
              provider to send account verification,
              password recovery, and other
              authentication-related messages.
            </Text>

            <Text style={styles.paragraph}>
              Third-party providers may process
              information according to their own
              privacy and security practices.
            </Text>

            {/* 7 */}

            <Text style={styles.sectionTitle}>
              7. Data Security
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero uses reasonable technical and
              organizational measures designed to
              protect user information from
              unauthorized access, misuse, alteration,
              or disclosure.
            </Text>

            <Text style={styles.paragraph}>
              However, no application, network,
              database, or internet transmission can be
              guaranteed to be completely secure.
            </Text>

            {/* 8 */}

            <Text style={styles.sectionTitle}>
              8. Account Security
            </Text>

            <Text style={styles.paragraph}>
              Users are responsible for keeping their
              passwords and verification codes private.
              Hemo-Hero will never require users to
              publicly disclose an authentication code.
            </Text>

            {/* 9 */}

            <Text style={styles.sectionTitle}>
              9. Data Accuracy
            </Text>

            <Text style={styles.paragraph}>
              Users should provide accurate and current
              information. Where supported by the
              application, users may update profile
              information through their account.
            </Text>

            {/* 10 */}

            <Text style={styles.sectionTitle}>
              10. Data Retention
            </Text>

            <Text style={styles.paragraph}>
              Information may be retained for as long
              as reasonably necessary to provide
              Hemo-Hero services, maintain system
              integrity, resolve disputes, prevent
              misuse, or meet applicable legal and
              academic requirements.
            </Text>

            {/* 11 */}

            <Text style={styles.sectionTitle}>
              11. User Requests
            </Text>

            <Text style={styles.paragraph}>
              Users may request correction of
              inaccurate information and may request
              account or data deletion where supported
              by the application and permitted by
              applicable requirements.
            </Text>

            {/* 12 */}

            <Text style={styles.sectionTitle}>
              12. Children and Eligibility
            </Text>

            <Text style={styles.paragraph}>
              Hemo-Hero should only be used by persons
              who are legally permitted to create an
              account and use the applicable features.
              Blood donation eligibility remains
              subject to healthcare and blood
              collection requirements.
            </Text>

            {/* 13 */}

            <Text style={styles.sectionTitle}>
              13. Changes to This Privacy Policy
            </Text>

            <Text style={styles.paragraph}>
              This Privacy Policy may be updated when
              Hemo-Hero introduces new features,
              changes how information is processed, or
              updates its privacy and security
              practices.
            </Text>

            {/* 14 */}

            <Text style={styles.sectionTitle}>
              14. Your Consent
            </Text>

            <Text style={styles.paragraph}>
              By creating a Hemo-Hero account and
              agreeing to the Privacy Policy, you
              acknowledge that you have read and
              understood how information may be
              collected and used as described above.
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