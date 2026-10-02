import {
  useCallback,
  useState,
} from 'react';

import {
  KeyboardAvoidingView,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
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
  changeEmail,
  changePassword,
  deactivateAccount,
  deleteAccountPermanently,
  getCurrentUser,
} from '../../lib/api';

import {
  clearSession,
  getAccessToken,
} from '../../lib/session';

import AuthField from '../../components/AuthField';

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
  lightMuted: '#9A9A9A',

  border: '#EFE3E3',

  pinkSoft: '#FFF1F1',

  green: '#159447',
  greenSoft: '#EAF7EF',

  graySoft: '#F5EFEF',
};

// ============================================================
// ACCOUNT & SECURITY
// ============================================================

export default function AccountSecurityScreen() {
  // ==========================================================
  // ACCOUNT DATA
  // ==========================================================

  const [
    profile,
    setProfile,
  ] = useState<any>(
    null
  );

  const [
    loading,
    setLoading,
  ] = useState(
    true
  );

  const [
    errorMessage,
    setErrorMessage,
  ] = useState(
    ''
  );

  // ==========================================================
  // CHANGE EMAIL
  // ==========================================================

  const [
    emailModalVisible,
    setEmailModalVisible,
  ] = useState(
    false
  );

  const [
    changingEmail,
    setChangingEmail,
  ] = useState(
    false
  );

  const [
    emailCurrentPassword,
    setEmailCurrentPassword,
  ] = useState(
    ''
  );

  const [
    newEmail,
    setNewEmail,
  ] = useState(
    ''
  );

  const [
    confirmEmail,
    setConfirmEmail,
  ] = useState(
    ''
  );

  const [
    emailModalError,
    setEmailModalError,
  ] = useState(
    ''
  );

  const [
    showEmailPassword,
    setShowEmailPassword,
  ] = useState(
    false
  );

  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  const [
    passwordModalVisible,
    setPasswordModalVisible,
  ] = useState(
    false
  );

  const [
    changingPassword,
    setChangingPassword,
  ] = useState(
    false
  );

  const [
    currentPassword,
    setCurrentPassword,
  ] = useState(
    ''
  );

  const [
    newPassword,
    setNewPassword,
  ] = useState(
    ''
  );

  const [
    confirmPassword,
    setConfirmPassword,
  ] = useState(
    ''
  );

  const [
    passwordModalError,
    setPasswordModalError,
  ] = useState(
    ''
  );

  const [
    showCurrentPassword,
    setShowCurrentPassword,
  ] = useState(
    false
  );

  const [
    showNewPassword,
    setShowNewPassword,
  ] = useState(
    false
  );

  const [
    showConfirmPassword,
    setShowConfirmPassword,
  ] = useState(
    false
  );

  // ==========================================================
  // DEACTIVATE ACCOUNT
  // ==========================================================

  const [
    deactivateModalVisible,
    setDeactivateModalVisible,
  ] = useState(
    false
  );

  const [
    deactivating,
    setDeactivating,
  ] = useState(
    false
  );

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  const [
    deleteModalVisible,
    setDeleteModalVisible,
  ] = useState(
    false
  );

  const [
    deletingAccount,
    setDeletingAccount,
  ] = useState(
    false
  );

  const [
    deletePassword,
    setDeletePassword,
  ] = useState(
    ''
  );

  const [
    deleteConfirmation,
    setDeleteConfirmation,
  ] = useState(
    ''
  );

  const [
    deleteModalError,
    setDeleteModalError,
  ] = useState(
    ''
  );

  const [
    showDeletePassword,
    setShowDeletePassword,
  ] = useState(
    false
  );

  // ==========================================================
  // COMPLETION MODAL
  // ==========================================================

  const [
    completionModalVisible,
    setCompletionModalVisible,
  ] = useState(
    false
  );

  const [
    completionTitle,
    setCompletionTitle,
  ] = useState(
    ''
  );

  const [
    completionMessage,
    setCompletionMessage,
  ] = useState(
    ''
  );

  // ==========================================================
  // LOAD ACCOUNT
  // ==========================================================

  const loadAccount =
    useCallback(
      async () => {
        try {
          setLoading(
            true
          );

          setErrorMessage(
            ''
          );

          const token =
            await getAccessToken();

          if (!token) {
            router.replace(
              '/'
            );

            return;
          }

          const result =
            await getCurrentUser(
              token
            );

          if (
            !result?.user
          ) {
            throw new Error(
              'Unable to load your account information.'
            );
          }

          setProfile(
            result.user
          );
        } catch (error) {
          console.log(
            'ACCOUNT SECURITY LOAD ERROR:',
            error
          );

          setErrorMessage(
            error instanceof Error
              ? error.message
              : 'Unable to load your account information.'
          );
        } finally {
          setLoading(
            false
          );
        }
      },
      []
    );

  // ==========================================================
  // REFRESH
  // ==========================================================

  useFocusEffect(
    useCallback(
      () => {
        loadAccount();
      },
      [
        loadAccount,
      ]
    )
  );

  // ==========================================================
  // DISPLAY VALUES
  // ==========================================================

  const email =
    profile?.email ||
    'Email unavailable';

  const role =
    profile?.role ===
      'admin'
      ? 'Administrator'
      : 'Hemo-Hero User';

  const isAdmin =
    profile?.role ===
    'admin';

  const accountStatus =
    profile?.is_active ===
      false
      ? 'Inactive'
      : 'Active';

  // ==========================================================
  // PASSWORD REQUIREMENTS
  // ==========================================================

  const passwordRequirements = {
    length:
      newPassword.length >=
      8,

    lowercase:
      /[a-z]/.test(
        newPassword
      ),

    uppercase:
      /[A-Z]/.test(
        newPassword
      ),

    number:
      /[0-9]/.test(
        newPassword
      ),

    special:
      /[^A-Za-z0-9]/.test(
        newPassword
      ),
  };

  const passwordValid =
    Object.values(
      passwordRequirements
    ).every(
      Boolean
    );

  // ==========================================================
  // CHANGE EMAIL
  // ==========================================================

  function openChangeEmail() {
    setEmailCurrentPassword(
      ''
    );

    setNewEmail(
      ''
    );

    setConfirmEmail(
      ''
    );

    setEmailModalError(
      ''
    );

    setShowEmailPassword(
      false
    );

    setEmailModalVisible(
      true
    );
  }

  function closeChangeEmail() {
    if (
      changingEmail
    ) {
      return;
    }

    setEmailModalVisible(
      false
    );
  }

  async function performChangeEmail() {
    if (
      changingEmail
    ) {
      return;
    }

    const cleanNewEmail =
      newEmail
        .trim()
        .toLowerCase();

    const cleanConfirmEmail =
      confirmEmail
        .trim()
        .toLowerCase();

    setEmailModalError(
      ''
    );

    if (
      !emailCurrentPassword
    ) {
      setEmailModalError(
        'Enter your current password.'
      );

      return;
    }

    if (
      !cleanNewEmail ||
      !cleanConfirmEmail
    ) {
      setEmailModalError(
        'Enter and confirm your new email address.'
      );

      return;
    }

    const emailPattern =
      /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (
      !emailPattern.test(
        cleanNewEmail
      )
    ) {
      setEmailModalError(
        'Enter a valid email address.'
      );

      return;
    }

    if (
      cleanNewEmail !==
      cleanConfirmEmail
    ) {
      setEmailModalError(
        'The email addresses do not match.'
      );

      return;
    }

    if (
      cleanNewEmail ===
      String(
        profile?.email ||
        ''
      )
        .trim()
        .toLowerCase()
    ) {
      setEmailModalError(
        'Enter a different email address.'
      );

      return;
    }

    try {
      setChangingEmail(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        await clearSession();

        router.replace(
          '/'
        );

        return;
      }

      await changeEmail(
        token,
        emailCurrentPassword,
        cleanNewEmail,
        cleanConfirmEmail
      );

      await clearSession();

      setEmailModalVisible(
        false
      );

      setCompletionTitle(
        'Email Updated'
      );

      setCompletionMessage(
        'Your email address was changed successfully. Sign in again using your new email address.'
      );

      setCompletionModalVisible(
        true
      );
    } catch (error) {
      console.log(
        'CHANGE EMAIL ERROR:',
        error
      );

      setEmailModalError(
        error instanceof Error
          ? error.message
          : 'Unable to change your email address.'
      );
    } finally {
      setChangingEmail(
        false
      );
    }
  }

  // ==========================================================
  // CHANGE PASSWORD
  // ==========================================================

  function openChangePassword() {
    setCurrentPassword(
      ''
    );

    setNewPassword(
      ''
    );

    setConfirmPassword(
      ''
    );

    setPasswordModalError(
      ''
    );

    setShowCurrentPassword(
      false
    );

    setShowNewPassword(
      false
    );

    setShowConfirmPassword(
      false
    );

    setPasswordModalVisible(
      true
    );
  }

  function closeChangePassword() {
    if (
      changingPassword
    ) {
      return;
    }

    setPasswordModalVisible(
      false
    );
  }

  async function performChangePassword() {
    if (
      changingPassword
    ) {
      return;
    }

    setPasswordModalError(
      ''
    );

    if (
      !currentPassword
    ) {
      setPasswordModalError(
        'Enter your current password.'
      );

      return;
    }

    if (
      !newPassword ||
      !confirmPassword
    ) {
      setPasswordModalError(
        'Enter and confirm your new password.'
      );

      return;
    }

    if (
      !passwordValid
    ) {
      setPasswordModalError(
        'Your new password does not meet all password requirements.'
      );

      return;
    }

    if (
      newPassword !==
      confirmPassword
    ) {
      setPasswordModalError(
        'The new passwords do not match.'
      );

      return;
    }

    if (
      currentPassword ===
      newPassword
    ) {
      setPasswordModalError(
        'Your new password must be different from your current password.'
      );

      return;
    }

    try {
      setChangingPassword(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        await clearSession();

        router.replace(
          '/'
        );

        return;
      }

      await changePassword(
        token,
        currentPassword,
        newPassword,
        confirmPassword
      );

      await clearSession();

      setPasswordModalVisible(
        false
      );

      setCompletionTitle(
        'Password Updated'
      );

      setCompletionMessage(
        'Your password was changed successfully. Sign in again using your new password.'
      );

      setCompletionModalVisible(
        true
      );
    } catch (error) {
      console.log(
        'CHANGE PASSWORD ERROR:',
        error
      );

      setPasswordModalError(
        error instanceof Error
          ? error.message
          : 'Unable to change your password.'
      );
    } finally {
      setChangingPassword(
        false
      );
    }
  }

  // ==========================================================
  // DEACTIVATE ACCOUNT
  // ==========================================================

  function openDeactivateAccount() {
    if (
      deactivating
    ) {
      return;
    }

    setDeactivateModalVisible(
      true
    );
  }

  function closeDeactivateAccount() {
    if (
      deactivating
    ) {
      return;
    }

    setDeactivateModalVisible(
      false
    );
  }

  async function performDeactivateAccount() {
    if (
      deactivating
    ) {
      return;
    }

    try {
      setDeactivating(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        await clearSession();

        router.replace(
          '/'
        );

        return;
      }

      await deactivateAccount(
        token
      );

      await clearSession();

      setDeactivateModalVisible(
        false
      );

      setCompletionTitle(
        'Account Deactivated'
      );

      setCompletionMessage(
        'Your Hemo-Hero account has been deactivated and you have been signed out.'
      );

      setCompletionModalVisible(
        true
      );
    } catch (error) {
      console.log(
        'DEACTIVATE ACCOUNT ERROR:',
        error
      );

      setDeactivateModalVisible(
        false
      );

      setErrorMessage(
        error instanceof Error
          ? error.message
          : 'Unable to deactivate your account.'
      );
    } finally {
      setDeactivating(
        false
      );
    }
  }

  // ==========================================================
  // DELETE ACCOUNT
  // ==========================================================

  function openDeleteAccount() {
    setDeletePassword(
      ''
    );

    setDeleteConfirmation(
      ''
    );

    setDeleteModalError(
      ''
    );

    setShowDeletePassword(
      false
    );

    setDeleteModalVisible(
      true
    );
  }

  function closeDeleteAccount() {
    if (
      deletingAccount
    ) {
      return;
    }

    setDeleteModalVisible(
      false
    );
  }

  const deleteConfirmationValid =
    deleteConfirmation
      .trim()
      .toUpperCase() ===
    'DELETE';

  async function performDeleteAccount() {
    if (
      deletingAccount
    ) {
      return;
    }

    setDeleteModalError(
      ''
    );

    if (
      !deletePassword
    ) {
      setDeleteModalError(
        'Enter your current password.'
      );

      return;
    }

    if (
      !deleteConfirmationValid
    ) {
      setDeleteModalError(
        'Type DELETE to confirm permanent account deletion.'
      );

      return;
    }

    try {
      setDeletingAccount(
        true
      );

      const token =
        await getAccessToken();

      if (!token) {
        await clearSession();

        router.replace(
          '/'
        );

        return;
      }

      await deleteAccountPermanently(
        token,
        deletePassword,
        deleteConfirmation
      );

      await clearSession();

      setDeleteModalVisible(
        false
      );

      setCompletionTitle(
        'Account Deleted'
      );

      setCompletionMessage(
        'Your Hemo-Hero account has been permanently deleted.'
      );

      setCompletionModalVisible(
        true
      );
    } catch (error) {
      console.log(
        'DELETE ACCOUNT ERROR:',
        error
      );

      setDeleteModalError(
        error instanceof Error
          ? error.message
          : 'Unable to permanently delete your account.'
      );
    } finally {
      setDeletingAccount(
        false
      );
    }
  }

  // ==========================================================
  // COMPLETION
  // ==========================================================

  function handleCompletionContinue() {
    setCompletionModalVisible(
      false
    );

    router.replace(
      '/'
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
              '#D2151A',
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

            <TouchableOpacity
              style={
                styles.headerButton
              }
              activeOpacity={
                0.7
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
                styles.headerCenter
              }
            >
              <Text
                style={
                  styles.headerTitle
                }
              >
                Account & Security
              </Text>

              <Text
                style={
                  styles.headerSubtitle
                }
              >
                Manage your account settings
              </Text>
            </View>

            <View
              style={
                styles.headerSpacer
              }
            />
          </LinearGradient>

          {/* ==================================================
              CONTENT
          ================================================== */}

          <ScrollView
            style={
              styles.content
            }
            contentContainerStyle={
              styles.contentContainer
            }
            showsVerticalScrollIndicator={
              false
            }
            bounces={
              false
            }
          >
            {errorMessage ? (
              <TouchableOpacity
                style={
                  styles.errorCard
                }
                activeOpacity={
                  0.8
                }
                onPress={
                  loadAccount
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
                    styles.errorContent
                  }
                >
                  <Text
                    style={
                      styles.errorTitle
                    }
                  >
                    Unable to complete request
                  </Text>

                  <Text
                    style={
                      styles.errorText
                    }
                  >
                    {errorMessage}
                  </Text>
                </View>
              </TouchableOpacity>
            ) : null}

            {/* ==================================================
                ACCOUNT
            ================================================== */}

            <SectionTitle
              title="Account"
            />

            <View
              style={
                styles.card
              }
            >
              <InfoRow
                icon="email"
                label="Email"
                value={
                  loading
                    ? 'Loading...'
                    : email
                }
              />

              <Divider />

              <InfoRow
                icon="person-outline"
                label="Account Type"
                value={
                  loading
                    ? 'Loading...'
                    : role
                }
              />

              <Divider />

              <View
                style={
                  styles.statusRow
                }
              >
                <View
                  style={
                    styles.rowIcon
                  }
                >
                  <MaterialIcons
                    name="verified-user"
                    size={19}
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
                    Account Status
                  </Text>

                  <Text
                    style={
                      styles.rowValue
                    }
                  >
                    {loading
                      ? 'Loading...'
                      : accountStatus}
                  </Text>
                </View>

                {!loading ? (
                  <View
                    style={
                      styles.statusBadge
                    }
                  >
                    <View
                      style={
                        styles.statusDot
                      }
                    />

                    <Text
                      style={
                        styles.statusBadgeText
                      }
                    >
                      {accountStatus}
                    </Text>
                  </View>
                ) : null}
              </View>
            </View>

            {/* ==================================================
                SECURITY
            ================================================== */}

            <SectionTitle
              title="Security"
            />

            <View
              style={
                styles.card
              }
            >
              <ActionRow
                icon="alternate-email"
                title="Change Email"
                subtitle="Update your account email address"
                onPress={
                  openChangeEmail
                }
              />

              <Divider />

              <ActionRow
                icon="lock-outline"
                title="Change Password"
                subtitle="Update your account password"
                onPress={
                  openChangePassword
                }
              />
            </View>

            <View
              style={
                styles.securityNote
              }
            >
              <MaterialIcons
                name="shield"
                size={18}
                color={
                  COLORS.muted
                }
              />

              <Text
                style={
                  styles.securityNoteText
                }
              >
                Your current password is required before changing your email or password.
              </Text>
            </View>

            {/* ==================================================
                ACCOUNT MANAGEMENT
            ================================================== */}

            {!loading &&
            !isAdmin ? (
              <>
                <SectionTitle
                  title="Account Management"
                />

                <View
                  style={
                    styles.card
                  }
                >
                  <ActionRow
                    icon="person-off"
                    title="Deactivate Account"
                    subtitle="Temporarily disable access to your account"
                    onPress={
                      openDeactivateAccount
                    }
                    destructive
                  />

                  <Divider />

                  <ActionRow
                    icon="delete-outline"
                    title="Delete Account"
                    subtitle="Permanently remove your account"
                    onPress={
                      openDeleteAccount
                    }
                    destructive
                  />
                </View>

                <Text
                  style={
                    styles.accountManagementNote
                  }
                >
                  Deactivation keeps your account data. Permanent deletion cannot be undone.
                </Text>
              </>
            ) : null}

            {!loading &&
            isAdmin ? (
              <>
                <SectionTitle
                  title="Account Management"
                />

                <View
                  style={
                    styles.adminCard
                  }
                >
                  <MaterialIcons
                    name="admin-panel-settings"
                    size={21}
                    color={
                      COLORS.redButton
                    }
                  />

                  <Text
                    style={
                      styles.adminText
                    }
                  >
                    Administrator accounts cannot be deactivated or permanently deleted from the mobile user application.
                  </Text>
                </View>
              </>
            ) : null}

            <Text
              style={
                styles.footerText
              }
            >
              Hemo-Hero Account Security
            </Text>
          </ScrollView>

          {/* ==================================================
              CHANGE EMAIL MODAL
          ================================================== */}

          <Modal
            visible={
              emailModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              closeChangeEmail
            }
          >
            <KeyboardAvoidingView
              style={
                styles.modalBackdrop
              }
              behavior={
                Platform.OS ===
                  'ios'
                  ? 'padding'
                  : undefined
              }
            >
              <View
                style={
                  styles.emailModalCard
                }
              >
                <View
                  style={
                    styles.modalHeader
                  }
                >
                  <View
                    style={
                      styles.modalHeaderContent
                    }
                  >
                    <Text
                      style={
                        styles.modalTitle
                      }
                    >
                      Change Email
                    </Text>

                    <Text
                      style={
                        styles.modalSubtitle
                      }
                    >
                      Enter a new email address for your Hemo-Hero account.
                    </Text>
                  </View>

                  <TouchableOpacity
                    style={
                      styles.closeButton
                    }
                    disabled={
                      changingEmail
                    }
                    onPress={
                      closeChangeEmail
                    }
                  >
                    <MaterialIcons
                      name="close"
                      size={20}
                      color={
                        COLORS.black
                      }
                    />
                  </TouchableOpacity>
                </View>

                <View
                  style={
                    styles.currentAccountBox
                  }
                >
                  <Text
                    style={
                      styles.currentAccountLabel
                    }
                  >
                    Current email
                  </Text>

                  <Text
                    style={
                      styles.currentAccountValue
                    }
                  >
                    {email}
                  </Text>
                </View>

                {emailModalError ? (
                  <ModalError
                    message={
                      emailModalError
                    }
                  />
                ) : null}

                <ModalField
                  label="New Email"
                  value={
                    newEmail
                  }
                  placeholder="Type your new email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={
                    setNewEmail
                  }
                />

                <ModalField
                  label="Confirm New Email"
                  value={
                    confirmEmail
                  }
                  placeholder="Re-enter your new email"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  onChangeText={
                    setConfirmEmail
                  }
                />

                <PasswordField
                  label="Current Password"
                  value={
                    emailCurrentPassword
                  }
                  placeholder="Type your current password"
                  visible={
                    showEmailPassword
                  }
                  onToggle={() =>
                    setShowEmailPassword(
                      current =>
                        !current
                    )
                  }
                  onChangeText={
                    setEmailCurrentPassword
                  }
                />

                <View
                  style={
                    styles.modalActions
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.cancelButton
                    }
                    disabled={
                      changingEmail
                    }
                    onPress={
                      closeChangeEmail
                    }
                  >
                    <Text
                      style={
                        styles.cancelButtonText
                      }
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.primaryButton,

                      changingEmail &&
                        styles.buttonDisabled,
                    ]}
                    disabled={
                      changingEmail
                    }
                    onPress={
                      performChangeEmail
                    }
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {changingEmail
                        ? 'Updating...'
                        : 'Update Email'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </KeyboardAvoidingView>
          </Modal>

          {/* ==================================================
              CHANGE PASSWORD MODAL
          ================================================== */}

          <Modal
            visible={
              passwordModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              closeChangePassword
            }
          >
            <KeyboardAvoidingView
              style={
                styles.modalBackdrop
              }
              behavior={
                Platform.OS ===
                  'ios'
                  ? 'padding'
                  : undefined
              }
            >
              <ScrollView
                style={
                  styles.passwordModalScrollView
                }
                contentContainerStyle={
                  styles.passwordModalScroll
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.passwordModalCard
                  }
                >
                  <View
                    style={
                      styles.passwordHeader
                    }
                  >
                    <View
                      style={
                        styles.passwordHeaderIcon
                      }
                    >
                      <MaterialIcons
                        name="lock-outline"
                        size={24}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.passwordHeaderText
                      }
                    >
                      <Text
                        style={
                          styles.passwordModalTitle
                        }
                      >
                        Change Password
                      </Text>

                      <Text
                        style={
                          styles.passwordModalSubtitle
                        }
                      >
                        Enter your current password, then create a new secure password.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.closeButton
                      }
                      disabled={
                        changingPassword
                      }
                      onPress={
                        closeChangePassword
                      }
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={
                          COLORS.black
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  {passwordModalError ? (
                    <ModalError
                      message={
                        passwordModalError
                      }
                    />
                  ) : null}

                  <View
                    style={
                      styles.passwordSection
                    }
                  >
                    <Text
                      style={
                        styles.passwordSectionTitle
                      }
                    >
                      Verify your identity
                    </Text>

                    <PasswordField
                      label="Current Password"
                      value={
                        currentPassword
                      }
                      placeholder="Type your current password"
                      visible={
                        showCurrentPassword
                      }
                      onToggle={() =>
                        setShowCurrentPassword(
                          current =>
                            !current
                        )
                      }
                      onChangeText={
                        setCurrentPassword
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.passwordSeparator
                    }
                  />

                  <View
                    style={
                      styles.passwordSection
                    }
                  >
                    <Text
                      style={
                        styles.passwordSectionTitle
                      }
                    >
                      Create new password
                    </Text>

                    <PasswordField
                      label="New Password"
                      value={
                        newPassword
                      }
                      placeholder="Type your new password"
                      visible={
                        showNewPassword
                      }
                      onToggle={() =>
                        setShowNewPassword(
                          current =>
                            !current
                        )
                      }
                      onChangeText={
                        setNewPassword
                      }
                    />

                    <View
                      style={
                        styles.requirements
                      }
                    >
                      <Text
                        style={
                          styles.requirementsTitle
                        }
                      >
                        Password must contain:
                      </Text>

                      <Requirement
                        met={
                          passwordRequirements.length
                        }
                        text="At least 8 characters"
                      />

                      <Requirement
                        met={
                          passwordRequirements.lowercase
                        }
                        text="One lowercase letter"
                      />

                      <Requirement
                        met={
                          passwordRequirements.uppercase
                        }
                        text="One uppercase letter"
                      />

                      <Requirement
                        met={
                          passwordRequirements.number
                        }
                        text="One number"
                      />

                      <Requirement
                        met={
                          passwordRequirements.special
                        }
                        text="One special character"
                      />
                    </View>

                    <PasswordField
                      label="Confirm New Password"
                      value={
                        confirmPassword
                      }
                      placeholder="Re-enter your new password"
                      visible={
                        showConfirmPassword
                      }
                      onToggle={() =>
                        setShowConfirmPassword(
                          current =>
                            !current
                        )
                      }
                      onChangeText={
                        setConfirmPassword
                      }
                    />
                  </View>

                  <Text
                    style={
                      styles.reloginNote
                    }
                  >
                    After changing your password, you will be signed out and asked to sign in again.
                  </Text>

                  <View
                    style={
                      styles.passwordModalActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.passwordCancelButton
                      }
                      disabled={
                        changingPassword
                      }
                      onPress={
                        closeChangePassword
                      }
                    >
                      <Text
                        style={
                          styles.cancelButtonText
                        }
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.passwordUpdateButton,

                        changingPassword &&
                          styles.buttonDisabled,
                      ]}
                      disabled={
                        changingPassword
                      }
                      onPress={
                        performChangePassword
                      }
                    >
                      <MaterialIcons
                        name="lock-reset"
                        size={18}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        {changingPassword
                          ? 'Updating...'
                          : 'Update Password'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>

          {/* ==================================================
              DEACTIVATE MODAL
          ================================================== */}

          <Modal
            visible={
              deactivateModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              closeDeactivateAccount
            }
          >
            <View
              style={
                styles.modalBackdrop
              }
            >
              <View
                style={
                  styles.confirmationCard
                }
              >
                <View
                  style={
                    styles.confirmationIcon
                  }
                >
                  <MaterialIcons
                    name="person-off"
                    size={28}
                    color={
                      COLORS.redButton
                    }
                  />
                </View>

                <Text
                  style={
                    styles.confirmationTitle
                  }
                >
                  Deactivate Account?
                </Text>

                <Text
                  style={
                    styles.confirmationText
                  }
                >
                  Your account will be disabled and you will be signed out. Your existing Hemo-Hero records will be preserved.
                </Text>

                <View
                  style={
                    styles.modalActions
                  }
                >
                  <TouchableOpacity
                    style={
                      styles.cancelButton
                    }
                    disabled={
                      deactivating
                    }
                    onPress={
                      closeDeactivateAccount
                    }
                  >
                    <Text
                      style={
                        styles.cancelButtonText
                      }
                    >
                      Cancel
                    </Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    style={[
                      styles.deactivateConfirmButton,

                      deactivating &&
                        styles.buttonDisabled,
                    ]}
                    disabled={
                      deactivating
                    }
                    onPress={
                      performDeactivateAccount
                    }
                  >
                    <Text
                      style={
                        styles.primaryButtonText
                      }
                    >
                      {deactivating
                        ? 'Deactivating...'
                        : 'Deactivate'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </Modal>

          {/* ==================================================
              DELETE ACCOUNT MODAL
          ================================================== */}

          <Modal
            visible={
              deleteModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              closeDeleteAccount
            }
          >
            <KeyboardAvoidingView
              style={
                styles.modalBackdrop
              }
              behavior={
                Platform.OS ===
                  'ios'
                  ? 'padding'
                  : undefined
              }
            >
              <ScrollView
                style={
                  styles.deleteModalScrollView
                }
                contentContainerStyle={
                  styles.deleteModalScrollContent
                }
                keyboardShouldPersistTaps="handled"
                showsVerticalScrollIndicator={
                  false
                }
              >
                <View
                  style={
                    styles.deleteModalCard
                  }
                >
                  <View
                    style={
                      styles.deleteModalHeader
                    }
                  >
                    <View
                      style={
                        styles.deleteModalIcon
                      }
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={27}
                        color={
                          COLORS.redButton
                        }
                      />
                    </View>

                    <View
                      style={
                        styles.deleteHeaderContent
                      }
                    >
                      <Text
                        style={
                          styles.deleteModalTitle
                        }
                      >
                        Delete Account
                      </Text>

                      <Text
                        style={
                          styles.deleteModalSubtitle
                        }
                      >
                        Permanently remove your Hemo-Hero account.
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={
                        styles.closeButton
                      }
                      disabled={
                        deletingAccount
                      }
                      onPress={
                        closeDeleteAccount
                      }
                    >
                      <MaterialIcons
                        name="close"
                        size={20}
                        color={
                          COLORS.black
                        }
                      />
                    </TouchableOpacity>
                  </View>

                  <View
                    style={
                      styles.deleteInformation
                    }
                  >
                    <Text
                      style={
                        styles.deleteInformationTitle
                      }
                    >
                      Before you continue
                    </Text>

                    <Text
                      style={
                        styles.deleteInformationText
                      }
                    >
                      Permanent deletion cannot be undone. Your account and associated user-owned Hemo-Hero records will be removed.
                    </Text>
                  </View>

                  {deleteModalError ? (
                    <ModalError
                      message={
                        deleteModalError
                      }
                    />
                  ) : null}

                  <PasswordField
                    label="Current Password"
                    value={
                      deletePassword
                    }
                    placeholder="Type your current password"
                    visible={
                      showDeletePassword
                    }
                    onToggle={() =>
                      setShowDeletePassword(
                        current =>
                          !current
                      )
                    }
                    onChangeText={
                      setDeletePassword
                    }
                  />

                  <View
                    style={
                      styles.modalField
                    }
                  >
                    <Text
                      style={
                        styles.modalFieldLabel
                      }
                    >
                      Type DELETE to confirm
                    </Text>

                    <TextInput
                      style={
                        styles.modalInput
                      }
                      value={
                        deleteConfirmation
                      }
                      placeholder="DELETE"
                      placeholderTextColor={
                        COLORS.lightMuted
                      }
                      autoCapitalize="characters"
                      autoCorrect={
                        false
                      }
                      autoComplete="off"
                      textContentType="none"
                      importantForAutofill="no"
                      editable={
                        !deletingAccount
                      }
                      onChangeText={
                        setDeleteConfirmation
                      }
                    />
                  </View>

                  <View
                    style={
                      styles.deleteModalActions
                    }
                  >
                    <TouchableOpacity
                      style={
                        styles.deleteCancelButton
                      }
                      disabled={
                        deletingAccount
                      }
                      onPress={
                        closeDeleteAccount
                      }
                    >
                      <Text
                        style={
                          styles.cancelButtonText
                        }
                      >
                        Cancel
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.deleteConfirmButton,

                        (
                          !deleteConfirmationValid ||
                          !deletePassword ||
                          deletingAccount
                        ) &&
                          styles.deleteConfirmButtonDisabled,
                      ]}
                      disabled={
                        !deleteConfirmationValid ||
                        !deletePassword ||
                        deletingAccount
                      }
                      activeOpacity={
                        0.85
                      }
                      onPress={
                        performDeleteAccount
                      }
                    >
                      <MaterialIcons
                        name="delete-outline"
                        size={18}
                        color={
                          COLORS.white
                        }
                      />

                      <Text
                        style={
                          styles.primaryButtonText
                        }
                      >
                        {deletingAccount
                          ? 'Deleting...'
                          : 'Delete Account'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </ScrollView>
            </KeyboardAvoidingView>
          </Modal>

          {/* ==================================================
              COMPLETION MODAL
          ================================================== */}

          <Modal
            visible={
              completionModalVisible
            }
            transparent
            animationType="fade"
            statusBarTranslucent
            onRequestClose={
              handleCompletionContinue
            }
          >
            <View
              style={
                styles.modalBackdrop
              }
            >
              <View
                style={
                  styles.confirmationCard
                }
              >
                <View
                  style={
                    styles.successIcon
                  }
                >
                  <MaterialIcons
                    name="check-circle"
                    size={30}
                    color={
                      COLORS.green
                    }
                  />
                </View>

                <Text
                  style={
                    styles.confirmationTitle
                  }
                >
                  {completionTitle}
                </Text>

                <Text
                  style={
                    styles.confirmationText
                  }
                >
                  {completionMessage}
                </Text>

                <TouchableOpacity
                  style={
                    styles.continueButton
                  }
                  onPress={
                    handleCompletionContinue
                  }
                >
                  <Text
                    style={
                      styles.primaryButtonText
                    }
                  >
                    Continue to Sign In
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    </View>
  );
}

