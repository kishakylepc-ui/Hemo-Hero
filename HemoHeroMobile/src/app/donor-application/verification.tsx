import { useState } from 'react';
import {
  Alert,
  Image,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { router, useLocalSearchParams } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';

import {
  submitDonorApplication,
  uploadDonorVerificationId,
} from '../../lib/donorApplication';
import type { VerificationImageAsset } from '../../lib/donorApplication';
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

export default function DonorVerificationScreen() {
  const params = useLocalSearchParams<{
    blood_type?: string;
    has_donated_before?: string;
    last_donation_date?: string;
    last_donation_month?: string;
    last_donation_year?: string;
    last_donation_facility?: string;
    current_latitude?: string;
    current_longitude?: string;
    travel_radius_km?: string;
    availability_status?: string;
    allow_urgent_requests?: string;
  }>();

  const [verificationImage, setVerificationImage] =
    useState<VerificationImageAsset | null>(null);
  const [consent, setConsent] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  async function handlePickImage() {
    if (submitting) return;

    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (permission.status !== 'granted') {
      showMessage(
        'Permission Required',
        'Allow photo access to upload your verification ID.',
      );
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.85,
    });

    if (result.canceled || !result.assets?.[0]) return;

    const asset = result.assets[0];

    setVerificationImage({
      uri: asset.uri,
      fileName: asset.fileName,
      mimeType: asset.mimeType,
      file: (asset as any).file || null,
    });

    setErrorMessage('');
  }

  function showMessage(title: string, message: string) {
    if (Platform.OS === 'web' && typeof window !== 'undefined') {
      window.alert(`${title}\n\n${message}`);
      return;
    }

    Alert.alert(title, message);
  }

  async function handleSubmit() {
    if (submitting) return;

    if (!verificationImage) {
      setErrorMessage('Upload a valid government-issued ID.');
      return;
    }

    if (!consent) {
      setErrorMessage(
        'Confirm the donor verification consent before submitting.',
      );
      return;
    }

    try {
      setSubmitting(true);
      setErrorMessage('');

      const token = await getAccessToken();

      if (!token) {
        router.replace('/');
        return;
      }

      const uploadResult = await uploadDonorVerificationId(
        token,
        verificationImage,
      );

      const applicationResult = await submitDonorApplication(token, {
        blood_type: params.blood_type || '',
        has_donated_before: params.has_donated_before === 'true',
        last_donation_date: params.last_donation_date || null,
        last_donation_month: params.last_donation_month
          ? Number(params.last_donation_month)
          : null,
        last_donation_year: params.last_donation_year
          ? Number(params.last_donation_year)
          : null,
        last_donation_facility: params.last_donation_facility || null,
        current_latitude: Number(params.current_latitude),
        current_longitude: Number(params.current_longitude),
        travel_radius_km: Number(params.travel_radius_km) as 5 | 10 | 20 | 30 | 50,
        availability_status:
          params.availability_status === 'unavailable'
            ? 'unavailable'
            : 'available',
        allow_urgent_requests: params.allow_urgent_requests === 'true',
        verification_id_path: uploadResult.path,
        consent_confirmed: true,
      });

      router.replace({
        pathname: '/donor-application/success',
        params: {
          status: applicationResult.application.status,
        },
      } as any);
    } catch (error) {
      console.log('SUBMIT DONOR APPLICATION ERROR:', error);

      const message =
        error instanceof Error
          ? error.message
          : 'Unable to submit donor application.';

      setErrorMessage(message);
      showMessage('Unable to Submit Application', message);
    } finally {
      setSubmitting(false);
    }
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
                disabled={submitting}
                activeOpacity={0.75}
                onPress={() => router.replace('/dashboard')}
              >
                <MaterialIcons name="arrow-back" size={26} color={COLORS.white} />
              </TouchableOpacity>

              <View style={styles.headerCopy}>
                <Text style={styles.headerTitle}>Apply as a Donor</Text>
                <Text style={styles.headerSubtitle}>Step 4 of 4</Text>
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
                <View
                  style={styles.progressRow}
                  accessibilityLabel="Step 4 of 4"
                >
                  {['Blood', 'History', 'Availability', 'Verify'].map(
                    (step, index) => (
                      <View key={step} style={styles.progressStep}>
                        <View
                          style={[
                            styles.progressLine,
                            index < 4 && styles.progressActive,
                          ]}
                        />
                        <Text
                          style={[
                            styles.progressLabel,
                            index === 3 && styles.progressLabelActive,
                          ]}
                        >
                          {step}
                        </Text>
                      </View>
                    ),
                  )}
                </View>

                <Text style={styles.title}>Identity Verification</Text>
                <Text style={styles.description}>
                  Upload a clear government-issued ID for verification.
                </Text>

                <TouchableOpacity
                  accessibilityRole="button"
                  style={styles.uploadBox}
                  activeOpacity={0.8}
                  disabled={submitting}
                  onPress={handlePickImage}
                >
                  {verificationImage ? (
                    <>
                      <Image
                        source={{ uri: verificationImage.uri }}
                        style={styles.previewImage}
                        resizeMode="contain"
                      />

                      <View style={styles.uploadOverlay}>
                        <MaterialIcons
                          name="edit"
                          size={18}
                          color={COLORS.white}
                        />
                        <Text style={styles.changeText}>Change Image</Text>
                      </View>
                    </>
                  ) : (
                    <>
                      <View style={styles.uploadIcon}>
                        <MaterialIcons
                          name="file-upload"
                          size={27}
                          color={COLORS.redButton}
                        />
                      </View>

                      <Text style={styles.uploadTitle}>
                        Upload Verification ID
                      </Text>
                      <Text style={styles.uploadSubtitle}>
                        Government-issued ID{'\n'}
                        JPG, PNG or WEBP · Up to 5 MB
                      </Text>
                    </>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  accessibilityRole="checkbox"
                  accessibilityState={{
                    checked: consent,
                    disabled: submitting,
                  }}
                  style={[
                    styles.consentCard,
                    consent && styles.consentCardSelected,
                  ]}
                  disabled={submitting}
                  onPress={() => setConsent((current) => !current)}
                >
                  <MaterialIcons
                    name={consent ? 'check-box' : 'check-box-outline-blank'}
                    size={23}
                    color={consent ? COLORS.redButton : COLORS.muted}
                  />

                  <Text style={styles.consentText}>
                    I confirm that the information I provided is accurate and I
                    agree to the donor verification process.
                  </Text>
                </TouchableOpacity>

                {errorMessage ? (
                  <Text style={styles.errorText}>{errorMessage}</Text>
                ) : null}

                <View style={styles.spacer} />

                <View style={styles.buttonRow}>
                  <TouchableOpacity
                    accessibilityRole="button"
                    style={styles.backBottom}
                    disabled={submitting}
                    onPress={() => router.back()}
                  >
                    <Text style={styles.backText}>Back</Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    accessibilityRole="button"
                    style={[
                      styles.submitButton,
                      submitting && styles.disabledButton,
                    ]}
                    disabled={submitting}
                    onPress={handleSubmit}
                  >
                    <Text style={styles.submitText}>
                      {submitting ? 'Submitting...' : 'Submit Application'}
                    </Text>
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
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor:
      Platform.OS === 'web' ? '#242424' : COLORS.backgroundBottom,
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
  progressLine: {
    height: 4,
    borderRadius: 3,
    backgroundColor: '#E9E2E4',
  },
  progressActive: { backgroundColor: COLORS.redButton },
  progressLabel: {
    marginTop: 6,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_500Medium',
    fontSize: 9,
    lineHeight: 14,
  },
  progressLabelActive: {
    color: COLORS.redButton,
    fontFamily: 'Inter_600SemiBold',
  },
  title: {
    color: COLORS.black, fontFamily: 'Poppins_600SemiBold', fontSize: 17, lineHeight: 24,
  },
  description: {
    marginTop: 3, marginBottom: 18, color: COLORS.muted,
    fontFamily: 'Inter_400Regular', fontSize: 11.5, lineHeight: 17,
  },
  uploadBox: {
    marginBottom: 15,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1.5,
    borderStyle: 'dashed',
    borderColor: '#D88787',
    borderRadius: 12,
    backgroundColor: '#FFF7F7',
    minHeight: 180,
    paddingVertical: 20,
    paddingHorizontal: 12,
  },
  uploadIcon: {
    width: 46,
    height: 46,
    marginBottom: 9,
    borderRadius: 27,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.white,
  },
  uploadTitle: {
    color: COLORS.black,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 11.5,
    lineHeight: 18,
  },
  uploadSubtitle: {
    maxWidth: 250,
    marginTop: 5,
    color: COLORS.lightMuted,
    fontFamily: 'Inter_400Regular',
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: 'center',
  },
  previewImage: { width: '100%', height: 180 },
  uploadOverlay: {
    position: 'absolute',
    bottom: 10,
    paddingHorizontal: 12,
    paddingVertical: 7,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    borderRadius: 10,
    backgroundColor: 'rgba(0,0,0,0.65)',
    minHeight: 44,
  },
  changeText: {
    color: COLORS.white,
    fontFamily: 'Inter_600SemiBold',
    fontSize: 12,
  },
  consentCard: {
    minHeight: 72,
    padding: 13,
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 9,
    borderWidth: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
    backgroundColor: COLORS.white,
  },
  consentCardSelected: {
    borderColor: '#DFAAAA',
    backgroundColor: '#FFF9F9',
  },
  consentText: {
    flex: 1,
    color: COLORS.black,
    fontFamily: 'Inter_400Regular',
    fontSize: 10.5,
    lineHeight: 16,
  },
  errorText: {
    marginTop: 12,
    color: COLORS.redButton,
    fontFamily: 'Inter_500Medium',
    fontSize: 9.5,
    lineHeight: 14,
    textAlign: 'center',
  },
  spacer: { flex: 1, minHeight: 24 },
  buttonRow: { flexDirection: 'row', gap: 11 },
  backBottom: {
    flex: 0.8,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: '#F3F0F1',
    minHeight: 49,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  backText: {
    color: '#444444',
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    lineHeight: 20,
    textAlign: 'center',
    flexShrink: 1,
  },
  submitButton: {
    flex: 1.6,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 13,
    backgroundColor: COLORS.redButton,
    minHeight: 49,
    paddingVertical: 13,
    paddingHorizontal: 10,
  },
  submitText: {
    color: COLORS.white,
    fontFamily: 'Poppins_600SemiBold',
    fontSize: 11.5,
    lineHeight: 20,
    textAlign: 'center',
    flexShrink: 1,
  },
  disabledButton: { opacity: 0.55 },
});