import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
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

import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  getAdminBloodRequestById,
  type AdminBloodRequest,
  type AdminBloodRequestDonorResponse,
  type AdminBloodRequestResponseSummary,
  type AdminBloodRequestStatus,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// DESIGN
//
// Layout follows the Donor Application review screen
// (applications/[id].tsx). Uses the shared AdminHeader.
// ============================================================

const DESIGN_WIDTH = 1366;
const DESIGN_HEIGHT = 1024;

const COLORS = {
  outer: '#02040A',
  navy: '#050B19',

  card: '#091126',
  cardLight: '#101A35',

  border: '#243554',

  red: '#DB0A0A',
  redBright: '#EF3340',

  white: '#FFFFFF',

  muted: '#7F889F',
  soft: '#B7C1D8',

  green: '#35C982',
  orange: '#F3A34A',
  blue: '#4A8CFF',

  track: '#17233D',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

const DEFAULT_RESPONSE_SUMMARY: AdminBloodRequestResponseSummary = {
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

  const { width, height } = useWindowDimensions();

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

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [request, setRequest] =
    useState<AdminBloodRequest | null>(null);

  const [responses, setResponses] =
    useState<AdminBloodRequestDonorResponse[]>([]);

  const [responseSummary, setResponseSummary] =
    useState<AdminBloodRequestResponseSummary>(
      DEFAULT_RESPONSE_SUMMARY
    );

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // ==========================================================
  // LOAD
  //
  // Reloads on focus without blanking the screen once a
  // request has been shown.
  // ==========================================================

  const loadRequest = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      setError('');

      const token =
        await getAdminAccessToken();

      const storedProfile =
        await getAdminProfile();

      if (
        !token ||
        storedProfile?.role !== 'admin'
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(storedProfile);

      const result =
        await getAdminBloodRequestById(
          token,
          id
        );

      setRequest(result.request);

      setResponses(
        result.responses ||
          []
      );

      setResponseSummary(
        result.response_summary ||
          DEFAULT_RESPONSE_SUMMARY
      );
    } catch (loadError) {
      console.log(
        'ADMIN BLOOD REQUEST DETAIL ERROR:',
        loadError
      );

      setError(
        loadError instanceof Error
          ? loadError.message
          : 'Unable to load blood request.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  useFocusEffect(
    useCallback(() => {
      loadRequest();
    }, [loadRequest])
  );

  // ==========================================================
  // DERIVED
  // ==========================================================

  const requester =
    request?.requester || null;

  const requesterName =
    request
      ? getPersonName(
          requester,
          'Unknown requester'
        )
      : '';

  const urgent =
    request?.urgency === 'urgent';

  const unitsNeeded =
    Number(request?.units_needed || 0);

  const acceptedPercent =
    unitsNeeded > 0
      ? Math.min(
          100,
          Math.round(
            (responseSummary.accepted /
              unitsNeeded) *
              100
          )
        )
      : 0;

  // ==========================================================
  // UI
  // ==========================================================

  return (
    <View style={styles.outer}>
      <View
        style={[
          styles.ipadCanvas,

          {
            width: tablet.width,
            height: tablet.height,
          },

          Platform.OS !== 'web' &&
            styles.nativeCanvas,
        ]}
      >
        <StatusBar style="light" />

        <LinearGradient
          colors={[
            '#081430',
            '#050B19',
            '#030814',
          ]}
          style={styles.gradient}
        >
          <SafeAreaView style={styles.safeArea}>
            <AdminHeader
              profile={profile}
              scale={s}
              fontScale={fs}
            />

            {loading && !request ? (
              <View style={styles.loadingArea}>
                <ActivityIndicator
                  size="large"
                  color={COLORS.redBright}
                />

                <Text
                  style={[
                    styles.mutedText,

                    {
                      fontSize: 14 * fs,
                      marginTop: 14 * s,
                    },
                  ]}
                >
                  Loading blood request...
                </Text>
              </View>
            ) : !request ? (
              <View style={styles.loadingArea}>
                <MaterialIcons
                  name="error-outline"
                  size={48 * s}
                  color={COLORS.redBright}
                />

                <Text
                  style={[
                    styles.errorTitle,

                    {
                      fontSize: 20 * fs,
                      marginTop: 15 * s,
                    },
                  ]}
                >
                  Unable to Load Request
                </Text>

                <Text
                  style={[
                    styles.mutedText,
                    styles.centerText,

                    {
                      fontSize: 13 * fs,
                      marginTop: 7 * s,
                    },
                  ]}
                >
                  {error ||
                    'This blood request could not be found.'}
                </Text>

                <View
                  style={[
                    styles.row,

                    {
                      gap: 10 * s,
                      marginTop: 20 * s,
                    },
                  ]}
                >
                  <SmallButton
                    label="Back to Requests"
                    icon="arrow-back"
                    scale={s}
                    fontScale={fs}
                    onPress={() =>
                      router.replace('/requests')
                    }
                  />

                  <SmallButton
                    label="Try Again"
                    icon="refresh"
                    primary
                    scale={s}
                    fontScale={fs}
                    onPress={loadRequest}
                  />
                </View>
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                  styles.content,

                  {
                    paddingHorizontal: 48 * s,
                    paddingTop: 30 * s,
                    paddingBottom: 50 * s,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* BACK */}

                <Pressable
                  onPress={() => router.back()}
                  style={({ pressed }) => [
                    styles.backButton,

                    {
                      gap: 7 * s,
                      marginBottom: 20 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <MaterialIcons
                    name="arrow-back"
                    size={20 * s}
                    color={COLORS.soft}
                  />

                  <Text
                    style={[
                      styles.backText,

                      {
                        fontSize: 13 * fs,
                      },
                    ]}
                  >
                    Blood Requests
                  </Text>
                </Pressable>

                {error ? (
                  <View
                    style={[
                      styles.errorBanner,

                      {
                        padding: 14 * s,
                        borderRadius: 12 * s,
                        marginBottom: 18 * s,
                        gap: 9 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={20 * s}
                      color={COLORS.redBright}
                    />

                    <Text
                      style={[
                        styles.errorBannerText,

                        {
                          fontSize: 12.5 * fs,
                        },
                      ]}
                    >
                      Could not refresh this request: {error}
                    </Text>
                  </View>
                ) : null}

                {/* ==================================================
                    SUMMARY CARD
                ================================================== */}

                <FadeInView>
                  <View
                    style={[
                      styles.profileCard,

                      {
                        padding: 24 * s,
                        borderRadius: 16 * s,
                        marginBottom: 20 * s,
                      },
                    ]}
                  >
                    <View style={styles.profileMain}>
                      <View
                        style={[
                          styles.bloodHero,

                          {
                            width: 70 * s,
                            height: 70 * s,
                            borderRadius: 18 * s,
                            marginRight: 17 * s,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.bloodHeroText,

                            {
                              fontSize: 22 * fs,
                            },
                          ]}
                        >
                          {request.blood_type}
                        </Text>
                      </View>

                      <View style={styles.flexFill}>
                        <Text
                          style={[
                            styles.heroTitle,

                            {
                              fontSize: 22 * fs,
                            },
                          ]}
                        >
                          {unitsNeeded}{' '}
                          {unitsNeeded === 1
                            ? 'unit'
                            : 'units'}{' '}
                          of {request.blood_type} needed
                        </Text>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.heroSubtitle,

                            {
                              fontSize: 13 * fs,
                              marginTop: 3 * s,
                            },
                          ]}
                        >
                          {request.facility_name ||
                            'Facility not provided'}
                        </Text>

                        <Text
                          style={[
                            styles.mutedText,

                            {
                              fontSize: 12 * fs,
                              marginTop: 6 * s,
                            },
                          ]}
                        >
                          Requested by {requesterName} •{' '}
                          {formatDateTime(request.created_at)}
                        </Text>
                      </View>
                    </View>

                    <View
                      style={[
                        styles.row,

                        {
                          gap: 10 * s,
                          marginLeft: 16 * s,
                        },
                      ]}
                    >
                      {request.requester_id ? (
                        <SmallButton
                          label="View Requester"
                          icon="person-search"
                          scale={s}
                          fontScale={fs}
                          onPress={() =>
                            router.push(
                              `/users/${request.requester_id}` as any
                            )
                          }
                        />
                      ) : null}

                      <Badge
                        scale={s}
                        fontScale={fs}
                        icon={
                          urgent
                            ? 'priority-high'
                            : 'event'
                        }
                        label={
                          urgent
                            ? 'Urgent'
                            : 'Scheduled'
                        }
                        color={
                          urgent
                            ? COLORS.redBright
                            : COLORS.blue
                        }
                      />

                      <Badge
                        scale={s}
                        fontScale={fs}
                        label={formatValue(request.status)}
                        color={
                          getStatusColor(request.status)
                        }
                      />
                    </View>
                  </View>
                </FadeInView>

                {/* ==================================================
                    MAIN GRID
                ================================================== */}

                <View
                  style={[
                    styles.mainGrid,

                    {
                      gap: 18 * s,
                    },
                  ]}
                >
                  {/* LEFT */}

                  <FadeInView
                    delay={60}
                    style={styles.leftColumn}
                  >
                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="person-outline"
                      title="Requester Information"
                    >
                      <InfoGrid>
                        <InfoItem fontScale={fs} label="Full Name" value={requesterName} />
                        <InfoItem fontScale={fs} label="Email" value={requester?.email || '—'} />
                        <InfoItem fontScale={fs} label="Phone" value={requester?.phone || '—'} />
                        <InfoItem fontScale={fs} label="Blood Type" value={requester?.blood_type || '—'} />
                        <InfoItem fontScale={fs} label="Gender" value={formatValue(requester?.gender)} />
                        <InfoItem
                          fontScale={fs}
                          label="Location"
                          value={formatLocation(
                            requester?.barangay,
                            requester?.city,
                            requester?.province
                          )}
                        />
                      </InfoGrid>
                    </SectionCard>

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
                          value={request.blood_type}
                          color={COLORS.redBright}
                        />
                        <InfoItem
                          fontScale={fs}
                          label="Units Needed"
                          value={`${unitsNeeded} ${unitsNeeded === 1 ? 'unit' : 'units'}`}
                        />
                        <InfoItem
                          fontScale={fs}
                          label="Urgency"
                          value={urgent ? 'Urgent' : 'Scheduled'}
                          color={urgent ? COLORS.redBright : COLORS.blue}
                        />
                        <InfoItem
                          fontScale={fs}
                          label="Status"
                          value={formatValue(request.status)}
                          color={getStatusColor(request.status)}
                        />
                      </InfoGrid>

                      {request.message ? (
                        <>
                          <Text
                            style={[
                              styles.infoLabel,

                              {
                                fontSize: 11 * fs,
                                marginTop: 20 * s,
                                marginBottom: 8 * s,
                              },
                            ]}
                          >
                            Message from requester
                          </Text>

                          <View
                            style={[
                              styles.messagePanel,

                              {
                                padding: 15 * s,
                                borderRadius: 11 * s,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.messageText,

                                {
                                  fontSize: 13.5 * fs,
                                  lineHeight: 21 * fs,
                                },
                              ]}
                            >
                              {request.message}
                            </Text>
                          </View>
                        </>
                      ) : null}
                    </SectionCard>

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="local-hospital"
                      title="Facility Information"
                    >
                      <InfoGrid>
                        <InfoItem fontScale={fs} label="Facility Name" value={request.facility_name || '—'} />
                        <InfoItem fontScale={fs} label="Facility Type" value={formatFacility(request.facility_type)} />
                        <InfoItem fontScale={fs} label="Source" value={formatSource(request.facility_source)} />
                        <InfoItem fontScale={fs} label="Address" value={request.facility_address || '—'} />
                        <InfoItem fontScale={fs} label="Latitude" value={formatCoordinate(request.facility_latitude)} />
                        <InfoItem fontScale={fs} label="Longitude" value={formatCoordinate(request.facility_longitude)} />
                      </InfoGrid>
                    </SectionCard>
                  </FadeInView>

                  {/* RIGHT */}

                  <FadeInView
                    delay={120}
                    style={styles.rightColumn}
                  >
                    {/* RESPONSES */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="volunteer-activism"
                      title="Donor Responses"
                    >
                      <View
                        style={[
                          styles.row,

                          {
                            gap: 8 * s,
                          },
                        ]}
                      >
                        <MiniStat scale={s} fontScale={fs} label="Total" value={responseSummary.total} />
                        <MiniStat scale={s} fontScale={fs} label="Pending" value={responseSummary.pending} color={COLORS.orange} />
                        <MiniStat scale={s} fontScale={fs} label="Accepted" value={responseSummary.accepted} color={COLORS.green} />
                        <MiniStat scale={s} fontScale={fs} label="Rejected" value={responseSummary.rejected} color={COLORS.redBright} />
                      </View>

                      <View
                        style={{
                          marginTop: 16 * s,
                        }}
                      >
                        <View style={styles.spaceBetween}>
                          <Text
                            style={[
                              styles.infoLabel,

                              {
                                fontSize: 11 * fs,
                              },
                            ]}
                          >
                            Accepted donors vs units needed
                          </Text>

                          <Text
                            style={[
                              styles.progressValue,

                              {
                                fontSize: 12.5 * fs,
                              },
                            ]}
                          >
                            {responseSummary.accepted} / {unitsNeeded}
                          </Text>
                        </View>

                        <View
                          style={[
                            styles.progressTrack,

                            {
                              height: 7 * s,
                              borderRadius: 4 * s,
                              marginTop: 8 * s,
                            },
                          ]}
                        >
                          <View
                            style={{
                              width: `${acceptedPercent}%`,
                              height: '100%',
                              borderRadius: 4 * s,
                              backgroundColor: COLORS.green,
                            }}
                          />
                        </View>
                      </View>

                      {responses.length === 0 ? (
                        <View
                          style={[
                            styles.centerArea,

                            {
                              paddingVertical: 24 * s,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="volunteer-activism"
                            size={30 * s}
                            color={COLORS.muted}
                          />

                          <Text
                            style={[
                              styles.emptyTitle,

                              {
                                fontSize: 14 * fs,
                                marginTop: 10 * s,
                              },
                            ]}
                          >
                            No donor responses yet
                          </Text>

                          <Text
                            style={[
                              styles.mutedText,
                              styles.centerText,

                              {
                                fontSize: 12 * fs,
                                marginTop: 3 * s,
                              },
                            ]}
                          >
                            Donors who respond will appear here.
                          </Text>
                        </View>
                      ) : (
                        <View
                          style={{
                            marginTop: 10 * s,
                          }}
                        >
                          {responses.map((response, index) => (
                            <ResponseRow
                              key={response.id}
                              response={response}
                              scale={s}
                              fontScale={fs}
                              last={
                                index === responses.length - 1
                              }
                            />
                          ))}
                        </View>
                      )}
                    </SectionCard>

                    {/* SCHEDULE */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="event"
                      title="Request Schedule"
                    >
                      {urgent ? (
                        <View
                          style={[
                            styles.urgentPanel,

                            {
                              padding: 15 * s,
                              borderRadius: 11 * s,
                              gap: 11 * s,
                            },
                          ]}
                        >
                          <MaterialIcons
                            name="priority-high"
                            size={22 * s}
                            color={COLORS.redBright}
                          />

                          <View style={styles.flexFill}>
                            <Text
                              style={[
                                styles.urgentTitle,

                                {
                                  fontSize: 14 * fs,
                                },
                              ]}
                            >
                              Urgent Request
                            </Text>

                            <Text
                              style={[
                                styles.mutedText,

                                {
                                  fontSize: 12 * fs,
                                  lineHeight: 18 * fs,
                                  marginTop: 2 * s,
                                },
                              ]}
                            >
                              This request needs donors as soon as possible.
                            </Text>
                          </View>
                        </View>
                      ) : (
                        <InfoGrid>
                          <InfoItem fontScale={fs} label="Needed Date" value={formatDateOnly(request.needed_date)} />
                          <InfoItem fontScale={fs} label="Needed Time" value={formatTimeOnly(request.needed_time)} />
                        </InfoGrid>
                      )}
                    </SectionCard>

                    {/* RECORD */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="receipt-long"
                      title="Request Record"
                    >
                      <InfoGrid>
                        <InfoItem fontScale={fs} label="Created" value={formatDateTime(request.created_at)} />
                        <InfoItem fontScale={fs} label="Last Updated" value={formatDateTime(request.updated_at)} />
                        <InfoItem fontScale={fs} label="Request ID" value={request.id} wide />
                      </InfoGrid>
                    </SectionCard>
                  </FadeInView>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </LinearGradient>
      </View>
    </View>
  );
}

// ============================================================
// SMALL COMPONENTS
// ============================================================

function SmallButton({
  label,
  icon,
  primary = false,
  scale,
  fontScale,
  onPress,
}: {
  label: string;
  icon: IconName;
  primary?: boolean;
  scale: number;
  fontScale: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        primary
          ? styles.primaryButton
          : styles.outlineButton,

        {
          height: 42 * scale,
          paddingHorizontal: 15 * scale,
          borderRadius: 10 * scale,
          gap: 7 * scale,
        },

        pressed &&
          styles.pressed,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={18 * scale}
        color={
          primary
            ? COLORS.white
            : COLORS.soft
        }
      />

      <Text
        style={[
          styles.buttonText,

          {
            fontSize: 12.5 * fontScale,
            color: primary
              ? COLORS.white
              : COLORS.soft,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function Badge({
  scale,
  fontScale,
  icon,
  label,
  color,
}: {
  scale: number;
  fontScale: number;
  icon?: IconName;
  label: string;
  color: string;
}) {
  return (
    <View
      style={[
        styles.badge,

        {
          height: 42 * scale,
          minWidth: 100 * scale,
          paddingHorizontal: 13 * scale,
          borderRadius: 8 * scale,
          gap: 5 * scale,
          borderColor: `${color}88`,
          backgroundColor: `${color}1F`,
        },
      ]}
    >
      {icon ? (
        <MaterialIcons
          name={icon}
          size={16 * scale}
          color={color}
        />
      ) : null}

      <Text
        style={[
          styles.badgeText,

          {
            fontSize: 12.5 * fontScale,
            color,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function SectionCard({
  scale,
  fontScale,
  icon,
  title,
  children,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  children: ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,

        {
          padding: 21 * scale,
          borderRadius: 15 * scale,
          marginBottom: 18 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.row,

          {
            alignItems: 'center',
            gap: 9 * scale,
            marginBottom: 19 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width: 38 * scale,
              height: 38 * scale,
              borderRadius: 10 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={icon}
            size={21 * scale}
            color={COLORS.redBright}
          />
        </View>

        <Text
          style={[
            styles.sectionTitle,

            {
              fontSize: 16 * fontScale,
            },
          ]}
        >
          {title}
        </Text>
      </View>

      {children}
    </View>
  );
}

function InfoGrid({
  children,
}: {
  children: ReactNode;
}) {
  return (
    <View style={styles.infoGrid}>
      {children}
    </View>
  );
}

function InfoItem({
  fontScale,
  label,
  value,
  color,
  wide = false,
}: {
  fontScale: number;
  label: string;
  value: string;
  color?: string;
  wide?: boolean;
}) {
  return (
    <View
      style={
        wide
          ? styles.infoItemWide
          : styles.infoItem
      }
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize: 11 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={2}
        style={[
          styles.infoValue,

          {
            fontSize: 13 * fontScale,
            lineHeight: 19 * fontScale,
            marginTop: 4,
          },

          color
            ? { color }
            : null,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

function MiniStat({
  scale,
  fontScale,
  label,
  value,
  color = COLORS.white,
}: {
  scale: number;
  fontScale: number;
  label: string;
  value: number;
  color?: string;
}) {
  return (
    <View
      style={[
        styles.miniStat,

        {
          paddingVertical: 10 * scale,
          paddingHorizontal: 10 * scale,
          borderRadius: 10 * scale,
        },
      ]}
    >
      <Text
        style={[
          styles.miniValue,

          {
            fontSize: 19 * fontScale,
            color,
          },
        ]}
      >
        {value}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.mutedText,

          {
            fontSize: 11 * fontScale,
          },
        ]}
      >
        {label}
      </Text>
    </View>
  );
}

function ResponseRow({
  response,
  scale,
  fontScale,
  last,
}: {
  response: AdminBloodRequestDonorResponse;
  scale: number;
  fontScale: number;
  last: boolean;
}) {
  const donorName =
    getPersonName(
      response.donor,
      'Donor'
    );

  const status =
    getResponseStatus(response.status);

  const message =
    typeof response.message === 'string'
      ? response.message
      : null;

  const donorId =
    response.donor?.id ||
    response.donor_id;

  return (
    <Pressable
      disabled={!donorId}
      onPress={() =>
        router.push(
          `/users/${donorId}` as any
        )
      }
      style={({ pressed }) => [
        styles.responseRow,

        {
          paddingVertical: 12 * scale,
          gap: 11 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.pressed,
      ]}
    >
      <View
        style={[
          styles.avatar,

          {
            width: 38 * scale,
            height: 38 * scale,
            borderRadius: 19 * scale,
          },
        ]}
      >
        <Text
          style={[
            styles.avatarText,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {donorName.charAt(0).toUpperCase()}
        </Text>
      </View>

      <View style={styles.flexFill}>
        <Text
          numberOfLines={1}
          style={[
            styles.responseName,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {donorName}
          {response.donor?.blood_type ? (
            <Text style={styles.responseBlood}>
              {'  '}
              {response.donor.blood_type}
            </Text>
          ) : null}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.mutedText,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 2 * scale,
            },
          ]}
        >
          {response.donor?.email ||
            'Email unavailable'}{' '}
          • {formatDateTime(response.created_at)}
        </Text>

        {message ? (
          <Text
            numberOfLines={2}
            style={[
              styles.responseMessage,

              {
                fontSize: 12 * fontScale,
                lineHeight: 17 * fontScale,
                marginTop: 5 * scale,
              },
            ]}
          >
            “{message}”
          </Text>
        ) : null}
      </View>

      <View
        style={[
          styles.badge,

          {
            height: 28 * scale,
            paddingHorizontal: 10 * scale,
            borderRadius: 6 * scale,
            borderColor: `${status.color}88`,
            backgroundColor: `${status.color}1F`,
          },
        ]}
      >
        <Text
          style={[
            styles.badgeText,

            {
              fontSize: 11.5 * fontScale,
              color: status.color,
            },
          ]}
        >
          {status.label}
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getPersonName(
  person:
    | {
        full_name?: string | null;
        first_name?: string | null;
        middle_name?: string | null;
        last_name?: string | null;
        suffix?: string | null;
        email?: string | null;
      }
    | null
    | undefined,
  fallback: string
) {
  if (person?.full_name?.trim()) {
    return person.full_name.trim();
  }

  return (
    [
      person?.first_name,
      person?.middle_name,
      person?.last_name,
      person?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    person?.email ||
    fallback
  );
}

function getStatusColor(
  status: AdminBloodRequestStatus
) {
  switch (status) {
    case 'active':
      return COLORS.orange;

    case 'fulfilled':
      return COLORS.green;

    default:
      return COLORS.muted;
  }
}

function getResponseStatus(
  status: string
) {
  switch (
    String(status || '').toLowerCase()
  ) {
    case 'accepted':
      return {
        label: 'Accepted',
        color: COLORS.green,
      };

    case 'pending':
      return {
        label: 'Pending',
        color: COLORS.orange,
      };

    case 'rejected':
      return {
        label: 'Rejected',
        color: COLORS.redBright,
      };

    case 'withdrawn':
      return {
        label: 'Withdrawn',
        color: COLORS.muted,
      };

    default:
      return {
        label: formatValue(status),
        color: COLORS.soft,
      };
  }
}

function formatValue(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  return value
    .replace(/_/g, ' ')
    .replace(
      /\b\w/g,
      character =>
        character.toUpperCase()
    );
}

function formatFacility(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  return value === 'manual'
    ? 'Manual Entry'
    : formatValue(value);
}

function formatSource(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  if (value === 'nearby') {
    return 'Nearby Facility';
  }

  if (value === 'manual') {
    return 'Manual Entry';
  }

  return formatValue(value);
}

function formatLocation(
  barangay?: string | null,
  city?: string | null,
  province?: string | null
) {
  return (
    [barangay, city, province]
      .filter(Boolean)
      .join(', ') ||
    '—'
  );
}

function formatCoordinate(
  value?: number | null
) {
  if (
    value === null ||
    value === undefined ||
    !Number.isFinite(Number(value))
  ) {
    return '—';
  }

  return Number(value).toFixed(5);
}

function formatDateOnly(
  value?: string | null
) {
  if (!value) {
    return 'Not provided';
  }

  const match =
    value.match(/^(\d{4})-(\d{2})-(\d{2})/);

  const date = match
    ? new Date(
        Number(match[1]),
        Number(match[2]) - 1,
        Number(match[3])
      )
    : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString(
    undefined,
    {
      weekday: 'short',
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }
  );
}

function formatTimeOnly(
  value?: string | null
) {
  if (!value) {
    return 'Not provided';
  }

  const match =
    value.match(/^(\d{1,2}):(\d{2})/);

  if (!match) {
    return value;
  }

  const date = new Date();

  date.setHours(
    Number(match[1]),
    Number(match[2]),
    0,
    0
  );

  return date.toLocaleTimeString(
    undefined,
    {
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    }
  );
}

// ============================================================
// STYLES
// ============================================================

const styles = StyleSheet.create({
  outer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.outer,
  },

  ipadCanvas: {
    overflow: 'hidden',
    backgroundColor: COLORS.navy,
    borderRadius:
      Platform.OS === 'web'
        ? 24
        : 0,
  },

  nativeCanvas: {
    width: '100%',
    height: '100%',
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

  row: {
    flexDirection: 'row',
  },

  spaceBetween: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  flexFill: {
    flex: 1,
    minWidth: 0,
  },

  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerText: {
    textAlign: 'center',
  },

  mutedText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
  },

  errorTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.55)',
    backgroundColor: 'rgba(80,16,30,0.55)',
  },

  errorBannerText: {
    flex: 1,
    color: '#FFB8BE',
    fontFamily: 'Inter_500Medium',
  },

  // BACK

  backButton: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
  },

  backText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  // BUTTONS / BADGES

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  outlineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  buttonText: {
    fontFamily: 'Inter_600SemiBold',
  },

  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  badgeText: {
    fontFamily: 'Inter_600SemiBold',
  },

  // SUMMARY CARD

  profileCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  profileMain: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },

  bloodHero: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: '#C21319',
    backgroundColor: 'rgba(194,19,25,0.12)',
  },

  bloodHeroText: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_700Bold',
  },

  heroTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  heroSubtitle: {
    color: COLORS.soft,
    fontFamily: 'Inter_500Medium',
  },

  // GRID

  mainGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  leftColumn: {
    flex: 1.4,
  },

  rightColumn: {
    flex: 1,
  },

  // SECTION

  sectionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  sectionIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  sectionTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  // INFO

  infoGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    rowGap: 18,
    columnGap: 10,
  },

  infoItem: {
    width: '48%',
  },

  infoItemWide: {
    width: '100%',
  },

  infoLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_500Medium',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  infoValue: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  messagePanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  messageText: {
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
  },

  // RESPONSES

  miniStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  miniValue: {
    fontFamily: 'Poppins_600SemiBold',
  },

  progressTrack: {
    overflow: 'hidden',
    width: '100%',
    backgroundColor: COLORS.track,
  },

  progressValue: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  emptyTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  responseRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  avatar: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  avatarText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  responseName: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  responseBlood: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_600SemiBold',
  },

  responseMessage: {
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
    fontStyle: 'italic',
  },

  // SCHEDULE

  urgentPanel: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.40)',
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  urgentTitle: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  // INTERACTION

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },
});
