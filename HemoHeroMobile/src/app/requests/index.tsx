import {
  useCallback,
  useMemo,
  useRef,
  useState,
} from 'react';

import {
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

import MainBottomNav from '../../components/MainBottomNav';

import {
  FadeInView,
  PulseRing,
} from '../../components/Motion';

import {
  getMyBloodRequests,
} from '../../lib/api';

import type {
  BloodRequest,
} from '../../lib/api';

import {
  CoordinationInboxError,
  getCoordinationInbox,
} from '../../lib/coordination';

import type {
  CoordinationInboxItem,
} from '../../lib/coordination';

import {
  getMyDonorInvitations,
} from '../../lib/donorInvitations';

import type {
  DonorInvitation,
} from '../../lib/donorInvitations';

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
  black: '#171717',

  page: '#FFF8F8',
  card: '#FFFFFF',

  muted: '#666666',
  lightMuted: '#969696',

  border: '#E4D7D7',

  green: '#159447',
  orange: '#DF721D',
  blue: '#3478F6',

  pinkLight: '#FFF0F0',
  greenLight: '#EAF7EF',
  orangeLight: '#FFF5E8',
  blueLight: '#EEF4FF',
  grayLight: '#F4F4F5',
};

// ============================================================
// TYPES
// ============================================================

type TabType =
  | 'requests'
  | 'invitations'
  | 'donations';

// ============================================================
// FORMAT DATE
// ============================================================