// ============================================================
// SECTION TITLE
// ============================================================

function SectionTitle({
  title,
}: {
  title: string;
}) {
  return (
    <Text
      style={
        styles.sectionTitle
      }
    >
      {title}
    </Text>
  );
}

// ============================================================
// INFO ROW
// ============================================================

function InfoRow({
  icon,
  label,
  value,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  label: string;

  value: string;
}) {
  return (
    <View
      style={
        styles.infoRow
      }
    >
      <View
        style={
          styles.rowIcon
        }
      >
        <MaterialIcons
          name={
            icon
          }
          size={19}
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
          {label}
        </Text>

        <Text
          numberOfLines={
            1
          }
          style={
            styles.rowValue
          }
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// ACTION ROW
// ============================================================

function ActionRow({
  icon,
  title,
  subtitle,
  onPress,
  destructive = false,
}: {
  icon:
    keyof typeof MaterialIcons.glyphMap;

  title: string;

  subtitle: string;

  onPress:
    () => void;

  destructive?:
    boolean;
}) {
  return (
    <TouchableOpacity
      style={
        styles.actionRow
      }
      activeOpacity={
        0.7
      }
      onPress={
        onPress
      }
    >
      <View
        style={
          destructive
            ? styles.destructiveIcon
            : styles.rowIcon
        }
      >
        <MaterialIcons
          name={
            icon
          }
          size={20}
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
          style={[
            styles.actionTitle,

            destructive &&
              styles.destructiveText,
          ]}
        >
          {title}
        </Text>

        <Text
          style={
            styles.actionSubtitle
          }
        >
          {subtitle}
        </Text>
      </View>

      <MaterialIcons
        name="chevron-right"
        size={21}
        color={
          COLORS.lightMuted
        }
      />
    </TouchableOpacity>
  );
}

// ============================================================
// MODAL FIELD
// ============================================================

function ModalField({
  label,
  value,
  placeholder,
  keyboardType = 'default',
  autoCapitalize = 'sentences',
  onChangeText,
}: {
  label: string;

  value: string;

  placeholder: string;

  keyboardType?:
    | 'default'
    | 'email-address';

  autoCapitalize?:
    | 'none'
    | 'sentences';

  onChangeText:
    (value: string) => void;
}) {
  return (
    <AuthField
      label={label}
      icon={
        keyboardType ===
        'email-address'
          ? 'mail-outline'
          : 'edit'
      }
      value={value}
      placeholder={placeholder}
      keyboardType={keyboardType}
      autoCapitalize={autoCapitalize}
      autoCorrect={false}
      autoComplete="off"
      textContentType="none"
      importantForAutofill="no"
      onChangeText={onChangeText}
    />
  );
}

// ============================================================
// PASSWORD FIELD
// ============================================================

function PasswordField({
  label,
  value,
  placeholder,
  visible,
  onToggle,
  onChangeText,
}: {
  label: string;

  value: string;

  placeholder: string;

  visible: boolean;

  onToggle:
    () => void;

  onChangeText:
    (value: string) => void;
}) {
  return (
    <AuthField
      label={label}
      icon="lock-outline"
      password
      passwordVisible={visible}
      onTogglePassword={onToggle}
      value={value}
      placeholder={placeholder}
      autoCapitalize="none"
      autoCorrect={false}
      autoComplete="off"
      textContentType="none"
      importantForAutofill="no"
      onChangeText={onChangeText}
    />
  );
}

// ============================================================
// REQUIREMENT
// ============================================================

function Requirement({
  met,
  text,
}: {
  met: boolean;

  text: string;
}) {
  return (
    <View
      style={
        styles.requirementRow
      }
    >
      <MaterialIcons
        name={
          met
            ? 'check-circle'
            : 'radio-button-unchecked'
        }
        size={15}
        color={
          met
            ? COLORS.green
            : COLORS.lightMuted
        }
      />

      <Text
        style={[
          styles.requirementText,

          met &&
            styles.requirementMet,
        ]}
      >
        {text}
      </Text>
    </View>
  );
}

// ============================================================
// MODAL ERROR
// ============================================================

function ModalError({
  message,
}: {
  message: string;
}) {
  return (
    <View
      style={
        styles.modalError
      }
    >
      <MaterialIcons
        name="error-outline"
        size={17}
        color={
          COLORS.redButton
        }
      />

      <Text
        style={
          styles.modalErrorText
        }
      >
        {message}
      </Text>
    </View>
  );
}

// ============================================================
// DIVIDER
// ============================================================

function Divider() {
  return (
    <View
      style={
        styles.divider
      }
    />
  );
}

// ============================================================
// STYLES
// ============================================================

const styles =
  StyleSheet.create({
    desktopBackground: {
      flex: 1,

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
      flex: 1,

      backgroundColor:
        COLORS.redDark,
    },

    // ========================================================
    // HEADER
    // ========================================================

    header: {
      height: 88,

      paddingHorizontal: 14,

      flexDirection:
        'row',

      alignItems:
        'center',

      overflow:
        'hidden',
    },

    headerCircleLeft: {
      position:
        'absolute',

      width: 170,

      height: 170,

      borderRadius: 85,

      top: -115,

      left: -90,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerCircleRight: {
      position:
        'absolute',

      width: 180,

      height: 180,

      borderRadius: 90,

      top: -120,

      right: -95,

      backgroundColor:
        'rgba(255,255,255,0.07)',
    },

    headerButton: {
      width: 44,

      height: 44,

      alignItems:
        'center',

      justifyContent:
        'center',
    },

    headerCenter: {
      flex: 1,

      alignItems:
        'center',
    },

    headerSpacer: {
      width: 44,

      height: 44,
    },

    headerTitle: {
      color:
        COLORS.white,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 20,
    },

    headerSubtitle: {
      marginTop: 2,

      color:
        'rgba(255,255,255,0.8)',

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    // ========================================================
    // CONTENT
    // ========================================================

    content: {
      flex: 1,

      backgroundColor:
        COLORS.page,
    },

    contentContainer: {
      paddingHorizontal: 18,

      paddingTop: 20,

      paddingBottom: 34,
    },

    sectionTitle: {
      marginLeft: 2,

      marginBottom: 8,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 14.5,
    },

    card: {
      marginBottom: 22,

      paddingHorizontal: 13,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 16,

      backgroundColor:
        COLORS.card,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,

        height: 2,
      },

      shadowOpacity: 0.035,

      shadowRadius: 5,

      elevation: 1,
    },

    divider: {
      height:
        StyleSheet.hairlineWidth,

      marginLeft: 49,

      backgroundColor:
        COLORS.border,
    },

    // ========================================================
    // ROWS
    // ========================================================

    infoRow: {
      minHeight: 65,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    actionRow: {
      minHeight: 68,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    rowIcon: {
      width: 38,

      height: 38,

      marginRight: 11,

      borderRadius: 19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    destructiveIcon: {
      width: 38,

      height: 38,

      marginRight: 11,

      borderRadius: 19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        '#FFF4F4',
    },

    rowContent: {
      flex: 1,

      minWidth: 0,
    },

    rowLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    rowValue: {
      marginTop: 3,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13,
    },

    actionTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13.5,
    },

    destructiveText: {
      color:
        COLORS.redButton,
    },

    actionSubtitle: {
      marginTop: 3,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    statusRow: {
      minHeight: 65,

      flexDirection:
        'row',

      alignItems:
        'center',
    },

    statusBadge: {
      paddingHorizontal: 9,

      paddingVertical: 5,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 5,

      borderRadius: 12,

      backgroundColor:
        COLORS.greenSoft,
    },

    statusDot: {
      width: 6,

      height: 6,

      borderRadius: 3,

      backgroundColor:
        COLORS.green,
    },

    statusBadgeText: {
      color:
        COLORS.green,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 11.5,
    },

    // ========================================================
    // NOTES
    // ========================================================

    securityNote: {
      marginTop: -9,

      marginBottom: 24,

      paddingHorizontal: 11,

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 8,

      borderRadius: 11,

      backgroundColor:
        COLORS.graySoft,
    },

    securityNoteText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    accountManagementNote: {
      marginTop: -12,

      marginBottom: 24,

      marginHorizontal: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    adminCard: {
      marginBottom: 24,

      paddingHorizontal: 13,

      paddingVertical: 13,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 14,

      backgroundColor:
        COLORS.white,
    },

    adminText: {
      flex: 1,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    footerText: {
      marginTop: 2,

      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 11.5,

      textAlign:
        'center',
    },

    // ========================================================
    // ERROR
    // ========================================================

    errorCard: {
      minHeight: 58,

      marginBottom: 18,

      paddingHorizontal: 11,

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      borderWidth: 1,

      borderColor:
        '#ECB0B2',

      borderRadius: 12,

      backgroundColor:
        COLORS.pinkSoft,
    },

    errorContent: {
      flex: 1,
    },

    errorTitle: {
      color:
        COLORS.redButton,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13,
    },

    errorText: {
      marginTop: 2,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    // ========================================================
    // MODAL COMMON
    // ========================================================

    modalBackdrop: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 20,

      backgroundColor:
        'rgba(0,0,0,0.50)',
    },

    modalHeader: {
      marginBottom: 18,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      justifyContent:
        'space-between',
    },

    modalHeaderContent: {
      flex: 1,

      paddingRight: 14,
    },

    modalTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
    },

    modalSubtitle: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,

      lineHeight: 18,
    },

    closeButton: {
      width: 38,

      height: 38,

      borderRadius: 19,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.graySoft,
    },

    emailModalCard: {
      width:
        '100%',

      maxWidth: 360,

      paddingHorizontal: 22,

      paddingTop: 22,

      paddingBottom: 22,

      borderRadius: 20,

      backgroundColor:
        COLORS.white,
    },

    currentAccountBox: {
      marginBottom: 18,

      paddingHorizontal: 12,

      paddingVertical: 10,

      borderRadius: 10,

      backgroundColor:
        COLORS.graySoft,
    },

    currentAccountLabel: {
      color:
        COLORS.lightMuted,

      fontFamily:
        'Inter_500Medium',

      fontSize: 11.5,
    },

    currentAccountValue: {
      marginTop: 3,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13,
    },

    // ========================================================
    // FIELDS
    // ========================================================

    modalField: {
      marginBottom: 16,
    },

    modalFieldLabel: {
      marginBottom: 7,

      color:
        '#444449',

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12.5,
    },

    modalInput: {
      height: 48,

      paddingHorizontal: 13,

      borderWidth: 1,

      borderColor:
        '#DDDDE2',

      borderRadius: 11,

      color:
        COLORS.black,

      backgroundColor:
        '#FCFCFD',

      fontFamily:
        'Inter_400Regular',

      fontSize: 13.5,
    },

    modalError: {
      marginBottom: 16,

      paddingHorizontal: 11,

      paddingVertical: 10,

      flexDirection:
        'row',

      alignItems:
        'flex-start',

      gap: 8,

      borderRadius: 10,

      backgroundColor:
        COLORS.pinkSoft,
    },

    modalErrorText: {
      flex: 1,

      color:
        COLORS.redButton,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    // ========================================================
    // PASSWORD MODAL
    // ========================================================

    passwordModalScrollView: {
      width:
        '100%',
    },

    passwordModalScroll: {
      flexGrow: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 20,

      paddingVertical: 30,
    },

    passwordModalCard: {
      width:
        '100%',

      maxWidth: 370,

      paddingHorizontal: 24,

      paddingTop: 24,

      paddingBottom: 24,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,

        height: 8,
      },

      shadowOpacity: 0.16,

      shadowRadius: 18,

      elevation: 12,
    },

    passwordHeader: {
      marginBottom: 22,

      flexDirection:
        'row',

      alignItems:
        'flex-start',
    },

    passwordHeaderIcon: {
      width: 46,

      height: 46,

      marginRight: 11,

      borderRadius: 23,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    passwordHeaderText: {
      flex: 1,

      paddingRight: 8,
    },

    passwordModalTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
    },

    passwordModalSubtitle: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,

      lineHeight: 18,
    },

    passwordSection: {
      width:
        '100%',
    },

    passwordSectionTitle: {
      marginBottom: 13,

      color:
        COLORS.black,

      fontFamily:
        'Poppins_600SemiBold',

      fontSize: 13.5,
    },

    passwordSeparator: {
      height:
        StyleSheet.hairlineWidth,

      marginTop: 4,

      marginBottom: 20,

      backgroundColor:
        COLORS.border,
    },

    requirements: {
      marginTop: -3,

      marginBottom: 18,

      paddingHorizontal: 13,

      paddingTop: 11,

      paddingBottom: 12,

      gap: 7,

      borderRadius: 11,

      backgroundColor:
        COLORS.graySoft,
    },

    requirementsTitle: {
      marginBottom: 2,

      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 12,
    },

    requirementRow: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 7,
    },

    requirementText: {
      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    requirementMet: {
      color:
        COLORS.green,
    },

    reloginNote: {
      marginTop: 1,

      marginBottom: 20,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    passwordModalActions: {
      flexDirection:
        'row',

      gap: 10,
    },

    passwordCancelButton: {
      flex: 1,

      height: 48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.white,
    },

    passwordUpdateButton: {
      flex: 1.3,

      height: 48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 6,

      borderRadius: 11,

      backgroundColor:
        COLORS.redButton,
    },

    // ========================================================
    // DELETE MODAL
    // ========================================================

    deleteModalScrollView: {
      width:
        '100%',
    },

    deleteModalScrollContent: {
      flexGrow: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal: 20,

      paddingVertical: 30,
    },

    deleteModalCard: {
      width:
        '100%',

      maxWidth: 370,

      paddingHorizontal: 24,

      paddingTop: 24,

      paddingBottom: 24,

      borderRadius: 22,

      backgroundColor:
        COLORS.white,

      shadowColor:
        '#000000',

      shadowOffset: {
        width: 0,

        height: 8,
      },

      shadowOpacity: 0.16,

      shadowRadius: 18,

      elevation: 12,
    },

    deleteModalHeader: {
      flexDirection:
        'row',

      alignItems:
        'flex-start',

      marginBottom: 18,
    },

    deleteModalIcon: {
      width: 46,

      height: 46,

      marginRight: 11,

      borderRadius: 23,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    deleteHeaderContent: {
      flex: 1,

      paddingRight: 8,
    },

    deleteModalTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,
    },

    deleteModalSubtitle: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12.5,

      lineHeight: 18,
    },

    deleteInformation: {
      marginBottom: 18,

      paddingHorizontal: 12,

      paddingVertical: 11,

      borderRadius: 11,

      backgroundColor:
        COLORS.graySoft,
    },

    deleteInformationTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13,
    },

    deleteInformationText: {
      marginTop: 4,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,

      lineHeight: 17,
    },

    deleteModalActions: {
      marginTop: 3,

      flexDirection:
        'row',

      gap: 10,
    },

    deleteCancelButton: {
      flex: 1,

      height: 48,

      alignItems:
        'center',

      justifyContent:
        'center',

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 11,

      backgroundColor:
        COLORS.white,
    },

    deleteConfirmButton: {
      flex: 1.3,

      height: 48,

      flexDirection:
        'row',

      alignItems:
        'center',

      justifyContent:
        'center',

      gap: 6,

      borderRadius: 11,

      backgroundColor:
        COLORS.redButton,
    },

    deleteConfirmButtonDisabled: {
      opacity: 0.38,
    },

    // ========================================================
    // NORMAL ACTION BUTTONS
    // ========================================================

    modalActions: {
      marginTop: 7,

      flexDirection:
        'row',

      gap: 9,
    },

    cancelButton: {
      flex: 1,

      height: 45,

      borderWidth: 1,

      borderColor:
        COLORS.border,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.white,
    },

    cancelButtonText: {
      color:
        COLORS.black,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13.5,
    },

    primaryButton: {
      flex: 1,

      height: 45,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    deactivateConfirmButton: {
      flex: 1,

      height: 45,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },

    primaryButtonText: {
      color:
        COLORS.white,

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13.5,
    },

    buttonDisabled: {
      opacity: 0.55,
    },

    // ========================================================
    // CONFIRMATION
    // ========================================================

    confirmationCard: {
      width:
        '100%',

      maxWidth: 340,

      paddingHorizontal: 22,

      paddingTop: 24,

      paddingBottom: 20,

      alignItems:
        'center',

      borderRadius: 20,

      backgroundColor:
        COLORS.white,
    },

    confirmationIcon: {
      width: 56,

      height: 56,

      marginBottom: 13,

      borderRadius: 28,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.pinkSoft,
    },

    successIcon: {
      width: 56,

      height: 56,

      marginBottom: 13,

      borderRadius: 28,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.greenSoft,
    },

    confirmationTitle: {
      color:
        COLORS.black,

      fontFamily:
        'Poppins_700Bold',

      fontSize: 17,

      textAlign:
        'center',
    },

    confirmationText: {
      marginTop: 7,

      color:
        COLORS.muted,

      fontFamily:
        'Inter_400Regular',

      fontSize: 13.5,

      lineHeight: 20,

      textAlign:
        'center',
    },

    continueButton: {
      width:
        '100%',

      height: 45,

      marginTop: 20,

      borderRadius: 10,

      alignItems:
        'center',

      justifyContent:
        'center',

      backgroundColor:
        COLORS.redButton,
    },
  });