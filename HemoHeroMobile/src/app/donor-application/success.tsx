import {
  Platform,
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
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  backgroundTop: '#F1B2B4',
  backgroundBottom: '#D90B12',

  muted: '#666666',

  orange: '#D97819',
};

export default function DonorApplicationSuccessScreen() {
  const params =
    useLocalSearchParams<{
      status?: string;
    }>();

  const status =
    params.status ||
    'pending';

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

          <LinearGradient
            colors={[
              COLORS.red,
              COLORS.redDark,
            ]}
            style={
              styles.background
            }
          >
            <View
              style={
                styles.decorationOne
              }
            />

            <View
              style={
                styles.decorationTwo
              }
            />

            <View
              style={
                styles.card
              }
            >
              <View
                style={
                  styles.iconCircle
                }
              >
                <MaterialIcons
                  name="volunteer-activism"
                  size={49}
                  color={
                    COLORS.redButton
                  }
                />
              </View>

              <Text
                style={
                  styles.title
                }
              >
                Application Submitted
              </Text>

              <Text
                style={
                  styles.description
                }
              >
                Your donor application has been submitted for verification.
                You can continue using Hemo-Hero while it is being reviewed.
              </Text>

              <View
                style={
                  styles.statusCard
                }
              >
                <View
                  style={
                    styles.statusDot
                  }
                />

                <View>
                  <Text
                    style={
                      styles.statusLabel
                    }
                  >
                    Application Status
                  </Text>

                  <Text
                    style={
                      styles.statusText
                    }
                  >
                    {status ===
                    'pending'
                      ? 'Pending Review'
                      : status}
                  </Text>
                </View>
              </View>

              <View
                style={
                  styles.infoCard
                }
              >
                <MaterialIcons
                  name="verified-user"
                  size={20}
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.infoText
                  }
                >
                  You will only be able to offer to donate after your donor
                  application has been approved.
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.homeButton
                }
                activeOpacity={
                  0.85
                }
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
              >
                <Text
                  style={
                    styles.homeButtonText
                  }
                >
                  Back to Home
                </Text>

                <MaterialIcons
                  name="arrow-forward"
                  size={18}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles =
  StyleSheet.create({
    desktopBackground: {
      flex: 1,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        Platform.OS === 'web'
          ? '#222222'
          : COLORS.redDark,
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
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    background: {
      flex: 1,

      paddingHorizontal: 22,

      alignItems: 'center',
      justifyContent: 'center',

      overflow: 'hidden',
    },

    decorationOne: {
      position: 'absolute',

      width: 220,
      height: 220,

      borderRadius: 110,

      top: -100,
      right: -90,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    decorationTwo: {
      position: 'absolute',

      width: 210,
      height: 210,

      borderRadius: 105,

      bottom: -100,
      left: -100,

      backgroundColor:
        'rgba(255,255,255,0.05)',
    },

    card: {
      width: '100%',

      paddingHorizontal: 24,
      paddingVertical: 32,

      borderRadius: 26,

      alignItems: 'center',

      backgroundColor:
        '#FAFAFA',
    },

    iconCircle: {
      width: 92,
      height: 92,

      borderRadius: 46,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        '#FFF0F0',
    },

    title: {
      marginTop: 19,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,

      textAlign: 'center',
    },

    description: {
      maxWidth: 280,

      marginTop: 7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 16,

      textAlign: 'center',
    },

    statusCard: {
      width: '100%',

      minHeight: 66,

      marginTop: 24,

      paddingHorizontal: 15,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        '#E8DADA',

      borderRadius: 13,

      backgroundColor:
        COLORS.white,
    },

    statusDot: {
      width: 12,
      height: 12,

      marginRight: 11,

      borderRadius: 6,

      backgroundColor:
        COLORS.orange,
    },

    statusLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    statusText: {
      marginTop: 2,

      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11,
    },

    infoCard: {
      width: '100%',

      marginTop: 13,

      padding: 13,

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 9,

      borderWidth: 1,

      borderColor:
        '#ECC0C0',

      borderRadius: 12,

      backgroundColor:
        '#FFF1F1',
    },

    infoText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,
    },

    homeButton: {
      width: '100%',

      height: 50,

      marginTop: 24,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 7,

      borderRadius: 10,

      backgroundColor:
        COLORS.redButton,
    },

    homeButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },
  });