import {
  useCallback,
  useState,
} from 'react';

import {
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
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import * as Location from 'expo-location';

import {
  getCurrentUser,
} from '../../lib/api';

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
  lightMuted: '#969696',

  border: '#DED6D6',

  pink: '#FFF1F1',

  green: '#198754',
};

const DISTANCES = [
  5,
  10,
  20,
  30,
  50,
] as const;

export default function DonorAvailabilityScreen() {
  const params =
    useLocalSearchParams<{
      blood_type?: string;

      has_donated_before?: string;

      last_donation_date?: string;

      last_donation_facility?: string;
    }>();

  const [
    latitude,
    setLatitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    longitude,
    setLongitude,
  ] =
    useState<number | null>(
      null
    );

  const [
    locationLabel,
    setLocationLabel,
  ] = useState(
    'Location not loaded'
  );

  const [
    locationLoading,
    setLocationLoading,
  ] = useState(true);

  const [
    travelRadius,
    setTravelRadius,
  ] =
    useState<
      5 | 10 | 20 | 30 | 50
    >(20);

  const [
    availability,
    setAvailability,
  ] =
    useState<
      'available' |
      'unavailable'
    >('available');

  const [
    allowUrgent,
    setAllowUrgent,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  // ==========================================================
  // LOCATION
  // ==========================================================

  const loadLocation =
    useCallback(
      async () => {
        try {
          setLocationLoading(
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

          const profileData =
            await getCurrentUser(
              token
            );

          const profile =
            profileData?.user;

          const label =
            [
              profile?.city,
              profile?.province,
            ]
              .filter(Boolean)
              .join(', ');

          if (label) {
            setLocationLabel(
              label
            );
          }

          let permission =
            await Location
              .getForegroundPermissionsAsync();

          if (
            permission.status !==
            'granted'
          ) {
            permission =
              await Location
                .requestForegroundPermissionsAsync();
          }

          if (
            permission.status !==
            'granted'
          ) {
            setLatitude(
              null
            );

            setLongitude(
              null
            );

            setErrorMessage(
              'Location permission is required for donor matching.'
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

          setLatitude(
            currentLocation
              .coords
              .latitude
          );

          setLongitude(
            currentLocation
              .coords
              .longitude
          );
        } catch (
          error
        ) {
          console.log(
            'DONOR LOCATION ERROR:',
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : 'Unable to retrieve your location.'
          );
        } finally {
          setLocationLoading(
            false
          );
        }
      },
      []
    );

  useFocusEffect(
    useCallback(
      () => {
        loadLocation();
      },
      [loadLocation]
    )
  );

  // ==========================================================
  // CONTINUE
  // ==========================================================

  function handleContinue() {
    if (
      latitude === null ||
      longitude === null
    ) {
      setErrorMessage(
        'Update your location before continuing.'
      );

      return;
    }

    router.push({
      pathname:
        '/donor-application/verification',

      params: {
        ...params,

        current_latitude:
          String(
            latitude
          ),

        current_longitude:
          String(
            longitude
          ),

        travel_radius_km:
          String(
            travelRadius
          ),

        availability_status:
          availability,

        allow_urgent_requests:
          allowUrgent
            ? 'true'
            : 'false',
      },
    } as any);
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
                Step 3 of 4
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
                  <View
                    style={[
                      styles.progressLine,
                      styles.progressActive,
                    ]}
                  />

                  <View
                    style={[
                      styles.progressLine,
                      styles.progressActive,
                    ]}
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
                    styles.title
                  }
                >
                  Location & Availability
                </Text>

                <Text
                  style={
                    styles.description
                  }
                >
                  Tell Hemo-Hero where you can help and when you are available.
                </Text>

                {/* LOCATION */}

                <Text
                  style={
                    styles.label
                  }
                >
                  Current Location
                </Text>

                <View
                  style={
                    styles.locationCard
                  }
                >
                  <View
                    style={
                      styles.locationIcon
                    }
                  >
                    <MaterialIcons
                      name="location-on"
                      size={21}
                      color={
                        COLORS.redButton
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.locationContent
                    }
                  >
                    <Text
                      style={
                        styles.locationTitle
                      }
                    >
                      {locationLabel}
                    </Text>

                    <Text
                      style={
                        styles.locationSubtitle
                      }
                    >
                      {locationLoading
                        ? 'Getting current location...'
                        : latitude !== null
                          ? 'Current location ready'
                          : 'Location unavailable'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    onPress={
                      loadLocation
                    }
                  >
                    <Text
                      style={
                        styles.updateText
                      }
                    >
                      Update
                    </Text>
                  </TouchableOpacity>
                </View>

                {/* DISTANCE */}

                <Text
                  style={
                    styles.label
                  }
                >
                  How far are you willing to travel?
                </Text>

                <View
                  style={
                    styles.distanceRow
                  }
                >
                  {DISTANCES.map(
                    distance => {
                      const selected =
                        travelRadius ===
                        distance;

                      return (
                        <TouchableOpacity
                          key={
                            distance
                          }
                          style={[
                            styles.distanceButton,

                            selected &&
                              styles.distanceButtonSelected,
                          ]}
                          onPress={() =>
                            setTravelRadius(
                              distance
                            )
                          }
                        >
                          <Text
                            style={[
                              styles.distanceText,

                              selected &&
                                styles.distanceTextSelected,
                            ]}
                          >
                            {distance} km
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </View>

                {/* AVAILABILITY */}

                <Text
                  style={
                    styles.label
                  }
                >
                  Availability
                </Text>

                <TouchableOpacity
                  style={[
                    styles.choiceCard,

                    availability ===
                      'available' &&
                      styles.choiceSelected,
                  ]}
                  onPress={() =>
                    setAvailability(
                      'available'
                    )
                  }
                >
                  <MaterialIcons
                    name={
                      availability ===
                      'available'
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={19}
                    color={
                      availability ===
                      'available'
                        ? COLORS.green
                        : COLORS.muted
                    }
                  />

                  <View
                    style={
                      styles.choiceContent
                    }
                  >
                    <Text
                      style={
                        styles.choiceTitle
                      }
                    >
                      Available to Donate
                    </Text>

                    <Text
                      style={
                        styles.choiceDescription
                      }
                    >
                      Include me in compatible donor matching.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.choiceCard,

                    availability ===
                      'unavailable' &&
                      styles.choiceSelected,
                  ]}
                  onPress={() =>
                    setAvailability(
                      'unavailable'
                    )
                  }
                >
                  <MaterialIcons
                    name={
                      availability ===
                      'unavailable'
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={19}
                    color={
                      availability ===
                      'unavailable'
                        ? COLORS.redButton
                        : COLORS.muted
                    }
                  />

                  <View
                    style={
                      styles.choiceContent
                    }
                  >
                    <Text
                      style={
                        styles.choiceTitle
                      }
                    >
                      Temporarily Unavailable
                    </Text>

                    <Text
                      style={
                        styles.choiceDescription
                      }
                    >
                      Keep my donor profile but pause matching.
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* URGENT */}

                <Text
                  style={
                    styles.label
                  }
                >
                  Emergency Requests
                </Text>

                <TouchableOpacity
                  style={
                    styles.urgentCard
                  }
                  onPress={() =>
                    setAllowUrgent(
                      current =>
                        !current
                    )
                  }
                >
                  <MaterialIcons
                    name={
                      allowUrgent
                        ? 'check-box'
                        : 'check-box-outline-blank'
                    }
                    size={22}
                    color={
                      allowUrgent
                        ? COLORS.redButton
                        : COLORS.muted
                    }
                  />

                  <View
                    style={
                      styles.choiceContent
                    }
                  >
                    <Text
                      style={
                        styles.choiceTitle
                      }
                    >
                      Notify me about urgent requests
                    </Text>

                    <Text
                      style={
                        styles.choiceDescription
                      }
                    >
                      Receive urgent compatible requests within your travel range.
                    </Text>
                  </View>
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
                    style={
                      styles.continueButton
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

      borderRadius: 27,

      overflow: 'hidden',

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
      marginBottom: 20,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 15,
    },

    label: {
      marginBottom: 8,
      marginTop: 3,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10,
    },

    locationCard: {
      minHeight: 68,

      marginBottom: 20,

      paddingHorizontal: 11,

      flexDirection: 'row',

      alignItems: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 12,

      backgroundColor:
        COLORS.white,
    },

    locationIcon: {
      width: 39,
      height: 39,

      borderRadius: 12,

      alignItems: 'center',
      justifyContent: 'center',

      marginRight: 10,

      backgroundColor:
        COLORS.pink,
    },

    locationContent: {
      flex: 1,
    },

    locationTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 10.5,
    },

    locationSubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.5,
    },

    updateText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    distanceRow: {
      flexDirection: 'row',

      justifyContent:
        'space-between',

      marginBottom: 21,
    },

    distanceButton: {
      width: '18%',

      height: 38,

      alignItems: 'center',
      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 10,

      backgroundColor:
        COLORS.white,
    },

    distanceButtonSelected: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    distanceText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize: 8,
    },

    distanceTextSelected: {
      color:
        COLORS.white,
    },

    choiceCard: {
      minHeight: 60,

      marginBottom: 9,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 9,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.white,
    },

    choiceSelected: {
      borderColor:
        '#DFAAAA',

      backgroundColor:
        '#FFF8F8',
    },

    choiceContent: {
      flex: 1,
    },

    choiceTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 9.5,
    },

    choiceDescription: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 8.2,

      lineHeight: 12,
    },

    urgentCard: {
      minHeight: 66,

      paddingHorizontal: 12,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 9,

      borderRadius: 11,

      borderWidth: 1,

      borderColor:
        '#EAB7B7',

      backgroundColor:
        COLORS.pink,
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
      flex: 0.8,

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

      fontSize: 10.5,
    },

    continueButton: {
      flex: 1.2,

      height: 49,

      flexDirection: 'row',

      alignItems: 'center',
      justifyContent: 'center',

      gap: 6,

      borderRadius: 10,

      backgroundColor:
        COLORS.redButton,
    },

    continueText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 10.5,
    },
  });