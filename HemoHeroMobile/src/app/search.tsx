import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Alert,
  Image,
  Platform,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

import {
  MaterialIcons,
} from '@expo/vector-icons';

import {
  LinearGradient,
} from 'expo-linear-gradient';

import Slider from '@react-native-community/slider';

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

import * as Location from 'expo-location';

import MainBottomNav from '../components/MainBottomNav';

import {
  getNearbyBloodRequests,
} from '../lib/nearbyRequests';

import type {
  NearbyBloodRequest,
} from '../lib/nearbyRequests';

import {
  getNearbyDonors,
} from '../lib/nearbyDonors';

import type {
  NearbyDonor,
} from '../lib/nearbyDonors';

import {
  getMyDonorApplication,
} from '../lib/donorApplication';

import {
  getAccessToken,
} from '../lib/session';

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  red: '#D31217',
  redDark: '#8F1014',
  redButton: '#C62828',

  white: '#FFFFFF',
  black: '#1D1D1F',

  page: '#F7F7F8',
  card: '#FFFFFF',

  muted: '#6E6E73',
  lightMuted: '#A0A0A5',

  border: '#E7E7EA',

  pinkSoft: '#FFF1F2',

  green: '#178B49',
  greenSoft: '#EAF7EF',

  orange: '#DD7A20',
  orangeSoft: '#FFF3E7',
};

// ============================================================
// BLOOD TYPES
//
// These are only used when searching for DONORS.
// The Requests tab automatically uses the logged-in donor's
// approved verified blood type.
// ============================================================

