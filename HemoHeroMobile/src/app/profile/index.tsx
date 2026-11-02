import { useCallback, useState, } from 'react';
import { ActivityIndicator, Image, Modal, Platform, ScrollView, StyleSheet, Switch, Text, TouchableOpacity, View, } from 'react-native';
import { Ionicons, MaterialIcons } from '@expo/vector-icons';
import { ICON_TILE } from '../../constants/theme';
import { LinearGradient, } from 'expo-linear-gradient';

import {
  HEADER_WAVE_HEIGHT,
  HeroWave,
} from '../../components/HeroArt';
import { router, useFocusEffect, } from 'expo-router';
import { useLiveRefresh } from '../../lib/useLiveRefresh';
import { StatusBar, } from 'expo-status-bar';
import { SafeAreaView, useSafeAreaInsets, } from 'react-native-safe-area-context';
import MainBottomNav, { useBottomNavSpace } from '../../components/MainBottomNav';
import { deleteProfilePhoto, getCurrentUser, logoutUser, uploadProfilePhoto, } from '../../lib/api';
import AppModal from '../../components/AppModal';
import PhotoSourceSheet from '../../components/PhotoSourceSheet';
import type { PickedImage } from '../../lib/imageUpload';
import { unregisterPushNotifications } from '../../lib/pushNotifications';
import { getMyDonorApplication, TRAVEL_RADIUS_OPTIONS, updateDonorPreferences, } from '../../lib/donorApplication';
import type { DonorApplication, DonorPreferences, } from '../../lib/donorApplication';
import { clearSession, getAccessToken, setLogoutReason, } from '../../lib/session';
import { goToSignIn } from '../../lib/signInRoute';
import { formatPhone } from '../../lib/phone';

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

    orange: '#DF721D',
    orangeSoft: '#FDF1E6',

    graySoft: '#F5EFEF',
};

type ActionPopupVariant =
    | 'info'
    | 'success'
    | 'warning'
    | 'error';

type ActionPopupState = {
    visible: boolean;
    title: string;
    message: string;
    variant: ActionPopupVariant;
};

