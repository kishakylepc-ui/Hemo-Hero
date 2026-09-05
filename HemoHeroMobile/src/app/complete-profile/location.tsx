import { useState } from 'react';

import {
  Alert,
  KeyboardAvoidingView,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import * as Location from 'expo-location';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',

  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',

  white: '#FFFFFF',
  black: '#111111',

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

export default function LocationScreen() {
  // ==========================================================
  // DATA FROM PERSONAL INFORMATION
  // ==========================================================

  const params = useLocalSearchParams<{
    first_name?: string;
    last_name?: string;
    middle_name?: string;
    date_of_birth?: string;
    gender?: string;
    profile_photo_uri?: string;
  }>();

  // ==========================================================
  // LOCATION FORM
  // ==========================================================

  const [barangay, setBarangay] =
    useState('');

  const [city, setCity] =
    useState('');

  const [province, setProvince] =
    useState('');

  const [latitude, setLatitude] =
    useState<number | null>(null);

  const [longitude, setLongitude] =
    useState<number | null>(null);

  const [locationLoading, setLocationLoading] =
    useState(false);

  const [locationDetected, setLocationDetected] =
    useState(false);

  const [errorMessage, setErrorMessage] =
    useState('');

  // ==========================================================
  // MESSAGE
  // ==========================================================

  function showMessage(
    title: string,
    message: string
  ) {
    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
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

  function clearError() {
    if (errorMessage) {
      setErrorMessage('');
    }
  }

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  async function handleCurrentLocation() {
    if (locationLoading) {
      return;
    }

    try {
      setLocationLoading(true);
      setErrorMessage('');

      // ------------------------------------------------------
      // REQUEST LOCATION PERMISSION
      // ------------------------------------------------------

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !== 'granted'
      ) {
        showMessage(
          'Location Permission Required',
          'Please allow location access so Hemo-Hero can find nearby blood donors and emergency requests.'
        );

        return;
      }

      // ------------------------------------------------------
      // GET CURRENT GPS COORDINATES
      // ------------------------------------------------------

      const currentLocation =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        });

      const {
        latitude: currentLatitude,
        longitude: currentLongitude,
      } = currentLocation.coords;

      setLatitude(
        currentLatitude
      );

      setLongitude(
        currentLongitude
      );

      setLocationDetected(
        true
      );

      // ------------------------------------------------------
      // NATIVE:
      // TRY TO CONVERT COORDINATES TO ADDRESS
      //
      // Expo reverseGeocodeAsync is available
      // on Android/iOS, but not Expo Web.
      // ------------------------------------------------------

      if (
        Platform.OS !== 'web'
      ) {
        try {
          const addresses =
            await Location.reverseGeocodeAsync({
              latitude:
                currentLatitude,

              longitude:
                currentLongitude,
            });

          if (
            addresses.length > 0
          ) {
            const address =
              addresses[0];

            /*
              Different phones / regions can
              return slightly different address
              components, so we use fallbacks.
            */

            const detectedBarangay =
              address.district ||
              address.subregion ||
              address.street ||
              address.name ||
              '';

            const detectedCity =
              address.city ||
              address.subregion ||
              '';

            const detectedProvince =
              address.region ||
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
          }
        } catch (
          geocodeError
        ) {
          console.log(
            'REVERSE GEOCODE ERROR:',
            geocodeError
          );

          /*
            Coordinates are still valid.
            The user can enter the address
            manually if reverse geocoding fails.
          */
        }
      }

      // ------------------------------------------------------
      // SUCCESS MESSAGE
      // ------------------------------------------------------

      if (
        Platform.OS === 'web'
      ) {
        showMessage(
          'Location Detected',
          'Your GPS coordinates were detected successfully. Please confirm your Barangay or Street, City, and Province below.'
        );
      }
    } catch (error) {
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
  // SELECT ON MAP
  // ==========================================================

  function handleSelectMap() {
    showMessage(
      'Select on Map',
      'Interactive map selection will be connected after the Complete Profile flow is fully saved to the database.'
    );
  }

  // ==========================================================
  // NEXT
  // ==========================================================

  function handleNext() {
    setErrorMessage('');

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

    // --------------------------------------------------------
    // CARRY EVERYTHING TO MEDICAL INFORMATION
    // --------------------------------------------------------

    router.push({
      pathname:
        '/complete-profile/medical',

      params: {
        first_name:
          params.first_name || '',

        last_name:
          params.last_name || '',

        middle_name:
          params.middle_name || '',

        date_of_birth:
          params.date_of_birth || '',

        gender:
          params.gender || '',

        profile_photo_uri:
          params.profile_photo_uri || '',

        barangay:
          cleanBarangay,

        city:
          cleanCity,

        province:
          cleanProvince,

        latitude:
          latitude !== null
            ? String(latitude)
            : '',

        longitude:
          longitude !== null
            ? String(longitude)
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
          edges={[
            'top',
            'bottom',
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
              Platform.OS === 'ios'
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
                        size={32}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>
                  </View>

                  {/* ==============================================
                      DESCRIPTION
                  ============================================== */}

                  <Text
                    style={
                      styles.locationDescription
                    }
                  >
                    We'll use your location to connect you with nearby donors
                    and emergency blood requests.
                  </Text>

                  {/* ==============================================
                      CURRENT LOCATION BUTTON
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
                      size={17}
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

                  {/* ==============================================
                      LOCATION DETECTED STATUS
                  ============================================== */}

                  {locationDetected &&
                  latitude !== null &&
                  longitude !== null ? (
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
                          size={12}
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
                          Current location found
                        </Text>

                        <Text
                          style={
                            styles.detectedCoordinates
                          }
                        >
                          GPS: {latitude.toFixed(5)}, {longitude.toFixed(5)}
                        </Text>
                      </View>
                    </View>
                  ) : null}

                  {/* ==============================================
                      OR
                  ============================================== */}

                  <View
                    style={
                      styles.orRow
                    }
                  >
                    <View
                      style={
                        styles.orLine
                      }
                    />

                    <Text
                      style={
                        styles.orText
                      }
                    >
                      or
                    </Text>

                    <View
                      style={
                        styles.orLine
                      }
                    />
                  </View>

                  {/* ==============================================
                      SELECT MAP
                  ============================================== */}

                  <TouchableOpacity
                    style={
                      styles.mapButton
                    }
                    activeOpacity={
                      0.8
                    }
                    onPress={
                      handleSelectMap
                    }
                  >
                    <MaterialIcons
                      name="map"
                      size={17}
                      color={
                        COLORS.black
                      }
                    />

                    <Text
                      style={
                        styles.mapButtonText
                      }
                    >
                      Select on Map
                    </Text>
                  </TouchableOpacity>

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

                  {/* ==============================================
                      BOTTOM BUTTONS
                  ============================================== */}

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
    </View>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  flex: {
    flex: 1,
  },

  desktopBackground: {
    flex: 1,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      Platform.OS === 'web'
        ? '#1E1E1E'
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

  // ==========================================================
  // HEADER
  // ==========================================================

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
    justifyContent: 'center',

    marginRight: 12,
  },

  headerTitle: {
    color:
      COLORS.white,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 17,
  },

  // ==========================================================
  // BODY
  // ==========================================================

  bodyBackground: {
    flex: 1,

    minHeight: 669,

    paddingHorizontal: 28,
    paddingBottom: 30,
  },

  // ==========================================================
  // CARD
  // ==========================================================

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

  // ==========================================================
  // PROGRESS
  // ==========================================================

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

  sectionTitle: {
    color:
      COLORS.black,

    fontFamily:
      'Inter_600SemiBold',

    fontSize: 12,

    marginBottom: 12,
  },

  // ==========================================================
  // MAP
  // ==========================================================

  mapContainer: {
    width: 180,
    height: 100,

    alignSelf: 'center',

    position: 'relative',

    overflow: 'hidden',

    borderRadius: 8,

    backgroundColor:
      COLORS.mapBackground,

    marginBottom: 10,
  },

  mapGreenOne: {
    position: 'absolute',

    width: 62,
    height: 42,

    left: 5,
    top: 4,

    borderRadius: 20,

    backgroundColor:
      COLORS.mapGreen,
  },

  mapGreenTwo: {
    position: 'absolute',

    width: 55,
    height: 35,

    right: 7,
    bottom: 5,

    borderRadius: 18,

    backgroundColor:
      COLORS.mapGreen,
  },

  roadHorizontal: {
    position: 'absolute',

    width: 220,
    height: 12,

    left: -20,
    top: 43,

    backgroundColor:
      COLORS.mapRoad,

    transform: [
      {
        rotate: '-7deg',
      },
    ],
  },

  roadHorizontalTwo: {
    position: 'absolute',

    width: 200,
    height: 5,

    left: -10,
    top: 70,

    backgroundColor:
      COLORS.mapRoadSecondary,

    transform: [
      {
        rotate: '9deg',
      },
    ],
  },

  roadVertical: {
    position: 'absolute',

    width: 10,
    height: 130,

    left: 72,
    top: -15,

    backgroundColor:
      COLORS.mapRoad,

    transform: [
      {
        rotate: '14deg',
      },
    ],
  },

  roadDiagonal: {
    position: 'absolute',

    width: 7,
    height: 150,

    right: 47,
    top: -25,

    backgroundColor:
      COLORS.mapRoadSecondary,

    transform: [
      {
        rotate: '-32deg',
      },
    ],
  },

  locationPin: {
    position: 'absolute',

    left: 74,
    top: 32,
  },

  locationDescription: {
    paddingHorizontal: 18,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 8,

    lineHeight: 12,

    textAlign: 'center',

    marginBottom: 13,
  },

  // ==========================================================
  // CURRENT LOCATION
  // ==========================================================

  currentLocationButton: {
    height: 42,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    borderRadius: 8,

    backgroundColor:
      COLORS.redButton,
  },

  currentLocationText: {
    color:
      COLORS.white,

    fontFamily:
      'Inter_600SemiBold',

    fontSize: 10,
  },

  disabledButton: {
    opacity: 0.65,
  },

  // ==========================================================
  // LOCATION DETECTED
  // ==========================================================

  detectedBox: {
    marginTop: 10,

    minHeight: 48,

    flexDirection: 'row',

    alignItems: 'center',

    paddingHorizontal: 12,

    borderRadius: 8,

    backgroundColor:
      COLORS.greenLight,

    borderWidth: 1,

    borderColor:
      '#B9D9BC',
  },

  detectedIcon: {
    width: 23,
    height: 23,

    borderRadius: 12,

    backgroundColor:
      COLORS.green,

    alignItems: 'center',
    justifyContent: 'center',

    marginRight: 9,
  },

  detectedContent: {
    flex: 1,
  },

  detectedTitle: {
    color:
      COLORS.green,

    fontFamily:
      'Inter_600SemiBold',

    fontSize: 9,
  },

  detectedCoordinates: {
    marginTop: 2,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 7,
  },

  // ==========================================================
  // OR
  // ==========================================================

  orRow: {
    flexDirection: 'row',

    alignItems: 'center',

    marginVertical: 10,
  },

  orLine: {
    flex: 1,

    height: 1,

    backgroundColor:
      '#E1E1E1',
  },

  orText: {
    marginHorizontal: 9,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 9,
  },

  // ==========================================================
  // SELECT MAP
  // ==========================================================

  mapButton: {
    height: 40,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'center',

    gap: 8,

    borderWidth: 1,

    borderColor:
      '#BFBFBF',

    borderRadius: 7,

    backgroundColor:
      COLORS.white,

    marginBottom: 15,
  },

  mapButtonText: {
    color:
      COLORS.black,

    fontFamily:
      'Inter_500Medium',

    fontSize: 9,
  },

  // ==========================================================
  // LOCATION DETAILS
  // ==========================================================

  locationDetailsTitle: {
    color:
      COLORS.black,

    fontFamily:
      'Inter_600SemiBold',

    fontSize: 11,
  },

  locationHint: {
    marginTop: 3,
    marginBottom: 10,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 8,
  },

  // ==========================================================
  // ERROR
  // ==========================================================

  errorBox: {
    marginBottom: 10,

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

    textAlign: 'center',
  },

  // ==========================================================
  // FORM
  // ==========================================================

  label: {
    color:
      COLORS.black,

    fontFamily:
      'Inter_500Medium',

    fontSize: 9,

    marginBottom: 5,
  },

  input: {
    height: 37,

    marginBottom: 10,

    paddingHorizontal: 13,

    borderWidth: 1,

    borderColor:
      COLORS.inputBorder,

    borderRadius: 8,

    color:
      COLORS.black,

    backgroundColor:
      COLORS.white,

    fontFamily:
      'Inter_400Regular',

    fontSize: 9,

    outlineStyle:
      Platform.OS === 'web'
        ? 'none'
        : undefined,
  } as any,

  // ==========================================================
  // BOTTOM BUTTONS
  // ==========================================================

  bottomButtons: {
    flexDirection: 'row',

    gap: 12,

    marginTop: 9,
  },

  secondaryButton: {
    flex: 1,

    height: 48,

    borderRadius: 8,

    backgroundColor:
      '#E3E3E3',

    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButtonText: {
    color:
      '#444444',

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 11,
  },

  nextButton: {
    flex: 1,

    height: 48,

    borderRadius: 8,

    backgroundColor:
      COLORS.redButton,

    alignItems: 'center',
    justifyContent: 'center',
  },

  nextButtonText: {
    color:
      COLORS.white,

    fontFamily:
      'Poppins_600SemiBold',

    fontSize: 11,
  },
});