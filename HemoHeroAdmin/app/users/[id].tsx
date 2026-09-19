import {
  useCallback,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Image,
  Modal,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  useWindowDimensions,
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
  activateAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  getAdminUserById,
  type AdminManagedUser,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

// ============================================================
// IPAD PRO LANDSCAPE
// ============================================================

const DESIGN_WIDTH =
  1366;

const DESIGN_HEIGHT =
  1024;

// ============================================================
// COLORS
// ============================================================

const COLORS = {
  outer:
    '#02040A',

  navy:
    '#050B19',

  card:
    '#091126',

  cardLight:
    '#101A35',

  border:
    '#243554',

  red:
    '#DB0A0A',

  redBright:
    '#EF3340',

  white:
    '#FFFFFF',

  muted:
    '#7F889F',

  soft:
    '#B7C1D8',

  green:
    '#35C982',

  orange:
    '#F3A34A',

  blue:
    '#6EA8FE',

  overlay:
    'rgba(0,0,0,0.76)',
};

// ============================================================
// SCREEN
// ============================================================

export default function AdminUserDetailsScreen() {
  const {
    id,
  } =
    useLocalSearchParams<{
      id?: string;
    }>();

  const {
    width,
    height,
  } =
    useWindowDimensions();

  // ==========================================================
  // RESPONSIVE TABLET FRAME
  // ==========================================================

  const tablet =
    useMemo(
      () => {
        if (
          Platform.OS !==
          'web'
        ) {
          return {
            width,
            height,

            scale:
              Math.min(
                width /
                  DESIGN_WIDTH,

                height /
                  DESIGN_HEIGHT
              ),
          };
        }

        const padding =
          24;

        const availableWidth =
          Math.max(
            width -
              padding * 2,

            320
          );

        const availableHeight =
          Math.max(
            height -
              padding * 2,

            320
          );

        const scale =
          Math.min(
            availableWidth /
              DESIGN_WIDTH,

            availableHeight /
              DESIGN_HEIGHT,

            1
          );

        return {
          width:
            DESIGN_WIDTH *
            scale,

          height:
            DESIGN_HEIGHT *
            scale,

          scale,
        };
      },
      [
        width,
        height,
      ]
    );

  const s =
    Math.max(
      tablet.scale,
      0.68
    );

  // ==========================================================
  // STATE
  // ==========================================================

  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  const [
    user,
    setUser,
  ] =
    useState<AdminManagedUser | null>(
      null
    );

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
    useState(
      ''
    );

  const [
    successMessage,
    setSuccessMessage,
  ] =
    useState(
      ''
    );

  // ==========================================================
  // ACTIVATE / DEACTIVATE
  // ==========================================================

  const [
    actionModalVisible,
    setActionModalVisible,
  ] =
    useState(
      false
    );

  const [
    processingAction,
    setProcessingAction,
  ] =
    useState(
      false
    );

  // ==========================================================
  // DELETE
  // ==========================================================

  const [
    deleteModalVisible,
    setDeleteModalVisible,
  ] =
    useState(
      false
    );

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] =
    useState(
      ''
    );

  const [
    processingDelete,
    setProcessingDelete,
  ] =
    useState(
      false
    );

  // ==========================================================
  // LOAD USER
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadUser();
      },
      [
        id,
      ]
    )
  );

  async function loadUser(
    refreshOnly = false
  ) {
    try {
      if (
        refreshOnly
      ) {
        setRefreshing(
          true
        );
      } else {
        setLoading(
          true
        );
      }

      setErrorMessage(
        ''
      );

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      if (
        !token ||
        savedProfile?.role !==
          'admin'
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      if (
        !id ||
        typeof id !==
          'string'
      ) {
        setErrorMessage(
          'Invalid user ID.'
        );

        return;
      }

      setProfile(
        savedProfile
      );

      const result =
        await getAdminUserById(
          token,
          id
        );

      setUser(
        result.user
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN USER DETAILS ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to load user details.'
      );
    } finally {
      setLoading(
        false
      );

      setRefreshing(
        false
      );
    }
  }

  // ==========================================================
  // ADMIN DISPLAY
  // ==========================================================

  const adminName =
    [
      profile?.first_name,
      profile?.last_name,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .trim() ||
    profile?.email ||
    'Administrator';

  const adminInitial =
    adminName
      .charAt(
        0
      )
      .toUpperCase();

  // ==========================================================
  // USER DISPLAY
  // ==========================================================

  const userName =
    user
      ? getUserDisplayName(
          user
        )
      : 'User';

  const userInitials =
    user
      ? getInitials(
          user
        )
      : 'U';

  // ==========================================================
  // EDIT USER
  // ==========================================================

  function openEditUser() {
    if (
      !user
    ) {
      return;
    }

    router.push(
      `/users/${user.id}/edit` as any
    );
  }

  // ==========================================================
  // ACTIVATE / DEACTIVATE
  // ==========================================================

  function openActionModal() {
    if (
      !user ||
      processingAction ||
      processingDelete
    ) {
      return;
    }

    setErrorMessage(
      ''
    );

    setSuccessMessage(
      ''
    );

    setActionModalVisible(
      true
    );
  }

  function closeActionModal() {
    if (
      processingAction
    ) {
      return;
    }

    setActionModalVisible(
      false
    );
  }

  async function confirmAccountAction() {
    if (
      !user ||
      processingAction
    ) {
      return;
    }

    try {
      setProcessingAction(
        true
      );

      setErrorMessage(
        ''
      );

      setSuccessMessage(
        ''
      );

      const token =
        await getAdminAccessToken();

      if (
        !token
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      const wasActive =
        user.is_active;

      const result =
        wasActive
          ? await deactivateAdminUser(
              token,
              user.id
            )
          : await activateAdminUser(
              token,
              user.id
            );

      setUser(
        result.user
      );

      setSuccessMessage(
        result.message ||
        (
          wasActive
            ? 'User account deactivated successfully.'
            : 'User account activated successfully.'
        )
      );

      setActionModalVisible(
        false
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN USER DETAILS ACTION ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to update user account.'
      );

      setActionModalVisible(
        false
      );
    } finally {
      setProcessingAction(
        false
      );
    }
  }

  // ==========================================================
  // DELETE USER
  // ==========================================================

  function openDeleteModal() {
    if (
      !user ||
      processingDelete ||
      processingAction
    ) {
      return;
    }

    setDeleteConfirmation(
      ''
    );

    setErrorMessage(
      ''
    );

    setSuccessMessage(
      ''
    );

    setDeleteModalVisible(
      true
    );
  }

  function closeDeleteModal() {
    if (
      processingDelete
    ) {
      return;
    }

    setDeleteModalVisible(
      false
    );

    setDeleteConfirmation(
      ''
    );
  }

  async function confirmDeleteUser() {
    if (
      !user ||
      processingDelete
    ) {
      return;
    }

    if (
      deleteConfirmation
        .trim()
        .toUpperCase() !==
      'DELETE'
    ) {
      return;
    }

    try {
      setProcessingDelete(
        true
      );

      setErrorMessage(
        ''
      );

      const token =
        await getAdminAccessToken();

      if (
        !token
      ) {
        await clearAdminSession();

        router.replace(
          '/'
        );

        return;
      }

      await deleteAdminUser(
        token,
        user.id
      );

      setDeleteModalVisible(
        false
      );

      setDeleteConfirmation(
        ''
      );

      router.replace(
        '/users'
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN DELETE USER ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to permanently delete user account.'
      );

      setDeleteModalVisible(
        false
      );

      setDeleteConfirmation(
        ''
      );
    } finally {
      setProcessingDelete(
        false
      );
    }
  }

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

          Platform.OS !==
            'web' &&
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
              <Pressable
                style={({ pressed }) => [
                  styles.brandArea,

                  pressed &&
                    styles.pressed,
                ]}
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
                          27 * s,
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
                          9 * s,

                        letterSpacing:
                          1.6 * s,
                      },
                    ]}
                  >
                    ADMIN PORTAL
                  </Text>
                </View>
              </Pressable>

              <View
                style={
                  styles.adminSection
                }
              >
                <View
                  style={
                    styles.notificationWrap
                  }
                >
                  <MaterialIcons
                    name="notifications-none"
                    size={
                      24 * s
                    }
                    color={
                      COLORS.white
                    }
                  />

                  <View
                    style={[
                      styles.notificationBadge,

                      {
                        minWidth:
                          18 * s,

                        height:
                          18 * s,

                        borderRadius:
                          9 * s,
                      },
                    ]}
                  >
                    <Text
                      style={[
                        styles.notificationBadgeText,

                        {
                          fontSize:
                            9 * s,
                        },
                      ]}
                    >
                      3
                    </Text>
                  </View>
                </View>

                <View
                  style={[
                    styles.avatar,

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
                      styles.avatarText,

                      {
                        fontSize:
                          15 * s,
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
                          12 * s,
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
                          10 * s,
                      },
                    ]}
                  >
                    Admin
                  </Text>
                </View>
              </View>
            </View>

            {/* ==================================================
                CONTENT
            ================================================== */}

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
                    30 * s,

                  paddingBottom:
                    36 * s,
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              {/* ================================================
                  BACK + TITLE
              ================================================ */}

              <View
                style={[
                  styles.titleRow,

                  {
                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <View
                  style={
                    styles.titleLeft
                  }
                >
                  <Pressable
                    onPress={() =>
                      router.back()
                    }
                    style={({ pressed }) => [
                      styles.backButton,

                      {
                        width:
                          43 * s,

                        height:
                          43 * s,

                        borderRadius:
                          11 * s,

                        marginRight:
                          14 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <MaterialIcons
                      name="arrow-back"
                      size={
                        21 * s
                      }
                      color={
                        COLORS.white
                      }
                    />
                  </Pressable>

                  <View>
                    <Text
                      style={[
                        styles.title,

                        {
                          fontSize:
                            30 * s,

                          lineHeight:
                            38 * s,
                        },
                      ]}
                    >
                      User Details
                    </Text>

                    <Text
                      style={[
                        styles.subtitle,

                        {
                          fontSize:
                            12 * s,

                          marginTop:
                            3 * s,
                        },
                      ]}
                    >
                      Review and manage this registered Hemo-Hero user.
                    </Text>
                  </View>
                </View>

                <Pressable
                  disabled={
                    refreshing
                  }
                  onPress={() =>
                    loadUser(
                      true
                    )
                  }
                  style={({ pressed }) => [
                    styles.refreshButton,

                    {
                      height:
                        45 * s,

                      paddingHorizontal:
                        18 * s,

                      borderRadius:
                        10 * s,

                      gap:
                        8 * s,
                    },

                    pressed &&
                      styles.pressed,

                    refreshing &&
                      styles.disabled,
                  ]}
                >
                  {refreshing ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="refresh"
                        size={
                          20 * s
                        }
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={[
                          styles.refreshText,

                          {
                            fontSize:
                              11 * s,
                          },
                        ]}
                      >
                        Refresh
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>

              {/* ================================================
                  LOADING
              ================================================ */}

              {loading ? (
                <View
                  style={[
                    styles.loadingArea,

                    {
                      minHeight:
                        500 * s,
                    },
                  ]}
                >
                  <ActivityIndicator
                    size="large"
                    color={
                      COLORS.redBright
                    }
                  />

                  <Text
                    style={[
                      styles.loadingText,

                      {
                        fontSize:
                          12 * s,

                        marginTop:
                          14 * s,
                      },
                    ]}
                  >
                    Loading user details...
                  </Text>
                </View>
              ) : errorMessage &&
                !user ? (
                <View
                  style={[
                    styles.errorState,

                    {
                      minHeight:
                        420 * s,
                    },
                  ]}
                >
                  <MaterialIcons
                    name="error-outline"
                    size={
                      44 * s
                    }
                    color={
                      COLORS.redBright
                    }
                  />

                  <Text
                    style={[
                      styles.errorStateTitle,

                      {
                        fontSize:
                          18 * s,

                        marginTop:
                          14 * s,
                      },
                    ]}
                  >
                    Unable to Load User
                  </Text>

                  <Text
                    style={[
                      styles.errorStateText,

                      {
                        fontSize:
                          11 * s,

                        marginTop:
                          6 * s,
                      },
                    ]}
                  >
                    {
                      errorMessage
                    }
                  </Text>
                </View>
              ) : user ? (
                <>
                  {/* ============================================
                      SUCCESS
                  ============================================ */}

                  {successMessage ? (
                    <View
                      style={[
                        styles.successCard,

                        {
                          padding:
                            14 * s,

                          borderRadius:
                            12 * s,

                          marginBottom:
                            18 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="check-circle"
                        size={
                          21 * s
                        }
                        color={
                          COLORS.green
                        }
                      />

                      <Text
                        style={[
                          styles.successCardText,

                          {
                            fontSize:
                              11 * s,
                          },
                        ]}
                      >
                        {
                          successMessage
                        }
                      </Text>
                    </View>
                  ) : null}

                  {/* ============================================
                      ERROR
                  ============================================ */}

                  {errorMessage ? (
                    <View
                      style={[
                        styles.errorCard,

                        {
                          padding:
                            14 * s,

                          borderRadius:
                            12 * s,

                          marginBottom:
                            18 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="error-outline"
                        size={
                          21 * s
                        }
                        color={
                          COLORS.redBright
                        }
                      />

                      <Text
                        style={[
                          styles.errorText,

                          {
                            fontSize:
                              11 * s,
                          },
                        ]}
                      >
                        {
                          errorMessage
                        }
                      </Text>
                    </View>
                  ) : null}

                  {/* ============================================
                      PROFILE HEADER
                  ============================================ */}

                  <View
                    style={[
                      styles.profileCard,

                      {
                        minHeight:
                          165 * s,

                        padding:
                          24 * s,

                        borderRadius:
                          16 * s,

                        marginBottom:
                          20 * s,
                      },
                    ]}
                  >
                    <View
                      style={
                        styles.profileLeft
                      }
                    >
                      <View
                        style={[
                          styles.userAvatar,

                          {
                            width:
                              78 * s,

                            height:
                              78 * s,

                            borderRadius:
                              39 * s,

                            marginRight:
                              20 * s,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.userAvatarText,

                            {
                              fontSize:
                                20 * s,
                            },
                          ]}
                        >
                          {
                            userInitials
                          }
                        </Text>
                      </View>

                      <View
                        style={
                          styles.profileText
                        }
                      >
                        <Text
                          style={[
                            styles.userName,

                            {
                              fontSize:
                                20 * s,
                            },
                          ]}
                        >
                          {
                            userName
                          }
                        </Text>

                        <Text
                          style={[
                            styles.userEmail,

                            {
                              fontSize:
                                11 * s,

                              marginTop:
                                4 * s,
                            },
                          ]}
                        >
                          {user.email ||
                            'No email available'}
                        </Text>

                        <View
                          style={[
                            styles.profileBadges,

                            {
                              gap:
                                8 * s,

                              marginTop:
                                12 * s,
                            },
                          ]}
                        >
                          <StatusBadge
                            scale={
                              s
                            }
                            active={
                              user.is_active
                            }
                          />

                          <View
                            style={[
                              styles.roleBadge,

                              {
                                minHeight:
                                  29 * s,

                                paddingHorizontal:
                                  10 * s,

                                borderRadius:
                                  14 * s,
                              },
                            ]}
                          >
                            <Text
                              style={[
                                styles.roleBadgeText,

                                {
                                  fontSize:
                                    9 * s,
                                },
                              ]}
                            >
                              USER
                            </Text>
                          </View>
                        </View>
                      </View>
                    </View>

                    {/* ==========================================
                        USER ACTIONS
                    ========================================== */}

                    <View
                      style={[
                        styles.profileActions,

                        {
                          gap:
                            9 * s,
                        },
                      ]}
                    >
                      {/* ========================================
                          EDIT
                      ======================================== */}

                      <Pressable
                        onPress={
                          openEditUser
                        }
                        style={({ pressed }) => [
                          styles.editButton,

                          {
                            height:
                              43 * s,

                            paddingHorizontal:
                              15 * s,

                            borderRadius:
                              9 * s,

                            gap:
                              7 * s,
                          },

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <MaterialIcons
                          name="edit"
                          size={
                            18 * s
                          }
                          color={
                            COLORS.white
                          }
                        />

                        <Text
                          style={[
                            styles.editButtonText,

                            {
                              fontSize:
                                9 * s,
                            },
                          ]}
                        >
                          Edit User
                        </Text>
                      </Pressable>

                      {/* ========================================
                          ACTIVATE / DEACTIVATE
                      ======================================== */}

                      <Pressable
                        onPress={
                          openActionModal
                        }
                        style={({ pressed }) => [
                          styles.accountActionButton,

                          {
                            height:
                              43 * s,

                            paddingHorizontal:
                              15 * s,

                            borderRadius:
                              9 * s,

                            gap:
                              7 * s,
                          },

                          user.is_active
                            ? styles.deactivateButton
                            : styles.activateButton,

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <MaterialIcons
                          name={
                            user.is_active
                              ? 'person-off'
                              : 'person-add'
                          }
                          size={
                            18 * s
                          }
                          color={
                            user.is_active
                              ? COLORS.redBright
                              : COLORS.green
                          }
                        />

                        <Text
                          style={[
                            styles.accountActionText,

                            {
                              fontSize:
                                9 * s,
                            },

                            user.is_active
                              ? styles.deactivateText
                              : styles.activateText,
                          ]}
                        >
                          {user.is_active
                            ? 'Deactivate'
                            : 'Activate'}
                        </Text>
                      </Pressable>

                      {/* ========================================
                          DELETE
                      ======================================== */}

                      <Pressable
                        onPress={
                          openDeleteModal
                        }
                        style={({ pressed }) => [
                          styles.deleteButton,

                          {
                            height:
                              43 * s,

                            paddingHorizontal:
                              15 * s,

                            borderRadius:
                              9 * s,

                            gap:
                              7 * s,
                          },

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <MaterialIcons
                          name="delete-outline"
                          size={
                            18 * s
                          }
                          color={
                            COLORS.redBright
                          }
                        />

                        <Text
                          style={[
                            styles.deleteButtonText,

                            {
                              fontSize:
                                9 * s,
                            },
                          ]}
                        >
                          Delete
                        </Text>
                      </Pressable>
                    </View>
                  </View>

                  {/* ============================================
                      TWO COLUMNS
                  ============================================ */}

                  <View
                    style={[
                      styles.columns,

                      {
                        gap:
                          20 * s,
                      },
                    ]}
                  >
                    {/* ==========================================
                        LEFT
                    ========================================== */}

                    <View
                      style={
                        styles.column
                      }
                    >
                      <SectionCard
                        scale={
                          s
                        }
                        title="Personal Information"
                        icon="person-outline"
                      >
                        <InfoRow
                          scale={
                            s
                          }
                          label="First Name"
                          value={
                            user.first_name
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Middle Name"
                          value={
                            user.middle_name
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Last Name"
                          value={
                            user.last_name
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Suffix"
                          value={
                            user.suffix
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Date of Birth"
                          value={
                            formatDate(
                              user.date_of_birth
                            )
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Gender"
                          value={
                            formatValue(
                              user.gender
                            )
                          }
                          last
                        />
                      </SectionCard>

                      <View
                        style={{
                          height:
                            20 * s,
                        }}
                      />

                      <SectionCard
                        scale={
                          s
                        }
                        title="Donor Information"
                        icon="bloodtype"
                      >
                        <InfoRow
                          scale={
                            s
                          }
                          label="Donor Status"
                          value={
                            getDonorStatus(
                              user
                            )
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Blood Type"
                          value={
                            user.donor
                              ?.blood_type ||
                            user.blood_type
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Availability"
                          value={
                            formatValue(
                              user.donor
                                ?.availability_status
                            )
                          }
                          last
                        />
                      </SectionCard>
                    </View>

                    {/* ==========================================
                        RIGHT
                    ========================================== */}

                    <View
                      style={
                        styles.column
                      }
                    >
                      <SectionCard
                        scale={
                          s
                        }
                        title="Contact & Location"
                        icon="contact-phone"
                      >
                        <InfoRow
                          scale={
                            s
                          }
                          label="Email"
                          value={
                            user.email
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Phone"
                          value={
                            user.phone
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Barangay"
                          value={
                            user.barangay
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="City"
                          value={
                            user.city
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Province"
                          value={
                            user.province
                          }
                          last
                        />
                      </SectionCard>

                      <View
                        style={{
                          height:
                            20 * s,
                        }}
                      />

                      <SectionCard
                        scale={
                          s
                        }
                        title="Account Information"
                        icon="manage-accounts"
                      >
                        <InfoRow
                          scale={
                            s
                          }
                          label="Role"
                          value="User"
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Account Status"
                          value={
                            user.is_active
                              ? 'Active'
                              : 'Inactive'
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Joined"
                          value={
                            formatDate(
                              user.created_at
                            )
                          }
                        />

                        <InfoRow
                          scale={
                            s
                          }
                          label="Last Updated"
                          value={
                            formatDate(
                              user.updated_at
                            )
                          }
                        />

                        {!user.is_active ? (
                          <InfoRow
                            scale={
                              s
                            }
                            label="Deactivated"
                            value={
                              formatDate(
                                user.deactivated_at
                              )
                            }
                            last
                          />
                        ) : (
                          <InfoRow
                            scale={
                              s
                            }
                            label="User ID"
                            value={
                              user.id
                            }
                            last
                            mono
                          />
                        )}
                      </SectionCard>
                    </View>
                  </View>
                </>
              ) : null}
            </ScrollView>
          </SafeAreaView>
        </LinearGradient>

        {/* ====================================================
            ACTIVATE / DEACTIVATE MODAL
        ==================================================== */}

        <Modal
          visible={
            actionModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={
            closeActionModal
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFill
              }
              disabled={
                processingAction
              }
              onPress={
                closeActionModal
              }
            />

            <View
              style={[
                styles.modalCard,

                {
                  width:
                    455 * s,

                  padding:
                    30 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <View
                style={[
                  styles.modalIcon,

                  {
                    width:
                      58 * s,

                    height:
                      58 * s,

                    borderRadius:
                      29 * s,
                  },

                  user?.is_active
                    ? styles.modalIconDanger
                    : styles.modalIconSuccess,
                ]}
              >
                <MaterialIcons
                  name={
                    user?.is_active
                      ? 'person-off'
                      : 'person-add'
                  }
                  size={
                    28 * s
                  }
                  color={
                    user?.is_active
                      ? COLORS.redBright
                      : COLORS.green
                  }
                />
              </View>

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize:
                      21 * s,

                    marginTop:
                      18 * s,
                  },
                ]}
              >
                {user?.is_active
                  ? 'Deactivate User?'
                  : 'Activate User?'}
              </Text>

              <Text
                style={[
                  styles.modalMessage,

                  {
                    fontSize:
                      12 * s,

                    lineHeight:
                      20 * s,

                    marginTop:
                      9 * s,
                  },
                ]}
              >
                {user?.is_active
                  ? 'This user will be prevented from using authenticated Hemo-Hero features until the account is activated again.'
                  : 'This user will regain access to authenticated Hemo-Hero features.'}
              </Text>

              <View
                style={[
                  styles.modalUserCard,

                  {
                    padding:
                      14 * s,

                    borderRadius:
                      11 * s,

                    marginTop:
                      18 * s,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalUserName,

                    {
                      fontSize:
                        12 * s,
                    },
                  ]}
                >
                  {
                    userName
                  }
                </Text>

                <Text
                  style={[
                    styles.modalUserEmail,

                    {
                      fontSize:
                        10 * s,

                      marginTop:
                        3 * s,
                    },
                  ]}
                >
                  {user?.email ||
                    'No email available'}
                </Text>
              </View>

              <View
                style={[
                  styles.modalButtons,

                  {
                    gap:
                      12 * s,

                    marginTop:
                      24 * s,
                  },
                ]}
              >
                <Pressable
                  disabled={
                    processingAction
                  }
                  onPress={
                    closeActionModal
                  }
                  style={({ pressed }) => [
                    styles.cancelButton,

                    {
                      height:
                        49 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    processingAction
                  }
                  onPress={
                    confirmAccountAction
                  }
                  style={({ pressed }) => [
                    styles.confirmButton,

                    !user?.is_active &&
                      styles.confirmActivateButton,

                    {
                      height:
                        49 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,

                    processingAction &&
                      styles.disabled,
                  ]}
                >
                  {processingAction ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <Text
                      style={[
                        styles.confirmButtonText,

                        {
                          fontSize:
                            11 * s,
                        },
                      ]}
                    >
                      {user?.is_active
                        ? 'Deactivate'
                        : 'Activate'}
                    </Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>

        {/* ====================================================
            PERMANENT DELETE MODAL
        ==================================================== */}

        <Modal
          visible={
            deleteModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={
            closeDeleteModal
          }
        >
          <View
            style={
              styles.modalOverlay
            }
          >
            <Pressable
              style={
                StyleSheet.absoluteFill
              }
              disabled={
                processingDelete
              }
              onPress={
                closeDeleteModal
              }
            />

            <View
              style={[
                styles.deleteModalCard,

                {
                  width:
                    500 * s,

                  padding:
                    30 * s,

                  borderRadius:
                    20 * s,
                },
              ]}
            >
              <View
                style={[
                  styles.deleteModalIcon,

                  {
                    width:
                      62 * s,

                    height:
                      62 * s,

                    borderRadius:
                      31 * s,
                  },
                ]}
              >
                <MaterialIcons
                  name="warning"
                  size={
                    31 * s
                  }
                  color={
                    COLORS.redBright
                  }
                />
              </View>

              <Text
                style={[
                  styles.deleteModalTitle,

                  {
                    fontSize:
                      21 * s,

                    marginTop:
                      18 * s,
                  },
                ]}
              >
                Permanently Delete User?
              </Text>

              <Text
                style={[
                  styles.deleteModalMessage,

                  {
                    fontSize:
                      11 * s,

                    lineHeight:
                      19 * s,

                    marginTop:
                      9 * s,
                  },
                ]}
              >
                This permanently removes the user account and related account data handled by the database relationships. This action cannot be undone.
              </Text>

              <View
                style={[
                  styles.deleteUserCard,

                  {
                    marginTop:
                      18 * s,

                    padding:
                      14 * s,

                    borderRadius:
                      11 * s,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.deleteUserName,

                    {
                      fontSize:
                        12 * s,
                    },
                  ]}
                >
                  {
                    userName
                  }
                </Text>

                <Text
                  style={[
                    styles.deleteUserEmail,

                    {
                      fontSize:
                        10 * s,

                      marginTop:
                        3 * s,
                    },
                  ]}
                >
                  {user?.email ||
                    'No email available'}
                </Text>
              </View>

              <View
                style={[
                  styles.deleteWarning,

                  {
                    padding:
                      12 * s,

                    borderRadius:
                      9 * s,

                    marginTop:
                      15 * s,
                  },
                ]}
              >
                <MaterialIcons
                  name="info-outline"
                  size={
                    18 * s
                  }
                  color={
                    COLORS.orange
                  }
                />

                <Text
                  style={[
                    styles.deleteWarningText,

                    {
                      fontSize:
                        9 * s,
                    },
                  ]}
                >
                  To confirm permanent deletion, type DELETE below.
                </Text>
              </View>

              <TextInput
                value={
                  deleteConfirmation
                }
                onChangeText={
                  setDeleteConfirmation
                }
                editable={
                  !processingDelete
                }
                autoCapitalize="characters"
                autoCorrect={
                  false
                }
                placeholder="Type DELETE"
                placeholderTextColor={
                  COLORS.muted
                }
                style={[
                  styles.deleteInput,

                  {
                    height:
                      46 * s,

                    borderRadius:
                      9 * s,

                    paddingHorizontal:
                      14 * s,

                    fontSize:
                      11 * s,

                    marginTop:
                      13 * s,
                  },
                ]}
              />

              <View
                style={[
                  styles.modalButtons,

                  {
                    gap:
                      12 * s,

                    marginTop:
                      24 * s,
                  },
                ]}
              >
                <Pressable
                  disabled={
                    processingDelete
                  }
                  onPress={
                    closeDeleteModal
                  }
                  style={({ pressed }) => [
                    styles.cancelButton,

                    {
                      height:
                        49 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,
                  ]}
                >
                  <Text
                    style={[
                      styles.cancelButtonText,

                      {
                        fontSize:
                          11 * s,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  disabled={
                    processingDelete ||
                    deleteConfirmation
                      .trim()
                      .toUpperCase() !==
                      'DELETE'
                  }
                  onPress={
                    confirmDeleteUser
                  }
                  style={({ pressed }) => [
                    styles.permanentDeleteButton,

                    {
                      height:
                        49 * s,

                      borderRadius:
                        10 * s,
                    },

                    pressed &&
                      styles.pressed,

                    (
                      processingDelete ||
                      deleteConfirmation
                        .trim()
                        .toUpperCase() !==
                        'DELETE'
                    ) &&
                      styles.disabled,
                  ]}
                >
                  {processingDelete ? (
                    <ActivityIndicator
                      size="small"
                      color={
                        COLORS.white
                      }
                    />
                  ) : (
                    <>
                      <MaterialIcons
                        name="delete-forever"
                        size={
                          18 * s
                        }
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={[
                          styles.permanentDeleteButtonText,

                          {
                            fontSize:
                              10 * s,
                          },
                        ]}
                      >
                        Delete Permanently
                      </Text>
                    </>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        </Modal>
      </View>
    </View>
  );
}

// ============================================================
// SECTION CARD
// ============================================================

function SectionCard({
  scale,
  title,
  icon,
  children,
}: {
  scale: number;

  title: string;

  icon:
    React.ComponentProps<
      typeof MaterialIcons
    >['name'];

  children:
    React.ReactNode;
}) {
  return (
    <View
      style={[
        styles.sectionCard,

        {
          borderRadius:
            14 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.sectionHeader,

          {
            minHeight:
              58 * scale,

            paddingHorizontal:
              18 * scale,
          },
        ]}
      >
        <View
          style={[
            styles.sectionIcon,

            {
              width:
                34 * scale,

              height:
                34 * scale,

              borderRadius:
                9 * scale,

              marginRight:
                10 * scale,
            },
          ]}
        >
          <MaterialIcons
            name={
              icon
            }
            size={
              18 * scale
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
                12 * scale,
            },
          ]}
        >
          {
            title
          }
        </Text>
      </View>

      <View
        style={{
          paddingHorizontal:
            18 * scale,
        }}
      >
        {
          children
        }
      </View>
    </View>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  scale,
  label,
  value,
  last = false,
  mono = false,
}: {
  scale: number;

  label: string;

  value?:
    | string
    | null;

  last?: boolean;

  mono?: boolean;
}) {
  return (
    <View
      style={[
        styles.infoRow,

        {
          minHeight:
            55 * scale,

          paddingVertical:
            10 * scale,
        },

        last &&
          styles.infoRowLast,
      ]}
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize:
              9 * scale,
          },
        ]}
      >
        {
          label
        }
      </Text>

      <Text
        numberOfLines={
          mono
            ? 2
            : 1
        }
        style={[
          styles.infoValue,

          {
            fontSize:
              mono
                ? 9 * scale
                : 10 * scale,
          },

          mono &&
            styles.infoValueMono,
        ]}
      >
        {value &&
        value.trim()
          ? value
          : '—'}
      </Text>
    </View>
  );
}

// ============================================================
// STATUS BADGE
// ============================================================

function StatusBadge({
  scale,
  active,
}: {
  scale: number;

  active: boolean;
}) {
  return (
    <View
      style={[
        styles.statusBadge,

        {
          minHeight:
            29 * scale,

          paddingHorizontal:
            10 * scale,

          borderRadius:
            14 * scale,
        },

        active
          ? styles.activeBadge
          : styles.inactiveBadge,
      ]}
    >
      <View
        style={[
          styles.statusDot,

          {
            width:
              6 * scale,

            height:
              6 * scale,

            borderRadius:
              3 * scale,
          },

          active
            ? styles.activeDot
            : styles.inactiveDot,
        ]}
      />

      <Text
        style={[
          styles.statusText,

          {
            fontSize:
              9 * scale,
          },

          active
            ? styles.activeText
            : styles.inactiveText,
        ]}
      >
        {active
          ? 'Active'
          : 'Inactive'}
      </Text>
    </View>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getUserDisplayName(
  user: AdminManagedUser
) {
  if (
    user.full_name
      ?.trim()
  ) {
    return user.full_name.trim();
  }

  const name =
    [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix,
    ]
      .filter(
        Boolean
      )
      .join(' ')
      .replace(
        /\s+/g,
        ' '
      )
      .trim();

  return (
    name ||
    user.email ||
    'Hemo-Hero User'
  );
}

function getInitials(
  user: AdminManagedUser
) {
  const first =
    user.first_name
      ?.trim()
      .charAt(
        0
      ) ||
    '';

  const last =
    user.last_name
      ?.trim()
      .charAt(
        0
      ) ||
    '';

  const initials =
    `${first}${last}`
      .toUpperCase();

  return (
    initials ||
    user.email
      ?.charAt(
        0
      )
      .toUpperCase() ||
    'U'
  );
}

function getDonorStatus(
  user: AdminManagedUser
) {
  if (
    !user.donor
  ) {
    return 'Not Registered';
  }

  const status =
    String(
      user.donor.status ||
      ''
    ).toLowerCase();

  if (
    status ===
    'approved'
  ) {
    return 'Approved Donor';
  }

  if (
    status ===
    'pending'
  ) {
    return 'Pending Review';
  }

  if (
    status ===
    'rejected'
  ) {
    return 'Rejected';
  }

  if (
    status ===
    'withdrawn'
  ) {
    return 'Withdrawn';
  }

  return 'Registered Donor';
}

function formatValue(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
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

function formatDate(
  value?:
    | string
    | null
) {
  if (
    !value
  ) {
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
    return '—';
  }

  return date.toLocaleDateString(
    'en-PH',
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
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    outer: {
      flex:
        1,

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
        Platform.OS ===
          'web'
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
      flex:
        1,
    },

    safeArea: {
      flex:
        1,
    },

    scroll: {
      flex:
        1,
    },

    content: {
      flexGrow:
        1,
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

      gap:
        14,
    },

    logoCircle: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,

      overflow:
        'hidden',
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

      marginTop:
        1,
    },

    adminSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        12,
    },

    notificationWrap: {
      marginRight:
        4,

      position:
        'relative',

      width:
        28,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBadge: {
      position:
        'absolute',

      top:
        -4,

      right:
        -6,

      paddingHorizontal:
        4,

      backgroundColor:
        COLORS.redBright,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    notificationBadgeText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_700Bold',
    },

    avatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ECECEC',
    },

    avatarText: {
      color:
        '#111111',

      fontFamily:
        'Poppins_600SemiBold',
    },

    adminName: {
      maxWidth:
        180,

      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    adminRole: {
      marginTop:
        2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // TITLE
    // ========================================================

    titleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    titleLeft: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    backButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    title: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    subtitle: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    refreshButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    refreshText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // PROFILE
    // ========================================================

    profileCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      gap:
        20,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    profileLeft: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      minWidth:
        0,
    },

    userAvatar: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#ECECEC',
    },

    userAvatarText: {
      color:
        '#111111',

      fontFamily:
        'Poppins_600SemiBold',
    },

    profileText: {
      flex:
        1,

      minWidth:
        0,
    },

    userName: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    userEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    profileBadges: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',
    },

    roleBadge: {
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

    roleBadgeText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_700Bold',
    },

    profileActions: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'flex-end',

      flexWrap:
        'wrap',
    },

    // ========================================================
    // EDIT
    // ========================================================

    editButton: {
      flexDirection:
        'row',

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

    editButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // ACCOUNT ACTION
    // ========================================================

    accountActionButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    deactivateButton: {
      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    activateButton: {
      borderColor:
        'rgba(53,201,130,0.45)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    accountActionText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    deactivateText: {
      color:
        COLORS.redBright,
    },

    activateText: {
      color:
        COLORS.green,
    },

    // ========================================================
    // DELETE BUTTON
    // ========================================================

    deleteButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.45)',

      backgroundColor:
        'rgba(239,51,64,0.08)',
    },

    deleteButtonText: {
      color:
        COLORS.redBright,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // STATUS
    // ========================================================

    statusBadge: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        6,

      borderWidth:
        1,
    },

    activeBadge: {
      borderColor:
        'rgba(53,201,130,0.35)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    inactiveBadge: {
      borderColor:
        'rgba(239,51,64,0.40)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    statusDot: {},

    activeDot: {
      backgroundColor:
        COLORS.green,
    },

    inactiveDot: {
      backgroundColor:
        COLORS.redBright,
    },

    statusText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    activeText: {
      color:
        COLORS.green,
    },

    inactiveText: {
      color:
        COLORS.redBright,
    },

    // ========================================================
    // COLUMNS
    // ========================================================

    columns: {
      flexDirection:
        'row',
    },

    column: {
      flex:
        1,
    },

    // ========================================================
    // SECTION CARD
    // ========================================================

    sectionCard: {
      overflow:
        'hidden',

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

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.border,

      backgroundColor:
        'rgba(12,20,40,0.94)',
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
    // INFO
    // ========================================================

    infoRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',

      borderBottomWidth:
        1,

      borderBottomColor:
        'rgba(36,53,84,0.70)',
    },

    infoRowLast: {
      borderBottomWidth:
        0,
    },

    infoLabel: {
      width:
        '38%',

      color:
        COLORS.muted,

      fontFamily:
        'Inter_600SemiBold',
    },

    infoValue: {
      flex:
        1,

      color:
        COLORS.white,

      fontFamily:
        'Inter_500Medium',

      textAlign:
        'right',
    },

    infoValueMono: {
      fontFamily:
        'Inter_400Regular',
    },

    // ========================================================
    // MESSAGES
    // ========================================================

    successCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        'rgba(53,201,130,0.40)',

      backgroundColor:
        'rgba(53,201,130,0.08)',
    },

    successCardText: {
      flex:
        1,

      color:
        COLORS.green,

      fontFamily:
        'Inter_500Medium',
    },

    errorCard: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.55)',

      backgroundColor:
        'rgba(80,16,30,0.55)',
    },

    errorText: {
      flex:
        1,

      color:
        '#FFB8BE',

      fontFamily:
        'Inter_500Medium',
    },

    // ========================================================
    // LOADING
    // ========================================================

    loadingArea: {
      alignItems:
        'center',

      justifyContent:
        'center',
    },

    loadingText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    errorState: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    errorStateTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    errorStateText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    // ========================================================
    // MODAL
    // ========================================================

    modalOverlay: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.overlay,
    },

    modalCard: {
      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          12,
      },

      shadowOpacity:
        0.4,

      shadowRadius:
        28,

      elevation:
        20,
    },

    modalIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    modalIconDanger: {
      borderColor:
        'rgba(239,51,64,0.35)',

      backgroundColor:
        'rgba(239,51,64,0.10)',
    },

    modalIconSuccess: {
      borderColor:
        'rgba(53,201,130,0.35)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    modalTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      textAlign:
        'center',
    },

    modalMessage: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    modalUserCard: {
      width:
        '100%',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    modalUserName: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      textAlign:
        'center',
    },

    modalUserEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    modalButtons: {
      width:
        '100%',

      flexDirection:
        'row',
    },

    cancelButton: {
      flex:
        1,

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

    cancelButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    confirmButton: {
      flex:
        1,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    confirmActivateButton: {
      backgroundColor:
        '#178F59',
    },

    confirmButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // DELETE MODAL
    // ========================================================

    deleteModalCard: {
      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.42)',

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOffset: {
        width:
          0,

        height:
          12,
      },

      shadowOpacity:
        0.45,

      shadowRadius:
        30,

      elevation:
        22,
    },

    deleteModalIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,

      borderColor:
        'rgba(239,51,64,0.40)',

      backgroundColor:
        'rgba(239,51,64,0.11)',
    },

    deleteModalTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      textAlign:
        'center',
    },

    deleteModalMessage: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    deleteUserCard: {
      width:
        '100%',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    deleteUserName: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      textAlign:
        'center',
    },

    deleteUserEmail: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    deleteWarning: {
      width:
        '100%',

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap:
        8,

      borderWidth:
        1,

      borderColor:
        'rgba(243,163,74,0.35)',

      backgroundColor:
        'rgba(243,163,74,0.07)',
    },

    deleteWarningText: {
      flex:
        1,

      color:
        '#E8C79F',

      fontFamily:
        'Inter_400Regular',
    },

    deleteInput: {
      width:
        '100%',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      color:
        COLORS.white,

      backgroundColor:
        COLORS.cardLight,

      fontFamily:
        'Inter_600SemiBold',

      outlineStyle:
        'none',
    } as any,

    permanentDeleteButton: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap:
        7,

      backgroundColor:
        COLORS.red,
    },

    permanentDeleteButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    // ========================================================
    // GENERIC
    // ========================================================

    pressed: {
      opacity:
        0.75,

      transform: [
        {
          scale:
            0.985,
        },
      ],
    },

    disabled: {
      opacity:
        0.42,
    },
  });