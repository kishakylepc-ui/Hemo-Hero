import {
  type ComponentProps,
  useCallback,
  useRef,
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
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminCanvas } from '../../components/AdminCanvas';

import AdminBottomNav from '../../components/AdminBottomNav';
import AdminHeader from '../../components/AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  activateAdminUser,
  deactivateAdminUser,
  getAdminUsers,
  getAdminUserSummary,
  isUserLocked,
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

import { isAdminRole, isSuperAdmin } from '../../lib/roles';

// ============================================================
// DESIGN
//
// Layout follows the Donor Applications list for a consistent
// Admin UI.
// ============================================================

const PAGE_LIMIT = 12;

const COLORS = {
  outer: '#02040A',
  navy: '#050B19',

  card: '#091126',
  cardLight: '#101A35',

  border: '#243554',

  red: '#DB0A0A',
  redBright: '#EF3340',
  redDark: '#8E1118',

  white: '#FFFFFF',

  muted: '#7F889F',
  soft: '#B7C1D8',

  green: '#35C982',
  orange: '#F3A34A',

  rowBorder: 'rgba(36,53,84,0.78)',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// SCREEN
// ============================================================

export default function AdminUsersScreen() {

  // ==========================================================
  // RESPONSIVE IPAD FRAME
  // ==========================================================

  const tablet = useAdminCanvas();

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [users, setUsers] =
    useState<AdminManagedUser[]>([]);

  const [summary, setSummary] =
    useState<AdminUserSummary>({
      total: 0,
      active: 0,
      inactive: 0,
    });

  const [pagination, setPagination] =
    useState<AdminUserPagination>({
      page: 1,
      limit: PAGE_LIMIT,
      total: 0,
      total_pages: 0,
    });

  const [page, setPage] = useState(1);

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const [searchInput, setSearchInput] = useState('');
  const [searchFilter, setSearchFilter] = useState('');

  const [statusFilter, setStatusFilter] =
    useState<AdminUserStatusFilter>('all');

  // Super admin: list admin accounts instead of users.
  const [showAdmins, setShowAdmins] =
    useState(false);

  const [selectedUser, setSelectedUser] =
    useState<AdminManagedUser | null>(null);

  const [actionModalVisible, setActionModalVisible] =
    useState(false);

  const [processingAction, setProcessingAction] =
    useState(false);

  const hasLoadedOnce = useRef(false);

  // ==========================================================
  // LOAD
  //
  // useFocusEffect alone covers the first load, filter/page
  // changes, and returning from create/details/edit screens.
  // ==========================================================

  useFocusEffect(
    useCallback(() => {
      loadUsers();
    }, [
      page,
      searchFilter,
      statusFilter,
      showAdmins,
    ])
  );

  async function loadUsers() {
    try {
      if (hasLoadedOnce.current) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      setErrorMessage('');

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      if (
        !token ||
        !isAdminRole(savedProfile?.role)
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(savedProfile);

      const [
        summaryResult,
        usersResult,
      ] = await Promise.all([
        getAdminUserSummary(token),

        getAdminUsers(token, {
          page,
          limit: PAGE_LIMIT,
          search: searchFilter || undefined,
          status: showAdmins
            ? 'all'
            : statusFilter,
          role: showAdmins
            ? 'admin'
            : 'user',
        }),
      ]);

      setSummary(summaryResult.summary);

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

      hasLoadedOnce.current = true;
    } catch (error) {
      console.log(
        'ADMIN USERS ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load users.'
      );
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }

  // ==========================================================
  // FILTERS
  // ==========================================================

  function submitSearch() {
    setSuccessMessage('');
    setPage(1);

    setSearchFilter(
      searchInput
        .trim()
        .toLowerCase()
    );
  }

  function clearSearch() {
    setSearchInput('');
    setSearchFilter('');
    setPage(1);
  }

  function changeStatusFilter(
    status: AdminUserStatusFilter
  ) {
    setSuccessMessage('');
    setPage(1);
    setShowAdmins(false);
    setStatusFilter(status);
  }

  function showAdminAccounts() {
    setSuccessMessage('');
    setPage(1);
    setShowAdmins(true);
  }

  function openUserDetails(
    userId: string
  ) {
    router.push(
      `/users/${userId}` as any
    );
  }

  // ==========================================================
  // ACTIVATE / DEACTIVATE
  // ==========================================================

  function openAccountAction(
    user: AdminManagedUser
  ) {
    if (processingAction) {
      return;
    }

    setSelectedUser(user);
    setActionModalVisible(true);
    setErrorMessage('');
    setSuccessMessage('');
  }

  function closeAccountAction() {
    if (processingAction) {
      return;
    }

    setActionModalVisible(false);
    setSelectedUser(null);
  }

  async function confirmAccountAction() {
    if (
      !selectedUser ||
      processingAction
    ) {
      return;
    }

    try {
      setProcessingAction(true);
      setErrorMessage('');
      setSuccessMessage('');

      const token =
        await getAdminAccessToken();

      if (!token) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      const result =
        selectedUser.is_active
          ? await deactivateAdminUser(
              token,
              selectedUser.id
            )
          : await activateAdminUser(
              token,
              selectedUser.id
            );

      setSuccessMessage(
        result.message ||
          (selectedUser.is_active
            ? 'User account deactivated successfully.'
            : 'User account activated successfully.')
      );

      setActionModalVisible(false);
      setSelectedUser(null);

      await loadUsers();
    } catch (error) {
      console.log(
        'ADMIN USER ACCOUNT ACTION ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update user account.'
      );

      setActionModalVisible(false);
      setSelectedUser(null);
    } finally {
      setProcessingAction(false);
    }
  }

  const hasFilters =
    Boolean(searchFilter) ||
    statusFilter !== 'all';

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

            <ScrollView
              style={styles.scroll}
              contentContainerStyle={[
                styles.content,

                {
                  paddingHorizontal: 48 * s,
                  paddingVertical: 32 * s,
                },
              ]}
              showsVerticalScrollIndicator={false}
            >
              {/* ================================================
                  TITLE
              ================================================ */}

              <FadeInView>
                <View
                  style={[
                    styles.titleRow,

                    {
                      marginBottom: 24 * s,
                    },
                  ]}
                >
                  <View style={styles.flexFill}>
                    <Text
                      style={[
                        styles.title,

                        {
                          fontSize: 30 * fs,
                          lineHeight: 38 * fs,
                        },
                      ]}
                    >
                      User Management
                    </Text>

                    <Text
                      style={[
                        styles.subtitle,

                        {
                          fontSize: 13.5 * fs,
                          marginTop: 4 * s,
                        },
                      ]}
                    >
                      View and manage registered Hemo-Hero user accounts.
                    </Text>
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
                    <Pressable
                      onPress={() =>
                        router.push(
                          '/users/create' as any
                        )
                      }
                      style={({ pressed }) => [
                        styles.primaryButton,

                        {
                          height: 44 * s,
                          paddingHorizontal: 18 * s,
                          borderRadius: 10 * s,
                          gap: 8 * s,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <MaterialIcons
                        name="person-add"
                        size={20 * s}
                        color={COLORS.white}
                      />

                      <Text
                        style={[
                          styles.primaryButtonText,

                          {
                            fontSize: 13 * fs,
                          },
                        ]}
                      >
                        Create User
                      </Text>
                    </Pressable>

                    <Pressable
                      disabled={loading || refreshing}
                      onPress={loadUsers}
                      style={({ pressed }) => [
                        styles.refreshButton,

                        {
                          height: 44 * s,
                          minWidth: 116 * s,
                          paddingHorizontal: 16 * s,
                          borderRadius: 10 * s,
                          gap: 8 * s,
                        },

                        pressed &&
                          styles.pressed,

                        (loading || refreshing) &&
                          styles.disabled,
                      ]}
                    >
                      {refreshing ? (
                        <ActivityIndicator
                          size="small"
                          color={COLORS.white}
                        />
                      ) : (
                        <>
                          <MaterialIcons
                            name="refresh"
                            size={20 * s}
                            color={COLORS.white}
                          />

                          <Text
                            style={[
                              styles.refreshText,

                              {
                                fontSize: 13 * fs,
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
              </FadeInView>

              {/* ================================================
                  FILTERS + SEARCH
              ================================================ */}

              <FadeInView delay={50}>
                <View
                  style={[
                    styles.toolbar,

                    {
                      gap: 10 * s,
                      marginBottom: 20 * s,
                    },
                  ]}
                >
                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="All Users"
                    count={summary.total}
                    active={!showAdmins && statusFilter === 'all'}
                    onPress={() =>
                      changeStatusFilter('all')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Active"
                    count={summary.active}
                    active={!showAdmins && statusFilter === 'active'}
                    positive
                    onPress={() =>
                      changeStatusFilter('active')
                    }
                  />

                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Inactive"
                    count={summary.inactive}
                    active={!showAdmins && statusFilter === 'inactive'}
                    alert
                    onPress={() =>
                      changeStatusFilter('inactive')
                    }
                  />

                  {/* Locked by an admin or after wrong passwords */}
                  <FilterButton
                    scale={s}
                    fontScale={fs}
                    label="Locked"
                    count={summary.locked ?? 0}
                    active={!showAdmins && statusFilter === 'locked'}
                    warning
                    onPress={() =>
                      changeStatusFilter('locked')
                    }
                  />

                  {isSuperAdmin(profile?.role) ? (
                    <FilterButton
                      scale={s}
                      fontScale={fs}
                      label="Admins"
                      count={summary.admins ?? 0}
                      active={showAdmins}
                      onPress={showAdminAccounts}
                    />
                  ) : null}

                  <View
                    style={[
                      styles.searchInputContainer,

                      {
                        height: 44 * s,
                        borderRadius: 10 * s,
                        paddingHorizontal: 14 * s,
                        gap: 9 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="search"
                      size={20 * s}
                      color={COLORS.muted}
                    />

                    <TextInput
                      value={searchInput}
                      onChangeText={setSearchInput}
                      onSubmitEditing={submitSearch}
                      returnKeyType="search"
                      placeholder="Search by name or email"
                      placeholderTextColor={COLORS.muted}
                      autoCapitalize="none"
                      autoCorrect={false}
                      style={[
                        styles.searchInput,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    />

                    {searchInput ? (
                      <Pressable
                        onPress={clearSearch}
                        hitSlop={8}
                      >
                        <MaterialIcons
                          name="close"
                          size={19 * s}
                          color={COLORS.muted}
                        />
                      </Pressable>
                    ) : null}
                  </View>

                  <Pressable
                    onPress={submitSearch}
                    style={({ pressed }) => [
                      styles.primaryButton,

                      {
                        height: 44 * s,
                        paddingHorizontal: 20 * s,
                        borderRadius: 10 * s,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.primaryButtonText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      Search
                    </Text>
                  </Pressable>
                </View>
              </FadeInView>

              {/* ================================================
                  MESSAGES
              ================================================ */}

              {successMessage ? (
                <FadeInView>
                  <Banner
                    scale={s}
                    fontScale={fs}
                    tone="success"
                    text={successMessage}
                    onClose={() =>
                      setSuccessMessage('')
                    }
                  />
                </FadeInView>
              ) : null}

              {errorMessage && users.length > 0 ? (
                <FadeInView>
                  <Banner
                    scale={s}
                    fontScale={fs}
                    tone="error"
                    text={errorMessage}
                    onClose={() =>
                      setErrorMessage('')
                    }
                  />
                </FadeInView>
              ) : null}

              {/* ================================================
                  TABLE
              ================================================ */}

              <FadeInView delay={100}>
                <View
                  style={[
                    styles.listCard,

                    {
                      borderRadius: 14 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.tableHeader,

                      {
                        minHeight: 56 * s,
                        paddingHorizontal: 22 * s,
                      },
                    ]}
                  >
                    {(
                      [
                        ['User', styles.colUser],
                        ['Contact', styles.colContact],
                        ['Donor Status', styles.colDonor],
                        ['Joined', styles.colJoined],
                        ['Account', styles.colStatus],
                        ['Action', styles.colAction],
                      ] as [string, object][]
                    ).map(([label, colStyle]) => (
                      <Text
                        key={label}
                        style={[
                          styles.tableHeaderText,
                          colStyle,

                          {
                            fontSize: 11.5 * fs,
                          },
                        ]}
                      >
                        {label}
                      </Text>
                    ))}
                  </View>

                  {loading ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      loading
                      title=""
                      text="Loading registered users..."
                    />
                  ) : errorMessage && users.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon="error-outline"
                      iconColor={COLORS.redBright}
                      title="Unable to Load Users"
                      text={errorMessage}
                      actionLabel="Try Again"
                      onAction={loadUsers}
                    />
                  ) : users.length === 0 ? (
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon={
                        hasFilters
                          ? 'search-off'
                          : showAdmins
                            ? 'admin-panel-settings'
                            : 'people-outline'
                      }
                      title={
                        showAdmins
                          ? searchFilter
                            ? 'No Matching Admins'
                            : 'No Other Admins'
                          : hasFilters
                            ? 'No Matching Users'
                            : 'No Users Yet'
                      }
                      text={
                        showAdmins
                          ? searchFilter
                            ? 'Try a different name or email.'
                            : 'Admin accounts you create will appear here.'
                          : hasFilters
                            ? 'Try changing your search or account status filter.'
                            : 'Registered users will appear here.'
                      }
                    />
                  ) : (
                    users.map((user, index) => (
                      <FadeInView
                        key={user.id}
                        delay={Math.min(index, 8) * 30}
                        offset={6}
                      >
                        <UserRow
                          user={user}
                          scale={s}
                          fontScale={fs}
                          last={
                            index === users.length - 1
                          }
                          onOpen={() =>
                            openUserDetails(user.id)
                          }
                          onAction={() =>
                            openAccountAction(user)
                          }
                        />
                      </FadeInView>
                    ))
                  )}
                </View>
              </FadeInView>

              {/* ================================================
                  PAGINATION
              ================================================ */}

              {!loading &&
              pagination.total > 0 ? (
                <View
                  style={[
                    styles.pagination,

                    {
                      marginTop: 17 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.cellMuted,

                      {
                        fontSize: 12 * fs,
                      },
                    ]}
                  >
                    Page {pagination.page} of{' '}
                    {Math.max(pagination.total_pages, 1)} •{' '}
                    {pagination.total}{' '}
                    {pagination.total === 1
                      ? 'user'
                      : 'users'}
                  </Text>

                  <View
                    style={[
                      styles.row,

                      {
                        gap: 8 * s,
                      },
                    ]}
                  >
                    <PageButton
                      scale={s}
                      fontScale={fs}
                      label="Previous"
                      icon="chevron-left"
                      disabled={page <= 1}
                      onPress={() =>
                        setPage(current =>
                          Math.max(current - 1, 1)
                        )
                      }
                    />

                    <PageButton
                      scale={s}
                      fontScale={fs}
                      label="Next"
                      icon="chevron-right"
                      iconRight
                      disabled={
                        pagination.total_pages === 0 ||
                        page >= pagination.total_pages
                      }
                      onPress={() =>
                        setPage(current => current + 1)
                      }
                    />
                  </View>
                </View>
              ) : null}
            </ScrollView>

            <AdminBottomNav activeTab="users" />
          </SafeAreaView>
        </LinearGradient>
      </View>

      {/* ========================================================
          ACTIVATE / DEACTIVATE CONFIRMATION
      ======================================================== */}

      <Modal
        visible={actionModalVisible}
        transparent
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeAccountAction}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            disabled={processingAction}
            onPress={closeAccountAction}
          />

          <View
            style={[
              styles.modalCard,

              {
                width: 500 * s,
                maxWidth: '88%',
                padding: 26 * s,
                borderRadius: 18 * s,
                borderColor: selectedUser?.is_active
                  ? COLORS.redBright
                  : COLORS.green,
              },
            ]}
          >
            <View
              style={[
                styles.modalIcon,

                {
                  width: 56 * s,
                  height: 56 * s,
                  borderRadius: 28 * s,
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
                size={28 * s}
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
                  fontSize: 20 * fs,
                  marginTop: 17 * s,
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
                  fontSize: 14 * fs,
                  lineHeight: 22 * fs,
                  marginTop: 8 * s,
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
                    padding: 14 * s,
                    borderRadius: 11 * s,
                    marginTop: 18 * s,
                  },
                ]}
              >
                <Text
                  style={[
                    styles.modalUserName,

                    {
                      fontSize: 13.5 * fs,
                    },
                  ]}
                >
                  {getUserDisplayName(selectedUser)}
                </Text>

                <Text
                  style={[
                    styles.cellMuted,
                    styles.centerText,

                    {
                      fontSize: 12 * fs,
                      marginTop: 3 * s,
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
                  gap: 10 * s,
                  marginTop: 24 * s,
                },
              ]}
            >
              <Pressable
                disabled={processingAction}
                onPress={closeAccountAction}
                style={({ pressed }) => [
                  styles.cancelButton,

                  {
                    height: 48 * s,
                    borderRadius: 10 * s,
                  },

                  pressed &&
                    styles.pressed,
                ]}
              >
                <Text
                  style={[
                    styles.cancelButtonText,

                    {
                      fontSize: 13 * fs,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>

              <Pressable
                disabled={processingAction}
                onPress={confirmAccountAction}
                style={({ pressed }) => [
                  styles.confirmButton,

                  {
                    height: 48 * s,
                    borderRadius: 10 * s,
                    backgroundColor:
                      selectedUser?.is_active
                        ? COLORS.redDark
                        : COLORS.green,
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
                    color={COLORS.white}
                  />
                ) : (
                  <Text
                    style={[
                      styles.primaryButtonText,

                      {
                        fontSize: 13 * fs,
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
  );
}

// ============================================================
// FILTER BUTTON
// ============================================================

function FilterButton({
  scale,
  fontScale,
  label,
  count,
  active,
  alert = false,
  positive = false,
  warning = false,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  count: number;
  active: boolean;
  alert?: boolean;
  positive?: boolean;
  // Orange count (locked accounts).
  warning?: boolean;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.filterButton,

        {
          height: 44 * scale,
          paddingHorizontal: 16 * scale,
          borderRadius: 10 * scale,
          gap: 8 * scale,
        },

        active &&
          styles.filterButtonActive,

        pressed &&
          styles.pressed,
      ]}
    >
      <Text
        style={[
          styles.filterText,

          {
            fontSize: 12.5 * fontScale,
          },

          active &&
            styles.filterTextActive,
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.filterCount,

          {
            minWidth: 24 * scale,
            height: 24 * scale,
            borderRadius: 12 * scale,
            paddingHorizontal: 6 * scale,
          },

          alert &&
            count > 0 &&
            styles.filterCountAlert,

          warning &&
            count > 0 &&
            styles.filterCountWarning,

          positive &&
            styles.filterCountPositive,
        ]}
      >
        <Text
          style={[
            styles.filterCountText,

            {
              fontSize: 11 * fontScale,
            },
          ]}
        >
          {count}
        </Text>
      </View>
    </Pressable>
  );
}

// ============================================================
// BANNER (success / error)
// ============================================================

function Banner({
  scale,
  fontScale,
  tone,
  text,
  onClose,
}: {
  scale: number;
  fontScale: number;
  tone: 'success' | 'error';
  text: string;
  onClose: () => void;
}) {
  const success =
    tone === 'success';

  return (
    <View
      style={[
        success
          ? styles.successBanner
          : styles.errorBanner,

        {
          padding: 14 * scale,
          borderRadius: 12 * scale,
          marginBottom: 18 * scale,
          gap: 9 * scale,
        },
      ]}
    >
      <MaterialIcons
        name={
          success
            ? 'check-circle'
            : 'error-outline'
        }
        size={21 * scale}
        color={
          success
            ? COLORS.green
            : COLORS.redBright
        }
      />

      <Text
        style={[
          success
            ? styles.successText
            : styles.errorText,

          {
            fontSize: 12.5 * fontScale,
          },
        ]}
      >
        {text}
      </Text>

      <Pressable
        onPress={onClose}
        hitSlop={8}
      >
        <MaterialIcons
          name="close"
          size={18 * scale}
          color={COLORS.muted}
        />
      </Pressable>
    </View>
  );
}

// ============================================================
// TABLE MESSAGE
// ============================================================

function TableMessage({
  scale,
  fontScale,
  loading = false,
  icon,
  iconColor = COLORS.muted,
  title,
  text,
  actionLabel,
  onAction,
}: {
  scale: number;
  fontScale: number;
  loading?: boolean;
  icon?: IconName;
  iconColor?: string;
  title: string;
  text: string;
  actionLabel?: string;
  onAction?: () => void;
}) {
  return (
    <View
      style={[
        styles.centerArea,

        {
          minHeight: 360 * scale,
          paddingHorizontal: 30 * scale,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator
          size="large"
          color={COLORS.redBright}
        />
      ) : icon ? (
        <MaterialIcons
          name={icon}
          size={46 * scale}
          color={iconColor}
        />
      ) : null}

      {title ? (
        <Text
          style={[
            styles.emptyTitle,

            {
              fontSize: 18 * fontScale,
              marginTop: 14 * scale,
            },
          ]}
        >
          {title}
        </Text>
      ) : null}

      <Text
        style={[
          styles.cellMuted,
          styles.centerText,

          {
            fontSize: 13 * fontScale,
            marginTop: (title ? 6 : 14) * scale,
          },
        ]}
      >
        {text}
      </Text>

      {actionLabel && onAction ? (
        <Pressable
          onPress={onAction}
          style={({ pressed }) => [
            styles.primaryButton,

            {
              height: 42 * scale,
              paddingHorizontal: 20 * scale,
              borderRadius: 9 * scale,
              marginTop: 18 * scale,
            },

            pressed &&
              styles.pressed,
          ]}
        >
          <Text
            style={[
              styles.primaryButtonText,

              {
                fontSize: 13 * fontScale,
              },
            ]}
          >
            {actionLabel}
          </Text>
        </Pressable>
      ) : null}
    </View>
  );
}

// ============================================================
// PAGE BUTTON
// ============================================================

function PageButton({
  scale,
  fontScale,
  label,
  icon,
  iconRight = false,
  disabled,
  onPress,
}: {
  scale: number;
  fontScale: number;
  label: string;
  icon: IconName;
  iconRight?: boolean;
  disabled: boolean;
  onPress: () => void;
}) {
  const iconNode = (
    <MaterialIcons
      name={icon}
      size={19 * scale}
      color={COLORS.white}
    />
  );

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.pageButton,

        {
          height: 40 * scale,
          paddingHorizontal: 14 * scale,
          borderRadius: 9 * scale,
        },

        pressed &&
          styles.pressed,

        disabled &&
          styles.disabled,
      ]}
    >
      {!iconRight ? iconNode : null}

      <Text
        style={[
          styles.pageButtonText,

          {
            fontSize: 12.5 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      {iconRight ? iconNode : null}
    </Pressable>
  );
}

// ============================================================
// USER ROW
// ============================================================

function UserRow({
  user,
  scale,
  fontScale,
  last,
  onOpen,
  onAction,
}: {
  user: AdminManagedUser;
  scale: number;
  fontScale: number;
  last: boolean;
  onOpen: () => void;
  onAction: () => void;
}) {
  const donorTone =
    getDonorTone(user);

  return (
    <Pressable
      onPress={onOpen}
      style={({ pressed }) => [
        styles.tableRow,

        {
          minHeight: 84 * scale,
          paddingHorizontal: 22 * scale,
          paddingVertical: 12 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.rowPressed,
      ]}
    >
      {/* USER */}

      <View
        style={[
          styles.colUser,
          styles.userCell,
        ]}
      >
        <View
          style={[
            styles.avatar,

            {
              width: 40 * scale,
              height: 40 * scale,
              borderRadius: 20 * scale,
              marginRight: 11 * scale,
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
            {getInitials(user)}
          </Text>
        </View>

        <View
          style={[
            styles.flexFill,

            {
              paddingRight: 10 * scale,
            },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[
              styles.nameText,

              {
                fontSize: 13.5 * fontScale,
              },
            ]}
          >
            {getUserDisplayName(user)}
          </Text>

          <Text
            numberOfLines={1}
            style={[
              styles.cellMuted,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 3 * scale,
              },
            ]}
          >
            {user.email || 'No email'}
          </Text>
        </View>
      </View>

      {/* CONTACT */}

      <View
        style={[
          styles.colContact,

          {
            paddingRight: 10 * scale,
          },
        ]}
      >
        <Text
          numberOfLines={1}
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {user.phone || 'No phone'}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.cellMuted,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 3 * scale,
            },
          ]}
        >
          {formatLocation(user)}
        </Text>
      </View>

      {/* DONOR STATUS */}

      <View style={styles.colDonor}>
        <View
          style={[
            styles.pill,

            {
              height: 30 * scale,
              paddingHorizontal: 10 * scale,
              borderRadius: 6 * scale,
              borderColor: donorTone.border,
              backgroundColor: donorTone.background,
            },
          ]}
        >
          <Text
            style={[
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: donorTone.color,
              },
            ]}
          >
            {getDonorLabel(user)}
          </Text>
        </View>

        {user.donor?.blood_type ? (
          <Text
            style={[
              styles.cellMuted,

              {
                fontSize: 11.5 * fontScale,
                marginTop: 4 * scale,
              },
            ]}
          >
            Blood type: {user.donor.blood_type}
          </Text>
        ) : null}
      </View>

      {/* JOINED */}

      <View style={styles.colJoined}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {formatDate(user.created_at)}
        </Text>
      </View>

      {/* ACCOUNT */}

      <View style={styles.colStatus}>
        <View
          style={[
            styles.pill,

            {
              height: 30 * scale,
              paddingHorizontal: 10 * scale,
              borderRadius: 15 * scale,
              gap: 6 * scale,
            },

            user.is_active
              ? styles.activePill
              : styles.inactivePill,
          ]}
        >
          <View
            style={{
              width: 6 * scale,
              height: 6 * scale,
              borderRadius: 3 * scale,
              backgroundColor: user.is_active
                ? COLORS.green
                : COLORS.redBright,
            }}
          />

          <Text
            style={[
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: user.is_active
                  ? COLORS.green
                  : COLORS.redBright,
              },
            ]}
          >
            {user.is_active
              ? 'Active'
              : 'Inactive'}
          </Text>
        </View>

        {isUserLocked(user) ? (
          <View
            accessibilityLabel="Locked"
            style={[
              styles.lockedBadge,

              {
                width: 30 * scale,
                height: 30 * scale,
                borderRadius: 15 * scale,
                marginLeft: 6 * scale,
              },
            ]}
          >
            <MaterialIcons
              name="lock"
              size={15 * scale}
              color={COLORS.orange}
            />
          </View>
        ) : null}
      </View>

      {/* ACTION */}

      <View style={styles.colAction}>
        <Pressable
          onPress={event => {
            // Do not also open the details screen.
            event.stopPropagation();

            onAction();
          }}
          style={({ pressed }) => [
            styles.actionButton,

            {
              height: 34 * scale,
              minWidth: 94 * scale,
              paddingHorizontal: 11 * scale,
              borderRadius: 8 * scale,
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
              styles.pillText,

              {
                fontSize: 12 * fontScale,
                color: user.is_active
                  ? COLORS.redBright
                  : COLORS.green,
              },
            ]}
          >
            {user.is_active
              ? 'Deactivate'
              : 'Activate'}
          </Text>
        </Pressable>

        <MaterialIcons
          name="chevron-right"
          size={22 * scale}
          color={COLORS.white}
          style={{
            marginLeft: 8 * scale,
          }}
        />
      </View>
    </Pressable>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getUserDisplayName(
  user: AdminManagedUser
) {
  if (user.full_name?.trim()) {
    return user.full_name.trim();
  }

  return (
    [
      user.first_name,
      user.middle_name,
      user.last_name,
      user.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    user.email ||
    'Hemo-Hero User'
  );
}

function getInitials(
  user: AdminManagedUser
) {
  const combined =
    `${user.first_name?.trim().charAt(0) || ''}${
      user.last_name?.trim().charAt(0) || ''
    }`.toUpperCase();

  return (
    combined ||
    user.email?.charAt(0).toUpperCase() ||
    'U'
  );
}

function formatLocation(
  user: AdminManagedUser
) {
  return (
    [user.city, user.province]
      .filter(Boolean)
      .join(', ') ||
    'Location unavailable'
  );
}

function getDonorLabel(
  user: AdminManagedUser
) {
  if (!user.donor) {
    return 'Not a donor';
  }

  switch (
    String(user.donor.status || '').toLowerCase()
  ) {
    case 'approved':
      return 'Approved Donor';

    case 'pending':
      return 'Pending';

    case 'rejected':
      return 'Rejected';

    case 'withdrawn':
      return 'Withdrawn';

    default:
      return 'Donor';
  }
}

function getDonorTone(
  user: AdminManagedUser
) {
  const status =
    String(user.donor?.status || '').toLowerCase();

  if (status === 'approved') {
    return {
      color: COLORS.green,
      border: 'rgba(53,201,130,0.45)',
      background: 'rgba(53,201,130,0.10)',
    };
  }

  if (status === 'pending') {
    return {
      color: COLORS.orange,
      border: 'rgba(243,163,74,0.45)',
      background: 'rgba(243,163,74,0.10)',
    };
  }

  if (status === 'rejected') {
    return {
      color: COLORS.redBright,
      border: 'rgba(239,51,64,0.45)',
      background: 'rgba(239,51,64,0.10)',
    };
  }

  return {
    color: COLORS.muted,
    border: COLORS.border,
    background: COLORS.cardLight,
  };
}

function formatDate(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return '—';
  }

  return date.toLocaleDateString(
    undefined,
    {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
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

  flexFill: {
    flex: 1,
    minWidth: 0,
  },

  // TITLE

  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  subtitle: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.red,
  },

  primaryButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  refreshText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // TOOLBAR

  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
  },

  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  filterButtonActive: {
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(219,10,10,0.15)',
  },

  filterText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  filterTextActive: {
    color: COLORS.white,
  },

  filterCount: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  filterCountAlert: {
    backgroundColor: 'rgba(239,51,64,0.22)',
  },

  filterCountWarning: {
    backgroundColor: 'rgba(243,163,74,0.24)',
  },

  filterCountPositive: {
    backgroundColor: 'rgba(53,201,130,0.18)',
  },

  filterCountText: {
    color: COLORS.white,
    fontFamily: 'Inter_700Bold',
  },

  searchInputContainer: {
    flex: 1,
    minWidth: 240,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  searchInput: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none',
  } as any,

  // BANNERS

  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(53,201,130,0.40)',
    backgroundColor: 'rgba(53,201,130,0.08)',
  },

  successText: {
    flex: 1,
    color: COLORS.green,
    fontFamily: 'Inter_500Medium',
  },

  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.55)',
    backgroundColor: 'rgba(80,16,30,0.55)',
  },

  errorText: {
    flex: 1,
    color: '#FFB8BE',
    fontFamily: 'Inter_500Medium',
  },

  // TABLE

  listCard: {
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  tableHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.border,
    backgroundColor: 'rgba(12,20,40,0.94)',
  },

  tableHeaderText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  tableRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rowBorder,
  },

  rowPressed: {
    backgroundColor: 'rgba(255,255,255,0.03)',
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  colUser: {
    width: '26%',
  },

  colContact: {
    width: '18%',
  },

  colDonor: {
    width: '17%',
  },

  colJoined: {
    width: '12%',
  },

  colStatus: {
    width: '11%',
    flexDirection: 'row',
    flexWrap: 'wrap',
    alignItems: 'center',
    rowGap: 4,
  },

  colAction: {
    width: '16%',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
  },

  userCell: {
    flexDirection: 'row',
    alignItems: 'center',
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

  nameText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  cellText: {
    color: COLORS.soft,
    fontFamily: 'Inter_500Medium',
  },

  cellMuted: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  pill: {
    alignSelf: 'flex-start',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  pillText: {
    fontFamily: 'Inter_600SemiBold',
  },

  activePill: {
    borderColor: 'rgba(53,201,130,0.40)',
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  inactivePill: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  // Small lock beside Active/Inactive.
  lockedBadge: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(243,163,74,0.45)',
    backgroundColor: 'rgba(243,163,74,0.10)',
  },

  actionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  deactivateButton: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  activateButton: {
    borderColor: 'rgba(53,201,130,0.45)',
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  // STATES

  centerArea: {
    alignItems: 'center',
    justifyContent: 'center',
  },

  centerText: {
    textAlign: 'center',
  },

  emptyTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  // PAGINATION

  pagination: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  pageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  pageButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // MODAL

  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(2,4,10,0.78)',
  },

  modalCard: {
    alignItems: 'center',
    borderWidth: 1,
    backgroundColor: '#0B142A',
    shadowColor: '#000000',
    shadowOpacity: 0.35,
    shadowRadius: 24,
    shadowOffset: {
      width: 0,
      height: 14,
    },
    elevation: 18,
  },

  modalIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  modalIconDanger: {
    borderColor: 'rgba(239,51,64,0.35)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  modalIconSuccess: {
    borderColor: 'rgba(53,201,130,0.35)',
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  modalTitle: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    textAlign: 'center',
  },

  modalMessage: {
    maxWidth: 430,
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  modalUserCard: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  modalUserName: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
  },

  modalButtons: {
    width: '100%',
    flexDirection: 'row',
  },

  cancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  cancelButtonText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // INTERACTION

  pressed: {
    opacity: 0.78,
    transform: [{ scale: 0.985 }],
  },

  disabled: {
    opacity: 0.45,
  },
});
