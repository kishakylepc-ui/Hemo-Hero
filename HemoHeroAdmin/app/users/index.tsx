import {
  type ComponentProps,
  useCallback,
  useEffect,
  useMemo,
  useState,
} from 'react';

import {
  ActivityIndicator,
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
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

import AdminBottomNav from '../AdminBottomNav';
import AdminHeader from '../AdminHeader';

import {
  activateAdminUser,
  deactivateAdminUser,
  getAdminUsers,
  getAdminUserSummary,
  type AdminManagedUser,
  type AdminProfile,
  type AdminUserPagination,
  type AdminUserStatusFilter,
  type AdminUserSummary,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

const DESIGN_WIDTH =
  1366;

const DESIGN_HEIGHT =
  1024;

const PAGE_LIMIT =
  12;

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

  rowBorder:
    'rgba(36,53,84,0.78)',

  overlay:
    'rgba(0,0,0,0.76)',
};

export default function AdminUsersScreen() {
  const {
    width,
    height,
  } =
    useWindowDimensions();

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

  const fs =
    Math.max(
      tablet.scale,
      0.92
    );

  const [
    profile,
    setProfile,
  ] =
    useState<AdminProfile | null>(
      null
    );

  const [
    users,
    setUsers,
  ] =
    useState<AdminManagedUser[]>(
      []
    );

  const [
    summary,
    setSummary,
  ] =
    useState<AdminUserSummary>({
      total:
        0,

      active:
        0,

      inactive:
        0,
    });

  const [
    pagination,
    setPagination,
  ] =
    useState<AdminUserPagination>({
      page:
        1,

      limit:
        PAGE_LIMIT,

      total:
        0,

      total_pages:
        0,
    });

  const [
    page,
    setPage,
  ] =
    useState(
      1
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

  const [
    searchInput,
    setSearchInput,
  ] =
    useState(
      ''
    );

  const [
    searchFilter,
    setSearchFilter,
  ] =
    useState(
      ''
    );

  const [
    statusFilter,
    setStatusFilter,
  ] =
    useState<AdminUserStatusFilter>(
      'all'
    );

  const [
    selectedUser,
    setSelectedUser,
  ] =
    useState<AdminManagedUser | null>(
      null
    );

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

  useEffect(
    () => {
      loadUsers();
    },
    [
      page,
      searchFilter,
      statusFilter,
    ]
  );

  useFocusEffect(
    useCallback(
      () => {
        loadUsers(
          true
        );
      },
      [
        page,
        searchFilter,
        statusFilter,
      ]
    )
  );

  async function loadUsers(
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

      setProfile(
        savedProfile
      );

      const [
        summaryResult,
        usersResult,
      ] =
        await Promise.all([
          getAdminUserSummary(
            token
          ),

          getAdminUsers(
            token,
            {
              page,

              limit:
                PAGE_LIMIT,

              search:
                searchFilter ||
                undefined,

              status:
                statusFilter,
            }
          ),
        ]);

      setSummary(
        summaryResult.summary
      );

      setUsers(
        usersResult.users ||
          []
      );

      setPagination(
        usersResult.pagination
      );

      if (
        usersResult.pagination.page !==
        page
      ) {
        setPage(
          usersResult.pagination.page
        );
      }
    } catch (
      error
    ) {
      console.log(
        'ADMIN USERS ERROR:',
        error
      );

      setErrorMessage(
        error instanceof
          Error
          ? error.message
          : 'Unable to load users.'
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

  function submitSearch() {
    setSuccessMessage(
      ''
    );

    setPage(
      1
    );

    setSearchFilter(
      searchInput
        .trim()
        .toLowerCase()
    );
  }

  function clearSearch() {
    setSearchInput(
      ''
    );

    setSearchFilter(
      ''
    );

    setPage(
      1
    );
  }

  function changeStatusFilter(
    status:
      AdminUserStatusFilter
  ) {
    setSuccessMessage(
      ''
    );

    setPage(
      1
    );

    setStatusFilter(
      status
    );
  }

  function openUserDetails(
    userId:
      string
  ) {
    router.push(
      `/users/${userId}` as any
    );
  }

  function openAccountAction(
    user:
      AdminManagedUser
  ) {
    if (
      processingAction
    ) {
      return;
    }

    setSelectedUser(
      user
    );

    setActionModalVisible(
      true
    );

    setErrorMessage(
      ''
    );

    setSuccessMessage(
      ''
    );
  }

  function closeAccountAction() {
    if (
      processingAction
    ) {
      return;
    }

    setActionModalVisible(
      false
    );

    setSelectedUser(
      null
    );
  }

  async function confirmAccountAction() {
    if (
      !selectedUser ||
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

      let result;

      if (
        selectedUser.is_active
      ) {
        result =
          await deactivateAdminUser(
            token,
            selectedUser.id
          );
      } else {
        result =
          await activateAdminUser(
            token,
            selectedUser.id
          );
      }

      setSuccessMessage(
        result.message ||
        (
          selectedUser.is_active
            ? 'User account deactivated successfully.'
            : 'User account activated successfully.'
        )
      );

      setActionModalVisible(
        false
      );

      setSelectedUser(
        null
      );

      await loadUsers(
        true
      );
    } catch (
      error
    ) {
      console.log(
        'ADMIN USER ACCOUNT ACTION ERROR:',
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

      setSelectedUser(
        null
      );
    } finally {
      setProcessingAction(
        false
      );
    }
  }

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
            <AdminHeader
              profile={
                profile
              }
              scale={
                s
              }
              fontScale={
                fs
              }
              notificationCount={
                0
              }
            />

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
                    32 * s,

                  paddingBottom:
                    32 * s,
                },
              ]}
              showsVerticalScrollIndicator={
                false
              }
            >
              <View
                style={[
                  styles.titleRow,

                  {
                    marginBottom:
                      24 * s,
                  },
                ]}
              >
                <View>
                  <Text
                    style={[
                      styles.title,

                      {
                        fontSize:
                          30 * fs,

                        lineHeight:
                          38 * fs,
                      },
                    ]}
                  >
                    User Management
                  </Text>

                  <Text
                    style={[
                      styles.subtitle,

                      {
                        fontSize:
                          14 * fs,

                        marginTop:
                          4 * s,
                      },
                    ]}
                  >
                    View and manage registered Hemo-Hero user accounts.
                  </Text>
                </View>

                <View
                  style={[
                    styles.titleActions,

                    {
                      gap:
                        10 * s,
                    },
                  ]}
                >
                  <Pressable
                    onPress={() =>
                      router.push(
                        '/users/create' as any
                      )
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.createUserButton,

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
                    ]}
                  >
                    <MaterialIcons
                      name="person-add"
                      size={
                        20 * s
                      }
                      color={
                        COLORS.white
                      }
                    />

                    <Text
                      style={[
                        styles.createUserButtonText,

                        {
                          fontSize:
                            13 * fs,
                        },
                      ]}
                    >
                      Create User
                    </Text>
                  </Pressable>

                  <Pressable
                    disabled={
                      refreshing
                    }
                    onPress={() =>
                      loadUsers(
                        true
                      )
                    }
                    style={({
                      pressed,
                    }) => [
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
                                13 * fs,
                            },
                          ]}
                        >
                          Refresh
                        </Text>
                      </>
                    )}
                  </Pressable>
                </View>
              </View>

              <View
                style={[
                  styles.summaryRow,

                  {
                    gap:
                      16 * s,

                    marginBottom:
                      20 * s,
                  },
                ]}
              >
                <SummaryCard
                  scale={
                    s
                  }
                  title="TOTAL USERS"
                  value={
                    summary.total
                  }
                  icon="people"
                  color={
                    COLORS.blue
                  }
                />

                <SummaryCard
                  scale={
                    s
                  }
                  title="ACTIVE USERS"
                  value={
                    summary.active
                  }
                  icon="check-circle"
                  color={
                    COLORS.green
                  }
                />

                <SummaryCard
                  scale={
                    s
                  }
                  title="INACTIVE USERS"
                  value={
                    summary.inactive
                  }
                  icon="person-off"
                  color={
                    COLORS.redBright
                  }
                />
              </View>

              <View
                style={[
                  styles.filterCard,

                  {
                    padding:
                      18 * s,

                    borderRadius:
                      14 * s,

                    marginBottom:
                      18 * s,
                  },
                ]}
              >
                <View
                  style={[
                    styles.searchRow,

                    {
                      gap:
                        10 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.searchInputContainer,

                      {
                        height:
                          45 * s,

                        borderRadius:
                          10 * s,

                        paddingHorizontal:
                          14 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="search"
                      size={
                        20 * s
                      }
                      color={
                        COLORS.muted
                      }
                    />

                    <TextInput
                      value={
                        searchInput
                      }
                      onChangeText={
                        setSearchInput
                      }
                      onSubmitEditing={
                        submitSearch
                      }
                      placeholder="Search by name or email"
                      placeholderTextColor={
                        COLORS.muted
                      }
                      autoCapitalize="none"
                      autoCorrect={
                        false
                      }
                      style={[
                        styles.searchInput,

                        {
                          fontSize:
                            13 * fs,
                        },
                      ]}
                    />

                    {searchInput ? (
                      <Pressable
                        onPress={
                          clearSearch
                        }
                      >
                        <MaterialIcons
                          name="close"
                          size={
                            19 * s
                          }
                          color={
                            COLORS.muted
                          }
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={
                      submitSearch
                    }
                    style={({
                      pressed,
                    }) => [
                      styles.searchButton,

                      {
                        height:
                          45 * s,

                        paddingHorizontal:
                          22 * s,

                        borderRadius:
                          10 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.searchButtonText,

                        {
                          fontSize:
                            13 * fs,
                        },
                      ]}
                    >
                      Search
                    </Text>
                  </Pressable>
                </View>

                <View
                  style={[
                    styles.filterSection,

                    {
                      marginTop:
                        15 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.filterLabel,

                      {
                        fontSize:
                          11 * fs,

                        marginRight:
                          10 * s,
                      },
                    ]}
                  >
                    STATUS
                  </Text>

                  <FilterChip
                    scale={
                      s
                    }
                    label="All"
                    selected={
                      statusFilter ===
                      'all'
                    }
                    onPress={() =>
                      changeStatusFilter(
                        'all'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Active"
                    selected={
                      statusFilter ===
                      'active'
                    }
                    onPress={() =>
                      changeStatusFilter(
                        'active'
                      )
                    }
                  />

                  <FilterChip
                    scale={
                      s
                    }
                    label="Inactive"
                    selected={
                      statusFilter ===
                      'inactive'
                    }
                    onPress={() =>
                      changeStatusFilter(
                        'inactive'
                      )
                    }
                  />
                </View>
              </View>

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
                          12 * fs,
                      },
                    ]}
                  >
                    {
                      successMessage
                    }
                  </Text>
                </View>
              ) : null}

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
                          12 * fs,
                      },
                    ]}
                  >
                    {
                      errorMessage
                    }
                  </Text>
                </View>
              ) : null}

              <View
                style={[
                  styles.tableCard,

                  {
                    borderRadius:
                      14 * s,
                  },
                ]}
              >
                <View
                  style={[
                    styles.tableHeader,

                    {
                      minHeight:
                        54 * s,

                      paddingHorizontal:
                        18 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colUser,

                      {
                        fontSize:
                          11 * fs,
                      },
                    ]}
                  >
                    USER
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colContact,

                      {
                        fontSize:
                          11 * fs,
                      },
                    ]}
                  >
                    CONTACT
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colDonor,

                      {
                        fontSize:
                          11 * fs,
                      },
                    ]}
                  >
                    DONOR STATUS
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colJoined,

                      {
                        fontSize:
                          11 * fs,
                      },
                    ]}
                  >
                    JOINED
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colStatus,

                      {
                        fontSize:
                          11 * fs,
                      },
                    ]}
                  >
                    ACCOUNT
                  </Text>

                  <Text
                    style={[
                      styles.tableHeaderText,
                      styles.colAction,

                      {
                        fontSize:
                          11 * fs,
                      },
                    ]}
                  >
                    ACTION
                  </Text>
                </View>

                {loading ? (
                  <View
                    style={[
                      styles.loadingArea,

                      {
                        minHeight:
                          360 * s,
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
                            13 * fs,

                          marginTop:
                            12 * s,
                        },
                      ]}
                    >
                      Loading registered users...
                    </Text>
                  </View>
                ) : users.length ===
                  0 ? (
                  <View
                    style={[
                      styles.emptyArea,

                      {
                        minHeight:
                          340 * s,
                      },
                    ]}
                  >
                    <View
                      style={[
                        styles.emptyIcon,

                        {
                          width:
                            68 * s,

                          height:
                            68 * s,

                          borderRadius:
                            34 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="people-outline"
                        size={
                          34 * s
                        }
                        color={
                          COLORS.muted
                        }
                      />
                    </View>

                    <Text
                      style={[
                        styles.emptyTitle,

                        {
                          fontSize:
                            18 * fs,

                          marginTop:
                            14 * s,
                        },
                      ]}
                    >
                      No users found
                    </Text>

                    <Text
                      style={[
                        styles.emptyText,

                        {
                          fontSize:
                            13 * fs,

                          marginTop:
                            5 * s,
                        },
                      ]}
                    >
                      Try changing your search or account status filter.
                    </Text>
                  </View>
                ) : (
                  users.map(
                    user => (
                      <UserRow
                        key={
                          user.id
                        }
                        user={
                          user
                        }
                        scale={
                          s
                        }
                        onOpen={() =>
                          openUserDetails(
                            user.id
                          )
                        }
                        onAction={() =>
                          openAccountAction(
                            user
                          )
                        }
                      />
                    )
                  )
                )}
              </View>

              {!loading &&
              pagination.total >
                0 ? (
                <View
                  style={[
                    styles.pagination,

                    {
                      marginTop:
                        17 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.paginationText,

                      {
                        fontSize:
                          11.5 * fs,
                      },
                    ]}
                  >
                    Showing page{' '}
                    {
                      pagination.page
                    }{' '}
                    of{' '}
                    {
                      Math.max(
                        pagination.total_pages,
                        1
                      )
                    }{' '}
                    •{' '}
                    {
                      pagination.total
                    }{' '}
                    total users
                  </Text>

                  <View
                    style={[
                      styles.paginationButtons,

                      {
                        gap:
                          8 * s,
                      },
                    ]}
                  >
                    <Pressable
                      disabled={
                        page <=
                        1
                      }
                      onPress={() =>
                        setPage(
                          current =>
                            Math.max(
                              current -
                                1,
                              1
                            )
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.pageButton,

                        {
                          height:
                            39 * s,

                          paddingHorizontal:
                            14 * s,

                          borderRadius:
                            9 * s,
                        },

                        pressed &&
                          styles.pressed,

                        page <=
                          1 &&
                          styles.disabled,
                      ]}
                    >
                      <MaterialIcons
                        name="chevron-left"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={[
                          styles.pageButtonText,

                          {
                            fontSize:
                              12 * fs,
                          },
                        ]}
                      >
                        Previous
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={
                        pagination.total_pages ===
                          0 ||
                        page >=
                          pagination.total_pages
                      }
                      onPress={() =>
                        setPage(
                          current =>
                            current +
                            1
                        )
                      }
                      style={({
                        pressed,
                      }) => [
                        styles.pageButton,

                        {
                          height:
                            39 * s,

                          paddingHorizontal:
                            14 * s,

                          borderRadius:
                            9 * s,
                        },

                        pressed &&
                          styles.pressed,

                        (
                          pagination.total_pages ===
                            0 ||
                          page >=
                            pagination.total_pages
                        ) &&
                          styles.disabled,
                      ]}
                    >
                      <Text
                        style={[
                          styles.pageButtonText,

                          {
                            fontSize:
                              12 * fs,
                          },
                        ]}
                      >
                        Next
                      </Text>

                      <MaterialIcons
                        name="chevron-right"
                        size={
                          19 * s
                        }
                        color={
                          COLORS.white
                        }
                      />
                    </Pressable>
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <AdminBottomNav
              activeTab="users"
            />
          </SafeAreaView>
        </LinearGradient>

        <Modal
          visible={
            actionModalVisible
          }
          transparent
          animationType="fade"
          statusBarTranslucent
          onRequestClose={
            closeAccountAction
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
                closeAccountAction
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

                  selectedUser?.is_active
                    ? styles.modalIconDanger
                    : styles.modalIconSuccess,
                ]}
              >
                <MaterialIcons
                  name={
                    selectedUser?.is_active
                      ? 'person-off'
                      : 'person-add'
                  }
                  size={
                    28 * s
                  }
                  color={
                    selectedUser?.is_active
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
                      20 * fs,

                    marginTop:
                      18 * s,
                  },
                ]}
              >
                {selectedUser?.is_active
                  ? 'Deactivate User?'
                  : 'Activate User?'}
              </Text>

              <Text
                style={[
                  styles.modalMessage,

                  {
                    fontSize:
                      14 * fs,

                    lineHeight:
                      22 * fs,

                    marginTop:
                      9 * s,
                  },
                ]}
              >
                {selectedUser?.is_active
                  ? 'This user will no longer be able to use authenticated Hemo-Hero features until the account is activated again.'
                  : 'This user will regain access to authenticated Hemo-Hero features.'}
              </Text>

              {selectedUser ? (
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
                          13 * fs,
                      },
                    ]}
                  >
                    {
                      getUserDisplayName(
                        selectedUser
                      )
                    }
                  </Text>

                  <Text
                    style={[
                      styles.modalUserEmail,

                      {
                        fontSize:
                          12 * fs,

                        marginTop:
                          3 * s,
                      },
                    ]}
                  >
                    {selectedUser.email ||
                      'No email available'}
                  </Text>
                </View>
              ) : null}

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
                    closeAccountAction
                  }
                  style={({
                    pressed,
                  }) => [
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
                          13 * fs,
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
                  style={({
                    pressed,
                  }) => [
                    styles.confirmButton,

                    !selectedUser?.is_active &&
                      styles.activateConfirmButton,

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
                            13 * fs,
                        },
                      ]}
                    >
                      {selectedUser?.is_active
                        ? 'Deactivate'
                        : 'Activate'}
                    </Text>
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

function SummaryCard({
  scale,
  title,
  value,
  icon,
  color,
}: {
  scale:
    number;

  title:
    string;

  value:
    number;

  icon:
    ComponentProps<
      typeof MaterialIcons
    >['name'];

  color:
    string;
}) {
  const fontScale =
    Math.max(
      scale,
      0.92
    );

  return (
    <View
      style={[
        styles.summaryCard,

        {
          minHeight:
            112 * scale,

          padding:
            18 * scale,

          borderRadius:
            14 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,

          {
            width:
              42 * scale,

            height:
              42 * scale,

            borderRadius:
              11 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={
            icon
          }
          size={
            23 * scale
          }
          color={
            color
          }
        />
      </View>

      <View
        style={
          styles.summaryContent
        }
      >
        <Text
          style={[
            styles.summaryTitle,

            {
              fontSize:
                11 * fontScale,
            },
          ]}
        >
          {
            title
          }
        </Text>

        <Text
          style={[
            styles.summaryValue,

            {
              fontSize:
                28 * fontScale,
            },
          ]}
        >
          {
            value
          }
        </Text>
      </View>
    </View>
  );
}

function FilterChip({
  scale,
  label,
  selected,
  onPress,
}: {
  scale:
    number;

  label:
    string;

  selected:
    boolean;

  onPress:
    () => void;
}) {
  const fontScale =
    Math.max(
      scale,
      0.92
    );

  return (
    <Pressable
      onPress={
        onPress
      }
      style={({
        pressed,
      }) => [
        styles.filterChip,

        {
          minHeight:
            32 * scale,

          paddingHorizontal:
            13 * scale,

          borderRadius:
            8 * scale,
        },

        selected &&
          styles.filterChipSelected,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterChipText,

          {
            fontSize:
              12 * fontScale,
          },

          selected &&
            styles.filterChipTextSelected,
        ]}
      >
        {
          label
        }
      </Text>
    </Pressable>
  );
}

function UserRow({
  user,
  scale,
  onOpen,
  onAction,
}: {
  user:
    AdminManagedUser;

  scale:
    number;

  onOpen:
    () => void;

  onAction:
    () => void;
}) {
  const fontScale =
    Math.max(
      scale,
      0.92
    );

  const name =
    getUserDisplayName(
      user
    );

  const initials =
    getInitials(
      user
    );

  const donorLabel =
    getDonorLabel(
      user
    );

  return (
    <Pressable
      onPress={
        onOpen
      }
      style={({
        pressed,
      }) => [
        styles.tableRow,

        {
          minHeight:
            78 * scale,

          paddingHorizontal:
            18 * scale,

          paddingVertical:
            10 * scale,
        },

        pressed &&
          styles.tableRowPressed,
      ]}
    >
      <View
        style={[
          styles.colUser,
          styles.userCell,
        ]}
      >
        <View
          style={[
            styles.userAvatar,

            {
              width:
                38 * scale,

              height:
                38 * scale,

              borderRadius:
                19 * scale,

              marginRight:
                10 * scale,
            },
          ]}
        >
          <Text
            style={[
              styles.userAvatarText,

              {
                fontSize:
                  12 * fontScale,
              },
            ]}
          >
            {
              initials
            }
          </Text>
        </View>

        <View
          style={
            styles.userTextWrap
          }
        >
          <Text
            numberOfLines={
              1
            }
            style={[
              styles.rowPrimary,

              {
                fontSize:
                  12.5 * fontScale,
              },
            ]}
          >
            {
              name
            }
          </Text>

          <Text
            numberOfLines={
              1
            }
            style={[
              styles.rowSecondary,

              {
                fontSize:
                  11.5 * fontScale,

                marginTop:
                  2 * scale,
              },
            ]}
          >
            {user.email ||
              'No email'}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.colContact
        }
      >
        <Text
          numberOfLines={
            1
          }
          style={[
            styles.rowPrimary,

            {
              fontSize:
                12.5 * fontScale,
            },
          ]}
        >
          {user.phone ||
            'No phone'}
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={[
            styles.rowSecondary,

            {
              fontSize:
                11.5 * fontScale,

              marginTop:
                2 * scale,
            },
          ]}
        >
          {
            formatLocation(
              user
            )
          }
        </Text>
      </View>

      <View
        style={
          styles.colDonor
        }
      >
        <View
          style={[
            styles.donorBadge,

            {
              minHeight:
                28 * scale,

              paddingHorizontal:
                9 * scale,

              borderRadius:
                6 * scale,
            },

            user.donor?.status ===
              'approved'
              ? styles.donorApproved
              : user.donor
                ? styles.donorPending
                : styles.donorNone,
          ]}
        >
          <Text
            style={[
              styles.donorText,

              {
                fontSize:
                  11.5 * fontScale,
              },

              user.donor?.status ===
                'approved'
                ? styles.donorApprovedText
                : user.donor
                  ? styles.donorPendingText
                  : styles.donorNoneText,
            ]}
          >
            {
              donorLabel
            }
          </Text>
        </View>

        {user.donor?.blood_type ? (
          <Text
            style={[
              styles.rowSecondary,

              {
                fontSize:
                  11 * fontScale,

                marginTop:
                  3 * scale,
              },
            ]}
          >
            Blood type:{' '}
            {
              user.donor.blood_type
            }
          </Text>
        ) : null}
      </View>

      <View
        style={
          styles.colJoined
        }
      >
        <Text
          style={[
            styles.rowPrimary,

            {
              fontSize:
                12.5 * fontScale,
            },
          ]}
        >
          {
            formatDate(
              user.created_at
            )
          }
        </Text>
      </View>

      <View
        style={
          styles.colStatus
        }
      >
        <View
          style={[
            styles.accountBadge,

            {
              minHeight:
                28 * scale,

              paddingHorizontal:
                9 * scale,

              borderRadius:
                14 * scale,
            },

            user.is_active
              ? styles.activeBadge
              : styles.inactiveBadge,
          ]}
        >
          <View
            style={[
              styles.accountDot,

              {
                width:
                  6 * scale,

                height:
                  6 * scale,

                borderRadius:
                  3 * scale,
              },

              user.is_active
                ? styles.activeDot
                : styles.inactiveDot,
            ]}
          />

          <Text
            style={[
              styles.accountStatusText,

              {
                fontSize:
                  11.5 * fontScale,
              },

              user.is_active
                ? styles.activeText
                : styles.inactiveText,
            ]}
          >
            {user.is_active
              ? 'Active'
              : 'Inactive'}
          </Text>
        </View>
      </View>

      <View
        style={
          styles.colAction
        }
      >
        <Pressable
          onPress={
            event => {
              event.stopPropagation();

              onAction();
            }
          }
          style={({
            pressed,
          }) => [
            styles.actionButton,

            {
              height:
                34 * scale,

              minWidth:
                90 * scale,

              paddingHorizontal:
                11 * scale,

              borderRadius:
                8 * scale,
            },

            user.is_active
              ? styles.deactivateButton
              : styles.activateButton,

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.actionButtonText,

              {
                fontSize:
                  11.5 * fontScale,
              },

              user.is_active
                ? styles.deactivateButtonText
                : styles.activateButtonText,
            ]}
          >
            {user.is_active
              ? 'Deactivate'
              : 'Activate'}
          </Text>
        </Pressable>

        <MaterialIcons
          name="chevron-right"
          size={
            19 * scale
          }
          color={
            COLORS.muted
          }
          style={{
            marginLeft:
              8 * scale,
          }}
        />
      </View>
    </Pressable>
  );
}

function getUserDisplayName(
  user:
    AdminManagedUser
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
  user:
    AdminManagedUser
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

  const combined =
    `${first}${last}`
      .toUpperCase();

  if (
    combined
  ) {
    return combined;
  }

  return (
    user.email
      ?.charAt(
        0
      )
      .toUpperCase() ||
    'U'
  );
}

function formatLocation(
  user:
    AdminManagedUser
) {
  return (
    [
      user.city,
      user.province,
    ]
      .filter(
        Boolean
      )
      .join(', ') ||
    'Location unavailable'
  );
}

function getDonorLabel(
  user:
    AdminManagedUser
) {
  if (
    !user.donor
  ) {
    return 'Not Donor';
  }

  const status =
    String(
      user.donor.status ||
      ''
    )
      .toLowerCase();

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
    return 'Pending';
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

  return 'Donor';
}

function formatDate(
  value?:
    string |
    null
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

  return date
    .toLocaleDateString(
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

    titleRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
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

    titleActions: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    createUserButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    createUserButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
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

    summaryRow: {
      flexDirection:
        'row',
    },

    summaryCard: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    summaryIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    summaryContent: {
      marginLeft:
        14,

      flex:
        1,
    },

    summaryTitle: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.4,
    },

    summaryValue: {
      marginTop:
        1,

      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',
    },

    filterCard: {
      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    searchRow: {
      flexDirection:
        'row',

      alignItems:
        'center',
    },

    searchInputContainer: {
      flex:
        1,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap:
        9,

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    searchInput: {
      flex:
        1,

      height:
        '100%',

      paddingVertical:
        0,

      color:
        COLORS.white,

      fontFamily:
        'Inter_400Regular',

      outlineStyle:
        'none',
    } as any,

    searchButton: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.red,
    },

    searchButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterSection: {
      flexDirection:
        'row',

      alignItems:
        'center',

      flexWrap:
        'wrap',

      gap:
        7,
    },

    filterLabel: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_700Bold',

      letterSpacing:
        0.6,
    },

    filterChip: {
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

    filterChipSelected: {
      borderColor:
        COLORS.redBright,

      backgroundColor:
        'rgba(219,10,10,0.15)',
    },

    filterChipText: {
      color:
        COLORS.soft,

      fontFamily:
        'Inter_600SemiBold',
    },

    filterChipTextSelected: {
      color:
        COLORS.white,
    },

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

    tableCard: {
      overflow:
        'hidden',

      borderWidth:
        1,

      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.card,
    },

    tableHeader: {
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

    tableHeaderText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      letterSpacing:
        0.45,
    },

    tableRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      borderBottomWidth:
        1,

      borderBottomColor:
        COLORS.rowBorder,
    },

    tableRowPressed: {
      backgroundColor:
        'rgba(255,255,255,0.025)',
    },

    colUser: {
      width:
        '26%',
    },

    colContact: {
      width:
        '18%',
    },

    colDonor: {
      width:
        '17%',
    },

    colJoined: {
      width:
        '13%',
    },

    colStatus: {
      width:
        '13%',
    },

    colAction: {
      width:
        '13%',

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'flex-start',
    },

    userCell: {
      flexDirection:
        'row',

      alignItems:
        'center',
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

    userTextWrap: {
      flex:
        1,

      minWidth:
        0,

      paddingRight:
        10,
    },

    rowPrimary: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

    rowSecondary: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    donorBadge: {
      alignSelf:
        'flex-start',

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth:
        1,
    },

    donorText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    donorApproved: {
      borderColor:
        'rgba(53,201,130,0.40)',

      backgroundColor:
        'rgba(53,201,130,0.10)',
    },

    donorApprovedText: {
      color:
        COLORS.green,
    },

    donorPending: {
      borderColor:
        'rgba(243,163,74,0.40)',

      backgroundColor:
        'rgba(243,163,74,0.10)',
    },

    donorPendingText: {
      color:
        COLORS.orange,
    },

    donorNone: {
      borderColor:
        COLORS.border,

      backgroundColor:
        COLORS.cardLight,
    },

    donorNoneText: {
      color:
        COLORS.muted,
    },

    accountBadge: {
      alignSelf:
        'flex-start',

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

    accountDot: {},

    activeDot: {
      backgroundColor:
        COLORS.green,
    },

    inactiveDot: {
      backgroundColor:
        COLORS.redBright,
    },

    accountStatusText: {
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

    actionButton: {
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

    actionButtonText: {
      fontFamily:
        'Inter_600SemiBold',
    },

    deactivateButtonText: {
      color:
        COLORS.redBright,
    },

    activateButtonText: {
      color:
        COLORS.green,
    },

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

    emptyArea: {
      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        30,
    },

    emptyIcon: {
      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.cardLight,
    },

    emptyTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_600SemiBold',
    },

    emptyText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      textAlign:
        'center',
    },

    pagination: {
      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'space-between',
    },

    paginationText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',
    },

    paginationButtons: {
      flexDirection:
        'row',
    },

    pageButton: {
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

    pageButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

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

    activateConfirmButton: {
      backgroundColor:
        '#178F59',
    },

    confirmButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',
    },

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