export default function ProfileScreen() {
    // Full screen: the red hero grows by the status-bar height
    // so it reaches the top edge, and its content stays below the
    // clock. The bottom bar floats over the content, so the
    // scroll content ends with the space it covers.
    const insets =
        useSafeAreaInsets();

    const navSpace =
        useBottomNavSpace();

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

    const [
        donorApplication,
        setDonorApplication,
    ] = useState<DonorApplication | null>(
        null
    );

    const [
        loadingDonorStatus,
        setLoadingDonorStatus,
    ] = useState(
        true
    );

    const [
        signingOut,
        setSigningOut,
    ] = useState(
        false
    );

    const [
        logoutModalVisible,
        setLogoutModalVisible,
    ] = useState(
        false
    );

    // Verified donors: first day they can donate again (null =
    // now), and which donor setting is saving.
    const [
        nextEligibleAt,
        setNextEligibleAt,
    ] = useState<string | null>(
        null
    );

    const [
        savingPreference,
        setSavingPreference,
    ] = useState<keyof DonorPreferences | null>(
        null
    );

    // Profile photo: source sheet, upload/remove in progress, and
    // the remove confirmation.
    const [
        photoSheetVisible,
        setPhotoSheetVisible,
    ] = useState(
        false
    );

    const [
        photoBusy,
        setPhotoBusy,
    ] = useState(
        false
    );

    const [
        removePhotoVisible,
        setRemovePhotoVisible,
    ] = useState(
        false
    );

    const [
        actionPopup,
        setActionPopup,
    ] = useState<ActionPopupState>({
        visible: false,
        title: '',
        message: '',
        variant: 'info',
    });

    const loadProfile =
        useCallback(
            async (live = false) => {
                const token =
                    await getAccessToken();

                if (!token) {
                    router.replace(
                        '/'
                    );

                    return;
                }

                try {
                    if (!live) {
                        setLoading(
                            true
                        );

                        setErrorMessage(
                            ''
                        );
                    }

                    const data =
                        await getCurrentUser(
                            token
                        );

                    if (
                        !data?.user
                    ) {
                        throw new Error(
                            'Unable to load your profile.'
                        );
                    }

                    setErrorMessage(
                        ''
                    );

                    setProfile(
                        data.user
                    );
                } catch (error) {
                    console.log(
                        'PROFILE LOAD ERROR:',
                        error
                    );

                    if (!live) {
                        setErrorMessage(
                            error instanceof Error
                                ? error.message
                                : 'Unable to load your profile.'
                        );
                    }
                } finally {
                    if (!live) {
                        setLoading(
                            false
                        );
                    }
                }

                try {
                    if (!live) {
                        setLoadingDonorStatus(
                            true
                        );
                    }

                    const data =
                        await getMyDonorApplication(
                            token
                        );

                    setDonorApplication(
                        data?.application ||
                        null
                    );

                    setNextEligibleAt(
                        data?.next_eligible_at ||
                        null
                    );
                } catch (error) {
                    console.log(
                        'PROFILE DONOR STATUS ERROR:',
                        error
                    );

                    if (!live) {
                        setDonorApplication(
                            null
                        );
                    }
                } finally {
                    if (!live) {
                        setLoadingDonorStatus(
                            false
                        );
                    }
                }
            },
            []
        );

    useFocusEffect(
        useCallback(
            () => {
                loadProfile();
            },
            [
                loadProfile,
            ]
        )
    );

    useLiveRefresh(() =>
        loadProfile(true)
    );

    function closeActionPopup() {
        setActionPopup(
            current => ({
                ...current,
                visible: false,
            })
        );
    }

    function getMessageVariant(
        title: string
    ): ActionPopupVariant {
        const value =
            title.toLowerCase();

        if (
            value.includes(
                'success'
            ) ||
            value.includes(
                'updated'
            ) ||
            value.includes(
                'saved'
            )
        ) {
            return 'success';
        }

        if (
            value.includes(
                'failed'
            ) ||
            value.includes(
                'unable'
            ) ||
            value.includes(
                'error'
            )
        ) {
            return 'error';
        }

        if (
            value.includes(
                'required'
            ) ||
            value.includes(
                'warning'
            )
        ) {
            return 'warning';
        }

        return 'info';
    }

    function showMessage(
        title: string,
        message: string
    ) {
        setActionPopup({
            visible: true,
            title,
            message,
            variant:
                getMessageVariant(
                    title
                ),
        });
    }

    // ==========================================================
    // DONOR SETTINGS
    // ==========================================================

    async function saveDonorPreference<
        Key extends keyof DonorPreferences,
    >(
        key: Key,
        value: DonorPreferences[Key]
    ) {
        if (
            !donorApplication ||
            savingPreference
        ) {
            return;
        }

        const previous =
            donorApplication;

        setDonorApplication({
            ...donorApplication,
            [key]: value,
        });

        try {
            setSavingPreference(
                key
            );

            const token =
                await getAccessToken();

            if (!token) {
                router.replace(
                    '/'
                );

                return;
            }

            await updateDonorPreferences(
                token,
                {
                    [key]: value,
                }
            );
        } catch (error) {
            setDonorApplication(
                previous
            );

            showMessage(
                'Unable to Save',
                error instanceof Error
                    ? error.message
                    : 'Please try again.'
            );
        } finally {
            setSavingPreference(
                null
            );
        }
    }

    // "Nov 30, 2026"
    function formatEligibleDate(
        value: string
    ) {
        const date =
            new Date(value);

        return Number.isNaN(
            date.getTime()
        )
            ? ''
            : date.toLocaleDateString(
                  'en-US',
                  {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                  }
              );
    }

    // ==========================================================
    // PROFILE PHOTO (camera icon)
    // ==========================================================

    function openPhotoSheet() {
        if (
            photoBusy ||
            loading
        ) {
            return;
        }

        setPhotoSheetVisible(
            true
        );
    }

    async function handlePhotoPicked(
        image: PickedImage
    ) {
        try {
            setPhotoBusy(
                true
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
                await uploadProfilePhoto(
                    token,
                    image
                );

            const newPhotoUrl =
                result?.profile_photo_url ||
                result?.user
                    ?.profile_photo_url ||
                '';

            if (!newPhotoUrl) {
                throw new Error(
                    'Your photo was uploaded, but it could not be shown. Pull to refresh.'
                );
            }

            setProfile(
                (current: any) => ({
                    ...(current || {}),
                    ...(result?.user || {}),
                    profile_photo_url:
                        newPhotoUrl,
                })
            );

            showMessage(
                'Profile Photo Updated',
                'Your new profile photo has been saved.'
            );
        } catch (error) {
            console.log(
                'PROFILE PHOTO UPLOAD ERROR:',
                error
            );

            showMessage(
                'Unable to Update Photo',
                error instanceof Error
                    ? error.message
                    : 'Please try again.'
            );
        } finally {
            setPhotoBusy(
                false
            );
        }
    }

    async function performRemovePhoto() {
        try {
            setPhotoBusy(
                true
            );

            const token =
                await getAccessToken();

            if (!token) {
                router.replace(
                    '/'
                );

                return;
            }

            await deleteProfilePhoto(
                token
            );

            setRemovePhotoVisible(
                false
            );

            setProfile(
                (current: any) => ({
                    ...(current || {}),
                    profile_photo_url:
                        null,
                })
            );
        } catch (error) {
            setRemovePhotoVisible(
                false
            );

            showMessage(
                'Unable to Remove Photo',
                error instanceof Error
                    ? error.message
                    : 'Please try again.'
            );
        } finally {
            setPhotoBusy(
                false
            );
        }
    }

    const fullName =
        [
            profile?.first_name,
            profile?.middle_name,
            profile?.last_name,
            profile?.suffix,
        ]
            .filter(
                Boolean
            )
            .join(
                ' '
            ) ||
        'Hemo-Hero User';

    // "@juan.delacruz · juan@example.com" (the username signs in
    // too).
    const email =
        [
            profile?.username
                ? `@${profile.username}`
                : null,

            profile?.email ||
                'Email unavailable',
        ]
            .filter(
                Boolean
            )
            .join(
                ' · '
            );

    // Off during the 90-day wait after a donation, whatever the
    // saved setting is.
    const donorAvailable =
        donorApplication?.availability_status ===
            'available' &&
        !nextEligibleAt;

    const phone =
        formatPhone(
            profile?.phone
        ) ||
        'Not provided';

    const bloodType =
        donorApplication?.status ===
            'approved' &&
        donorApplication?.blood_type
            ? donorApplication
                .blood_type
            : profile?.blood_type ||
              donorApplication
                  ?.blood_type ||
              'Not provided';

    const gender =
        profile?.gender ||
        'Not provided';

    const completeLocation =
        [
            profile?.barangay,
            profile?.city,
            profile?.province,
        ]
            .filter(
                Boolean
            )
            .join(
                ', '
            ) ||
        'Location not provided';

    const shortLocation =
        [
            profile?.city,
            profile?.province,
        ]
            .filter(
                Boolean
            )
            .join(
                ', '
            ) ||
        'Location not added';

    const profilePhotoUrl =
        profile
            ?.profile_photo_url ||
        '';

    function formatDateOfBirth(
        value?:
            | string
            | null
    ) {
        if (!value) {
            return 'Not provided';
        }

        const date =
            new Date(
                `${value}T00:00:00`
            );

        if (
            Number.isNaN(
                date.getTime()
            )
        ) {
            return value;
        }

        return date
            .toLocaleDateString(
                'en-US',
                {
                    month:
                        'long',

                    day:
                        'numeric',

                    year:
                        'numeric',
                }
            );
    }

    function getDonorStatusLabel() {
        if (
            !donorApplication
        ) {
            return '';
        }

        switch (
            donorApplication.status
        ) {
            case 'approved':
                return 'Verified Donor';

            case 'pending':
                return 'Application Pending';

            case 'rejected':
                return 'Application Rejected';

            case 'withdrawn':
                return 'Application Withdrawn';

            default:
                return 'Donor';
        }
    }

    function getDonorStatusColor() {
        switch (
            donorApplication?.status
        ) {
            case 'approved':
                return COLORS.green;

            case 'pending':
                return COLORS.orange;

            default:
                return COLORS.muted;
        }
    }

    function getDonorStatusBackground() {
        switch (
            donorApplication?.status
        ) {
            case 'approved':
                return COLORS.greenSoft;

            case 'pending':
                return COLORS.orangeSoft;

            default:
                return COLORS.graySoft;
        }
    }

    function handleEditProfile() {
        router.push(
            '/profile/edit'
        );
    }

    function handleBloodRequests() {
        router.replace(
            '/requests' as any
        );
    }

    function handleDonationHistory() {
        router.push(
            '/donations' as any
        );
    }

    // Shown until the application is approved: a pending one
    // opens its status, a rejected/withdrawn one can be sent again.
    function handleDonorApplication() {
        if (
            !donorApplication
        ) {
            return;
        }

        if (
            donorApplication.status ===
            'pending'
        ) {
            router.push({
                pathname:
                    '/donor-application/success',

                params: {
                    status:
                        'pending',
                },
            } as any);

            return;
        }

        router.push(
            '/donor-application/blood' as any
        );
    }

    function handleAccountSecurity() {
        router.push(
            '/profile/account-security'
        );
    }

    function handleNotificationSettings() {
        router.push(
            '/notifications/settings' as any
        );
    }

    function handleHelpCenter() {
        router.push(
            '/help' as any
        );
    }

    function handleAbout() {
        router.push(
            '/about' as any
        );
    }

    async function performLogout() {
        if (
            signingOut
        ) {
            return;
        }

        try {
            setSigningOut(
                true
            );

            const token =
                await getAccessToken();

            if (
                token
            ) {
                await unregisterPushNotifications(
                    token
                );

                try {
                    await logoutUser(
                        token
                    );
                } catch (error) {
                    console.log(
                        'SERVER LOGOUT ERROR:',
                        error
                    );
                }
            }

            // Other browser tabs follow and say why.
            await setLogoutReason(
                'signed_out'
            );

            await clearSession();

            setLogoutModalVisible(
                false
            );

            // Closes every screen, so Back can't return.
            goToSignIn();
        } catch (error) {
            console.log(
                'PROFILE LOGOUT ERROR:',
                error
            );

            setLogoutModalVisible(
                false
            );

            showMessage(
                'Sign Out Failed',
                'Unable to sign out. Please try again.'
            );
        } finally {
            setSigningOut(
                false
            );
        }
    }

    function handleLogout() {
        if (
            signingOut
        ) {
            return;
        }

        setLogoutModalVisible(
            true
        );
    }

    function handleCancelLogout() {
        if (
            signingOut
        ) {
            return;
        }

        setLogoutModalVisible(
            false
        );
    }

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
                    // Top and bottom are drawn edge to edge by the
                    // hero and MainBottomNav.
                    edges={[
                        'left',
                        'right',
                    ]}
                >
                    <StatusBar
                        style="light"
                    />

                    <View
                        style={[
                            styles.headerArea,

                            {
                                height:
                                    248 +
                                    insets.top,
                            },
                        ]}
                    >
                        <LinearGradient
                            colors={[
                                '#D2151A',
                                COLORS.redDark,
                            ]}
                            style={[
                                styles.hero,

                                {
                                    height:
                                        210 +
                                        insets.top,

                                    paddingTop:
                                        insets.top,
                                },
                            ]}
                        >
                            <View
                                style={[
                                    styles.heroCircleLeft,

                                    {
                                        transform: [
                                            {
                                                translateY:
                                                    insets.top,
                                            },
                                        ],
                                    },
                                ]}
                            />

                            <View
                                style={[
                                    styles.heroCircleRight,

                                    {
                                        transform: [
                                            {
                                                translateY:
                                                    insets.top,
                                            },
                                        ],
                                    },
                                ]}
                            />

                            {/* Curved bottom edge. */}
                            <HeroWave
                              color={COLORS.page}
                              height={HEADER_WAVE_HEIGHT}
                            />

                            <View
                                style={
                                    styles.topBar
                                }
                            >
                                {/* Spacer: keeps the title centered. */}
                                <View
                                    style={
                                        styles.topButton
                                    }
                                />

                                <Text
                                    style={
                                        styles.topTitle
                                    }
                                >
                                    My Profile
                                </Text>

                                <TouchableOpacity
                                    style={
                                        styles.topButton
                                    }
                                    activeOpacity={
                                        0.7
                                    }
                                    onPress={
                                        handleEditProfile
                                    }
                                >
                                    <MaterialIcons
                                        name="edit"
                                        size={21}
                                        color={
                                            COLORS.white
                                        }
                                    />
                                </TouchableOpacity>
                            </View>

                            <View
                                style={
                                    styles.identityRow
                                }
                            >
                                <View
                                    style={
                                        styles.avatarContainer
                                    }
                                >
                                    <TouchableOpacity
                                        style={
                                            styles.avatar
                                        }
                                        activeOpacity={
                                            0.85
                                        }
                                        accessibilityLabel="Change profile photo"
                                        onPress={
                                            openPhotoSheet
                                        }
                                    >
                                        {profilePhotoUrl ? (
                                            <Image
                                                source={{
                                                    uri:
                                                        profilePhotoUrl,
                                                }}
                                                style={
                                                    styles.avatarImage
                                                }
                                                resizeMode="cover"
                                            />
                                        ) : (
                                            <MaterialIcons
                                                name="person"
                                                size={44}
                                                color={
                                                    COLORS.redDark
                                                }
                                            />
                                        )}

                                        {photoBusy ? (
                                            <View
                                                style={
                                                    styles.avatarBusy
                                                }
                                            >
                                                <ActivityIndicator
                                                    color={
                                                        COLORS.white
                                                    }
                                                />
                                            </View>
                                        ) : null}
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={
                                            styles.cameraButton
                                        }
                                        activeOpacity={
                                            0.8
                                        }
                                        accessibilityLabel="Take or choose a profile photo"
                                        disabled={
                                            photoBusy
                                        }
                                        onPress={
                                            openPhotoSheet
                                        }
                                    >
                                        <MaterialIcons
                                            name="photo-camera"
                                            size={13}
                                            color={
                                                COLORS.redButton
                                            }
                                        />
                                    </TouchableOpacity>
                                </View>

                                <View
                                    style={
                                        styles.identityContent
                                    }
                                >
                                    <Text
                                        numberOfLines={
                                            1
                                        }
                                        style={
                                            styles.profileName
                                        }
                                    >
                                        {loading
                                            ? 'Loading...'
                                            : fullName}
                                    </Text>

                                    <Text
                                        numberOfLines={
                                            1
                                        }
                                        style={
                                            styles.profileEmail
                                        }
                                    >
                                        {loading
                                            ? 'Loading account...'
                                            : email}
                                    </Text>

                                    {!loadingDonorStatus &&
                                    donorApplication ? (
                                        <View
                                            style={[
                                                styles.donorBadge,

                                                {
                                                    backgroundColor:
                                                        getDonorStatusBackground(),
                                                },
                                            ]}
                                        >
                                            {donorApplication.status ===
                                            'approved' ? (
                                                <MaterialIcons
                                                    name="verified"
                                                    size={13}
                                                    color={
                                                        getDonorStatusColor()
                                                    }
                                                />
                                            ) : (
                                                <View
                                                    style={[
                                                        styles.statusDot,

                                                        {
                                                            backgroundColor:
                                                                getDonorStatusColor(),
                                                        },
                                                    ]}
                                                />
                                            )}

                                            <Text
                                                style={[
                                                    styles.donorBadgeText,

                                                    {
                                                        color:
                                                            getDonorStatusColor(),
                                                    },
                                                ]}
                                            >
                                                {getDonorStatusLabel()}
                                            </Text>
                                        </View>
                                    ) : null}
                                </View>
                            </View>
                        </LinearGradient>

                        <View
                            style={
                                styles.quickCard
                            }
                        >
                            <View
                                style={
                                    styles.quickItem
                                }
                            >
                                <View
                                    style={
                                        styles.quickIcon
                                    }
                                >
                                    <MaterialIcons
                                        name="bloodtype"
                                        size={20}
                                        color={
                                            COLORS.redButton
                                        }
                                    />
                                </View>

                                <View
                                    style={
                                        styles.quickContent
                                    }
                                >
                                    <Text
                                        numberOfLines={
                                            1
                                        }
                                        style={
                                            styles.quickValue
                                        }
                                    >
                                        {loading ||
                                        loadingDonorStatus
                                            ? '...'
                                            : bloodType}
                                    </Text>

                                    <Text
                                        style={
                                            styles.quickLabel
                                        }
                                    >
                                        Blood Type
                                    </Text>
                                </View>
                            </View>

                            <View
                                style={
                                    styles.quickDivider
                                }
                            />

                            <View
                                style={
                                    styles.quickItem
                                }
                            >
                                <View
                                    style={
                                        styles.quickIcon
                                    }
                                >
                                    <MaterialIcons
                                        name="location-on"
                                        size={20}
                                        color={
                                            COLORS.redButton
                                        }
                                    />
                                </View>

                                <View
                                    style={
                                        styles.quickContent
                                    }
                                >
                                    <Text
                                        numberOfLines={
                                            1
                                        }
                                        style={
                                            styles.quickValue
                                        }
                                    >
                                        {loading
                                            ? '...'
                                            : shortLocation}
                                    </Text>

                                    <Text
                                        style={
                                            styles.quickLabel
                                        }
                                    >
                                        Location
                                    </Text>
                                </View>
                            </View>
                        </View>
                    </View>

                    <ScrollView
                        style={
                            styles.content
                        }
                        contentContainerStyle={[
                            styles.contentContainer,

                            {
                                paddingBottom:
                                    32 + navSpace,
                            },
                        ]}
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
                                onPress={() =>
                                    loadProfile()
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
                                        Unable to load profile
                                    </Text>

                                    <Text
                                        style={
                                            styles.errorText
                                        }
                                    >
                                        Tap to try again.
                                    </Text>
                                </View>
                            </TouchableOpacity>
                        ) : null}

                        <SectionTitle
                            title="My Activity"
                        />

                        <View
                            style={
                                styles.card
                            }
                        >
                            <MenuRow
                                icon="assignment"
                                title="My Blood Requests"
                                subtitle="Manage your blood requests"
                                onPress={
                                    handleBloodRequests
                                }
                            />

                            <Divider />

                            <MenuRow
                                icon="volunteer-activism"
                                iconColor={
                                    COLORS.orange
                                }
                                title="Donation History"
                                subtitle="Donations you gave or received"
                                onPress={
                                    handleDonationHistory
                                }
                            />

                            {donorApplication &&
                            donorApplication.status !==
                                'approved' ? (
                                <>
                                    <Divider />

                                    <MenuRow
                                        icon="how-to-reg"
                                        title="Donor Application"
                                        subtitle={
                                            donorApplication.status ===
                                            'pending'
                                                ? 'Under review'
                                                : 'Apply again'
                                        }
                                        onPress={
                                            handleDonorApplication
                                        }
                                    />
                                </>
                            ) : null}
                        </View>

                        {donorApplication?.status ===
                        'approved' ? (
                            <>
                                <SectionTitle
                                    title="Donor Settings"
                                />

                                <View
                                    style={
                                        styles.card
                                    }
                                >
                                    {/* Available to donate */}
                                    <View
                                        style={
                                            styles.menuRow
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.menuIcon,
                                                {
                                                    backgroundColor:
                                                        donorAvailable
                                                            ? COLORS.greenSoft
                                                            : COLORS.graySoft,
                                                },
                                            ]}
                                        >
                                            <MaterialIcons
                                                name={
                                                    donorAvailable
                                                        ? 'volunteer-activism'
                                                        : 'pause-circle-outline'
                                                }
                                                size={20}
                                                color={
                                                    donorAvailable
                                                        ? COLORS.green
                                                        : COLORS.muted
                                                }
                                            />
                                        </View>

                                        <View
                                            style={
                                                styles.menuContent
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.menuTitle
                                                }
                                            >
                                                Available to donate
                                            </Text>

                                            <Text
                                                style={
                                                    styles.menuSubtitle
                                                }
                                            >
                                                {nextEligibleAt
                                                    ? 'Off during the 90-day rest after your donation'
                                                    : donorAvailable
                                                      ? 'Requesters can find and invite you'
                                                      : 'Paused: you won’t appear in donor search'}
                                            </Text>
                                        </View>

                                        <Switch
                                            value={
                                                donorAvailable
                                            }
                                            disabled={Boolean(
                                                savingPreference ||
                                                    nextEligibleAt
                                            )}
                                            onValueChange={value =>
                                                saveDonorPreference(
                                                    'availability_status',
                                                    value
                                                        ? 'available'
                                                        : 'unavailable'
                                                )
                                            }
                                            trackColor={{
                                                false: '#D9CFCF',
                                                true: '#E8A3A3',
                                            }}
                                            thumbColor={
                                                donorAvailable
                                                    ? COLORS.redButton
                                                    : '#FFFFFF'
                                            }
                                            accessibilityLabel="Available to donate"
                                        />
                                    </View>

                                    <Divider />

                                    {/* Urgent requests */}
                                    <View
                                        style={
                                            styles.menuRow
                                        }
                                    >
                                        <View
                                            style={[
                                                styles.menuIcon,
                                                {
                                                    backgroundColor:
                                                        COLORS.orangeSoft,
                                                },
                                            ]}
                                        >
                                            <MaterialIcons
                                                name="bolt"
                                                size={20}
                                                color={
                                                    COLORS.orange
                                                }
                                            />
                                        </View>

                                        <View
                                            style={
                                                styles.menuContent
                                            }
                                        >
                                            <Text
                                                style={
                                                    styles.menuTitle
                                                }
                                            >
                                                Urgent requests
                                            </Text>

                                            <Text
                                                style={
                                                    styles.menuSubtitle
                                                }
                                            >
                                                {donorApplication.allow_urgent_requests
                                                    ? 'You’ll be asked for urgent needs'
                                                    : 'Only scheduled requests'}
                                            </Text>
                                        </View>

                                        <Switch
                                            value={
                                                donorApplication.allow_urgent_requests
                                            }
                                            disabled={Boolean(
                                                savingPreference
                                            )}
                                            onValueChange={value =>
                                                saveDonorPreference(
                                                    'allow_urgent_requests',
                                                    value
                                                )
                                            }
                                            trackColor={{
                                                false: '#D9CFCF',
                                                true: '#E8A3A3',
                                            }}
                                            thumbColor={
                                                donorApplication.allow_urgent_requests
                                                    ? COLORS.redButton
                                                    : '#FFFFFF'
                                            }
                                            accessibilityLabel="Accept urgent requests"
                                        />
                                    </View>

                                    <Divider />

                                    {/* Travel distance */}
                                    <View
                                        style={
                                            styles.settingBlock
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.menuTitle
                                            }
                                        >
                                            How far you can travel
                                        </Text>

                                        <View
                                            style={
                                                styles.radiusRow
                                            }
                                        >
                                            {TRAVEL_RADIUS_OPTIONS.map(
                                                radius => {
                                                    const selected =
                                                        donorApplication.travel_radius_km ===
                                                        radius;

                                                    return (
                                                        <TouchableOpacity
                                                            key={
                                                                radius
                                                            }
                                                            style={[
                                                                styles.radiusChip,

                                                                selected &&
                                                                    styles.radiusChipActive,
                                                            ]}
                                                            activeOpacity={
                                                                0.8
                                                            }
                                                            disabled={Boolean(
                                                                savingPreference
                                                            )}
                                                            accessibilityRole="button"
                                                            accessibilityState={{
                                                                selected,
                                                            }}
                                                            onPress={() =>
                                                                saveDonorPreference(
                                                                    'travel_radius_km',
                                                                    radius
                                                                )
                                                            }
                                                        >
                                                            <Text
                                                                style={[
                                                                    styles.radiusChipText,

                                                                    selected &&
                                                                        styles.radiusChipTextActive,
                                                                ]}
                                                            >
                                                                {radius} km
                                                            </Text>
                                                        </TouchableOpacity>
                                                    );
                                                }
                                            )}
                                        </View>
                                    </View>

                                    {/* Waiting period after donating */}
                                    {nextEligibleAt ? (
                                        <>
                                            <Divider />

                                            <View
                                                style={
                                                    styles.eligibleRow
                                                }
                                            >
                                                <MaterialIcons
                                                    name="event-available"
                                                    size={17}
                                                    color={
                                                        COLORS.orange
                                                    }
                                                />

                                                <Text
                                                    style={
                                                        styles.eligibleText
                                                    }
                                                >
                                                    You can donate again from{' '}
                                                    {formatEligibleDate(
                                                        nextEligibleAt
                                                    )}
                                                    .
                                                    {donorApplication.availability_status ===
                                                    'available'
                                                        ? ' You’ll show as available again then.'
                                                        : ''}
                                                </Text>
                                            </View>
                                        </>
                                    ) : null}
                                </View>
                            </>
                        ) : null}

                        <SectionTitle
                            title="Personal Information"
                        />

                        <View
                            style={
                                styles.card
                            }
                        >
                            <InfoRow
                                icon="person-outline"
                                label="Full Name"
                                value={
                                    loading
                                        ? 'Loading...'
                                        : fullName
                                }
                            />

                            <Divider />

                            <InfoRow
                                icon="phone"
                                label="Phone"
                                value={
                                    loading
                                        ? 'Loading...'
                                        : phone
                                }
                            />

                            <Divider />

                            <InfoRow
                                icon="cake"
                                label="Birthday"
                                value={
                                    loading
                                        ? 'Loading...'
                                        : formatDateOfBirth(
                                              profile
                                                  ?.date_of_birth
                                          )
                                }
                            />

                            <Divider />

                            <InfoRow
                                icon="wc"
                                label="Gender"
                                value={
                                    loading
                                        ? 'Loading...'
                                        : gender
                                }
                            />

                            <Divider />

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
                                icon="location-on"
                                label="Location"
                                value={
                                    loading
                                        ? 'Loading...'
                                        : completeLocation
                                }
                                multiline
                            />
                        </View>

                        <SectionTitle
                            title="Medical Information"
                        />

                        <View
                            style={
                                styles.card
                            }
                        >
                            <View
                                style={
                                    styles.medicalRow
                                }
                            >
                                <View
                                    style={
                                        styles.medicalLeft
                                    }
                                >
                                    <View
                                        style={
                                            styles.medicalIcon
                                        }
                                    >
                                        <MaterialIcons
                                            name="bloodtype"
                                            size={20}
                                            color={
                                                COLORS.redButton
                                            }
                                        />
                                    </View>

                                    <View>
                                        <Text
                                            style={
                                                styles.medicalLabel
                                            }
                                        >
                                            Blood Type
                                        </Text>

                                        <Text
                                            style={
                                                styles.medicalHelper
                                            }
                                        >
                                            Your registered blood group
                                        </Text>
                                    </View>
                                </View>

                                <View
                                    style={
                                        styles.bloodBadge
                                    }
                                >
                                    <Text
                                        style={
                                            styles.bloodBadgeText
                                        }
                                    >
                                        {loading ||
                                        loadingDonorStatus
                                            ? '...'
                                            : bloodType}
                                    </Text>
                                </View>
                            </View>
                        </View>

                        <SectionTitle
                            title="Account Status"
                        />

                        <View
                            style={
                                styles.card
                            }
                        >
                            <StatusRow
                                icon="check-circle"
                                label="Profile Completed"
                                value={
                                    profile
                                        ?.onboarding_complete
                                        ? 'Complete'
                                        : 'Incomplete'
                                }
                                active={
                                    Boolean(
                                        profile
                                            ?.onboarding_complete
                                    )
                                }
                            />

                            {donorApplication ? (
                                <>
                                    <Divider />

                                    <StatusRow
                                        icon={
                                            donorApplication.status ===
                                            'approved'
                                                ? 'verified'
                                                : 'hourglass-top'
                                        }
                                        label="Donor Account"
                                        value={
                                            getDonorStatusLabel()
                                        }
                                        active={
                                            donorApplication.status ===
                                            'approved'
                                        }
                                    />
                                </>
                            ) : null}
                        </View>

                        <SectionTitle
                            title="Settings"
                        />

                        <View
                            style={
                                styles.card
                            }
                        >
                            <MenuRow
                                icon="security"
                                title="Account & Security"
                                subtitle="Password and security settings"
                                onPress={
                                    handleAccountSecurity
                                }
                            />

                            <Divider />

                            <MenuRow
                                icon="privacy-tip"
                                title="Privacy Policy"
                                subtitle="How Hemo-Hero handles your data"
                                onPress={() =>
                                    router.push(
                                        '/privacy-policy'
                                    )
                                }
                            />

                            <Divider />

                            <MenuRow
                                icon="description"
                                title="Terms of Service"
                                subtitle="Review Hemo-Hero terms"
                                onPress={() =>
                                    router.push(
                                        '/terms-of-service'
                                    )
                                }
                            />

                            <Divider />

                            <MenuRow
                                icon="notifications-none"
                                title="Notification Settings"
                                subtitle="Choose what alerts your phone"
                                onPress={
                                    handleNotificationSettings
                                }
                            />
                        </View>

                        <SectionTitle
                            title="Support"
                        />

                        <View
                            style={
                                styles.card
                            }
                        >
                            <MenuRow
                                icon="help-outline"
                                title="Help Center"
                                subtitle="How Hemo-Hero works"
                                onPress={
                                    handleHelpCenter
                                }
                            />

                            <Divider />

                            <MenuRow
                                icon="info-outline"
                                title="About Hemo-Hero"
                                subtitle="What Hemo-Hero is and how it keeps you safe"
                                onPress={
                                    handleAbout
                                }
                            />
                        </View>

                        <TouchableOpacity
                            style={
                                styles.logoutButton
                            }
                            activeOpacity={
                                0.85
                            }
                            disabled={
                                signingOut
                            }
                            onPress={
                                handleLogout
                            }
                        >
                            <Text
                                style={
                                    styles.logoutText
                                }
                            >
                                {signingOut
                                    ? 'Signing Out...'
                                    : 'Sign Out'}
                            </Text>
                        </TouchableOpacity>

                        <Text
                            style={
                                styles.footerText
                            }
                        >
                            Hemo-Hero
                        </Text>
                    </ScrollView>

                    <MainBottomNav
                        activeTab="profile"
                    />

                    <Modal
                        visible={
                            logoutModalVisible
                        }
                        transparent
                        animationType="fade"
                        statusBarTranslucent
                        onRequestClose={
                            handleCancelLogout
                        }
                    >
                        <View
                            style={
                                styles.logoutModalBackdrop
                            }
                        >
                            <View
                                style={
                                    styles.logoutModalCard
                                }
                            >
                                <View
                                    style={
                                        styles.logoutModalIcon
                                    }
                                >
                                    <Ionicons
                                        name="log-out-outline"
                                        size={
                                            ICON_TILE.lg.glyph
                                        }
                                        color={
                                            COLORS.redButton
                                        }
                                    />
                                </View>

                                <Text
                                    style={
                                        styles.logoutModalTitle
                                    }
                                >
                                    Sign Out?
                                </Text>

                                <Text
                                    style={
                                        styles.logoutModalMessage
                                    }
                                >
                                    Are you sure you want to sign out of Hemo-Hero?
                                </Text>

                                <View
                                    style={
                                        styles.logoutModalActions
                                    }
                                >
                                    <TouchableOpacity
                                        style={
                                            styles.logoutCancelButton
                                        }
                                        activeOpacity={
                                            0.8
                                        }
                                        disabled={
                                            signingOut
                                        }
                                        onPress={
                                            handleCancelLogout
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.logoutCancelText
                                            }
                                        >
                                            Cancel
                                        </Text>
                                    </TouchableOpacity>

                                    <TouchableOpacity
                                        style={[
                                            styles.logoutConfirmButton,

                                            signingOut &&
                                                styles.logoutConfirmDisabled,
                                        ]}
                                        activeOpacity={
                                            0.85
                                        }
                                        disabled={
                                            signingOut
                                        }
                                        onPress={
                                            performLogout
                                        }
                                    >
                                        <Text
                                            style={
                                                styles.logoutConfirmText
                                            }
                                        >
                                            {signingOut
                                                ? 'Signing Out...'
                                                : 'Sign Out'}
                                        </Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </View>
                    </Modal>

                    <Modal
                        visible={
                            actionPopup.visible
                        }
                        transparent
                        animationType="fade"
                        statusBarTranslucent
                        onRequestClose={
                            closeActionPopup
                        }
                    >
                        <View
                            style={
                                styles.actionPopupBackdrop
                            }
                        >
                            <View
                                style={
                                    styles.actionPopupCard
                                }
                            >
                                <View
                                    style={[
                                        styles.actionPopupIcon,

                                        actionPopup.variant ===
                                            'success' &&
                                            styles.actionPopupIconSuccess,

                                        actionPopup.variant ===
                                            'warning' &&
                                            styles.actionPopupIconWarning,

                                        actionPopup.variant ===
                                            'error' &&
                                            styles.actionPopupIconError,
                                    ]}
                                >
                                    <Ionicons
                                        name={
                                            actionPopup.variant ===
                                            'success'
                                                ? 'checkmark-circle'
                                                : actionPopup.variant ===
                                                  'warning'
                                                    ? 'warning'
                                                    : actionPopup.variant ===
                                                      'error'
                                                        ? 'close-circle'
                                                        : 'information-circle'
                                        }
                                        size={
            ICON_TILE.lg.glyph
          }
                                        color={
                                            actionPopup.variant ===
                                            'success'
                                                ? COLORS.green
                                                : actionPopup.variant ===
                                                  'warning'
                                                    ? COLORS.orange
                                                    : COLORS.redButton
                                        }
                                    />
                                </View>

                                <Text
                                    style={
                                        styles.actionPopupTitle
                                    }
                                >
                                    {
                                        actionPopup.title
                                    }
                                </Text>

                                <Text
                                    style={
                                        styles.actionPopupMessage
                                    }
                                >
                                    {
                                        actionPopup.message
                                    }
                                </Text>

                                <TouchableOpacity
                                    style={
                                        styles.actionPopupButton
                                    }
                                    activeOpacity={
                                        0.85
                                    }
                                    onPress={
                                        closeActionPopup
                                    }
                                >
                                    <Text
                                        style={
                                            styles.actionPopupButtonText
                                        }
                                    >
                                        Okay
                                    </Text>
                                </TouchableOpacity>
                            </View>
                        </View>
                    </Modal>

                    <PhotoSourceSheet
                        visible={
                            photoSheetVisible
                        }
                        hasPhoto={Boolean(
                            profilePhotoUrl
                        )}
                        onClose={() =>
                            setPhotoSheetVisible(
                                false
                            )
                        }
                        onPicked={
                            handlePhotoPicked
                        }
                        onRemove={() =>
                            setRemovePhotoVisible(
                                true
                            )
                        }
                        onError={message =>
                            showMessage(
                                'Permission Required',
                                message
                            )
                        }
                    />

                    <AppModal
                        visible={
                            removePhotoVisible
                        }
                        variant="danger"
                        title="Remove Photo?"
                        message="Your profile will show the default picture."
                        confirmLabel="Remove"
                        cancelLabel="Keep"
                        loading={
                            photoBusy
                        }
                        onConfirm={
                            performRemovePhoto
                        }
                        onClose={() =>
                            setRemovePhotoVisible(
                                false
                            )
                        }
                    />
                </SafeAreaView>
            </View>
        </View>
    );
}

