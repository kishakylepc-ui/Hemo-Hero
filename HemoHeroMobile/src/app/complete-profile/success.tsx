import { useCallback } from 'react';

import {
  BackHandler,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  Ionicons,
} from '@expo/vector-icons';

import SetupHeader from '../../components/SetupHeader';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#171717',
  muted: '#646464',

  green: '#2E7D32',

  privacyBackground: '#FFF1F1',
  privacyBorder: '#E9A8A8',

  // New look
  greenCheck: '#15803D',
  greenLight: '#EAF7EF',
  orange: '#B4570F',
  orangeLight: '#FFF3E6',
  hint: '#666666',
  border: '#F0E3E3',
};

export default function ProfileSuccessScreen() {
  // The page runs to the bottom edge; its content ends above
  // the home bar.
  const insets = useSafeAreaInsets();

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

      New accounts see the welcome screen first; it
      offers an optional tour of the dashboard.
    */

    router.replace(
      '/welcome' as any
    );
  }

  // The profile is saved, so there are no steps to go back to:
  // Android's back button continues, like the button.
  useFocusEffect(
    useCallback(() => {
      const subscription =
        BackHandler.addEventListener(
          'hardwareBackPress',
          () => {
            handleDashboard();

            return true;
          }
        );

      return () =>
        subscription.remove();
    }, [])
  );

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

  const firstName =
    (
      params.first_name ||
      ''
    ).trim();

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
          // The red top draws behind the status bar; the bottom
          // bar keeps clear of the home indicator itself.
          edges={[
            'left',
            'right',
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
            {/* No back button: the profile is saved. */}
            <SetupHeader
              topInset={
                insets.top
              }
              title="You're all set!"
              subtitle={
                firstName
                  ? `Welcome to Hemo-Hero, ${firstName}.`
                  : 'Welcome to Hemo-Hero.'
              }
              badge={
                <View
                  style={
                    styles.checkBadge
                  }
                >
                  <Ionicons
                    name="checkmark"
                    size={40}
                    color={
                      COLORS.greenCheck
                    }
                  />
                </View>
              }
            />

            <View
              style={
                styles.content
              }
            >
              {/* ==============================================
                  WHAT WAS SAVED
              ============================================== */}

              <View
                style={
                  styles.summaryCard
                }
              >
                <View
                  style={[
                    styles.summaryRow,
                    styles.summaryRowBorder,
                  ]
                  }
                >
                  <View
                    style={
                      styles.doneTile
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={
                        COLORS.greenCheck
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
                        styles.rowTitle
                      }
                    >
                      Personal information
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={
                        styles.rowSubtitle
                      }
                    >
                      {displayName}
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.summaryRow,
                    styles.summaryRowBorder,
                  ]
                  }
                >
                  <View
                    style={
                      styles.doneTile
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={16}
                      color={
                        COLORS.greenCheck
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
                        styles.rowTitle
                      }
                    >
                      Location
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={
                        styles.rowSubtitle
                      }
                    >
                      {displayLocation ||
                        'Location saved'}
                    </Text>
                  </View>
                </View>

                <View
                  style={
                    styles.summaryRow
                  }
                >
                  <View
                    style={[
                      styles.doneTile,
                      !params.blood_type &&
                        styles.laterTile,
                    ]
                    }
                  >
                    <Ionicons
                      name={
                        params.blood_type
                          ? 'checkmark'
                          : 'time-outline'
                      }
                      size={16}
                      color={
                        params.blood_type
                          ? COLORS.greenCheck
                          : COLORS.orange
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
                        styles.rowTitle
                      }
                    >
                      Blood type
                    </Text>

                    <Text
                      numberOfLines={1}
                      style={
                        styles.rowSubtitle
                      }
                    >
                      {params.blood_type
                        ? `${params.blood_type} added`
                        : 'You can add it later from your profile'}
                    </Text>
                  </View>
                </View>
              </View>

              {/* ==============================================
                  PRIVACY
              ============================================== */}

              <View
                style={
                  styles.privacyBox
                }
              >
                <View
                  style={
                    styles.privacyIcon
                  }
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

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
            </View>
          </ScrollView>

          <View
            style={[
              styles.bottomBar,

              {
                paddingBottom:
                  12 +
                  insets.bottom,
              },
            ]}
          >
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
                Continue
              </Text>

              <Ionicons
                name="arrow-forward"
                size={18}
                color={
                  COLORS.white
                }
              />
            </TouchableOpacity>
          </View>
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
    // ========================================================
    // DONE (new look)
    // ========================================================

    safeArea: {
      flex: 1,
      backgroundColor: COLORS.white,
    },

    scroll: {
      flexGrow: 1,
      backgroundColor: COLORS.white,
    },

    checkBadge: {
      width: 80,
      height: 80,
      borderRadius: 40,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
      shadowColor: '#000000',
      shadowOffset: {
        width: 0,
        height: 10,
      },
      shadowOpacity: 0.18,
      shadowRadius: 18,
      elevation: 8,
    },

    content: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 24,
      gap: 14,
    },

    summaryCard: {
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 16,
      overflow: 'hidden',
    },

    summaryRow: {
      paddingHorizontal: 16,
      paddingVertical: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },

    summaryRowBorder: {
      borderBottomWidth: 1,
      borderBottomColor: '#F3EAEA',
    },

    doneTile: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.greenLight,
    },

    laterTile: {
      backgroundColor: COLORS.orangeLight,
    },

    rowText: {
      flex: 1,
      minWidth: 0,
    },

    rowTitle: {
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },

    rowSubtitle: {
      marginTop: 1,
      color: COLORS.hint,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
    },

    privacyBox: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 12,
      borderRadius: 14,
      backgroundColor: '#F7F2F2',
    },

    privacyIcon: {
      width: 30,
      height: 30,
      borderRadius: 8,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
    },

    privacyTextContainer: {
      flex: 1,
    },

    privacyTitle: {
      color: COLORS.black,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
    },

    privacyText: {
      marginTop: 2,
      color: '#555555',
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
    },

    bottomBar: {
      paddingHorizontal: 20,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: COLORS.border,
      backgroundColor: COLORS.white,
    },

    dashboardButton: {
      height: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      borderRadius: 14,
      backgroundColor: COLORS.redButton,
      shadowColor: COLORS.redButton,
      shadowOffset: {
        width: 0,
        height: 8,
      },
      shadowOpacity: 0.25,
      shadowRadius: 12,
      elevation: 4,
    },

    dashboardButtonText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

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

  });