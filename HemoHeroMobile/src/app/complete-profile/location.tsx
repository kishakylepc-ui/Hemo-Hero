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

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

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
          // The header scrolls with the page, so the top keeps its
          // padding; the bottom is drawn edge to edge.
          edges={[
            'top',
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
              contentContainerStyle={[
                styles.scroll,
                {
                  paddingBottom:
                    insets.bottom,
                },
              ]}
              keyboardShouldPersistTaps="handled"
              showsVerticalScrollIndicator={
                false
              }
              bounces={
                false
              }
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
                      style={[
                        styles.progressLine,
                        styles.progressActive,
                      ]}
                    />

                    <View
                      style={
                        styles.progressLine
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.sectionTitle
                    }
                  >
                    Your Location
                  </Text>

                  {/* ==============================================
                      MAP PREVIEW
                  ============================================== */}

                  <View
                    style={
                      styles.mapContainer
                    }
                  >
                    <View
                      style={
                        styles.mapGreenOne
                      }
                    />

                    <View
                      style={
                        styles.mapGreenTwo
                      }
                    />

                    <View
                      style={
                        styles.roadHorizontal
                      }
                    />

                    <View
                      style={
                        styles.roadHorizontalTwo
                      }
                    />

                    <View
                      style={
                        styles.roadVertical
                      }
                    />

                    <View
                      style={
                        styles.roadDiagonal
                      }
                    />

                    <View
                      style={
                        styles.locationPin
                      }
                    >
                      <MaterialIcons
                        name="location-on"
                        size={
                          32
                        }
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>
                  </View>

                  <Text
                    style={
                      styles.locationDescription
                    }
                  >
                    We'll use your location to connect you with nearby donors
                    and emergency blood requests.
                  </Text>

                  {/* ==============================================
                      CURRENT LOCATION
                  ============================================== */}

                  <TouchableOpacity
                    style={[
                      styles.currentLocationButton,

                      locationLoading &&
                        styles.disabledButton,
                    ]}
                    activeOpacity={
                      0.85
                    }
                    disabled={
                      locationLoading
                    }
                    onPress={
                      handleCurrentLocation
                    }
                  >
                    <MaterialIcons
                      name={
                        locationDetected
                          ? 'check-circle'
                          : 'my-location'
                      }
                      size={
                        17
                      }
                      color={
                        COLORS.white
                      }
                    />

                    <Text
                      style={
                        styles.currentLocationText
                      }
                    >
                      {locationLoading
                        ? 'Detecting Location...'
                        : locationDetected
                          ? 'Location Detected'
                          : 'Use my Current Location'}
                    </Text>
                  </TouchableOpacity>

                  {locationDetected &&
                  latitude !==
                    null &&
                  longitude !==
                    null ? (
                    <View
                      style={
                        styles.detectedBox
                      }
                    >
                      <View
                        style={
                          styles.detectedIcon
                        }
                      >
                        <MaterialIcons
                          name="check"
                          size={
                            12
                          }
                          color={
                            COLORS.white
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.detectedContent
                        }
                      >
                        <Text
                          style={
                            styles.detectedTitle
                          }
                        >
                          {addressFilled
                            ? 'Address filled in from your location'
                            : 'Current location found'}
                        </Text>

                        <Text
                          style={
                            styles.detectedCoordinates
                          }
                        >
                          {addressFilled
                            ? 'Check the details below before continuing.'
                            : `GPS: ${latitude.toFixed(
                                5
                              )}, ${longitude.toFixed(
                                5
                              )}`}
                        </Text>

                        {addressFromMap ? (
                          <Text
                            style={
                              styles.detectedCredit
                            }
                          >
                            Address data © OpenStreetMap contributors
                          </Text>
                        ) : null}
                      </View>
                    </View>
                  ) : null}

                  {/* ==============================================
                      LOCATION DETAILS
                  ============================================== */}

                  <Text
                    style={
                      styles.locationDetailsTitle
                    }
                  >
                    Location Details
                  </Text>

                  <Text
                    style={
                      styles.locationHint
                    }
                  >
                    Please review your location details before continuing.
                  </Text>

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
                        {
                          errorMessage
                        }
                      </Text>
                    </View>
                  ) : null}

                  {/* ==============================================
                      BARANGAY
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Barangay or Street
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Enter Barangay or Street"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    value={
                      barangay
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      value => {
                        setBarangay(
                          value
                        );

                        clearError();
                      }
                    }
                  />

                  {/* ==============================================
                      CITY
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    City / Municipality
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Enter City or Municipality"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    value={
                      city
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      value => {
                        setCity(
                          value
                        );

                        clearError();
                      }
                    }
                  />

                  {/* ==============================================
                      PROVINCE
                  ============================================== */}

                  <Text
                    style={
                      styles.label
                    }
                  >
                    Province
                  </Text>

                  <TextInput
                    style={
                      styles.input
                    }
                    placeholder="Enter Province"
                    placeholderTextColor={
                      COLORS.placeholder
                    }
                    value={
                      province
                    }
                    autoCapitalize="words"
                    autoCorrect={
                      false
                    }
                    onChangeText={
                      value => {
                        setProvince(
                          value
                        );

                        clearError();
                      }
                    }
                  />

                  <View
                    style={
                      styles.bottomButtons
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.secondaryButton
                      }
                      activeOpacity={
                        0.8
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
                    </TouchableOpacity>
                  </View>
                </View>
              </LinearGradient>
            </ScrollView>
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

      paddingHorizontal:
        27,

      paddingTop:
        52,

      overflow:
        'hidden',
    },

    headerDecoration: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      right:
        -82,

      top:
        -70,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backCircle: {
      width:
        37,

      height:
        37,

      borderRadius:
        19,

      borderWidth:
        2,

      borderColor:
        COLORS.white,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        12,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        20,
    },

    // ========================================================
    // BODY
    // ========================================================

    bodyBackground: {
      flex:
        1,

      minHeight:
        669,

      paddingHorizontal:
        20,

      paddingBottom:
        30,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      marginTop:
        -72,

      minHeight:
        640,

      paddingHorizontal:
        20,

      paddingTop:
        16,

      paddingBottom:
        24,

      backgroundColor:
        '#FAFAFA',

      borderRadius:
        27,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          3,
      },

      shadowOpacity:
        0.15,

      shadowRadius:
        5,

      elevation:
        5,
    },

    // ========================================================
    // PROGRESS
    // ========================================================

    progressRow: {
      width:
        155,

      flexDirection:
        'row',

      alignSelf:
        'center',

      gap:
        8,

      marginBottom:
        16,
    },

    progressLine: {
      flex:
        1,

      height:
        4,

      borderRadius:
        3,

      backgroundColor:
        COLORS.progressInactive,
    },

    progressActive: {
      backgroundColor:
        COLORS.redButton,
    },

    sectionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        14.5,

      marginBottom:
        14,
    },

    // ========================================================
    // MAP
    // ========================================================

    mapContainer: {
      width:
        180,

      height:
        100,

      alignSelf:
        'center',

      position:
        'relative',

      overflow:
        'hidden',

      borderRadius:
        8,

      backgroundColor:
        COLORS.mapBackground,

      marginBottom:
        14,
    },

    mapGreenOne: {
      position:
        'absolute',

      width:
        62,

      height:
        42,

      left:
        5,

      top:
        4,

      borderRadius:
        20,

      backgroundColor:
        COLORS.mapGreen,
    },

    mapGreenTwo: {
      position:
        'absolute',

      width:
        55,

      height:
        35,

      right:
        7,

      bottom:
        5,

      borderRadius:
        18,

      backgroundColor:
        COLORS.mapGreen,
    },

    roadHorizontal: {
      position:
        'absolute',

      width:
        220,

      height:
        12,

      left:
        -20,

      top:
        43,

      backgroundColor:
        COLORS.mapRoad,

      transform: [
        {
          rotate:
            '-7deg',
        },
      ],
    },

    roadHorizontalTwo: {
      position:
        'absolute',

      width:
        200,

      height:
        5,

      left:
        -10,

      top:
        70,

      backgroundColor:
        COLORS.mapRoadSecondary,

      transform: [
        {
          rotate:
            '9deg',
        },
      ],
    },

    roadVertical: {
      position:
        'absolute',

      width:
        10,

      height:
        130,

      left:
        72,

      top:
        -15,

      backgroundColor:
        COLORS.mapRoad,

      transform: [
        {
          rotate:
            '14deg',
        },
      ],
    },

    roadDiagonal: {
      position:
        'absolute',

      width:
        7,

      height:
        150,

      right:
        47,

      top:
        -25,

      backgroundColor:
        COLORS.mapRoadSecondary,

      transform: [
        {
          rotate:
            '-32deg',
        },
      ],
    },

    locationPin: {
      position:
        'absolute',

      left:
        74,

      top:
        32,
    },

    locationDescription: {
      paddingHorizontal:
        18,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,

      textAlign:
        'center',

      marginBottom:
        18,
    },

    // ========================================================
    // CURRENT LOCATION
    // ========================================================

    currentLocationButton: {
      height:
        48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        8,

      borderRadius:
        8,

      backgroundColor:
        COLORS.redButton,
    },

    currentLocationText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    disabledButton: {
      opacity:
        0.65,
    },

    // ========================================================
    // LOCATION DETECTED
    // ========================================================

    detectedBox: {
      marginTop:
        12,

      marginBottom:
        0,

      minHeight:
        48,

      paddingVertical:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      paddingHorizontal:
        12,

      borderRadius:
        8,

      backgroundColor:
        COLORS.greenLight,

      borderWidth:
        1,

      borderColor:
        '#B9D9BC',
    },

    detectedIcon: {
      width:
        23,

      height:
        23,

      borderRadius:
        12,

      backgroundColor:
        COLORS.green,

      alignItems:
        'center',

      justifyContent:
        'center',

      marginRight:
        9,
    },

    detectedContent: {
      flex:
        1,
    },

    detectedTitle: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12.5,
    },

    detectedCoordinates: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11,
    },

    detectedCredit: {
      marginTop:
        3,

      color:
        COLORS.placeholder,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        10.5,
    },

    // ========================================================
    // OR
    // ========================================================

    // ========================================================
    // SELECT MAP
    // ========================================================

    // ========================================================
    // LOCATION DETAILS
    // ========================================================

    locationDetailsTitle: {
      marginTop:
        24,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13.5,
    },

    locationHint: {
      marginTop:
        4,

      marginBottom:
        16,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorBox: {
      marginBottom:
        14,

      paddingHorizontal:
        10,

      paddingVertical:
        8,

      borderWidth:
        1,

      borderColor:
        '#E9AAAA',

      borderRadius:
        7,

      backgroundColor:
        '#FDECEC',
    },

    errorText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12,

      textAlign:
        'center',
    },

    // ========================================================
    // FORM
    // ========================================================

    label: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,

      marginBottom:
        7,
    },

    input: {
      height:
        48,

      marginBottom:
        16,

      paddingHorizontal:
        13,

      borderWidth:
        1,

      borderColor:
        COLORS.inputBorder,

      borderRadius:
        8,

      color:
        COLORS.black,

      backgroundColor:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        13.5,

      outlineStyle:
        Platform.OS ===
        'web'
          ? 'none'
          : undefined,
    } as any,

    // ========================================================
    // BOTTOM BUTTONS
    // ========================================================

    bottomButtons: {
      flexDirection:
        'row',

      gap:
        12,

      marginTop:
        10,
    },

    secondaryButton: {
      flex:
        1,

      height:
        48,

      borderRadius:
        8,

      backgroundColor:
        '#E3E3E3',

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    secondaryButtonText: {
      color:
        '#444444',

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    nextButton: {
      flex:
        1,

      height:
        48,

      borderRadius:
        8,

      backgroundColor:
        COLORS.redButton,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    nextButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
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

      fontSize:
        17,

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