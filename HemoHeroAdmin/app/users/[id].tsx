import {
  type ComponentProps,
  type ReactNode,
  useCallback,
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

import {
  router,
  useFocusEffect,
  useLocalSearchParams,
} from 'expo-router';

import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import { useAdminCanvas } from '../../components/AdminCanvas';

import AdminHeader from '../AdminHeader';

import { FadeInView } from '../../components/AdminMotion';

import {
  activateAdminUser,
  deactivateAdminUser,
  deleteAdminUser,
  getAdminReports,
  getAdminUserById,
  type AdminManagedUser,
  type AdminProfile,
  type AdminReport,
  type AdminReportStatus,
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
// (applications/[id].tsx) for a consistent Admin UI.
// ============================================================

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
  blue: '#4A8CFF',
};

type IconName =
  ComponentProps<
    typeof MaterialIcons
  >['name'];

// ============================================================
// SCREEN
// ============================================================

export default function AdminUserDetailsScreen() {
  const { id } =
    useLocalSearchParams<{
      id?: string;
    }>();


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

  const [user, setUser] =
    useState<AdminManagedUser | null>(null);

  const [loading, setLoading] = useState(true);

  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  // ISSUES (loaded separately; a failure only affects its card)

  const [issues, setIssues] =
    useState<AdminReport[]>([]);

  const [issuesLoading, setIssuesLoading] = useState(true);
  const [issuesError, setIssuesError] = useState('');

  // ACTIVATE / DEACTIVATE

  const [actionModalVisible, setActionModalVisible] =
    useState(false);

  const [processingAction, setProcessingAction] =
    useState(false);

  // DELETE

  const [deleteModalVisible, setDeleteModalVisible] =
    useState(false);

  const [deleteConfirmation, setDeleteConfirmation] =
    useState('');

  const [processingDelete, setProcessingDelete] =
    useState(false);

  // ==========================================================
  // LOAD USER
  // ==========================================================

  const loadUser = useCallback(async () => {
    try {
      setErrorMessage('');

      const token =
        await getAdminAccessToken();

      const savedProfile =
        await getAdminProfile();

      if (
        !token ||
        savedProfile?.role !== 'admin'
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      if (
        !id ||
        typeof id !== 'string'
      ) {
        setErrorMessage('Invalid user ID.');

        return;
      }

      setProfile(savedProfile);

      const result =
        await getAdminUserById(token, id);

      setUser(result.user);

      void loadIssues(token, id);
    } catch (error) {
      console.log(
        'ADMIN USER DETAILS ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to load user details.'
      );
    } finally {
      setLoading(false);
    }
  }, [id]);

  async function loadIssues(
    token: string,
    userId: string
  ) {
    try {
      setIssuesLoading(true);
      setIssuesError('');

      const result =
        await getAdminReports(token, {
          user_id: userId,
          limit: 100,
        });

      setIssues(
        result.reports ||
          []
      );
    } catch (error) {
      setIssuesError(
        error instanceof Error
          ? error.message
          : 'Unable to load issues for this user.'
      );
    } finally {
      setIssuesLoading(false);
    }
  }

  useFocusEffect(
    useCallback(() => {
      loadUser();
    }, [loadUser])
  );

  // ==========================================================
  // DERIVED
  // ==========================================================

  const userName =
    user
      ? getUserDisplayName(user)
      : 'User';

  const issuesAbout = issues.filter(
    issue =>
      issue.reported_user_id === id
  );

  const issuesBy = issues.filter(
    issue =>
      issue.reporter_id === id
  );

  const reportsAgainst = issuesAbout.filter(
    issue =>
      issue.kind === 'report'
  );

  const unresolvedAgainst = reportsAgainst.filter(
    issue =>
      issue.status === 'open' ||
      issue.status === 'in_review'
  );

  const busy =
    processingAction ||
    processingDelete;

  // ==========================================================
  // ACTIVATE / DEACTIVATE
  // ==========================================================

  function openActionModal() {
    if (!user || busy) {
      return;
    }

    setErrorMessage('');
    setSuccessMessage('');
    setActionModalVisible(true);
  }

  function closeActionModal() {
    if (processingAction) {
      return;
    }

    setActionModalVisible(false);
  }

  async function confirmAccountAction() {
    if (!user || processingAction) {
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

      const wasActive = user.is_active;

      const result = wasActive
        ? await deactivateAdminUser(token, user.id)
        : await activateAdminUser(token, user.id);

      setUser(result.user);

      setSuccessMessage(
        result.message ||
          (wasActive
            ? 'User account deactivated successfully.'
            : 'User account activated successfully.')
      );
    } catch (error) {
      console.log(
        'ADMIN USER DETAILS ACTION ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to update user account.'
      );
    } finally {
      setActionModalVisible(false);
      setProcessingAction(false);
    }
  }

  // ==========================================================
  // DELETE
  // ==========================================================

  function openDeleteModal() {
    if (!user || busy) {
      return;
    }

    setDeleteConfirmation('');
    setErrorMessage('');
    setSuccessMessage('');
    setDeleteModalVisible(true);
  }

  function closeDeleteModal() {
    if (processingDelete) {
      return;
    }

    setDeleteModalVisible(false);
    setDeleteConfirmation('');
  }

  const deleteConfirmed =
    deleteConfirmation
      .trim()
      .toUpperCase() === 'DELETE';

  async function confirmDeleteUser() {
    if (
      !user ||
      processingDelete ||
      !deleteConfirmed
    ) {
      return;
    }

    try {
      setProcessingDelete(true);
      setErrorMessage('');

      const token =
        await getAdminAccessToken();

      if (!token) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      await deleteAdminUser(token, user.id);

      setDeleteModalVisible(false);
      setDeleteConfirmation('');

      router.replace('/users');
    } catch (error) {
      console.log(
        'ADMIN DELETE USER ERROR:',
        error
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to permanently delete user account.'
      );

      setDeleteModalVisible(false);
      setDeleteConfirmation('');
    } finally {
      setProcessingDelete(false);
    }
  }

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

            {loading && !user ? (
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
                  Loading user details...
                </Text>
              </View>
            ) : !user ? (
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
                  Unable to Load User
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
                  {errorMessage ||
                    'This user could not be found.'}
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
                  <ActionButton
                    label="Back to Users"
                    icon="arrow-back"
                    tone="outline"
                    scale={s}
                    fontScale={fs}
                    onPress={() =>
                      router.replace('/users')
                    }
                  />

                  <ActionButton
                    label="Try Again"
                    icon="refresh"
                    tone="primary"
                    scale={s}
                    fontScale={fs}
                    onPress={loadUser}
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
                    User Management
                  </Text>
                </Pressable>

                {/* MESSAGES */}

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

                {errorMessage ? (
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

                {/* ==================================================
                    PROFILE CARD
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
                          styles.avatar,

                          {
                            width: 66 * s,
                            height: 66 * s,
                            borderRadius: 33 * s,
                            marginRight: 17 * s,
                          },
                        ]}
                      >
                        <Text
                          style={[
                            styles.avatarText,

                            {
                              fontSize: 19 * fs,
                            },
                          ]}
                        >
                          {getInitials(user)}
                        </Text>
                      </View>

                      <View style={styles.flexFill}>
                        <View
                          style={[
                            styles.row,

                            {
                              alignItems: 'center',
                              gap: 10 * s,
                            },
                          ]}
                        >
                          <Text
                            numberOfLines={1}
                            style={[
                              styles.profileName,

                              {
                                fontSize: 23 * fs,
                                flexShrink: 1,
                              },
                            ]}
                          >
                            {userName}
                          </Text>

                          <StatusPill
                            active={user.is_active}
                            scale={s}
                            fontScale={fs}
                          />
                        </View>

                        <Text
                          numberOfLines={1}
                          style={[
                            styles.profileEmail,

                            {
                              fontSize: 13 * fs,
                              marginTop: 3 * s,
                            },
                          ]}
                        >
                          {user.email ||
                            'No email available'}
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
                          Joined {formatDate(user.created_at)}
                          {user.role
                            ? ` • ${formatValue(user.role)}`
                            : ''}
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
                      <ActionButton
                        label="Edit User"
                        icon="edit"
                        tone="outline"
                        scale={s}
                        fontScale={fs}
                        disabled={busy}
                        onPress={() =>
                          router.push(
                            `/users/${user.id}/edit` as any
                          )
                        }
                      />

                      <ActionButton
                        label={
                          user.is_active
                            ? 'Deactivate'
                            : 'Activate'
                        }
                        icon={
                          user.is_active
                            ? 'person-off'
                            : 'person-add'
                        }
                        tone={
                          user.is_active
                            ? 'danger'
                            : 'success'
                        }
                        scale={s}
                        fontScale={fs}
                        disabled={busy}
                        onPress={openActionModal}
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
                      title="Personal Information"
                    >
                      <InfoGrid>
                        <InfoItem fontScale={fs} label="First Name" value={user.first_name || '—'} />
                        <InfoItem fontScale={fs} label="Middle Name" value={user.middle_name || '—'} />
                        <InfoItem fontScale={fs} label="Last Name" value={user.last_name || '—'} />
                        <InfoItem fontScale={fs} label="Suffix" value={user.suffix || '—'} />
                        <InfoItem fontScale={fs} label="Date of Birth" value={formatDate(user.date_of_birth)} />
                        <InfoItem fontScale={fs} label="Gender" value={formatValue(user.gender)} />
                      </InfoGrid>
                    </SectionCard>

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="location-on"
                      title="Contact & Location"
                    >
                      <InfoGrid>
                        <InfoItem fontScale={fs} label="Email" value={user.email || '—'} />
                        <InfoItem fontScale={fs} label="Phone" value={user.phone || '—'} />
                        <InfoItem fontScale={fs} label="Barangay" value={user.barangay || '—'} />
                        <InfoItem fontScale={fs} label="City" value={user.city || '—'} />
                        <InfoItem fontScale={fs} label="Province" value={user.province || '—'} />
                      </InfoGrid>
                    </SectionCard>

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="manage-accounts"
                      title="Account Information"
                    >
                      <InfoGrid>
                        <InfoItem fontScale={fs} label="Role" value={formatValue(user.role)} />
                        <InfoItem
                          fontScale={fs}
                          label="Account Status"
                          value={user.is_active ? 'Active' : 'Inactive'}
                          color={user.is_active ? COLORS.green : COLORS.redBright}
                        />
                        <InfoItem fontScale={fs} label="Joined" value={formatDateTime(user.created_at)} />
                        <InfoItem fontScale={fs} label="Last Updated" value={formatDateTime(user.updated_at)} />
                        <InfoItem
                          fontScale={fs}
                          label="Onboarding"
                          value={user.onboarding_complete ? 'Completed' : 'Not completed'}
                        />
                        {!user.is_active && user.deactivated_at ? (
                          <InfoItem
                            fontScale={fs}
                            label="Deactivated"
                            value={formatDateTime(user.deactivated_at)}
                            color={COLORS.redBright}
                          />
                        ) : null}
                        <InfoItem fontScale={fs} label="User ID" value={user.id} wide />
                      </InfoGrid>
                    </SectionCard>
                  </FadeInView>

                  {/* RIGHT */}

                  <FadeInView
                    delay={120}
                    style={styles.rightColumn}
                  >
                    {/* DONOR */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="bloodtype"
                      title="Donor Information"
                    >
                      {user.donor ? (
                        <>
                          <InfoGrid>
                            <InfoItem
                              fontScale={fs}
                              label="Donor Status"
                              value={formatValue(user.donor.status)}
                              color={getDonorColor(user.donor.status)}
                            />
                            <InfoItem
                              fontScale={fs}
                              label="Blood Type"
                              value={user.donor.blood_type || user.blood_type || '—'}
                              color={COLORS.redBright}
                            />
                            <InfoItem
                              fontScale={fs}
                              label="Availability"
                              value={formatValue(user.donor.availability_status)}
                              color={
                                user.donor.availability_status === 'available'
                                  ? COLORS.green
                                  : undefined
                              }
                            />
                          </InfoGrid>

                          {user.donor.application_id ? (
                            <ActionButton
                              label="View Donor Application"
                              icon="assignment-ind"
                              tone="outline"
                              scale={s}
                              fontScale={fs}
                              onPress={() =>
                                router.push(
                                  `/applications/${user.donor?.application_id}` as any
                                )
                              }
                              style={{
                                marginTop: 18 * s,
                              }}
                            />
                          ) : null}
                        </>
                      ) : (
                        <Text
                          style={[
                            styles.mutedText,

                            {
                              fontSize: 13 * fs,
                              lineHeight: 20 * fs,
                            },
                          ]}
                        >
                          This user has not applied to become a donor.
                          {user.blood_type
                            ? ` Profile blood type: ${user.blood_type}.`
                            : ''}
                        </Text>
                      )}
                    </SectionCard>

                    {/* ISSUES */}

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="report-problem"
                      title="Issues & Reports"
                    >
                      {issuesLoading ? (
                        <View
                          style={[
                            styles.centerArea,

                            {
                              paddingVertical: 24 * s,
                            },
                          ]}
                        >
                          <ActivityIndicator
                            color={COLORS.redBright}
                          />
                        </View>
                      ) : issuesError ? (
                        <Text
                          style={[
                            styles.errorInline,

                            {
                              fontSize: 12.5 * fs,
                            },
                          ]}
                        >
                          {issuesError}
                        </Text>
                      ) : (
                        <>
                          <View
                            style={[
                              styles.row,

                              {
                                gap: 10 * s,
                              },
                            ]}
                          >
                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              label="Against user"
                              value={reportsAgainst.length}
                              alert={unresolvedAgainst.length > 0}
                            />

                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              label="Unresolved"
                              value={unresolvedAgainst.length}
                              alert={unresolvedAgainst.length > 0}
                            />

                            <MiniStat
                              scale={s}
                              fontScale={fs}
                              label="Filed by user"
                              value={issuesBy.length}
                            />
                          </View>

                          {issues.length === 0 ? (
                            <Text
                              style={[
                                styles.mutedText,

                                {
                                  fontSize: 13 * fs,
                                  marginTop: 14 * s,
                                },
                              ]}
                            >
                              No reports or feedback involve this user.
                            </Text>
                          ) : (
                            <View
                              style={{
                                marginTop: 12 * s,
                              }}
                            >
                              {issues
                                .slice(0, 5)
                                .map((issue, index, list) => (
                                  <IssueRow
                                    key={issue.id}
                                    issue={issue}
                                    against={
                                      issue.reported_user_id === id
                                    }
                                    scale={s}
                                    fontScale={fs}
                                    last={index === list.length - 1}
                                  />
                                ))}

                              {issues.length > 5 ? (
                                <Text
                                  style={[
                                    styles.mutedText,

                                    {
                                      fontSize: 11.5 * fs,
                                      marginTop: 8 * s,
                                    },
                                  ]}
                                >
                                  Showing the latest 5 of {issues.length}.
                                </Text>
                              ) : null}
                            </View>
                          )}
                        </>
                      )}
                    </SectionCard>

                    {/* DANGER ZONE */}

                    <View
                      style={[
                        styles.dangerCard,

                        {
                          padding: 21 * s,
                          borderRadius: 15 * s,
                        },
                      ]}
                    >
                      <View
                        style={[
                          styles.row,

                          {
                            alignItems: 'center',
                            gap: 9 * s,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="warning-amber"
                          size={21 * s}
                          color={COLORS.redBright}
                        />

                        <Text
                          style={[
                            styles.sectionTitle,

                            {
                              fontSize: 16 * fs,
                            },
                          ]}
                        >
                          Danger Zone
                        </Text>
                      </View>

                      <Text
                        style={[
                          styles.mutedText,

                          {
                            fontSize: 12.5 * fs,
                            lineHeight: 19 * fs,
                            marginTop: 10 * s,
                          },
                        ]}
                      >
                        Permanently deleting removes the user's account and sign-in. This cannot be undone. Consider deactivating instead.
                      </Text>

                      <ActionButton
                        label="Permanently Delete User"
                        icon="delete-forever"
                        tone="danger"
                        scale={s}
                        fontScale={fs}
                        disabled={busy}
                        onPress={openDeleteModal}
                        style={{
                          marginTop: 16 * s,
                        }}
                      />
                    </View>
                  </FadeInView>
                </View>
              </ScrollView>
            )}
          </SafeAreaView>
        </LinearGradient>
      </View>

      {/* ========================================================
          ACTIVATE / DEACTIVATE MODAL
      ======================================================== */}

      <ConfirmModal
        visible={actionModalVisible}
        scale={s}
        fontScale={fs}
        tone={
          user?.is_active
            ? 'danger'
            : 'success'
        }
        icon={
          user?.is_active
            ? 'person-off'
            : 'person-add'
        }
        title={
          user?.is_active
            ? 'Deactivate User?'
            : 'Activate User?'
        }
        message={
          user?.is_active
            ? 'This user will no longer be able to use authenticated Hemo-Hero features until the account is activated again.'
            : 'This user will regain access to authenticated Hemo-Hero features.'
        }
        userName={userName}
        userEmail={user?.email || ''}
        confirmLabel={
          user?.is_active
            ? 'Deactivate'
            : 'Activate'
        }
        processing={processingAction}
        onClose={closeActionModal}
        onConfirm={confirmAccountAction}
      />

      {/* ========================================================
          DELETE MODAL
      ======================================================== */}

      <ConfirmModal
        visible={deleteModalVisible}
        scale={s}
        fontScale={fs}
        tone="danger"
        icon="delete-forever"
        title="Permanently Delete User?"
        message="This removes the account and its sign-in permanently. Type DELETE to confirm."
        userName={userName}
        userEmail={user?.email || ''}
        confirmLabel="Delete Permanently"
        processing={processingDelete}
        confirmDisabled={!deleteConfirmed}
        onClose={closeDeleteModal}
        onConfirm={confirmDeleteUser}
      >
        <TextInput
          value={deleteConfirmation}
          onChangeText={setDeleteConfirmation}
          editable={!processingDelete}
          autoCapitalize="characters"
          autoCorrect={false}
          placeholder="Type DELETE"
          placeholderTextColor={COLORS.muted}
          style={[
            styles.deleteInput,

            {
              height: 46 * s,
              borderRadius: 10 * s,
              paddingHorizontal: 14 * s,
              marginTop: 16 * s,
              fontSize: 14 * fs,
            },

            deleteConfirmed &&
              styles.deleteInputReady,
          ]}
        />
      </ConfirmModal>
    </View>
  );
}

// ============================================================
// ACTION BUTTON
// ============================================================

function ActionButton({
  label,
  icon,
  tone,
  scale,
  fontScale,
  disabled = false,
  onPress,
  style,
}: {
  label: string;
  icon: IconName;
  tone: 'primary' | 'danger' | 'success' | 'outline';
  scale: number;
  fontScale: number;
  disabled?: boolean;
  onPress: () => void;
  style?: object;
}) {
  const palette = {
    primary: {
      color: COLORS.white,
      style: styles.primaryAction,
    },
    danger: {
      color: COLORS.redBright,
      style: styles.dangerAction,
    },
    success: {
      color: COLORS.green,
      style: styles.successAction,
    },
    outline: {
      color: COLORS.soft,
      style: styles.outlineAction,
    },
  }[tone];

  return (
    <Pressable
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.actionButton,
        palette.style,

        {
          height: 44 * scale,
          paddingHorizontal: 16 * scale,
          borderRadius: 10 * scale,
          gap: 7 * scale,
        },

        style,

        disabled &&
          styles.disabled,

        pressed &&
          !disabled &&
          styles.pressed,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={19 * scale}
        color={palette.color}
      />

      <Text
        style={[
          styles.actionText,

          {
            fontSize: 13 * fontScale,
            color: palette.color,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================
// CONFIRM MODAL (Applications modal design)
// ============================================================

function ConfirmModal({
  visible,
  scale,
  fontScale,
  tone,
  icon,
  title,
  message,
  userName,
  userEmail,
  confirmLabel,
  processing,
  confirmDisabled = false,
  onClose,
  onConfirm,
  children,
}: {
  visible: boolean;
  scale: number;
  fontScale: number;
  tone: 'danger' | 'success';
  icon: IconName;
  title: string;
  message: string;
  userName: string;
  userEmail: string;
  confirmLabel: string;
  processing: boolean;
  confirmDisabled?: boolean;
  onClose: () => void;
  onConfirm: () => void;
  children?: ReactNode;
}) {
  const accent =
    tone === 'danger'
      ? COLORS.redBright
      : COLORS.green;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          disabled={processing}
          onPress={onClose}
        />

        <View
          style={[
            styles.modalCard,

            {
              width: 500 * scale,
              maxWidth: '88%',
              padding: 26 * scale,
              borderRadius: 18 * scale,
              borderColor: accent,
            },
          ]}
        >
          <View
            style={[
              styles.modalIcon,

              {
                width: 56 * scale,
                height: 56 * scale,
                borderRadius: 28 * scale,
                backgroundColor:
                  tone === 'danger'
                    ? 'rgba(239,51,64,0.12)'
                    : 'rgba(53,201,130,0.12)',
              },
            ]}
          >
            <MaterialIcons
              name={icon}
              size={28 * scale}
              color={accent}
            />
          </View>

          <Text
            style={[
              styles.modalTitle,

              {
                fontSize: 20 * fontScale,
                marginTop: 17 * scale,
              },
            ]}
          >
            {title}
          </Text>

          <Text
            style={[
              styles.modalMessage,

              {
                fontSize: 14 * fontScale,
                lineHeight: 22 * fontScale,
                marginTop: 8 * scale,
              },
            ]}
          >
            {message}
          </Text>

          <View
            style={[
              styles.modalUserCard,

              {
                padding: 14 * scale,
                borderRadius: 11 * scale,
                marginTop: 18 * scale,
              },
            ]}
          >
            <Text
              style={[
                styles.modalUserName,

                {
                  fontSize: 13.5 * fontScale,
                },
              ]}
            >
              {userName}
            </Text>

            <Text
              style={[
                styles.mutedText,
                styles.centerText,

                {
                  fontSize: 12 * fontScale,
                  marginTop: 3 * scale,
                },
              ]}
            >
              {userEmail || 'No email available'}
            </Text>
          </View>

          {children}

          <View
            style={[
              styles.modalButtons,

              {
                gap: 10 * scale,
                marginTop: 24 * scale,
              },
            ]}
          >
            <Pressable
              disabled={processing}
              onPress={onClose}
              style={({ pressed }) => [
                styles.cancelButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                },

                pressed &&
                  styles.pressed,
              ]}
            >
              <Text
                style={[
                  styles.cancelText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={
                processing ||
                confirmDisabled
              }
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.confirmButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                  backgroundColor:
                    tone === 'danger'
                      ? COLORS.redDark
                      : COLORS.green,
                },

                (processing ||
                  confirmDisabled) &&
                  styles.disabled,

                pressed &&
                  styles.pressed,
              ]}
            >
              {processing ? (
                <ActivityIndicator
                  size="small"
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={[
                    styles.confirmText,

                    {
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  {confirmLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// SMALL COMPONENTS
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

function StatusPill({
  active,
  scale,
  fontScale,
}: {
  active: boolean;
  scale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.pill,

        {
          height: 28 * scale,
          paddingHorizontal: 10 * scale,
          borderRadius: 14 * scale,
          gap: 6 * scale,
        },

        active
          ? styles.activePill
          : styles.inactivePill,
      ]}
    >
      <View
        style={{
          width: 6 * scale,
          height: 6 * scale,
          borderRadius: 3 * scale,
          backgroundColor: active
            ? COLORS.green
            : COLORS.redBright,
        }}
      />

      <Text
        style={[
          styles.pillText,

          {
            fontSize: 12 * fontScale,
            color: active
              ? COLORS.green
              : COLORS.redBright,
          },
        ]}
      >
        {active
          ? 'Active'
          : 'Inactive'}
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
  alert = false,
}: {
  scale: number;
  fontScale: number;
  label: string;
  value: number;
  alert?: boolean;
}) {
  return (
    <View
      style={[
        styles.miniStat,

        {
          paddingVertical: 11 * scale,
          paddingHorizontal: 12 * scale,
          borderRadius: 10 * scale,
        },

        alert &&
          styles.miniStatAlert,
      ]}
    >
      <Text
        style={[
          styles.miniValue,

          {
            fontSize: 19 * fontScale,
          },

          alert && {
            color: COLORS.redBright,
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

function IssueRow({
  issue,
  against,
  scale,
  fontScale,
  last,
}: {
  issue: AdminReport;
  against: boolean;
  scale: number;
  fontScale: number;
  last: boolean;
}) {
  const status =
    getIssueStatusStyle(issue.status);

  const isReport =
    issue.kind === 'report';

  return (
    <Pressable
      onPress={() =>
        router.push(
          `/issues/${issue.id}` as any
        )
      }
      style={({ pressed }) => [
        styles.issueRow,

        {
          paddingVertical: 10 * scale,
          gap: 10 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.pressed,
      ]}
    >
      <MaterialIcons
        name={
          isReport
            ? 'flag'
            : 'chat-bubble-outline'
        }
        size={18 * scale}
        color={
          isReport
            ? COLORS.redBright
            : COLORS.blue
        }
      />

      <View style={styles.flexFill}>
        <Text
          numberOfLines={1}
          style={[
            styles.issueTitle,

            {
              fontSize: 13 * fontScale,
            },
          ]}
        >
          {isReport
            ? issue.reason || 'Report'
            : 'Feedback'}
        </Text>

        <Text
          style={[
            styles.mutedText,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 2 * scale,
            },
          ]}
        >
          {against
            ? 'About this user'
            : 'Filed by this user'}{' '}
          • {formatDate(issue.created_at)}
        </Text>
      </View>

      <View
        style={[
          styles.pill,

          {
            height: 26 * scale,
            paddingHorizontal: 9 * scale,
            borderRadius: 6 * scale,
            borderColor: status.border,
            backgroundColor: status.background,
          },
        ]}
      >
        <Text
          style={[
            styles.pillText,

            {
              fontSize: 11.5 * fontScale,
              color: status.color,
            },
          ]}
        >
          {status.label}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={19 * scale}
        color={COLORS.muted}
      />
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

function getDonorColor(
  status?: string | null
) {
  switch (
    String(status || '').toLowerCase()
  ) {
    case 'approved':
      return COLORS.green;

    case 'pending':
      return COLORS.orange;

    case 'rejected':
      return COLORS.redBright;

    default:
      return undefined;
  }
}

function getIssueStatusStyle(
  status: AdminReportStatus
) {
  switch (status) {
    case 'open':
      return {
        label: 'Open',
        color: COLORS.redBright,
        border: 'rgba(239,51,64,0.50)',
        background: 'rgba(239,51,64,0.12)',
      };

    case 'in_review':
      return {
        label: 'In Review',
        color: COLORS.orange,
        border: 'rgba(243,163,74,0.55)',
        background: 'rgba(243,163,74,0.12)',
      };

    case 'resolved':
      return {
        label: 'Resolved',
        color: COLORS.green,
        border: 'rgba(53,201,130,0.50)',
        background: 'rgba(53,201,130,0.12)',
      };

    default:
      return {
        label: 'Dismissed',
        color: COLORS.muted,
        border: 'rgba(127,136,159,0.45)',
        background: 'rgba(127,136,159,0.10)',
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

function formatDate(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  // Treat YYYY-MM-DD as a local date (avoids timezone shift).
  const dateOnly =
    value.match(/^(\d{4})-(\d{2})-(\d{2})$/);

  const date = dateOnly
    ? new Date(
        Number(dateOnly[1]),
        Number(dateOnly[2]) - 1,
        Number(dateOnly[3])
      )
    : new Date(value);

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

  errorInline: {
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

  // PROFILE

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

  profileName: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  profileEmail: {
    color: COLORS.soft,
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
    alignSelf: 'center',
    borderColor: 'rgba(53,201,130,0.40)',
    backgroundColor: 'rgba(53,201,130,0.10)',
  },

  inactivePill: {
    alignSelf: 'center',
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  // BUTTONS

  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryAction: {
    backgroundColor: COLORS.red,
  },

  dangerAction: {
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.55)',
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  successAction: {
    borderWidth: 1,
    borderColor: 'rgba(53,201,130,0.55)',
    backgroundColor: 'rgba(53,201,130,0.08)',
  },

  outlineAction: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  actionText: {
    fontFamily: 'Inter_600SemiBold',
  },

  // GRID

  mainGrid: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },

  leftColumn: {
    flex: 1.55,
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

  dangerCard: {
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.40)',
    backgroundColor: 'rgba(65,17,31,0.35)',
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

  // ISSUES

  miniStat: {
    flex: 1,
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  miniStatAlert: {
    borderColor: 'rgba(239,51,64,0.40)',
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  miniValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  issueRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  issueTitle: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  noBorder: {
    borderBottomWidth: 0,
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

  deleteInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'center',
    letterSpacing: 2,
    outlineStyle: 'none',
  } as any,

  deleteInputReady: {
    borderColor: COLORS.redBright,
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

  cancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  confirmButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  confirmText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  // INTERACTION

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },

  disabled: {
    opacity: 0.45,
  },
});
