import {
  type ComponentProps,
  type ReactNode,
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  KeyboardAvoidingView,
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
  API_URL,
  changeAdminEmail,
  changeAdminPassword,
  getAdminAccount,
  logoutAdmin,
  updateAdminAccount,
  type AdminManagedUser,
  type AdminProfile,
} from '../../lib/api';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
  getRememberAdmin,
  updateStoredAdminProfile,
} from '../../lib/session';

// ============================================================
// DESIGN
//
// Layout follows the Donor Application review screen
// (applications/[id].tsx) for a consistent Admin UI.
//
// Every setting on this screen is backed by a real endpoint:
//   GET   /api/auth/me            profile
//   PATCH /api/auth/me            edit profile
//   PATCH /api/auth/me/password   change password
//   PATCH /api/auth/me/email      change email
//   POST  /api/auth/logout        sign out
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

// Must match validatePassword() in accountController.js
const PASSWORD_RULES: {
  label: string;
  test: (value: string) => boolean;
}[] = [
  {
    label: 'At least 8 characters',
    test: value => value.length >= 8,
  },
  {
    label: 'One uppercase letter',
    test: value => /[A-Z]/.test(value),
  },
  {
    label: 'One lowercase letter',
    test: value => /[a-z]/.test(value),
  },
  {
    label: 'One number',
    test: value => /[0-9]/.test(value),
  },
  {
    label: 'One special character',
    test: value => /[^A-Za-z0-9]/.test(value),
  },
];

// ============================================================
// MESSAGE / CONFIRM MODAL TYPES
// ============================================================

type ActionModalVariant =
  | 'info'
  | 'success'
  | 'error'
  | 'warning'
  | 'reject';

type ActionModalState = {
  visible: boolean;
  title: string;
  message: string;
  variant: ActionModalVariant;
  confirmLabel: string;
  showCancel: boolean;
  onConfirm?: () => void | Promise<void>;
};

const INITIAL_ACTION_MODAL: ActionModalState = {
  visible: false,
  title: '',
  message: '',
  variant: 'info',
  confirmLabel: 'Continue',
  showCancel: false,
  onConfirm: undefined,
};

type FormModal =
  | null
  | 'profile'
  | 'password'
  | 'email';

// ============================================================
// SCREEN
// ============================================================

