import { useState } from 'react';

import {
  Image,
  Modal,
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
import { pickImage } from '../../lib/imageUpload';

import {
  submitDonorApplication,
  uploadDonorVerificationId,
} from '../../lib/donorApplication';

import type {
  VerificationImageAsset,
} from '../../lib/donorApplication';

import {
  getAccessToken,
} from '../../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  border: '#D5D5D5',

  pink: '#FFF1F1',

  green: '#198754',
  greenLight: '#EAF7EF',

  orange: '#D97706',
  orangeLight: '#FFF5E8',
};

// ============================================================
// ACTION POPUP
// ============================================================

type ActionPopupVariant =
  | 'info'
  | 'success'
  | 'warning'
  | 'error';

type ActionPopupState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionPopupVariant;
};

// ============================================================
// SCREEN
// ============================================================

export default function DonorVerificationScreen() {
  const params =
    useLocalSearchParams<{
      blood_type?: string;

      has_donated_before?: string;

      last_donation_date?: string;

      last_donation_month?: string;

      last_donation_year?: string;

      last_donation_facility?: string;

      current_latitude?: string;

      current_longitude?: string;

      travel_radius_km?: string;

      availability_status?: string;

      allow_urgent_requests?: string;
    }>();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    verificationImage,
    setVerificationImage,
  ] =
    useState<
      VerificationImageAsset | null
    >(null);

  const [
    consent,
    setConsent,
  ] =
    useState(false);

  const [
    submitting,
    setSubmitting,
  ] =
    useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    actionPopup,
    setActionPopup,
  ] =
    useState<ActionPopupState>({
      visible: false,

      title: '',

      message: '',

      variant: 'info',
    });

  // ==========================================================
  // CUSTOM MESSAGE POPUP
  // ==========================================================

  function closeActionPopup() {
    setActionPopup(
      current => ({
        ...current,

        visible: false,
      })
    );
  }

  function getMessageVariant(
    title: string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes('unable') ||
      value.includes('error') ||
      value.includes('failed')
    ) {
      return 'error';
    }

    if (
      value.includes('permission') ||
      value.includes('required') ||
      value.includes('missing')
    ) {
      return 'warning';
    }

    if (
      value.includes('success') ||
      value.includes('submitted')
    ) {
      return 'success';
    }

    return 'info';
  }

  function showMessage(
    title: string,
    message: string
  ) {
    setActionPopup({
      visible: true,

      title,

      message,

      variant:
        getMessageVariant(
          title
        ),
    });
  }

  // ==========================================================
  // PICK VERIFICATION IMAGE
  // ==========================================================

  async function handlePickImage() {
    if (
      submitting
    ) {
      return;
    }

    try {
      // Saved as a JPEG up to 2000 px so the ID stays readable
      // and under the 5 MB upload limit.
      const result =
        await pickImage(
          'library',
          {
            maxSize:
              2000,
          }
        );

      if (
        result.status ===
        'denied'
      ) {
        showMessage(
          'Permission Required',
          'Allow photo access to upload your verification ID.'
        );

        return;
      }

      if (
        result.status !==
        'picked'
      ) {
        return;
      }

      setVerificationImage({
        uri:
          result.image.uri,

        fileName:
          result.image.fileName,

        mimeType:
          result.image.mimeType,

        file:
          result.image.webFile ||
          null,
      });

      setErrorMessage(
        ''
      );
    } catch (
      error
    ) {
      console.log(
        'PICK VERIFICATION IMAGE ERROR:',
        error
      );

      showMessage(
        'Unable to Select ID',

        error instanceof Error
          ? error.message
          : 'Unable to select your verification ID. Please try again.'
      );
    }
  }

  // ==========================================================
  // SUBMIT APPLICATION
  // ==========================================================

  async function handleSubmit() {
    if (
      submitting
    ) {
      return;
    }

    if (
      !verificationImage
    ) {
      setErrorMessage(
        'Upload a valid government-issued ID.'
      );

      return;
    }

    if (
      !consent
    ) {
      setErrorMessage(
        'Confirm the donor verification consent before submitting.'
      );

      return;
    }

    try {
      setSubmitting(
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

      // ========================================================
      // UPLOAD GOVERNMENT ID
      // ========================================================

      const uploadResult =
        await uploadDonorVerificationId(
          token,
          verificationImage
        );

      // ========================================================
      // SUBMIT DONOR APPLICATION
      // ========================================================

      const applicationResult =
        await submitDonorApplication(
          token,
          {
            blood_type:
              params.blood_type ||
              '',

            has_donated_before:
              params.has_donated_before ===
              'true',

            last_donation_date:
              params.last_donation_date ||
              null,

            last_donation_month:
              params.last_donation_month
                ? Number(
                    params.last_donation_month
                  )
                : null,

            last_donation_year:
              params.last_donation_year
                ? Number(
                    params.last_donation_year
                  )
                : null,

            last_donation_facility:
              params.last_donation_facility ||
              null,

            current_latitude:
              Number(
                params.current_latitude
              ),

            current_longitude:
              Number(
                params.current_longitude
              ),

            travel_radius_km:
              Number(
                params.travel_radius_km
              ) as
                | 5
                | 10
                | 20
                | 30
                | 50,

            availability_status:
              params.availability_status ===
              'unavailable'
                ? 'unavailable'
                : 'available',

            allow_urgent_requests:
              params.allow_urgent_requests ===
              'true',

            verification_id_path:
              uploadResult.path,

            consent_confirmed:
              true,
          }
        );

      // ========================================================
      // SUCCESS
      // ========================================================

      router.replace({
        pathname:
          '/donor-application/success',

        params: {
          status:
            applicationResult
              .application
              .status,
        },
      } as any);
    } catch (
      error
    ) {
      console.log(
        'SUBMIT DONOR APPLICATION ERROR:',
        error
      );

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to submit donor application.';

      setErrorMessage(
        message
      );

      showMessage(
        'Unable to Submit Application',
        message
      );
    } finally {
      setSubmitting(
        false
      );
    }
  }

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
            style={
              styles.header
            }
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
                disabled={
                  submitting
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
                  styles.headerCopy
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
                  Step 4 of 4
                </Text>
              </View>
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
              styles.body
            }
          >
            <View
              style={
                styles.card
              }
            >
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={
                  styles.scrollContent
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                {/* ==============================================
                    PROGRESS
                ============================================== */}

                <View
                  style={
                    styles.progressRow
                  }
                  accessibilityLabel="Step 4 of 4"
                >
                  {[
                    'Blood',
                    'History',
                    'Availability',
                    'Verify',
                  ].map(
                    (
                      step,
                      index
                    ) => (
                      <View
                        key={
                          step
                        }
                        style={
                          styles.progressStep
                        }
                      >
                        <View
                          style={[
                            styles.progressLine,

                            index <
                              4 &&
                              styles.progressActive,
                          ]}
                        />

                        <Text
                          style={[
                            styles.progressLabel,

                            index ===
                              3 &&
                              styles.progressLabelActive,
                          ]}
                        >
                          {
                            step
                          }
                        </Text>
                      </View>
                    )
                  )}
                </View>

                {/* ==============================================
                    TITLE
                ============================================== */}

                <Text
                  style={
                    styles.title
                  }
                >
                  Identity Verification
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  Upload a clear government-issued ID for verification.
                </Text>

                {/* ==============================================
                    ID UPLOAD
                ============================================== */}

                <TouchableOpacity
                  accessibilityRole="button"
                  style={
                    styles.uploadBox
                  }
                  activeOpacity={
                    0.8
                  }
                  disabled={
                    submitting
                  }
                  onPress={
                    handlePickImage
                  }
                >
                  {verificationImage ? (
                    <>
                      <Image
                        source={{
                          uri:
                            verificationImage.uri,
                        }}
                        style={
                          styles.previewImage
                        }
                        resizeMode="contain"
                      />

                      <View
                        style={
                          styles.uploadOverlay
                        }
                      >
                        <MaterialIcons
                          name="edit"
                          size={18}
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={
                            styles.changeText
                          }
                        >
                          Change Image
                        </Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View
                        style={
                          styles.uploadIcon
                        }
                      >
                        <MaterialIcons
                          name="file-upload"
                          size={27}
                          color={
                            COLORS.redButton
                          }
                        />
                      </View>

                      <Text
                        style={
                          styles.uploadTitle
                        }
                      >
                        Upload Verification ID
                      </Text>

                      <Text
                        style={
                          styles.uploadSubtitle
                        }
                      >
                        Government-issued ID
                        {'\n'}
                        JPG, PNG or WEBP · Up to 5 MB
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* ==============================================
                    CONSENT
                ============================================== */}

                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked:
                      consent,

                    disabled:
                      submitting,
                  }}
                  style={[
                    styles.consentCard,

                    consent &&
                      styles.consentCardSelected,
                  ]}
                  disabled={
                    submitting
                  }
                  onPress={() =>
                    setConsent(
                      current =>
                        !current
                    )
                  }
                >
                  <MaterialIcons
                    name={
                      consent
                        ? 'check-box'
                        : 'check-box-outline-blank'
                    }
                    size={23}
                    color={
                      consent
                        ? COLORS.redButton
                        : COLORS.muted
                    }
                  />

                  <Text
                    style={
                      styles.consentText
                    }
                  >
                    I confirm that the information I provided is accurate and I
                    agree to the donor verification process.
                  </Text>
                </TouchableOpacity>

                {/* ==============================================
                    ERROR
                ============================================== */}

                {errorMessage ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {
                      errorMessage
                    }
                  </Text>
                ) : null}

                <View
                  style={
                    styles.spacer
                  }
                />

                {/* ==============================================
                    BUTTONS
                ============================================== */}

                <View
                  style={
                    styles.buttonRow
                  }
                >
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={
                      styles.backBottom
                    }
                    disabled={
                      submitting
                    }
                    onPress={() =>
                      router.back()
                    }
                  >
                    <Text
                      style={
                        styles.backText
                      }
                    >
                      Back
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.submitButton,

                      submitting &&
                        styles.disabledButton,
                    ]}
                    disabled={
                      submitting
                    }
                    onPress={
                      handleSubmit
                    }
                  >
                    <Text
                      style={
                        styles.submitText
                      }
                    >
                      {submitting
                        ? 'Submitting...'
                        : 'Submit Application'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </View>

      {/* ========================================================
          HEMO-HERO ACTION POPUP
      ======================================================== */}

      <Modal
        visible={
          actionPopup.visible
        }
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={
          closeActionPopup
        }
      >
        <View
          style={
            styles.actionPopupOverlay
          }
        >
          <View
            style={
              styles.actionPopupCard
            }
          >
            <View
              style={[
                styles.actionPopupIcon,

                actionPopup.variant ===
                  'success' &&
                  styles.actionPopupIconSuccess,

                actionPopup.variant ===
                  'warning' &&
                  styles.actionPopupIconWarning,

                actionPopup.variant ===
                  'error' &&
                  styles.actionPopupIconError,
              ]}
            >
              <MaterialIcons
                name={
                  actionPopup.variant ===
                  'success'
                    ? 'check-circle-outline'
                    : actionPopup.variant ===
                        'warning'
                      ? 'warning-amber'
                      : actionPopup.variant ===
                          'error'
                        ? 'error-outline'
                        : 'info-outline'
                }
                size={
                  31
                }
                color={
                  actionPopup.variant ===
                  'success'
                    ? COLORS.green
                    : actionPopup.variant ===
                        'warning'
                      ? COLORS.orange
                      : COLORS.redButton
                }
              />
            </View>

            <Text
              style={
                styles.actionPopupTitle
              }
            >
              {
                actionPopup.title
              }
            </Text>

            <Text
              style={
                styles.actionPopupMessage
              }
            >
              {
                actionPopup.message
              }
            </Text>

            <TouchableOpacity
              style={
                styles.actionPopupButton
              }
              activeOpacity={
                0.85
              }
              onPress={
                closeActionPopup
              }
            >
              <Text
                style={
                  styles.actionPopupButtonText
                }
              >
                Okay
              </Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    desktopBackground: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS ===
        'web'
          ? '#242424'
          : COLORS.backgroundBottom,
    },

    phone: {
      width:
        Platform.OS ===
        'web'
          ? 440
          : '100%',

      height:
        '100%',

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.backgroundBottom,
    },

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.red,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height:
        Platform.OS ===
        'web'
          ? 118
          : 108,

      paddingHorizontal:
        25,

      paddingTop:
        Platform.OS ===
        'web'
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

    headerCopy: {
      flex:
        1,

      minWidth:
        0,
    },

    backButton: {
      width:
        43,

      height:
        43,

      marginRight:
        17,

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

      lineHeight:
        18,
    },

    // ========================================================
    // BODY
    // ========================================================

    body: {
      flex:
        1,

      paddingHorizontal:
        18,

      paddingBottom:
        16,
    },

    card: {
      flex:
        1,

      marginTop:
        -14,

      borderRadius:
        27,

      overflow:
        'hidden',

      backgroundColor:
        '#FAFAFA',

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.16,

      shadowRadius:
        7,

      elevation:
        6,
    },

    scrollContent: {
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

    progressStep: {
      flex:
        1,

      minWidth:
        0,
    },

    progressLine: {
      height:
        4,

      borderRadius:
        3,

      backgroundColor:
        '#E9E2E4',
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    progressLabel: {
      marginTop:
        6,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11.5,

      lineHeight:
        16,
    },

    progressLabelActive: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // TITLE
    // ========================================================

    title: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        17,

      lineHeight:
        24,
    },

    description: {
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
    // UPLOAD
    // ========================================================

    uploadBox: {
      marginBottom:
        15,

      overflow:
        'hidden',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1.5,

      borderStyle:
        'dashed',

      borderColor:
        '#D88787',

      borderRadius:
        12,

      backgroundColor:
        '#FFF7F7',

      minHeight:
        180,

      paddingVertical:
        20,

      paddingHorizontal:
        12,
    },

    uploadIcon: {
      width:
        46,

      height:
        46,

      marginBottom:
        9,

      borderRadius:
        27,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    uploadTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,

      lineHeight:
        18,
    },

    uploadSubtitle: {
      maxWidth:
        250,

      marginTop:
        5,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,

      textAlign:
        'center',
    },

    previewImage: {
      width:
        '100%',

      height:
        180,
    },

    uploadOverlay: {
      position:
        'absolute',

      bottom:
        10,

      paddingHorizontal:
        12,

      paddingVertical:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,

      borderRadius:
        10,

      backgroundColor:
        'rgba(0,0,0,0.65)',

      minHeight:
        44,
    },

    changeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    // ========================================================
    // CONSENT
    // ========================================================

    consentCard: {
      minHeight:
        72,

      padding:
        13,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        12,

      backgroundColor:
        COLORS.white,
    },

    consentCardSelected: {
      borderColor:
        '#DFAAAA',

      backgroundColor:
        '#FFF9F9',
    },

    consentText: {
      flex:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        17,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorText: {
      marginTop:
        12,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,

      lineHeight:
        17,

      textAlign:
        'center',
    },

    spacer: {
      flex:
        1,

      minHeight:
        24,
    },

    // ========================================================
    // BUTTONS
    // ========================================================

    buttonRow: {
      flexDirection:
        'row',

      gap:
        11,
    },

    backBottom: {
      flex:
        0.8,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        '#F3F0F1',

      minHeight:
        49,

      paddingVertical:
        13,

      paddingHorizontal:
        10,
    },

    backText: {
      color:
        '#444444',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,

      lineHeight:
        20,

      textAlign:
        'center',

      flexShrink:
        1,
    },

    submitButton: {
      flex:
        1.6,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        13,

      backgroundColor:
        COLORS.redButton,

      minHeight:
        49,

      paddingVertical:
        13,

      paddingHorizontal:
        10,
    },

    submitText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,

      lineHeight:
        20,

      textAlign:
        'center',

      flexShrink:
        1,
    },

    disabledButton: {
      opacity:
        0.55,
    },

    // ========================================================
    // HEMO-HERO ACTION POPUP
    // ========================================================

    actionPopupOverlay: {
      flex:
        1,

      paddingHorizontal:
        24,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    actionPopupCard: {
      width:
        '100%',

      maxWidth:
        360,

      paddingHorizontal:
        20,

      paddingTop:
        22,

      paddingBottom:
        18,

      borderRadius:
        22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          8,
      },

      shadowOpacity:
        0.2,

      shadowRadius:
        18,

      elevation:
        10,
    },

    actionPopupIcon: {
      width:
        56,

      height:
        56,

      alignSelf:
        'center',

      marginBottom:
        13,

      borderRadius:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pink,
    },

    actionPopupIconSuccess: {
      backgroundColor:
        COLORS.greenLight,
    },

    actionPopupIconWarning: {
      backgroundColor:
        COLORS.orangeLight,
    },

    actionPopupIconError: {
      backgroundColor:
        COLORS.pink,
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        16,

      lineHeight:
        22,

      textAlign:
        'center',
    },

    actionPopupMessage: {
      marginTop:
        8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,

      lineHeight:
        20,

      textAlign:
        'center',
    },

    actionPopupButton: {
      height:
        45,

      marginTop:
        19,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },
  });