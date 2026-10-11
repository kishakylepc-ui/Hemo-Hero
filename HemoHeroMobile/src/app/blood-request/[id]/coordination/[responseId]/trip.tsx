import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';

import {
  SafeAreaView,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';

import { shiftedDown, withStatusBar } from '../../../../../lib/fullScreen';

import * as Location from 'expo-location';

import {
  activateKeepAwakeAsync,
  deactivateKeepAwake,
} from 'expo-keep-awake';

import {
  endTrip,
  formatDistance,
  formatEta,
  getTrip,
  getTripGuidance,
  markTripArrived,
  navigationUrl,
  placeSearchUrl,
  reportNotHere,
  sendTripLocation,
  startTrip,
  type TripPayload,
  type TripPosition,
} from '../../../../../lib/trips';

import {
  getAccessToken,
} from '../../../../../lib/session';

import {
  FadeInView,
  PressableScale,
} from '../../../../../components/Motion';

import AppModal, {
  type AppModalVariant,
} from '../../../../../components/AppModal';

import TripMap from '../../../../../components/TripMap';

import PersonAvatar from '../../../../../components/PersonAvatar';

// ============================================================
// COLORS (same palette as Dashboard / Request Blood)
// ============================================================

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  headerTop: '#D2151A',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  cardBorder: '#E8DADA',
  tileBorder: '#F0D6D6',
  divider: '#F3E9E9',

  pinkLight: '#FFF1F1',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  grayLight: '#F5EFEF',
};

// ============================================================
// TIMING
// ============================================================

// Requester refreshes the donor's position this often.
const FOLLOW_INTERVAL_MS =
  6000;

// Donor sends their position at most this often.
const SEND_INTERVAL_MS =
  10000;

// How long the "can't see you yet" note shows after the
// requester disputes an arrival.
const DISPUTE_NOTICE_MS =
  10 * 60 * 1000;

const KEEP_AWAKE_TAG =
  'hemo-hero-trip';

type PopupState = {
  visible: boolean;
  variant: AppModalVariant;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
};

const CLOSED_POPUP: PopupState = {
  visible: false,
  variant: 'info',
  title: '',
  message: '',
};

// "just now", "40 sec ago", "4 min ago"
function timeAgo(
  value: string | null | undefined,
  now: number
) {
  const time =
    Date.parse(
      value || ''
    );

  if (!Number.isFinite(time)) {
    return '';
  }

  const seconds =
    Math.max(
      0,
      Math.round(
        (now - time) / 1000
      )
    );

  if (seconds < 10) {
    return 'just now';
  }

  if (seconds < 60) {
    return `${seconds} sec ago`;
  }

  const minutes =
    Math.round(
      seconds / 60
    );

  if (minutes < 60) {
    return `${minutes} min ago`;
  }

  return `${Math.round(minutes / 60)} hr ago`;
}

function initials(
  name: string
) {
  return (
    name
      .split(' ')
      .filter(Boolean)
      .slice(0, 2)
      .map(
        part =>
          part.charAt(0).toUpperCase()
      )
      .join('') || '?'
  );
}

// ============================================================
// SCREEN
// ============================================================

