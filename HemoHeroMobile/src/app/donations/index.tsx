import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Platform,
  RefreshControl,
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import {
  FadeInView,
  PressableScale,
} from '../../components/Motion';

import {
  type BloodDonation,
  type MyDonationSummary,
  getDonationStatusLabel,
  getFeedbackFrom,
  getMyDonations,
} from '../../lib/donations';

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
  headerTop: '#D2151A',

  white: '#FFFFFF',
  black: '#171717',

  page: '#FFF8F8',

  muted: '#666666',
  lightMuted: '#9A9A9A',

  cardBorder: '#E8DADA',
  divider: '#F3E9E9',
  track: '#F3E7E7',

  pinkLight: '#FFF1F1',

  green: '#159447',
  greenLight: '#EAF7EF',

  orange: '#DF721D',
  orangeLight: '#FDF1E6',

  blue: '#2F6FDB',
  blueLight: '#EAF1FD',

  star: '#F2A516',
};

type Filter =
  | 'all'
  | 'given'
  | 'received';

const FILTERS: {
  value: Filter;
  label: string;
}[] = [
  {
    value: 'all',
    label: 'All',
  },
  {
    value: 'given',
    label: 'Given',
  },
  {
    value: 'received',
    label: 'Received',
  },
];

// ============================================================
// HELPERS
// ============================================================