export default function AdminSettingsScreen() {

  // ==========================================================
  // RESPONSIVE IPAD CANVAS
  // ==========================================================

  const tablet = useAdminCanvas();

  const s = Math.max(tablet.scale, 0.68);
  const fs = Math.max(tablet.scale, 0.92);

  // ==========================================================
  // STATE
  // ==========================================================

  const [profile, setProfile] =
    useState<AdminProfile | null>(null);

  const [account, setAccount] =
    useState<AdminManagedUser | null>(null);

  const [rememberMe, setRememberMe] =
    useState<boolean | null>(null);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [actionModal, setActionModal] =
    useState<ActionModalState>(INITIAL_ACTION_MODAL);

  const [formModal, setFormModal] =
    useState<FormModal>(null);

  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [signingOut, setSigningOut] = useState(false);

  // PROFILE FORM

  const [firstName, setFirstName] = useState('');
  const [middleName, setMiddleName] = useState('');
  const [lastName, setLastName] = useState('');
  const [suffix, setSuffix] = useState('');
  const [phone, setPhone] = useState('');

  // PASSWORD FORM

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  // EMAIL FORM

  const [emailPassword, setEmailPassword] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [confirmEmail, setConfirmEmail] = useState('');

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadSettings = useCallback(async () => {
    try {
      setLoadError('');

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

      setRememberMe(
        await getRememberAdmin()
      );

      const result =
        await getAdminAccount(token);

      setAccount(result.user);
    } catch (error) {
      console.log(
        'ADMIN SETTINGS LOAD ERROR:',
        error
      );

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load your account.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadSettings();
    }, [loadSettings])
  );

  // ==========================================================
  // DISPLAY
  // ==========================================================

  const source =
    account ||
    profile;

  const adminName =
    [
      source?.first_name,
      source?.middle_name,
      source?.last_name,
      source?.suffix,
    ]
      .filter(Boolean)
      .join(' ')
      .replace(/\s+/g, ' ')
      .trim() ||
    source?.email ||
    'Administrator';

  const adminInitials =
    [
      source?.first_name,
      source?.last_name,
    ]
      .filter(Boolean)
      .map(value =>
        String(value)
          .charAt(0)
          .toUpperCase()
      )
      .join('') ||
    'A';

  // ==========================================================
  // MESSAGE MODAL
  // ==========================================================

  function closeActionModal() {
    setActionModal(INITIAL_ACTION_MODAL);
  }

  function showMessage(
    title: string,
    message: string,
    variant: ActionModalVariant = 'info',
    onConfirm?: () => void
  ) {
    setActionModal({
      visible: true,
      title,
      message,
      variant,
      confirmLabel: 'Continue',
      showCancel: false,
      onConfirm,
    });
  }

  function handleActionModalConfirm() {
    const action = actionModal.onConfirm;

    closeActionModal();

    if (action) {
      void action();
    }
  }

  // ==========================================================
  // FORM MODALS
  // ==========================================================

  function openProfileForm() {
    setFirstName(source?.first_name || '');
    setMiddleName(source?.middle_name || '');
    setLastName(source?.last_name || '');
    setSuffix(source?.suffix || '');
    setPhone(account?.phone || '');

    setFormError('');
    setFormModal('profile');
  }

  function openPasswordForm() {
    setCurrentPassword('');
    setNewPassword('');
    setConfirmPassword('');

    setFormError('');
    setFormModal('password');
  }

  function openEmailForm() {
    setEmailPassword('');
    setNewEmail('');
    setConfirmEmail('');

    setFormError('');
    setFormModal('email');
  }

  function closeFormModal() {
    if (saving) {
      return;
    }

    setFormModal(null);
    setFormError('');
  }

  // Password/email changes revoke the session on the server,
  // so the local session is cleared and the admin signs in again.
  async function finishWithRelogin(
    title: string,
    message: string
  ) {
    await clearAdminSession();

    setFormModal(null);

    showMessage(
      title,
      message,
      'success',
      () => router.replace('/')
    );
  }

  async function getTokenOrRedirect() {
    const token =
      await getAdminAccessToken();

    if (!token) {
      await clearAdminSession();

      router.replace('/');

      return null;
    }

    return token;
  }

  // ==========================================================
  // SAVE PROFILE
  // ==========================================================

  async function saveProfile() {
    if (saving) {
      return;
    }

    if (
      !firstName.trim() ||
      !lastName.trim()
    ) {
      setFormError(
        'First name and last name are required.'
      );

      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const token =
        await getTokenOrRedirect();

      if (!token) {
        return;
      }

      const result =
        await updateAdminAccount(token, {
          first_name: firstName.trim(),
          middle_name: middleName.trim() || null,
          last_name: lastName.trim(),
          suffix: suffix.trim() || null,
          phone: phone.trim() || null,
        });

      setAccount(result.user);

      // Keep the shared header in sync.
      if (profile) {
        const nextProfile: AdminProfile = {
          ...profile,
          first_name: result.user.first_name,
          middle_name: result.user.middle_name,
          last_name: result.user.last_name,
          suffix: result.user.suffix,
        };

        await updateStoredAdminProfile(
          nextProfile
        );

        setProfile(nextProfile);
      }

      setFormModal(null);

      showMessage(
        'Profile Updated',
        'Your administrator profile has been saved.',
        'success'
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to update your profile.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  const passwordRulesMet =
    PASSWORD_RULES.every(rule =>
      rule.test(newPassword)
    );

  async function savePassword() {
    if (saving) {
      return;
    }

    if (
      !currentPassword ||
      !newPassword ||
      !confirmPassword
    ) {
      setFormError(
        'Please fill in all password fields.'
      );

      return;
    }

    if (!passwordRulesMet) {
      setFormError(
        'Your new password does not meet all requirements.'
      );

      return;
    }

    if (newPassword !== confirmPassword) {
      setFormError(
        'New password and confirm password do not match.'
      );

      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const token =
        await getTokenOrRedirect();

      if (!token) {
        return;
      }

      const result =
        await changeAdminPassword(token, {
          current_password: currentPassword,
          new_password: newPassword,
          confirm_password: confirmPassword,
        });

      await finishWithRelogin(
        'Password Changed',
        result.message ||
          'Password changed successfully. Please sign in again.'
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to change your password.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // CHANGE EMAIL
  // ==========================================================

  async function saveEmail() {
    if (saving) {
      return;
    }

    if (
      !emailPassword ||
      !newEmail.trim() ||
      !confirmEmail.trim()
    ) {
      setFormError(
        'Please fill in all fields.'
      );

      return;
    }

    if (
      newEmail.trim().toLowerCase() !==
      confirmEmail.trim().toLowerCase()
    ) {
      setFormError(
        'New email and confirm email do not match.'
      );

      return;
    }

    try {
      setSaving(true);
      setFormError('');

      const token =
        await getTokenOrRedirect();

      if (!token) {
        return;
      }

      const result =
        await changeAdminEmail(token, {
          current_password: emailPassword,
          new_email: newEmail,
          confirm_email: confirmEmail,
        });

      await finishWithRelogin(
        'Email Changed',
        result.message ||
          'Email address changed successfully. Please sign in again using your new email.'
      );
    } catch (error) {
      setFormError(
        error instanceof Error
          ? error.message
          : 'Unable to change your email address.'
      );
    } finally {
      setSaving(false);
    }
  }

  // ==========================================================
  // SIGN OUT
  // ==========================================================

  function openSignOut() {
    setActionModal({
      visible: true,
      title: 'Sign Out',
      message:
        'End your administrator session on this device?',
      variant: 'reject',
      confirmLabel: 'Sign Out',
      showCancel: true,
      onConfirm: performSignOut,
    });
  }

  async function performSignOut() {
    if (signingOut) {
      return;
    }

    try {
      setSigningOut(true);

      const token =
        await getAdminAccessToken();

      // Revoke the server session. If the server cannot be
      // reached, still sign out locally.
      if (token) {
        try {
          await logoutAdmin(token);
        } catch (error) {
          console.log(
            'ADMIN SERVER LOGOUT ERROR:',
            error
          );
        }
      }
    } finally {
      await clearAdminSession();

      setSigningOut(false);

      router.replace('/');
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

            {loading ? (
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
                  Loading settings...
                </Text>
              </View>
            ) : (
              <ScrollView
                style={styles.scroll}
                contentContainerStyle={[
                  styles.content,

                  {
                    paddingHorizontal: 48 * s,
                    paddingTop: 30 * s,
                    paddingBottom: 40 * s,
                  },
                ]}
                showsVerticalScrollIndicator={false}
              >
                {/* TITLE */}

                <FadeInView>
                  <View
                    style={{
                      marginBottom: 22 * s,
                    }}
                  >
                    <Text
                      style={[
                        styles.title,

                        {
                          fontSize: 30 * fs,
                          lineHeight: 38 * fs,
                        },
                      ]}
                    >
                      Settings
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
                      Manage your administrator account, security, and session.
                    </Text>
                  </View>
                </FadeInView>

                {/* ==================================================
                    PROFILE SUMMARY
                ================================================== */}

                <FadeInView delay={50}>
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
                          {adminInitials}
                        </Text>
                      </View>

                      <View style={styles.flexFill}>
                        <Text
                          numberOfLines={1}
                          style={[
                            styles.profileName,

                            {
                              fontSize: 23 * fs,
                            },
                          ]}
                        >
                          {adminName}
                        </Text>

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
                          {source?.email ||
                            'Email unavailable'}
                        </Text>

                        {account?.created_at ? (
                          <Text
                            style={[
                              styles.mutedText,

                              {
                                fontSize: 12 * fs,
                                marginTop: 6 * s,
                              },
                            ]}
                          >
                            Account created{' '}
                            {formatDateTime(
                              account.created_at
                            )}
                          </Text>
                        ) : null}
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
                      <View
                        style={[
                          styles.roleBadge,

                          {
                            height: 38 * s,
                            borderRadius: 8 * s,
                            paddingHorizontal: 13 * s,
                            gap: 6 * s,
                          },
                        ]}
                      >
                        <MaterialIcons
                          name="admin-panel-settings"
                          size={17 * s}
                          color={COLORS.redBright}
                        />

                        <Text
                          style={[
                            styles.roleBadgeText,

                            {
                              fontSize: 12 * fs,
                            },
                          ]}
                        >
                          Administrator
                        </Text>
                      </View>

                      {account ? (
                        <View
                          style={[
                            styles.roleBadge,
                            account.is_active === false
                              ? styles.inactiveBadge
                              : styles.activeBadge,

                            {
                              height: 38 * s,
                              borderRadius: 8 * s,
                              paddingHorizontal: 13 * s,
                            },
                          ]}
                        >
                          <Text
                            style={[
                              styles.roleBadgeText,

                              {
                                fontSize: 12 * fs,
                                color:
                                  account.is_active === false
                                    ? COLORS.redBright
                                    : COLORS.green,
                              },
                            ]}
                          >
                            {account.is_active === false
                              ? 'Inactive'
                              : 'Active'}
                          </Text>
                        </View>
                      ) : null}
                    </View>
                  </View>
                </FadeInView>

                {/* LOAD ERROR */}

                {loadError ? (
                  <View
                    style={[
                      styles.errorBanner,

                      {
                        padding: 14 * s,
                        borderRadius: 12 * s,
                        marginBottom: 18 * s,
                        gap: 10 * s,
                      },
                    ]}
                  >
                    <MaterialIcons
                      name="error-outline"
                      size={21 * s}
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
                      Unable to load your account from the server: {loadError}
                    </Text>

                    <Pressable
                      onPress={loadSettings}
                      style={({ pressed }) => [
                        styles.smallButton,

                        {
                          height: 34 * s,
                          paddingHorizontal: 14 * s,
                          borderRadius: 8 * s,
                        },

                        pressed &&
                          styles.buttonPressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.smallButtonText,

                          {
                            fontSize: 12 * fs,
                          },
                        ]}
                      >
                        Retry
                      </Text>
                    </Pressable>
                  </View>
                ) : null}

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
                    delay={100}
                    style={styles.leftColumn}
                  >
                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="person-outline"
                      title="Administrator Profile"
                      action={
                        account ? (
                          <SmallAction
                            label="Edit Profile"
                            icon="edit"
                            scale={s}
                            fontScale={fs}
                            onPress={openProfileForm}
                          />
                        ) : null
                      }
                    >
                      {account ? (
                        <InfoGrid>
                          <InfoItem
                            fontScale={fs}
                            label="First Name"
                            value={account.first_name || '—'}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Last Name"
                            value={account.last_name || '—'}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Middle Name"
                            value={account.middle_name || '—'}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Suffix"
                            value={account.suffix || '—'}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Email Address"
                            value={account.email || '—'}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Phone Number"
                            value={account.phone || '—'}
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Role"
                            value="Administrator"
                            highlight
                          />

                          <InfoItem
                            fontScale={fs}
                            label="Last Updated"
                            value={formatDateTime(
                              account.updated_at
                            )}
                          />
                        </InfoGrid>
                      ) : (
                        <Text
                          style={[
                            styles.mutedText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          Profile details are unavailable until your account loads.
                        </Text>
                      )}
                    </SectionCard>

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="lock-outline"
                      title="Account Security"
                    >
                      <SettingsRow
                        scale={s}
                        fontScale={fs}
                        icon="password"
                        title="Change Password"
                        description="Requires your current password. You will be signed out and asked to sign in again."
                        onPress={openPasswordForm}
                      />

                      <SettingsRow
                        scale={s}
                        fontScale={fs}
                        icon="alternate-email"
                        title="Change Email Address"
                        description="Update the email used to sign in to the Admin Portal. You will be signed out afterwards."
                        onPress={openEmailForm}
                        last
                      />
                    </SectionCard>
                  </FadeInView>

                  {/* RIGHT */}

                  <FadeInView
                    delay={150}
                    style={styles.rightColumn}
                  >
                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="devices"
                      title="This Device"
                    >
                      <DeviceRow
                        scale={s}
                        fontScale={fs}
                        label="Signed in as"
                        value={source?.email || '—'}
                      />

                      <DeviceRow
                        scale={s}
                        fontScale={fs}
                        label="Remember me"
                        value={
                          rememberMe === null
                            ? '—'
                            : rememberMe
                              ? 'On'
                              : 'Off'
                        }
                      />

                      <DeviceRow
                        scale={s}
                        fontScale={fs}
                        label="Platform"
                        value={formatPlatform(Platform.OS)}
                      />

                      <DeviceRow
                        scale={s}
                        fontScale={fs}
                        label="API server"
                        value={API_URL}
                        last
                      />
                    </SectionCard>

                    <SectionCard
                      scale={s}
                      fontScale={fs}
                      icon="logout"
                      title="Sign Out"
                    >
                      <Text
                        style={[
                          styles.mutedText,

                          {
                            fontSize: 13 * fs,
                            lineHeight: 20 * fs,
                          },
                        ]}
                      >
                        Ends your administrator session on the server and removes it from this device.
                      </Text>

                      <Pressable
                        disabled={signingOut}
                        onPress={openSignOut}
                        style={({ pressed }) => [
                          styles.signOutButton,

                          {
                            height: 48 * s,
                            borderRadius: 10 * s,
                            marginTop: 16 * s,
                            gap: 7 * s,
                          },

                          signingOut &&
                            styles.disabledButton,

                          pressed &&
                            !signingOut &&
                            styles.buttonPressed,
                        ]}
                      >
                        {signingOut ? (
                          <ActivityIndicator
                            color={COLORS.redBright}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="logout"
                              size={20 * s}
                              color={COLORS.redBright}
                            />

                            <Text
                              style={[
                                styles.signOutText,

                                {
                                  fontSize: 13 * fs,
                                },
                              ]}
                            >
                              Sign Out
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </SectionCard>
                  </FadeInView>
                </View>
              </ScrollView>
            )}

            <AdminBottomNav activeTab="settings" />
          </SafeAreaView>
        </LinearGradient>
      </View>

      {/* ========================================================
          EDIT PROFILE
      ======================================================== */}

      <FormModalShell
        visible={formModal === 'profile'}
        scale={s}
        fontScale={fs}
        icon="edit"
        title="Edit Profile"
        description="Update your administrator name and contact number."
        error={formError}
        saving={saving}
        submitLabel="Save Changes"
        onClose={closeFormModal}
        onSubmit={saveProfile}
      >
        <View
          style={[
            styles.row,

            {
              gap: 12 * s,
            },
          ]}
        >
          <FormField
            scale={s}
            fontScale={fs}
            label="First Name *"
            value={firstName}
            onChangeText={setFirstName}
            style={styles.flexFill}
          />

          <FormField
            scale={s}
            fontScale={fs}
            label="Last Name *"
            value={lastName}
            onChangeText={setLastName}
            style={styles.flexFill}
          />
        </View>

        <View
          style={[
            styles.row,

            {
              gap: 12 * s,
            },
          ]}
        >
          <FormField
            scale={s}
            fontScale={fs}
            label="Middle Name"
            value={middleName}
            onChangeText={setMiddleName}
            style={styles.flexFill}
          />

          <FormField
            scale={s}
            fontScale={fs}
            label="Suffix"
            value={suffix}
            onChangeText={setSuffix}
            style={{ width: 120 * s }}
          />
        </View>

        <FormField
          scale={s}
          fontScale={fs}
          label="Phone Number"
          value={phone}
          onChangeText={setPhone}
          keyboardType="phone-pad"
        />
      </FormModalShell>

      {/* ========================================================
          CHANGE PASSWORD
      ======================================================== */}

      <FormModalShell
        visible={formModal === 'password'}
        scale={s}
        fontScale={fs}
        icon="password"
        title="Change Password"
        description="You will be signed out after your password is changed."
        error={formError}
        saving={saving}
        submitLabel="Change Password"
        onClose={closeFormModal}
        onSubmit={savePassword}
      >
        <FormField
          scale={s}
          fontScale={fs}
          label="Current Password"
          value={currentPassword}
          onChangeText={setCurrentPassword}
          secure
        />

        <FormField
          scale={s}
          fontScale={fs}
          label="New Password"
          value={newPassword}
          onChangeText={setNewPassword}
          secure
        />

        <View
          style={[
            styles.rulesPanel,

            {
              padding: 12 * s,
              borderRadius: 10 * s,
              marginBottom: 14 * s,
              gap: 6 * s,
            },
          ]}
        >
          {PASSWORD_RULES.map(rule => {
            const met =
              rule.test(newPassword);

            return (
              <View
                key={rule.label}
                style={[
                  styles.row,

                  {
                    alignItems: 'center',
                    gap: 7 * s,
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    met
                      ? 'check-circle'
                      : 'radio-button-unchecked'
                  }
                  size={16 * s}
                  color={
                    met
                      ? COLORS.green
                      : COLORS.muted
                  }
                />

                <Text
                  style={[
                    styles.mutedText,

                    {
                      fontSize: 12 * fs,
                    },

                    met && {
                      color: COLORS.soft,
                    },
                  ]}
                >
                  {rule.label}
                </Text>
              </View>
            );
          })}
        </View>

        <FormField
          scale={s}
          fontScale={fs}
          label="Confirm New Password"
          value={confirmPassword}
          onChangeText={setConfirmPassword}
          secure
          hint={
            confirmPassword &&
            confirmPassword !== newPassword
              ? 'Passwords do not match.'
              : undefined
          }
        />
      </FormModalShell>

      {/* ========================================================
          CHANGE EMAIL
      ======================================================== */}

      <FormModalShell
        visible={formModal === 'email'}
        scale={s}
        fontScale={fs}
        icon="alternate-email"
        title="Change Email Address"
        description={`Current email: ${source?.email || '—'}. You will be signed out afterwards.`}
        error={formError}
        saving={saving}
        submitLabel="Change Email"
        onClose={closeFormModal}
        onSubmit={saveEmail}
      >
        <FormField
          scale={s}
          fontScale={fs}
          label="New Email Address"
          value={newEmail}
          onChangeText={setNewEmail}
          keyboardType="email-address"
        />

        <FormField
          scale={s}
          fontScale={fs}
          label="Confirm New Email"
          value={confirmEmail}
          onChangeText={setConfirmEmail}
          keyboardType="email-address"
          hint={
            confirmEmail &&
            confirmEmail.trim().toLowerCase() !==
              newEmail.trim().toLowerCase()
              ? 'Email addresses do not match.'
              : undefined
          }
        />

        <FormField
          scale={s}
          fontScale={fs}
          label="Current Password"
          value={emailPassword}
          onChangeText={setEmailPassword}
          secure
        />
      </FormModalShell>

      {/* ========================================================
          MESSAGE / CONFIRM MODAL
      ======================================================== */}

      <ActionModal
        state={actionModal}
        scale={s}
        fontScale={fs}
        onClose={closeActionModal}
        onConfirm={handleActionModalConfirm}
      />
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
  action,
  children,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  action?: ReactNode;
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
          styles.sectionHeader,

          {
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
            styles.flexFill,

            {
              fontSize: 16 * fontScale,
            },
          ]}
        >
          {title}
        </Text>

        {action}
      </View>

      {children}
    </View>
  );
}

function SmallAction({
  label,
  icon,
  scale,
  fontScale,
  onPress,
}: {
  label: string;
  icon: IconName;
  scale: number;
  fontScale: number;
  onPress: () => void;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.smallButton,

        {
          height: 34 * scale,
          paddingHorizontal: 12 * scale,
          borderRadius: 8 * scale,
          gap: 6 * scale,
        },

        pressed &&
          styles.buttonPressed,
      ]}
    >
      <MaterialIcons
        name={icon}
        size={16 * scale}
        color={COLORS.soft}
      />

      <Text
        style={[
          styles.smallButtonText,

          {
            fontSize: 12 * fontScale,
          },
        ]}
      >
        {label}
      </Text>
    </Pressable>
  );
}

// ============================================================
// INFO GRID / ITEM
// ============================================================

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
  highlight = false,
}: {
  fontScale: number;
  label: string;
  value: string;
  highlight?: boolean;
}) {
  return (
    <View style={styles.infoItem}>
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
            marginTop: 4,
            lineHeight: 19 * fontScale,
          },

          highlight &&
            styles.infoHighlight,
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// SETTINGS ROW
// ============================================================

function SettingsRow({
  scale,
  fontScale,
  icon,
  title,
  description,
  onPress,
  last = false,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  description: string;
  onPress: () => void;
  last?: boolean;
}) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        styles.settingsRow,

        {
          paddingVertical: 14 * scale,
          gap: 13 * scale,
        },

        last &&
          styles.noBorder,

        pressed &&
          styles.rowPressed,
      ]}
    >
      <View
        style={[
          styles.rowIcon,

          {
            width: 40 * scale,
            height: 40 * scale,
            borderRadius: 10 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={20 * scale}
          color={COLORS.soft}
        />
      </View>

      <View style={styles.flexFill}>
        <Text
          style={[
            styles.rowTitle,

            {
              fontSize: 14 * fontScale,
            },
          ]}
        >
          {title}
        </Text>

        <Text
          style={[
            styles.mutedText,

            {
              fontSize: 12 * fontScale,
              lineHeight: 18 * fontScale,
              marginTop: 2 * scale,
            },
          ]}
        >
          {description}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={22 * scale}
        color={COLORS.muted}
      />
    </Pressable>
  );
}

// ============================================================
// DEVICE ROW
// ============================================================

function DeviceRow({
  scale,
  fontScale,
  label,
  value,
  last = false,
}: {
  scale: number;
  fontScale: number;
  label: string;
  value: string;
  last?: boolean;
}) {
  return (
    <View
      style={[
        styles.deviceRow,

        {
          paddingVertical: 11 * scale,
        },

        last &&
          styles.noBorder,
      ]}
    >
      <Text
        style={[
          styles.mutedText,

          {
            fontSize: 12.5 * fontScale,
          },
        ]}
      >
        {label}
      </Text>

      <Text
        numberOfLines={1}
        style={[
          styles.deviceValue,

          {
            fontSize: 13 * fontScale,
            marginLeft: 12 * scale,
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

// ============================================================
// FORM FIELD
// ============================================================

function FormField({
  scale,
  fontScale,
  label,
  value,
  onChangeText,
  secure = false,
  keyboardType,
  hint,
  style,
}: {
  scale: number;
  fontScale: number;
  label: string;
  value: string;
  onChangeText: (value: string) => void;
  secure?: boolean;
  keyboardType?: ComponentProps<typeof TextInput>['keyboardType'];
  hint?: string;
  style?: object;
}) {
  const [hidden, setHidden] = useState(true);

  return (
    <View
      style={[
        {
          marginBottom: 14 * scale,
        },

        style,
      ]}
    >
      <Text
        style={[
          styles.infoLabel,

          {
            fontSize: 11 * fontScale,
            marginBottom: 7 * scale,
          },
        ]}
      >
        {label}
      </Text>

      <View
        style={[
          styles.inputWrap,

          {
            height: 46 * scale,
            borderRadius: 10 * scale,
            paddingHorizontal: 13 * scale,
          },

          hint &&
            styles.inputWrapError,
        ]}
      >
        <TextInput
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secure && hidden}
          keyboardType={keyboardType}
          autoCapitalize={
            secure ||
            keyboardType === 'email-address'
              ? 'none'
              : 'words'
          }
          autoCorrect={false}
          placeholderTextColor={COLORS.muted}
          style={[
            styles.input,

            {
              fontSize: 13.5 * fontScale,
            },
          ]}
        />

        {secure ? (
          <Pressable
            onPress={() =>
              setHidden(value => !value)
            }
            hitSlop={8}
          >
            <MaterialIcons
              name={
                hidden
                  ? 'visibility'
                  : 'visibility-off'
              }
              size={19 * scale}
              color={COLORS.muted}
            />
          </Pressable>
        ) : null}
      </View>

      {hint ? (
        <Text
          style={[
            styles.fieldHint,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 5 * scale,
            },
          ]}
        >
          {hint}
        </Text>
      ) : null}
    </View>
  );
}

// ============================================================
// FORM MODAL SHELL
// ============================================================

function FormModalShell({
  visible,
  scale,
  fontScale,
  icon,
  title,
  description,
  error,
  saving,
  submitLabel,
  onClose,
  onSubmit,
  children,
}: {
  visible: boolean;
  scale: number;
  fontScale: number;
  icon: IconName;
  title: string;
  description: string;
  error: string;
  saving: boolean;
  submitLabel: string;
  onClose: () => void;
  onSubmit: () => void;
  children: ReactNode;
}) {
  return (
    <Modal
      transparent
      visible={visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={onClose}
    >
      <KeyboardAvoidingView
        behavior={
          Platform.OS === 'ios'
            ? 'padding'
            : undefined
        }
        style={styles.modalBackdrop}
      >
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={onClose}
        />

        <View
          style={[
            styles.formCard,

            {
              width: 560 * scale,
              maxWidth: '92%',
              borderRadius: 18 * scale,
              padding: 26 * scale,
            },
          ]}
        >
          <View
            style={[
              styles.row,

              {
                alignItems: 'center',
                gap: 12 * scale,
                marginBottom: 20 * scale,
              },
            ]}
          >
            <View
              style={[
                styles.sectionIcon,

                {
                  width: 44 * scale,
                  height: 44 * scale,
                  borderRadius: 11 * scale,
                },
              ]}
            >
              <MaterialIcons
                name={icon}
                size={23 * scale}
                color={COLORS.redBright}
              />
            </View>

            <View style={styles.flexFill}>
              <Text
                style={[
                  styles.sectionTitle,

                  {
                    fontSize: 19 * fontScale,
                  },
                ]}
              >
                {title}
              </Text>

              <Text
                style={[
                  styles.mutedText,

                  {
                    fontSize: 12.5 * fontScale,
                    lineHeight: 18 * fontScale,
                    marginTop: 2 * scale,
                  },
                ]}
              >
                {description}
              </Text>
            </View>

            <Pressable
              disabled={saving}
              onPress={onClose}
              hitSlop={8}
            >
              <MaterialIcons
                name="close"
                size={22 * scale}
                color={COLORS.muted}
              />
            </Pressable>
          </View>

          {children}

          {error ? (
            <View
              style={[
                styles.errorBanner,

                {
                  padding: 12 * scale,
                  borderRadius: 10 * scale,
                  gap: 8 * scale,
                  marginBottom: 4 * scale,
                },
              ]}
            >
              <MaterialIcons
                name="error-outline"
                size={18 * scale}
                color={COLORS.redBright}
              />

              <Text
                style={[
                  styles.errorBannerText,

                  {
                    fontSize: 12.5 * fontScale,
                  },
                ]}
              >
                {error}
              </Text>
            </View>
          ) : null}

          <View
            style={[
              styles.row,

              {
                gap: 10 * scale,
                marginTop: 14 * scale,
              },
            ]}
          >
            <Pressable
              disabled={saving}
              onPress={onClose}
              style={({ pressed }) => [
                styles.modalCancelButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                },

                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.modalCancelText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                Cancel
              </Text>
            </Pressable>

            <Pressable
              disabled={saving}
              onPress={onSubmit}
              style={({ pressed }) => [
                styles.modalPrimaryButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                  backgroundColor: COLORS.red,
                },

                saving &&
                  styles.disabledButton,

                pressed &&
                  !saving &&
                  styles.buttonPressed,
              ]}
            >
              {saving ? (
                <ActivityIndicator
                  color={COLORS.white}
                />
              ) : (
                <Text
                  style={[
                    styles.modalPrimaryText,

                    {
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  {submitLabel}
                </Text>
              )}
            </Pressable>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

// ============================================================
// ACTION MODAL
// (same design as the Donor Application review modal)
// ============================================================

function ActionModal({
  state,
  scale,
  fontScale,
  onClose,
  onConfirm,
}: {
  state: ActionModalState;
  scale: number;
  fontScale: number;
  onClose: () => void;
  onConfirm: () => void;
}) {
  const accent =
    getModalAccent(state.variant);

  // A message with a follow-up action (e.g. "sign in again")
  // must be confirmed, not dismissed by tapping outside.
  const dismissible =
    state.showCancel ||
    !state.onConfirm;

  return (
    <Modal
      transparent
      visible={state.visible}
      animationType="fade"
      statusBarTranslucent
      onRequestClose={
        dismissible
          ? onClose
          : onConfirm
      }
    >
      <View style={styles.modalBackdrop}>
        <Pressable
          style={StyleSheet.absoluteFill}
          onPress={
            dismissible
              ? onClose
              : undefined
          }
        />

        <View
          style={[
            styles.modalCard,

            {
              width: 500 * scale,
              maxWidth: '88%',
              borderRadius: 18 * scale,
              padding: 26 * scale,
              borderColor: accent,
            },
          ]}
        >
          <View
            style={[
              styles.modalIconWrap,

              {
                width: 56 * scale,
                height: 56 * scale,
                borderRadius: 28 * scale,
                backgroundColor:
                  getModalTint(state.variant),
              },
            ]}
          >
            <MaterialIcons
              name={getModalIcon(state.variant)}
              size={29 * scale}
              color={accent}
            />
          </View>

          <Text
            style={[
              styles.modalTitle,

              {
                fontSize: 20 * fontScale,
                lineHeight: 27 * fontScale,
                marginTop: 17 * scale,
              },
            ]}
          >
            {state.title}
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
            {state.message}
          </Text>

          <View
            style={[
              styles.modalActions,

              {
                gap: 10 * scale,
                marginTop: 24 * scale,
              },
            ]}
          >
            {state.showCancel ? (
              <Pressable
                onPress={onClose}
                style={({ pressed }) => [
                  styles.modalCancelButton,

                  {
                    height: 48 * scale,
                    borderRadius: 10 * scale,
                  },

                  pressed &&
                    styles.buttonPressed,
                ]}
              >
                <Text
                  style={[
                    styles.modalCancelText,

                    {
                      fontSize: 13 * fontScale,
                    },
                  ]}
                >
                  Cancel
                </Text>
              </Pressable>
            ) : null}

            <Pressable
              onPress={onConfirm}
              style={({ pressed }) => [
                styles.modalPrimaryButton,

                {
                  height: 48 * scale,
                  borderRadius: 10 * scale,
                  backgroundColor:
                    getModalPrimaryColor(
                      state.variant
                    ),
                },

                !state.showCancel &&
                  styles.modalSingleButton,

                pressed &&
                  styles.buttonPressed,
              ]}
            >
              <Text
                style={[
                  styles.modalPrimaryText,

                  {
                    fontSize: 13 * fontScale,
                  },
                ]}
              >
                {state.confirmLabel}
              </Text>
            </Pressable>
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ============================================================
// HELPERS
// ============================================================

function getModalAccent(
  variant: ActionModalVariant
) {
  switch (variant) {
    case 'success':
      return COLORS.green;

    case 'warning':
      return COLORS.orange;

    case 'reject':
    case 'error':
      return COLORS.redBright;

    default:
      return COLORS.blue;
  }
}

function getModalTint(
  variant: ActionModalVariant
) {
  switch (variant) {
    case 'success':
      return 'rgba(53,201,130,0.12)';

    case 'warning':
      return 'rgba(243,163,74,0.12)';

    case 'reject':
    case 'error':
      return 'rgba(239,51,64,0.12)';

    default:
      return 'rgba(74,140,255,0.12)';
  }
}

function getModalPrimaryColor(
  variant: ActionModalVariant
) {
  if (variant === 'reject') {
    return COLORS.redDark;
  }

  if (variant === 'success') {
    return COLORS.green;
  }

  if (variant === 'warning') {
    return COLORS.orange;
  }

  return COLORS.red;
}

function getModalIcon(
  variant: ActionModalVariant
): IconName {
  switch (variant) {
    case 'success':
      return 'check-circle';

    case 'warning':
      return 'warning-amber';

    case 'reject':
      return 'logout';

    case 'error':
      return 'error-outline';

    default:
      return 'info-outline';
  }
}

function formatPlatform(
  os: string
) {
  switch (os) {
    case 'ios':
      return 'iOS / iPadOS';

    case 'android':
      return 'Android';

    case 'web':
      return 'Web browser';

    default:
      return os;
  }
}

function formatDateTime(
  value?: string | null
) {
  if (!value) {
    return '—';
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
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

  mutedText: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  loadingArea: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  // TITLE

  title: {
    color: COLORS.white,
    fontFamily: 'Poppins_700Bold',
  },

  subtitle: {
    color: COLORS.muted,
    fontFamily: 'Inter_400Regular',
  },

  // PROFILE CARD

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

  roleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: 'rgba(239,51,64,0.50)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  roleBadgeText: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  activeBadge: {
    borderColor: 'rgba(53,201,130,0.50)',
    backgroundColor: 'rgba(53,201,130,0.12)',
  },

  inactiveBadge: {
    borderColor: 'rgba(239,51,64,0.50)',
    backgroundColor: 'rgba(239,51,64,0.12)',
  },

  // ERROR BANNER

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

  // SECTION CARD

  sectionCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
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

  smallButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  smallButtonText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
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

  infoHighlight: {
    color: COLORS.redBright,
    fontFamily: 'Poppins_600SemiBold',
  },

  // ROWS

  settingsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  rowPressed: {
    opacity: 0.75,
  },

  rowIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardLight,
  },

  rowTitle: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  deviceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(36,53,84,0.58)',
  },

  deviceValue: {
    flexShrink: 1,
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
    textAlign: 'right',
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  signOutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.redBright,
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  signOutText: {
    color: COLORS.redBright,
    fontFamily: 'Inter_600SemiBold',
  },

  // FORMS

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  inputWrapError: {
    borderColor: 'rgba(239,51,64,0.70)',
  },

  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: COLORS.white,
    fontFamily: 'Inter_400Regular',
    outlineStyle: 'none',
  } as any,

  fieldHint: {
    color: COLORS.redBright,
    fontFamily: 'Inter_500Medium',
  },

  rulesPanel: {
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: 'rgba(16,26,53,0.6)',
  },

  // BUTTON STATES

  disabledButton: {
    opacity: 0.45,
  },

  buttonPressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },

  // MODALS

  modalBackdrop: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    backgroundColor: 'rgba(2,4,10,0.78)',
  },

  formCard: {
    borderWidth: 1,
    borderColor: COLORS.border,
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

  modalIconWrap: {
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

  modalActions: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
  },

  modalCancelButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  modalPrimaryButton: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSingleButton: {
    maxWidth: 190,
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  modalCancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  modalPrimaryText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },
});
