import { useCallback, useState, } from 'react';
import { Image, Modal, Platform, ScrollView, StyleSheet, Text, TouchableOpacity, View, } from 'react-native';
import { MaterialIcons, } from '@expo/vector-icons';
import { LinearGradient, } from 'expo-linear-gradient';
import { router, useFocusEffect, } from 'expo-router';
import { StatusBar, } from 'expo-status-bar';
import { SafeAreaView, } from 'react-native-safe-area-context';
import MainBottomNav from '../../components/MainBottomNav';
import { getCurrentUser, logoutUser, } from '../../lib/api';
import { getMyDonorApplication, } from '../../lib/donorApplication';
import type { DonorApplication, } from '../../lib/donorApplication';
import { clearSession, getAccessToken, } from '../../lib/session';

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
            async () => {
                const token =
                    await getAccessToken();

                if (!token) {
                    router.replace(
                        '/'
                    );

                    return;
                }

                try {
                    setLoading(
                        true
                    );

                    setErrorMessage(
                        ''
                    );

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

                    setProfile(
                        data.user
                    );
                } catch (error) {
                    console.log(
                        'PROFILE LOAD ERROR:',
                        error
                    );

                    setErrorMessage(
                        error instanceof Error
                            ? error.message
                            : 'Unable to load your profile.'
                    );
                } finally {
                    setLoading(
                        false
                    );
                }

                try {
                    setLoadingDonorStatus(
                        true
                    );

                    const data =
                        await getMyDonorApplication(
                            token
                        );

                    setDonorApplication(
                        data?.application ||
                        null
                    );
                } catch (error) {
                    console.log(
                        'PROFILE DONOR STATUS ERROR:',
                        error
                    );

                    setDonorApplication(
                        null
                    );
                } finally {
                    setLoadingDonorStatus(
                        false
                    );
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

    const email =
        profile?.email ||
        'Email unavailable';

    const phone =
        profile?.phone ||
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

    function handleNotifications() {
        router.push(
            '/notifications' as any
        );
    }

    function handleHelpCenter() {
        router.push(
            '/help' as any
        );
    }

    function handleAbout() {
        showMessage(
            'About Hemo-Hero',
            'Hemo-Hero helps connect people requesting blood with compatible nearby donors.'
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

            await clearSession();

            setLogoutModalVisible(
                false
            );

            router.replace(
                '/'
            );
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
                    edges={[
                        'top',
                        'bottom',
                    ]}
                >
                    <StatusBar
                        style="light"
                    />

                    <View
                        style={
                            styles.headerArea
                        }
                    >
                        <LinearGradient
                            colors={[
                                '#D2151A',
                                COLORS.redDark,
                            ]}
                            style={
                                styles.hero
                            }
                        >
                            <View
                                style={
                                    styles.heroCircleLeft
                                }
                            />

                            <View
                                style={
                                    styles.heroCircleRight
                                }
                            />

                            <View
                                style={
                                    styles.topBar
                                }
                            >
                                <TouchableOpacity
                                    style={
                                        styles.topButton
                                    }
                                    activeOpacity={
                                        0.7
                                    }
                                    onPress={() =>
                                        router.replace(
                                            '/dashboard'
                                        )
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
                                    <View
                                        style={
                                            styles.avatar
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
                                    </View>

                                    <TouchableOpacity
                                        style={
                                            styles.cameraButton
                                        }
                                        activeOpacity={
                                            0.8
                                        }
                                        onPress={
                                            handleEditProfile
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
                                    loadProfile
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
                                title="Notifications"
                                subtitle="Your alerts and updates"
                                onPress={
                                    handleNotifications
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
                                subtitle="Learn about the Hemo-Hero project"
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
                                    <MaterialIcons
                                        name="logout"
                                        size={28}
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
                                    <MaterialIcons
                                        name={
                                            actionPopup.variant ===
                                            'success'
                                                ? 'check-circle-outline'
                                                : actionPopup.variant ===
                                                  'warning'
                                                    ? 'warning-amber'
                                                    : actionPopup.variant ===
                                                      'error'
                                                        ? 'error-outline'
                                                        : 'info-outline'
                                        }
                                        size={31}
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

        safeArea: {
            flex: 1,

            backgroundColor:
                COLORS.redDark,
        },

        headerArea: {
            position:
                'relative',

            height:
                248,

            zIndex:
                10,

            overflow:
                'visible',

            backgroundColor:
                COLORS.page,
        },

        hero: {
            height:
                210,

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

        contentContainer: {
            paddingHorizontal:
                18,

            paddingTop:
                18,

            paddingBottom:
                32,
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

            paddingHorizontal:
                22,

            paddingTop:
                26,

            paddingBottom:
                20,

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
            width:
                58,

            height:
                58,

            marginBottom:
                15,

            borderRadius:
                29,

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

            fontFamily:
                'Poppins_700Bold',

            fontSize:
                17,

            textAlign:
                'center',
        },

        logoutModalMessage: {
            maxWidth:
                255,

            marginTop:
                7,

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

            marginTop:
                23,

            flexDirection:
                'row',

            gap:
                10,
        },

        logoutCancelButton: {
            flex:
                1,

            height:
                46,

            alignItems:
                'center',

            justifyContent:
                'center',

            borderWidth:
                1,

            borderColor:
                COLORS.border,

            borderRadius:
                12,

            backgroundColor:
                COLORS.white,
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

            height:
                46,

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

            maxWidth:
                340,

            paddingHorizontal:
                22,

            paddingTop:
                25,

            paddingBottom:
                20,

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
            width:
                58,

            height:
                58,

            marginBottom:
                14,

            borderRadius:
                29,

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

            fontSize:
                17,

            lineHeight:
                24,

            textAlign:
                'center',
        },

        actionPopupMessage: {
            maxWidth:
                275,

            marginTop:
                7,

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

            height:
                46,

            marginTop:
                21,

            borderRadius:
                12,

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