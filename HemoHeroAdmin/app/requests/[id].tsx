import {
  type ComponentProps,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
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
import { SafeAreaView } from 'react-native-safe-area-context';

import AdminBottomNav from '../AdminBottomNav';

import {
  getAdminBloodRequestById,
  type AdminBloodRequest,
  type AdminBloodRequestDonorResponse,
  type AdminBloodRequestResponseSummary,
  type AdminBloodRequestStatus,
  type AdminBloodRequestUrgency,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// DESIGN
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  outer: '#02040A',

  navy: '#050B19',

  card: '#091126',

  cardLight: '#101A35',

  border: '#243554',

  rowBorder: 'rgba(36,53,84,0.72)',

  red: '#DB0A0A',

  redBright: '#EF3340',

  white: '#FFFFFF',

  muted: '#7F889F',

  soft: '#B7C1D8',

  green: '#35C982',

  orange: '#F3A34A',

  blue: '#4A8CFF',
};

// ============================================================
// DEFAULT RESPONSE SUMMARY
// ============================================================

const DEFAULT_RESPONSE_SUMMARY:
  AdminBloodRequestResponseSummary = {
    total: 0,

    pending: 0,

    accepted: 0,

    rejected: 0,

    withdrawn: 0,
  };

// ============================================================
// SCREEN
// ============================================================

export default function AdminBloodRequestDetailScreen() {
  const { id } =
    useLocalSearchParams<{
      id: string;
    }>();

  const {
    width,
    height,
  } = useWindowDimensions();

  // ==========================================================
  // RESPONSIVE IPAD CANVAS
  // ==========================================================

  const tablet = useMemo(() => {
    if (Platform.OS !== 'web') {
      return {
        width,
        height,

        scale: Math.min(
          width / DESIGN_WIDTH,
          height / DESIGN_HEIGHT
        ),
      };
    }

    const padding = 24;

    const availableWidth = Math.max(
      width - padding * 2,
      320
    );

    const availableHeight = Math.max(
      height - padding * 2,
      320
    );

    const scale = Math.min(
      availableWidth / DESIGN_WIDTH,
      availableHeight / DESIGN_HEIGHT,
      1
    );

    return {
      width: DESIGN_WIDTH * scale,

      height: DESIGN_HEIGHT * scale,

      scale,
    };
  }, [width, height]);

  // ==========================================================
  // SCALE
  //
  // s  = layout
  // fs = readable iPad typography
  // ==========================================================

  const s = Math.max(
    tablet.scale,
    0.68
  );

  const fs = Math.max(
    tablet.scale,
    0.92
  );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] = useState<AdminProfile | null>(
    null
  );

  const [
    request,
    setRequest,
  ] = useState<AdminBloodRequest | null>(
    null
  );

  const [
    responses,
    setResponses,
  ] = useState<
    AdminBloodRequestDonorResponse[]
  >([]);

  const [
    responseSummary,
    setResponseSummary,
  ] = useState<
    AdminBloodRequestResponseSummary
  >(
    DEFAULT_RESPONSE_SUMMARY
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    error,
    setError,
  ] = useState('');

  // ==========================================================
  // LOAD REQUEST
  // ==========================================================

  const loadRequest =
    useCallback(
      async () => {
        if (!id) {
          return;
        }

        try {
          setLoading(true);

          setError('');

          const token =
            await getAdminAccessToken();

          const storedProfile =
            await getAdminProfile();

          // --------------------------------------------------
          // ADMIN PROTECTION
          // --------------------------------------------------

          if (
            !token ||
            storedProfile?.role !== 'admin'
          ) {
            await clearAdminSession();

            router.replace('/');

            return;
          }

          setProfile(
            storedProfile
          );

          // --------------------------------------------------
          // REQUEST DETAILS
          // --------------------------------------------------

          const result =
            await getAdminBloodRequestById(
              token,
              id
            );

          setRequest(
            result.request
          );

          setResponses(
            result.responses ||
              []
          );

          setResponseSummary(
            result.response_summary ||
              DEFAULT_RESPONSE_SUMMARY
          );
        } catch (
          loadError
        ) {
          console.log(
            'ADMIN BLOOD REQUEST DETAIL ERROR:',
            loadError
          );

          setRequest(null);

          setResponses([]);

          setResponseSummary(
            DEFAULT_RESPONSE_SUMMARY
          );

          setError(
            loadError instanceof Error
              ? loadError.message
              : 'Unable to load blood request.'
          );
        } finally {
          setLoading(false);
        }
      },
      [
        id,
      ]
    );

  // ==========================================================
  // FOCUS
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadRequest();
    }, [loadRequest])
  );

  // ==========================================================
  // ADMIN DISPLAY
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(Boolean)
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

  const adminInitial =
    adminName
      .charAt(0)
      .toUpperCase();

  // ==========================================================
  // REQUESTER
  // ==========================================================

  const requesterName =
    request
      ? getRequesterName(
          request
        )
      : 'Requester';

  const requesterInitial =
    requesterName
      .charAt(0)
      .toUpperCase();

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View
      style={
        styles.outer
      }
    >
      <View
        style={[
          styles.ipadCanvas,

          {
            width:
              tablet.width,

            height:
              tablet.height,
          },

          Platform.OS !== 'web' &&
            styles.nativeCanvas,
        ]}
      >
        <StatusBar
          style="light"
        />

        <LinearGradient
          colors={[
            '#081430',
            '#050B19',
            '#030814',
          ]}
          style={
            styles.gradient
          }
        >
          <SafeAreaView
            style={
              styles.safeArea
            }
          >
            {/* ==================================================
                HEADER
            ================================================== */}

            <View
              style={[
                styles.header,

                {
                  height:
                    96 * s,

                  paddingHorizontal:
                    48 * s,
                },
              ]}
            >
              {/* BRAND */}

              <Pressable
                style={
                  styles.brandArea
                }
                onPress={() =>
                  router.replace(
                    '/dashboard'
                  )
                }
              >
                <View
                  style={[
                    styles.logoCircle,

                    {
                      width:
                        52 * s,

                      height:
                        52 * s,

                      borderRadius:
                        26 * s,
                    },
                  ]}
                >
                  <Image
                    source={require('../../assets/images/hemo-hero-logo.png')}
                    style={{
                      width:
                        46 * s,

                      height:
                        46 * s,
                    }}
                    resizeMode="contain"
                  />
                </View>

                <View>
                  <Text
                    style={[
                      styles.brand,

                      {
                        fontSize:
                          26 * fs,
                      },
                    ]}
                  >
                    <Text
                      style={
                        styles.brandRed
                      }
                    >
                      Hemo-
                    </Text>

                    Hero
                  </Text>

                  <Text
                    style={[
                      styles.portal,

                      {
                        fontSize:
                          11 * fs,

                        letterSpacing:
                          1.5 * s,
                      },
                    ]}
                  >
                    ADMIN PORTAL
                  </Text>
                </View>
              </Pressable>

              {/* ADMIN */}

              <View
                style={
                  styles.adminSection
                }
              >
                <View
                  style={[
                    styles.adminAvatar,

                    {
                      width:
                        48 * s,

                      height:
                        48 * s,

                      borderRadius:
                        24 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.adminAvatarText,

                      {
                        fontSize:
                          16 * fs,
                      },
                    ]}
                  >
                    {
                      adminInitial
                    }
                  </Text>
                </View>

                <View>
                  <Text
                    numberOfLines={
                      1
                    }
                    style={[
                      styles.adminName,

                      {
                        fontSize:
                          14 * fs,
                      },
                    ]}
                  >
                    {
                      adminName
                    }
                  </Text>

                  <Text
                    style={[
                      styles.adminRole,

                      {
                        fontSize:
                          12 * fs,
                      },
                    ]}
                  >
                    Administrator
                  </Text>
                </View>
              </View>
            </View>

            {/* ==================================================
                LOADING
            ================================================== */}

            {loading ? (
              <View
                style={
                  styles.stateArea
                }
              >
                <ActivityIndicator
                  size="large"
                  color={
                    COLORS.redBright
                  }
                />

                <Text
                  style={[
                    styles.stateText,

                    {
                      fontSize:
                        14 * fs,

                      marginTop:
                        13 * s,
                    },
                  ]}
                >
                  Loading blood request...
                </Text>
              </View>
            ) : error ? (
              /* =================================================
                 ERROR
              ================================================= */

              <View
                style={
                  styles.stateArea
                }
              >
                <MaterialIcons
                  name="error-outline"
                  size={
                    48 * s
                  }
                  color={
                    COLORS.redBright
                  }
                />

                <Text
                  style={[
                    styles.errorTitle,

                    {
                      fontSize:
                        20 * fs,

                      marginTop:
                        14 * s,
                    },
                  ]}
                >
                  Unable to Load Request
                </Text>

                <Text
                  style={[
                    styles.stateText,

                    {
                      fontSize:
                        13 * fs,

                      lineHeight:
                        20 * fs,

                      marginTop:
                        6 * s,
                    },
                  ]}
                >
                  {
                    error
                  }
                </Text>

                <View
                  style={[
                    styles.errorActions,

                    {
                      gap:
                        9 * s,

                      marginTop:
                        20 * s,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      router.replace(
                        '/requests'
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.secondaryButton,

                      {
                        height:
                          46 * s,

                        borderRadius:
                          10 * s,

                        paddingHorizontal:
                          18 * s,
                      },

                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.secondaryButtonText,

                        {
                          fontSize:
                            13 * fs,
                        },
                      ]}
                    >
                      Back to Requests
                    </Text>
                  </Pressable>

                  <Pressable
                    onPress={
                      loadRequest
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.primaryButton,

                      {
                        height:
                          46 * s,

                        borderRadius:
                          10 * s,

                        paddingHorizontal:
                          18 * s,
                      },

                      pressed &&
                        styles.buttonPressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,

                        {
                          fontSize:
                            13 * fs,
                        },
                      ]}
                    >
                      Try Again
                    </Text>
                  </Pressable>
                </View>
              </View>
            ) : request ? (
              /* =================================================
                 CONTENT
              ================================================= */

              <ScrollView
                style={
                  styles.scroll
                }
                contentContainerStyle={[
                  styles.content,

                  {
                    paddingHorizontal:
                      48 * s,

                    paddingTop:
                      26 * s,

                    paddingBottom:
                      42 * s,
                  },
                ]}
                showsVerticalScrollIndicator={
                  false
                }
              >
                {/* ==================================================
                    BACK
                ================================================== */}

                <Pressable
                  onPress={() =>
                    router.replace(
                      '/requests'
                    )
                  }
                  style={[
                    styles.backButton,

                    {
                      gap:
                        7 * s,

                      marginBottom:
                        18 * s,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={
                      20 * s
                    }
                    color={
                      COLORS.soft
                    }
                  />

                  <Text
                    style={[
                      styles.backText,

                      {
                        fontSize:
                          13 * fs,
                      },
                    ]}
                  >
                    Blood Requests
                  </Text>
                </Pressable>

                {/* ==================================================
                    REQUEST HERO
                ================================================== */}

                <View
                  style={[
                    styles.heroCard,

                    {
                      borderRadius:
                        16 * s,

                      padding:
                        23 * s,

                      marginBottom:
                        18 * s,
                    },
                  ]}
                >
                  <View
                    style={
                      styles.heroLeft
                    }
                  >
                    <View
                      style={[
                        styles.heroBloodIcon,

                        {
                          width:
                            66 * s,

                          height:
                            66 * s,

                          borderRadius:
                            16 * s,

                          marginRight:
                            16 * s,
                        },
                      ]}
                    >
                      <Text
                        style={[
                          styles.heroBloodText,

                          {
                            fontSize:
                              22 * fs,
                          },
                        ]}
                      >
                        {
                          request.blood_type
                        }
                      </Text>
                    </View>

                    <View
                      style={
                        styles.heroMain
                      }
                    >
                      <Text
                        style={[
                          styles.heroTitle,

                          {
                            fontSize:
                              23 * fs,

                            lineHeight:
                              30 * fs,
                          },
                        ]}
                      >
                        {request.units_needed}{' '}
                        {request.units_needed === 1
                          ? 'Unit'
                          : 'Units'}{' '}
                        of {request.blood_type}
                      </Text>

                      <Text
                        numberOfLines={
                          1
                        }
                        style={[
                          styles.heroFacility,

                          {
                            fontSize:
                              14 * fs,

                            lineHeight:
                              20 * fs,

                            marginTop:
                              3 * s,
                          },
                        ]}
                      >
                        {request.facility_name ||
                          'Facility not provided'}
                      </Text>

                      <Text
                        style={[
                          styles.heroMeta,

                          {
                            fontSize:
                              12 * fs,

                            marginTop:
                              6 * s,
                          },
                        ]}
                      >
                        Created{' '}
                        {formatDateTime(
                          request.created_at
                        )}
                      </Text>
                    </View>
                  </View>

                  <View
                    style={[
                      styles.heroBadges,

                      {
                        gap:
                          8 * s,
                      },
                    ]}
                  >
                    <UrgencyBadge
                      urgency={
                        request.urgency
                      }
                      scale={s}
                      fontScale={fs}
                    />

                    <RequestStatusBadge
                      status={
                        request.status
                      }
                      scale={s}
                      fontScale={fs}
                    />
                  </View>
                </View>

                {/* ==================================================
                    RESPONSE SUMMARY
                ================================================== */}

                <View
                  style={[
                    styles.summaryRow,

                    {
                      gap:
                        12 * s,

                      marginBottom:
                        18 * s,
                    },
                  ]}
                >
                  <MiniSummaryCard
                    scale={s}
                    fontScale={fs}
                    icon="groups"
                    label="RESPONSES"
                    value={
                      responseSummary.total
                    }
                  />

                  <MiniSummaryCard
                    scale={s}
                    fontScale={fs}
                    icon="schedule"
                    label="PENDING"
                    value={
                      responseSummary.pending
                    }
                    accent="orange"
                  />

                  <MiniSummaryCard
                    scale={s}
                    fontScale={fs}
                    icon="check-circle"
                    label="ACCEPTED"
                    value={
                      responseSummary.accepted
                    }
                    accent="green"
                  />

                  <MiniSummaryCard
                    scale={s}
                    fontScale={fs}
                    icon="cancel"
                    label="REJECTED"
                    value={
                      responseSummary.rejected
                    }
                    accent="red"
                  />
                </View>

                {/* ==================================================
                    MAIN GRID
                ================================================== */}

                <View
                  style={[
                    styles.mainGrid,

                    {
                      gap:
                        18 * s,
                    },
                  ]}
                >
                  {/* ================================================
                      LEFT COLUMN
                  ================================================ */}

                  <View
                    style={
                      styles.leftColumn
                    }
                  >
                    {/* REQUESTER */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="person-outline"
                      title="Requester Information"
                    >
                      <View
                        style={[
                          styles.requesterTop,

                          {
                            marginBottom:
                              20 * s,
                          },
                        ]}
                      >
                        <View
                          style={[
                            styles.requesterAvatar,

                            {
                              width:
                                54 * s,

                              height:
                                54 * s,

                              borderRadius:
                                27 * s,

                              marginRight:
                                12 * s,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.requesterAvatarText,

                              {
                                fontSize:
                                  16 * fs,
                              },
                            ]}
                          >
                            {
                              requesterInitial
                            }
                          </Text>
                        </View>

                        <View
                          style={
                            styles.requesterTopInfo
                          }
                        >
                          <Text
                            numberOfLines={
                              1
                            }
                            style={[
                              styles.requesterName,

                              {
                                fontSize:
                                  16 * fs,
                              },
                            ]}
                          >
                            {
                              requesterName
                            }
                          </Text>

                          <Text
                            numberOfLines={
                              1
                            }
                            style={[
                              styles.requesterEmail,

                              {
                                fontSize:
                                  12 * fs,

                                marginTop:
                                  2 * s,
                              },
                            ]}
                          >
                            {request.requester
                              ?.email ||
                              'Email unavailable'}
                          </Text>
                        </View>
                      </View>

                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Phone"
                          value={
                            request.requester
                              ?.phone ||
                            '—'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Blood Type"
                          value={
                            request.requester
                              ?.blood_type ||
                            'Not provided'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Gender"
                          value={
                            formatValue(
                              request.requester
                                ?.gender
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Location"
                          value={
                            formatLocation(
                              request.requester
                                ?.barangay,
                              request.requester
                                ?.city,
                              request.requester
                                ?.province
                            )
                          }
                        />
                      </InfoGrid>
                    </SectionCard>

                    {/* BLOOD REQUEST */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="bloodtype"
                      title="Blood Requirement"
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Blood Type"
                          value={
                            request.blood_type
                          }
                          highlight
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Units Needed"
                          value={`${request.units_needed} ${
                            request.units_needed ===
                            1
                              ? 'unit'
                              : 'units'
                          }`}
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Urgency"
                          value={
                            request.urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Scheduled'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Status"
                          value={
                            formatValue(
                              request.status
                            )
                          }
                        />
                      </InfoGrid>

                      {request.message ? (
                        <View
                          style={[
                            styles.messageBox,

                            {
                              marginTop:
                                18 * s,

                              padding:
                                14 * s,

                              borderRadius:
                                10 * s,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.messageLabel,

                              {
                                fontSize:
                                  11 * fs,
                              },
                            ]}
                          >
                            REQUEST MESSAGE
                          </Text>

                          <Text
                            style={[
                              styles.messageValue,

                              {
                                fontSize:
                                  13 * fs,

                                lineHeight:
                                  20 * fs,

                                marginTop:
                                  5 * s,
                              },
                            ]}
                          >
                            {
                              request.message
                            }
                          </Text>
                        </View>
                      ) : null}
                    </SectionCard>

                    {/* FACILITY */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="local-hospital"
                      title="Facility Information"
                    >
                      <InfoGrid>
                        <InfoItem
                          fontScale={fs}
                          label="Facility Name"
                          value={
                            request.facility_name ||
                            '—'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Facility Type"
                          value={
                            formatFacilityType(
                              request.facility_type
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Source"
                          value={
                            formatFacilitySource(
                              request.facility_source
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Address"
                          value={
                            request.facility_address ||
                            'Not provided'
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Latitude"
                          value={
                            formatCoordinate(
                              request.facility_latitude
                            )
                          }
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Longitude"
                          value={
                            formatCoordinate(
                              request.facility_longitude
                            )
                          }
                        />
                      </InfoGrid>
                    </SectionCard>
                  </View>

                  {/* ================================================
                      RIGHT COLUMN
                  ================================================ */}

                  <View
                    style={
                      styles.rightColumn
                    }
                  >
                    {/* SCHEDULE */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="event"
                      title="Request Schedule"
                    >
                      {request.urgency ===
                      'urgent' ? (
                        <View
                          style={[
                            styles.urgentPanel,

                            {
                              padding:
                                16 * s,

                              borderRadius:
                                11 * s,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.urgentIcon,

                              {
                                width:
                                  42 * s,

                                height:
                                  42 * s,

                                borderRadius:
                                  21 * s,

                                marginRight:
                                  11 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="priority-high"
                              size={
                                22 * s
                              }
                              color={
                                COLORS.orange
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.urgentTextArea
                            }
                          >
                            <Text
                              style={[
                                styles.urgentTitle,

                                {
                                  fontSize:
                                    14 * fs,
                                },
                              ]}
                            >
                              Urgent Request
                            </Text>

                            <Text
                              style={[
                                styles.urgentDescription,

                                {
                                  fontSize:
                                    12 * fs,

                                  lineHeight:
                                    18 * fs,

                                  marginTop:
                                    2 * s,
                                },
                              ]}
                            >
                              This request requires immediate donor attention.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <InfoGrid
                          singleColumn
                        >
                          <InfoItem
                            fontScale={fs}
                            label="Needed Date"
                            value={
                              formatDateOnly(
                                request.needed_date
                              )
                            }
                            fullWidth
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Needed Time"
                            value={
                              formatNeededTime(
                                request.needed_time
                              )
                            }
                            fullWidth
                          />
                        </InfoGrid>
                      )}
                    </SectionCard>

                    {/* REQUEST RECORD */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="receipt-long"
                      title="Request Record"
                    >
                      <InfoGrid
                        singleColumn
                      >
                        <InfoItem
                          fontScale={fs}
                          label="Request ID"
                          value={
                            request.id
                          }
                          fullWidth
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Created"
                          value={
                            formatDateTime(
                              request.created_at
                            )
                          }
                          fullWidth
                        />

                        <InfoItem
                          fontScale={fs}
                          label="Last Updated"
                          value={
                            formatDateTime(
                              request.updated_at
                            )
                          }
                          fullWidth
                        />
                      </InfoGrid>
                    </SectionCard>

                    {/* DONOR RESPONSES */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="volunteer-activism"
                      title="Donor Responses"
                    >
                      {responses.length ===
                      0 ? (
                        <View
                          style={[
                            styles.emptyResponse,

                            {
                              paddingVertical:
                                27 * s,
                            },
                          ]}
                        >
                          <View
                            style={[
                              styles.emptyResponseIcon,

                              {
                                width:
                                  48 * s,

                                height:
                                  48 * s,

                                borderRadius:
                                  24 * s,
                              },
                            ]}
                          >
                            <MaterialIcons
                              name="volunteer-activism"
                              size={
                                25 * s
                              }
                              color={
                                COLORS.muted
                              }
                            />
                          </View>

                          <Text
                            style={[
                              styles.emptyResponseTitle,

                              {
                                fontSize:
                                  14 * fs,

                                marginTop:
                                  10 * s,
                              },
                            ]}
                          >
                            No donor responses yet
                          </Text>

                          <Text
                            style={[
                              styles.emptyResponseText,

                              {
                                fontSize:
                                  12 * fs,

                                lineHeight:
                                  18 * fs,

                                marginTop:
                                  3 * s,
                              },
                            ]}
                          >
                            Donor responses will appear here when available.
                          </Text>
                        </View>
                      ) : (
                        <View>
                          {responses.map(
                            (
                              response,
                              index
                            ) => (
                              <DonorResponseRow
                                key={
                                  response.id
                                }
                                response={
                                  response
                                }
                                scale={s}
                                fontScale={fs}
                                last={
                                  index ===
                                  responses.length -
                                    1
                                }
                              />
                            )
                          )}
                        </View>
                      )}
                    </SectionCard>
                  </View>
                </View>
              </ScrollView>
            ) : null}

            {/* ==================================================
                BOTTOM NAV
            ================================================== */}

            <AdminBottomNav
              activeTab="requests"
            />
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// SECTION CARD
// ============================================================

function SectionCard({
  scale,
  fontScale,
  icon,
  title,
  children,
}: {
  scale: number;

  fontScale: number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  title: string;

  children:
    React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,

        {
          padding:
            20 * scale,

          borderRadius:
            14 * scale,

          marginBottom:
            18 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,

          {
            gap:
              9 * scale,

            marginBottom:
              18 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width:
                38 * scale,

              height:
                38 * scale,

              borderRadius:
                10 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={
              icon
            }
            size={
              21 * scale
            }
            color={
              COLORS.redBright
            }
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,

            {
              fontSize:
                16 * fontScale,
            },
          ]}
        >
          {
            title
          }
        </Text>
      </View>

      {
        children
      }
    </View>
  );
}

// ============================================================
// INFO GRID
// ============================================================

function InfoGrid({
  children,
  singleColumn = false,
}: {
  children:
    React.ReactNode;

  singleColumn?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoGrid,

        singleColumn &&
          styles.infoGridSingle,
      ]}
    >
      {
        children
      }
    </View>
  );
}

// ============================================================
// INFO ITEM
// ============================================================

function InfoItem({
  fontScale,
  label,
  value,
  highlight = false,
  fullWidth = false,
}: {
  fontScale: number;

  label: string;

  value: string;

  highlight?: boolean;

  fullWidth?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoItem,

        fullWidth &&
          styles.infoItemFull,
      ]}
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize:
              11 * fontScale,
          },
        ]}
      >
        {
          label
        }
      </Text>

      <Text
        selectable
        style={[
          styles.infoValue,

          {
            fontSize:
              13 * fontScale,

            lineHeight:
              19 * fontScale,

            marginTop:
              4,
          },

          highlight &&
            styles.infoValueHighlight,
        ]}
      >
        {
          value
        }
      </Text>
    </View>
  );
}

// ============================================================
// MINI SUMMARY CARD
// ============================================================

function MiniSummaryCard({
  scale,
  fontScale,
  icon,
  label,
  value,
  accent = 'soft',
}: {
  scale: number;

  fontScale: number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  label: string;

  value: number;

  accent?:
    | 'soft'
    | 'red'
    | 'orange'
    | 'green';
}) {
  const accentColor =
    accent === 'red'
      ? COLORS.redBright
      : accent === 'orange'
        ? COLORS.orange
        : accent === 'green'
          ? COLORS.green
          : COLORS.soft;

  return (
    <View
      style={[
        styles.miniSummaryCard,

        {
          minHeight:
            92 * scale,

          borderRadius:
            12 * scale,

          padding:
            14 * scale,
        },
      ]}
    >
      <View
        style={
          styles.miniSummaryTop
        }
      >
        <MaterialIcons
          name={
            icon
          }
          size={
            19 * scale
          }
          color={
            accentColor
          }
        />

        <Text
          style={[
            styles.miniSummaryValue,

            {
              fontSize:
                24 * fontScale,
            },
          ]}
        >
          {
            value
          }
        </Text>
      </View>

      <Text
        style={[
          styles.miniSummaryLabel,

          {
            fontSize:
              11 * fontScale,

            marginTop:
              8 * scale,
          },
        ]}
      >
        {
          label
        }
      </Text>
    </View>
  );
}

// ============================================================
// DONOR RESPONSE ROW
// ============================================================

function DonorResponseRow({
  response,
  scale,
  fontScale,
  last,
}: {
  response:
    AdminBloodRequestDonorResponse;

  scale: number;

  fontScale: number;

  last: boolean;
}) {
  const donorName =
    getDonorName(
      response
    );

  const responseMessage =
    typeof response.message ===
    'string'
      ? response.message
      : null;

  return (
    <View
      style={[
        styles.responseRow,

        {
          paddingVertical:
            12 * scale,
        },

        last &&
          styles.noBottomBorder,
      ]}
    >
      <View
        style={[
          styles.responseAvatar,

          {
            width:
              40 * scale,

            height:
              40 * scale,

            borderRadius:
              20 * scale,

            marginRight:
              10 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.responseAvatarText,

            {
              fontSize:
                13 * fontScale,
            },
          ]}
        >
          {donorName
            .charAt(0)
            .toUpperCase()}
        </Text>
      </View>

      <View
        style={
          styles.responseMain
        }
      >
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.responseName,

            {
              fontSize:
                13 * fontScale,
            },
          ]}
        >
          {
            donorName
          }
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={[
            styles.responseEmail,

            {
              fontSize:
                11.5 * fontScale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {response.donor
            ?.email ||
            'Email unavailable'}
        </Text>

        {responseMessage ? (
          <Text
            numberOfLines={
              2
            }
            style={[
              styles.responseMessage,

              {
                fontSize:
                  12 * fontScale,

                lineHeight:
                  17 * fontScale,

                marginTop:
                  5 * scale,
              },
            ]}
          >
            {
              responseMessage
            }
          </Text>
        ) : null}

        <Text
          style={[
            styles.responseDate,

            {
              fontSize:
                11 * fontScale,

              marginTop:
                4 * scale,
            },
          ]}
        >
          {formatDateTime(
            response.created_at
          )}
        </Text>
      </View>

      <ResponseStatusBadge
        status={
          response.status
        }
        scale={
          scale
        }
        fontScale={
          fontScale
        }
      />
    </View>
  );
}

// ============================================================
// RESPONSE STATUS
// ============================================================

function ResponseStatusBadge({
  status,
  scale,
  fontScale,
}: {
  status: string;

  scale: number;

  fontScale: number;
}) {
  const normalized =
    String(
      status ||
        ''
    )
      .toLowerCase();

  return (
    <View
      style={[
        styles.responseStatus,

        {
          minHeight:
            30 * scale,

          borderRadius:
            15 * scale,

          paddingHorizontal:
            9 * scale,
        },

        normalized ===
          'accepted' &&
          styles.responseAccepted,

        normalized ===
          'pending' &&
          styles.responsePending,

        normalized ===
          'rejected' &&
          styles.responseRejected,

        normalized ===
          'withdrawn' &&
          styles.responseWithdrawn,
      ]}
    >
      <Text
        style={[
          styles.responseStatusText,

          {
            fontSize:
              11 * fontScale,
          },

          normalized ===
            'accepted' &&
            styles.responseAcceptedText,

          normalized ===
            'pending' &&
            styles.responsePendingText,

          normalized ===
            'rejected' &&
            styles.responseRejectedText,

          normalized ===
            'withdrawn' &&
            styles.responseWithdrawnText,
        ]}
      >
        {formatValue(
          normalized
        )}
      </Text>
    </View>
  );
}

// ============================================================
// URGENCY BADGE
// ============================================================

function UrgencyBadge({
  urgency,
  scale,
  fontScale,
}: {
  urgency:
    AdminBloodRequestUrgency;

  scale: number;

  fontScale: number;
}) {
  const urgent =
    urgency === 'urgent';

  return (
    <View
      style={[
        styles.heroBadge,

        {
          minHeight:
            36 * scale,

          borderRadius:
            18 * scale,

          paddingHorizontal:
            11 * scale,
        },

        urgent
          ? styles.heroUrgent
          : styles.heroScheduled,
      ]}
    >
      <MaterialIcons
        name={
          urgent
            ? 'priority-high'
            : 'event'
        }
        size={
          15 * scale
        }
        color={
          urgent
            ? COLORS.orange
            : COLORS.blue
        }
      />

      <Text
        style={[
          styles.heroBadgeText,

          {
            fontSize:
              12 * fontScale,

            marginLeft:
              4 * scale,
          },

          urgent
            ? styles.heroUrgentText
            : styles.heroScheduledText,
        ]}
      >
        {urgent
          ? 'Urgent'
          : 'Scheduled'}
      </Text>
    </View>
  );
}

// ============================================================
// REQUEST STATUS BADGE
// ============================================================

function RequestStatusBadge({
  status,
  scale,
  fontScale,
}: {
  status:
    AdminBloodRequestStatus;

  scale: number;

  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.heroBadge,

        {
          minHeight:
            36 * scale,

          borderRadius:
            18 * scale,

          paddingHorizontal:
            12 * scale,
        },

        status ===
          'active' &&
          styles.statusActive,

        status ===
          'fulfilled' &&
          styles.statusFulfilled,

        status ===
          'cancelled' &&
          styles.statusCancelled,
      ]}
    >
      <Text
        style={[
          styles.heroBadgeText,

          {
            fontSize:
              12 * fontScale,
          },

          status ===
            'active' &&
            styles.statusActiveText,

          status ===
            'fulfilled' &&
            styles.statusFulfilledText,

          status ===
            'cancelled' &&
            styles.statusCancelledText,
        ]}
      >
        {formatValue(
          status
        )}
      </Text>
    </View>
  );
}

// ============================================================
// REQUESTER NAME
// ============================================================

function getRequesterName(
  request:
    AdminBloodRequest
) {
  const user =
    request.requester;

  if (
    user?.full_name
      ?.trim()
  ) {
    return user.full_name.trim();
  }

  const name =
    [
      user?.first_name,
      user?.middle_name,
      user?.last_name,
      user?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  return (
    name ||
    user?.email ||
    'Unknown Requester'
  );
}

// ============================================================
// DONOR NAME
// ============================================================

function getDonorName(
  response:
    AdminBloodRequestDonorResponse
) {
  const donor =
    response.donor;

  if (
    donor?.full_name
      ?.trim()
  ) {
    return donor.full_name.trim();
  }

  const name =
    [
      donor?.first_name,
      donor?.middle_name,
      donor?.last_name,
      donor?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  return (
    name ||
    donor?.email ||
    'Donor'
  );
}

// ============================================================
// FORMAT VALUE
// ============================================================

function formatValue(
  value?:
    | string
    | null
) {
  if (!value) {
    return '—';
  }

  return value
    .replace(
      /_/g,
      ' '
    )
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

// ============================================================
// FACILITY TYPE
// ============================================================

function formatFacilityType(
  value?:
    | string
    | null
) {
  if (!value) {
    return 'Not provided';
  }

  if (
    value ===
    'manual'
  ) {
    return 'Manual Entry';
  }

  return formatValue(
    value
  );
}

// ============================================================
// FACILITY SOURCE
// ============================================================

function formatFacilitySource(
  value?:
    | string
    | null
) {
  if (!value) {
    return 'Not provided';
  }

  if (
    value ===
    'nearby'
  ) {
    return 'Nearby Facility';
  }

  if (
    value ===
    'manual'
  ) {
    return 'Manual Entry';
  }

  return formatValue(
    value
  );
}

// ============================================================
// LOCATION
// ============================================================

function formatLocation(
  barangay?:
    | string
    | null,

  city?:
    | string
    | null,

  province?:
    | string
    | null
) {
  const parts =
    [
      barangay,
      city,
      province,
    ]
      .filter(Boolean);

  if (
    parts.length === 0
  ) {
    return '—';
  }

  return parts.join(
    ', '
  );
}

// ============================================================
// COORDINATE
// ============================================================

function formatCoordinate(
  value?:
    | number
    | null
) {
  if (
    value === null ||
    value === undefined
  ) {
    return '—';
  }

  const numeric =
    Number(
      value
    );

  if (
    !Number.isFinite(
      numeric
    )
  ) {
    return '—';
  }

  return numeric.toFixed(
    5
  );
}

// ============================================================
// DATE ONLY
// ============================================================

function formatDateOnly(
  value?:
    | string
    | null
) {
  if (!value) {
    return 'Not provided';
  }

  const match =
    value.match(
      /^(\d{4})-(\d{2})-(\d{2})/
    );

  let date:
    Date;

  if (match) {
    date =
      new Date(
        Number(
          match[1]
        ),

        Number(
          match[2]
        ) - 1,

        Number(
          match[3]
        )
      );
  } else {
    date =
      new Date(
        value
      );
  }

  if (
    Number.isNaN(
      date.getTime()
    )
  ) {
    return value;
  }

  return date.toLocaleDateString(
    'en-PH',
    {
      month:
        'long',

      day:
        'numeric',

      year:
        'numeric',
    }
  );
}

// ============================================================
// NEEDED TIME
// ============================================================

function formatNeededTime(
  value?:
    | string
    | null
) {
  if (!value) {
    return 'Not provided';
  }

  const match =
    value.match(
      /^(\d{1,2}):(\d{2})/
    );

  if (!match) {
    return value;
  }

  const hour =
    Number(
      match[1]
    );

  const minute =
    Number(
      match[2]
    );

  const date =
    new Date();

  date.setHours(
    hour,
    minute,
    0,
    0
  );

  return date.toLocaleTimeString(
    'en-PH',
    {
      hour:
        'numeric',

      minute:
        '2-digit',

      hour12:
        true,
    }
  );
}

// ============================================================
// DATE + TIME
// ============================================================

function formatDateTime(
  value?:
    | string
    | null
) {
  if (!value) {
    return '—';
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
    return value;
  }

  return date.toLocaleString(
    'en-PH',
    {
      month:
        'short',

      day:
        'numeric',

      year:
        'numeric',

      hour:
        'numeric',

      minute:
        '2-digit',

      hour12:
        true,
    }
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    // ========================================================
    // PAGE
    // ========================================================

    outer: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.outer,
    },

    ipadCanvas: {
      overflow:
        'hidden',

      backgroundColor:
        COLORS.navy,

      borderRadius:
        Platform.OS === 'web'
          ? 24
          : 0,
    },

    nativeCanvas: {
      width:
        '100%',

      height:
        '100%',
    },

    gradient: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
    },

    scroll: {
      flex: 1,
    },

    content: {
      flexGrow: 1,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,
    },

    brandArea: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 14,
    },

    logoCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.white,
    },

    brand: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    brandRed: {
      color:
        COLORS.redBright,
    },

    portal: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',

      marginTop: 1,
    },

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 11,
    },

    adminAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    adminAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminName: {
      maxWidth: 170,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      marginTop: 2,
    },

    // ========================================================
    // STATE
    // ========================================================

    stateArea: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    stateText: {
      maxWidth: 480,

      color:
        COLORS.muted,

      textAlign:
        'center',

      fontFamily:
        'Inter_400Regular',
    },

    errorTitle: {
      color:
        COLORS.white,

      textAlign:
        'center',

      fontFamily:
        'Poppins_600SemiBold',
    },

    errorActions: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    primaryButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    secondaryButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    secondaryButtonText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // BACK
    // ========================================================

    backButton: {
      alignSelf:
        'flex-start',

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // HERO
    // ========================================================

    heroCard: {
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

      backgroundColor:
        COLORS.card,
    },

    heroLeft: {
      flex: 1,

      flexDirection:
        'row',

      alignItems:
        'center',

      minWidth: 0,
    },

    heroBloodIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    heroBloodText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Poppins_700Bold',
    },

    heroMain: {
      flex: 1,

      minWidth: 0,
    },

    heroTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    heroFacility: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_500Medium',
    },

    heroMeta: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    heroBadges: {
      flexDirection:
        'row',

      alignItems:
        'center',

      marginLeft: 16,
    },

    heroBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,
    },

    heroBadgeText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    heroUrgent: {
      borderColor:
        'rgba(243,163,74,0.46)',

      backgroundColor:
        'rgba(243,163,74,0.10)',
    },

    heroUrgentText: {
      color:
        COLORS.orange,
    },

    heroScheduled: {
      borderColor:
        'rgba(74,140,255,0.45)',

      backgroundColor:
        'rgba(74,140,255,0.10)',
    },

    heroScheduledText: {
      color:
        COLORS.blue,
    },

    statusActive: {
      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    statusActiveText: {
      color:
        COLORS.redBright,
    },

    statusFulfilled: {
      borderColor:
        'rgba(53,201,130,0.45)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    statusFulfilledText: {
      color:
        COLORS.green,
    },

    statusCancelled: {
      borderColor:
        'rgba(127,136,159,0.45)',

      backgroundColor:
        'rgba(127,136,159,0.10)',
    },

    statusCancelledText: {
      color:
        COLORS.muted,
    },

    // ========================================================
    // SUMMARY
    // ========================================================

    summaryRow: {
      flexDirection:
        'row',
    },

    miniSummaryCard: {
      flex: 1,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    miniSummaryTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    miniSummaryValue: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    miniSummaryLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.4,
    },

    // ========================================================
    // MAIN GRID
    // ========================================================

    mainGrid: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    leftColumn: {
      flex: 1.35,
    },

    rightColumn: {
      flex: 1,
    },

    // ========================================================
    // SECTION
    // ========================================================

    sectionCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    sectionHeader: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    sectionIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    sectionTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    // ========================================================
    // REQUESTER
    // ========================================================

    requesterTop: {
      flexDirection:
        'row',

      alignItems:
        'center',

      paddingBottom:
        17,

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.rowBorder,
    },

    requesterAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    requesterAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    requesterTopInfo: {
      flex: 1,

      minWidth: 0,
    },

    requesterName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    requesterEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // INFO
    // ========================================================

    infoGrid: {
      flexDirection:
        'row',

      flexWrap:
        'wrap',

      rowGap: 18,

      columnGap: 10,
    },

    infoGridSingle: {
      flexDirection:
        'column',

      flexWrap:
        'nowrap',
    },

    infoItem: {
      width:
        '48%',
    },

    infoItemFull: {
      width:
        '100%',
    },

    infoLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      textTransform:
        'uppercase',

      letterSpacing:
        0.5,
    },

    infoValue: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    infoValueHighlight: {
      color:
        COLORS.redBright,

      fontFamily:
        'Poppins_600SemiBold',
    },

    // ========================================================
    // REQUEST MESSAGE
    // ========================================================

    messageBox: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    messageLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.5,
    },

    messageValue: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // URGENT PANEL
    // ========================================================

    urgentPanel: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(243,163,74,0.38)',

      backgroundColor:
        'rgba(243,163,74,0.08)',
    },

    urgentIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        'rgba(243,163,74,0.12)',
    },

    urgentTextArea: {
      flex: 1,
    },

    urgentTitle: {
      color:
        COLORS.orange,

      fontFamily:
        'Inter_600SemiBold',
    },

    urgentDescription: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // RESPONSES
    // ========================================================

    responseRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.rowBorder,
    },

    noBottomBorder: {
      borderBottomWidth:
        0,
    },

    responseAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    responseAvatarText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    responseMain: {
      flex: 1,

      minWidth: 0,

      paddingRight: 8,
    },

    responseName: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    responseEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    responseMessage: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_400Regular',
    },

    responseDate: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    responseStatus: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    responseStatusText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    responseAccepted: {
      borderColor:
        'rgba(53,201,130,0.45)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    responseAcceptedText: {
      color:
        COLORS.green,
    },

    responsePending: {
      borderColor:
        'rgba(243,163,74,0.45)',

      backgroundColor:
        'rgba(243,163,74,0.10)',
    },

    responsePendingText: {
      color:
        COLORS.orange,
    },

    responseRejected: {
      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    responseRejectedText: {
      color:
        COLORS.redBright,
    },

    responseWithdrawn: {
      borderColor:
        'rgba(127,136,159,0.45)',

      backgroundColor:
        'rgba(127,136,159,0.10)',
    },

    responseWithdrawnText: {
      color:
        COLORS.muted,
    },

    // ========================================================
    // EMPTY RESPONSES
    // ========================================================

    emptyResponse: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    emptyResponseIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    emptyResponseTitle: {
      color:
        COLORS.white,

      textAlign:
        'center',

      fontFamily:
        'Poppins_600SemiBold',
    },

    emptyResponseText: {
      maxWidth: 320,

      color:
        COLORS.muted,

      textAlign:
        'center',

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // SHARED
    // ========================================================

    buttonPressed: {
      opacity:
        0.78,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },
  });