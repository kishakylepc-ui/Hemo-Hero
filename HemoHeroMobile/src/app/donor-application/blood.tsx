import {
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
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
  useFocusEffect,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  getCurrentUser,
} from '../../lib/api';

import {
  getAccessToken,
} from '../../lib/session';

import {
  getMyDonorApplication,
} from '../../lib/donorApplication';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#181818',

  pageTop: '#F0B2B4',
  pageBottom: '#D90B12',

  muted: '#666666',
  lightMuted: '#969696',

  border: '#E4DEDE',

  pink: '#FFF2F2',

  green: '#198754',
};

// ============================================================
// BLOOD TYPES
// ============================================================

const BLOOD_TYPES = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
];

// ============================================================
// SCREEN
// ============================================================

export default function DonorBloodInformationScreen() {
  const [
    bloodType,
    setBloodType,
  ] = useState('');

  const [
    age,
    setAge,
  ] = useState<number | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  // ==========================================================
  // AGE
  // ==========================================================

  function calculateAge(
    dateOfBirth: string
  ) {
    const birthDate =
      new Date(
        `${dateOfBirth}T00:00:00`
      );

    if (
      Number.isNaN(
        birthDate.getTime()
      )
    ) {
      return null;
    }

    const today =
      new Date();

    let calculatedAge =
      today.getFullYear() -
      birthDate.getFullYear();

    const monthDifference =
      today.getMonth() -
      birthDate.getMonth();

    if (
      monthDifference < 0 ||
      (
        monthDifference === 0 &&
        today.getDate() <
          birthDate.getDate()
      )
    ) {
      calculatedAge -= 1;
    }

    return calculatedAge;
  }

  // ==========================================================
  // LOAD PROFILE
  // ==========================================================

  const loadProfile =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setErrorMessage(
            ''
          );

          const token =
            await getAccessToken();

          if (!token) {
            router.replace(
              '/'
            );

            return;
          }

          // --------------------------------------------------
          // CHECK EXISTING APPLICATION
          // --------------------------------------------------

          const donorData =
            await getMyDonorApplication(
              token
            );

          const existingApplication =
            donorData?.application;

          if (
            existingApplication?.status ===
            'pending'
          ) {
            router.replace({
              pathname:
                '/donor-application/success',

              params: {
                status:
                  'pending',
              },
            });

            return;
          }

          if (
            existingApplication?.status ===
            'approved'
          ) {
            router.replace({
              pathname:
                '/donor-application/success',

              params: {
                status:
                  'approved',
              },
            });

            return;
          }

          // --------------------------------------------------
          // PROFILE
          // --------------------------------------------------

          const profileData =
            await getCurrentUser(
              token
            );

          const user =
            profileData?.user;

          if (!user) {
            throw new Error(
              'Unable to load your profile.'
            );
          }

          if (
            user.blood_type
          ) {
            setBloodType(
              user.blood_type
            );
          }

          if (
            !user.date_of_birth
          ) {
            setErrorMessage(
              'Complete your date of birth in your profile before applying as a donor.'
            );

            setAge(
              null
            );

            return;
          }

          const calculatedAge =
            calculateAge(
              user.date_of_birth
            );

          setAge(
            calculatedAge
          );

          if (
            calculatedAge ===
            null
          ) {
            setErrorMessage(
              'Your date of birth could not be verified.'
            );

            return;
          }

          if (
            calculatedAge < 18
          ) {
            setErrorMessage(
              'You must be at least 18 years old to apply as a donor.'
            );
          }
        } catch (
          error
        ) {
          console.log(
            'DONOR BLOOD SCREEN ERROR:',
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load donor registration.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(
      () => {
        loadProfile();
      },
      [loadProfile]
    )
  );

  // ==========================================================
  // CONTINUE
  // ==========================================================

  function handleContinue() {
    if (
      !bloodType
    ) {
      setErrorMessage(
        'Select your blood type to continue.'
      );

      return;
    }

    if (
      age === null ||
      age < 18
    ) {
      return;
    }

    router.push({
      pathname:
        '/donor-application/history',

      params: {
        blood_type:
          bloodType,
      },
    });
  }

  // ==========================================================
  // UI
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
                  styles.backButton
                }
                onPress={() =>
                  router.back()
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={23}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>

              <View>
                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Apply as a Donor
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Step 1 of 4
                </Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[
              COLORS.pageTop,
              COLORS.pageBottom,
            ]}
            style={
              styles.body
            }
          >
            <View
              style={
                styles.card
              }
            >
              <ScrollView
                contentContainerStyle={
                  styles.content
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.progress
                  }
                >
                  <View
                    style={[
                      styles.progressBar,
                      styles.progressActive,
                    ]}
                  />

                  <View
                    style={
                      styles.progressBar
                    }
                  />

                  <View
                    style={
                      styles.progressBar
                    }
                  />

                  <View
                    style={
                      styles.progressBar
                    }
                  />
                </View>

                {loading ? (
                  <View
                    style={
                      styles.loadingArea
                    }
                  >
                    <ActivityIndicator
                      color={
                        COLORS.redButton
                      }
                    />

                    <Text
                      style={
                        styles.loadingText
                      }
                    >
                      Preparing donor registration...
                    </Text>
                  </View>
                ) : (
                  <>
                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Blood Information
                    </Text>

                    <Text
                      style={
                        styles.sectionDescription
                      }
                    >
                      This helps Hemo-Hero identify blood requests that may be compatible with you.
                    </Text>

                    {/* AGE */}

                    <View
                      style={
                        age !== null &&
                        age >= 18
                          ? styles.ageSuccess
                          : styles.ageWarning
                      }
                    >
                      <MaterialIcons
                        name={
                          age !== null &&
                          age >= 18
                            ? 'verified'
                            : 'info-outline'
                        }
                        size={20}
                        color={
                          age !== null &&
                          age >= 18
                            ? COLORS.green
                            : COLORS.redButton
                        }
                      />

                      <View
                        style={
                          styles.ageContent
                        }
                      >
                        <Text
                          style={
                            styles.ageTitle
                          }
                        >
                          Age Requirement
                        </Text>

                        <Text
                          style={
                            styles.ageText
                          }
                        >
                          {age !== null &&
                          age >= 18
                            ? `You meet the minimum age requirement. Age: ${age}`
                            : 'You must be at least 18 years old to register as a donor.'}
                        </Text>
                      </View>
                    </View>

                    {/* BLOOD TYPE */}

                    <Text
                      style={
                        styles.label
                      }
                    >
                      Your Blood Type
                    </Text>

                    <View
                      style={
                        styles.bloodGrid
                      }
                    >
                      {BLOOD_TYPES.map(
                        type => {
                          const selected =
                            bloodType ===
                            type;

                          return (
                            <TouchableOpacity
                              key={
                                type
                              }
                              style={[
                                styles.bloodButton,

                                selected &&
                                  styles.bloodButtonSelected,
                              ]}
                              activeOpacity={
                                0.8
                              }
                              onPress={() => {
                                setBloodType(
                                  type
                                );

                                setErrorMessage(
                                  ''
                                );
                              }}
                            >
                              <Text
                                style={[
                                  styles.bloodText,

                                  selected &&
                                    styles.bloodTextSelected,
                                ]}
                              >
                                {type}
                              </Text>
                            </TouchableOpacity>
                          );
                        }
                      )}
                    </View>

                    <View
                      style={
                        styles.infoBox
                      }
                    >
                      <MaterialIcons
                        name="info-outline"
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
                        Your blood type will still be verified by qualified medical personnel before an actual donation.
                      </Text>
                    </View>

                    {errorMessage ? (
                      <View
                        style={
                          styles.errorBox
                        }
                      >
                        <MaterialIcons
                          name="error-outline"
                          size={18}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {
                            errorMessage
                          }
                        </Text>
                      </View>
                    ) : null}

                    <View
                      style={
                        styles.flexSpace
                      }
                    />

                    <TouchableOpacity
                      style={[
                        styles.primaryButton,

                        (
                          age === null ||
                          age < 18
                        ) &&
                          styles.disabledButton,
                      ]}
                      disabled={
                        age === null ||
                        age < 18
                      }
                      onPress={
                        handleContinue
                      }
                    >
                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        Continue
                      </Text>

                      <MaterialIcons
                        name="arrow-forward"
                        size={18}
                        color={
                          COLORS.white
                        }
                      />
                    </TouchableOpacity>
                  </>
                )}
              </ScrollView>
            </View>
          </LinearGradient>
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

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS === 'web'
          ? '#202020'
          : COLORS.pageBottom,
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

      overflow:
        'hidden',
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    header: {
      height: 150,

      paddingHorizontal:
        22,

      paddingTop: 18,

      overflow:
        'hidden',
    },

    headerDecoration: {
      position:
        'absolute',

      width: 190,
      height: 190,

      borderRadius: 95,

      right: -80,
      top: -100,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      marginRight: 13,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 19,
    },

    headerSubtitle: {
      marginTop: 1,

      color:
        'rgba(255,255,255,0.75)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,
    },

    body: {
      flex: 1,

      paddingHorizontal: 17,

      paddingBottom: 15,
    },

    card: {
      flex: 1,

      marginTop: -35,

      borderRadius: 27,

      overflow:
        'hidden',

      backgroundColor:
        '#FAFAFA',
    },

    content: {
      flexGrow: 1,

      paddingHorizontal: 20,

      paddingTop: 16,

      paddingBottom: 24,
    },

    progress: {
      flexDirection:
        'row',

      gap: 7,

      marginBottom: 22,
    },

    progressBar: {
      flex: 1,

      height: 4,

      borderRadius: 3,

      backgroundColor:
        '#D9D9D9',
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    loadingArea: {
      minHeight: 480,

      justifyContent:
        'center',

      alignItems:
        'center',
    },

    loadingText: {
      marginTop: 10,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 16,
    },

    sectionDescription: {
      marginTop: 4,

      marginBottom: 18,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 15,
    },

    ageSuccess: {
      minHeight: 66,

      padding: 12,

      marginBottom: 20,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 12,

      borderWidth: 1,

      borderColor:
        '#C8E4D1',

      backgroundColor:
        '#F1F9F4',
    },

    ageWarning: {
      minHeight: 66,

      padding: 12,

      marginBottom: 20,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius: 12,

      borderWidth: 1,

      borderColor:
        '#EDC4C4',

      backgroundColor:
        COLORS.pink,
    },

    ageContent: {
      flex: 1,

      marginLeft: 9,
    },

    ageTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    ageText: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.8,

      lineHeight: 13,
    },

    label: {
      marginBottom: 9,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,
    },

    bloodGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      justifyContent:
        'space-between',

      rowGap: 10,

      marginBottom: 18,
    },

    bloodButton: {
      width: '22.5%',

      height: 48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        '#CFCFCF',

      borderRadius: 13,

      backgroundColor:
        COLORS.white,
    },

    bloodButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    bloodText: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    bloodTextSelected: {
      color:
        COLORS.white,
    },

    infoBox: {
      minHeight: 78,

      padding: 13,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderWidth: 1,

      borderColor:
        '#ECC1C1',

      borderRadius: 12,

      backgroundColor:
        COLORS.pink,
    },

    infoText: {
      flex: 1,

      marginLeft: 9,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,
    },

    errorBox: {
      padding: 11,

      marginTop: 12,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      borderRadius: 10,

      backgroundColor:
        '#FFF0F0',
    },

    errorText: {
      flex: 1,

      marginLeft: 7,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,

      lineHeight: 13,
    },

    flexSpace: {
      flex: 1,

      minHeight: 40,
    },

    primaryButton: {
      height: 49,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 6,

      borderRadius: 10,

      backgroundColor:
        COLORS.redButton,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    disabledButton: {
      opacity: 0.45,
    },
  });