function bagsLabel(
  count: number
) {
  return `${count} ${
    count === 1
      ? 'bag'
      : 'bags'
  }`;
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return '';
  }

  const date =
    new Date(value);

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return '';
  }

  return date.toLocaleDateString(
    'en-US',
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

function getStatusColors(
  status: BloodDonation['status']
) {
  switch (status) {
    case 'completed':
      return {
        color: COLORS.green,
        background: COLORS.greenLight,
      };

    case 'needs_review':
      return {
        color: COLORS.orange,
        background: COLORS.orangeLight,
      };

    default:
      return {
        color: COLORS.muted,
        background: '#F2EEEE',
      };
  }
}

// ============================================================
// SCREEN
// ============================================================

export default function DonationHistoryScreen() {
  const [
    donations,
    setDonations,
  ] = useState<
    BloodDonation[]
  >([]);

  const [
    summary,
    setSummary,
  ] = useState<MyDonationSummary | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    refreshing,
    setRefreshing,
  ] = useState(false);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    filter,
    setFilter,
  ] = useState<Filter>('all');

  const loadHistory =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (!silent) {
            setLoading(true);
          }

          setErrorMessage('');

          const token =
            await getAccessToken();

          if (!token) {
            router.replace('/');

            return;
          }

          const result =
            await getMyDonations(
              token
            );

          setDonations(
            result.donations ||
              []
          );

          setSummary(
            result.summary ||
              null
          );
        } catch (error) {
          console.log(
            'DONATION HISTORY ERROR:',
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your donation history.'
          );
        } finally {
          if (!silent) {
            setLoading(false);
          }
        }
      },
      []
    );

  useFocusEffect(
    useCallback(() => {
      loadHistory();
    }, [
      loadHistory,
    ])
  );

  async function handleRefresh() {
    try {
      setRefreshing(true);

      await loadHistory(true);
    } finally {
      setRefreshing(false);
    }
  }

  const visibleDonations =
    useMemo(
      () =>
        donations.filter(
          donation =>
            filter === 'all' ||
            (filter === 'given' &&
              donation.role ===
                'donor') ||
            (filter === 'received' &&
              donation.role ===
                'requester')
        ),
      [
        donations,
        filter,
      ]
    );

  // "Eligible now" once the 90-day wait after the last recorded
  // donation has passed.
  const nextEligible =
    summary?.next_eligible_at
      ? new Date(
          summary.next_eligible_at
        )
      : null;

  const eligibleNow =
    !nextEligible ||
    nextEligible.getTime() <=
      Date.now();

  function openDonation(
    donation: BloodDonation
  ) {
    if (!donation.request_id) {
      return;
    }

    router.push(
      (donation.role ===
      'requester'
        ? `/blood-request/${donation.request_id}`
        : `/blood-request/donor/${donation.request_id}`) as any
    );
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={[
            'top',
            'bottom',
          ]}
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
            style={styles.header}
          >
            <View style={styles.headerCircleLeft} />
            <View style={styles.headerCircleRight} />

            <View style={styles.headerRow}>
              <TouchableOpacity
                style={styles.backButton}
                activeOpacity={0.75}
                accessibilityLabel="Go back"
                onPress={() =>
                  router.canGoBack()
                    ? router.back()
                    : router.replace(
                        '/profile' as any
                      )
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={23}
                  color={COLORS.white}
                />
              </TouchableOpacity>

              <View style={styles.headerText}>
                <Text style={styles.headerTitle}>
                  Donation History
                </Text>

                <Text style={styles.headerSubtitle}>
                  Every donation you gave or received
                </Text>
              </View>
            </View>
          </LinearGradient>

          {/* ==================================================
              BODY
          ================================================== */}

          <View style={styles.body}>
            <ScrollView
              style={styles.flex}
              contentContainerStyle={styles.scrollContent}
              showsVerticalScrollIndicator={false}
              refreshControl={
                <RefreshControl
                  refreshing={refreshing}
                  onRefresh={handleRefresh}
                  tintColor={COLORS.redButton}
                />
              }
            >
              {loading ? (
                <View style={styles.stateBox}>
                  <ActivityIndicator
                    size="large"
                    color={COLORS.redButton}
                  />

                  <Text style={styles.stateText}>
                    Loading your donations...
                  </Text>
                </View>
              ) : errorMessage ? (
                <FadeInView style={styles.stateBox}>
                  <View style={styles.stateIcon}>
                    <MaterialIcons
                      name="error-outline"
                      size={30}
                      color={COLORS.redButton}
                    />
                  </View>

                  <Text style={styles.stateTitle}>
                    Unable to Load
                  </Text>

                  <Text style={styles.stateText}>
                    {errorMessage}
                  </Text>

                  <TouchableOpacity
                    style={styles.retryButton}
                    activeOpacity={0.85}
                    onPress={() =>
                      loadHistory()
                    }
                  >
                    <Text style={styles.retryText}>
                      Try Again
                    </Text>
                  </TouchableOpacity>
                </FadeInView>
              ) : (
                <>
                  {/* SUMMARY */}

                  <FadeInView style={styles.statsRow}>
                    <StatTile
                      icon="volunteer-activism"
                      value={String(
                        summary?.recorded_count ||
                          0
                      )}
                      label="Given"
                    />

                    <StatTile
                      icon="bloodtype"
                      value={String(
                        summary?.received_count ||
                          0
                      )}
                      label="Received"
                    />

                    <StatTile
                      icon={
                        eligibleNow
                          ? 'event-available'
                          : 'event'
                      }
                      value={
                        eligibleNow
                          ? 'Now'
                          : formatDate(
                              summary?.next_eligible_at
                            )
                      }
                      label="Can donate"
                      tone={
                        eligibleNow
                          ? 'green'
                          : 'orange'
                      }
                    />
                  </FadeInView>

                  {/* FILTER */}

                  {donations.length > 0 ? (
                    <FadeInView
                      delay={60}
                      style={styles.segment}
                    >
                      {FILTERS.map(item => {
                        const selected =
                          filter ===
                          item.value;

                        return (
                          <TouchableOpacity
                            key={item.value}
                            style={[
                              styles.segmentItem,

                              selected &&
                                styles.segmentItemSelected,
                            ]}
                            activeOpacity={0.85}
                            accessibilityState={{
                              selected,
                            }}
                            onPress={() =>
                              setFilter(
                                item.value
                              )
                            }
                          >
                            <Text
                              style={[
                                styles.segmentText,

                                selected &&
                                  styles.segmentTextSelected,
                              ]}
                            >
                              {item.label}
                            </Text>
                          </TouchableOpacity>
                        );
                      })}
                    </FadeInView>
                  ) : null}

                  {/* LIST */}

                  {visibleDonations.length === 0 ? (
                    <FadeInView
                      delay={80}
                      style={styles.stateBox}
                    >
                      <View style={styles.stateIcon}>
                        <MaterialIcons
                          name="water-drop"
                          size={30}
                          color={COLORS.redButton}
                        />
                      </View>

                      <Text style={styles.stateTitle}>
                        {donations.length === 0
                          ? 'No Donations Yet'
                          : filter === 'given'
                            ? 'No Donations Given'
                            : 'No Donations Received'}
                      </Text>

                      <Text style={styles.stateText}>
                        {donations.length === 0
                          ? 'Donations appear here once a requester confirms them.'
                          : 'Try another filter.'}
                      </Text>
                    </FadeInView>
                  ) : (
                    visibleDonations.map(
                      (donation, index) => (
                        <FadeInView
                          key={donation.id}
                          delay={Math.min(
                            100 + index * 45,
                            360
                          )}
                        >
                          <DonationCard
                            donation={donation}
                            onPress={() =>
                              openDonation(
                                donation
                              )
                            }
                          />
                        </FadeInView>
                      )
                    )
                  )}
                </>
              )}
            </ScrollView>
          </View>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// STAT TILE
// ============================================================

function StatTile({
  icon,
  value,
  label,
  tone = 'red',
}: {
  icon: keyof typeof MaterialIcons.glyphMap;
  value: string;
  label: string;
  tone?: 'red' | 'green' | 'orange';
}) {
  const color =
    tone === 'green'
      ? COLORS.green
      : tone === 'orange'
        ? COLORS.orange
        : COLORS.redButton;

  const background =
    tone === 'green'
      ? COLORS.greenLight
      : tone === 'orange'
        ? COLORS.orangeLight
        : COLORS.pinkLight;

  return (
    <View style={styles.statTile}>
      <View
        style={[
          styles.statIcon,

          {
            backgroundColor:
              background,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={18}
          color={color}
        />
      </View>

      <Text
        numberOfLines={1}
        adjustsFontSizeToFit
        style={styles.statValue}
      >
        {value}
      </Text>

      <Text style={styles.statLabel}>
        {label}
      </Text>
    </View>
  );
}

// ============================================================
// DONATION CARD
// ============================================================

function DonationCard({
  donation,
  onPress,
}: {
  donation: BloodDonation;
  onPress: () => void;
}) {
  const given =
    donation.role === 'donor';

  const statusColors =
    getStatusColors(
      donation.status
    );

  const otherName =
    given
      ? donation.requester_name
      : donation.donor_name;

  const myRating =
    getFeedbackFrom(
      donation,
      given
        ? 'donor'
        : 'requester'
    );

  const theirRating =
    getFeedbackFrom(
      donation,
      given
        ? 'requester'
        : 'donor'
    );

  return (
    <PressableScale
      style={styles.card}
      disabled={!donation.request_id}
      accessibilityRole="button"
      onPress={onPress}
    >
      <View style={styles.cardTop}>
        <View
          style={[
            styles.bloodBadge,

            !given &&
              styles.bloodBadgeReceived,
          ]}
        >
          <Text
            style={[
              styles.bloodBadgeText,

              !given &&
                styles.bloodBadgeTextReceived,
            ]}
          >
            {donation.blood_type}
          </Text>
        </View>

        <View style={styles.cardBody}>
          <Text style={styles.cardTitle}>
            {given
              ? `You donated ${bagsLabel(donation.units_donated)}`
              : `You received ${bagsLabel(donation.units_donated)}`}
          </Text>

          <Text
            numberOfLines={1}
            style={styles.cardMeta}
          >
            {[
              otherName
                ? `${given ? 'To' : 'From'} ${otherName}`
                : null,
              formatDate(
                donation.donated_at
              ),
            ]
              .filter(Boolean)
              .join(' • ')}
          </Text>
        </View>

        <View
          style={[
            styles.statusPill,

            {
              backgroundColor:
                statusColors.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  statusColors.color,
              },
            ]}
          >
            {getDonationStatusLabel(
              donation.status
            )}
          </Text>
        </View>
      </View>

      {donation.facility_name ? (
        <View style={styles.cardRow}>
          <MaterialIcons
            name="place"
            size={16}
            color={COLORS.lightMuted}
          />

          <Text
            numberOfLines={1}
            style={styles.cardRowText}
          >
            {donation.facility_name}
          </Text>
        </View>
      ) : null}

      <View style={styles.cardFooter}>
        <View style={styles.ratingRow}>
          <MaterialIcons
            name="star"
            size={16}
            color={
              myRating ||
              theirRating
                ? COLORS.star
                : COLORS.lightMuted
            }
          />

          <Text style={styles.ratingText}>
            {myRating ||
            theirRating
              ? [
                  myRating
                    ? `You rated ${myRating.rating}`
                    : null,
                  theirRating
                    ? `They rated ${theirRating.rating}`
                    : null,
                ]
                  .filter(Boolean)
                  .join(' • ')
              : 'No ratings yet'}
          </Text>
        </View>

        {donation.request_id ? (
          <MaterialIcons
            name="chevron-right"
            size={20}
            color={COLORS.lightMuted}
          />
        ) : null}
      </View>
    </PressableScale>
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

  // HEADER

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

  // BODY

  body: {
    flex: 1,
    marginTop: -22,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    overflow: 'hidden',
    backgroundColor: COLORS.page,
  },

  scrollContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 24,
  },

  // STATS

  statsRow: {
    marginBottom: 16,
    flexDirection: 'row',
    gap: 9,
  },

  statTile: {
    flex: 1,
    minWidth: 0,
    paddingVertical: 12,
    paddingHorizontal: 8,
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  statIcon: {
    width: 34,
    height: 34,
    marginBottom: 7,
    borderRadius: 17,
    alignItems: 'center',
    justifyContent: 'center',
  },

  statValue: {
    color: COLORS.black,
    fontFamily: 'Poppins_700Bold',
    fontSize: 15,
  },

  statLabel: {
    marginTop: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 11.5,
  },

  // FILTER

  segment: {
    marginBottom: 14,
    padding: 4,
    flexDirection: 'row',
    gap: 4,
    borderRadius: 12,
    backgroundColor: COLORS.track,
  },

  segmentItem: {
    flex: 1,
    height: 36,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 9,
  },

  segmentItemSelected: {
    backgroundColor: COLORS.redButton,
  },

  segmentText: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
  },

  segmentTextSelected: {
    color: COLORS.white,
  },

  // CARD

  card: {
    marginBottom: 11,
    padding: 14,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  cardTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 11,
  },

  bloodBadge: {
    width: 46,
    height: 46,
    borderRadius: 23,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.redButton,
  },

  bloodBadgeReceived: {
    borderWidth: 1.5,
    borderColor: COLORS.redButton,
    backgroundColor: COLORS.white,
  },

  bloodBadgeText: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
    fontSize: 14,
  },

  bloodBadgeTextReceived: {
    color: COLORS.redButton,
  },

  cardBody: {
    flex: 1,
    minWidth: 0,
  },

  cardTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 14,
  },

  cardMeta: {
    marginTop: 2,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12,
  },

  statusPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 10,
  },

  statusText: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
  },

  cardRow: {
    marginTop: 11,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  cardRowText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_500Medium',
    fontSize: 12.5,
  },

  cardFooter: {
    marginTop: 11,
    paddingTop: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderTopWidth: 1,
    borderTopColor: COLORS.divider,
  },

  ratingRow: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },

  ratingText: {
    flex: 1,
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },

  // STATES

  stateBox: {
    minHeight: 220,
    paddingHorizontal: 26,
    paddingVertical: 28,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: COLORS.cardBorder,
    backgroundColor: COLORS.white,
  },

  stateIcon: {
    width: 60,
    height: 60,
    marginBottom: 12,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.pinkLight,
  },

  stateTitle: {
    color: COLORS.black,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 15,
    textAlign: 'center',
  },

  stateText: {
    marginTop: 6,
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
    fontSize: 12.5,
    lineHeight: 18,
    textAlign: 'center',
  },

  retryButton: {
    height: 42,
    marginTop: 16,
    paddingHorizontal: 20,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
    backgroundColor: COLORS.redButton,
  },

  retryText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 13.5,
  },
});