function SectionTitle({
    title,
}: {
    title:
        string;
}) {
    return (
        <Text
            style={
                styles.sectionTitle
            }
        >
            {
                title
            }
        </Text>
    );
}

type MenuRowProps = {
    icon:
        keyof typeof MaterialIcons.glyphMap;

    iconColor?:
        string;

    title:
        string;

    subtitle:
        string;

    onPress:
        () => void;
};

function MenuRow({
    icon,
    iconColor = COLORS.redButton,
    title,
    subtitle,
    onPress,
}: MenuRowProps) {
    return (
        <TouchableOpacity
            style={
                styles.menuRow
            }
            activeOpacity={
                0.65
            }
            onPress={
                onPress
            }
        >
            <View
                style={
                    styles.menuIcon
                }
            >
                <MaterialIcons
                    name={
                        icon
                    }
                    size={20}
                    color={
                        iconColor
                    }
                />
            </View>

            <View
                style={
                    styles.menuContent
                }
            >
                <Text
                    style={
                        styles.menuTitle
                    }
                >
                    {
                        title
                    }
                </Text>

                <Text
                    numberOfLines={
                        1
                    }
                    style={
                        styles.menuSubtitle
                    }
                >
                    {
                        subtitle
                    }
                </Text>
            </View>

            <MaterialIcons
                name="chevron-right"
                size={21}
                color="#B5B5BA"
            />
        </TouchableOpacity>
    );
}

