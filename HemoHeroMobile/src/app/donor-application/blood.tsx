import { useCallback, useState } from 'react';

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
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../../lib/fullScreen';

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
  black: '#171717',

  pageTop: '#F3B5B7',
  pageBottom: '#D90B12',

  card: '#FAFAFA',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  border: '#D5D5D5',

  pinkLight: '#FFF1F1',
  pinkBorder: '#E7A6A6',

  green: '#159447',
  greenLight: '#EDF8F1',
  greenBorder: '#B9DFC8',
};


// ============================================================
// APPLICATION STEPS
// ============================================================

const STEPS = [
  'Blood',
  'History',
  'Availability',
  'Verify',
];


// ============================================================
// SCREEN
// ============================================================

export default function DonorBloodInformationScreen() {
  // Full screen: the red header reaches the top edge, with
  // its content kept below the clock.
  const insets = useSafeAreaInsets();

  // The application uses the blood type proven on the profile.
  const [
    bloodType,
    setBloodType,
  ] = useState('');

  const [
    proofOnFile,
    setProofOnFile,
  ] = useState(false);

  const [
    age,
    setAge,
  ] = useState<number | null>(null);

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

          setBloodType(
            user.blood_type ||
            ''
          );

          setProofOnFile(
            Boolean(
              user.blood_type_proof
            )
          );

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
            calculatedAge <
            18
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
            error instanceof
              Error
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


  // ==========================================================
  // FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadProfile();
      },
      [
        loadProfile,
      ]
    )
  );


  // ==========================================================
  // CONTINUE
  // ==========================================================

  function handleContinue() {
    if (
      !bloodType ||
      !proofOnFile
    ) {
      setErrorMessage(
        'Add your blood type with a photo of your proof in your profile first.'
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
          // The header is drawn behind the status bar.
          edges={[
            'left',
            'right',
          ]}
        >
          <StatusBar
            style="light"
          />


          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              '#D2151A',
              COLORS.redDark,
            ]}
            style={withStatusBar(
              styles.header,
              insets.top
            )}
          >
            <View
              style={shiftedDown(
                styles.headerCircleLeft,
                insets.top
              )}
            />

            <View
              style={shiftedDown(
                styles.headerCircleRight,
                insets.top
              )}
            />

            <View
              style={
                styles.headerRow
              }
            >
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to dashboard"
                style={
                  styles.backButton
                }
                activeOpacity={
                  0.75
                }
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={26}
                  color={
                    COLORS.white
                  }
                />
              </TouchableOpacity>

              <View
                style={
                  styles.headerText
                }
              >
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


          {/* ==================================================
              BODY
          ================================================== */}

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
                styles.formCard
              }
            >
              <ScrollView
                style={
                  styles.formScroll
                }
                contentContainerStyle={
                  styles.formScrollContent
                }
                showsVerticalScrollIndicator={
                  false
                }
                keyboardShouldPersistTaps="handled"
                bounces={
                  false
                }
              >


                {/* ==================================================
                    PROGRESS
                ================================================== */}

                <View
                  style={
                    styles.progressRow
                  }
                >
                  {STEPS.map(
                    (
                      step,
                      index
                    ) => {
                      const active =
                        index === 0;

                      return (
                        <View
                          key={
                            step
                          }
                          style={
                            styles.progressItem
                          }
                        >
                          <View
                            style={[
                              styles.progressBar,

                              active &&
                                styles.progressBarActive,
                            ]}
                          />

                          <Text
                            numberOfLines={
                              1
                            }
                            style={[
                              styles.progressText,

                              active &&
                                styles.progressTextActive,
                            ]}
                          >
                            {step}
                          </Text>
                        </View>
                      );
                    }
                  )}
                </View>


                {/* ==================================================
                    LOADING
                ================================================== */}

                {loading ? (
                  <View
                    style={
                      styles.loadingContainer
                    }
                  >
                    <ActivityIndicator
                      size="small"
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


                    {/* ==================================================
                        TITLE
                    ================================================== */}

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
                      Your blood type comes from your profile, with proof.
                    </Text>


                    {/* ==================================================
                        AGE VERIFICATION
                    ================================================== */}

                    <View
                      style={[
                        styles.verificationCard,

                        age !== null &&
                        age >= 18
                          ? styles.verificationSuccess
                          : styles.verificationWarning,
                      ]}
                    >
                      <View
                        style={[
                          styles.verificationIcon,

                          age !== null &&
                          age >= 18
                            ? styles.verificationIconSuccess
                            : styles.verificationIconWarning,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            age !== null &&
                            age >= 18
                              ? 'check'
                              : 'info-outline'
                          }
                          size={19}
                          color={
                            age !== null &&
                            age >= 18
                              ? COLORS.green
                              : COLORS.redButton
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.verificationContent
                        }
                      >
                        <Text
                          style={
                            styles.verificationTitle
                          }
                        >
                          Age Verification
                        </Text>

                        <Text
                          style={
                            styles.verificationDescription
                          }
                        >
                          {age !== null &&
                          age >= 18
                            ? `Age ${age} · Minimum age requirement met`
                            : 'You must be at least 18 years old to register as a donor.'}
                        </Text>
                      </View>
                    </View>


                    {/* ==================================================
                        BLOOD TYPE
                    ================================================== */}

                    <Text
                      style={
                        styles.label
                      }
                    >
                      Your Blood Type

                      <Text
                        style={
                          styles.required
                        }
                      >
                        {' '}*
                      </Text>
                    </Text>

                    {bloodType &&
                    proofOnFile ? (
                      <View
                        style={
                          styles.provenBlood
                        }
                      >
                        <View
                          style={
                            styles.provenBadge
                          }
                        >
                          <Text
                            style={
                              styles.provenBadgeText
                            }
                          >
                            {bloodType}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.provenContent
                          }
                        >
                          <Text
                            style={
                              styles.provenTitle
                            }
                          >
                            From your profile
                          </Text>

                          <View
                            style={
                              styles.provenProofRow
                            }
                          >
                            <MaterialIcons
                              name="verified"
                              size={14}
                              color={
                                COLORS.green
                              }
                            />

                            <Text
                              style={
                                styles.provenProofText
                              }
                            >
                              Proof on file · an admin checks it with your application
                            </Text>
                          </View>
                        </View>
                      </View>
                    ) : (
                      <View
                        style={
                          styles.proofNeeded
                        }
                      >
                        <Text
                          style={
                            styles.proofNeededTitle
                          }
                        >
                          {bloodType
                            ? 'Add proof of your blood type'
                            : 'Add your blood type first'}
                        </Text>

                        <Text
                          style={
                            styles.proofNeededText
                          }
                        >
                          Donors need a photo of a blood donor card, blood
                          typing result or lab result. Add it with your blood
                          type in your profile. Not tested yet? Get typed at
                          your local Red Cross chapter, hospital or health
                          center.
                        </Text>

                        <TouchableOpacity
                          accessibilityRole="button"
                          activeOpacity={
                            0.85
                          }
                          style={
                            styles.proofNeededButton
                          }
                          onPress={() =>
                            router.push(
                              '/profile/edit'
                            )
                          }
                        >
                          <MaterialIcons
                            name="edit"
                            size={16}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.proofNeededButtonText
                            }
                          >
                            Add in Profile
                          </Text>
                        </TouchableOpacity>
                      </View>
                    )}


                    {/* ==================================================
                        ERROR
                    ================================================== */}

                    {errorMessage ? (
                      <View
                        style={
                          styles.errorBox
                        }
                      >
                        <MaterialIcons
                          name="error-outline"
                          size={17}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {errorMessage}
                        </Text>
                      </View>
                    ) : null}


                    {/* ==================================================
                        CONTINUE
                    ================================================== */}

                    <TouchableOpacity
                      accessibilityRole="button"
                      style={[
                        styles.continueButton,

                        (
                          age === null ||
                          age < 18
                        ) &&
                          styles.continueDisabled,
                      ]}
                      disabled={
                        age === null ||
                        age < 18
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={
                        handleContinue
                      }
                    >
                      <Text
                        style={
                          styles.continueText
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
          ? '#242424'
          : COLORS.pageBottom,
    },


    phone: {
      width:
        Platform.OS === 'web'
          ? 440
          : '100%',

      height:
        '100%',

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.pageBottom,
    },


    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },


    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height:
        Platform.OS === 'web'
          ? 118
          : 108,

      paddingHorizontal:
        25,

      paddingTop:
        Platform.OS === 'web'
          ? 18
          : 6,

      overflow:
        'hidden',
    },


    headerCircleLeft: {
      position:
        'absolute',

      width:
        160,

      height:
        160,

      borderRadius:
        80,

      left:
        -98,

      top:
        -73,

      backgroundColor:
        'rgba(255,255,255,0.06)',
    },


    headerCircleRight: {
      position:
        'absolute',

      width:
        170,

      height:
        170,

      borderRadius:
        85,

      right:
        -73,

      top:
        -78,

      backgroundColor:
        'rgba(255,255,255,0.08)',
    },


    headerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginTop:
        1,
    },


    backButton: {
      width:
        43,

      height:
        43,

      borderRadius:
        22,

      borderWidth:
        3,

      borderColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        17,
    },


    headerText: {
      flex:
        1,
    },


    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        20,

      lineHeight:
        27,
    },


    headerSubtitle: {
      marginTop:
        1,

      color:
        'rgba(255,255,255,0.82)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },


    // ========================================================
    // BODY
    // ========================================================

    body: {
      flex: 1,

      paddingHorizontal:
        18,

      paddingBottom:
        16,
    },


    formCard: {
      flex: 1,

      marginTop:
        -14,

      borderRadius:
        27,

      backgroundColor:
        COLORS.card,

      overflow:
        'hidden',

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 3,
      },

      shadowOpacity:
        0.16,

      shadowRadius:
        7,

      elevation:
        6,
    },


    formScroll: {
      flex: 1,
    },


    formScrollContent: {
      flexGrow:
        1,

      paddingHorizontal:
        21,

      paddingTop:
        22,

      paddingBottom:
        30,
    },


    // ========================================================
    // PROGRESS
    // ========================================================

    progressRow: {
      flexDirection:
        'row',

      gap:
        7,

      marginBottom:
        24,
    },


    progressItem: {
      flex:
        1,

      minWidth:
        0,
    },


    progressBar: {
      height:
        4,

      borderRadius:
        4,

      backgroundColor:
        '#E1E1E1',
    },


    progressBarActive: {
      backgroundColor:
        COLORS.redButton,
    },


    progressText: {
      marginTop:
        5,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11.5,

      textAlign:
        'left',
    },


    progressTextActive: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },


    // ========================================================
    // LOADING
    // ========================================================

    loadingContainer: {
      flex:
        1,

      minHeight:
        420,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    loadingText: {
      marginTop:
        10,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },


    // ========================================================
    // TITLE
    // ========================================================

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,

      lineHeight:
        24,
    },


    sectionDescription: {
      marginTop:
        3,

      marginBottom:
        18,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },


    // ========================================================
    // AGE VERIFICATION
    // ========================================================

    verificationCard: {
      minHeight:
        70,

      paddingHorizontal:
        13,

      paddingVertical:
        11,

      marginBottom:
        21,

      borderWidth:
        1,

      borderRadius:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',
    },


    verificationSuccess: {
      borderColor:
        COLORS.greenBorder,

      backgroundColor:
        COLORS.greenLight,
    },


    verificationWarning: {
      borderColor:
        COLORS.pinkBorder,

      backgroundColor:
        COLORS.pinkLight,
    },


    verificationIcon: {
      width:
        36,

      height:
        36,

      marginRight:
        10,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',
    },


    verificationIconSuccess: {
      backgroundColor:
        COLORS.white,
    },


    verificationIconWarning: {
      backgroundColor:
        COLORS.white,
    },


    verificationContent: {
      flex:
        1,
    },


    verificationTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },


    verificationDescription: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },


    // ========================================================
    // LABEL
    // ========================================================

    label: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,

      marginBottom:
        8,
    },


    required: {
      color:
        COLORS.red,
    },


    // ========================================================
    // BLOOD TYPES
    // ========================================================

    provenBlood: {
      marginBottom:
        22,

      padding:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,

      borderWidth:
        1,

      borderColor:
        COLORS.greenBorder,

      borderRadius:
        14,

      backgroundColor:
        COLORS.greenLight,
    },


    provenBadge: {
      width:
        52,

      height:
        52,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },


    provenBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        17,
    },


    provenContent: {
      flex:
        1,
    },


    provenTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },


    provenProofRow: {
      marginTop:
        3,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },


    provenProofText: {
      flex:
        1,

      color:
        COLORS.green,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11.5,
    },


    proofNeeded: {
      marginBottom:
        22,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.pinkBorder,

      borderRadius:
        14,

      backgroundColor:
        COLORS.pinkLight,
    },


    proofNeededTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },


    proofNeededText: {
      marginTop:
        5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },


    proofNeededButton: {
      marginTop:
        12,

      height:
        42,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      borderRadius:
        11,

      backgroundColor:
        COLORS.redButton,
    },


    proofNeededButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },


    // ========================================================
    // ERROR
    // ========================================================

    errorBox: {
      paddingHorizontal:
        10,

      paddingVertical:
        9,

      marginBottom:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderRadius:
        8,

      backgroundColor:
        COLORS.pinkLight,
    },


    errorText: {
      flex:
        1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },


    // ========================================================
    // CONTINUE
    // ========================================================

    continueButton: {
      height:
        49,

      marginTop:
        2,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        6,

      borderRadius:
        9,

      backgroundColor:
        COLORS.redButton,
    },


    continueDisabled: {
      opacity:
        0.45,
    },


    continueText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },
  });