function formatDate(
  value?:
    | string
    | null
) {
  if (!value) {
    return 'Date unavailable';
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
    return 'Date unavailable';
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

// ============================================================
// NEEDED BY
// ============================================================

function formatNeededBy(
  request: BloodRequest
) {
  if (
    request.urgency === 'urgent'
  ) {
    return 'Needed as soon as possible';
  }

  if (!request.needed_date) {
    return 'Scheduled request';
  }

  let text = `Needed ${formatDate(
    `${request.needed_date}T00:00:00`
  )}`;

  const timeMatch = String(
    request.needed_time || ''
  ).match(/^(\d{1,2}):(\d{2})/);

  if (timeMatch) {
    const hours =
      Number(timeMatch[1]);

    text += `, ${hours % 12 || 12}:${timeMatch[2]} ${
      hours >= 12 ? 'PM' : 'AM'
    }`;
  }

  return text;
}

// ============================================================
// REQUEST STATUS
// ============================================================

function getStatusAppearance(
  status: string
) {
  switch (status) {
    case 'active':
      return {
        label:
          'Active',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'fulfilled':
      return {
        label:
          'Fulfilled',

        color:
          COLORS.blue,

        background:
          COLORS.blueLight,
      };

    case 'cancelled':
      return {
        label:
          'Cancelled',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    case 'expired':
      return {
        label:
          'Expired',

        color:
          COLORS.lightMuted,

        background:
          COLORS.grayLight,
      };

    default:
      return {
        label:
          status ||
          'Unknown',

        color:
          COLORS.lightMuted,

        background:
          COLORS.grayLight,
      };
  }
}

// ============================================================
// INVITATION STATUS
// ============================================================

function getInvitationStatusAppearance(
  status: string
) {
  switch (status) {
    case 'pending':
      return {
        label:
          'Pending',

        color:
          COLORS.orange,

        background:
          COLORS.orangeLight,
      };

    case 'accepted':
      return {
        label:
          'Accepted',

        color:
          COLORS.green,

        background:
          COLORS.greenLight,
      };

    case 'declined':
      return {
        label:
          'Declined',

        color:
          COLORS.redButton,

        background:
          COLORS.pinkLight,
      };

    case 'cancelled':
      return {
        label:
          'Cancelled',

        color:
          COLORS.lightMuted,

        background:
          COLORS.grayLight,
      };

    default:
      return {
        label:
          status ||
          'Unknown',

        color:
          COLORS.lightMuted,

        background:
          COLORS.grayLight,
      };
  }
}

// ============================================================
// REQUESTS SCREEN
// ============================================================

export default function RequestsScreen() {
  const [
    tab,
    setTab,
  ] =
    useState<TabType>(
      'requests'
    );

  // ==========================================================
  // MY REQUESTS
  // ==========================================================

  const [
    requests,
    setRequests,
  ] =
    useState<
      BloodRequest[]
    >([]);

  // ==========================================================
  // INVITATIONS
  // ==========================================================

  const [
    invitations,
    setInvitations,
  ] =
    useState<
      DonorInvitation[]
    >([]);

  const [
    invitationErrorMessage,
    setInvitationErrorMessage,
  ] =
    useState('');

  // ==========================================================
  // COORDINATION
  // ==========================================================

  const [
    conversations,
    setConversations,
  ] =
    useState<
      CoordinationInboxItem[]
    >([]);

  // ==========================================================
  // UI STATE
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

  const hasLoadedOnce =
    useRef(false);

  // ==========================================================
  // LOAD DATA
  // ==========================================================

  const loadData =
    useCallback(
      async (
        silent = false
      ) => {
        try {
          if (
            !silent
          ) {
            setLoading(
              true
            );
          }

          setErrorMessage(
            ''
          );

          setInvitationErrorMessage(
            ''
          );

          const token =
            await getAccessToken();

          if (
            !token
          ) {
            router.replace(
              '/'
            );

            return;
          }

          // Load all three sections in parallel; one failing
          // section does not hide the others.
          const [
            requestResult,
            inboxResult,
            invitationResult,
          ] =
            await Promise.allSettled([
              getMyBloodRequests(
                token
              ),

              getCoordinationInbox(
                token
              ),

              getMyDonorInvitations(
                token
              ),
            ]);

          if (
            inboxResult.status ===
              'rejected' &&
            inboxResult.reason instanceof
              CoordinationInboxError &&
            inboxResult.reason.status ===
              401
          ) {
            router.replace(
              '/'
            );

            return;
          }

          const failedSections: string[] =
            [];

          // --------------------------------------------------
          // MY REQUESTS
          // --------------------------------------------------

          if (
            requestResult.status ===
            'fulfilled'
          ) {
            setRequests(
              Array.isArray(
                requestResult.value
                  ?.requests
              )
                ? requestResult.value
                    .requests
                : []
            );
          } else {
            console.log(
              'MY REQUESTS LOAD ERROR:',
              requestResult.reason
            );

            failedSections.push(
              'your requests'
            );
          }

          // --------------------------------------------------
          // COORDINATION
          // --------------------------------------------------

          if (
            inboxResult.status ===
            'fulfilled'
          ) {
            setConversations(
              Array.isArray(
                inboxResult.value
                  ?.conversations
              )
                ? inboxResult.value
                    .conversations
                : []
            );
          } else {
            console.log(
              'COORDINATION INBOX LOAD ERROR:',
              inboxResult.reason
            );

            failedSections.push(
              'your donations'
            );
          }

          if (
            failedSections.length > 0
          ) {
            setErrorMessage(
              `We couldn't load ${failedSections.join(
                ' and '
              )}. Check your connection and try again.`
            );
          }

          // --------------------------------------------------
          // INVITATIONS
          // --------------------------------------------------

          if (
            invitationResult.status ===
            'fulfilled'
          ) {
            setInvitations(
              Array.isArray(
                invitationResult.value
                  ?.invitations
              )
                ? invitationResult.value
                    .invitations
                : []
            );
          } else {
            console.log(
              'DONOR INVITATIONS LOAD ERROR:',
              invitationResult.reason
            );

            setInvitationErrorMessage(
              invitationResult.reason instanceof
                Error
                ? invitationResult.reason
                    .message
                : 'Unable to load donor invitations.'
            );
          }

          hasLoadedOnce.current =
            true;
        } catch (
          error
        ) {
          console.log(
            'REQUESTS SCREEN LOAD ERROR:',
            error
          );

          if (
            error instanceof
              CoordinationInboxError &&
            error.status ===
              401
          ) {
            router.replace(
              '/'
            );

            return;
          }

          setErrorMessage(
            error instanceof
              Error
              ? error.message
              : 'Unable to load request activity.'
          );
        } finally {
          if (
            !silent
          ) {
            setLoading(
              false
            );
          }
        }
      },
      []
    );

  // ==========================================================
  // LOAD ON FOCUS
  // ==========================================================

  // Only the first visit shows the loading card; later
  // visits refresh quietly so the list doesn't flash.
  useFocusEffect(
    useCallback(
      () => {
        loadData(
          hasLoadedOnce.current
        );
      },
      [
        loadData,
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

      await loadData(
        true
      );
    } finally {
      setRefreshing(
        false
      );
    }
  }

  // ==========================================================
  // DONATIONS
  // ==========================================================

  const myDonations =
    useMemo(
      () =>
        conversations.filter(
          item =>
            item.viewer_role ===
            'donor'
        ),
      [
        conversations,
      ]
    );

  // ==========================================================
  // SORT REQUESTS (active first, then newest)
  // ==========================================================

  const sortedRequests =
    useMemo(
      () =>
        [...requests].sort(
          (a, b) => {
            const aActive =
              a.status === 'active'
                ? 0
                : 1;

            const bActive =
              b.status === 'active'
                ? 0
                : 1;

            if (aActive !== bActive) {
              return aActive - bActive;
            }

            return (
              new Date(
                b.created_at
              ).getTime() -
              new Date(
                a.created_at
              ).getTime()
            );
          }
        ),
      [requests]
    );

  const hasActiveRequest =
    useMemo(
      () =>
        requests.some(
          request =>
            request.status ===
            'active'
        ),
      [requests]
    );

  // ==========================================================
  // PENDING INVITATIONS
  // ==========================================================

  const pendingInvitationCount =
    useMemo(
      () =>
        invitations.filter(
          invitation =>
            invitation.status ===
            'pending'
        ).length,
      [
        invitations,
      ]
    );

  // ==========================================================
  // SORT INVITATIONS
  // ==========================================================

  const sortedInvitations =
    useMemo(
      () =>
        [
          ...invitations,
        ].sort(
          (
            a,
            b
          ) => {
            if (
              a.status ===
                'pending' &&
              b.status !==
                'pending'
            ) {
              return -1;
            }

            if (
              b.status ===
                'pending' &&
              a.status !==
                'pending'
            ) {
              return 1;
            }

            const aTime =
              new Date(
                a.created_at
              ).getTime();

            const bTime =
              new Date(
                b.created_at
              ).getTime();

            return (
              bTime -
              aTime
            );
          }
        ),
      [
        invitations,
      ]
    );

  // ==========================================================
  // OPEN MY REQUEST
  // ==========================================================

  function openRequest(
    request:
      BloodRequest
  ) {
    router.push(
      `/blood-request/${request.id}` as any
    );
  }

  // ==========================================================
  // OPEN DONATION
  // ==========================================================

  function openDonation(
    item:
      CoordinationInboxItem
  ) {
    router.push(
      `/blood-request/${item.request_id}/coordination/${item.response_id}` as any
    );
  }

  // ==========================================================
  // OPEN INVITATION REQUEST
  // ==========================================================

  function openInvitationRequest(
    invitation:
      DonorInvitation
  ) {
    router.push(
      {
        pathname:
          `/blood-request/donor/${invitation.request_id}` as any,

        params: {
          invitationId:
            invitation.id,
        },
      } as any
    );
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
              '#CF1115',
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

            <View>
              <Text
                style={
                  styles.eyebrow
                }
              >
                ACTIVITY
              </Text>

              <Text
                style={
                  styles.headerTitle
                }
              >
                Requests
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Track requests, donor invitations, and accepted donations
              </Text>
            </View>
          </LinearGradient>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <View
            style={
              styles.content
            }
          >
            {/* ================================================
                TABS
            ================================================ */}

            <View
              style={
                styles.tabBar
              }
            >
              {/* REQUESTS */}

              <TouchableOpacity
                style={[
                  styles.tabButton,

                  tab ===
                    'requests' &&
                    styles.tabButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setTab(
                    'requests'
                  )
                }
              >
                <MaterialIcons
                  name="assignment"
                  size={16}
                  color={
                    tab ===
                    'requests'
                      ? COLORS.redButton
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.tabText,

                    tab ===
                      'requests' &&
                      styles.tabTextActive,
                  ]}
                >
                  Requests
                </Text>

                <View
                  style={
                    styles.tabCount
                  }
                >
                  <Text
                    style={
                      styles.tabCountText
                    }
                  >
                    {
                      requests.length
                    }
                  </Text>
                </View>
              </TouchableOpacity>

              {/* INVITES */}

              <TouchableOpacity
                style={[
                  styles.tabButton,

                  tab ===
                    'invitations' &&
                    styles.tabButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setTab(
                    'invitations'
                  )
                }
              >
                <MaterialIcons
                  name="mail-outline"
                  size={16}
                  color={
                    tab ===
                    'invitations'
                      ? COLORS.redButton
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.tabText,

                    tab ===
                      'invitations' &&
                      styles.tabTextActive,
                  ]}
                >
                  Invites
                </Text>

                <View
                  style={[
                    styles.tabCount,

                    pendingInvitationCount >
                      0 &&
                      styles.tabCountAttention,
                  ]}
                >
                  <Text
                    style={[
                      styles.tabCountText,

                      pendingInvitationCount >
                        0 &&
                        styles.tabCountTextAttention,
                    ]}
                  >
                    {
                      pendingInvitationCount
                    }
                  </Text>
                </View>
              </TouchableOpacity>

              {/* DONATIONS */}

              <TouchableOpacity
                style={[
                  styles.tabButton,

                  tab ===
                    'donations' &&
                    styles.tabButtonActive,
                ]}
                activeOpacity={
                  0.8
                }
                onPress={() =>
                  setTab(
                    'donations'
                  )
                }
              >
                <MaterialIcons
                  name="volunteer-activism"
                  size={16}
                  color={
                    tab ===
                    'donations'
                      ? COLORS.redButton
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.tabText,

                    tab ===
                      'donations' &&
                      styles.tabTextActive,
                  ]}
                >
                  Donations
                </Text>

                <View
                  style={
                    styles.tabCount
                  }
                >
                  <Text
                    style={
                      styles.tabCountText
                    }
                  >
                    {
                      myDonations.length
                    }
                  </Text>
                </View>
              </TouchableOpacity>
            </View>

            {/* ================================================
                SCROLL
            ================================================ */}

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
              {/* GENERAL ERROR */}

              {errorMessage ? (
                <TouchableOpacity
                  style={
                    styles.errorCard
                  }
                  activeOpacity={
                    0.8
                  }
                  onPress={() =>
                    loadData()
                  }
                >
                  <MaterialIcons
                    name="error-outline"
                    size={20}
                    color={
                      COLORS.redButton
                    }
                  />

                  <View
                    style={
                      styles.errorBody
                    }
                  >
                    <Text
                      style={
                        styles.errorTitle
                      }
                    >
                      Unable to load activity
                    </Text>

                    <Text
                      style={
                        styles.errorText
                      }
                    >
                      {
                        errorMessage
                      }
                    </Text>

                    <Text
                      style={
                        styles.retryText
                      }
                    >
                      Tap to try again
                    </Text>
                  </View>
                </TouchableOpacity>
              ) : null}

              {/* LOADING */}

              {loading ? (
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
                      name="hourglass-empty"
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
                    Loading Activity
                  </Text>

                  <Text
                    style={
                      styles.stateDescription
                    }
                  >
                    Checking your latest requests, invitations, and donations...
                  </Text>
                </View>
              ) : tab ===
                  'requests' ? (
                // =============================================
                // REQUESTS TAB
                // =============================================

                requests.length >
                0 ? (
                  <>
                    {!hasActiveRequest ? (
                      <FadeInView>
                        <TouchableOpacity
                          style={
                            styles.createCard
                          }
                          activeOpacity={
                            0.85
                          }
                          onPress={() =>
                            router.push(
                              '/blood-request/create' as any
                            )
                          }
                        >
                          <View
                            style={
                              styles.createIcon
                            }
                          >
                            <PulseRing
                              size={42}
                            />

                            <MaterialIcons
                              name="add"
                              size={26}
                              color={
                                COLORS.white
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.createBody
                            }
                          >
                            <Text
                              style={
                                styles.createTitle
                              }
                            >
                              Create Blood Request
                            </Text>

                            <Text
                              style={
                                styles.createText
                              }
                            >
                              Need blood? Reach compatible donors nearby.
                            </Text>
                          </View>

                          <MaterialIcons
                            name="arrow-forward"
                            size={20}
                            color={
                              COLORS.white
                            }
                          />
                        </TouchableOpacity>
                      </FadeInView>
                    ) : null}

                    <Text
                      style={
                        styles.sectionLabel
                      }
                    >
                      Your Blood Requests
                    </Text>

                    {sortedRequests.map(
                      (request, index) => (
                        <FadeInView
                          key={
                            request.id
                          }
                          delay={Math.min(
                            index * 40,
                            200
                          )}
                        >
                          <RequestCard
                            request={
                              request
                            }
                            onPress={() =>
                              openRequest(
                                request
                              )
                            }
                          />
                        </FadeInView>
                      )
                    )}
                  </>
                ) : (
                  <EmptyState
                    icon="bloodtype"
                    title="No Blood Requests Yet"
                    description="Requests you create will appear here so you can track their status."
                    buttonText="Create Blood Request"
                    onPress={() =>
                      router.push(
                        '/blood-request/create' as any
                      )
                    }
                  />
                )
              ) : tab ===
                  'invitations' ? (
                // =============================================
                // INVITATIONS TAB
                // =============================================

                <>
                  {invitationErrorMessage ? (
                    <TouchableOpacity
                      style={
                        styles.errorCard
                      }
                      activeOpacity={
                        0.8
                      }
                      onPress={() =>
                        loadData()
                      }
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={20}
                        color={
                          COLORS.redButton
                        }
                      />

                      <View
                        style={
                          styles.errorBody
                        }
                      >
                        <Text
                          style={
                            styles.errorTitle
                          }
                        >
                          Unable to load invitations
                        </Text>

                        <Text
                          style={
                            styles.errorText
                          }
                        >
                          {
                            invitationErrorMessage
                          }
                        </Text>

                        <Text
                          style={
                            styles.retryText
                          }
                        >
                          Tap to try again
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ) : sortedInvitations
                      .length >
                    0 ? (
                    <>
                      {pendingInvitationCount >
                      0 ? (
                        <View
                          style={
                            styles.invitationInfo
                          }
                        >
                          <View
                            style={
                              styles.invitationInfoIcon
                            }
                          >
                            <MaterialIcons
                              name="volunteer-activism"
                              size={18}
                              color={
                                COLORS.redButton
                              }
                            />
                          </View>

                          <View
                            style={
                              styles.invitationInfoBody
                            }
                          >
                            <Text
                              style={
                                styles.invitationInfoTitle
                              }
                            >
                              Someone Needs Your Help
                            </Text>

                            <Text
                              style={
                                styles.invitationInfoText
                              }
                            >
                              Review the request details before deciding whether you can help.
                            </Text>
                          </View>
                        </View>
                      ) : null}

                      <Text
                        style={
                          styles.sectionLabel
                        }
                      >
                        Donor Invitations
                      </Text>

                      {sortedInvitations.map(
                        (invitation, index) => (
                          <FadeInView
                            key={
                              invitation.id
                            }
                            delay={Math.min(
                              index * 40,
                              200
                            )}
                          >
                            <InvitationCard
                              invitation={
                                invitation
                              }
                              onViewRequest={() =>
                                openInvitationRequest(
                                  invitation
                                )
                              }
                            />
                          </FadeInView>
                        )
                      )}
                    </>
                  ) : (
                    <EmptyState
                      icon="mail-outline"
                      title="No Donor Invitations"
                      description="When someone directly asks you to help with a blood request, the invitation will appear here."
                      buttonText="Back to Home"
                      onPress={() =>
                        router.replace(
                          '/dashboard' as any
                        )
                      }
                    />
                  )}
                </>
              ) : myDonations
                  .length >
                0 ? (
                // =============================================
                // DONATIONS TAB
                // =============================================

                <>
                  <View
                    style={
                      styles.donationInfo
                    }
                  >
                    <MaterialIcons
                      name="info-outline"
                      size={18}
                      color={
                        COLORS.blue
                      }
                    />

                    <Text
                      style={
                        styles.donationInfoText
                      }
                    >
                      Accepted donations appear here once coordination has started.
                    </Text>
                  </View>

                  <Text
                    style={
                      styles.sectionLabel
                    }
                  >
                    Accepted Donations
                  </Text>

                  {myDonations.map(
                    (item, index) => (
                      <FadeInView
                        key={
                          item.response_id
                        }
                        delay={Math.min(
                          index * 40,
                          200
                        )}
                      >
                        <DonationCard
                          item={
                            item
                          }
                          onPress={() =>
                            openDonation(
                              item
                            )
                          }
                        />
                      </FadeInView>
                    )
                  )}
                </>
              ) : (
                <EmptyState
                  icon="volunteer-activism"
                  title="No Accepted Donations Yet"
                  description="Accepted donor offers and accepted invitations will appear here with their coordination details."
                  buttonText="Back to Home"
                  onPress={() =>
                    router.replace(
                      '/dashboard' as any
                    )
                  }
                />
              )}

              <View
                style={
                  styles.bottomSpacing
                }
              />
            </ScrollView>
          </View>

          {/* ==================================================
              BOTTOM NAVIGATION
          ================================================== */}

          <MainBottomNav
            activeTab="requests"
          />
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// REQUEST CARD
// ============================================================

function RequestCard({
  request,
  onPress,
}: {
  request:
    BloodRequest;

  onPress:
    () => void;
}) {
  const status =
    getStatusAppearance(
      request.status
    );

  return (
    <TouchableOpacity
      style={
        styles.card
      }
      activeOpacity={
        0.85
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.bloodBadge
          }
        >
          <MaterialIcons
            name="bloodtype"
            size={18}
            color={
              COLORS.white
            }
          />

          <Text
            style={
              styles.bloodText
            }
          >
            {
              request.blood_type
            }
          </Text>
        </View>

        <View
          style={
            styles.cardMain
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={
              styles.facilityName
            }
          >
            {
              request.facility_name
            }
          </Text>

          <Text
            style={
              styles.metaText
            }
          >
            {
              request.units_needed
            }{' '}
            {request.units_needed ===
            1
              ? 'unit'
              : 'units'}{' '}
            •{' '}
            {request.urgency ===
            'urgent'
              ? 'Urgent'
              : 'Scheduled'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,

            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  status.color,
              },
            ]}
          >
            {
              status.label
            }
          </Text>
        </View>
      </View>

      <View
        style={
          styles.detailBox
        }
      >
        <View
          style={
            styles.detailList
          }
        >
          {request.status ===
          'active' ? (
            <View
              style={
                styles.detailListItem
              }
            >
              <MaterialIcons
                name={
                  request.urgency ===
                  'urgent'
                    ? 'priority-high'
                    : 'schedule'
                }
                size={16}
                color={
                  request.urgency ===
                  'urgent'
                    ? COLORS.redButton
                    : COLORS.orange
                }
              />

              <Text
                numberOfLines={1}
                style={
                  styles.detailText
                }
              >
                {formatNeededBy(
                  request
                )}
              </Text>
            </View>
          ) : null}

          {request.facility_address ? (
            <View
              style={
                styles.detailListItem
              }
            >
              <MaterialIcons
                name="place"
                size={16}
                color={
                  COLORS.redButton
                }
              />

              <Text
                numberOfLines={1}
                style={
                  styles.detailText
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
              styles.detailListItem
            }
          >
            <MaterialIcons
              name={
                request.status ===
                'fulfilled'
                  ? 'task-alt'
                  : request.status ===
                      'cancelled'
                    ? 'cancel'
                    : 'event'
              }
              size={16}
              color={
                COLORS.redButton
              }
            />

            <Text
              numberOfLines={1}
              style={
                styles.detailText
              }
            >
              {request.status ===
                'fulfilled' &&
              request.fulfilled_at
                ? `Fulfilled ${formatDate(
                    request.fulfilled_at
                  )}`
                : request.status ===
                      'cancelled' &&
                    request.cancelled_at
                  ? `Cancelled ${formatDate(
                      request.cancelled_at
                    )}`
                  : `Created ${formatDate(
                      request.created_at
                    )}`}
            </Text>
          </View>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={21}
          color={
            COLORS.redButton
          }
        />
      </View>

      {request.status ===
      'active' ? (
        <Text
          style={
            styles.activeHint
          }
        >
          Tap to view donor offers and manage this request
        </Text>
      ) : null}
    </TouchableOpacity>
  );
}

// ============================================================
// INVITATION CARD
// ============================================================

function InvitationCard({
  invitation,
  onViewRequest,
}: {
  invitation:
    DonorInvitation;

  onViewRequest:
    () => void;
}) {
  const request =
    invitation.request;

  const requester =
    invitation.requester;

  const status =
    getInvitationStatusAppearance(
      invitation.status
    );

  const requestIsActive =
    !request?.status ||
    request.status ===
      'active';

  return (
    <View
      style={[
        styles.card,
        styles.invitationCard,

        invitation.status !==
          'pending' &&
          styles.invitationCardHistory,
      ]}
    >
      {/* ======================================================
          TOP
      ====================================================== */}

      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.invitationBloodBadge
          }
        >
          <MaterialIcons
            name="bloodtype"
            size={17}
            color={
              COLORS.redButton
            }
          />

          <Text
            style={
              styles.invitationBloodText
            }
          >
            {
              request?.blood_type ||
              '?'
            }
          </Text>
        </View>

        <View
          style={
            styles.cardMain
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={
              styles.facilityName
            }
          >
            {
              request?.facility_name ||
              'Blood Request'
            }
          </Text>

          <Text
            style={
              styles.metaText
            }
          >
            {request?.units_needed ||
              0}{' '}
            {request?.units_needed ===
            1
              ? 'unit'
              : 'units'}{' '}
            •{' '}
            {request?.urgency ===
            'urgent'
              ? 'Urgent'
              : 'Scheduled'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,

            {
              backgroundColor:
                status.background,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  status.color,
              },
            ]}
          >
            {
              status.label
            }
          </Text>
        </View>
      </View>

      {/* ======================================================
          REQUESTER
      ====================================================== */}

      <View
        style={
          styles.invitationRequester
        }
      >
        <View
          style={
            styles.requesterIcon
          }
        >
          <MaterialIcons
            name="person-outline"
            size={16}
            color={
              COLORS.redButton
            }
          />
        </View>

        <View
          style={
            styles.requesterBody
          }
        >
          <Text
            style={
              styles.requesterLabel
            }
          >
            Requested by
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={
              styles.requesterName
            }
          >
            {
              requester?.full_name ||
              'Hemo-Hero User'
            }
          </Text>
        </View>

        <Text
          style={
            styles.invitationDate
          }
        >
          {
            formatDate(
              invitation.created_at
            )
          }
        </Text>
      </View>

      {/* ======================================================
          OPTIONAL MESSAGE
      ====================================================== */}

      {invitation.message ? (
        <View
          style={
            styles.invitationMessage
          }
        >
          <MaterialIcons
            name="chat-bubble-outline"
            size={14}
            color={
              COLORS.muted
            }
          />

          <Text
            style={
              styles.invitationMessageText
            }
          >
            {
              invitation.message
            }
          </Text>
        </View>
      ) : null}

      {/* ======================================================
          REQUEST CLOSED
      ====================================================== */}

      {!requestIsActive ? (
        <View
          style={
            styles.requestClosedNotice
          }
        >
          <MaterialIcons
            name="info-outline"
            size={14}
            color={
              COLORS.lightMuted
            }
          />

          <Text
            style={
              styles.requestClosedText
            }
          >
            This blood request is no longer active.
          </Text>
        </View>
      ) : null}

      {/* ======================================================
          VIEW REQUEST
      ====================================================== */}

      <TouchableOpacity
        style={[
          styles.viewRequestButton,

          invitation.status ===
            'pending' &&
            requestIsActive &&
            styles.respondButton,
        ]}
        activeOpacity={
          0.8
        }
        onPress={
          onViewRequest
        }
      >
        <View
          style={
            styles.viewRequestLeft
          }
        >
          <View
            style={
              styles.viewRequestIcon
            }
          >
            <MaterialIcons
              name="visibility"
              size={15}
              color={
                COLORS.redButton
              }
            />
          </View>

          <Text
            style={[
              styles.viewRequestText,

              invitation.status ===
                'pending' &&
                requestIsActive &&
                styles.respondButtonText,
            ]}
          >
            {invitation.status ===
              'pending' &&
            requestIsActive
              ? 'Review & Respond'
              : 'View Request'}
          </Text>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={20}
          color={
            invitation.status ===
              'pending' &&
            requestIsActive
              ? COLORS.white
              : COLORS.redButton
          }
        />
      </TouchableOpacity>
    </View>
  );
}

// ============================================================
// DONATION CARD
// ============================================================

function DonationCard({
  item,
  onPress,
}: {
  item:
    CoordinationInboxItem;

  onPress:
    () => void;
}) {
  const closed =
    item.request_status !==
    'active';

  return (
    <TouchableOpacity
      style={[
        styles.card,

        closed &&
          styles.cardClosed,
      ]}
      activeOpacity={
        0.85
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          styles.cardTop
        }
      >
        <View
          style={
            styles.bloodBadge
          }
        >
          <MaterialIcons
            name="volunteer-activism"
            size={18}
            color={
              COLORS.white
            }
          />

          <Text
            style={
              styles.bloodText
            }
          >
            {
              item.blood_type
            }
          </Text>
        </View>

        <View
          style={
            styles.cardMain
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={
              styles.facilityName
            }
          >
            {
              item.facility_name
            }
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={
              styles.metaText
            }
          >
            Requester:{' '}
            {item
              .other_participant
              ?.full_name ||
              'Hemo-Hero User'}
          </Text>
        </View>

        <View
          style={[
            styles.statusBadge,

            {
              backgroundColor:
                closed
                  ? COLORS.grayLight
                  : COLORS.greenLight,
            },
          ]}
        >
          <Text
            style={[
              styles.statusText,

              {
                color:
                  closed
                    ? COLORS.lightMuted
                    : COLORS.green,
              },
            ]}
          >
            {closed
              ? 'Closed'
              : 'Accepted'}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.detailBox
        }
      >
        <View
          style={
            styles.detailItem
          }
        >
          <MaterialIcons
            name={
              item.schedule
                ? 'event'
                : 'chat-bubble-outline'
            }
            size={16}
            color={
              COLORS.redButton
            }
          />

          <Text
            numberOfLines={
              2
            }
            style={
              styles.detailText
            }
          >
            {item.schedule
              ? `Scheduled ${formatDate(
                  item.schedule
                    .scheduled_at
                )}`
              : item.latest_message
                ? item.latest_message
                    .message
                : 'Open coordination'}
          </Text>
        </View>

        <MaterialIcons
          name="chevron-right"
          size={21}
          color={
            COLORS.redButton
          }
        />
      </View>
    </TouchableOpacity>
  );
}

// ============================================================
// EMPTY STATE
// ============================================================

function EmptyState({
  icon,
  title,
  description,
  buttonText,
  onPress,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  title:
    string;

  description:
    string;

  buttonText:
    string;

  onPress:
    () => void;
}) {
  return (
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
            icon
          }
          size={31}
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
        {title}
      </Text>

      <Text
        style={
          styles.stateDescription
        }
      >
        {description}
      </Text>

      <TouchableOpacity
        style={
          styles.stateButton
        }
        activeOpacity={
          0.85
        }
        onPress={
          onPress
        }
      >
        <Text
          style={
            styles.stateButtonText
          }
        >
          {buttonText}
        </Text>
      </TouchableOpacity>
    </View>
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

    desktopBackground: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        Platform.OS ===
        'web'
          ? '#242424'
          : COLORS.page,
    },

    phone: {
      width:
        Platform.OS ===
        'web'
          ? 440
          : '100%',

      height:
        Platform.OS ===
        'web'
          ? '100%'
          : '100%',

      maxWidth:
        '100%',

      overflow:
        'hidden',

      backgroundColor:
        COLORS.page,
    },

    safeArea: {
      flex:
        1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      minHeight:
        118,

      paddingHorizontal:
        22,

      paddingTop:
        18,

      paddingBottom:
        18,

      justifyContent:
        'center',

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width:
        170,

      height:
        170,

      borderRadius:
        85,

      left:
        -95,

      top:
        -105,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width:
        180,

      height:
        180,

      borderRadius:
        90,

      right:
        -100,

      top:
        -110,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    eyebrow: {
      color:
        'rgba(255,255,255,0.82)',

      fontFamily:
        'Inter_500Medium',

      fontSize:
        11,

      letterSpacing:
        1.3,

      marginBottom:
        3,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        22,
    },

    headerSubtitle: {
      marginTop:
        2,

      color:
        'rgba(255,255,255,0.82)',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
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

    // ========================================================
    // TABS
    // ========================================================

    tabBar: {
      minHeight:
        58,

      marginHorizontal:
        14,

      marginTop:
        14,

      padding:
        4,

      flexDirection:
        'row',

      borderRadius:
        14,

      backgroundColor:
        '#ECE5E5',
    },

    tabButton: {
      flex:
        1,

      minWidth:
        0,

      paddingHorizontal:
        3,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        3,

      borderRadius:
        11,
    },

    tabButtonActive: {
      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          1,
      },

      shadowOpacity:
        0.07,

      shadowRadius:
        3,

      elevation:
        2,
    },

    tabText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12.5,
    },

    tabTextActive: {
      color:
        COLORS.redButton,
    },

    tabCount: {
      minWidth:
        19,

      height:
        19,

      paddingHorizontal:
        4,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    tabCountAttention: {
      backgroundColor:
        COLORS.redButton,
    },

    tabCountText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        11,
    },

    tabCountTextAttention: {
      color:
        COLORS.white,
    },

    // ========================================================
    // SCROLL
    // ========================================================

    scroll: {
      flex:
        1,
    },

    scrollContent: {
      paddingHorizontal:
        16,

      paddingTop:
        16,

      paddingBottom:
        20,
    },

    sectionLabel: {
      marginBottom:
        10,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14.5,
    },

    // ========================================================
    // CARD
    // ========================================================

    card: {
      marginBottom:
        11,

      padding:
        14,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        15,

      backgroundColor:
        COLORS.card,
    },

    cardClosed: {
      opacity:
        0.82,
    },

    cardTop: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    bloodBadge: {
      width:
        50,

      height:
        50,

      marginRight:
        10,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    bloodText: {
      marginTop:
        -1,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        13,
    },

    cardMain: {
      flex:
        1,

      minWidth:
        0,

      paddingRight:
        6,
    },

    facilityName: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        14,
    },

    metaText: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,
    },

    statusBadge: {
      minHeight:
        27,

      paddingHorizontal:
        8,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    statusText: {
      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    detailBox: {
      minHeight:
        44,

      marginTop:
        11,

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

    detailItem: {
      flex:
        1,

      paddingRight:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,
    },

    detailText: {
      flex:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_500Medium',

      fontSize:
        12.5,

      lineHeight:
        19,
    },

    detailList: {
      flex: 1,

      paddingVertical: 9,
      paddingRight: 8,

      gap: 6,
    },

    detailListItem: {
      flexDirection: 'row',
      alignItems: 'center',

      gap: 6,
    },

    activeHint: {
      marginTop: 8,

      color: COLORS.green,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    // ========================================================
    // CREATE REQUEST CALL TO ACTION
    // ========================================================

    createCard: {
      marginBottom: 16,

      padding: 14,

      flexDirection: 'row',
      alignItems: 'center',

      gap: 12,

      borderRadius: 15,

      backgroundColor:
        COLORS.redButton,

      shadowColor: '#8F1111',
      shadowOffset: {
        width: 0,
        height: 4,
      },
      shadowOpacity: 0.25,
      shadowRadius: 8,
      elevation: 5,
    },

    createIcon: {
      width: 42,
      height: 42,

      borderRadius: 21,

      alignItems: 'center',
      justifyContent: 'center',

      backgroundColor:
        'rgba(255,255,255,0.2)',
    },

    createBody: {
      flex: 1,
      minWidth: 0,
    },

    createTitle: {
      color: COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 15,
    },

    createText: {
      marginTop: 1,

      color:
        'rgba(255,255,255,0.85)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    // ========================================================
    // INVITATION INFO
    // ========================================================

    invitationInfo: {
      marginBottom:
        13,

      padding:
        12,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        '#F0CACA',

      borderRadius:
        13,

      backgroundColor:
        COLORS.pinkLight,
    },

    invitationInfoIcon: {
      width:
        37,

      height:
        37,

      borderRadius:
        19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    invitationInfoBody: {
      flex:
        1,

      minWidth:
        0,
    },

    invitationInfoTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    invitationInfoText: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,
    },

    // ========================================================
    // INVITATION CARD
    // ========================================================

    invitationCard: {
      padding:
        13,
    },

    invitationCardHistory: {
      opacity:
        0.93,
    },

    invitationBloodBadge: {
      width:
        48,

      height:
        48,

      marginRight:
        10,

      borderRadius:
        14,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    invitationBloodText: {
      marginTop:
        -1,

      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_700Bold',

      fontSize:
        13,
    },

    invitationRequester: {
      minHeight:
        44,

      marginTop:
        10,

      paddingHorizontal:
        8,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderRadius:
        10,

      backgroundColor:
        '#FFF9F9',
    },

    requesterIcon: {
      width:
        30,

      height:
        30,

      marginRight:
        8,

      borderRadius:
        15,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    requesterBody: {
      flex:
        1,

      minWidth:
        0,
    },

    requesterLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    requesterName: {
      marginTop:
        1,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    invitationDate: {
      marginLeft:
        8,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        11.5,
    },

    invitationMessage: {
      marginTop:
        9,

      padding:
        9,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        6,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      borderRadius:
        9,

      backgroundColor:
        COLORS.white,
    },

    invitationMessageText: {
      flex:
        1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        18,
    },

    requestClosedNotice: {
      marginTop:
        9,

      padding:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderRadius:
        9,

      backgroundColor:
        COLORS.grayLight,
    },

    requestClosedText: {
      flex:
        1,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,
    },

    // ========================================================
    // VIEW REQUEST
    // ========================================================

    viewRequestButton: {
      minHeight:
        43,

      marginTop:
        10,

      paddingHorizontal:
        9,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderWidth:
        1,

      borderColor:
        '#F0D1D1',

      borderRadius:
        10,

      backgroundColor:
        '#FFF8F8',
    },

    // Pending invitation on an active request: solid button.
    respondButton: {
      borderColor:
        COLORS.redButton,

      backgroundColor:
        COLORS.redButton,
    },

    respondButtonText: {
      color: COLORS.white,
    },

    viewRequestLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        7,
    },

    viewRequestIcon: {
      width:
        28,

      height:
        28,

      borderRadius:
        8,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    viewRequestText: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    // ========================================================
    // DONATION INFO
    // ========================================================

    donationInfo: {
      marginBottom:
        13,

      paddingHorizontal:
        11,

      paddingVertical:
        10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        7,

      borderRadius:
        11,

      backgroundColor:
        COLORS.blueLight,
    },

    donationInfoText: {
      flex:
        1,

      color:
        '#48627A',

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        19,
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      marginBottom:
        12,

      padding:
        13,

      flexDirection:
        'row',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        '#EDB1B1',

      borderRadius:
        13,

      backgroundColor:
        COLORS.pinkLight,
    },

    errorBody: {
      flex:
        1,
    },

    errorTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        13,
    },

    errorText: {
      marginTop:
        3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12,

      lineHeight:
        18,
    },

    retryText: {
      marginTop:
        6,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        12,
    },

    // ========================================================
    // EMPTY / LOADING
    // ========================================================

    stateCard: {
      minHeight:
        260,

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
        62,

      height:
        62,

      marginBottom:
        13,

      borderRadius:
        31,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkLight,
    },

    stateTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize:
        15,

      textAlign:
        'center',
    },

    stateDescription: {
      maxWidth:
        280,

      marginTop:
        6,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize:
        12.5,

      lineHeight:
        19,

      textAlign:
        'center',
    },

    stateButton: {
      minHeight:
        42,

      marginTop:
        16,

      paddingHorizontal:
        18,

      borderRadius:
        10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    stateButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize:
        13,
    },

    bottomSpacing: {
      height:
        10,
    },
  });