export default function DonorTripScreen() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
      responseId?: string | string[];
    }>();

  const requestId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  const responseId =
    Array.isArray(params.responseId)
      ? params.responseId[0]
      : params.responseId;

  const insets =
    useSafeAreaInsets();

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    payload,
    setPayload,
  ] =
    useState<TripPayload | null>(
      null
    );

  const [
    loading,
    setLoading,
  ] =
    useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] =
    useState('');

  const [
    busy,
    setBusy,
  ] =
    useState<
      'start' | 'arrive' | 'not-here' | 'end' | null
    >(null);

  const [
    focused,
    setFocused,
  ] =
    useState(false);

  // Donor's own position from the phone (smoother than waiting
  // for the server round trip).
  const [
    myPosition,
    setMyPosition,
  ] =
    useState<TripPosition | null>(
      null
    );

  // Shown above the buttons while sharing has a problem.
  const [
    trackingIssue,
    setTrackingIssue,
  ] =
    useState('');

  const [
    recenterSignal,
    setRecenterSignal,
  ] =
    useState(0);

  // Ticks so "updated 20 sec ago" stays current.
  const [
    now,
    setNow,
  ] =
    useState(
      Date.now()
    );

  const [
    popup,
    setPopup,
  ] =
    useState<PopupState>(
      CLOSED_POPUP
    );

  const lastSentAt =
    useRef(0);

  const sending =
    useRef(false);

  const isDonor =
    payload?.viewer_role ===
    'donor';

  const trip =
    payload?.trip ||
    null;

  const tripStatus =
    trip?.status ||
    null;

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadTrip =
    useCallback(
      async (quiet = false) => {
        if (
          !requestId ||
          !responseId
        ) {
          setErrorMessage(
            'This trip could not be found.'
          );

          setLoading(false);

          return;
        }

        try {
          if (!quiet) {
            setErrorMessage('');
          }

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          const result =
            await getTrip(
              token,
              requestId,
              responseId
            );

          setPayload(result);

          setErrorMessage('');
        } catch (error) {
          // A quiet refresh keeps showing the last known state.
          if (!quiet) {
            setErrorMessage(
              error instanceof Error
                ? error.message
                : 'Unable to load the trip.'
            );
          }
        } finally {
          setLoading(false);
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  useFocusEffect(
    useCallback(
      () => {
        setFocused(true);

        loadTrip();

        return () =>
          setFocused(false);
      },
      [
        loadTrip,
      ]
    )
  );

  useEffect(() => {
    const timer =
      setInterval(
        () =>
          setNow(
            Date.now()
          ),
        5000
      );

    return () =>
      clearInterval(timer);
  }, []);

  // ==========================================================
  // REQUESTER: FOLLOW THE DONOR
  // ==========================================================

  useEffect(() => {
    if (
      !focused ||
      !payload ||
      isDonor ||
      !payload.can_track
    ) {
      return;
    }

    const timer =
      setInterval(
        () =>
          loadTrip(true),
        FOLLOW_INTERVAL_MS
      );

    return () =>
      clearInterval(timer);
  }, [
    focused,
    payload,
    isDonor,
    loadTrip,
  ]);

  // ==========================================================
  // DONOR: WATCH FOR "NOT HERE YET" AFTER ARRIVING
  //
  // If the requester says they can't see the donor, the trip
  // goes back to "on the way" and sharing starts again.
  // ==========================================================

  useEffect(() => {
    if (
      !focused ||
      !isDonor ||
      tripStatus !==
        'arrived'
    ) {
      return;
    }

    const timer =
      setInterval(
        () =>
          loadTrip(true),
        FOLLOW_INTERVAL_MS
      );

    return () =>
      clearInterval(timer);
  }, [
    focused,
    isDonor,
    tripStatus,
    loadTrip,
  ]);

  // ==========================================================
  // DONOR: SHARE LOCATION WHILE ON THE WAY
  //
  // Expo Go only tracks while this screen is open, so the screen
  // is kept awake during the trip.
  // ==========================================================

  const sendPosition =
    useCallback(
      async (
        position: TripPosition
      ) => {
        if (
          !requestId ||
          !responseId ||
          sending.current ||
          Date.now() -
            lastSentAt.current <
            SEND_INTERVAL_MS
        ) {
          return;
        }

        sending.current = true;

        lastSentAt.current =
          Date.now();

        try {
          const token =
            await getAccessToken();

          if (!token) {
            return;
          }

          const result =
            await sendTripLocation(
              token,
              requestId,
              responseId,
              position
            );

          setPayload(result);

          setTrackingIssue('');
        } catch (error) {
          setTrackingIssue(
            error instanceof Error
              ? error.message
              : 'Couldn’t send your location. Retrying...'
          );
        } finally {
          sending.current = false;
        }
      },
      [
        requestId,
        responseId,
      ]
    );

  useEffect(() => {
    if (
      !focused ||
      !isDonor ||
      tripStatus !==
        'on_the_way'
    ) {
      return;
    }

    let cancelled = false;

    let subscription:
      | Location.LocationSubscription
      | null = null;

    activateKeepAwakeAsync(
      KEEP_AWAKE_TAG
    ).catch(() => {});

    (async () => {
      try {
        const permission =
          await Location.requestForegroundPermissionsAsync();

        if (
          permission.status !==
          'granted'
        ) {
          setTrackingIssue(
            'Location permission is off, so your trip can’t be shared.'
          );

          return;
        }

        const watcher =
          await Location.watchPositionAsync(
            {
              accuracy:
                Location.Accuracy.High,

              timeInterval:
                5000,

              distanceInterval:
                10,
            },
            location => {
              const position = {
                latitude:
                  location.coords.latitude,

                longitude:
                  location.coords.longitude,

                accuracy:
                  location.coords.accuracy,

                heading:
                  location.coords.heading !==
                    null &&
                  location.coords.heading >= 0
                    ? location.coords.heading
                    : null,
              };

              setMyPosition(
                position
              );

              sendPosition(
                position
              );
            }
          );

        if (cancelled) {
          watcher.remove();

          return;
        }

        subscription = watcher;
      } catch (error) {
        setTrackingIssue(
          error instanceof Error
            ? error.message
            : 'Unable to read your location.'
        );
      }
    })();

    return () => {
      cancelled = true;

      subscription?.remove();

      deactivateKeepAwake(
        KEEP_AWAKE_TAG
      ).catch(() => {});
    };
  }, [
    focused,
    isDonor,
    tripStatus,
    sendPosition,
  ]);

  // ==========================================================
  // ACTIONS
  // ==========================================================

  function showError(
    title: string,
    error: unknown,
    fallback: string
  ) {
    setPopup({
      visible: true,
      variant: 'error',
      title,
      message:
        error instanceof Error
          ? error.message
          : fallback,
    });
  }

  async function handleStart() {
    if (
      !requestId ||
      !responseId ||
      busy
    ) {
      return;
    }

    try {
      setBusy('start');

      const permission =
        await Location.requestForegroundPermissionsAsync();

      if (
        permission.status !==
        'granted'
      ) {
        setPopup({
          visible: true,
          variant: 'warning',
          title: 'Location Needed',
          message:
            'Allow location access so the requester can see you on the map. You can still use Navigate without sharing.',
        });

        return;
      }

      const location =
        await Location.getCurrentPositionAsync({
          accuracy:
            Location.Accuracy.Balanced,
        });

      const position = {
        latitude:
          location.coords.latitude,

        longitude:
          location.coords.longitude,

        accuracy:
          location.coords.accuracy,
      };

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const result =
        await startTrip(
          token,
          requestId,
          responseId,
          position
        );

      setMyPosition(position);

      lastSentAt.current =
        Date.now();

      setTrackingIssue('');

      setPayload(result);

      setRecenterSignal(
        value => value + 1
      );
    } catch (error) {
      showError(
        'Unable to Start Trip',
        error,
        'Please try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  async function handleArrive() {
    if (
      !requestId ||
      !responseId ||
      busy
    ) {
      return;
    }

    try {
      setBusy('arrive');

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      setPayload(
        await markTripArrived(
          token,
          requestId,
          responseId
        )
      );
    } catch (error) {
      showError(
        'Unable to Update Trip',
        error,
        'Please try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  // ==========================================================
  // CAN'T FIND EACH OTHER (once the donor is "arrived")
  //
  // Requester: the donor isn't actually there, so the trip goes
  // back to "on the way" and their live location shows again.
  // Donor: they're there but can't find the requester.
  // Either way a chat message goes to the other person.
  // ==========================================================

  function confirmNotHere() {
    setPopup({
      visible: true,
      variant: 'warning',
      title: isDonor
        ? `Can’t Find ${otherFirst}?`
        : `${donorFirst} Not Here Yet?`,
      message: isDonor
        ? `We’ll message ${otherFirst} that you’re at ${facility} and can’t find them.`
        : `We’ll tell ${donorFirst} you can’t see them yet and show their live location again, so you can find each other.`,
      confirmLabel: isDonor
        ? 'Send Message'
        : 'Not Here Yet',
      cancelLabel: 'Cancel',
      onConfirm: () => {
        setPopup(CLOSED_POPUP);

        performNotHere();
      },
    });
  }

  async function performNotHere() {
    if (
      !requestId ||
      !responseId ||
      busy
    ) {
      return;
    }

    try {
      setBusy('not-here');

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      setPayload(
        await reportNotHere(
          token,
          requestId,
          responseId
        )
      );

      setPopup({
        visible: true,
        variant: 'success',
        title: 'Message Sent',
        message: isDonor
          ? `${otherFirst} knows you’re at ${facility}. Check the chat for their reply.`
          : `${donorFirst} was told you can’t see them yet. Their live location shows again on the map.`,
      });
    } catch (error) {
      showError(
        'Unable to Send',
        error,
        'Please try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  function confirmEnd() {
    setPopup({
      visible: true,
      variant: 'warning',
      title: 'Stop Sharing?',
      message: `${
        payload?.requester_name ||
        'The requester'
      } won’t see where you are anymore.`,
      confirmLabel: 'Stop Sharing',
      cancelLabel: 'Keep Sharing',
      onConfirm: () => {
        setPopup(CLOSED_POPUP);

        performEnd();
      },
    });
  }

  async function performEnd() {
    if (
      !requestId ||
      !responseId ||
      busy
    ) {
      return;
    }

    try {
      setBusy('end');

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      setPayload(
        await endTrip(
          token,
          requestId,
          responseId
        )
      );

      setMyPosition(null);
    } catch (error) {
      showError(
        'Unable to Stop Sharing',
        error,
        'Please try again.'
      );
    } finally {
      setBusy(null);
    }
  }

  // Opens Google Maps: directions to the pin, or a search by
  // name when the facility has no pin. (The donor's trip uses
  // the in-app directions instead: leaving the app would pause
  // their location sharing.)
  function openNavigation() {
    if (!payload) {
      return;
    }

    const url =
      payload.destination
        ? navigationUrl(
            payload.destination
          )
        : placeSearchUrl(
            payload.facility_name ||
              '',
            payload.facility_address
          );

    Linking.openURL(
      url
    ).catch(() =>
      setPopup({
        visible: true,
        variant: 'error',
        title: 'Unable to Open Maps',
        message:
          'We could not open a maps app on this device.',
      })
    );
  }

  function openChat() {
    if (router.canGoBack()) {
      router.back();

      return;
    }

    router.replace(
      `/blood-request/${requestId}/coordination/${responseId}` as any
    );
  }

  // ==========================================================
  // DERIVED
  // ==========================================================

  const otherName =
    (isDonor
      ? payload?.requester_name
      : payload?.donor_name) ||
    '';

  const otherFirst =
    otherName.split(' ')[0] ||
    (isDonor
      ? 'The requester'
      : 'Your donor');

  const donorFirst =
    (payload?.donor_name || '')
      .split(' ')[0] ||
    'Your donor';

  const live =
    tripStatus ===
      'on_the_way' ||
    tripStatus ===
      'arrived';

  // Donor sees their own phone position first.
  const donorPoint =
    live
      ? isDonor &&
        myPosition &&
        tripStatus ===
          'on_the_way'
        ? myPosition
        : trip?.latitude !== null &&
            trip?.latitude !== undefined &&
            trip?.longitude !== null &&
            trip?.longitude !== undefined
          ? {
              latitude:
                trip.latitude,

              longitude:
                trip.longitude,

              accuracy:
                trip.accuracy_m,
            }
          : null
      : null;

  const rawMapData = {
    destination:
      payload?.destination
        ? {
            latitude:
              payload.destination.latitude,

            longitude:
              payload.destination.longitude,
          }
        : null,

    donor:
      donorPoint,

    route:
      live
        ? trip?.route ||
          null
        : null,

    // The donor's own trip: zoomed in on them, like a driving app.
    followDonor:
      isDonor &&
      tripStatus ===
        'on_the_way',
  };

  // Same object until something on the map actually changes,
  // so the map isn't re-sent on every clock tick.
  const mapKey =
    JSON.stringify(
      rawMapData
    );

  const mapData =
    useMemo(
      () =>
        JSON.parse(
          mapKey
        ) as typeof rawMapData,
      [mapKey]
    );

  const near =
    tripStatus ===
      'on_the_way' &&
    Boolean(
      trip?.near_notified_at
    );

  const status:
    | {
        label: string;
        bg: string;
        fg: string;
        icon: keyof typeof MaterialIcons.glyphMap;
      } =
    tripStatus ===
    'arrived'
      ? {
          label: 'Arrived',
          bg: COLORS.greenLight,
          fg: COLORS.green,
          icon: 'where-to-vote',
        }
      : tripStatus ===
          'on_the_way' &&
        trip?.stale &&
        !isDonor
        ? {
            label: 'Location paused',
            bg: COLORS.orangeLight,
            fg: COLORS.orange,
            icon: 'location-disabled',
          }
        : near
          ? {
              label: 'Almost there',
              bg: COLORS.orangeLight,
              fg: COLORS.orange,
              icon: 'near-me',
            }
          : tripStatus ===
              'on_the_way'
            ? {
                label: 'On the way',
                bg: COLORS.blueLight,
                fg: COLORS.blue,
                icon: 'directions-car',
              }
            : {
                label: 'Not started',
                bg: COLORS.grayLight,
                fg: COLORS.muted,
                icon: 'schedule',
              };

  const progress =
    tripStatus ===
    'arrived'
      ? 1
      : trip?.start_distance_m &&
          trip.distance_m !== null
        ? Math.min(
            1,
            Math.max(
              0.04,
              1 -
                trip.distance_m /
                  trip.start_distance_m
            )
          )
        : 0.04;

  const facility =
    payload?.destination?.name ||
    'the facility';

  // The requester recently said the donor isn't there yet (the
  // trip is back to "on the way").
  const disputedAt =
    Date.parse(
      trip?.arrival_disputed_at ||
        ''
    );

  const recentlyDisputed =
    tripStatus ===
      'on_the_way' &&
    Number.isFinite(
      disputedAt
    ) &&
    now - disputedAt <
      DISPUTE_NOTICE_MS;

  // In-app directions for the donor: their next turn.
  const guidance =
    isDonor &&
    tripStatus ===
      'on_the_way'
      ? getTripGuidance(
          trip,
          donorPoint,
          facility
        )
      : null;

  // ==========================================================
  // UI
  // ==========================================================

  function renderSummary() {
    if (!payload) {
      return null;
    }

    if (!payload.can_track) {
      return (
        <View
          style={
            styles.summaryBlock
          }
        >
          <Text
            style={
              styles.bigText
            }
          >
            Trip closed
          </Text>

          <Text
            style={
              styles.summaryText
            }
          >
            The request is closed, the donation is recorded, or the donor was released.
          </Text>
        </View>
      );
    }

    if (
      tripStatus ===
      'on_the_way'
    ) {
      return (
        <View
          style={
            styles.summaryBlock
          }
        >
          <View
            style={
              styles.etaRow
            }
          >
            <Text
              style={
                styles.bigText
              }
            >
              {formatEta(
                trip?.eta_seconds
              ) || '—'}
            </Text>

            <Text
              style={
                styles.etaDistance
              }
            >
              {formatDistance(
                trip?.distance_m
              )}{' '}
              away
            </Text>
          </View>

          <Text
            style={
              styles.summaryText
            }
            numberOfLines={1}
          >
            {isDonor
              ? `to ${facility}`
              : `${donorFirst} is heading to ${facility}`}
          </Text>

          <View
            style={
              styles.progressTrack
            }
          >
            <View
              style={[
                styles.progressFill,
                {
                  width: `${Math.round(
                    progress * 100
                  )}%`,
                },
              ]}
            />
          </View>
        </View>
      );
    }

    if (
      tripStatus ===
      'arrived'
    ) {
      return (
        <View
          style={
            styles.summaryBlock
          }
        >
          <Text
            style={
              styles.bigText
            }
          >
            {isDonor
              ? 'You’ve arrived'
              : `${donorFirst} has arrived`}
          </Text>

          <Text
            style={
              styles.summaryText
            }
          >
            {isDonor
              ? `${otherFirst} was notified that you’re at ${facility}.`
              : `At ${facility} · ${timeAgo(
                  trip?.arrived_at,
                  now
                )}`}
          </Text>
        </View>
      );
    }

    return (
      <View
        style={
          styles.summaryBlock
        }
      >
        <Text
          style={
            styles.bigText
          }
        >
          {isDonor
            ? 'Ready to go?'
            : `${donorFirst} hasn’t left yet`}
        </Text>

        <Text
          style={
            styles.summaryText
          }
        >
          {isDonor
            ? payload.destination
              ? `Share your live location so ${otherFirst} knows when you’ll arrive.`
              : 'This facility has no map pin yet, so a live trip isn’t available.'
            : 'You’ll get a notification when they’re on the way and when they’re almost there.'}
        </Text>
      </View>
    );
  }

  function renderActions() {
    if (!payload) {
      return null;
    }

    // Requester: directions for themselves + back to the chat,
    // and "not here yet" once the donor is marked arrived.
    if (!isDonor) {
      return (
        <>
          <View
            style={
              styles.actionRow
            }
          >
            {payload.destination ? (
              <TouchableOpacity
                style={[
                  styles.outlineButton,
                  styles.flexFill,
                ]}
                activeOpacity={0.85}
                onPress={
                  openNavigation
                }
              >
                <MaterialIcons
                  name="directions"
                  size={19}
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.outlineButtonText
                  }
                >
                  Directions
                </Text>
              </TouchableOpacity>
            ) : null}

            <PrimaryButton
              icon="forum"
              label={`Message ${otherFirst}`}
              onPress={
                openChat
              }
            />
          </View>

          {tripStatus ===
          'arrived' ? (
            <TouchableOpacity
              style={
                styles.textLink
              }
              activeOpacity={0.7}
              disabled={Boolean(
                busy
              )}
              onPress={
                confirmNotHere
              }
            >
              <Text
                style={
                  styles.textLinkText
                }
              >
                {busy === 'not-here'
                  ? 'Sending...'
                  : `${donorFirst} not here yet?`}
              </Text>
            </TouchableOpacity>
          ) : null}
        </>
      );
    }

    if (
      tripStatus ===
      'on_the_way'
    ) {
      return (
        <>
          <View
            style={
              styles.actionRow
            }
          >
            <PrimaryButton
              icon="where-to-vote"
              label="I’ve Arrived"
              busy={
                busy ===
                'arrive'
              }
              disabled={Boolean(
                busy
              )}
              onPress={
                handleArrive
              }
            />
          </View>

          <TouchableOpacity
            style={
              styles.textLink
            }
            activeOpacity={0.7}
            disabled={Boolean(
              busy
            )}
            onPress={
              confirmEnd
            }
          >
            <Text
              style={
                styles.textLinkText
              }
            >
              {busy === 'end'
                ? 'Stopping...'
                : 'Stop sharing my location'}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    if (
      tripStatus ===
      'arrived'
    ) {
      return (
        <>
          <View
            style={
              styles.actionRow
            }
          >
            <PrimaryButton
              icon="forum"
              label="Back to Chat"
              onPress={
                openChat
              }
            />
          </View>

          {/* At the place, but the requester isn't. */}
          <TouchableOpacity
            style={
              styles.textLink
            }
            activeOpacity={0.7}
            disabled={Boolean(
              busy
            )}
            onPress={
              confirmNotHere
            }
          >
            <Text
              style={
                styles.textLinkText
              }
            >
              {busy === 'not-here'
                ? 'Sending...'
                : `Can’t find ${otherFirst}?`}
            </Text>
          </TouchableOpacity>
        </>
      );
    }

    return (
      <View
        style={
          styles.actionRow
        }
      >
        {/* No map pin: directions can only come from a search. */}
        {!payload.destination ? (
          <TouchableOpacity
            style={[
              styles.outlineButton,
              styles.flexFill,
            ]}
            activeOpacity={0.85}
            onPress={
              openNavigation
            }
          >
            <MaterialIcons
              name="map"
              size={19}
              color={
                COLORS.redButton
              }
            />

            <Text
              style={
                styles.outlineButtonText
              }
            >
              Open in Google Maps
            </Text>
          </TouchableOpacity>
        ) : null}

        {payload.can_start ? (
          <PrimaryButton
            icon="directions-car"
            label="Start Trip"
            busy={
              busy ===
              'start'
            }
            disabled={Boolean(
              busy
            )}
            onPress={
              handleStart
            }
          />
        ) : null}
      </View>
    );
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
          edges={['left', 'right']}
        >
          <StatusBar style="light" />

          {/* ==================================================
              HEADER
          ================================================== */}

          <LinearGradient
            colors={[
              COLORS.headerTop,
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
                style={
                  styles.backButton
                }
                accessibilityLabel="Go back"
                onPress={
                  openChat
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
                  {payload
                    ? isDonor
                      ? 'On My Way'
                      : 'Track Donor'
                    : 'Trip'}
                </Text>

                <Text
                  style={
                    styles.headerSubtitle
                  }
                  numberOfLines={1}
                >
                  {payload?.destination?.name ||
                    'Donation facility'}
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ==================================================
              BODY: MAP + PANEL
          ================================================== */}

          <View
            style={
              styles.body
            }
          >
            {loading ? (
              <View
                style={
                  styles.centerState
                }
              >
                <ActivityIndicator
                  color={
                    COLORS.redButton
                  }
                />

                <Text
                  style={
                    styles.centerText
                  }
                >
                  Loading map...
                </Text>
              </View>
            ) : errorMessage ||
              !payload ? (
              <View
                style={
                  styles.centerState
                }
              >
                <View
                  style={
                    styles.centerIcon
                  }
                >
                  <MaterialIcons
                    name="map"
                    size={28}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.centerTitle
                  }
                >
                  Unable to Load Trip
                </Text>

                <Text
                  style={
                    styles.centerText
                  }
                >
                  {errorMessage ||
                    'Please try again.'}
                </Text>

                <TouchableOpacity
                  style={
                    styles.retryButton
                  }
                  activeOpacity={0.85}
                  onPress={() =>
                    loadTrip()
                  }
                >
                  <MaterialIcons
                    name="refresh"
                    size={18}
                    color={
                      COLORS.white
                    }
                  />

                  <Text
                    style={
                      styles.retryButtonText
                    }
                  >
                    Try Again
                  </Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
                <View
                  style={
                    styles.mapArea
                  }
                >
                  {payload.destination ? (
                    <TripMap
                      data={mapData}
                      recenterSignal={
                        recenterSignal
                      }
                    />
                  ) : (
                    <View
                      style={
                        styles.noMap
                      }
                    >
                      <MaterialIcons
                        name="wrong-location"
                        size={30}
                        color={
                          COLORS.lightMuted
                        }
                      />

                      <Text
                        style={
                          styles.centerText
                        }
                      >
                        This facility has no map pin.
                      </Text>
                    </View>
                  )}

                  {guidance ? (
                    <FadeInView
                      key={
                        guidance.text
                      }
                      offset={-6}
                      style={[
                        styles.guidance,

                        guidance.offRoute &&
                          styles.guidanceOffRoute,
                      ]}
                    >
                      <View
                        style={
                          styles.guidanceIcon
                        }
                      >
                        <MaterialIcons
                          name={
                            guidance.icon
                          }
                          size={28}
                          color={
                            guidance.offRoute
                              ? COLORS.orange
                              : COLORS.redButton
                          }
                        />
                      </View>

                      <View
                        style={
                          styles.flexFill
                        }
                      >
                        {guidance.distance_m !==
                        null ? (
                          <Text
                            style={
                              styles.guidanceDistance
                            }
                          >
                            {guidance.distance_m <
                            30
                              ? 'Now'
                              : `In ${formatDistance(
                                  guidance.distance_m
                                )}`}
                          </Text>
                        ) : null}

                        <Text
                          style={
                            styles.guidanceText
                          }
                          numberOfLines={2}
                        >
                          {guidance.text}
                        </Text>
                      </View>
                    </FadeInView>
                  ) : null}

                  {payload.destination ? (
                    <TouchableOpacity
                      style={
                        styles.recenterButton
                      }
                      activeOpacity={0.85}
                      accessibilityLabel="Recenter map"
                      onPress={() =>
                        setRecenterSignal(
                          value =>
                            value + 1
                        )
                      }
                    >
                      <MaterialIcons
                        name="my-location"
                        size={20}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>
                  ) : null}
                </View>

                {/* ==========================================
                    PANEL
                ========================================== */}

                <View
                  style={[
                    styles.panel,
                    {
                      paddingBottom:
                        Math.max(
                          insets.bottom,
                          14
                        ),
                    },
                  ]}
                >
                  <View
                    style={
                      styles.panelHandle
                    }
                  />

                  <View
                    style={
                      styles.statusRow
                    }
                  >
                    <FadeInView
                      key={
                        status.label
                      }
                      offset={4}
                      style={[
                        styles.chip,
                        {
                          backgroundColor:
                            status.bg,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name={
                          status.icon
                        }
                        size={14}
                        color={
                          status.fg
                        }
                      />

                      <Text
                        style={[
                          styles.chipText,
                          {
                            color:
                              status.fg,
                          },
                        ]}
                      >
                        {status.label}
                      </Text>
                    </FadeInView>

                    {live &&
                    tripStatus ===
                      'on_the_way' ? (
                      <Text
                        style={
                          styles.updatedText
                        }
                      >
                        {isDonor
                          ? 'Sharing live'
                          : `Updated ${timeAgo(
                              trip?.location_updated_at,
                              now
                            )}`}
                      </Text>
                    ) : null}
                  </View>

                  {renderSummary()}

                  {/* Who's on the other side */}
                  <View
                    style={
                      styles.personRow
                    }
                  >
                    <PersonAvatar
                      uri={
                        isDonor
                          ? payload.requester_photo_url
                          : payload.donor_photo_url
                      }
                      label={initials(
                        otherName
                      )}
                      style={
                        styles.avatar
                      }
                      textStyle={
                        styles.avatarText
                      }
                    />

                    <View
                      style={
                        styles.flexFill
                      }
                    >
                      <Text
                        style={
                          styles.personName
                        }
                        numberOfLines={1}
                      >
                        {otherName}
                      </Text>

                      <Text
                        style={
                          styles.personRole
                        }
                      >
                        {isDonor
                          ? 'Requester'
                          : 'Your donor'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.chatButton
                      }
                      activeOpacity={0.8}
                      accessibilityLabel="Open chat"
                      onPress={
                        openChat
                      }
                    >
                      <MaterialIcons
                        name="chat-bubble-outline"
                        size={19}
                        color={
                          COLORS.redButton
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {/* The requester said the donor isn't there yet. */}
                  {recentlyDisputed ? (
                    <View
                      style={
                        styles.issueRow
                      }
                    >
                      <MaterialIcons
                        name="person-search"
                        size={15}
                        color={
                          COLORS.orange
                        }
                      />

                      <Text
                        style={
                          styles.issueText
                        }
                      >
                        {isDonor
                          ? `${otherFirst} can’t see you at ${facility} yet. Check you’re at the right entrance, or message them.`
                          : `You told ${donorFirst} you can’t see them yet. Follow their live location to find each other.`}
                      </Text>
                    </View>
                  ) : null}

                  {trackingIssue &&
                  isDonor &&
                  tripStatus ===
                    'on_the_way' ? (
                    <View
                      style={
                        styles.issueRow
                      }
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={15}
                        color={
                          COLORS.orange
                        }
                      />

                      <Text
                        style={
                          styles.issueText
                        }
                      >
                        {trackingIssue}
                      </Text>
                    </View>
                  ) : isDonor &&
                    tripStatus ===
                      'on_the_way' ? (
                    <View
                      style={
                        styles.issueRow
                      }
                    >
                      <MaterialIcons
                        name="info-outline"
                        size={15}
                        color={
                          COLORS.lightMuted
                        }
                      />

                      <Text
                        style={
                          styles.hintText
                        }
                      >
                        Keep this screen open while you travel.
                      </Text>
                    </View>
                  ) : null}

                  {renderActions()}
                </View>
              </>
            )}
          </View>
        </SafeAreaView>

        <AppModal
          visible={
            popup.visible
          }
          variant={
            popup.variant
          }
          title={
            popup.title
          }
          message={
            popup.message
          }
          confirmLabel={
            popup.confirmLabel ||
            'Okay'
          }
          cancelLabel={
            popup.cancelLabel
          }
          onConfirm={
            popup.onConfirm ||
            (() =>
              setPopup(
                CLOSED_POPUP
              ))
          }
          onClose={() =>
            setPopup(
              CLOSED_POPUP
            )
          }
        />
      </View>
    </View>
  );
}

// ============================================================
// PRIMARY BUTTON (red gradient)
// ============================================================

function PrimaryButton({
  icon,
  label,
  busy,
  disabled,
  onPress,
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  label: string;
  busy?: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  return (
    <PressableScale
      style={
        styles.primaryButton
      }
      containerStyle={
        styles.flexFill
      }
      disabled={disabled}
      accessibilityRole="button"
      onPress={onPress}
    >
      <LinearGradient
        colors={[
          COLORS.headerTop,
          COLORS.redDark,
        ]}
        start={{
          x: 0,
          y: 0,
        }}
        end={{
          x: 1,
          y: 1,
        }}
        style={
          styles.primaryGradient
        }
      >
        {busy ? (
          <ActivityIndicator
            color={
              COLORS.white
            }
          />
        ) : (
          <MaterialIcons
            name={icon}
            size={19}
            color={
              COLORS.white
            }
          />
        )}

        <Text
          style={
            styles.primaryText
          }
          numberOfLines={1}
        >
          {label}
        </Text>
      </LinearGradient>
    </PressableScale>
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    flexFill: {
      flex: 1,
      minWidth: 0,
    },

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
          ? 440
          : '100%',
      height: '100%',
      maxWidth: '100%',
      overflow: 'hidden',
      backgroundColor: COLORS.page,
    },

    safeArea: {
      flex: 1,
      backgroundColor: COLORS.headerTop,
    },

    // ==========================================================
    // HEADER
    // ==========================================================

    // Bottom padding leaves room for the rounded body sheet,
    // which overlaps the header by 22.
    header: {
      paddingHorizontal: 20,
      paddingTop:
        Platform.OS === 'web'
          ? 18
          : 10,
      paddingBottom: 38,
      overflow: 'hidden',
    },

    headerCircleLeft: {
      position: 'absolute',
      width: 165,
      height: 165,
      borderRadius: 83,
      left: -100,
      top: -70,
      backgroundColor: 'rgba(255,255,255,0.06)',
    },

    headerCircleRight: {
      position: 'absolute',
      width: 175,
      height: 175,
      borderRadius: 88,
      right: -70,
      top: -80,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },

    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },

    backButton: {
      width: 40,
      height: 40,
      marginRight: 12,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(255,255,255,0.16)',
    },

    headerText: {
      flex: 1,
      minWidth: 0,
    },

    headerTitle: {
      color: COLORS.white,
      fontFamily: 'Poppins_700Bold',
      fontSize: 21,
      lineHeight: 29,
    },

    headerSubtitle: {
      color: 'rgba(255,255,255,0.82)',
      fontFamily: 'Inter_400Regular',
      fontSize: 12.5,
    },

    // ==========================================================
    // BODY
    // ==========================================================

    body: {
      flex: 1,
      marginTop: -22,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      overflow: 'hidden',
      backgroundColor: COLORS.page,
    },

    centerState: {
      flex: 1,
      paddingHorizontal: 24,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
    },

    centerIcon: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.pinkLight,
    },

    centerTitle: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 15,
    },

    centerText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
      textAlign: 'center',
    },

    retryButton: {
      marginTop: 6,
      height: 42,
      paddingHorizontal: 18,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      borderRadius: 12,
      backgroundColor: COLORS.redButton,
    },

    retryButtonText: {
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 13.5,
    },

    // ==========================================================
    // MAP
    // ==========================================================

    mapArea: {
      flex: 1,
    },

    noMap: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      backgroundColor: COLORS.grayLight,
    },

    // Next-turn banner (donor's trip).
    guidance: {
      position: 'absolute',
      top: 14,
      left: 12,
      right: 12,
      paddingHorizontal: 12,
      paddingVertical: 11,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      borderRadius: 16,
      backgroundColor: COLORS.redButton,
      shadowColor: '#000000',
      shadowOpacity: 0.22,
      shadowRadius: 8,
      shadowOffset: {
        width: 0,
        height: 3,
      },
      elevation: 6,
    },

    guidanceOffRoute: {
      backgroundColor: COLORS.orange,
    },

    guidanceIcon: {
      width: 46,
      height: 46,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
    },

    guidanceDistance: {
      color: COLORS.white,
      fontFamily: 'Poppins_700Bold',
      fontSize: 19,
      lineHeight: 25,
    },

    guidanceText: {
      color: 'rgba(255,255,255,0.92)',
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
      lineHeight: 19,
    },

    recenterButton: {
      position: 'absolute',
      right: 14,
      bottom: 34,
      width: 44,
      height: 44,
      borderRadius: 22,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.white,
      shadowColor: '#000000',
      shadowOpacity: 0.18,
      shadowRadius: 6,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      elevation: 4,
    },

    // ==========================================================
    // PANEL
    // ==========================================================

    panel: {
      marginTop: -20,
      paddingHorizontal: 16,
      paddingTop: 8,
      borderTopLeftRadius: 22,
      borderTopRightRadius: 22,
      backgroundColor: COLORS.white,
      shadowColor: '#5A1010',
      shadowOpacity: 0.12,
      shadowRadius: 12,
      shadowOffset: {
        width: 0,
        height: -3,
      },
      elevation: 10,
    },

    panelHandle: {
      alignSelf: 'center',
      width: 38,
      height: 4,
      marginBottom: 12,
      borderRadius: 2,
      backgroundColor: '#E6D8D8',
    },

    statusRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },

    chip: {
      paddingHorizontal: 10,
      height: 26,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 5,
      borderRadius: 13,
    },

    chipText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
    },

    updatedText: {
      color: COLORS.lightMuted,
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
    },

    summaryBlock: {
      marginTop: 10,
    },

    etaRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
    },

    bigText: {
      color: COLORS.black,
      fontFamily: 'Poppins_700Bold',
      fontSize: 22,
      lineHeight: 30,
    },

    etaDistance: {
      color: COLORS.muted,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13.5,
    },

    summaryText: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 19,
    },

    progressTrack: {
      marginTop: 10,
      height: 6,
      borderRadius: 3,
      overflow: 'hidden',
      backgroundColor: COLORS.grayLight,
    },

    progressFill: {
      height: '100%',
      borderRadius: 3,
      backgroundColor: COLORS.redButton,
    },

    personRow: {
      marginTop: 14,
      paddingTop: 12,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      borderTopWidth: 1,
      borderTopColor: COLORS.divider,
    },

    avatar: {
      width: 40,
      height: 40,
      borderRadius: 20,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: COLORS.pinkLight,
    },

    avatarText: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    personName: {
      color: COLORS.black,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14,
    },

    personRole: {
      color: COLORS.muted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
    },

    chatButton: {
      width: 42,
      height: 42,
      borderRadius: 21,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
      borderColor: COLORS.tileBorder,
      backgroundColor: COLORS.white,
    },

    issueRow: {
      marginTop: 10,
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 6,
    },

    issueText: {
      flex: 1,
      color: COLORS.orange,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
      lineHeight: 17,
    },

    hintText: {
      flex: 1,
      color: COLORS.lightMuted,
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 17,
    },

    actionRow: {
      marginTop: 14,
      flexDirection: 'row',
      gap: 10,
    },

    outlineButton: {
      height: 50,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
      borderRadius: 13,
      borderWidth: 1.5,
      borderColor: COLORS.redButton,
      backgroundColor: COLORS.white,
    },

    outlineButtonText: {
      color: COLORS.redButton,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14.5,
    },

    primaryButton: {
      borderRadius: 13,
      overflow: 'hidden',
    },

    primaryGradient: {
      height: 50,
      paddingHorizontal: 12,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 7,
    },

    primaryText: {
      flexShrink: 1,
      color: COLORS.white,
      fontFamily: 'Poppins_600SemiBold',
      fontSize: 14.5,
    },

    textLink: {
      marginTop: 8,
      alignSelf: 'center',
      minHeight: 32,
      paddingHorizontal: 10,
      justifyContent: 'center',
    },

    textLinkText: {
      color: COLORS.muted,
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
      textDecorationLine: 'underline',
    },
  });
