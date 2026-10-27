import { useState } from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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

import * as Location from 'expo-location';

import {
  getAddressFromLocation,
} from '../../lib/api';

import {
  getAccessToken,
} from '../../lib/session';
import AuthField from '../../components/AuthField';
import SetupHeader from '../../components/SetupHeader';
import { useKeyboardOpen } from '../../lib/useKeyboardOpen';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#171717',

  inputBorder: '#D6D6D6',
  placeholder: '#A0A0A0',
  muted: '#646464',

  progressInactive: '#D6D6D6',

  mapBackground: '#E8F2F5',
  mapRoad: '#FFFFFF',
  mapRoadSecondary: '#C9D9DE',
  mapGreen: '#D7E9D2',

  green: '#2E7D32',
  greenLight: '#EAF5EB',

  // Form (same as Sign Up's fields)
  border: '#E4D7D7',
  hint: '#666666',
  greenBorder: '#CDEBD7',
};

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

export default function LocationScreen() {
  // The page runs to the bottom edge; its content ends above
  // the home bar.
  const insets = useSafeAreaInsets();

  // The bottom bar hides while typing (see below).
  const keyboardOpen =
    useKeyboardOpen();

  const params =
    useLocalSearchParams<{
      first_name?: string;
      last_name?: string;
      middle_name?: string;
      phone?: string;
      date_of_birth?: string;
      gender?: string;
      profile_photo_uri?: string;
    }>();

  const [
    barangay,
    setBarangay,
  ] =
    useState('');

  const [
    city,
    setCity,
  ] =
    useState('');

  const [
    province,
    setProvince,
  ] =
    useState('');

  const [
    latitude,
    setLatitude,
  ] =
    useState<
      number | null
    >(null);

  const [
    longitude,
    setLongitude,
  ] =
    useState<
      number | null
    >(null);

  const [
    locationLoading,
    setLocationLoading,
  ] =
    useState(false);

  const [
    locationDetected,
    setLocationDetected,
  ] =
    useState(false);

  // The address fields were filled in from the location, and
  // whether OpenStreetMap supplied it (it needs to be credited).
  const [
    addressFilled,
    setAddressFilled,
  ] =
    useState(false);

  const [
    addressFromMap,
    setAddressFromMap,
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

        visible:
          false,
      })
    );
  }

  function getMessageVariant(
    title: string
  ): ActionPopupVariant {
    const value =
      title.toLowerCase();

    if (
      value.includes(
        'detected'
      ) ||
      value.includes(
        'success'
      )
    ) {
      return 'success';
    }

    if (
      value.includes(
        'unable'
      ) ||
      value.includes(
        'error'
      )
    ) {
      return 'error';
    }

    if (
      value.includes(
        'required'
      ) ||
      value.includes(
        'missing'
      )
    ) {
      return 'warning';
    }

    return 'info';
  }

  // Steps open with push. With no screen to go back to (a web
  // reload), go to step 1.
  function goBack() {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace(
      '/complete-profile/personal'
    );
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

  function clearError() {
    if (
      errorMessage
    ) {
      setErrorMessage(
        ''
      );
    }
  }

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  async function handleCurrentLocation() {
    if (
      locationLoading
    ) {
      return;
    }

    try {
      setLocationLoading(
        true
      );

      setErrorMessage(
        ''
      );

      const permission =
        await Location
          .requestForegroundPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        showMessage(
          'Location Permission Required',
          'Please allow location access so Hemo-Hero can find nearby blood donors and emergency requests.'
        );

        return;
      }

      const currentLocation =
        await Location
          .getCurrentPositionAsync({
            accuracy:
              Location.Accuracy
                .Balanced,
          });

      const {
        latitude:
          currentLatitude,

        longitude:
          currentLongitude,
      } =
        currentLocation.coords;

      setLatitude(
        currentLatitude
      );

      setLongitude(
        currentLongitude
      );

      setLocationDetected(
        true
      );

      // ========================================================
      // ADDRESS FROM THE LOCATION
      //
      // OpenStreetMap (through the server) gives the city and
      // province; on phones, the phone's own lookup often knows
      // the barangay. Both run together and fill what they find.
      // ========================================================

      const accessToken =
        await getAccessToken();

      const [
        mapResult,
        phoneResult,
      ] =
        await Promise.allSettled([
          accessToken
            ? getAddressFromLocation(
                accessToken,
                currentLatitude,
                currentLongitude
              )
            : Promise.reject(
                new Error(
                  'Not signed in.'
                )
              ),

          Platform.OS !==
          'web'
            ? Location
                .reverseGeocodeAsync({
                  latitude:
                    currentLatitude,

                  longitude:
                    currentLongitude,
                })
            : Promise.resolve(
                []
              ),
        ]);

      const fromMap =
        mapResult.status ===
        'fulfilled'
          ? mapResult.value
              ?.address ||
            null
          : null;

      const fromPhone =
        phoneResult.status ===
        'fulfilled'
          ? phoneResult.value?.[0] ||
            null
          : null;

      if (
        mapResult.status ===
        'rejected'
      ) {
        console.log(
          'ADDRESS LOOKUP ERROR:',
          mapResult.reason
        );
      }

      if (
        phoneResult.status ===
        'rejected'
      ) {
        console.log(
          'REVERSE GEOCODE ERROR:',
          phoneResult.reason
        );
      }

      // A mapped barangay boundary first, then the phone's
      // barangay ("district"), then the nearest named area.
      const detectedBarangay =
        (fromMap?.barangay_exact
          ? fromMap.barangay
          : '') ||
        fromPhone?.district ||
        fromMap?.barangay ||
        '';

      const detectedCity =
        fromMap?.city ||
        fromPhone?.city ||
        '';

      // On phones in the Philippines, "region" is the region
      // (e.g. Eastern Visayas) and "subregion" the province.
      const detectedProvince =
        fromMap?.province ||
        fromPhone?.subregion ||
        '';

      if (
        detectedBarangay
      ) {
        setBarangay(
          detectedBarangay
        );
      }

      if (
        detectedCity
      ) {
        setCity(
          detectedCity
        );
      }

      if (
        detectedProvince
      ) {
        setProvince(
          detectedProvince
        );
      }

      const filled =
        Boolean(
          detectedBarangay ||
            detectedCity ||
            detectedProvince
        );

      setAddressFilled(
        filled
      );

      setAddressFromMap(
        Boolean(
          fromMap
        )
      );

      if (filled) {
        clearError();
      } else {
        showMessage(
          'Location Detected',
          'Your location was found, but not its address. Please type your barangay or street, city, and province below.'
        );
      }
    } catch (
      error
    ) {
      console.log(
        'LOCATION ERROR:',
        error
      );

      showMessage(
        'Unable to Get Location',
        'Hemo-Hero could not determine your current location. You can still enter your location manually.'
      );
    } finally {
      setLocationLoading(
        false
      );
    }
  }

  // ==========================================================
  // NEXT
  // ==========================================================

  function handleNext() {
    setErrorMessage(
      ''
    );

    const cleanBarangay =
      barangay.trim();

    const cleanCity =
      city.trim();

    const cleanProvince =
      province.trim();

    if (
      !cleanBarangay ||
      !cleanCity ||
      !cleanProvince
    ) {
      const message =
        'Please complete your location information.';

      setErrorMessage(
        message
      );

      showMessage(
        'Missing Location',
        message
      );

      return;
    }

    router.push({
      pathname:
        '/complete-profile/medical',

      params: {
        first_name:
          params.first_name ||
          '',

        last_name:
          params.last_name ||
          '',

        middle_name:
          params.middle_name ||
          '',

        phone:
          params.phone ||
          '',

        date_of_birth:
          params.date_of_birth ||
          '',

        gender:
          params.gender ||
          '',

        profile_photo_uri:
          params.profile_photo_uri ||
          '',

        barangay:
          cleanBarangay,

        city:
          cleanCity,

        province:
          cleanProvince,

        latitude:
          latitude !== null
            ? String(
                latitude
              )
            : '',

        longitude:
          longitude !== null
            ? String(
                longitude
              )
            : '',
      },
    });
  }

  // ==========================================================
  // SCREEN
  // ==========================================================

  const located =
    locationDetected &&
    latitude !== null &&
    longitude !== null;

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

          <KeyboardAvoidingView
            style={
              styles.flex
            }
            behavior={
              Platform.OS ===
              'ios'
                ? 'padding'
                : undefined
            }
          >
            <ScrollView
              contentContainerStyle={
                styles.scroll
              }
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              bounces={
                false
              }
            >
              <SetupHeader
                topInset={
                  insets.top
                }
                step={2}
                title="Where are you based?"
                subtitle="We match you with requests near you."
                onBack={
                  goBack
                }
              />

              <View
                style={
                  styles.form
                }
              >
                {/* ==============================================
                    CURRENT LOCATION
                ============================================== */}

                <TouchableOpacity
                  style={[
                    styles.locateCard,
                    located &&
                      styles.locateCardDone,
                    locationLoading &&
                      styles.disabledButton,
                  ]}
                  activeOpacity={
                    0.85
                  }
                  disabled={
                    locationLoading
                  }
                  accessibilityRole="button"
                  onPress={
                    handleCurrentLocation
                  }
                >
                  <View
                    style={[
                      styles.locateIcon,
                      located &&
                        styles.locateIconDone,
                    ]}
                  >
                    <Ionicons
                      name={
                        located
                          ? 'checkmark'
                          : 'locate'
                      }
                      size={24}
                      color={
                        COLORS.white
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.locateText
                    }
                  >
                    <Text
                      style={[
                        styles.locateTitle,
                        located &&
                          styles.locateTitleDone,
                      ]}
                    >
                      {locationLoading
                        ? 'Finding your location...'
                        : located
                          ? 'Location found'
                          : 'Use my current location'}
                    </Text>

                    <Text
                      style={
                        styles.locateSubtitle
                      }
                    >
                      {located
                        ? addressFilled
                          ? 'Filled in below. Check it before continuing.'
                          : `GPS: ${latitude.toFixed(
                              5
                            )}, ${longitude.toFixed(
                              5
                            )}`
                        : 'Fills in the fields below for you'}
                    </Text>
                  </View>

                  <Ionicons
                    name={
                      located
                        ? 'refresh'
                        : 'chevron-forward'
                    }
                    size={18}
                    color={
                      located
                        ? COLORS.green
                        : COLORS.redButton
                    }
                  />
                </TouchableOpacity>

                {located &&
                addressFromMap ? (
                  <Text
                    style={
                      styles.credit
                    }
                  >
                    Address data © OpenStreetMap contributors
                  </Text>
                ) : null}

                <View
                  style={
                    styles.divider
                  }
                >
                  <View
                    style={
                      styles.dividerLine
                    }
                  />

                  <Text
                    style={
                      styles.dividerText
                    }
                  >
                    {located
                      ? 'review your address'
                      : 'or type it in'}
                  </Text>

                  <View
                    style={
                      styles.dividerLine
                    }
                  />
                </View>

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
                    ADDRESS
                ============================================== */}

                <AuthField
                  label="Barangay or street"
                  icon="home-outline"
                  placeholder="e.g. Diliman"
                  value={
                    barangay
                  }
                  autoCapitalize="words"
                  autoCorrect={
                    false
                  }
                  onChangeText={value => {
                    setBarangay(
                      value
                    );
                    clearError();
                  }}
                />

                <AuthField
                  label="City / municipality"
                  icon="business-outline"
                  placeholder="e.g. Quezon City"
                  value={
                    city
                  }
                  autoCapitalize="words"
                  autoCorrect={
                    false
                  }
                  onChangeText={value => {
                    setCity(
                      value
                    );
                    clearError();
                  }}
                />

                <AuthField
                  label="Province"
                  icon="map-outline"
                  placeholder="e.g. Metro Manila"
                  value={
                    province
                  }
                  autoCapitalize="words"
                  autoCorrect={
                    false
                  }
                  onChangeText={value => {
                    setProvince(
                      value
                    );
                    clearError();
                  }}
                />

                <View
                  style={
                    styles.privacyNote
                  }
                >
                  <Ionicons
                    name="lock-closed-outline"
                    size={16}
                    color={
                      COLORS.hint
                    }
                  />

                  <Text
                    style={
                      styles.privacyText
                    }
                  >
                    Others never see your exact location, only how far away you are.
                  </Text>
                </View>
              </View>
            </ScrollView>

            {/* Stays at the bottom: hidden while the keyboard is
                open instead of riding up on top of it. */}
            {keyboardOpen ? null : (
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
                    styles.secondaryButton
                  }
                  activeOpacity={
                    0.8
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
                  style={
                    styles.nextButton
                  }
                  activeOpacity={
                    0.85
                  }
                  onPress={
                    handleNext
                  }
                >
                  <Text
                    style={
                      styles.nextButtonText
                    }
                  >
                    Next
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
            )}
          </KeyboardAvoidingView>
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
                    ? COLORS.green
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

    locateCard: {
      padding: 14,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 14,
      borderWidth: 1.5,
      borderColor: COLORS.redButton,
      borderRadius: 16,
      backgroundColor: '#FFF6F6',
    },

    locateCardDone: {
      borderColor: COLORS.greenBorder,
      backgroundColor: COLORS.greenLight,
    },

    locateIcon: {
      width: 48,
      height: 48,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.redButton,
    },

    locateIconDone: {
      backgroundColor: COLORS.green,
    },

    locateText: {
      flex: 1,
    },

    locateTitle: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14.5,
    },

    locateTitleDone: {
      color: COLORS.green,
    },

    locateSubtitle: {
      marginTop: 2,
      color: COLORS.hint,
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 17,
    },

    credit: {
      marginTop: 6,
      marginLeft: 4,
      color: COLORS.hint,
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
    },

    divider: {
      marginTop: 18,
      marginBottom: 16,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },

    dividerLine: {
      flex: 1,
      height: 1,
      backgroundColor: '#F0E3E3',
    },

    dividerText: {
      color: COLORS.hint,
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
    },

    errorBox: {
      marginBottom: 16,
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

    privacyNote: {
      marginTop: 4,
      padding: 12,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
      borderRadius: 14,
      backgroundColor: '#F7F2F2',
    },

    privacyText: {
      flex: 1,
      color: '#555555',
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
      lineHeight: 18,
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

    nextButton: {
      flex: 2,
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

    nextButtonText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    flex: {
      flex: 1,
    },

    desktopBackground: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS ===
        'web'
          ? '#1E1E1E'
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

    // ========================================================
    // CURRENT LOCATION
    // ========================================================

    disabledButton: {
      opacity:
        0.65,
    },

    // ========================================================
    // ACTION POPUP
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

      maxWidth: 340,

      paddingHorizontal: 24,

      paddingTop: 28,

      paddingBottom: 20,

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
      width: ICON_TILE.lg.size,

      height: ICON_TILE.lg.size,

      alignSelf:
        'center',

      marginBottom: 16,

      borderRadius: ICON_TILE.lg.radius,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFF1F1',
    },

    actionPopupIconSuccess: {
      backgroundColor:
        COLORS.greenLight,
    },

    actionPopupIconWarning: {
      backgroundColor:
        '#FFF5E8',
    },

    actionPopupIconError: {
      backgroundColor:
        '#FFF1F1',
    },

    actionPopupTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 17,

      lineHeight: 24,

      textAlign:
        'center',
    },

    actionPopupMessage: {
      marginTop: 6,

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
      height: 48,

      marginTop: 24,

      borderRadius: 12,

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