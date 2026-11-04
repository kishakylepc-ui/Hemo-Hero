import {
  type ComponentProps,
  useCallback,
  useState,
} from 'react';

import {
  ActivityIndicator,
  Linking,
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
  createAdminBackup,
  deleteAdminBackup,
  getAdminBackupDownload,
  getAdminBackups,
  restoreAdminBackup,
  restoreAdminBackupFile,
  type AdminBackup,
  type AdminBackupKind,
  type AdminBackupSummary,
  type AdminProfile,
} from '../../lib/api';

import {
  LIVE_REFRESH_SLOW_MS,
  useLiveRefresh,
} from '../../lib/useLiveRefresh';

import {
  clearAdminSession,
  getAdminAccessToken,
  getAdminProfile,
} from '../../lib/session';

import { isAdminRole, isSuperAdmin } from '../../lib/roles';

// ============================================================
// DATA BACKUPS (super admin only)
//
// Layout follows the Donor Applications list for a consistent
// Admin UI. Everything here is backed by a real endpoint:
//   GET    /api/admin/backups               list + summary
//   POST   /api/admin/backups               back up now
//   GET    /api/admin/backups/:id/download  download link
//   POST   /api/admin/backups/:id/restore   restore
//   POST   /api/admin/backups/restore-file  restore from a file
//   DELETE /api/admin/backups/:id           delete
// ============================================================

