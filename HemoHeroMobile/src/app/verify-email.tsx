import {
  Alert,
  Image,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import {
  router,
  useLocalSearchParams,
} from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#7E0B0B',
  redButton: '#B42323',

  pinkTop: '#EBA4A7',
  pinkBottom: '#D93238',

  white: '#FFFFFF',
  black: '#111111',
  muted: '#666666',
};

export default function VerifyEmailScreen() {
  const params =
    useLocalSearchParams<{
      email?: string;
    }>();

  const email =
    typeof params.email === 'string'
      ? params.email
      : '';

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      window.alert(
        `${title}\n\n${message}`
      );

      return;
    }

    Alert.alert(
      title,
      message
    );
  }

  function handleVerified() {
    showMessage(
      'Email Verification',
      'If you already confirmed your email, you can now sign in.'
    );

    router.replace('/');
  }

  function handleResend() {
    showMessage(
      'Resend Verification Email',
      'We will connect the resend function to the backend next.'
    );
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top', 'bottom']}
        >
          <StatusBar style="light" />

          {/* HEADER */}

          <View style={styles.headerWrapper}>
            <LinearGradient
              colors={[
                COLORS.red,
                COLORS.redDark,
              ]}
              style={styles.header}
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

              <Text style={styles.brandName}>
                Hemo-Hero
              </Text>

              <Text style={styles.tagline}>
                Connect to Donors Near You
              </Text>
            </LinearGradient>
          </View>

          {/* BODY */}

          <LinearGradient
            colors={[
              COLORS.pinkTop,
              COLORS.pinkBottom,
            ]}
            style={styles.bodyBackground}
          >
            {/* LOGO */}

            <View style={styles.logoCircle}>
              <Image
                source={require('../../assets/images/LifeLine (5).png')}
                style={styles.logoImage}
                resizeMode="contain"
              />
            </View>

            {/* CARD */}

            <View style={styles.card}>
              <View style={styles.iconCircle}>
                <MaterialIcons
                  name="mark-email-read"
                  size={42}
                  color={COLORS.redButton}
                />
              </View>

              <Text style={styles.title}>
                Verify Your Email
              </Text>

              <Text style={styles.description}>
                We sent a verification link to
              </Text>

              <Text style={styles.email}>
                {email ||
                  'your email address'}
              </Text>

              <Text style={styles.instructions}>
                 Open the email and tap the Verification link to confirm your Hemo-Hero account.
  Once verified, return here and continue
  to Sign In.
              </Text>

              {/* VERIFIED BUTTON */}

              <TouchableOpacity
                style={styles.primaryButton}
                activeOpacity={0.85}
                onPress={handleVerified}
              >
                <Text
                  style={
                    styles.primaryButtonText
                  }
                >
Continue to Sign In                
</Text>
              </TouchableOpacity>

              {/* RESEND */}

              <TouchableOpacity
                style={styles.resendButton}
                activeOpacity={0.7}
                onPress={handleResend}
              >
                <Text style={styles.resendText}>
                  Didn't receive an email?{' '}
                  <Text
                    style={
                      styles.resendLink
                    }
                  >
                    Resend
                  </Text>
                </Text>
              </TouchableOpacity>

              {/* BACK */}

              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.7}
                onPress={() =>
                  router.replace('/')
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={16}
                  color={COLORS.redButton}
                />

                <Text style={styles.backText}>
                  Back to Sign In
                </Text>
              </TouchableOpacity>
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

    backgroundColor:
      Platform.OS === 'web'
        ? '#1E1E1E'
        : COLORS.pinkBottom,
  },

  phone: {
    width:
      Platform.OS === 'web'
        ? 402
        : '100%',

    height:
      Platform.OS === 'web'
        ? 874
        : '100%',

    maxWidth: '100%',

    overflow: 'hidden',

    backgroundColor:
      COLORS.pinkTop,
  },

  safeArea: {
    flex: 1,

    backgroundColor:
      COLORS.red,
  },

  // HEADER

  headerWrapper: {
    backgroundColor:
      COLORS.pinkTop,
  },

  header: {
    height: 260,

    alignItems: 'center',

    paddingTop: 55,

    borderBottomLeftRadius: 62,
    borderBottomRightRadius: 62,

    overflow: 'hidden',
  },

  headerCircleLeft: {
    position: 'absolute',

    width: 180,
    height: 180,

    borderRadius: 90,

    left: -100,
    top: -50,

    backgroundColor:
      'rgba(255,255,255,0.07)',
  },

  headerCircleRight: {
    position: 'absolute',

    width: 180,
    height: 180,

    borderRadius: 90,

    right: -92,
    top: -55,

    backgroundColor:
      'rgba(255,255,255,0.07)',
  },

  brandName: {
    color: COLORS.white,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 31,
  },

  tagline: {
    marginTop: 7,

    color: COLORS.white,

    fontFamily:
      'Inter_400Regular',

    fontSize: 12,
  },

  // BODY

  bodyBackground: {
    flex: 1,

    paddingHorizontal: 26,
    paddingTop: 115,
    paddingBottom: 32,
  },

  // LOGO

  logoCircle: {
    position: 'absolute',

    top: -72,
    alignSelf: 'center',

    width: 148,
    height: 148,

    borderRadius: 74,

    backgroundColor:
      COLORS.white,

    alignItems: 'center',
    justifyContent: 'center',

    overflow: 'hidden',
  },

  logoImage: {
    width: 128,
    height: 128,
  },

  // CARD

  card: {
    backgroundColor:
      COLORS.white,

    borderRadius: 25,

    paddingHorizontal: 24,
    paddingTop: 28,
    paddingBottom: 27,

    alignItems: 'center',
  },

  iconCircle: {
    width: 78,
    height: 78,

    borderRadius: 39,

    backgroundColor:
      '#FDECEC',

    alignItems: 'center',
    justifyContent: 'center',

    marginBottom: 18,
  },

  title: {
    color: COLORS.black,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 20,

    textAlign: 'center',
  },

  description: {
    marginTop: 10,

    color: COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 11,

    textAlign: 'center',
  },

  email: {
    marginTop: 5,

    color: COLORS.redButton,

    fontFamily:
      'Inter_600SemiBold',

    fontSize: 12,

    textAlign: 'center',
  },

  instructions: {
    marginTop: 18,

    paddingHorizontal: 8,

    color: COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 11,

    lineHeight: 18,

    textAlign: 'center',
  },

  // PRIMARY BUTTON

  primaryButton: {
    width: '100%',

    height: 50,

    marginTop: 28,

    borderRadius: 7,

    backgroundColor:
      COLORS.redButton,

    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryButtonText: {
    color:
      COLORS.white,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 12,
  },

  // RESEND

  resendButton: {
    marginTop: 19,

    paddingVertical: 4,
  },

  resendText: {
    color: COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 10,
  },

  resendLink: {
    color: COLORS.red,

    fontFamily:
      'Inter_600SemiBold',
  },

  // BACK

  backButton: {
    marginTop: 18,

    flexDirection: 'row',
    alignItems: 'center',

    gap: 5,
  },

  backText: {
    color:
      COLORS.redButton,

    fontFamily:
      'Inter_500Medium',

    fontSize: 10,
  },
});