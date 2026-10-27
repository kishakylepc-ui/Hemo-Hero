import { useState } from 'react';

import {
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { Ionicons } from '@expo/vector-icons';
import { ICON_TILE } from '../../constants/theme';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import BloodTypeProofField from '../../components/BloodTypeProofField';

import {
  saveBloodTypeWithProof,
  updateProfile,
  uploadProfilePhoto,
} from '../../lib/api';

import type { PickedImage } from '../../lib/imageUpload';

import {
  getAccessToken,
} from '../../lib/session';
import SetupHeader from '../../components/SetupHeader';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#171717',

  muted: '#646464',

  progressInactive: '#D6D6D6',

  infoBackground: '#FFF1F1',
  infoBorder: '#E9A8A8',

  // Form (same as Sign Up's fields)
  label: '#444449',
  border: '#E4D7D7',
  hint: '#666666',
  green: '#15803D',
  greenLight: '#EAF7EF',
  tip: '#FFF3E6',
  tipText: '#6B3A0C',
  tipIcon: '#B4570F',
};

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
  onConfirm?: () => void;
};

export default function MedicalInformationScreen() {
  // The page runs to the bottom edge; its content ends above
  // the home bar.
  const insets = useSafeAreaInsets();

  const params =
    useLocalSearchParams<{
      first_name?: string;
      last_name?: string;
      middle_name?: string;

      phone?: string;

      date_of_birth?: string;
      gender?: string;

      profile_photo_uri?: string;

      barangay?: string;
      city?: string;
      province?: string;

      latitude?: string;
      longitude?: string;
    }>();

  const [
    bloodType,
    setBloodType,
  ] = useState('');

  // Photo proving the blood type (required to save one).
  const [
    bloodTypeProof,
    setBloodTypeProof,
  ] = useState<PickedImage | null>(null);

  const [
    loading,
    setLoading,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    actionPopup,
    setActionPopup,
  ] = useState<ActionPopupState>({
    visible: false,
    title: '',
    message: '',
    variant: 'info',
    onConfirm: undefined,
  });

  // ==========================================================
  // MESSAGE HELPER
  // ==========================================================

  function closeActionPopup() {
    const action =
      actionPopup.onConfirm;

    setActionPopup(
      current => ({
        ...current,
        visible: false,
        onConfirm: undefined,
      })
    );

    if (action) {
      action();
    }
  }

  function getMessageVariant(
    title: string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes('unable') ||
      value.includes('error') ||
      value.includes('expired')
    ) {
      return 'error';
    }

    if (
      value.includes('complete') ||
      value.includes('saved') ||
      value.includes('success')
    ) {
      return 'success';
    }

    if (
      value.includes('required') ||
      value.includes('missing')
    ) {
      return 'warning';
    }

    return 'info';
  }

  // Steps open with push. With no screen to go back to (a web
  // reload), go to step 2 with what step 1 sent.
  function goBack() {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace({
      pathname:
        '/complete-profile/location',

      params: {
        ...params,
      },
    });
  }

  function showMessage(
    title: string,
    message: string,
    onConfirm?: () => void
  ) {
    setActionPopup({
      visible: true,
      title,
      message,
      variant:
        getMessageVariant(
          title
        ),
      onConfirm,
    });
  }

  // ==========================================================
  // SELECT BLOOD TYPE
  // ==========================================================

  function handleBloodTypeSelect(
    type: string
  ) {
    if (loading) {
      return;
    }

    setBloodType(
      current =>
        current === type
          ? ''
          : type
    );

    if (errorMessage) {
      setErrorMessage('');
    }
  }

  // ==========================================================
  // COMPLETE PROFILE
  // ==========================================================

  async function handleCompleteProfile() {
    if (loading) {
      return;
    }

    setErrorMessage('');

    if (
      bloodType &&
      !bloodTypeProof
    ) {
      setErrorMessage(
        'Add a photo of your blood type proof, or clear the blood type and add it later.'
      );

      return;
    }

    try {
      setLoading(true);

      const accessToken =
        await getAccessToken();

      if (!accessToken) {
        showMessage(
          'Session Expired',
          'Please sign in again before completing your profile.',
          () => {
            router.replace('/');
          }
        );

        return;
      }

      // Blood type first, together with its proof, so it's never
      // saved without one.
      if (
        bloodType &&
        bloodTypeProof
      ) {
        await saveBloodTypeWithProof(
          accessToken,
          bloodType,
          bloodTypeProof
        );
      }

      const latitude =
        params.latitude
          ? Number(
              params.latitude
            )
          : null;

      const longitude =
        params.longitude
          ? Number(
              params.longitude
            )
          : null;

      const hasValidCoordinates =
        latitude !== null &&
        longitude !== null &&
        Number.isFinite(
          latitude
        ) &&
        Number.isFinite(
          longitude
        );

      const profileData = {
        first_name:
          params.first_name ||
          '',

        middle_name:
          params.middle_name
            ? params.middle_name
            : null,

        phone:
          params.phone
            ? params.phone
            : null,

        last_name:
          params.last_name ||
          '',

        date_of_birth:
          params.date_of_birth ||
          '',

        gender:
          params.gender ||
          '',

        barangay:
          params.barangay ||
          '',

        city:
          params.city ||
          '',

        province:
          params.province ||
          '',

        latitude:
          hasValidCoordinates
            ? latitude
            : null,

        longitude:
          hasValidCoordinates
            ? longitude
            : null,

        complete_onboarding:
          true,
      };

      const result =
        await updateProfile(
          accessToken,
          profileData
        );

      if (
        !result?.user
      ) {
        throw new Error(
          'Profile was not returned after saving.'
        );
      }

      if (
        result.user
          .onboarding_complete !==
        true
      ) {
        throw new Error(
          'Profile information was saved, but onboarding was not completed.'
        );
      }

      // Photo chosen on the first step. The profile is already
      // saved, so a failed upload doesn't block finishing; the
      // photo can be added later from Profile.
      if (
        params.profile_photo_uri
      ) {
        try {
          await uploadProfilePhoto(
            accessToken,
            {
              uri:
                params.profile_photo_uri,

              fileName:
                `profile-${Date.now()}.jpg`,

              mimeType:
                'image/jpeg',
            }
          );
        } catch (photoError) {
          console.log(
            'ONBOARDING PHOTO UPLOAD ERROR:',
            photoError
          );
        }
      }

      router.replace({
        pathname:
          '/complete-profile/success',

        params: {
          first_name:
            result.user
              .first_name || '',

          last_name:
            result.user
              .last_name || '',

          middle_name:
            result.user
              .middle_name || '',

          date_of_birth:
            result.user
              .date_of_birth || '',

          gender:
            result.user
              .gender || '',

          profile_photo_uri:
            params.profile_photo_uri ||
            '',

          barangay:
            result.user
              .barangay || '',

          city:
            result.user
              .city || '',

          province:
            result.user
              .province || '',

          latitude:
            result.user
              .latitude !==
              null &&
            result.user
              .latitude !==
              undefined
              ? String(
                  result.user
                    .latitude
                )
              : '',

          longitude:
            result.user
              .longitude !==
              null &&
            result.user
              .longitude !==
              undefined
              ? String(
                  result.user
                    .longitude
                )
              : '',

          blood_type:
            result.user
              .blood_type || '',
        },
      });
    } catch (error) {
      console.log(
        'COMPLETE PROFILE ERROR:',
        error
      );

      let message =
        'Unable to save your profile. Please try again.';

      if (
        error instanceof Error
      ) {
        message =
          error.message;
      }

      setErrorMessage(
        message
      );

      showMessage(
        'Unable to Complete Profile',
        message
      );
    } finally {
      setLoading(false);
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
            <SetupHeader
              topInset={
                insets.top
              }
              step={3}
              title="Your blood type"
              subtitle="Optional. Add it only if you have proof."
              onBack={() => {
                if (!loading) {
                  goBack();
                }
              }}
            />

            <View
              style={
                styles.form
              }
            >
              {/* ==============================================
                  BLOOD TYPE GRID
              ============================================== */}

              <Text
                style={
                  styles.fieldLabel
                }
              >
                Select your blood type
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
                        key={type}
                        style={[
                          styles.bloodButton,
                          selected &&
                            styles.bloodButtonSelected,
                          loading &&
                            styles.disabledButton,
                        ]}
                        activeOpacity={
                          0.8
                        }
                        disabled={
                          loading
                        }
                        accessibilityRole="radio"
                        accessibilityState={{
                          checked:
                            selected,
                        }}
                        onPress={() =>
                          handleBloodTypeSelect(
                            type
                          )
                        }
                      >
                        <Text
                          style={[
                            styles.bloodButtonText,
                            selected &&
                              styles.bloodButtonTextSelected,
                          ]}
                        >
                          {type}
                        </Text>
                      </TouchableOpacity>
                    );
                  }
                )}
              </View>

              {/* ==============================================
                  SELECTION STATUS
              ============================================== */}

              {bloodType ? (
                <View
                  style={
                    styles.selectedBox
                  }
                >
                  <View
                    style={
                      styles.selectedIcon
                    }
                  >
                    <Ionicons
                      name="checkmark"
                      size={14}
                      color={
                        COLORS.white
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.selectedText
                    }
                  >
                    {bloodType} selected. Add your proof below.
                  </Text>

                  <TouchableOpacity
                    style={
                      styles.clearSelectionButton
                    }
                    activeOpacity={
                      0.7
                    }
                    disabled={
                      loading
                    }
                    onPress={() => {
                      setBloodType('');
                      setBloodTypeProof(null);
                    }}
                  >
                    <Text
                      style={
                        styles.clearSelectionText
                      }
                    >
                      Clear
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <View
                  style={
                    styles.skipStatusBox
                  }
                >
                  <Ionicons
                    name="information-circle-outline"
                    size={16}
                    color={
                      COLORS.hint
                    }
                  />

                  <Text
                    style={
                      styles.skipStatusText
                    }
                  >
                    No blood type selected. You can safely continue.
                  </Text>
                </View>
              )}

              {bloodType ? (
                <View
                  style={
                    styles.proofWrap
                  }
                >
                  <BloodTypeProofField
                    image={bloodTypeProof}
                    disabled={loading}
                    onChange={image => {
                      setBloodTypeProof(image);
                      setErrorMessage('');
                    }}
                    onError={message =>
                      showMessage(
                        'Photo Not Added',
                        message
                      )
                    }
                  />
                </View>
              ) : null}

              {errorMessage ? (
                <View
                  style={
                    styles.errorBox
                  }
                >
                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {errorMessage}
                  </Text>
                </View>
              ) : null}

              {/* ==============================================
                  NOT TESTED YET
              ============================================== */}

              <View
                style={
                  styles.tipBox
                }
              >
                <Ionicons
                  name="information-circle-outline"
                  size={18}
                  color={
                    COLORS.tipIcon
                  }
                />

                <Text
                  style={
                    styles.tipText
                  }
                >
                  <Text
                    style={
                      styles.tipHighlight
                    }
                  >
                    Not tested yet?{' '}
                  </Text>
                  Skip this for now and get your blood typed at your local Red
                  Cross chapter, hospital or health center. Then add it with a
                  photo of the result from your profile. Please don't guess.
                </Text>
              </View>
            </View>
          </ScrollView>

          {/* Back / Complete Profile stay in view, above the
              home indicator. */}
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
              style={[
                styles.secondaryButton,
                loading &&
                  styles.disabledButton,
              ]}
              activeOpacity={
                0.8
              }
              disabled={
                loading
              }
              onPress={
                goBack
              }
            >
              <Text
                style={
                  styles.secondaryButtonText
                }
              >
                Back
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.completeButton,
                loading &&
                  styles.disabledButton,
              ]}
              activeOpacity={
                0.85
              }
              disabled={
                loading
              }
              onPress={
                handleCompleteProfile
              }
            >
              <Text
                style={
                  styles.completeButtonText
                }
              >
                {loading
                  ? 'Saving...'
                  : 'Complete Profile'}
              </Text>
            </TouchableOpacity>
          </View>
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
              <Ionicons
                name={
                  actionPopup.variant ===
                  'success'
                    ? 'checkmark-circle'
                    : actionPopup.variant ===
                        'warning'
                      ? 'warning'
                      : actionPopup.variant ===
                          'error'
                        ? 'close-circle'
                        : 'information-circle'
                }
                size={
            ICON_TILE.lg.glyph
          }
                color={
                  actionPopup.variant ===
                  'success'
                    ? '#2E7D32'
                    : actionPopup.variant ===
                        'warning'
                      ? '#C96A18'
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
    // ========================================================
    // FORM (new look: same fields as Sign Up)
    // ========================================================

    safeArea: {
      flex: 1,
      backgroundColor: COLORS.white,
    },

    scroll: {
      flexGrow: 1,
      backgroundColor: COLORS.white,
    },

    form: {
      paddingHorizontal: 20,
      paddingTop: 4,
      paddingBottom: 24,
    },

    fieldLabel: {
      marginBottom: 10,
      color: COLORS.label,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },

    bloodGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },

    // Four to a row.
    bloodButton: {
      width: '23.2%',
      flexGrow: 1,
      height: 50,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.border,
      borderRadius: 12,
      backgroundColor: COLORS.white,
    },

    bloodButtonSelected: {
      borderColor: COLORS.redButton,
      backgroundColor: COLORS.redButton,
    },

    bloodButtonText: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    bloodButtonTextSelected: {
      color: COLORS.white,
    },

    selectedBox: {
      marginTop: 14,
      marginBottom: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderRadius: 12,
      backgroundColor: COLORS.greenLight,
    },

    selectedIcon: {
      width: 24,
      height: 24,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.green,
    },

    selectedText: {
      flex: 1,
      color: COLORS.green,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },

    clearSelectionButton: {
      paddingHorizontal: 10,
      paddingVertical: 6,
    },

    clearSelectionText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },

    skipStatusBox: {
      marginTop: 14,
      marginBottom: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 12,
      backgroundColor: '#F7F2F2',
    },

    skipStatusText: {
      flex: 1,
      color: '#555555',
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
    },

    errorBox: {
      marginBottom: 14,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 12,
      backgroundColor: '#FDECEC',
    },

    errorText: {
      color: COLORS.redButton,
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
      textAlign: 'center',
    },

    proofWrap: {
      marginBottom: 14,
    },

    tipBox: {
      marginTop: 0,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderRadius: 14,
      backgroundColor: COLORS.tip,
    },

    tipText: {
      flex: 1,
      color: COLORS.tipText,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
    },

    tipHighlight: {
      fontFamily: 'Inter_600SemiBold',
    },

    bottomBar: {
      paddingHorizontal: 20,
      paddingTop: 12,
      flexDirection: 'row',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: '#F0E3E3',
      backgroundColor: COLORS.white,
    },

    secondaryButton: {
      flex: 1,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 14,
      backgroundColor: '#F2F2F4',
    },

    secondaryButtonText: {
      color: '#333333',
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    completeButton: {
      flex: 2,
      height: 52,
      alignItems: 'center',
      justifyContent: 'center',
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

    completeButtonText: {
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

    // ========================================================
    // BUTTONS
    // ========================================================

    disabledButton: {
      opacity: 0.6,
    },

    // ========================================================
    // ACTION POPUP
    // ========================================================

    actionPopupOverlay: {
      flex: 1,

      paddingHorizontal: 24,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(0,0,0,0.48)',
    },

    actionPopupCard: {
      width: '100%',

      maxWidth: 340,

      paddingHorizontal: 24,
      paddingTop: 28,
      paddingBottom: 20,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 8,
      },

      shadowOpacity: 0.2,
      shadowRadius: 18,

      elevation: 10,
    },

    actionPopupIcon: {
      width: ICON_TILE.lg.size,
      height: ICON_TILE.lg.size,

      alignSelf: 'center',

      marginBottom: 16,

      borderRadius: ICON_TILE.lg.radius,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.infoBackground,
    },

    actionPopupIconSuccess: {
      backgroundColor:
        '#EAF5EB',
    },

    actionPopupIconWarning: {
      backgroundColor:
        '#FFF5E8',
    },

    actionPopupIconError: {
      backgroundColor:
        COLORS.infoBackground,
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 17,
      lineHeight: 24,

      textAlign: 'center',
    },

    actionPopupMessage: {
      marginTop: 6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13.5,
      lineHeight: 20,

      textAlign: 'center',
    },

    actionPopupButton: {
      height: 48,

      marginTop: 24,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,
    },

    actionPopupButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,
    },
  });