type InfoRowProps = {
    icon:
        keyof typeof MaterialIcons.glyphMap;

    label:
        string;

    value:
        string;

    multiline?:
        boolean;
};

function InfoRow({
    icon,
    label,
    value,
    multiline = false,
}: InfoRowProps) {
    return (
        <View
            style={
                styles.infoRow
            }
        >
            <View
                style={
                    styles.infoIcon
                }
            >
                <MaterialIcons
                    name={
                        icon
                    }
                    size={18}
                    color={
                        COLORS.redButton
                    }
                />
            </View>

            <View
                style={
                    styles.infoContent
                }
            >
                <Text
                    style={
                        styles.infoLabel
                    }
                >
                    {
                        label
                    }
                </Text>

                <Text
                    numberOfLines={
                        multiline
                            ? 3
                            : 1
                    }
                    style={
                        styles.infoValue
                    }
                >
                    {
                        value
                    }
                </Text>
            </View>
        </View>
    );
}

function StatusRow({
    icon,
    label,
    value,
    active,
}: {
    icon:
        keyof typeof MaterialIcons.glyphMap;

    label:
        string;

    value:
        string;

    active:
        boolean;
}) {
    return (
        <View
            style={
                styles.statusRow
            }
        >
            <View
                style={
                    styles.statusLeft
                }
            >
                <View
                    style={
                        styles.statusIcon
                    }
                >
                    <MaterialIcons
                        name={
                            icon
                        }
                        size={18}
                        color={
                            active
                                ? COLORS.green
                                : COLORS.muted
                        }
                    />
                </View>

                <Text
                    style={
                        styles.statusLabel
                    }
                >
                    {
                        label
                    }
                </Text>
            </View>

            <View
                style={[
                    styles.statusBadge,

                    active
                        ? styles.statusBadgeActive
                        : styles.statusBadgeNeutral,
                ]}
            >
                <Text
                    style={[
                        styles.statusBadgeText,

                        active
                            ? styles.statusBadgeTextActive
                            : styles.statusBadgeTextNeutral,
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

function Divider() {
    return (
        <View
            style={
                styles.divider
            }
        />
    );
}

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
                '100%',

            maxWidth:
                '100%',

            overflow:
                'hidden',

            backgroundColor:
                COLORS.page,
        },

        // Page color behind the floating bottom bar.
        safeArea: {
            flex: 1,

            backgroundColor:
                COLORS.page,
        },

        // headerArea and hero heights are set inline: they
        // include the status-bar height.
        headerArea: {
            position:
                'relative',

            zIndex:
                10,

            overflow:
                'visible',

            backgroundColor:
                COLORS.page,
        },

        hero: {
            paddingHorizontal:
                18,

            overflow:
                'hidden',
        },

        heroCircleLeft: {
            position:
                'absolute',

            width:
                180,

            height:
                180,

            borderRadius:
                90,

            top:
                -100,

            left:
                -90,

            backgroundColor:
                'rgba(255,255,255,0.07)',
        },

        heroCircleRight: {
            position:
                'absolute',

            width:
                190,

            height:
                190,

            borderRadius:
                95,

            top:
                -105,

            right:
                -95,

            backgroundColor:
                'rgba(255,255,255,0.07)',
        },

        topBar: {
            height:
                58,

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'space-between',
        },

        topButton: {
            width:
                42,

            height:
                42,

            alignItems:
                'center',

            justifyContent:
                'center',
        },

        topTitle: {
            color:
                COLORS.white,

            fontFamily:
                'Poppins_700Bold',

            fontSize:
                17,
        },

        identityRow: {
            flexDirection:
                'row',

            alignItems:
                'center',

            marginTop:
                18,

            paddingHorizontal:
                5,
        },

        avatarContainer: {
            position:
                'relative',
        },

        avatar: {
            width:
                86,

            height:
                86,

            borderRadius:
                43,

            borderWidth:
                3,

            borderColor:
                COLORS.white,

            backgroundColor:
                '#F6DEDF',

            alignItems:
                'center',

            justifyContent:
                'center',

            overflow:
                'hidden',

            shadowColor:
                '#000000',

            shadowOffset: {
                width:
                    0,

                height:
                    3,
            },

            shadowOpacity:
                0.15,

            shadowRadius:
                5,

            elevation:
                4,
        },

        avatarImage: {
            width:
                '100%',

            height:
                '100%',
        },

        // Upload / remove in progress.
        avatarBusy: {
            position:
                'absolute',

            top: 0,
            right: 0,
            bottom: 0,
            left: 0,


            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                'rgba(0,0,0,0.35)',
        },

        cameraButton: {
            position:
                'absolute',

            width:
                27,

            height:
                27,

            right:
                -1,

            bottom:
                0,

            borderRadius:
                14,

            borderWidth:
                2,

            borderColor:
                COLORS.white,

            backgroundColor:
                COLORS.white,

            alignItems:
                'center',

            justifyContent:
                'center',

            elevation:
                3,
        },

        identityContent: {
            flex:
                1,

            marginLeft:
                15,

            minWidth:
                0,
        },

        profileName: {
            color:
                COLORS.white,

            fontFamily:
                'Poppins_700Bold',

            fontSize:
                22,

            lineHeight:
                27,
        },

        profileEmail: {
            marginTop:
                3,

            color:
                'rgba(255,255,255,0.84)',

            fontFamily:
                'Inter_400Regular',

            fontSize:
                12.5,
        },

        donorBadge: {
            alignSelf:
                'flex-start',

            marginTop:
                9,

            minHeight:
                24,

            paddingHorizontal:
                8,

            flexDirection:
                'row',

            alignItems:
                'center',

            gap:
                4,

            borderRadius:
                12,
        },

        donorBadgeText: {
            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                11.5,
        },

        statusDot: {
            width:
                6,

            height:
                6,

            borderRadius:
                3,
        },

        quickCard: {
            position:
                'absolute',

            left:
                16,

            right:
                16,

            bottom:
                0,

            height:
                76,

            paddingHorizontal:
                14,

            flexDirection:
                'row',

            alignItems:
                'center',

            borderRadius:
                18,

            backgroundColor:
                COLORS.white,

            borderWidth:
                1,

            borderColor:
                '#EEEEF0',

            shadowColor:
                '#000000',

            shadowOffset: {
                width:
                    0,

                height:
                    5,
            },

            shadowOpacity:
                0.13,

            shadowRadius:
                12,

            elevation:
                8,

            zIndex:
                50,
        },

        quickItem: {
            flex:
                1,

            flexDirection:
                'row',

            alignItems:
                'center',

            minWidth:
                0,
        },

        quickIcon: {
            width:
                40,

            height:
                40,

            marginRight:
                9,

            borderRadius:
                20,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.pinkSoft,
        },

        quickContent: {
            flex:
                1,

            minWidth:
                0,
        },

        quickValue: {
            color:
                COLORS.black,

            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                13.5,

            lineHeight:
                18,
        },

        quickLabel: {
            marginTop:
                2,

            color:
                COLORS.lightMuted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                11.5,
        },

        quickDivider: {
            width:
                StyleSheet.hairlineWidth,

            height:
                38,

            marginHorizontal:
                11,

            backgroundColor:
                COLORS.border,
        },

        content: {
            flex:
                1,

            backgroundColor:
                COLORS.page,
        },

        // paddingBottom is set inline: it includes the space the
        // floating bottom bar covers.
        contentContainer: {
            paddingHorizontal:
                18,

            paddingTop:
                18,
        },

        sectionTitle: {
            marginLeft:
                3,

            marginTop:
                2,

            marginBottom:
                8,

            color:
                COLORS.black,

            fontFamily:
                'Poppins_600SemiBold',

            fontSize:
                14.5,
        },

        card: {
            marginBottom:
                22,

            paddingHorizontal:
                13,

            borderWidth:
                1,

            borderColor:
                COLORS.border,

            borderRadius:
                16,

            backgroundColor:
                COLORS.white,

            shadowColor:
                '#000000',

            shadowOffset: {
                width:
                    0,

                height:
                    2,
            },

            shadowOpacity:
                0.035,

            shadowRadius:
                5,

            elevation:
                1,
        },

        divider: {
            height:
                StyleSheet.hairlineWidth,

            marginLeft:
                49,

            backgroundColor:
                COLORS.border,
        },

        menuRow: {
            minHeight:
                67,

            flexDirection:
                'row',

            alignItems:
                'center',

            paddingVertical:
                10,
        },

        menuIcon: {
            width:
                38,

            height:
                38,

            marginRight:
                11,

            borderRadius:
                19,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.pinkSoft,
        },

        menuContent: {
            flex:
                1,

            minWidth:
                0,

            paddingRight:
                6,
        },

        // Donor Settings
        settingBlock: {
            paddingVertical: 14,
        },

        radiusRow: {
            marginTop: 10,
            flexDirection: 'row',
            flexWrap: 'wrap',
            gap: 8,
        },

        radiusChip: {
            minWidth: 56,
            height: 34,
            paddingHorizontal: 12,
            alignItems: 'center',
            justifyContent: 'center',
            borderRadius: 17,
            borderWidth: 1,
            borderColor: COLORS.border,
            backgroundColor: COLORS.white,
        },

        radiusChipActive: {
            borderColor: COLORS.redButton,
            backgroundColor: COLORS.redButton,
        },

        radiusChipText: {
            color: COLORS.black,
            fontFamily: 'Inter_600SemiBold',
            fontSize: 12.5,
        },

        radiusChipTextActive: {
            color: COLORS.white,
        },

        eligibleRow: {
            paddingVertical: 13,
            flexDirection: 'row',
            alignItems: 'center',
            gap: 8,
        },

        eligibleText: {
            flex: 1,
            color: COLORS.orange,
            fontFamily: 'Inter_600SemiBold',
            fontSize: 12.5,
        },

        menuTitle: {
            color:
                COLORS.black,

            fontFamily:
                'Poppins_600SemiBold',

            fontSize:
                13.5,
        },

        menuSubtitle: {
            marginTop:
                3,

            color:
                COLORS.muted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                12,
        },

        infoRow: {
            minHeight:
                63,

            flexDirection:
                'row',

            alignItems:
                'center',

            paddingVertical:
                9,
        },

        infoIcon: {
            width:
                37,

            height:
                37,

            marginRight:
                11,

            borderRadius:
                19,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.pinkSoft,
        },

        infoContent: {
            flex:
                1,

            minWidth:
                0,
        },

        infoLabel: {
            color:
                COLORS.lightMuted,

            fontFamily:
                'Inter_500Medium',

            fontSize:
                11.5,
        },

        infoValue: {
            marginTop:
                3,

            color:
                COLORS.black,

            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                13,

            lineHeight:
                18,
        },

        medicalRow: {
            minHeight:
                73,

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'space-between',
        },

        medicalLeft: {
            flex:
                1,

            flexDirection:
                'row',

            alignItems:
                'center',
        },

        medicalIcon: {
            width:
                40,

            height:
                40,

            marginRight:
                10,

            borderRadius:
                20,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.pinkSoft,
        },

        medicalLabel: {
            color:
                COLORS.black,

            fontFamily:
                'Poppins_600SemiBold',

            fontSize:
                13.5,
        },

        medicalHelper: {
            marginTop:
                3,

            color:
                COLORS.lightMuted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                12,
        },

        bloodBadge: {
            minWidth:
                46,

            height:
                39,

            paddingHorizontal:
                10,

            borderRadius:
                11,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.redButton,
        },

        bloodBadgeText: {
            color:
                COLORS.white,

            fontFamily:
                'Poppins_700Bold',

            fontSize:
                13.5,
        },

        statusRow: {
            minHeight:
                62,

            flexDirection:
                'row',

            alignItems:
                'center',

            justifyContent:
                'space-between',
        },

        statusLeft: {
            flex:
                1,

            flexDirection:
                'row',

            alignItems:
                'center',
        },

        statusIcon: {
            width:
                37,

            height:
                37,

            marginRight:
                11,

            borderRadius:
                19,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.graySoft,
        },

        statusLabel: {
            color:
                COLORS.black,

            fontFamily:
                'Inter_500Medium',

            fontSize:
                13,
        },

        statusBadge: {
            maxWidth:
                142,

            paddingHorizontal:
                9,

            paddingVertical:
                5,

            borderRadius:
                12,
        },

        statusBadgeActive: {
            backgroundColor:
                COLORS.greenSoft,
        },

        statusBadgeNeutral: {
            backgroundColor:
                COLORS.graySoft,
        },

        statusBadgeText: {
            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                11.5,

            textAlign:
                'center',
        },

        statusBadgeTextActive: {
            color:
                COLORS.green,
        },

        statusBadgeTextNeutral: {
            color:
                COLORS.muted,
        },

        errorCard: {
            minHeight:
                58,

            marginBottom:
                18,

            paddingHorizontal:
                12,

            paddingVertical:
                10,

            flexDirection:
                'row',

            alignItems:
                'center',

            gap:
                9,

            borderRadius:
                12,

            borderWidth:
                1,

            borderColor:
                '#ECB0B2',

            backgroundColor:
                COLORS.pinkSoft,
        },

        errorContent: {
            flex:
                1,
        },

        errorTitle: {
            color:
                COLORS.redButton,

            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                13.5,
        },

        errorText: {
            marginTop:
                2,

            color:
                COLORS.muted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                12,
        },

        logoutButton: {
            height:
                49,

            marginTop:
                3,

            borderRadius:
                12,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.redButton,

            shadowColor:
                '#000000',

            shadowOffset: {
                width:
                    0,

                height:
                    2,
            },

            shadowOpacity:
                0.08,

            shadowRadius:
                4,

            elevation:
                2,
        },

        logoutText: {
            color:
                COLORS.white,

            fontFamily:
                'Poppins_600SemiBold',

            fontSize:
                14,
        },

        footerText: {
            marginTop:
                18,

            color:
                COLORS.lightMuted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                11.5,

            textAlign:
                'center',
        },

        logoutModalBackdrop: {
            flex:
                1,

            alignItems:
                'center',

            justifyContent:
                'center',

            paddingHorizontal:
                24,

            backgroundColor:
                'rgba(0, 0, 0, 0.52)',
        },

        logoutModalCard: {
            width:
                '100%',

            maxWidth:
                340,

            paddingHorizontal: 24,

            paddingTop: 28,

            paddingBottom: 20,

            borderRadius:
                22,

            alignItems:
                'center',

            backgroundColor:
                COLORS.white,

            shadowColor:
                '#000000',

            shadowOffset: {
                width:
                    0,

                height:
                    8,
            },

            shadowOpacity:
                0.18,

            shadowRadius:
                18,

            elevation:
                12,
        },

        logoutModalIcon: {
            width: ICON_TILE.lg.size,

            height: ICON_TILE.lg.size,

            marginBottom: 16,

            borderRadius: ICON_TILE.lg.radius,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.pinkSoft,
        },

        logoutModalTitle: {
            color:
                COLORS.black,

            fontFamily: 'Poppins_600SemiBold',

            fontSize:
                17,

            textAlign:
                'center',

            lineHeight: 24,
        },

        logoutModalMessage: {
            maxWidth:
                255,

            marginTop: 6,

            color:
                COLORS.muted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                13.5,

            lineHeight:
                20,

            textAlign:
                'center',
        },

        logoutModalActions: {
            width:
                '100%',

            marginTop: 24,

            flexDirection:
                'row',

            gap: 8,
        },

        logoutCancelButton: {
            flex:
                1,

            height: 48,

            alignItems:
                'center',

            justifyContent:
                'center',

            borderWidth: 0,

            borderColor:
                COLORS.border,

            borderRadius:
                12,

            backgroundColor: '#F2F2F4',
        },

        logoutCancelText: {
            color:
                COLORS.black,

            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                13,
        },

        logoutConfirmButton: {
            flex:
                1,

            height: 48,

            alignItems:
                'center',

            justifyContent:
                'center',

            borderRadius:
                12,

            backgroundColor:
                COLORS.redButton,
        },

        logoutConfirmDisabled: {
            opacity:
                0.55,
        },

        logoutConfirmText: {
            color:
                COLORS.white,

            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                13,
        },

        actionPopupBackdrop: {
            flex:
                1,

            paddingHorizontal:
                24,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                'rgba(0, 0, 0, 0.52)',
        },

        actionPopupCard: {
            width:
                '100%',

            maxWidth: 340,

            paddingHorizontal: 24,

            paddingTop: 28,

            paddingBottom: 20,

            borderRadius:
                22,

            alignItems:
                'center',

            backgroundColor:
                COLORS.white,

            shadowColor:
                '#000000',

            shadowOffset: {
                width:
                    0,

                height:
                    8,
            },

            shadowOpacity:
                0.18,

            shadowRadius:
                18,

            elevation:
                12,
        },

        actionPopupIcon: {
            width: ICON_TILE.lg.size,

            height: ICON_TILE.lg.size,

            marginBottom: 16,

            borderRadius: ICON_TILE.lg.radius,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.pinkSoft,
        },

        actionPopupIconSuccess: {
            backgroundColor:
                COLORS.greenSoft,
        },

        actionPopupIconWarning: {
            backgroundColor:
                COLORS.orangeSoft,
        },

        actionPopupIconError: {
            backgroundColor:
                COLORS.pinkSoft,
        },

        actionPopupTitle: {
            color:
                COLORS.black,

            fontFamily:
                'Poppins_700Bold',

            fontSize: 17,

            lineHeight: 24,

            textAlign:
                'center',
        },

        actionPopupMessage: {
            maxWidth:
                275,

            marginTop: 6,

            color:
                COLORS.muted,

            fontFamily:
                'Inter_400Regular',

            fontSize:
                13.5,

            lineHeight:
                20,

            textAlign:
                'center',
        },

        actionPopupButton: {
            width:
                '100%',

            height: 48,

            marginTop: 24,

            borderRadius: 12,

            alignItems:
                'center',

            justifyContent:
                'center',

            backgroundColor:
                COLORS.redButton,
        },

        actionPopupButtonText: {
            color:
                COLORS.white,

            fontFamily:
                'Inter_600SemiBold',

            fontSize:
                14,
        },
    });