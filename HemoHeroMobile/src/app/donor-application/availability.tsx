import { useCallback, useState } from 'react';
import {
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useFocusEffect, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as Location from 'expo-location';

import { getCurrentUser } from '../../lib/api';
import { getAccessToken } from '../../lib/session';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  redButton: '#B42323',
  white: '#FFFFFF',
  black: '#171717',
  backgroundTop: '#F3B5B7',
  backgroundBottom: '#D90B12',
  muted: '#666666',
  lightMuted: '#9A9A9A',
  border: '#D5D5D5',
  pink: '#FFF1F1',
  green: '#198754',
};

const DISTANCES = [5, 10, 20, 30, 50] as const;

export default function DonorAvailabilityScreen() {
  const params = useLocalSearchParams<{
    blood_type?: string;
    has_donated_before?: string;
    last_donation_date?: string;
    last_donation_month?: string;
    last_donation_year?: string;
    last_donation_facility?: string;
  }>();

  const [latitude, setLatitude] = useState<number | null>(null);
  const [longitude, setLongitude] = useState<number | null>(null);
  const [locationLabel, setLocationLabel] = useState('Current location');
  const [locationLoading, setLocationLoading] = useState(true);
  const [travelRadius, setTravelRadius] = useState<5 | 10 | 20 | 30 | 50>(20);
  const [availability, setAvailability] = useState<'available' | 'unavailable'>('available');
  const [allowUrgent, setAllowUrgent] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');

  const loadLocation = useCallback(async () => {
    try {
      setLocationLoading(true);
      setErrorMessage('');

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const profileData = await getCurrentUser(token);
      const profile = profileData?.user;
      const label = [profile?.city, profile?.province].filter(Boolean).join(', ');

      if (label) setLocationLabel(label);

      let permission = await Location.getForegroundPermissionsAsync();

      if (permission.status !== 'granted') {
        permission = await Location.requestForegroundPermissionsAsync();
      }

      if (permission.status !== 'granted') {
        setLatitude(null);
        setLongitude(null);
        setErrorMessage('Location permission is required for donor matching.');
        return;
      }

      const currentLocation = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });

      setLatitude(currentLocation.coords.latitude);
      setLongitude(currentLocation.coords.longitude);
    } catch (error) {
      console.log('DONOR LOCATION ERROR:', error);
      setErrorMessage(
        error instanceof Error ? error.message : 'Unable to retrieve your location.',
      );
    } finally {
      setLocationLoading(false);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadLocation();
    }, [loadLocation]),
  );

  function handleContinue() {
    if (latitude === null || longitude === null) {
      setErrorMessage('Update your location before continuing.');
      return;
    }

    router.push({
      pathname: '/donor-application/verification',
      params: {
        ...params,
        current_latitude: String(latitude),
        current_longitude: String(longitude),
        travel_radius_km: String(travelRadius),
        availability_status: availability,
        allow_urgent_requests: allowUrgent ? 'true' : 'false',
      },
    } as any);
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
          <StatusBar style="light" />

          <LinearGradient
            colors={['#D2151A', COLORS.redDark]}
            style={styles.header}
          >
            <View style={styles.headerCircleLeft} />
            <View style={styles.headerCircleRight} />

            <View style={styles.headerRow}>
              <TouchableOpacity
                accessibilityRole="button"
                accessibilityLabel="Back to dashboard"
                style={styles.backButton}
                activeOpacity={0.75}
                onPress={() => router.replace('/dashboard')}
              >
                <MaterialIcons name="arrow-back" size={26} color={COLORS.white} />
              </TouchableOpacity>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Apply as a Donor</Text>
                <Text style={styles.headerSubtitle}>Step 3 of 4</Text>
              </View>
            </View>
          </LinearGradient>

          <LinearGradient
            colors={[COLORS.backgroundTop, COLORS.backgroundBottom]}
            style={styles.body}
          >
            <View style={styles.card}>
              <ScrollView
                keyboardShouldPersistTaps="handled"
                contentContainerStyle={styles.scrollContent}
                showsVerticalScrollIndicator={false}
              >
                <View style={styles.progressRow} accessibilityLabel="Step 3 of 4">
                  {['Blood', 'History', 'Availability', 'Verify'].map((step, index) => (
                    <View key={step} style={styles.progressStep}>
                      <View style={[styles.progressLine, index < 3 && styles.progressActive]} />
                      <Text
                        style={[
                          styles.progressLabel,
                          index === 2 && styles.progressLabelActive,
                        ]}
                      >
                        {step}
                      </Text>
                    </View>
                  ))}
                </View>

                <Text style={styles.title}>Location & Availability</Text>
                <Text style={styles.description}>
                  Tell Hemo-Hero where you can help and when you are available.
                </Text>

                <Text style={styles.label}>Current Location</Text>

                <View style={styles.locationCard}>
                  <View style={styles.locationIcon}>
                    <MaterialIcons name="location-on" size={21} color={COLORS.redButton} />
                  </View>

                  <View style={styles.locationContent}>
                    <Text style={styles.locationTitle}>{locationLabel}</Text>
                    <Text style={styles.locationSubtitle}>
                      {locationLoading
                        ? 'Getting current location...'
                        : latitude !== null
                          ? 'Current location ready'
                          : 'Location unavailable'}
                    </Text>
                  </View>

                  <TouchableOpacity
                    accessibilityRole="button"
                    accessibilityLabel="Update current location"
                    style={styles.updateButton}
                    disabled={locationLoading}
                    onPress={loadLocation}
                  >
                    <Text style={styles.updateText}>Update</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.label}>How far are you willing to travel?</Text>

                <View style={styles.distanceRow}>
                  {DISTANCES.map((distance) => {
                    const selected = travelRadius === distance;

                    return (
                      <TouchableOpacity
                        key={distance}
                        accessibilityRole="button"
                        accessibilityState={{ selected }}
                        style={[styles.distanceButton, selected && styles.distanceButtonSelected]}
                        onPress={() => setTravelRadius(distance)}
                      >
                        <Text style={[styles.distanceText, selected && styles.distanceTextSelected]}>
                          {distance} km
                        </Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>

                <Text style={styles.label}>Availability</Text>

                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ checked: availability === 'available' }}
                  style={[
                    styles.choiceCard,
                    availability === 'available' && styles.choiceSelected,
                  ]}
                  onPress={() => setAvailability('available')}
                >
                  <MaterialIcons
                    name={
                      availability === 'available'
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={19}
                    color={availability === 'available' ? COLORS.green : COLORS.muted}
                  />
                  <View style={styles.choiceContent}>
                    <Text style={styles.choiceTitle}>Available to Donate</Text>
                    <Text style={styles.choiceDescription}>
                      Include me in compatible donor matching.
                    </Text>
                  </View>
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="radio"
                  accessibilityState={{ checked: availability === 'unavailable' }}
                  style={[
                    styles.choiceCard,
                    availability === 'unavailable' && styles.choiceSelected,
                  ]}
                  onPress={() => setAvailability('unavailable')}
                >
                  <MaterialIcons
                    name={
                      availability === 'unavailable'
                        ? 'radio-button-checked'
                        : 'radio-button-unchecked'
                    }
                    size={19}
                    color={availability === 'unavailable' ? COLORS.redButton : COLORS.muted}
                  />
                  <View style={styles.choiceContent}>
                    <Text style={styles.choiceTitle}>Temporarily Unavailable</Text>
                    <Text style={styles.choiceDescription}>
                      Keep my donor profile but pause matching.
                    </Text>
                  </View>
                </TouchableOpacity>

                <Text style={styles.label}>Emergency Requests</Text>

                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{ checked: allowUrgent }}
                  style={styles.urgentCard}
                  onPress={() => setAllowUrgent((current) => !current)}
                >
                  <MaterialIcons
                    name={allowUrgent ? 'check-box' : 'check-box-outline-blank'}
                    size={22}
                    color={allowUrgent ? COLORS.redButton : COLORS.muted}
                  />
                  <View style={styles.choiceContent}>
                    <Text style={styles.choiceTitle}>Notify me about urgent requests</Text>
                    <Text style={styles.choiceDescription}>
                      Receive urgent compatible requests within your travel range.
                    </Text>
                  </View>
                </TouchableOpacity>

                {errorMessage ? <Text style={styles.errorText}>{errorMessage}</Text> : null}

                <View style={styles.spacer} />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.backBottom}
                    onPress={() => router.back()}
                  >
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.continueButton}
                    onPress={handleContinue}
                  >
                    <Text style={styles.continueText}>Continue</Text>
                    <MaterialIcons name="arrow-forward" size={18} color={COLORS.white} />
                  </TouchableOpacity>
                </View>
              </ScrollView>
            </View>
          </LinearGradient>
        </SafeAreaView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  desktopBackground: {
    flex: 1, alignItems: 'center', justifyContent: 'center',
    backgroundColor: Platform.OS === 'web' ? '#242424' : COLORS.backgroundBottom,
  },
  phone: {
    width: Platform.OS === 'web' ? 440 : '100%',
    height: '100%', maxWidth: '100%', overflow: 'hidden',
    backgroundColor: COLORS.backgroundBottom,
  },
  safeArea: { flex: 1, backgroundColor: COLORS.red },
  header: {
    height: Platform.OS === 'web' ? 118 : 108,
    paddingHorizontal: 25,
    paddingTop: Platform.OS === 'web' ? 18 : 6,
    overflow: 'hidden',
  },
  headerCircleLeft: {
    position: 'absolute', width: 160, height: 160, borderRadius: 80,
    left: -98, top: -73, backgroundColor: 'rgba(255,255,255,0.06)',
  },
  headerCircleRight: {
    position: 'absolute', width: 170, height: 170, borderRadius: 85,
    right: -73, top: -78, backgroundColor: 'rgba(255,255,255,0.08)',
  },
  headerRow: { flexDirection: 'row', alignItems: 'center', marginTop: 1 },
  headerCopy: { flex: 1, minWidth: 0 },
  backButton: {
    width: 43, height: 43, marginRight: 17, borderRadius: 22,
    borderWidth: 3, borderColor: COLORS.white,
    alignItems: 'center', justifyContent: 'center',
  },
  headerTitle: {
    color: COLORS.white, fontFamily: 'Poppins_700Bold', fontSize: 20, lineHeight: 27,
  },
  headerSubtitle: {
    marginTop: 1, color: 'rgba(255,255,255,0.82)',
    fontFamily: 'Inter_400Regular', fontSize: 11, lineHeight: 17,
  },
  body: { flex: 1, paddingHorizontal: 18, paddingBottom: 16 },
  card: {
    flex: 1, marginTop: -14, borderRadius: 27, overflow: 'hidden',
    backgroundColor: '#FAFAFA',
    shadowColor: '#000000', shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.16, shadowRadius: 7, elevation: 6,
  },
  scrollContent: { flexGrow: 1, paddingHorizontal: 21, paddingTop: 22, paddingBottom: 30 },
  progressRow: { flexDirection: 'row', gap: 7, marginBottom: 24 },
  progressStep: { flex: 1, minWidth: 0 },
  progressLine: { height: 4, borderRadius: 3, backgroundColor: '#E9E2E4' },
  progressActive: { backgroundColor: COLORS.redButton },
  progressLabel: {
    marginTop: 6, color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium', fontSize: 9, lineHeight: 14,
  },
  progressLabelActive: {
    color: COLORS.redButton, fontFamily: 'Inter_600SemiBold',
  },
  title: {
    color: COLORS.black, fontFamily: 'Poppins_600SemiBold', fontSize: 17, lineHeight: 24,
  },
  description: {
    marginTop: 3, marginBottom: 18, color: COLORS.muted,
    fontFamily: 'Inter_400Regular', fontSize: 11.5, lineHeight: 17,
  },
  label: {
    marginBottom: 8, marginTop: 3, color: COLORS.black,
    fontFamily: 'Inter_500Medium', fontSize: 11.5, lineHeight: 18,
  },
  locationCard: {
    minHeight: 62, marginBottom: 18, paddingHorizontal: 11, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 12, backgroundColor: COLORS.white,
  },
  locationIcon: {
    width: 39, height: 39, borderRadius: 12, alignItems: 'center',
    justifyContent: 'center', marginRight: 10, backgroundColor: COLORS.pink,
  },
  locationContent: { flex: 1 },
  locationTitle: {
    color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 11.5, lineHeight: 18,
  },
  locationSubtitle: {
    marginTop: 2, color: COLORS.muted, fontFamily: 'Inter_400Regular', fontSize: 9.5,
  },
  updateButton: {
    minWidth: 60, minHeight: 44, marginLeft: 4,
    alignItems: 'center', justifyContent: 'center',
  },
  updateText: { color: COLORS.redButton, fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  distanceRow: {
    flexDirection: 'row', justifyContent: 'space-between',
    marginBottom: 21, flexWrap: 'wrap', rowGap: 8,
  },
  distanceButton: {
    width: '18%', minHeight: 43, paddingVertical: 9,
    alignItems: 'center', justifyContent: 'center', borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 10, backgroundColor: COLORS.white,
  },
  distanceButtonSelected: {
    borderColor: COLORS.redButton, backgroundColor: COLORS.redButton,
  },
  distanceText: { color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 10 },
  distanceTextSelected: { color: COLORS.white },
  choiceCard: {
    minHeight: 55, marginBottom: 8, paddingHorizontal: 12, paddingVertical: 12,
    flexDirection: 'row', alignItems: 'center', gap: 9, borderWidth: 1,
    borderColor: COLORS.border, borderRadius: 11, backgroundColor: COLORS.white,
  },
  choiceSelected: { borderColor: '#DFAAAA', backgroundColor: '#FFF8F8' },
  choiceContent: { flex: 1 },
  choiceTitle: {
    color: COLORS.black, fontFamily: 'Inter_500Medium', fontSize: 11.5, lineHeight: 18,
  },
  choiceDescription: {
    marginTop: 2, color: COLORS.muted, fontFamily: 'Inter_400Regular',
    fontSize: 12, lineHeight: 18,
  },
  urgentCard: {
    minHeight: 60, paddingHorizontal: 12, paddingVertical: 10,
    flexDirection: 'row', alignItems: 'center', gap: 9,
    borderRadius: 11, borderWidth: 1, borderColor: '#EAB7B7',
    backgroundColor: COLORS.pink,
  },
  errorText: {
    marginTop: 12, color: COLORS.redButton,
    fontFamily: 'Inter_500Medium', fontSize: 10, textAlign: 'center',
  },
  spacer: { flex: 1, minHeight: 24 },
  buttonRow: { flexDirection: 'row', gap: 11 },
  backBottom: {
    flex: 0.8, minHeight: 49, paddingVertical: 12, paddingHorizontal: 10,
    alignItems: 'center', justifyContent: 'center',
    borderRadius: 13, backgroundColor: '#F3F0F1',
  },
  backText: {
    color: '#444444', fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5, lineHeight: 18, textAlign: 'center', flexShrink: 1,
  },
  continueButton: {
    flex: 1.2, minHeight: 49, paddingVertical: 12, paddingHorizontal: 10,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, borderRadius: 13, backgroundColor: COLORS.redButton,
  },
  continueText: {
    color: COLORS.white, fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5, lineHeight: 18, textAlign: 'center', flexShrink: 1,
  },
});