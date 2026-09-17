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

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#111111',
  muted: '#646464',

  green: '#2E7D32',

  privacyBackground: '#FFF1F1',
  privacyBorder: '#E9A8A8',
};

export default function ProfileSuccessScreen() {
  // ==========================================================
  // PROFILE DATA
  // ==========================================================

  const params =
    useLocalSearchParams<{
      first_name?: string;
      last_name?: string;
      middle_name?: string;

      date_of_birth?: string;
      gender?: string;

      profile_photo_uri?: string;

      barangay?: string;
      city?: string;
      province?: string;

      latitude?: string;
      longitude?: string;

      blood_type?: string;
    }>();

  // ==========================================================
  // DASHBOARD
  // ==========================================================

  function handleDashboard() {
    /*
      Profile completion is finished and the
      login session is still stored in AsyncStorage.

      Go directly to the authenticated dashboard.
    */

    router.replace(
      '/dashboard'
    );
  }

  // ==========================================================
  // DISPLAY NAME
  // ==========================================================

  const displayName =
    [
      params.first_name,
      params.middle_name,
      params.last_name,
    ]
      .filter(Boolean)
      .join(' ') ||
    'Hemo-Hero User';

  // ==========================================================
  // LOCATION
  // ==========================================================

  const displayLocation =
    [
      params.barangay,
      params.city,
      params.province,
    ]
      .filter(Boolean)
      .join(', ');

  // ==========================================================
  // SCREEN
  // ==========================================================

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

          <ScrollView
            contentContainerStyle={
              styles.scroll
            }
            showsVerticalScrollIndicator={
              false
            }
            bounces={false}
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <LinearGradient
              colors={[
                COLORS.red,
                COLORS.redDark,
              ]}
              style={
                styles.header
              }
            >
              <View
                style={
                  styles.headerDecoration
                }
              />

              <View
                style={
                  styles.headerRow
                }
              >
                <TouchableOpacity
                  style={
                    styles.backCircle
                  }
                  activeOpacity={
                    0.75
                  }
                  onPress={() =>
                    router.back()
                  }
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={21}
                    color={
                      COLORS.white
                    }
                  />
                </TouchableOpacity>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Complete your Profile
                </Text>
              </View>
            </LinearGradient>

            {/* ==================================================
                BODY
            ================================================== */}

            <LinearGradient
              colors={[
                COLORS.backgroundTop,
                COLORS.backgroundBottom,
              ]}
              style={
                styles.bodyBackground
              }
            >
              <View
                style={
                  styles.card
                }
              >
                {/* ==============================================
                    SUCCESS ICON
                ============================================== */}

                <View
                  style={
                    styles.successCircle
                  }
                >
                  <MaterialIcons
                    name="check"
                    size={46}
                    color={
                      COLORS.white
                    }
                  />
                </View>

                {/* ==============================================
                    TITLE
                ============================================== */}

                <Text
                  style={
                    styles.successTitle
                  }
                >
                  Thank You!
                </Text>

                <Text
                  style={
                    styles.successSubtitle
                  }
                >
                  Your profile information is ready.
                </Text>

                {/* ==============================================
                    COMPLETION ITEMS
                ============================================== */}

                <View
                  style={
                    styles.completedSection
                  }
                >
                  {/* PERSONAL */}

                  <View
                    style={
                      styles.completedRow
                    }
                  >
                    <View
                      style={
                        styles.completedIcon
                      }
                    >
                      <MaterialIcons
                        name="check"
                        size={15}
                        color={
                          COLORS.white
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.rowText
                      }
                    >
                      <Text
                        style={
                          styles.completedTitle
                        }
                      >
                        Personal Information
                      </Text>

                      <Text
                        style={
                          styles.completedSubtitle
                        }
                      >
                        Your basic profile information is complete
                      </Text>
                    </View>
                  </View>

                  {/* LOCATION */}

                  <View
                    style={
                      styles.completedRow
                    }
                  >
                    <View
                      style={
                        styles.completedIcon
                      }
                    >
                      <MaterialIcons
                        name="check"
                        size={15}
                        color={
                          COLORS.white
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.rowText
                      }
                    >
                      <Text
                        style={
                          styles.completedTitle
                        }
                      >
                        Location Information
                      </Text>

                      <Text
                        style={
                          styles.completedSubtitle
                        }
                      >
                        Your location information has been added
                      </Text>
                    </View>
                  </View>

                  {/* MEDICAL */}

                  <View
                    style={[
                      styles.completedRow,
                      styles.lastCompletedRow,
                    ]}
                  >
                    <View
                      style={[
                        styles.completedIcon,

                        !params.blood_type &&
                          styles.optionalCompletedIcon,
                      ]}
                    >
                      <MaterialIcons
                        name={
                          params.blood_type
                            ? 'check'
                            : 'info-outline'
                        }
                        size={15}
                        color={
                          COLORS.white
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.rowText
                      }
                    >
                      <Text
                        style={
                          styles.completedTitle
                        }
                      >
                        Medical Information
                      </Text>

                      <Text
                        style={
                          styles.completedSubtitle
                        }
                      >
                        {params.blood_type
                          ? `Blood type: ${params.blood_type}`
                          : 'Blood type can be added later'}
                      </Text>
                    </View>
                  </View>
                </View>

                {/* ==============================================
                    PROFILE SUMMARY
                ============================================== */}

                <View
                  style={
                    styles.profileSummary
                  }
                >
                  <Text
                    style={
                      styles.summaryLabel
                    }
                  >
                    Welcome to Hemo-Hero
                  </Text>

                  <Text
                    style={
                      styles.summaryName
                    }
                  >
                    {displayName}
                  </Text>

                  {displayLocation ? (
                    <View
                      style={
                        styles.summaryLocationRow
                      }
                    >
                      <MaterialIcons
                        name="location-on"
                        size={14}
                        color={
                          COLORS.redButton
                        }
                      />

                      <Text
                        style={
                          styles.summaryLocation
                        }
                      >
                        {displayLocation}
                      </Text>
                    </View>
                  ) : null}
                </View>

                {/* ==============================================
                    PRIVACY
                ============================================== */}

                <View
                  style={
                    styles.privacyBox
                  }
                >
                  <MaterialIcons
                    name="lock-outline"
                    size={21}
                    color={
                      COLORS.redButton
                    }
                  />

                  <View
                    style={
                      styles.privacyTextContainer
                    }
                  >
                    <Text
                      style={
                        styles.privacyTitle
                      }
                    >
                      Your privacy matters
                    </Text>

                    <Text
                      style={
                        styles.privacyText
                      }
                    >
                      Your personal and medical information is kept secure and
                      will only be used to support blood donor matching and
                      emergency requests.
                    </Text>
                  </View>
                </View>

                {/* ==============================================
                    DASHBOARD BUTTON
                ============================================== */}

                <TouchableOpacity
                  style={
                    styles.dashboardButton
                  }
                  activeOpacity={
                    0.85
                  }
                  onPress={
                    handleDashboard
                  }
                >
                  <Text
                    style={
                      styles.dashboardButtonText
                    }
                  >
                    Go to Dashboard
                  </Text>

                  <MaterialIcons
                    name="arrow-forward"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </ScrollView>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    desktopBackground: {
      flex: 1,

      alignItems: 'center',
      justifyContent:
        'center',

      backgroundColor:
        Platform.OS === 'web'
          ? '#1E1E1E'
          : COLORS.backgroundBottom,
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
        COLORS.backgroundBottom,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    scroll: {
      flexGrow: 1,

      backgroundColor:
        COLORS.backgroundBottom,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height: 205,

      paddingHorizontal: 27,
      paddingTop: 52,

      overflow: 'hidden',
    },

    headerDecoration: {
      position: 'absolute',

      width: 180,
      height: 180,

      borderRadius: 90,

      right: -82,
      top: -70,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerRow: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    backCircle: {
      width: 37,
      height: 37,

      borderRadius: 19,

      borderWidth: 2,

      borderColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 12,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
    },

    // ========================================================
    // BODY
    // ========================================================

    bodyBackground: {
      flex: 1,

      minHeight: 669,

      paddingHorizontal: 28,
      paddingBottom: 30,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      marginTop: -72,

      minHeight: 640,

      paddingHorizontal: 24,
      paddingTop: 32,
      paddingBottom: 24,

      backgroundColor:
        '#FAFAFA',

      borderRadius: 27,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity: 0.15,

      shadowRadius: 5,

      elevation: 5,
    },

    // ========================================================
    // SUCCESS
    // ========================================================

    successCircle: {
      width: 78,
      height: 78,

      alignSelf: 'center',

      borderRadius: 39,

      backgroundColor:
        COLORS.green,

      alignItems: 'center',
      justifyContent:
        'center',

      marginBottom: 14,
    },

    successTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 21,

      textAlign: 'center',
    },

    successSubtitle: {
      marginTop: 4,

      paddingHorizontal: 15,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,

      textAlign: 'center',
    },

    // ========================================================
    // COMPLETED SECTIONS
    // ========================================================

    completedSection: {
      marginTop: 26,

      borderWidth: 1,

      borderColor:
        '#E4E4E4',

      borderRadius: 10,

      backgroundColor:
        COLORS.white,

      overflow: 'hidden',
    },

    completedRow: {
      minHeight: 62,

      flexDirection: 'row',

      alignItems: 'center',

      paddingHorizontal: 14,

      borderBottomWidth: 1,

      borderBottomColor:
        '#EEEEEE',
    },

    lastCompletedRow: {
      borderBottomWidth: 0,
    },

    completedIcon: {
      width: 27,
      height: 27,

      borderRadius: 14,

      backgroundColor:
        COLORS.green,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 11,
    },

    optionalCompletedIcon: {
      backgroundColor:
        COLORS.redButton,
    },

    rowText: {
      flex: 1,
    },

    completedTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    completedSubtitle: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,

      lineHeight: 12,
    },

    // ========================================================
    // PROFILE SUMMARY
    // ========================================================

    profileSummary: {
      alignItems: 'center',

      marginTop: 20,
    },

    summaryLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,
    },

    summaryName: {
      marginTop: 4,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,

      textAlign: 'center',
    },

    summaryLocationRow: {
      marginTop: 3,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent:
        'center',

      paddingHorizontal: 15,
    },

    summaryLocation: {
      flexShrink: 1,

      marginLeft: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,

      textAlign: 'center',
    },

    // ========================================================
    // PRIVACY
    // ========================================================

    privacyBox: {
      marginTop: 20,

      minHeight: 78,

      flexDirection: 'row',

      alignItems:
        'flex-start',

      paddingHorizontal: 14,
      paddingVertical: 13,

      borderWidth: 1,

      borderColor:
        COLORS.privacyBorder,

      borderRadius: 9,

      backgroundColor:
        COLORS.privacyBackground,
    },

    privacyTextContainer: {
      flex: 1,

      marginLeft: 10,
    },

    privacyTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9,
    },

    privacyText: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,

      lineHeight: 12,
    },

    // ========================================================
    // DASHBOARD BUTTON
    // ========================================================

    dashboardButton: {
      height: 50,

      marginTop: 25,

      borderRadius: 8,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent:
        'center',

      gap: 7,

      backgroundColor:
        COLORS.redButton,
    },

    dashboardButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },
  });