const COLORS = {
  outer: '#02040A',
  navy: '#050B19',

  card: '#091126',
  cardLight: '#101A35',

  border: '#243554',
  rowBorder: 'rgba(36,53,84,0.58)',

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

const KIND_LABELS: Record<
  AdminBackupKind,
  string
> = {
  manual: 'Manual',
  automatic: 'Automatic',
  before_restore: 'Before restore',
};

// Same limit as the server (backupService.js).
const MAX_BACKUP_FILE_BYTES =
  50 * 1024 * 1024;

const EMPTY_SUMMARY: AdminBackupSummary = {
  total: 0,
  total_size_bytes: 0,
  latest_at: null,
  next_automatic_at: null,
  automatic_kept: 7,
};

// ============================================================
// MODAL TYPES
// ============================================================

type MessageVariant =
  | 'success'
  | 'error'
  | 'info';

type MessageState = {
  title: string;
  message: string;
  variant: MessageVariant;
  // A second button, like Download File.
  action?: {
    label: string;
    icon: ComponentProps<
      typeof MaterialIcons
    >['name'];
    onPress: () => void;
  };
} | null;

type ConfirmState =
  | null
  | {
      type: 'restore' | 'delete';
      backup: AdminBackup;
    }
  | {
      type: 'restore_file';
      file: File;
      createdAt: string;
      totalRows: number;
    };

// ============================================================
// SCREEN
// ============================================================

export default function AdminBackupsScreen() {

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

  const [backups, setBackups] =
    useState<AdminBackup[]>([]);

  const [summary, setSummary] =
    useState<AdminBackupSummary>(EMPTY_SUMMARY);

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');

  const [backingUp, setBackingUp] = useState(false);

  // Backup whose download link is being made.
  const [downloadingId, setDownloadingId] =
    useState<string | null>(null);

  const [confirm, setConfirm] =
    useState<ConfirmState>(null);

  const [confirmText, setConfirmText] = useState('');
  const [working, setWorking] = useState(false);

  const [message, setMessage] =
    useState<MessageState>(null);

  const superAdmin =
    isSuperAdmin(profile?.role);

  // ==========================================================
  // LOAD
  // ==========================================================

  const loadBackups = useCallback(async (live = false) => {
    try {
      if (!live) {
        setLoadError('');
      }

      const token =
        await getAdminAccessToken();

      const storedProfile =
        await getAdminProfile();

      if (
        !token ||
        !isAdminRole(storedProfile?.role)
      ) {
        await clearAdminSession();

        router.replace('/');

        return;
      }

      setProfile(storedProfile);

      if (!isSuperAdmin(storedProfile?.role)) {
        return;
      }

      const result =
        await getAdminBackups(token);

      setLoadError('');

      setBackups(result.backups);
      setSummary(result.summary);
    } catch (error) {
      if (live) {
        return;
      }

      console.log(
        'ADMIN BACKUPS LOAD ERROR:',
        error
      );

      setLoadError(
        error instanceof Error
          ? error.message
          : 'Unable to load backups.'
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadBackups();
    }, [loadBackups])
  );

  useLiveRefresh(
    () => loadBackups(true),
    LIVE_REFRESH_SLOW_MS
  );

  function refresh() {
    setLoading(true);
    loadBackups();
  }

  // ==========================================================
  // ACTIONS
  // ==========================================================

  async function backUpNow() {
    if (backingUp) {
      return;
    }

    try {
      setBackingUp(true);

      const token =
        await getAdminAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const result =
        await createAdminBackup(token);

      setMessage({
        variant: 'success',
        title: 'Backup Saved',
        message: `${formatNumber(
          result.backup.total_rows
        )} rows from ${
          Object.keys(
            result.backup.table_counts || {}
          ).length
        } tables were saved (${formatSize(
          result.backup.size_bytes
        )}). You can download it as a file now, or any time from the list.`,
        action: {
          label: 'Download File',
          icon: 'file-download',
          onPress: () =>
            downloadBackup(result.backup),
        },
      });

      await loadBackups();
    } catch (error) {
      setMessage({
        variant: 'error',
        title: 'Backup Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to make a backup.',
      });
    } finally {
      setBackingUp(false);
    }
  }

  async function downloadBackup(
    backup: AdminBackup
  ) {
    if (downloadingId) {
      return;
    }

    try {
      setDownloadingId(backup.id);

      const token =
        await getAdminAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      const link =
        await getAdminBackupDownload(
          token,
          backup.id
        );

      if (Platform.OS === 'web') {
        // Saves in place. The link sends the file as a download,
        // so the page stays open, and unlike a new tab, a popup
        // blocker can't stop it after waiting on the server.
        const saveLink =
          document.createElement('a');

        saveLink.href = link.url;
        saveLink.download = link.file_name;

        document.body.appendChild(saveLink);
        saveLink.click();
        saveLink.remove();

        setMessage({
          variant: 'success',
          title: 'Download Started',
          message: `Your browser is saving ${link.file_name}. Check your Downloads folder. It holds every user's personal data, so keep it somewhere safe.`,
        });
      } else {
        await Linking.openURL(link.url);
      }
    } catch (error) {
      setMessage({
        variant: 'error',
        title: 'Download Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Unable to download this backup.',
      });
    } finally {
      setDownloadingId(null);
    }
  }

  // Web only. The file is read here so the popup can say what's
  // in it. The server checks it again before restoring.
  function chooseBackupFile() {
    const input =
      document.createElement('input');

    input.type = 'file';
    input.accept = '.json,application/json';
    input.style.display = 'none';

    input.onchange = () => {
      const file = input.files?.[0];

      input.remove();

      if (file) {
        openFileConfirm(file);
      }
    };

    input.oncancel = () => input.remove();

    document.body.appendChild(input);
    input.click();
  }

  async function openFileConfirm(file: File) {
    const wrongFile = {
      variant: 'error' as const,
      title: 'Wrong File',
      message: `${file.name} is not a Hemo-Hero backup. Choose a .json file downloaded from this page.`,
    };

    if (file.size > MAX_BACKUP_FILE_BYTES) {
      setMessage(wrongFile);

      return;
    }

    try {
      const backup =
        JSON.parse(
          (await file.text()).replace(
            /^\uFEFF/,
            ''
          )
        );

      if (
        backup?.app !== 'hemo-hero' ||
        !backup.tables ||
        typeof backup.tables !== 'object' ||
        typeof backup.created_at !== 'string'
      ) {
        setMessage(wrongFile);

        return;
      }

      setConfirmText('');
      setConfirm({
        type: 'restore_file',
        file,
        createdAt: backup.created_at,
        totalRows: Object.values(
          backup.tables
        ).reduce<number>(
          (sum, rows) =>
            sum +
            (Array.isArray(rows)
              ? rows.length
              : 0),
          0
        ),
      });
    } catch {
      setMessage(wrongFile);
    }
  }

  function openConfirm(
    type: 'restore' | 'delete',
    backup: AdminBackup
  ) {
    setConfirmText('');
    setConfirm({
      type,
      backup,
    });
  }

  function closeConfirm() {
    if (working) {
      return;
    }

    setConfirm(null);
    setConfirmText('');
  }

  async function runConfirmedAction() {
    if (!confirm || working) {
      return;
    }

    if (
      confirm.type !== 'delete' &&
      confirmText.trim() !== 'RESTORE'
    ) {
      return;
    }

    const current = confirm;

    try {
      setWorking(true);

      const token =
        await getAdminAccessToken();

      if (!token) {
        router.replace('/');

        return;
      }

      if (current.type !== 'delete') {
        const result =
          current.type === 'restore_file'
            ? await restoreAdminBackupFile(
                token,
                current.file
              )
            : await restoreAdminBackup(
                token,
                current.backup.id
              );

        const restoredRows =
          Object.values(
            result.restored || {}
          ).reduce(
            (sum, count) =>
              sum + Number(count || 0),
            0
          );

        setConfirm(null);

        setMessage({
          variant: 'success',
          title: 'Backup Restored',
          message: `The data is back to ${formatDateTime(
            current.type === 'restore_file'
              ? current.createdAt
              : current.backup.created_at
          )} (${formatNumber(
            restoredRows
          )} rows). A "Before restore" backup of the data you had was saved first, so you can undo this.`,
        });
      } else {
        await deleteAdminBackup(
          token,
          current.backup.id
        );

        setConfirm(null);

        setMessage({
          variant: 'success',
          title: 'Backup Deleted',
          message: `The backup from ${formatDateTime(
            current.backup.created_at
          )} was deleted.`,
        });
      }

      await loadBackups();
    } catch (error) {
      setConfirm(null);

      setMessage({
        variant: 'error',
        title:
          current.type === 'delete'
            ? 'Delete Failed'
            : 'Restore Failed',
        message:
          error instanceof Error
            ? error.message
            : 'Something went wrong.',
      });
    } finally {
      setWorking(false);
      setConfirmText('');
    }
  }

  // ==========================================================
  // RENDER
  // ==========================================================

  const nextAutomatic =
    summary.next_automatic_at
      ? Date.parse(
          summary.next_automatic_at
        ) <= Date.now()
        ? 'Within the hour'
        : formatDateTime(
            summary.next_automatic_at
          )
      : 'Within the hour';

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
                  paddingTop: 30 * s,
                  paddingBottom: 40 * s,
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
                      marginBottom: 22 * s,
                      gap: 16 * s,
                    },
                  ]}
                >
                  <View
                    style={[
                      styles.titleLeft,

                      {
                        gap: 14 * s,
                      },
                    ]}
                  >
                    <Pressable
                      accessibilityRole="button"
                      accessibilityLabel="Back to Settings"
                      onPress={() =>
                        router.canGoBack()
                          ? router.back()
                          : router.replace(
                              '/settings' as any
                            )
                      }
                      style={({ pressed }) => [
                        styles.backButton,

                        {
                          width: 44 * s,
                          height: 44 * s,
                          borderRadius: 10 * s,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <MaterialIcons
                        name="arrow-back"
                        size={22 * s}
                        color={COLORS.white}
                      />
                    </Pressable>

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
                        Data Backups
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
                        Back up the Hemo-Hero database and restore it if something goes wrong.
                      </Text>
                    </View>
                  </View>

                  {superAdmin ? (
                    <View
                      style={[
                        styles.titleActions,

                        {
                          gap: 10 * s,
                        },
                      ]}
                    >
                      <Pressable
                        accessibilityRole="button"
                        disabled={loading}
                        onPress={refresh}
                        style={({ pressed }) => [
                          styles.secondaryButton,

                          {
                            height: 46 * s,
                            paddingHorizontal: 18 * s,
                            borderRadius: 10 * s,
                            gap: 7 * s,
                          },

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        <MaterialIcons
                          name="refresh"
                          size={19 * s}
                          color={COLORS.white}
                        />

                        <Text
                          style={[
                            styles.secondaryButtonText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          Refresh
                        </Text>
                      </Pressable>

                      {Platform.OS === 'web' ? (
                        <Pressable
                          accessibilityRole="button"
                          onPress={chooseBackupFile}
                          style={({ pressed }) => [
                            styles.secondaryButton,

                            {
                              height: 46 * s,
                              paddingHorizontal: 18 * s,
                              borderRadius: 10 * s,
                              gap: 7 * s,
                            },

                            pressed &&
                              styles.pressed,
                          ]}
                        >
                          <MaterialIcons
                            name="upload-file"
                            size={19 * s}
                            color={COLORS.white}
                          />

                          <Text
                            style={[
                              styles.secondaryButtonText,

                              {
                                fontSize: 13 * fs,
                              },
                            ]}
                          >
                            Restore from File
                          </Text>
                        </Pressable>
                      ) : null}

                      <Pressable
                        accessibilityRole="button"
                        disabled={backingUp}
                        onPress={backUpNow}
                        style={({ pressed }) => [
                          styles.primaryButton,

                          {
                            height: 46 * s,
                            minWidth: 160 * s,
                            paddingHorizontal: 18 * s,
                            borderRadius: 10 * s,
                            gap: 7 * s,
                          },

                          backingUp &&
                            styles.disabled,

                          pressed &&
                            styles.pressed,
                        ]}
                      >
                        {backingUp ? (
                          <ActivityIndicator
                            color={COLORS.white}
                          />
                        ) : (
                          <>
                            <MaterialIcons
                              name="backup"
                              size={19 * s}
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
                              Back Up Now
                            </Text>
                          </>
                        )}
                      </Pressable>
                    </View>
                  ) : null}
                </View>
              </FadeInView>

              {!loading &&
              profile &&
              !superAdmin ? (
                <FadeInView delay={50}>
                  <View
                    style={[
                      styles.listCard,

                      {
                        borderRadius: 14 * s,
                      },
                    ]}
                  >
                    <TableMessage
                      scale={s}
                      fontScale={fs}
                      icon="lock-outline"
                      title="Super Admin Only"
                      text="Backups hold every user’s personal data, so only the super admin can make, download or restore them."
                    />
                  </View>
                </FadeInView>
              ) : (
                <>
                  {/* ============================================
                      SUMMARY
                  ============================================ */}

                  <FadeInView delay={50}>
                    <View
                      style={[
                        styles.summaryRow,

                        {
                          gap: 14 * s,
                          marginBottom: 16 * s,
                        },
                      ]}
                    >
                      <SummaryCard
                        scale={s}
                        fontScale={fs}
                        icon="inventory-2"
                        label="Backups"
                        value={
                          loading
                            ? '—'
                            : formatNumber(
                                summary.total
                              )
                        }
                      />

                      <SummaryCard
                        scale={s}
                        fontScale={fs}
                        icon="history"
                        label="Latest Backup"
                        value={
                          loading
                            ? '—'
                            : summary.latest_at
                              ? formatDateTime(
                                  summary.latest_at
                                )
                              : 'None yet'
                        }
                      />

                      <SummaryCard
                        scale={s}
                        fontScale={fs}
                        icon="schedule"
                        label="Next Automatic"
                        value={
                          loading
                            ? '—'
                            : nextAutomatic
                        }
                      />

                      <SummaryCard
                        scale={s}
                        fontScale={fs}
                        icon="storage"
                        label="Space Used"
                        value={
                          loading
                            ? '—'
                            : formatSize(
                                summary.total_size_bytes
                              )
                        }
                      />
                    </View>
                  </FadeInView>

                  {/* ============================================
                      WHAT'S INCLUDED
                  ============================================ */}

                  <FadeInView delay={80}>
                    <View
                      style={[
                        styles.infoStrip,

                        {
                          padding: 16 * s,
                          borderRadius: 12 * s,
                          gap: 12 * s,
                          marginBottom: 18 * s,
                        },
                      ]}
                    >
                      <MaterialIcons
                        name="info-outline"
                        size={21 * s}
                        color={COLORS.blue}
                      />

                      <Text
                        style={[
                          styles.infoText,

                          {
                            fontSize: 12.5 * fs,
                            lineHeight: 19 * fs,
                          },
                        ]}
                      >
                        A backup saves all app data: accounts, donor applications, requests, offers, chats, donations, feedback, reports, notifications and the log trail. Photos and ID images stay in storage and aren’t included. An automatic backup runs every day and the newest {summary.automatic_kept} are kept; manual backups stay until you delete them.
                      </Text>
                    </View>
                  </FadeInView>

                  {/* ============================================
                      TABLE
                  ============================================ */}

                  <FadeInView delay={110}>
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
                            ['Backup', styles.colBackup],
                            ['Type', styles.colType],
                            ['Rows', styles.colRows],
                            ['Size', styles.colSize],
                            ['Last Restored', styles.colRestored],
                            ['Actions', styles.colActions],
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
                          text="Loading backups..."
                        />
                      ) : loadError ? (
                        <TableMessage
                          scale={s}
                          fontScale={fs}
                          icon="error-outline"
                          iconColor={COLORS.redBright}
                          title="Unable to Load Backups"
                          text={loadError}
                          actionLabel="Try Again"
                          onAction={refresh}
                        />
                      ) : backups.length === 0 ? (
                        <TableMessage
                          scale={s}
                          fontScale={fs}
                          icon="cloud-off"
                          title="No Backups Yet"
                          text="Tap Back Up Now to make the first one. The daily automatic backup will also appear here."
                        />
                      ) : (
                        backups.map((backup, index) => (
                          <BackupRow
                            key={backup.id}
                            backup={backup}
                            scale={s}
                            fontScale={fs}
                            last={
                              index ===
                              backups.length - 1
                            }
                            downloading={
                              downloadingId ===
                              backup.id
                            }
                            onDownload={() =>
                              downloadBackup(backup)
                            }
                            onRestore={() =>
                              openConfirm(
                                'restore',
                                backup
                              )
                            }
                            onDelete={() =>
                              openConfirm(
                                'delete',
                                backup
                              )
                            }
                          />
                        ))
                      )}
                    </View>
                  </FadeInView>
                </>
              )}
            </ScrollView>

            <AdminBottomNav activeTab="settings" />
          </SafeAreaView>
        </LinearGradient>
      </View>

      {/* ========================================================
          RESTORE / DELETE CONFIRMATION
      ======================================================== */}

      <Modal
        transparent
        visible={Boolean(confirm)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={closeConfirm}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={closeConfirm}
          />

          {confirm ? (
            <View
              style={[
                styles.modalCard,

                {
                  width: 540 * s,
                  maxWidth: '90%',
                  borderRadius: 18 * s,
                  padding: 26 * s,
                  borderColor:
                    confirm.type !== 'delete'
                      ? COLORS.orange
                      : COLORS.redBright,
                },
              ]}
            >
              <View
                style={[
                  styles.modalIconWrap,

                  {
                    width: 56 * s,
                    height: 56 * s,
                    borderRadius: 28 * s,
                    backgroundColor:
                      confirm.type !== 'delete'
                        ? 'rgba(243,163,74,0.12)'
                        : 'rgba(239,51,64,0.12)',
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    confirm.type !== 'delete'
                      ? 'settings-backup-restore'
                      : 'delete-outline'
                  }
                  size={29 * s}
                  color={
                    confirm.type !== 'delete'
                      ? COLORS.orange
                      : COLORS.redBright
                  }
                />
              </View>

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize: 20 * fs,
                    lineHeight: 27 * fs,
                    marginTop: 17 * s,
                  },
                ]}
              >
                {confirm.type === 'restore_file'
                  ? 'Restore From This File?'
                  : confirm.type === 'restore'
                    ? 'Restore This Backup?'
                    : 'Delete This Backup?'}
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
                {confirm.type === 'restore_file'
                  ? `${confirm.file.name} was made on ${formatDateTime(
                      confirm.createdAt
                    )} and has ${formatNumber(
                      confirm.totalRows
                    )} rows. The app's data goes back to how it was then. Requests, chats, donations, reports and notifications made after that are replaced. Accounts made since then are kept, and the log trail is never deleted. A backup of the current data is made first, so you can undo this.`
                  : confirm.type === 'restore'
                    ? `The app's data goes back to how it was on ${formatDateTime(
                        confirm.backup.created_at
                      )}. Requests, chats, donations, reports and notifications made after that are replaced. Accounts made since then are kept, and the log trail is never deleted. A backup of the current data is made first, so you can undo this.`
                    : `The backup from ${formatDateTime(
                        confirm.backup.created_at
                      )} will be deleted for good.`}
              </Text>

              {confirm.type !== 'delete' ? (
                <View
                  style={[
                    styles.confirmField,

                    {
                      marginTop: 18 * s,
                    },
                  ]}
                >
                  <Text
                    style={[
                      styles.confirmLabel,

                      {
                        fontSize: 12.5 * fs,
                        marginBottom: 7 * s,
                      },
                    ]}
                  >
                    Type RESTORE to confirm
                  </Text>

                  <View
                    style={[
                      styles.inputWrap,

                      {
                        height: 48 * s,
                        borderRadius: 10 * s,
                        paddingHorizontal: 14 * s,
                      },
                    ]}
                  >
                    <TextInput
                      value={confirmText}
                      onChangeText={setConfirmText}
                      editable={!working}
                      autoCapitalize="characters"
                      autoCorrect={false}
                      placeholder="RESTORE"
                      placeholderTextColor={COLORS.muted}
                      onSubmitEditing={runConfirmedAction}
                      style={[
                        styles.input,

                        {
                          fontSize: 14 * fs,
                        },
                      ]}
                    />
                  </View>
                </View>
              ) : null}

              <View
                style={[
                  styles.modalActions,

                  {
                    gap: 10 * s,
                    marginTop: 24 * s,
                  },
                ]}
              >
                <Pressable
                  disabled={working}
                  onPress={closeConfirm}
                  style={({ pressed }) => [
                    styles.modalCancelButton,

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
                      styles.modalCancelText,

                      {
                        fontSize: 13 * fs,
                      },
                    ]}
                  >
                    Cancel
                  </Text>
                </Pressable>

                {(() => {
                  const blocked =
                    working ||
                    (confirm.type !== 'delete' &&
                      confirmText.trim() !==
                        'RESTORE');

                  return (
                    <Pressable
                      disabled={blocked}
                      onPress={runConfirmedAction}
                      style={({ pressed }) => [
                        styles.modalPrimaryButton,

                        {
                          height: 48 * s,
                          borderRadius: 10 * s,
                          gap: 7 * s,
                          backgroundColor:
                            confirm.type !== 'delete'
                              ? COLORS.orange
                              : COLORS.red,
                        },

                        blocked &&
                          !working &&
                          styles.disabled,

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      {working ? (
                        <ActivityIndicator
                          color={COLORS.white}
                        />
                      ) : (
                        <Text
                          style={[
                            styles.modalPrimaryText,

                            {
                              fontSize: 13 * fs,
                            },
                          ]}
                        >
                          {confirm.type !== 'delete'
                            ? 'Restore'
                            : 'Delete Backup'}
                        </Text>
                      )}
                    </Pressable>
                  );
                })()}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>

      {/* ========================================================
          MESSAGE
      ======================================================== */}

      <Modal
        transparent
        visible={Boolean(message)}
        animationType="fade"
        statusBarTranslucent
        onRequestClose={() => setMessage(null)}
      >
        <View style={styles.modalBackdrop}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={() => setMessage(null)}
          />

          {message ? (
            <View
              style={[
                styles.modalCard,

                {
                  width: 500 * s,
                  maxWidth: '88%',
                  borderRadius: 18 * s,
                  padding: 26 * s,
                  borderColor:
                    getMessageColor(
                      message.variant
                    ),
                },
              ]}
            >
              <View
                style={[
                  styles.modalIconWrap,

                  {
                    width: 56 * s,
                    height: 56 * s,
                    borderRadius: 28 * s,
                    backgroundColor:
                      getMessageTint(
                        message.variant
                      ),
                  },
                ]}
              >
                <MaterialIcons
                  name={
                    message.variant === 'success'
                      ? 'check-circle'
                      : message.variant === 'error'
                        ? 'error-outline'
                        : 'info-outline'
                  }
                  size={29 * s}
                  color={getMessageColor(
                    message.variant
                  )}
                />
              </View>

              <Text
                style={[
                  styles.modalTitle,

                  {
                    fontSize: 20 * fs,
                    lineHeight: 27 * fs,
                    marginTop: 17 * s,
                  },
                ]}
              >
                {message.title}
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
                {message.message}
              </Text>

              <View
                style={[
                  styles.modalActions,

                  {
                    marginTop: 24 * s,
                  },
                ]}
              >
                {message.action ? (
                  <>
                    <Pressable
                      onPress={() => setMessage(null)}
                      style={({ pressed }) => [
                        styles.modalCancelButton,

                        {
                          height: 48 * s,
                          borderRadius: 10 * s,
                          marginRight: 10 * s,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <Text
                        style={[
                          styles.modalCancelText,

                          {
                            fontSize: 13 * fs,
                          },
                        ]}
                      >
                        Close
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() => {
                        const action =
                          message.action;

                        setMessage(null);

                        action?.onPress();
                      }}
                      style={({ pressed }) => [
                        styles.modalPrimaryButton,

                        {
                          height: 48 * s,
                          borderRadius: 10 * s,
                          gap: 8 * s,
                          backgroundColor:
                            COLORS.red,
                        },

                        pressed &&
                          styles.pressed,
                      ]}
                    >
                      <MaterialIcons
                        name={message.action.icon}
                        size={19 * s}
                        color={COLORS.white}
                      />

                      <Text
                        style={[
                          styles.modalPrimaryText,

                          {
                            fontSize: 13 * fs,
                          },
                        ]}
                      >
                        {message.action.label}
                      </Text>
                    </Pressable>
                  </>
                ) : (
                  <Pressable
                    onPress={() => setMessage(null)}
                    style={({ pressed }) => [
                      styles.modalPrimaryButton,
                      styles.modalSingleButton,

                      {
                        height: 48 * s,
                        borderRadius: 10 * s,
                        backgroundColor:
                          message.variant === 'success'
                            ? COLORS.green
                            : COLORS.red,
                      },

                      pressed &&
                        styles.pressed,
                    ]}
                  >
                    <Text
                      style={[
                        styles.modalPrimaryText,

                        {
                          fontSize: 13 * fs,
                        },
                      ]}
                    >
                      OK
                    </Text>
                  </Pressable>
                )}
              </View>
            </View>
          ) : null}
        </View>
      </Modal>
    </View>
  );
}

// ============================================================
// SUMMARY CARD
// ============================================================

function SummaryCard({
  scale,
  fontScale,
  icon,
  label,
  value,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  label: string;
  value: string;
}) {
  return (
    <View
      style={[
        styles.summaryCard,

        {
          padding: 18 * scale,
          borderRadius: 14 * scale,
          gap: 14 * scale,
        },
      ]}
    >
      <View
        style={[
          styles.summaryIcon,

          {
            width: 42 * scale,
            height: 42 * scale,
            borderRadius: 11 * scale,
          },
        ]}
      >
        <MaterialIcons
          name={icon}
          size={21 * scale}
          color={COLORS.redBright}
        />
      </View>

      <View style={styles.flexFill}>
        <Text
          style={[
            styles.summaryLabel,

            {
              fontSize: 11 * fontScale,
            },
          ]}
        >
          {label}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.summaryValue,

            {
              fontSize: 16 * fontScale,
              marginTop: 3 * scale,
            },
          ]}
        >
          {value}
        </Text>
      </View>
    </View>
  );
}

// ============================================================
// BACKUP ROW
// ============================================================

function BackupRow({
  backup,
  scale,
  fontScale,
  last,
  downloading,
  onDownload,
  onRestore,
  onDelete,
}: {
  backup: AdminBackup;
  scale: number;
  fontScale: number;
  last: boolean;
  downloading: boolean;
  onDownload: () => void;
  onRestore: () => void;
  onDelete: () => void;
}) {
  return (
    <View
      style={[
        styles.backupRow,

        {
          minHeight: 80 * scale,
          paddingHorizontal: 22 * scale,
          paddingVertical: 12 * scale,
        },

        last &&
          styles.noBorder,
      ]}
    >
      {/* BACKUP */}

      <View
        style={[
          styles.colBackup,

          {
            paddingRight: 12 * scale,
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
          {formatDateTime(
            backup.created_at
          )}
        </Text>

        <Text
          numberOfLines={1}
          style={[
            styles.cellMuted,

            {
              fontSize: 11.5 * fontScale,
              marginTop: 4 * scale,
            },
          ]}
        >
          {backup.kind === 'automatic'
            ? 'Made by the server'
            : backup.created_by_name
              ? `By ${backup.created_by_name}`
              : 'By a removed account'}
        </Text>
      </View>

      {/* TYPE */}

      <View style={styles.colType}>
        <KindBadge
          kind={backup.kind}
          scale={scale}
          fontScale={fontScale}
        />
      </View>

      {/* ROWS */}

      <View style={styles.colRows}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {formatNumber(
            backup.total_rows
          )}
        </Text>
      </View>

      {/* SIZE */}

      <View style={styles.colSize}>
        <Text
          style={[
            styles.cellText,

            {
              fontSize: 12.5 * fontScale,
            },
          ]}
        >
          {formatSize(
            backup.size_bytes
          )}
        </Text>
      </View>

      {/* LAST RESTORED */}

      <View
        style={[
          styles.colRestored,

          {
            paddingRight: 10 * scale,
          },
        ]}
      >
        {backup.restored_at ? (
          <>
            <Text
              numberOfLines={1}
              style={[
                styles.cellText,

                {
                  fontSize: 12.5 * fontScale,
                },
              ]}
            >
              {formatDateTime(
                backup.restored_at
              )}
            </Text>

            {backup.restored_by_name ? (
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
                By {backup.restored_by_name}
              </Text>
            ) : null}
          </>
        ) : (
          <Text
            style={[
              styles.cellMuted,

              {
                fontSize: 12.5 * fontScale,
              },
            ]}
          >
            Never
          </Text>
        )}
      </View>

      {/* ACTIONS */}

      <View
        style={[
          styles.colActions,
          styles.actions,

          {
            gap: 6 * scale,
          },
        ]}
      >
        <RowButton
          scale={scale}
          fontScale={fontScale}
          icon="file-download"
          label="Download"
          busy={downloading}
          onPress={onDownload}
        />

        <RowButton
          scale={scale}
          fontScale={fontScale}
          icon="settings-backup-restore"
          label="Restore"
          tone="warning"
          onPress={onRestore}
        />

        <RowButton
          scale={scale}
          fontScale={fontScale}
          icon="delete-outline"
          tone="danger"
          accessibilityLabel="Delete backup"
          onPress={onDelete}
        />
      </View>
    </View>
  );
}

function RowButton({
  scale,
  fontScale,
  icon,
  label,
  tone = 'normal',
  busy = false,
  accessibilityLabel,
  onPress,
}: {
  scale: number;
  fontScale: number;
  icon: IconName;
  label?: string;
  tone?: 'normal' | 'warning' | 'danger';
  busy?: boolean;
  accessibilityLabel?: string;
  onPress: () => void;
}) {
  const color =
    tone === 'warning'
      ? COLORS.orange
      : tone === 'danger'
        ? COLORS.redBright
        : COLORS.soft;

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ||
        label
      }
      disabled={busy}
      onPress={onPress}
      style={({ pressed }) => [
        styles.rowButton,

        {
          height: 36 * scale,
          minWidth: 36 * scale,
          paddingHorizontal: (label ? 10 : 0) * scale,
          borderRadius: 8 * scale,
          gap: 5 * scale,
        },

        tone === 'warning' &&
          styles.rowButtonWarning,

        tone === 'danger' &&
          styles.rowButtonDanger,

        pressed &&
          styles.pressed,
      ]}
    >
      {busy ? (
        <ActivityIndicator
          size="small"
          color={color}
        />
      ) : (
        <>
          <MaterialIcons
            name={icon}
            size={17 * scale}
            color={color}
          />

          {label ? (
            <Text
              style={[
                styles.rowButtonText,

                {
                  fontSize: 12 * fontScale,
                  color,
                },
              ]}
            >
              {label}
            </Text>
          ) : null}
        </>
      )}
    </Pressable>
  );
}

function KindBadge({
  kind,
  scale,
  fontScale,
}: {
  kind: AdminBackupKind;
  scale: number;
  fontScale: number;
}) {
  return (
    <View
      style={[
        styles.kindPill,

        {
          height: 30 * scale,
          borderRadius: 6 * scale,
          paddingHorizontal: 11 * scale,
        },

        kind === 'manual' &&
          styles.manualPill,

        kind === 'automatic' &&
          styles.automaticPill,

        kind === 'before_restore' &&
          styles.beforeRestorePill,
      ]}
    >
      <Text
        style={[
          styles.kindPillText,

          {
            fontSize: 12 * fontScale,
          },

          kind === 'manual' &&
            styles.manualPillText,

          kind === 'automatic' &&
            styles.automaticPillText,

          kind === 'before_restore' &&
            styles.beforeRestorePillText,
        ]}
      >
        {KIND_LABELS[kind] || kind}
      </Text>
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
          minHeight: 300 * scale,
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
            lineHeight: 20 * fontScale,
            marginTop: (title ? 6 : 14) * scale,
            maxWidth: 560 * scale,
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
// HELPERS
// ============================================================

function getMessageColor(
  variant: MessageVariant
) {
  if (variant === 'success') {
    return COLORS.green;
  }

  if (variant === 'error') {
    return COLORS.redBright;
  }

  return COLORS.blue;
}

function getMessageTint(
  variant: MessageVariant
) {
  if (variant === 'success') {
    return 'rgba(53,201,130,0.12)';
  }

  if (variant === 'error') {
    return 'rgba(239,51,64,0.12)';
  }

  return 'rgba(74,140,255,0.12)';
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

function formatNumber(
  value?: number | null
) {
  return Number(
    value || 0
  ).toLocaleString();
}

function formatSize(
  bytes?: number | null
) {
  const value =
    Number(bytes || 0);

  if (value < 1024) {
    return `${value} B`;
  }

  if (value < 1024 * 1024) {
    return `${(value / 1024).toFixed(1)} KB`;
  }

  return `${(value / (1024 * 1024)).toFixed(1)} MB`;
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

  titleLeft: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },

  titleActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },

  backButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
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

  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  secondaryButtonText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },

  pressed: {
    opacity: 0.8,
    transform: [{ scale: 0.985 }],
  },

  disabled: {
    opacity: 0.45,
  },

  // SUMMARY

  summaryRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },

  summaryCard: {
    flex: 1,
    minWidth: 200,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.card,
  },

  summaryIcon: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(239,51,64,0.10)',
  },

  summaryLabel: {
    color: COLORS.muted,
    fontFamily: 'Inter_600SemiBold',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  summaryValue: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
  },

  infoStrip: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    borderWidth: 1,
    borderColor: 'rgba(74,140,255,0.35)',
    backgroundColor: 'rgba(74,140,255,0.08)',
  },

  infoText: {
    flex: 1,
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
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

  backupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: COLORS.rowBorder,
  },

  noBorder: {
    borderBottomWidth: 0,
  },

  colBackup: {
    width: '25%',
  },

  colType: {
    width: '14%',
  },

  colRows: {
    width: '9%',
  },

  colSize: {
    width: '9%',
  },

  colRestored: {
    width: '17%',
  },

  colActions: {
    width: '26%',
  },

  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
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

  rowButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  rowButtonWarning: {
    borderColor: 'rgba(243,163,74,0.45)',
    backgroundColor: 'rgba(243,163,74,0.08)',
  },

  rowButtonDanger: {
    borderColor: 'rgba(239,51,64,0.45)',
    backgroundColor: 'rgba(239,51,64,0.08)',
  },

  rowButtonText: {
    fontFamily: 'Inter_600SemiBold',
  },

  kindPill: {
    alignSelf: 'flex-start',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
  },

  kindPillText: {
    fontFamily: 'Inter_600SemiBold',
  },

  manualPill: {
    borderColor: 'rgba(74,140,255,0.50)',
    backgroundColor: 'rgba(74,140,255,0.12)',
  },

  manualPillText: {
    color: COLORS.blue,
  },

  automaticPill: {
    borderColor: 'rgba(53,201,130,0.50)',
    backgroundColor: 'rgba(53,201,130,0.12)',
  },

  automaticPillText: {
    color: COLORS.green,
  },

  beforeRestorePill: {
    borderColor: 'rgba(243,163,74,0.55)',
    backgroundColor: 'rgba(243,163,74,0.12)',
  },

  beforeRestorePillText: {
    color: COLORS.orange,
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

  // MODALS

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
    maxWidth: 470,
    color: COLORS.soft,
    fontFamily: 'Inter_400Regular',
    textAlign: 'center',
  },

  confirmField: {
    width: '100%',
  },

  confirmLabel: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: COLORS.border,
    backgroundColor: COLORS.cardLight,
  },

  input: {
    flex: 1,
    height: '100%',
    paddingVertical: 0,
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    letterSpacing: 1,
    outlineStyle: 'none',
  } as any,

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

  modalCancelText: {
    color: COLORS.soft,
    fontFamily: 'Inter_600SemiBold',
  },

  modalPrimaryButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },

  modalSingleButton: {
    maxWidth: 190,
    marginLeft: 'auto',
    marginRight: 'auto',
  },

  modalPrimaryText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
  },
});
