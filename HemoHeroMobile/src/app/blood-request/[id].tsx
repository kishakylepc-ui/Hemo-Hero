import {
  useCallback,
  useState,
} from 'react';

import {
  Alert,
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

import {
  cancelBloodRequest,
  getBloodRequestById,
} from '../../lib/api';

import type {
  BloodRequest,
} from '../../lib/api';

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

  white: '#FFFFFF',
  black: '#181818',

  pageTop: '#F1B2B4',
  pageBottom: '#D71318',

  card: '#FFFFFF',
  softCard: '#FFF8F8',

  muted: '#686868',
  lightMuted: '#939393',

  border: '#ECE3E3',
  softBorder: '#E8CECE',

  pinkLight: '#FFF1F1',

  green: '#198754',
  orange: '#E27D24',
  gray: '#AAAAAA',
};

// ============================================================
// SCREEN
// ============================================================

export default function BloodRequestDetailsScreen() {
  const params =
    useLocalSearchParams<{
      id?: string | string[];
    }>();

  const requestId =
    Array.isArray(params.id)
      ? params.id[0]
      : params.id;

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    request,
    setRequest,
  ] = useState<BloodRequest | null>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(true);

  const [
    errorMessage,
    setErrorMessage,
  ] = useState('');

  const [
    cancelling,
    setCancelling,
  ] = useState(false);

  // ==========================================================
  // LOAD REQUEST
  // ==========================================================

  const loadRequest =
    useCallback(async () => {
      if (!requestId) {
        setErrorMessage(
          'Blood request ID is missing.'
        );

        setLoading(false);

        return;
      }

      try {
        setLoading(true);

        setErrorMessage('');

        const token =
          await getAccessToken();

        if (!token) {
          router.replace('/');

          return;
        }

        const data =
          await getBloodRequestById(
            token,
            requestId
          );

        if (!data?.request) {
          throw new Error(
            'Blood request could not be found.'
          );
        }

        setRequest(
          data.request
        );
      } catch (error) {
        console.log(
          'LOAD BLOOD REQUEST ERROR:',
          error
        );

        setErrorMessage(
          error instanceof Error
            ? error.message
            : 'Unable to load this blood request.'
        );
      } finally {
        setLoading(false);
      }
    }, [requestId]);

  useFocusEffect(
    useCallback(() => {
      loadRequest();
    }, [loadRequest])
  );

  // ==========================================================
  // HELPERS
  // ==========================================================

  function getRequestNumber(
    id: string
  ) {
    return id
      .replaceAll('-', '')
      .slice(0, 6)
      .toUpperCase();
  }

  function formatCreatedAt(
    value: string
  ) {
    const date =
      new Date(value);

    if (
      Number.isNaN(
        date.getTime()
      )
    ) {
      return '';
    }

    return date.toLocaleString(
      'en-US',
      {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: 'numeric',
        minute: '2-digit',
      }
    );
  }

  function formatNeededBy(
    bloodRequest: BloodRequest
  ) {
    if (
      bloodRequest.urgency ===
      'urgent'
    ) {
      return 'As soon as possible';
    }

    if (
      !bloodRequest.needed_date
    ) {
      return 'Not specified';
    }

    const date =
      new Date(
        `${bloodRequest.needed_date}T00:00:00`
      );

    const dateText =
      date.toLocaleDateString(
        'en-US',
        {
          month: 'long',
          day: 'numeric',
          year: 'numeric',
        }
      );

    if (
      !bloodRequest.needed_time
    ) {
      return dateText;
    }

    const [
      hourText,
      minuteText,
    ] =
      bloodRequest.needed_time.split(
        ':'
      );

    const hour =
      Number(hourText);

    const minute =
      Number(minuteText);

    const time =
      new Date();

    time.setHours(
      hour,
      minute,
      0,
      0
    );

    const timeText =
      time.toLocaleTimeString(
        'en-US',
        {
          hour: 'numeric',
          minute: '2-digit',
        }
      );

    return `${dateText} • ${timeText}`;
  }

  function getStatusLabel() {
    if (!request) {
      return '';
    }

    switch (
      request.status
    ) {
      case 'active':
        return 'Active';

      case 'fulfilled':
        return 'Fulfilled';

      case 'cancelled':
        return 'Cancelled';

      case 'expired':
        return 'Expired';

      default:
        return request.status;
    }
  }

  function getStatusColor() {
    if (!request) {
      return COLORS.gray;
    }

    switch (
      request.status
    ) {
      case 'active':
      case 'fulfilled':
        return COLORS.green;

      case 'cancelled':
        return COLORS.redButton;

      case 'expired':
        return COLORS.orange;

      default:
        return COLORS.gray;
    }
  }

  // ==========================================================
  // CANCEL
  // ==========================================================

  function handleCancelPress() {
    if (
      !request ||
      request.status !==
        'active' ||
      cancelling
    ) {
      return;
    }

    if (
      Platform.OS === 'web' &&
      typeof window !== 'undefined'
    ) {
      const confirmed =
        window.confirm(
          'Cancel Blood Request\n\nThis request will no longer be visible as active to nearby donors.'
        );

      if (confirmed) {
        performCancel();
      }

      return;
    }

    Alert.alert(
      'Cancel Blood Request',
      'This request will no longer be visible as active to nearby donors.',
      [
        {
          text: 'Keep Request',
          style: 'cancel',
        },
        {
          text:
            'Cancel Blood Request',

          style:
            'destructive',

          onPress:
            performCancel,
        },
      ]
    );
  }

  async function performCancel() {
    if (
      !request ||
      cancelling
    ) {
      return;
    }

    try {
      setCancelling(true);

      const token =
        await getAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      await cancelBloodRequest(
        token,
        request.id
      );

      if (
        Platform.OS === 'web' &&
        typeof window !== 'undefined'
      ) {
        window.alert(
          'Blood Request Cancelled\n\nYour blood request has been cancelled successfully.'
        );

        router.replace(
          '/dashboard'
        );

        return;
      }

      Alert.alert(
        'Blood Request Cancelled',
        'Your blood request has been cancelled successfully.',
        [
          {
            text: 'Back to Dashboard',

            onPress: () => {
              router.replace(
                '/dashboard'
              );
            },
          },
        ],
        {
          cancelable: false,
        }
      );
    } catch (error) {
      console.log(
        'CANCEL BLOOD REQUEST ERROR:',
        error
      );

      Alert.alert(
        'Unable to Cancel Request',
        error instanceof Error
          ? error.message
          : 'Unable to cancel your blood request.'
      );
    } finally {
      setCancelling(false);
    }
  }

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
              '#D3191E',
              COLORS.redDark,
            ]}
            style={
              styles.header
            }
          >
            <View
              style={
                styles.headerCircleOne
              }
            />

            <View
              style={
                styles.headerCircleTwo
              }
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
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  router.back()
                }
              >
                <MaterialIcons
                  name="arrow-back"
                  size={24}
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
                  Request Details
                </Text>

                {request ? (
                  <Text
                    style={
                      styles.headerSubtitle
                    }
                  >
                    Request #
                    {getRequestNumber(
                      request.id
                    )}
                  </Text>
                ) : (
                  <Text
                    style={
                      styles.headerSubtitle
                    }
                  >
                    Blood Request
                  </Text>
                )}
              </View>
            </View>
          </LinearGradient>

          {/* ==================================================
              BODY
          ================================================== */}

          <LinearGradient
            colors={[
              COLORS.pageTop,
              COLORS.pageBottom,
            ]}
            style={
              styles.body
            }
          >
            <View
              style={
                styles.mainCard
              }
            >
              <ScrollView
                style={
                  styles.scroll
                }
                contentContainerStyle={
                  styles.scrollContent
                }
                showsVerticalScrollIndicator={
                  false
                }
                bounces={false}
              >
                {loading ? (
                  /* ==================================================
                      LOADING
                  ================================================== */

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
                        name="bloodtype"
                        size={34}
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
                      Loading Request
                    </Text>

                    <Text
                      style={
                        styles.centerDescription
                      }
                    >
                      Retrieving your blood request details.
                    </Text>
                  </View>
                ) : errorMessage ? (
                  /* ==================================================
                      ERROR
                  ================================================== */

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
                        name="error-outline"
                        size={34}
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
                      Unable to Load Request
                    </Text>

                    <Text
                      style={
                        styles.centerDescription
                      }
                    >
                      {errorMessage}
                    </Text>

                    <TouchableOpacity
                      style={
                        styles.retryButton
                      }
                      onPress={
                        loadRequest
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
                          styles.retryText
                        }
                      >
                        Try Again
                      </Text>
                    </TouchableOpacity>
                  </View>
                ) : request ? (
                  <>
                    {/* ==================================================
                        POSTED DATE
                    ================================================== */}

                    <Text
                      style={
                        styles.postedText
                      }
                    >
                      Posted{' '}
                      {formatCreatedAt(
                        request.created_at
                      )}
                    </Text>

                    {/* ==================================================
                        NEW CLEAN SUMMARY BOX
                    ================================================== */}

                    <View
                      style={
                        styles.summaryCard
                      }
                    >
                      {/* TOP */}

                      <View
                        style={
                          styles.summaryTop
                        }
                      >
                        {/* BLOOD TYPE */}

                        <View
                          style={
                            styles.bloodSection
                          }
                        >
                          <View
                            style={
                              styles.bloodCircle
                            }
                          >
                            <Text
                              style={
                                styles.bloodType
                              }
                            >
                              {
                                request.blood_type
                              }
                            </Text>
                          </View>

                          <Text
                            style={
                              styles.bloodLabel
                            }
                          >
                            Blood Type
                          </Text>
                        </View>

                        {/* TITLE */}

                        <View
                          style={
                            styles.summaryTitleArea
                          }
                        >
                          <Text
                            style={
                              styles.summaryTitle
                            }
                          >
                            Blood Request
                          </Text>

                          <Text
                            style={
                              styles.summarySubtitle
                            }
                          >
                            Emergency donor request
                          </Text>
                        </View>

                        {/* STATUS */}

                        <View
                          style={[
                            styles.statusPill,

                            {
                              backgroundColor:
                                getStatusColor(),
                            },
                          ]}
                        >
                          <View
                            style={
                              styles.statusDot
                            }
                          />

                          <Text
                            style={
                              styles.statusText
                            }
                          >
                            {getStatusLabel()}
                          </Text>
                        </View>
                      </View>

                      {/* DIVIDER */}

                      <View
                        style={
                          styles.summaryDivider
                        }
                      />

                      {/* BOTTOM STATS */}

                      <View
                        style={
                          styles.summaryStats
                        }
                      >
                        {/* UNITS */}

                        <View
                          style={
                            styles.statItem
                          }
                        >
                          <Text
                            style={
                              styles.statValue
                            }
                          >
                            {
                              request.units_needed
                            }
                          </Text>

                          <Text
                            style={
                              styles.statLabel
                            }
                          >
                            {request.units_needed ===
                            1
                              ? 'Unit / Bag'
                              : 'Units / Bags'}
                          </Text>
                        </View>

                        <View
                          style={
                            styles.statDivider
                          }
                        />

                        {/* URGENCY */}

                        <View
                          style={
                            styles.statItem
                          }
                        >
                          <MaterialIcons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'schedule'
                            }
                            size={24}
                            color={
                              request.urgency ===
                              'urgent'
                                ? COLORS.redButton
                                : COLORS.black
                            }
                          />

                          <Text
                            style={[
                              styles.statLabel,

                              request.urgency ===
                                'urgent' &&
                                styles.urgentStatLabel,
                            ]}
                          >
                            {request.urgency ===
                            'urgent'
                              ? 'Urgent'
                              : 'Scheduled'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* ==================================================
                        REQUEST INFORMATION
                    ================================================== */}

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Request Information
                    </Text>

                    <View
                      style={
                        styles.infoGroup
                      }
                    >
                      {/* LOCATION */}

                      <View
                        style={
                          styles.informationRow
                        }
                      >
                        <View
                          style={
                            styles.rowIcon
                          }
                        >
                          <MaterialIcons
                            name="local-hospital"
                            size={22}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.rowContent
                          }
                        >
                          <Text
                            style={
                              styles.rowLabel
                            }
                          >
                            Donation Location
                          </Text>

                          <Text
                            style={
                              styles.rowTitle
                            }
                          >
                            {
                              request.facility_name
                            }
                          </Text>

                          {request.facility_address ? (
                            <Text
                              style={
                                styles.rowSubtitle
                              }
                            >
                              {
                                request.facility_address
                              }
                            </Text>
                          ) : null}
                        </View>
                      </View>

                      <View
                        style={
                          styles.groupDivider
                        }
                      />

                      {/* WHEN NEEDED */}

                      <View
                        style={
                          styles.informationRow
                        }
                      >
                        <View
                          style={
                            styles.rowIcon
                          }
                        >
                          <MaterialIcons
                            name={
                              request.urgency ===
                              'urgent'
                                ? 'bolt'
                                : 'event'
                            }
                            size={22}
                            color={
                              COLORS.redButton
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.rowContent
                          }
                        >
                          <Text
                            style={
                              styles.rowLabel
                            }
                          >
                            When Needed
                          </Text>

                          <Text
                            style={[
                              styles.rowTitle,

                              request.urgency ===
                                'urgent' &&
                                styles.urgentText,
                            ]}
                          >
                            {formatNeededBy(
                              request
                            )}
                          </Text>

                          <Text
                            style={
                              styles.rowSubtitle
                            }
                          >
                            {request.urgency ===
                            'urgent'
                              ? 'Emergency request'
                              : 'Scheduled request'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* ==================================================
                        MESSAGE
                    ================================================== */}

                    {request.message?.trim() ? (
                      <>
                        <Text
                          style={
                            styles.sectionTitle
                          }
                        >
                          Message to Donors
                        </Text>

                        <View
                          style={
                            styles.messageCard
                          }
                        >
                          <View
                            style={
                              styles.messageIcon
                            }
                          >
                            <MaterialIcons
                              name="chat-bubble-outline"
                              size={19}
                              color={
                                COLORS.redButton
                              }
                            />
                          </View>

                          <Text
                            style={
                              styles.messageText
                            }
                          >
                            {
                              request.message
                            }
                          </Text>
                        </View>
                      </>
                    ) : null}

                    {/* ==================================================
                        PROGRESS
                    ================================================== */}

                    <Text
                      style={
                        styles.sectionTitle
                      }
                    >
                      Request Progress
                    </Text>

                    <View
                      style={
                        styles.progressCard
                      }
                    >
                      {/* STEP 1 */}

                      <View
                        style={
                          styles.progressStep
                        }
                      >
                        <View
                          style={
                            styles.timeline
                          }
                        >
                          <View
                            style={
                              styles.completedCircle
                            }
                          >
                            <MaterialIcons
                              name="check"
                              size={16}
                              color={
                                COLORS.white
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.timelineLine
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.progressTextArea
                          }
                        >
                          <Text
                            style={
                              styles.progressTitle
                            }
                          >
                            Request Posted
                          </Text>

                          <Text
                            style={
                              styles.progressDescription
                            }
                          >
                            Your blood request is live.
                          </Text>
                        </View>
                      </View>

                      {/* STEP 2 */}

                      <View
                        style={
                          styles.progressStep
                        }
                      >
                        <View
                          style={
                            styles.timeline
                          }
                        >
                          <View
                            style={
                              request.status ===
                              'active'
                                ? styles.currentCircle
                                : request.status ===
                                    'fulfilled'
                                  ? styles.completedCircle
                                  : styles.inactiveCircle
                            }
                          >
                            <MaterialIcons
                              name={
                                request.status ===
                                'fulfilled'
                                  ? 'check'
                                  : 'person-search'
                              }
                              size={15}
                              color={
                                request.status ===
                                  'active' ||
                                request.status ===
                                  'fulfilled'
                                  ? COLORS.white
                                  : COLORS.lightMuted
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.timelineLine
                            }
                          />
                        </View>

                        <View
                          style={
                            styles.progressTextArea
                          }
                        >
                          <Text
                            style={
                              styles.progressTitle
                            }
                          >
                            Waiting for Donor
                          </Text>

                          <Text
                            style={
                              styles.progressDescription
                            }
                          >
                            {request.status ===
                            'active'
                              ? 'Searching for compatible donors nearby.'
                              : request.status ===
                                  'fulfilled'
                                ? 'A donor response has been received.'
                                : 'This request is no longer active.'}
                          </Text>
                        </View>
                      </View>

                      {/* STEP 3 */}

                      <View
                        style={
                          styles.progressStepLast
                        }
                      >
                        <View
                          style={
                            styles.timeline
                          }
                        >
                          <View
                            style={
                              request.status ===
                              'fulfilled'
                                ? styles.completedCircle
                                : styles.inactiveCircle
                            }
                          >
                            <MaterialIcons
                              name={
                                request.status ===
                                'fulfilled'
                                  ? 'check'
                                  : 'favorite-border'
                              }
                              size={15}
                              color={
                                request.status ===
                                'fulfilled'
                                  ? COLORS.white
                                  : COLORS.lightMuted
                              }
                            />
                          </View>
                        </View>

                        <View
                          style={
                            styles.progressTextArea
                          }
                        >
                          <Text
                            style={
                              styles.progressTitle
                            }
                          >
                            Fulfilled
                          </Text>

                          <Text
                            style={
                              styles.progressDescription
                            }
                          >
                            {request.status ===
                            'fulfilled'
                              ? 'The request has been completed.'
                              : 'Waiting for the request to be completed.'}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* ==================================================
                        CANCEL
                    ================================================== */}

                    {request.status ===
                    'active' ? (
                      <>
                        <TouchableOpacity
                          style={[
                            styles.cancelButton,

                            cancelling &&
                              styles.cancelButtonDisabled,
                          ]}
                          disabled={
                            cancelling
                          }
                          activeOpacity={
                            0.8
                          }
                          onPress={
                            handleCancelPress
                          }
                        >
                          <MaterialIcons
                            name="close"
                            size={19}
                            color={
                              COLORS.redButton
                            }
                          />

                          <Text
                            style={
                              styles.cancelButtonText
                            }
                          >
                            {cancelling
                              ? 'Cancelling...'
                              : 'Cancel Blood Request'}
                          </Text>
                        </TouchableOpacity>

                        <Text
                          style={
                            styles.cancelHint
                          }
                        >
                          Only cancel this request if blood is no longer needed.
                        </Text>
                      </>
                    ) : (
                      <TouchableOpacity
                        style={
                          styles.dashboardButton
                        }
                        activeOpacity={
                          0.8
                        }
                        onPress={() =>
                          router.replace(
                            '/dashboard'
                          )
                        }
                      >
                        <MaterialIcons
                          name="home"
                          size={19}
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={
                            styles.dashboardButtonText
                          }
                        >
                          Back to Dashboard
                        </Text>
                      </TouchableOpacity>
                    )}
                  </>
                ) : null}
              </ScrollView>
            </View>
          </LinearGradient>
        </SafeAreaView>
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
          : COLORS.pageBottom,
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
        COLORS.pageBottom,
    },

    safeArea: {
      flex: 1,

      backgroundColor:
        COLORS.red,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height: 112,

      paddingHorizontal: 22,

      paddingTop:
        Platform.OS === 'web'
          ? 18
          : 8,

      overflow: 'hidden',
    },

    headerCircleOne: {
      position: 'absolute',

      width: 165,
      height: 165,

      borderRadius: 83,

      left: -100,
      top: -80,

      backgroundColor:
        'rgba(255,255,255,0.06)',
    },

    headerCircleTwo: {
      position: 'absolute',

      width: 180,
      height: 180,

      borderRadius: 90,

      right: -90,
      top: -95,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerRow: {
      flexDirection: 'row',

      alignItems: 'center',
    },

    backButton: {
      width: 42,
      height: 42,

      borderRadius: 21,

      alignItems: 'center',

      justifyContent: 'center',

      marginRight: 13,

      backgroundColor:
        'rgba(255,255,255,0.16)',
    },

    headerText: {
      flex: 1,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,

      lineHeight: 25,
    },

    headerSubtitle: {
      marginTop: 2,

      color:
        'rgba(255,255,255,0.78)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,
    },

    // ========================================================
    // BODY
    // ========================================================

    body: {
      flex: 1,

      paddingHorizontal: 16,

      paddingBottom: 14,
    },

    mainCard: {
      flex: 1,

      marginTop: -10,

      overflow: 'hidden',

      borderRadius: 28,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 4,
      },

      shadowOpacity: 0.15,

      shadowRadius: 8,

      elevation: 7,
    },

    scroll: {
      flex: 1,
    },

    scrollContent: {
      paddingHorizontal: 18,

      paddingTop: 20,

      paddingBottom: 30,
    },

    // ========================================================
    // LOADING
    // ========================================================

    centerState: {
      minHeight: 520,

      paddingHorizontal: 28,

      alignItems: 'center',

      justifyContent: 'center',
    },

    centerIcon: {
      width: 70,
      height: 70,

      borderRadius: 35,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    centerTitle: {
      marginTop: 14,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 16,

      textAlign: 'center',
    },

    centerDescription: {
      marginTop: 5,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      lineHeight: 16,

      textAlign: 'center',
    },

    retryButton: {
      minWidth: 135,

      height: 44,

      marginTop: 18,

      borderRadius: 10,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 6,

      backgroundColor:
        COLORS.redButton,
    },

    retryText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11,
    },

    // ========================================================
    // POSTED
    // ========================================================

    postedText: {
      marginBottom: 10,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      textAlign: 'right',
    },

    // ========================================================
    // NEW SUMMARY
    // ========================================================

    summaryCard: {
      marginBottom: 24,

      overflow: 'hidden',

      borderWidth: 1,

      borderColor:
        '#E8D5D5',

      borderRadius: 18,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,
        height: 2,
      },

      shadowOpacity: 0.05,

      shadowRadius: 5,

      elevation: 2,
    },

    summaryTop: {
      minHeight: 98,

      paddingHorizontal: 15,

      flexDirection: 'row',

      alignItems: 'center',
    },

    bloodSection: {
      width: 70,

      alignItems: 'center',

      marginRight: 11,
    },

    bloodCircle: {
      width: 58,
      height: 58,

      borderRadius: 29,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,
    },

    bloodType: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,

      lineHeight: 25,
    },

    bloodLabel: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 8.5,
    },

    summaryTitleArea: {
      flex: 1,

      paddingRight: 7,
    },

    summaryTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 15,

      lineHeight: 20,
    },

    summarySubtitle: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      lineHeight: 13,
    },

    statusPill: {
      minHeight: 26,

      paddingHorizontal: 9,

      flexDirection: 'row',

      alignItems: 'center',

      gap: 5,

      borderRadius: 13,
    },

    statusDot: {
      width: 5,
      height: 5,

      borderRadius: 3,

      backgroundColor:
        COLORS.white,
    },

    statusText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 8.5,
    },

    summaryDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginHorizontal: 15,

      backgroundColor:
        COLORS.border,
    },

    summaryStats: {
      minHeight: 73,

      flexDirection: 'row',

      alignItems: 'center',
    },

    statItem: {
      flex: 1,

      alignItems: 'center',

      justifyContent: 'center',
    },

    statDivider: {
      width: 1,

      height: 37,

      backgroundColor:
        COLORS.border,
    },

    statValue: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,

      lineHeight: 24,
    },

    statLabel: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9,

      textAlign: 'center',
    },

    urgentStatLabel: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // SECTION
    // ========================================================

    sectionTitle: {
      marginBottom: 9,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14,
    },

    // ========================================================
    // REQUEST INFORMATION
    // ========================================================

    infoGroup: {
      marginBottom: 23,

      paddingHorizontal: 14,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        COLORS.card,
    },

    informationRow: {
      minHeight: 88,

      paddingVertical: 14,

      flexDirection: 'row',

      alignItems: 'center',
    },

    rowIcon: {
      width: 44,
      height: 44,

      marginRight: 12,

      borderRadius: 14,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    rowContent: {
      flex: 1,
    },

    rowLabel: {
      marginBottom: 3,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 9.5,
    },

    rowTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12.5,

      lineHeight: 17,
    },

    rowSubtitle: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 10,

      lineHeight: 14,
    },

    urgentText: {
      color:
        COLORS.redButton,
    },

    groupDivider: {
      height:
        StyleSheet.hairlineWidth,

      marginLeft: 56,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // MESSAGE
    // ========================================================

    messageCard: {
      minHeight: 76,

      marginBottom: 23,

      padding: 14,

      flexDirection: 'row',

      alignItems: 'flex-start',

      borderRadius: 15,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.softCard,
    },

    messageIcon: {
      width: 36,
      height: 36,

      marginRight: 10,

      borderRadius: 11,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.white,
    },

    messageText: {
      flex: 1,

      paddingTop: 2,

      color:
        COLORS.black,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11,

      lineHeight: 17,
    },

    // ========================================================
    // PROGRESS
    // ========================================================

    progressCard: {
      padding: 16,

      marginBottom: 24,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        COLORS.card,
    },

    progressStep: {
      minHeight: 67,

      flexDirection: 'row',
    },

    progressStepLast: {
      minHeight: 46,

      flexDirection: 'row',
    },

    timeline: {
      width: 32,

      alignItems: 'center',
    },

    completedCircle: {
      width: 29,
      height: 29,

      borderRadius: 15,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.green,
    },

    currentCircle: {
      width: 29,
      height: 29,

      borderRadius: 15,

      alignItems: 'center',

      justifyContent: 'center',

      backgroundColor:
        COLORS.redButton,
    },

    inactiveCircle: {
      width: 29,
      height: 29,

      borderRadius: 15,

      alignItems: 'center',

      justifyContent: 'center',

      borderWidth: 1,

      borderColor:
        '#D5D5D5',

      backgroundColor:
        COLORS.white,
    },

    timelineLine: {
      width: 2,

      flex: 1,

      marginVertical: 3,

      borderRadius: 2,

      backgroundColor:
        '#E3E3E3',
    },

    progressTextArea: {
      flex: 1,

      paddingLeft: 10,

      paddingTop: 2,
    },

    progressTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    progressDescription: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9.5,

      lineHeight: 14,
    },

    // ========================================================
    // CANCEL
    // ========================================================

    cancelButton: {
      height: 49,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 7,

      borderWidth: 1.5,

      borderColor:
        COLORS.redButton,

      borderRadius: 12,

      backgroundColor:
        COLORS.white,
    },

    cancelButtonDisabled: {
      opacity: 0.5,
    },

    cancelButtonText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11.5,
    },

    cancelHint: {
      marginTop: 8,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 9,

      lineHeight: 13,

      textAlign: 'center',
    },

    dashboardButton: {
      height: 49,

      flexDirection: 'row',

      alignItems: 'center',

      justifyContent: 'center',

      gap: 7,

      borderRadius: 12,

      backgroundColor:
        COLORS.redButton,
    },

    dashboardButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 11.5,
    },
  });