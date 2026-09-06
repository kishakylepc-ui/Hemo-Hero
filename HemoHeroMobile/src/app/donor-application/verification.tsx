import {
  useState,
} from 'react';

import {
  Alert,
  Image,
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

import * as ImagePicker from 'expo-image-picker';

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

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  white: '#FFFFFF',
  black: '#171717',

  backgroundTop: '#F1B2B4',
  backgroundBottom: '#D90B12',

  muted: '#666666',
  lightMuted: '#999999',

  border: '#DED6D6',

  pink: '#FFF1F1',

  green: '#198754',
};

export default function DonorVerificationScreen() {
  const params =
    useLocalSearchParams<{
      blood_type?: string;

      has_donated_before?: string;

      last_donation_date?: string;

      last_donation_facility?: string;

      current_latitude?: string;

      current_longitude?: string;

      travel_radius_km?: string;

      availability_status?: string;

      allow_urgent_requests?: string;
    }>();

  const [
    verificationImage,
    setVerificationImage,
  ] =
    useState<VerificationImageAsset | null>(
      null
    );

  const [
    consent,
    setConsent,
  ] = useState(false);

  const [
    submitting,
    setSubmitting,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  // ==========================================================
  // PICK ID
  // ==========================================================

  async function handlePickImage() {
    if (submitting) {
      return;
    }

    const permission =
      await ImagePicker
        .requestMediaLibraryPermissionsAsync();

    if (
      permission.status !==
      'granted'
    ) {
      showMessage(
        'Permission Required',
        'Allow photo access to upload your verification ID.'
      );

      return;
    }

    const result =
      await ImagePicker
        .launchImageLibraryAsync({
          mediaTypes:
            ImagePicker
              .MediaTypeOptions
              .Images,

          allowsEditing:
            false,

          quality:
            0.85,
        });

    if (
      result.canceled ||
      !result.assets?.[0]
    ) {
      return;
    }

    const asset =
      result.assets[0];

    setVerificationImage({
      uri:
        asset.uri,

      fileName:
        asset.fileName,

      mimeType:
        asset.mimeType,

      file:
        (asset as any)
          .file ||
        null,
    });

    setErrorMessage(
      ''
    );
  }

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === 'web' &&
      typeof window !==
        'undefined'
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

  // ==========================================================
  // SUBMIT
  // ==========================================================

  async function handleSubmit() {
    if (submitting) {
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

    if (!consent) {
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

      // ------------------------------------------------------
      // 1. UPLOAD PRIVATE ID
      // ------------------------------------------------------

      const uploadResult =
        await uploadDonorVerificationId(
          token,
          verificationImage
        );

      // ------------------------------------------------------
      // 2. SUBMIT APPLICATION
      // ------------------------------------------------------

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
            <TouchableOpacity
              style={
                styles.backButton
              }
              disabled={
                submitting
              }
              onPress={() =>
                router.back()
              }
            >
              <MaterialIcons
                name="arrow-back"
                size={22}
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
                Step 4 of 4
              </Text>
            </View>
          </LinearGradient>

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
                contentContainerStyle={
                  styles.scrollContent
                }
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.progressRow
                  }
                >
                  {[1, 2, 3, 4].map(
                    item => (
                      <View
                        key={item}
                        style={[
                          styles.progressLine,
                          styles.progressActive,
                        ]}
                      />
                    )
                  )}
                </View>

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
                  Verify your identity to help keep Hemo-Hero safe for patients
                  and donors.
                </Text>

                {/* UPLOAD */}

                <TouchableOpacity
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
                        resizeMode="cover"
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
                        Government-issued ID • JPG, PNG or WEBP • Max 5 MB
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                {/* PRIVACY */}

                <View
                  style={
                    styles.privacyCard
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
                      styles.privacyContent
                    }
                  >
                    <Text
                      style={
                        styles.privacyTitle
                      }
                    >
                      Private & Secure
                    </Text>

                    <Text
                      style={
                        styles.privacyText
                      }
                    >
                      Your verification document is stored privately and is only
                      intended for authorized donor verification.
                    </Text>
                  </View>
                </View>

                {/* CONSENT */}

                <TouchableOpacity
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

                {errorMessage ? (
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {errorMessage}
                  </Text>
                ) : null}

                <View
                  style={
                    styles.spacer
                  }
                />

                <View
                  style={
                    styles.buttonRow
                  }
                >
                  <TouchableOpacity
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
          : COLORS.backgroundBottom,
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
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    header: {
      height: 126,

      paddingHorizontal: 22,
      paddingTop: 18,

      flexDirection: 'row',

      alignItems: 'flex-start',
    },

    backButton: {
      width: 40,
      height: 40,

      marginRight: 13,

      borderRadius: 20,

      borderWidth: 2,

      borderColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent: 'center',
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

      paddingHorizontal: 18,
      paddingBottom: 16,
    },

    card: {
      flex: 1,

      marginTop: -18,

      overflow: 'hidden',

      borderRadius: 27,

      backgroundColor:
        '#FAFAFA',
    },

    scrollContent: {
      flexGrow: 1,

      padding: 20,
    },

    progressRow: {
      flexDirection: 'row',
      gap: 7,

      marginBottom: 23,
    },

    progressLine: {
      flex: 1,

      height: 4,

      borderRadius: 2,

      backgroundColor:
        '#D8D8D8',
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    title: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
    },

    description: {
      marginTop: 3,
      marginBottom: 21,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 15,
    },

    uploadBox: {
      height: 190,

      marginBottom: 15,

      overflow: 'hidden',

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1.5,

      borderStyle: 'dashed',

      borderColor:
        '#D88787',

      borderRadius: 16,

      backgroundColor:
        '#FFF7F7',
    },

    uploadIcon: {
      width: 53,
      height: 53,

      marginBottom: 9,

      borderRadius: 27,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },

    uploadTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11,
    },

    uploadSubtitle: {
      maxWidth: 250,

      marginTop: 5,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,

      textAlign: 'center',
    },

    previewImage: {
      width: '100%',
      height: '100%',
    },

    uploadOverlay: {
      position: 'absolute',

      bottom: 10,

      paddingHorizontal: 12,
      paddingVertical: 7,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      borderRadius: 10,

      backgroundColor:
        'rgba(0,0,0,0.65)',
    },

    changeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    privacyCard: {
      minHeight: 76,

      marginBottom: 13,

      padding: 13,

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 9,

      borderRadius: 12,

      borderWidth: 1,

      borderColor:
        '#ECC0C0',

      backgroundColor:
        COLORS.pink,
    },

    privacyContent: {
      flex: 1,
    },

    privacyTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    privacyText: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.7,

      lineHeight: 13,
    },

    consentCard: {
      minHeight: 80,

      padding: 13,

      flexDirection: 'row',

      alignItems: 'flex-start',

      gap: 9,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 12,

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
      flex: 1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 14,
    },

    errorText: {
      marginTop: 12,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,

      textAlign: 'center',
    },

    spacer: {
      flex: 1,
      minHeight: 25,
    },

    buttonRow: {
      flexDirection: 'row',

      gap: 11,
    },

    backBottom: {
      flex: 0.75,

      height: 49,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 10,

      backgroundColor:
        '#E1E1E1',
    },

    backText: {
      color:
        '#444444',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    submitButton: {
      flex: 1.35,

      height: 49,

      alignItems: 'center',
      justifyContent: 'center',

      borderRadius: 10,

      backgroundColor:
        COLORS.redButton,
    },

    submitText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 9.5,
    },

    disabledButton: {
      opacity: 0.55,
    },
  });