const BLOOD_TYPES = [
  'All',
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
// TYPES
// ============================================================

type SearchMode =
  | 'donors'
  | 'requests';

type RequestUrgency =
  | 'all'
  | 'urgent'
  | 'needed';

type SortType =
  | 'nearest'
  | 'recent';

// ============================================================
// HELPERS
// ============================================================

function normalizeBloodType(
  value?:
    | string
    | null
) {
  if (!value) {
    return '';
  }

  return String(
    value
  )
    .trim()
    .toUpperCase();
}

// ============================================================
// SEARCH SCREEN
// ============================================================

export default function SearchScreen() {
  // ==========================================================
  // MODE
  // ==========================================================

  const [
    searchMode,
    setSearchMode,
  ] =
    useState<SearchMode>(
      'donors'
    );

  // ==========================================================
  // SEARCH
  // ==========================================================

  const [
    searchText,
    setSearchText,
  ] =
    useState('');

  // ==========================================================
  // DONOR SEARCH BLOOD TYPE
  //
  // Only used in the DONORS tab.
  // ==========================================================

  const [
    selectedBloodType,
    setSelectedBloodType,
  ] =
    useState(
      'All'
    );

  // ==========================================================
  // VERIFIED DONOR BLOOD TYPE
  //
  // Used automatically by the REQUESTS tab.
  // ==========================================================

  const [
    verifiedDonorBloodType,
    setVerifiedDonorBloodType,
  ] =
    useState<
      string | null
    >(null);

  const [
    donorEligibilityMessage,
    setDonorEligibilityMessage,
  ] =
    useState('');

  // ==========================================================
  // DISTANCE
  // ==========================================================

  const [
    sliderDistance,
    setSliderDistance,
  ] =
    useState(
      25
    );

  const [
    radiusKm,
    setRadiusKm,
  ] =
    useState(
      25
    );

  // ==========================================================
  // REQUEST FILTER
  // ==========================================================

  const [
    requestUrgency,
    setRequestUrgency,
  ] =
    useState<RequestUrgency>(
      'all'
    );

  // ==========================================================
  // DONOR FILTER
  // ==========================================================

  const [
    urgentReadyOnly,
    setUrgentReadyOnly,
  ] =
    useState(
      false
    );

  // ==========================================================
  // SORT
  // ==========================================================

  const [
    sortType,
    setSortType,
  ] =
    useState<SortType>(
      'nearest'
    );

  // ==========================================================
  // DATA
  // ==========================================================

  const [
    donors,
    setDonors,
  ] =
    useState<
      NearbyDonor[]
    >([]);

  const [
    requests,
    setRequests,
  ] =
    useState<
      NearbyBloodRequest[]
    >([]);

  // ==========================================================
  // LOCATION
  // ==========================================================

  const [
    locationLabel,
    setLocationLabel,
  ] =
    useState(
      'Your current location'
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    loading,
    setLoading,
  ] =
    useState(
      true
    );

  const [
    refreshing,
    setRefreshing,
  ] =
    useState(
      false
    );

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    locationPermissionDenied,
    setLocationPermissionDenied,
  ] =
    useState(
      false
    );

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
  // LOCATION LABEL
  // ==========================================================

  async function resolveLocationLabel(
    latitude: number,
    longitude: number
  ) {
    try {
      const places =
        await Location
          .reverseGeocodeAsync({
            latitude,
            longitude,
          });

      const place =
        places?.[0];

      if (!place) {
        setLocationLabel(
          'Your current location'
        );

        return;
      }

      const first =
        place.city ||
        place.district ||
        place.subregion ||
        '';

      const second =
        place.region ||
        '';

      const parts =
        [
          first,
          second,
        ].filter(
          Boolean
        );

      setLocationLabel(
        parts.length
          ? parts.join(
              ', '
            )
          : 'Your current location'
      );
    } catch (
      error
    ) {
      console.log(
        'SEARCH LOCATION LABEL ERROR:',
        error
      );

      setLocationLabel(
        'Your current location'
      );
    }
  }

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadSearchData =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (!silent) {
            setLoading(
              true
            );
          }

          setErrorMessage(
            ''
          );

          setLocationPermissionDenied(
            false
          );

          setDonorEligibilityMessage(
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

          // ==================================================
          // REQUEST TAB
          //
          // Before loading requests, retrieve the donor's
          // APPROVED verified blood type.
          // ==================================================

          let currentDonorBloodType:
            string | null =
            null;

          if (
            searchMode ===
            'requests'
          ) {
            try {
              const donorData =
                await getMyDonorApplication(
                  token
                );

              const application =
                donorData?.application ||
                null;

              if (
                !application ||
                application.status !==
                  'approved' ||
                !application.blood_type
              ) {
                setVerifiedDonorBloodType(
                  null
                );

                setRequests(
                  []
                );

                setDonorEligibilityMessage(
                  'You must be a verified donor with an approved blood type before viewing donation requests.'
                );

                return;
              }

              currentDonorBloodType =
                normalizeBloodType(
                  application.blood_type
                );

              setVerifiedDonorBloodType(
                currentDonorBloodType
              );
            } catch (
              donorError
            ) {
              console.log(
                'SEARCH DONOR VERIFICATION ERROR:',
                donorError
              );

              setVerifiedDonorBloodType(
                null
              );

              setRequests(
                []
              );

              setDonorEligibilityMessage(
                donorError instanceof
                  Error
                  ? donorError.message
                  : 'Unable to verify your donor information.'
              );

              return;
            }
          }

          // ==================================================
          // LOCATION PERMISSION
          // ==================================================

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
            setErrorMessage(
              'Location access is needed to find nearby donors and blood requests.'
            );

            setLocationPermissionDenied(
              true
            );

            return;
          }

          // ==================================================
          // CURRENT LOCATION
          // ==================================================

          const currentLocation =
            await Location
              .getCurrentPositionAsync({
                accuracy:
                  Location
                    .Accuracy
                    .Balanced,
              });

          const latitude =
            currentLocation
              .coords
              .latitude;

          const longitude =
            currentLocation
              .coords
              .longitude;

          void resolveLocationLabel(
            latitude,
            longitude
          );

          // ==================================================
          // DONORS TAB
          // ==================================================

          if (
            searchMode ===
            'donors'
          ) {
            const donorResult =
              await getNearbyDonors(
                token,
                {
                  latitude,
                  longitude,

                  radiusKm,

                  neededBloodType:
                    selectedBloodType ===
                    'All'
                      ? null
                      : selectedBloodType,

                  urgentOnly:
                    urgentReadyOnly,

                  limit:
                    100,
                }
              );

            setDonors(
              donorResult
                .donors ||
                []
            );

            return;
          }

          // ==================================================
          // REQUESTS TAB
          //
          // Nearby endpoint may currently return requests for
          // different blood types. We filter them here using
          // the APPROVED donor application blood type.
          //
          // The backend donor-response validation still
          // independently blocks mismatched donation offers.
          // ==================================================

          const requestResult =
            await getNearbyBloodRequests(
              token,
              latitude,
              longitude,
              radiusKm,
              100
            );

          const matchingRequests =
            (
              requestResult
                .requests ||
              []
            ).filter(
              request =>
                request.status ===
                  'active' &&
                normalizeBloodType(
                  request.blood_type
                ) ===
                  currentDonorBloodType
            );

          setRequests(
            matchingRequests
          );
        } catch (
          error
        ) {
          console.log(
            'SEARCH LOAD ERROR:',
            error
          );

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : 'Unable to load search results.'
          );
        } finally {
          if (!silent) {
            setLoading(
              false
            );
          }
        }
      },
      [
        searchMode,
        radiusKm,
        selectedBloodType,
        urgentReadyOnly,
      ]
    );

  // ==========================================================
  // LOAD WHEN SCREEN OPENS / FILTER CHANGES
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadSearchData();
      },
      [
        loadSearchData,
      ]
    )
  );

  // ==========================================================
  // REFRESH
  // ==========================================================

  async function handleRefresh() {
    try {
      setRefreshing(
        true
      );

      await loadSearchData(
        true
      );
    } finally {
      setRefreshing(
        false
      );
    }
  }

  // ==========================================================
  // DONORS FILTERED LOCALLY
  // ==========================================================

  const visibleDonors =
    useMemo(
      () => {
        const query =
          searchText
            .trim()
            .toLowerCase();

        const filtered =
          donors.filter(
            donor => {
              if (!query) {
                return true;
              }

              const searchable =
                [
                  donor.full_name,
                  donor.blood_type,
                  donor.city,
                  donor.province,
                ]
                  .filter(
                    Boolean
                  )
                  .join(' ')
                  .toLowerCase();

              return searchable.includes(
                query
              );
            }
          );

        return [
          ...filtered,
        ].sort(
          (
            first,
            second
          ) => {
            if (
              sortType ===
              'recent'
            ) {
              return (
                new Date(
                  second.updated_at ||
                    0
                ).getTime() -
                new Date(
                  first.updated_at ||
                    0
                ).getTime()
              );
            }

            return (
              first.distance_km -
              second.distance_km
            );
          }
        );
      },
      [
        donors,
        searchText,
        sortType,
      ]
    );

  // ==========================================================
  // REQUESTS FILTERED LOCALLY
  //
  // Blood type is no longer user-selectable here.
  // Requests have already been restricted to the verified
  // donor's exact blood type.
  // ==========================================================

  const visibleRequests =
    useMemo(
      () => {
        const query =
          searchText
            .trim()
            .toLowerCase();

        const filtered =
          requests.filter(
            request => {
              if (
                requestUrgency !==
                  'all' &&
                request.urgency !==
                  requestUrgency
              ) {
                return false;
              }

              if (query) {
                const searchable =
                  [
                    request
                      .facility_name,

                    request
                      .facility_address,

                    request
                      .facility_type,

                    request
                      .blood_type,
                  ]
                    .filter(
                      Boolean
                    )
                    .join(' ')
                    .toLowerCase();

                if (
                  !searchable.includes(
                    query
                  )
                ) {
                  return false;
                }
              }

              return true;
            }
          );

        return [
          ...filtered,
        ].sort(
          (
            first,
            second
          ) => {
            if (
              sortType ===
              'recent'
            ) {
              return (
                new Date(
                  second.created_at
                ).getTime() -
                new Date(
                  first.created_at
                ).getTime()
              );
            }

            return (
              first.distance_km -
              second.distance_km
            );
          }
        );
      },
      [
        requests,
        searchText,
        requestUrgency,
        sortType,
      ]
    );

  // ==========================================================
  // CHANGE MODE
  // ==========================================================

  function changeMode(
    mode: SearchMode
  ) {
    if (
      mode ===
      searchMode
    ) {
      return;
    }

    setSearchMode(
      mode
    );

    setSearchText(
      ''
    );

    setSelectedBloodType(
      'All'
    );

    setRequestUrgency(
      'all'
    );

    setUrgentReadyOnly(
      false
    );

    setSortType(
      'nearest'
    );

    setDonorEligibilityMessage(
      ''
    );
  }

  // ==========================================================
  // DISTANCE SLIDER
  // ==========================================================

  function handleDistanceComplete(
    value: number
  ) {
    const rounded =
      Math.round(
        value /
          5
      ) *
      5;

    setSliderDistance(
      rounded
    );

    if (
      rounded !==
      radiusKm
    ) {
      setRadiusKm(
        rounded
      );
    }
  }

  // ==========================================================
  // RESET FILTERS
  // ==========================================================

  function resetFilters() {
    setSearchText(
      ''
    );

    setSelectedBloodType(
      'All'
    );

    setRequestUrgency(
      'all'
    );

    setUrgentReadyOnly(
      false
    );

    setSortType(
      'nearest'
    );

    setSliderDistance(
      25
    );

    setRadiusKm(
      25
    );
  }

  // ==========================================================
  // OPEN BLOOD REQUEST
  // ==========================================================

  function openRequest(
    request:
      NearbyBloodRequest
  ) {
    router.push(
      `/blood-request/donor/${request.id}` as any
    );
  }

  // ==========================================================
  // OPEN DONOR PROFILE
  // ==========================================================

  function openDonor(
    donor:
      NearbyDonor
  ) {
    router.push(
      `/donor/${donor.id}` as any
    );
  }

  // ==========================================================
  // MAP
  // ==========================================================

  function openMap() {
    showMessage(
      'Map View',
      searchMode ===
        'donors'
        ? 'The donor map will display verified donors using privacy-safe approximate locations.'
        : 'The request map will display nearby matching blood requests using the same filters.'
    );
  }

  // ==========================================================
  // TIME AGO
  // ==========================================================

  function getTimeAgo(
    value?:
      | string
      | null
  ) {
    if (!value) {
      return '';
    }

    const date =
      new Date(
        value
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    const minutes =
      Math.max(
        0,
        Math.floor(
          (
            Date.now() -
            date.getTime()
          ) /
            60000
        )
      );

    if (
      minutes <
      1
    ) {
      return 'Just now';
    }

    if (
      minutes <
      60
    ) {
      return `${minutes}m ago`;
    }

    const hours =
      Math.floor(
        minutes /
          60
      );

    if (
      hours <
      24
    ) {
      return `${hours}h ago`;
    }

    const days =
      Math.floor(
        hours /
          24
      );

    return `${days}d ago`;
  }

  // ==========================================================
  // REQUEST DATE
  // ==========================================================

  function formatRequestDate(
    request:
      NearbyBloodRequest
  ) {
    if (
      request.urgency ===
      'urgent'
    ) {
      return 'As soon as possible';
    }

    if (
      !request.needed_date
    ) {
      return 'Date not specified';
    }

    const date =
      new Date(
        `${request.needed_date}T00:00:00`
      );

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return request
        .needed_date;
    }

    return date.toLocaleDateString(
      'en-US',
      {
        month:
          'short',

        day:
          'numeric',

        year:
          'numeric',
      }
    );
  }

  // ==========================================================
  // ACTIVE FILTERS
  // ==========================================================

  const hasFilters =
    Boolean(
      searchText.trim()
    ) ||
    radiusKm !==
      25 ||
    sortType !==
      'nearest' ||
    (
      searchMode ===
        'requests' &&
      requestUrgency !==
        'all'
    ) ||
    (
      searchMode ===
        'donors' &&
      selectedBloodType !==
        'All'
    ) ||
    (
      searchMode ===
        'donors' &&
      urgentReadyOnly
    );

  const resultCount =
    searchMode ===
      'donors'
      ? visibleDonors.length
      : visibleRequests.length;

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

          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              '#D9191E',
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
                styles.headerTitleRow
              }
            >
              <View
                style={
                  styles.headerTitleContent
                }
              >
                <Text
                  style={
                    styles.eyebrow
                  }
                >
                  DISCOVER
                </Text>

                <Text
                  style={
                    styles.headerTitle
                  }
                >
                  Search
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                >
                  Find donors and blood requests near you
                </Text>
              </View>

              <TouchableOpacity
                style={
                  styles.mapButton
                }
                activeOpacity={
                  0.8
                }
                onPress={
                  openMap
                }
              >
                <MaterialIcons
                  name="map"
                  size={18}
                  color={
                    COLORS.white
                  }
                />

                <Text
                  style={
                    styles.mapButtonText
                  }
                >
                  Map
                </Text>
              </TouchableOpacity>
            </View>

            {/* SEARCH BAR */}

            <View
              style={
                styles.searchBar
              }
            >
              <MaterialIcons
                name="search"
                size={21}
                color={
                  COLORS.lightMuted
                }
              />

              <TextInput
                value={
                  searchText
                }
                onChangeText={
                  setSearchText
                }
                placeholder={
                  searchMode ===
                  'donors'
                    ? 'Name, location, or blood type'
                    : 'Hospital or location'
                }
                placeholderTextColor="#A6A6AA"
                style={
                  styles.searchInput
                }
                returnKeyType="search"
              />

              {searchText ? (
                <TouchableOpacity
                  style={
                    styles.clearButton
                  }
                  onPress={() =>
                    setSearchText(
                      ''
                    )
                  }
                >
                  <MaterialIcons
                    name="close"
                    size={18}
                    color={
                      COLORS.muted
                    }
                  />
                </TouchableOpacity>
              ) : null}
            </View>
          </LinearGradient>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            style={
              styles.content
            }
            contentContainerStyle={
              styles.contentContainer
            }
            showsVerticalScrollIndicator={
              false
            }
            refreshControl={
              <RefreshControl
                refreshing={
                  refreshing
                }
                onRefresh={
                  handleRefresh
                }
                tintColor={
                  COLORS.redButton
                }
              />
            }
          >
            {/* ==================================================
                DONORS / REQUESTS
            ================================================== */}

            <View
              style={
                styles.modeContainer
              }
            >
              <TouchableOpacity
                style={[
                  styles.modeButton,

                  searchMode ===
                    'donors' &&
                    styles.modeButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  changeMode(
                    'donors'
                  )
                }
              >
                <MaterialIcons
                  name="people"
                  size={17}
                  color={
                    searchMode ===
                    'donors'
                      ? COLORS.white
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.modeText,

                    searchMode ===
                      'donors' &&
                      styles.modeTextActive,
                  ]}
                >
                  Donors
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.modeButton,

                  searchMode ===
                    'requests' &&
                    styles.modeButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  changeMode(
                    'requests'
                  )
                }
              >
                <MaterialIcons
                  name="bloodtype"
                  size={17}
                  color={
                    searchMode ===
                    'requests'
                      ? COLORS.white
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.modeText,

                    searchMode ===
                      'requests' &&
                      styles.modeTextActive,
                  ]}
                >
                  Requests
                </Text>
              </TouchableOpacity>
            </View>

            {/* ==================================================
                FILTER HEADER
            ================================================== */}

            <View
              style={
                styles.filterHeader
              }
            >
              <View
                style={
                  styles.filterTitleRow
                }
              >
                <MaterialIcons
                  name="tune"
                  size={18}
                  color={
                    COLORS.black
                  }
                />

                <Text
                  style={
                    styles.filterTitle
                  }
                >
                  Filters
                </Text>
              </View>

              {hasFilters ? (
                <TouchableOpacity
                  onPress={
                    resetFilters
                  }
                >
                  <Text
                    style={
                      styles.resetText
                    }
                  >
                    Reset
                  </Text>
                </TouchableOpacity>
              ) : null}
            </View>

            {/* ==================================================
                DONOR BLOOD TYPE FILTER
            ================================================== */}

            {searchMode ===
            'donors' ? (
              <>
                <Text
                  style={
                    styles.filterLabel
                  }
                >
                  Blood Type Needed
                </Text>

                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={
                    false
                  }
                  style={
                    styles.bloodTypeScroll
                  }
                  contentContainerStyle={
                    styles.bloodTypeRow
                  }
                >
                  {BLOOD_TYPES.map(
                    bloodType => {
                      const active =
                        selectedBloodType ===
                        bloodType;

                      return (
                        <TouchableOpacity
                          key={
                            bloodType
                          }
                          style={[
                            styles.bloodChip,

                            active &&
                              styles.bloodChipActive,
                          ]}
                          activeOpacity={
                            0.8
                          }
                          onPress={() =>
                            setSelectedBloodType(
                              bloodType
                            )
                          }
                        >
                          {bloodType !==
                          'All' ? (
                            <MaterialIcons
                              name="bloodtype"
                              size={14}
                              color={
                                active
                                  ? COLORS.white
                                  : COLORS.redButton
                              }
                            />
                          ) : null}

                          <Text
                            style={[
                              styles.bloodChipText,

                              active &&
                                styles.bloodChipTextActive,
                            ]}
                          >
                            {
                              bloodType
                            }
                          </Text>
                        </TouchableOpacity>
                      );
                    }
                  )}
                </ScrollView>
              </>
            ) : (
              <View
                style={
                  styles.matchCard
                }
              >
                <View
                  style={
                    styles.matchIcon
                  }
                >
                  <MaterialIcons
                    name={
                      verifiedDonorBloodType
                        ? 'verified'
                        : 'info-outline'
                    }
                    size={19}
                    color={
                      verifiedDonorBloodType
                        ? COLORS.green
                        : COLORS.redButton
                    }
                  />
                </View>

                <View
                  style={
                    styles.matchContent
                  }
                >
                  <Text
                    style={
                      styles.matchTitle
                    }
                  >
                    {verifiedDonorBloodType
                      ? 'Matching Your Blood Type'
                      : 'Verified Donor Required'}
                  </Text>

                  <Text
                    style={
                      styles.matchDescription
                    }
                  >
                    {verifiedDonorBloodType
                      ? `Only active ${verifiedDonorBloodType} requests are shown because your verified donor blood type is ${verifiedDonorBloodType}.`
                      : 'Only verified donors can browse donation requests.'}
                  </Text>
                </View>

                {verifiedDonorBloodType ? (
                  <View
                    style={
                      styles.matchBloodBadge
                    }
                  >
                    <MaterialIcons
                      name="bloodtype"
                      size={14}
                      color={
                        COLORS.white
                      }
                    />

                    <Text
                      style={
                        styles.matchBloodText
                      }
                    >
                      {
                        verifiedDonorBloodType
                      }
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {/* ==================================================
                DISTANCE
            ================================================== */}

            <View
              style={
                styles.distanceCard
              }
            >
              <View
                style={
                  styles.distanceHeader
                }
              >
                <View
                  style={
                    styles.distanceHeaderLeft
                  }
                >
                  <Text
                    style={
                      styles.distanceTitle
                    }
                  >
                    Distance
                  </Text>

                  <View
                    style={
                      styles.locationRow
                    }
                  >
                    <MaterialIcons
                      name="location-on"
                      size={14}
                      color={
                        COLORS.redButton
                      }
                    />

                    <Text
                      numberOfLines={
                        1
                      }
                      style={
                        styles.locationText
                      }
                    >
                      Near {locationLabel}
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.locationHelper
                    }
                  >
                    Using your current location
                  </Text>
                </View>

                <View
                  style={
                    styles.radiusBadge
                  }
                >
                  <Text
                    style={
                      styles.radiusBadgeText
                    }
                  >
                    Within {sliderDistance} km
                  </Text>
                </View>
              </View>

              <Slider
                style={
                  styles.slider
                }
                minimumValue={
                  5
                }
                maximumValue={
                  50
                }
                step={
                  5
                }
                value={
                  sliderDistance
                }
                minimumTrackTintColor={
                  COLORS.redButton
                }
                maximumTrackTintColor="#DADADD"
                thumbTintColor={
                  COLORS.redButton
                }
                onValueChange={
                  value =>
                    setSliderDistance(
                      Math.round(
                        value
                      )
                    )
                }
                onSlidingComplete={
                  handleDistanceComplete
                }
              />

              <View
                style={
                  styles.sliderLabels
                }
              >
                <Text
                  style={
                    styles.sliderLabel
                  }
                >
                  5 km
                </Text>

                <Text
                  style={
                    styles.sliderLabel
                  }
                >
                  15 km
                </Text>

                <Text
                  style={
                    styles.sliderLabel
                  }
                >
                  25 km
                </Text>

                <Text
                  style={
                    styles.sliderLabel
                  }
                >
                  40 km
                </Text>

                <Text
                  style={
                    styles.sliderLabel
                  }
                >
                  50 km
                </Text>
              </View>
            </View>

            {/* ==================================================
                REQUEST FILTERS
            ================================================== */}

            {searchMode ===
            'requests' ? (
              <>
                <Text
                  style={
                    styles.filterLabel
                  }
                >
                  Urgency
                </Text>

                <View
                  style={
                    styles.threeButtonRow
                  }
                >
                  <FilterButton
                    label="All"
                    icon="format-list-bulleted"
                    active={
                      requestUrgency ===
                      'all'
                    }
                    onPress={() =>
                      setRequestUrgency(
                        'all'
                      )
                    }
                  />

                  <FilterButton
                    label="Urgent"
                    icon="bolt"
                    active={
                      requestUrgency ===
                      'urgent'
                    }
                    onPress={() =>
                      setRequestUrgency(
                        'urgent'
                      )
                    }
                  />

                  <FilterButton
                    label="Scheduled"
                    icon="schedule"
                    active={
                      requestUrgency ===
                      'needed'
                    }
                    onPress={() =>
                      setRequestUrgency(
                        'needed'
                      )
                    }
                  />
                </View>
              </>
            ) : (
              <>
                <Text
                  style={
                    styles.filterLabel
                  }
                >
                  Availability
                </Text>

                <TouchableOpacity
                  style={[
                    styles.urgentReadyButton,

                    urgentReadyOnly &&
                      styles.urgentReadyButtonActive,
                  ]}
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    setUrgentReadyOnly(
                      current =>
                        !current
                    )
                  }
                >
                  <View
                    style={
                      styles.urgentReadyLeft
                    }
                  >
                    <View
                      style={[
                        styles.urgentReadyIcon,

                        urgentReadyOnly &&
                          styles.urgentReadyIconActive,
                      ]}
                    >
                      <MaterialIcons
                        name="bolt"
                        size={17}
                        color={
                          urgentReadyOnly
                            ? COLORS.white
                            : COLORS.orange
                        }
                      />
                    </View>

                    <View>
                      <Text
                        style={
                          styles.urgentReadyTitle
                        }
                      >
                        Urgent-ready donors
                      </Text>

                      <Text
                        style={
                          styles.urgentReadySubtitle
                        }
                      >
                        Donors who allow urgent requests
                      </Text>
                    </View>
                  </View>

                  <MaterialIcons
                    name={
                      urgentReadyOnly
                        ? 'check-circle'
                        : 'radio-button-unchecked'
                    }
                    size={21}
                    color={
                      urgentReadyOnly
                        ? COLORS.redButton
                        : COLORS.lightMuted
                    }
                  />
                </TouchableOpacity>
              </>
            )}

            {/* ==================================================
                RESULTS
            ================================================== */}

            <View
              style={
                styles.resultsHeader
              }
            >
              <View>
                <Text
                  style={
                    styles.resultsTitle
                  }
                >
                  {searchMode ===
                  'donors'
                    ? 'Nearby Donors'
                    : verifiedDonorBloodType
                      ? `${verifiedDonorBloodType} Requests Near You`
                      : 'Nearby Requests'}
                </Text>

                {!loading ? (
                  <Text
                    style={
                      styles.resultsCount
                    }
                  >
                    {resultCount}{' '}
                    {resultCount ===
                    1
                      ? 'result'
                      : 'results'}
                  </Text>
                ) : null}
              </View>

              <View
                style={
                  styles.sortContainer
                }
              >
                <TouchableOpacity
                  style={[
                    styles.sortButton,

                    sortType ===
                      'nearest' &&
                      styles.sortButtonActive,
                  ]}
                  onPress={() =>
                    setSortType(
                      'nearest'
                    )
                  }
                >
                  <MaterialIcons
                    name="near-me"
                    size={13}
                    color={
                      sortType ===
                      'nearest'
                        ? COLORS.redButton
                        : COLORS.muted
                    }
                  />

                  <Text
                    style={[
                      styles.sortText,

                      sortType ===
                        'nearest' &&
                        styles.sortTextActive,
                    ]}
                  >
                    Nearest
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[
                    styles.sortButton,

                    sortType ===
                      'recent' &&
                      styles.sortButtonActive,
                  ]}
                  onPress={() =>
                    setSortType(
                      'recent'
                    )
                  }
                >
                  <MaterialIcons
                    name="schedule"
                    size={13}
                    color={
                      sortType ===
                      'recent'
                        ? COLORS.redButton
                        : COLORS.muted
                    }
                  />

                  <Text
                    style={[
                      styles.sortText,

                      sortType ===
                        'recent' &&
                        styles.sortTextActive,
                    ]}
                  >
                    Recent
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* ==================================================
                LOADING
            ================================================== */}

            {loading ? (
              <StateCard
                loading
                title={
                  searchMode ===
                  'donors'
                    ? 'Finding Nearby Donors'
                    : 'Finding Matching Requests'
                }
                description={
                  searchMode ===
                    'requests' &&
                  verifiedDonorBloodType
                    ? `Searching for ${verifiedDonorBloodType} requests within ${radiusKm} km.`
                    : `Searching within ${radiusKm} km of your current location.`
                }
              />
            ) : null}

            {/* ==================================================
                DONOR ELIGIBILITY
            ================================================== */}

            {!loading &&
            searchMode ===
              'requests' &&
            donorEligibilityMessage ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.stateIcon
                  }
                >
                  <MaterialIcons
                    name="verified-user"
                    size={30}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  Verified Donor Required
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  {
                    donorEligibilityMessage
                  }
                </Text>

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  activeOpacity={
                    0.85
                  }
                  onPress={() =>
                    router.push(
                      '/profile' as any
                    )
                  }
                >
                  <MaterialIcons
                    name="person"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    View Donor Profile
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ==================================================
                ERROR
            ================================================== */}

            {!loading &&
            !donorEligibilityMessage &&
            errorMessage ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.stateIcon
                  }
                >
                  <MaterialIcons
                    name={
                      locationPermissionDenied
                        ? 'location-off'
                        : 'error-outline'
                    }
                    size={30}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  {locationPermissionDenied
                    ? 'Location Required'
                    : 'Unable to Search'}
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  {
                    errorMessage
                  }
                </Text>

                <TouchableOpacity
                  style={
                    styles.primaryButton
                  }
                  onPress={() =>
                    loadSearchData()
                  }
                >
                  <MaterialIcons
                    name="refresh"
                    size={17}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : null}

            {/* ==================================================
                EMPTY
            ================================================== */}

            {!loading &&
            !donorEligibilityMessage &&
            !errorMessage &&
            resultCount ===
              0 ? (
              <View
                style={
                  styles.stateCard
                }
              >
                <View
                  style={
                    styles.stateIcon
                  }
                >
                  <MaterialIcons
                    name={
                      searchMode ===
                      'donors'
                        ? 'person-search'
                        : 'search-off'
                    }
                    size={30}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.stateTitle
                  }
                >
                  {searchMode ===
                  'donors'
                    ? 'No Donors Found'
                    : 'No Matching Requests'}
                </Text>

                <Text
                  style={
                    styles.stateDescription
                  }
                >
                  {searchMode ===
                  'donors'
                    ? `No verified available donors match your filters within ${radiusKm} km.`
                    : verifiedDonorBloodType
                      ? `There are currently no active ${verifiedDonorBloodType} blood requests matching your filters within ${radiusKm} km.`
                      : `There are currently no matching blood requests within ${radiusKm} km.`}
                </Text>

                {hasFilters ? (
                  <TouchableOpacity
                    style={
                      styles.secondaryButton
                    }
                    onPress={
                      resetFilters
                    }
                  >
                    <Text
                      style={
                        styles.secondaryButtonText
                      }
                    >
                      Clear Filters
                    </Text>
                  </TouchableOpacity>
                ) : null}
              </View>
            ) : null}

            {/* ==================================================
                DONOR CARDS
            ================================================== */}

            {!loading &&
            !errorMessage &&
            searchMode ===
              'donors'
              ? visibleDonors.map(
                  donor => (
                    <TouchableOpacity
                      key={
                        donor.id
                      }
                      style={
                        styles.donorCard
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        openDonor(
                          donor
                        )
                      }
                    >
                      <View
                        style={
                          styles.donorTop
                        }
                      >
                        <View
                          style={
                            styles.avatar
                          }
                        >
                          {donor.profile_photo_url ? (
                            <Image
                              source={{
                                uri:
                                  donor.profile_photo_url,
                              }}
                              style={
                                styles.avatarImage
                              }
                              resizeMode="cover"
                            />
                          ) : (
                            <MaterialIcons
                              name="person"
                              size={30}
                              color={
                                COLORS.redDark
                              }
                            />
                          )}
                        </View>

                        <View
                          style={
                            styles.donorMain
                          }
                        >
                          <View
                            style={
                              styles.nameRow
                            }
                          >
                            <Text
                              numberOfLines={
                                1
                              }
                              style={
                                styles.donorName
                              }
                            >
                              {
                                donor.full_name
                              }
                            </Text>

                            {donor.verified ? (
                              <MaterialIcons
                                name="verified"
                                size={16}
                                color={
                                  COLORS.green
                                }
                              />
                            ) : null}
                          </View>

                          <View
                            style={
                              styles.donorLocationRow
                            }
                          >
                            <MaterialIcons
                              name="location-on"
                              size={13}
                              color={
                                COLORS.lightMuted
                              }
                            />

                            <Text
                              numberOfLines={
                                1
                              }
                              style={
                                styles.donorLocation
                              }
                            >
                              {[
                                donor.city,
                                donor.province,
                              ]
                                .filter(
                                  Boolean
                                )
                                .join(
                                  ', '
                                ) ||
                                'Location unavailable'}
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.donorBloodBadge
                          }
                        >
                          <MaterialIcons
                            name="bloodtype"
                            size={16}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.donorBloodText
                            }
                          >
                            {
                              donor.blood_type
                            }
                          </Text>
                        </View>
                      </View>

                      <View
                        style={
                          styles.donorBadgeRow
                        }
                      >
                        <View
                          style={
                            styles.availableBadge
                          }
                        >
                          <View
                            style={
                              styles.availableDot
                            }
                          />

                          <Text
                            style={
                              styles.availableText
                            }
                          >
                            Available
                          </Text>
                        </View>

                        <View
                          style={
                            styles.verifiedBadge
                          }
                        >
                          <MaterialIcons
                            name="verified"
                            size={12}
                            color={
                              COLORS.green
                            }
                          />

                          <Text
                            style={
                              styles.verifiedBadgeText
                            }
                          >
                            Verified Donor
                          </Text>
                        </View>

                        {donor.allow_urgent_requests ? (
                          <View
                            style={
                              styles.urgentBadge
                            }
                          >
                            <MaterialIcons
                              name="bolt"
                              size={12}
                              color={
                                COLORS.orange
                              }
                            />

                            <Text
                              style={
                                styles.urgentBadgeText
                              }
                            >
                              Urgent Ready
                            </Text>
                          </View>
                        ) : null}
                      </View>

                      <View
                        style={
                          styles.donorInfoBox
                        }
                      >
                        <View
                          style={
                            styles.donorInfoItem
                          }
                        >
                          <MaterialIcons
                            name="near-me"
                            size={16}
                            color={
                              COLORS.redButton
                            }
                          />

                          <View>
                            <Text
                              style={
                                styles.infoSmallLabel
                              }
                            >
                              Distance
                            </Text>

                            <Text
                              style={
                                styles.infoValue
                              }
                            >
                              {donor.distance_km.toFixed(
                                1
                              )}{' '}
                              km away
                            </Text>
                          </View>
                        </View>

                        <View
                          style={
                            styles.infoDivider
                          }
                        />

                        <View
                          style={
                            styles.donorInfoItem
                          }
                        >
                          <MaterialIcons
                            name="directions-car"
                            size={16}
                            color={
                              COLORS.redButton
                            }
                          />

                          <View>
                            <Text
                              style={
                                styles.infoSmallLabel
                              }
                            >
                              Travel Range
                            </Text>

                            <Text
                              style={
                                styles.infoValue
                              }
                            >
                              {donor.travel_radius_km
                                ? `Up to ${donor.travel_radius_km} km`
                                : 'Not specified'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      <View
                        style={
                          styles.cardFooter
                        }
                      >
                        <View
                          style={
                            styles.privacyRow
                          }
                        >
                          <MaterialIcons
                            name="lock-outline"
                            size={12}
                            color={
                              COLORS.lightMuted
                            }
                          />

                          <Text
                            style={
                              styles.privacyText
                            }
                          >
                            Exact location is private
                          </Text>
                        </View>

                        <View
                          style={
                            styles.viewAction
                          }
                        >
                          <Text
                            style={
                              styles.viewActionText
                            }
                          >
                            View Donor
                          </Text>

                          <MaterialIcons
                            name="chevron-right"
                            size={18}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                )
              : null}

            {/* ==================================================
                REQUEST CARDS
            ================================================== */}

            {!loading &&
            !errorMessage &&
            !donorEligibilityMessage &&
            searchMode ===
              'requests'
              ? visibleRequests.map(
                  request => (
                    <TouchableOpacity
                      key={
                        request.id
                      }
                      style={
                        styles.requestCard
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={() =>
                        openRequest(
                          request
                        )
                      }
                    >
                      <View
                        style={
                          styles.requestBadgeRow
                        }
                      >
                        <View
                          style={
                            styles.requestBloodBadge
                          }
                        >
                          <MaterialIcons
                            name="bloodtype"
                            size={14}
                            color={
                              COLORS.white
                            }
                          />

                          <Text
                            style={
                              styles.requestBloodText
                            }
                          >
                            {
                              request.blood_type
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.compatibleBadge
                          }
                        >
                          <MaterialIcons
                            name="check-circle"
                            size={12}
                            color={
                              COLORS.green
                            }
                          />

                          <Text
                            style={
                              styles.compatibleBadgeText
                            }
                          >
                            Match
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.requestUrgencyBadge,

                            request.urgency ===
                              'urgent'
                              ? styles.requestUrgent
                              : styles.requestScheduled,
                          ]}
                        >
                          <MaterialIcons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'schedule'
                            }
                            size={12}
                            color={
                              request.urgency ===
                              'urgent'
                                ? COLORS.white
                                : COLORS.orange
                            }
                          />

                          <Text
                            style={[
                              styles.requestUrgencyText,

                              request.urgency ===
                                'needed' &&
                                styles.requestScheduledText,
                            ]}
                          >
                            {request.urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>
                      </View>

                      <Text
                        style={
                          styles.requestFacility
                        }
                      >
                        {
                          request.facility_name
                        }
                      </Text>

                      {request.facility_address ? (
                        <View
                          style={
                            styles.requestAddressRow
                          }
                        >
                          <MaterialIcons
                            name="location-on"
                            size={13}
                            color={
                              COLORS.lightMuted
                            }
                          />

                          <Text
                            numberOfLines={
                              1
                            }
                            style={
                              styles.requestAddress
                            }
                          >
                            {
                              request.facility_address
                            }
                          </Text>
                        </View>
                      ) : null}

                      <View
                        style={
                          styles.requestInfoBox
                        }
                      >
                        <RequestInfo
                          icon="water-drop"
                          label="Units Needed"
                          value={`${request.units_needed} ${
                            request.units_needed ===
                            1
                              ? 'unit'
                              : 'units'
                          }`}
                        />

                        <View
                          style={
                            styles.infoDivider
                          }
                        />

                        <RequestInfo
                          icon="near-me"
                          label="Distance"
                          value={`${request.distance_km.toFixed(
                            1
                          )} km`}
                        />
                      </View>

                      <View
                        style={
                          styles.requestDateRow
                        }
                      >
                        <MaterialIcons
                          name={
                            request.urgency ===
                            'urgent'
                              ? 'bolt'
                              : 'event'
                          }
                          size={15}
                          color={
                            COLORS.redButton
                          }
                        />

                        <Text
                          style={
                            styles.requestDateText
                          }
                        >
                          {formatRequestDate(
                            request
                          )}
                        </Text>
                      </View>

                      <View
                        style={
                          styles.cardFooter
                        }
                      >
                        <View
                          style={
                            styles.privacyRow
                          }
                        >
                          <MaterialIcons
                            name="schedule"
                            size={12}
                            color={
                              COLORS.lightMuted
                            }
                          />

                          <Text
                            style={
                              styles.privacyText
                            }
                          >
                            Posted{' '}
                            {getTimeAgo(
                              request.created_at
                            )}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.viewAction
                          }
                        >
                          <Text
                            style={
                              styles.viewActionText
                            }
                          >
                            View Request
                          </Text>

                          <MaterialIcons
                            name="chevron-right"
                            size={18}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>
                      </View>
                    </TouchableOpacity>
                  )
                )
              : null}

            <View
              style={
                styles.bottomSpacing
              }
            />
          </ScrollView>

          {/* ==================================================
              BOTTOM NAVIGATION
          ================================================== */}

          <MainBottomNav
            activeTab="search"
          />
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  label,
  icon,
  active,
  onPress,
}: {
  label:
    string;

  icon:
    keyof typeof MaterialIcons.glyphMap;

  active:
    boolean;

  onPress:
    () => void;
}) {
  return (
    <TouchableOpacity
      style={[
        styles.filterButton,

        active &&
          styles.filterButtonActive,
      ]}
      activeOpacity={
        0.8
      }
      onPress={
        onPress
      }
    >
      <MaterialIcons
        name={
          icon
        }
        size={15}
        color={
          active
            ? COLORS.white
            : COLORS.muted
        }
      />

      <Text
        style={[
          styles.filterButtonText,

          active &&
            styles.filterButtonTextActive,
        ]}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

// ============================================================
// STATE CARD
// ============================================================

function StateCard({
  loading,
  title,
  description,
}: {
  loading?:
    boolean;

  title:
    string;

  description:
    string;
}) {
  return (
    <View
      style={
        styles.stateCard
      }
    >
      {loading ? (
        <ActivityIndicator
          size="large"
          color={
            COLORS.redButton
          }
        />
      ) : null}

      <Text
        style={
          styles.stateTitle
        }
      >
        {title}
      </Text>

      <Text
        style={
          styles.stateDescription
        }
      >
        {description}
      </Text>
    </View>
  );
}

// ============================================================
// REQUEST INFO
// ============================================================

function RequestInfo({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  label:
    string;

  value:
    string;
}) {
  return (
    <View
      style={
        styles.requestInfoItem
      }
    >
      <MaterialIcons
        name={
          icon
        }
        size={16}
        color={
          COLORS.redButton
        }
      />

      <View>
        <Text
          style={
            styles.infoSmallLabel
          }
        >
          {label}
        </Text>

        <Text
          style={
            styles.infoValue
          }
        >
          {value}
        </Text>
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

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        Platform.OS === 'web'
          ? '#242424'
          : COLORS.page,
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

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.page,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      minHeight:
        158,

      paddingHorizontal:
        18,

      paddingTop:
        16,

      paddingBottom:
        10,

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      left:
        -100,

      top:
        -105,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        190,

      height:
        190,

      borderRadius:
        95,

      right:
        -95,

      top:
        -105,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    headerTitleContent: {
      flex:
        1,

      paddingRight:
        10,
    },

    eyebrow: {
      color:
        'rgba(255,255,255,0.80)',

      fontFamily:
        'Inter_500Medium',

      fontSize:
        10,

      letterSpacing:
        1.4,
    },

    headerTitle: {
      marginTop:
        2,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        24,
    },

    headerSubtitle: {
      marginTop:
        1,

      color:
        'rgba(255,255,255,0.84)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        10.5,
    },

    mapButton: {
      height:
        38,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      borderRadius:
        11,

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    mapButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10,
    },

    searchBar: {
      height:
        49,

      marginTop:
        14,

      paddingHorizontal:
        13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        8,

      borderRadius:
        13,

      backgroundColor:
        COLORS.white,
    },

    searchInput: {
      flex:
        1,

      height:
        '100%',

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      outlineStyle:
        'none',
    } as any,

    clearButton: {
      width:
        30,

      height:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex:
        1,

      backgroundColor:
        COLORS.page,
    },

    contentContainer: {
      paddingHorizontal:
        18,

      paddingTop:
        10,

      paddingBottom:
        22,
    },

    // ========================================================
    // MODE
    // ========================================================

    modeContainer: {
      height:
        46,

      padding:
        4,

      marginBottom:
        14,

      flexDirection:
        'row',

      gap:
        4,

      borderRadius:
        12,

      backgroundColor:
        '#E9E9EC',
    },

    modeButton: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        5,

      borderRadius:
        9,
    },

    modeButtonActive: {
      backgroundColor:
        COLORS.redButton,
    },

    modeText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10,
    },

    modeTextActive: {
      color:
        COLORS.white,
    },

    // ========================================================
    // FILTER HEADER
    // ========================================================

    filterHeader: {
      marginBottom:
        10,

      flexDirection:
        'row',

      justifyContent:
        'space-between',

      alignItems:
        'center',

      paddingLeft:
        2,
    },

    filterTitleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    filterTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    resetText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10,
    },

    filterLabel: {
      marginBottom:
        8,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        9.5,

      paddingLeft:
        2,
    },

    // ========================================================
    // BLOOD TYPE
    // ========================================================

    bloodTypeScroll: {
      width:
        '100%',

      overflow:
        'visible',

      marginLeft:
        0,
    },

    bloodTypeRow: {
      alignItems:
        'center',

      gap:
        7,

      paddingLeft:
        2,

      paddingRight:
        18,

      paddingBottom:
        14,
    },

    bloodChip: {
      minWidth:
        52,

      height:
        36,

      paddingHorizontal:
        12,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,

      borderWidth:
        1,

      borderColor:
        '#DADADD',

      borderRadius:
        10,

      backgroundColor:
        COLORS.white,
    },

    bloodChipActive: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    bloodChipText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        9.5,
    },

    bloodChipTextActive: {
      color:
        COLORS.white,
    },

    // ========================================================
    // MATCH CARD
    // ========================================================

    matchCard: {
      marginBottom:
        14,

      padding:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        '#DCEADF',

      borderRadius:
        12,

      backgroundColor:
        COLORS.greenSoft,
    },

    matchIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    matchContent: {
      flex:
        1,

      minWidth:
        0,
    },

    matchTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10,
    },

    matchDescription: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8.3,

      lineHeight:
        12,
    },

    matchBloodBadge: {
      minWidth:
        48,

      height:
        32,

      paddingHorizontal:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        3,

      borderRadius:
        9,

      backgroundColor:
        COLORS.redButton,
    },

    matchBloodText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        9.5,
    },

    // ========================================================
    // DISTANCE
    // ========================================================

    distanceCard: {
      marginBottom:
        14,

      paddingHorizontal:
        13,

      paddingTop:
        13,

      paddingBottom:
        10,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        14,

      backgroundColor:
        COLORS.white,
    },

    distanceHeader: {
      flexDirection:
        'row',

      justifyContent:
        'space-between',

      gap:
        10,
    },

    distanceHeaderLeft: {
      flex:
        1,

      minWidth:
        0,
    },

    distanceTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        11.5,
    },

    locationRow: {
      marginTop:
        5,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,
    },

    locationText: {
      flex:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        9.5,
    },

    locationHelper: {
      marginTop:
        2,

      marginLeft:
        17,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8.5,
    },

    radiusBadge: {
      height:
        30,

      paddingHorizontal:
        9,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderRadius:
        10,

      backgroundColor:
        COLORS.pinkSoft,
    },

    radiusBadgeText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        9.5,
    },

    slider: {
      width:
        '100%',

      height:
        38,

      marginTop:
        6,
    },

    sliderLabels: {
      marginTop:
        -2,

      flexDirection:
        'row',

      justifyContent:
        'space-between',
    },

    sliderLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8,
    },

    // ========================================================
    // REQUEST FILTERS
    // ========================================================

    threeButtonRow: {
      flexDirection:
        'row',

      gap:
        7,

      marginBottom:
        18,
    },

    filterButton: {
      flex:
        1,

      height:
        39,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        10,

      backgroundColor:
        COLORS.white,
    },

    filterButtonActive: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    filterButtonText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        9,
    },

    filterButtonTextActive: {
      color:
        COLORS.white,
    },

    // ========================================================
    // DONOR FILTER
    // ========================================================

    urgentReadyButton: {
      minHeight:
        60,

      marginBottom:
        18,

      paddingHorizontal:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        12,

      backgroundColor:
        COLORS.white,
    },

    urgentReadyButtonActive: {
      borderColor:
        '#E8B7B7',

      backgroundColor:
        COLORS.pinkSoft,
    },

    urgentReadyLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,
    },

    urgentReadyIcon: {
      width:
        36,

      height:
        36,

      borderRadius:
        18,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.orangeSoft,
    },

    urgentReadyIconActive: {
      backgroundColor:
        COLORS.redButton,
    },

    urgentReadyTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10.5,
    },

    urgentReadySubtitle: {
      marginTop:
        2,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8.5,
    },

    // ========================================================
    // RESULTS
    // ========================================================

    resultsHeader: {
      marginBottom:
        11,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        10,
    },

    resultsTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,
    },

    resultsCount: {
      marginTop:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8.5,
    },

    sortContainer: {
      height:
        34,

      padding:
        3,

      flexDirection:
        'row',

      borderRadius:
        9,

      backgroundColor:
        '#E9E9EC',
    },

    sortButton: {
      paddingHorizontal:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        2,

      borderRadius:
        7,
    },

    sortButtonActive: {
      backgroundColor:
        COLORS.white,
    },

    sortText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        8,
    },

    sortTextActive: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // DONOR CARD
    // ========================================================

    donorCard: {
      marginBottom:
        11,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        '#E3DADA',

      borderRadius:
        15,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          2,
      },

      shadowOpacity:
        0.04,

      shadowRadius:
        4,

      elevation:
        1,
    },

    donorTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    avatar: {
      width:
        50,

      height:
        50,

      marginRight:
        10,

      borderRadius:
        25,

      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        '#F4DCDC',
    },

    avatarImage: {
      width:
        '100%',

      height:
        '100%',
    },

    donorMain: {
      flex:
        1,

      minWidth:
        0,
    },

    nameRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    donorName: {
      flexShrink:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    donorLocationRow: {
      marginTop:
        3,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        2,
    },

    donorLocation: {
      flex:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        9,
    },

    donorBloodBadge: {
      minWidth:
        62,

      height:
        36,

      marginLeft:
        8,

      paddingHorizontal:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        4,

      borderRadius:
        10,

      backgroundColor:
        COLORS.redButton,
    },

    donorBloodText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        10.5,
    },

    donorBadgeRow: {
      marginTop:
        11,

      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        5,
    },

    availableBadge: {
      height:
        26,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,

      borderRadius:
        8,

      backgroundColor:
        COLORS.greenSoft,
    },

    availableDot: {
      width:
        6,

      height:
        6,

      borderRadius:
        3,

      backgroundColor:
        COLORS.green,
    },

    availableText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        8.5,
    },

    verifiedBadge: {
      height:
        26,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      borderRadius:
        8,

      backgroundColor:
        COLORS.greenSoft,
    },

    verifiedBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        8.5,
    },

    urgentBadge: {
      height:
        26,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      borderRadius:
        8,

      backgroundColor:
        COLORS.orangeSoft,
    },

    urgentBadgeText: {
      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        8.5,
    },

    donorInfoBox: {
      marginTop:
        11,

      paddingVertical:
        10,

      paddingHorizontal:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius:
        10,

      backgroundColor:
        '#FFF8F8',
    },

    donorInfoItem: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,
    },

    infoDivider: {
      width:
        StyleSheet.hairlineWidth,

      height:
        30,

      marginHorizontal:
        8,

      backgroundColor:
        COLORS.border,
    },

    infoSmallLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8,
    },

    infoValue: {
      marginTop:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        9.5,
    },

    // ========================================================
    // REQUEST CARD
    // ========================================================

    requestCard: {
      marginBottom:
        11,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        '#E3DADA',

      borderRadius:
        15,

      backgroundColor:
        COLORS.white,
    },

    requestBadgeRow: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      gap:
        5,

      marginBottom:
        9,
    },

    requestBloodBadge: {
      height:
        28,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        3,

      borderRadius:
        8,

      backgroundColor:
        COLORS.redButton,
    },

    requestBloodText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        9,
    },

    compatibleBadge: {
      height:
        28,

      paddingHorizontal:
        7,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,

      borderRadius:
        8,

      backgroundColor:
        COLORS.greenSoft,
    },

    compatibleBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        8,
    },

    requestUrgencyBadge: {
      height:
        28,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        3,

      borderRadius:
        8,
    },

    requestUrgent: {
      backgroundColor:
        COLORS.red,
    },

    requestScheduled: {
      borderWidth:
        1,

      borderColor:
        '#F0C69F',

      backgroundColor:
        COLORS.orangeSoft,
    },

    requestUrgencyText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        8.5,
    },

    requestScheduledText: {
      color:
        COLORS.orange,
    },

    requestFacility: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        12.5,
    },

    requestAddressRow: {
      marginTop:
        4,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        3,
    },

    requestAddress: {
      flex:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        9,
    },

    requestInfoBox: {
      marginTop:
        11,

      padding:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius:
        10,

      backgroundColor:
        '#FFF8F8',
    },

    requestInfoItem: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,
    },

    requestDateRow: {
      marginTop:
        10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,
    },

    requestDateText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        9,
    },

    // ========================================================
    // FOOTER
    // ========================================================

    cardFooter: {
      marginTop:
        11,

      paddingTop:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        8,

      borderTopWidth:
        StyleSheet.hairlineWidth,

      borderTopColor:
        COLORS.border,
    },

    privacyRow: {
      flex:
        1,

      minWidth:
        0,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        4,
    },

    privacyText: {
      flexShrink:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        8.5,
    },

    viewAction: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    viewActionText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        9.5,
    },

    // ========================================================
    // STATES
    // ========================================================

    stateCard: {
      minHeight:
        240,

      paddingHorizontal:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        16,

      backgroundColor:
        COLORS.white,
    },

    stateIcon: {
      width:
        60,

      height:
        60,

      marginBottom:
        12,

      borderRadius:
        30,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    stateTitle: {
      marginTop:
        11,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13.5,

      textAlign:
        'center',
    },

    stateDescription: {
      maxWidth:
        285,

      marginTop:
        6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        10,

      lineHeight:
        15,

      textAlign:
        'center',
    },

    primaryButton: {
      minHeight:
        41,

      marginTop:
        16,

      paddingHorizontal:
        16,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        5,

      borderRadius:
        10,

      backgroundColor:
        COLORS.redButton,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10,
    },

    secondaryButton: {
      minHeight:
        40,

      marginTop:
        16,

      paddingHorizontal:
        16,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.redButton,

      borderRadius:
        10,

      backgroundColor:
        COLORS.white,
    },

    secondaryButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        10,
    },

    bottomSpacing: {
      height:
        10,
    },
  });