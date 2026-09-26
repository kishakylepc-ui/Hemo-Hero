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

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  router,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  updateProfile,
} from '../../lib/api';

import {
  getAccessToken,
} from '../../lib/session';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#111111',

  muted: '#646464',

  progressInactive: '#D6D6D6',

  infoBackground: '#FFF1F1',
  infoBorder: '#E9A8A8',
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
    }>();

  const [
    bloodType,
    setBloodType,
  ] = useState('');

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

        blood_type:
          bloodType ||
          null,

        complete_onboarding:
          true,
      };

      console.log(
        'SAVING COMPLETE PROFILE:',
        profileData
      );

      const result =
        await updateProfile(
          accessToken,
          profileData
        );

      console.log(
        'PROFILE SAVE RESPONSE:',
        result
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
                  disabled={
                    loading
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
                    PROGRESS
                ============================================== */}

                <View
                  style={
                    styles.progressRow
                  }
                >
                  <View
                    style={
                      styles.progressLine
                    }
                  />

                  <View
                    style={
                      styles.progressLine
                    }
                  />

                  <View
                    style={[
                      styles.progressLine,
                      styles.progressActive,
                    ]}
                  />
                </View>

                {/* ==============================================
                    TITLE
                ============================================== */}

                <Text
                  style={
                    styles.sectionTitle
                  }
                >
                  Medical Information
                </Text>

                <Text
                  style={
                    styles.label
                  }
                >
                  Select Blood Type
                </Text>

                <Text
                  style={
                    styles.optionalText
                  }
                >
                  Optional — you can add or update this later
                </Text>

                {/* ==============================================
                    BLOOD TYPE GRID
                ============================================== */}

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
                      <MaterialIcons
                        name="check"
                        size={12}
                        color={
                          COLORS.white
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.selectedContent
                      }
                    >
                      <Text
                        style={
                          styles.selectedText
                        }
                      >
                        Blood type selected
                      </Text>

                      <Text
                        style={
                          styles.selectedBloodType
                        }
                      >
                        {bloodType}
                      </Text>
                    </View>

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
                      onPress={() =>
                        setBloodType('')
                      }
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
                    <MaterialIcons
                      name="info-outline"
                      size={15}
                      color={
                        COLORS.muted
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

                {/* ==============================================
                    ERROR
                ============================================== */}

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
                    INFO CARD
                ============================================== */}

                <View
                  style={
                    styles.infoBox
                  }
                >
                  <View
                    style={
                      styles.infoIconContainer
                    }
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.infoText
                    }
                  >
                    <Text
                      style={
                        styles.infoHighlight
                      }
                    >
                      Not sure?{' '}
                    </Text>

                    That's okay. You can skip this for now and add your blood
                    type later from your profile once you have confirmed it.
                    Please do not guess your blood type.
                  </Text>
                </View>

                <View
                  style={
                    styles.flexSpacer
                  }
                />

                {/* ==============================================
                    BOTTOM BUTTONS
                ============================================== */}

                <View
                  style={
                    styles.bottomButtons
                  }
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
                    onPress={() =>
                      router.back()
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
                    {loading ? (
                      <View
                        style={
                          styles.loadingRow
                        }
                      >
                        <MaterialIcons
                          name="hourglass-top"
                          size={15}
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={
                            styles.completeButtonText
                          }
                        >
                          Saving Profile...
                        </Text>
                      </View>
                    ) : (
                      <Text
                        style={
                          styles.completeButtonText
                        }
                      >
                        Complete Profile
                      </Text>
                    )}
                  </TouchableOpacity>
                </View>
              </View>
            </LinearGradient>
          </ScrollView>
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
                size={31}
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
      paddingTop: 13,
      paddingBottom: 22,

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
    // PROGRESS
    // ========================================================

    progressRow: {
      width: 155,

      flexDirection: 'row',

      alignSelf: 'center',

      gap: 8,

      marginBottom: 16,
    },

    progressLine: {
      flex: 1,

      height: 4,

      borderRadius: 3,

      backgroundColor:
        COLORS.progressInactive,
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    // ========================================================
    // TITLE
    // ========================================================

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,

      marginBottom: 15,
    },

    label: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 10,

      marginBottom: 3,
    },

    optionalText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,

      marginBottom: 12,
    },

    // ========================================================
    // BLOOD TYPES
    // ========================================================

    bloodGrid: {
      flexDirection: 'row',

      flexWrap: 'wrap',

      justifyContent:
        'space-between',

      rowGap: 12,

      marginBottom: 16,
    },

    bloodButton: {
      width: '22%',

      height: 48,

      borderWidth: 1,

      borderColor:
        '#C7C7C7',

      borderRadius: 15,

      backgroundColor:
        COLORS.white,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    bloodButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,

      shadowColor:
        COLORS.redButton,

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.18,

      shadowRadius: 4,

      elevation: 3,
    },

    bloodButtonText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    bloodButtonTextSelected: {
      color:
        COLORS.white,
    },

    // ========================================================
    // SELECTED
    // ========================================================

    selectedBox: {
      minHeight: 48,

      marginBottom: 14,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      borderRadius: 8,

      backgroundColor:
        '#FDECEC',

      borderWidth: 1,

      borderColor:
        '#F0C4C4',
    },

    selectedIcon: {
      width: 23,
      height: 23,

      borderRadius: 12,

      backgroundColor:
        COLORS.redButton,

      alignItems: 'center',
      justifyContent:
        'center',

      marginRight: 8,
    },

    selectedContent: {
      flex: 1,
    },

    selectedText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,
    },

    selectedBloodType: {
      marginTop: 1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    clearSelectionButton: {
      paddingHorizontal: 8,
      paddingVertical: 5,
    },

    clearSelectionText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8,
    },

    // ========================================================
    // SKIPPED BLOOD TYPE
    // ========================================================

    skipStatusBox: {
      minHeight: 42,

      marginBottom: 14,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      borderRadius: 8,

      backgroundColor:
        '#F5F5F5',

      borderWidth: 1,

      borderColor:
        '#E2E2E2',
    },

    skipStatusText: {
      flex: 1,

      marginLeft: 7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8,

      lineHeight: 12,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorBox: {
      marginBottom: 14,

      paddingHorizontal: 10,
      paddingVertical: 8,

      borderWidth: 1,

      borderColor:
        '#E9AAAA',

      borderRadius: 7,

      backgroundColor:
        '#FDECEC',
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,

      lineHeight: 13,

      textAlign: 'center',
    },

    // ========================================================
    // INFO
    // ========================================================

    infoBox: {
      minHeight: 90,

      flexDirection: 'row',

      alignItems:
        'flex-start',

      paddingHorizontal: 14,
      paddingVertical: 15,

      borderWidth: 1,

      borderColor:
        COLORS.infoBorder,

      borderRadius: 8,

      backgroundColor:
        COLORS.infoBackground,
    },

    infoIconContainer: {
      width: 24,

      alignItems: 'center',

      marginRight: 7,
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

    infoHighlight: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // SPACER
    // ========================================================

    flexSpacer: {
      flex: 1,

      minHeight: 105,
    },

    // ========================================================
    // BUTTONS
    // ========================================================

    bottomButtons: {
      flexDirection: 'row',

      gap: 12,

      marginTop: 20,
    },

    secondaryButton: {
      flex: 1,

      height: 48,

      borderRadius: 8,

      backgroundColor:
        '#E3E3E3',

      alignItems: 'center',
      justifyContent:
        'center',
    },

    secondaryButtonText: {
      color:
        '#444444',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    completeButton: {
      flex: 1.35,

      height: 48,

      borderRadius: 8,

      backgroundColor:
        COLORS.redButton,

      alignItems: 'center',
      justifyContent:
        'center',
    },

    completeButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10,
    },

    loadingRow: {
      flexDirection: 'row',

      alignItems: 'center',

      gap: 7,
    },

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

      maxWidth: 360,

      paddingHorizontal: 20,
      paddingTop: 22,
      paddingBottom: 18,

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
      width: 56,
      height: 56,

      alignSelf: 'center',

      marginBottom: 13,

      borderRadius: 28,

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

      fontSize: 16,
      lineHeight: 22,

      textAlign: 'center',
    },

    actionPopupMessage: {
      marginTop: 8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,
      lineHeight: 17,

      textAlign: 'center',
    },

    actionPopupButton: {
      height: 45,

      marginTop: 19,

      borderRadius: 10,

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

      fontSize: 10,
    },
  });