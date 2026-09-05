import {
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';

import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  clearSession,
} from '../lib/session';

const COLORS = {
  red: '#DB0A0A',
  redDark: '#8F1111',
  white: '#FFFFFF',
  black: '#111111',
  background: '#F7F7F7',
  muted: '#666666',
};

export default function DashboardScreen() {
  async function handleLogout() {
    await clearSession();

    router.replace('/');
  }

  return (
    <View style={styles.desktopBackground}>
      <View style={styles.phone}>
        <SafeAreaView
          style={styles.safeArea}
          edges={['top', 'bottom']}
        >
          <StatusBar style="light" />

          {/* HEADER */}

          <View style={styles.header}>
            <View>
              <Text style={styles.headerSmall}>
                Welcome to
              </Text>

              <Text style={styles.headerTitle}>
                Hemo-Hero
              </Text>
            </View>

            <TouchableOpacity
              style={styles.logoutButton}
              activeOpacity={0.8}
              onPress={handleLogout}
            >
              <MaterialIcons
                name="logout"
                size={20}
                color={COLORS.white}
              />
            </TouchableOpacity>
          </View>

          {/* BODY */}

          <View style={styles.body}>
            <View style={styles.placeholderCard}>
              <View style={styles.iconCircle}>
                <MaterialIcons
                  name="bloodtype"
                  size={36}
                  color={COLORS.red}
                />
              </View>

              <Text style={styles.title}>
                Dashboard
              </Text>

              <Text style={styles.description}>
                Your Hemo-Hero dashboard will be designed next.
              </Text>

              <Text style={styles.status}>
                Your account and profile are now connected successfully.
              </Text>
            </View>
          </View>
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
      Platform.OS === 'web'
        ? '#1E1E1E'
        : COLORS.background,
  },

  phone: {
    width:
      Platform.OS === 'web'
        ? 402
        : '100%',

    height:
      Platform.OS === 'web'
        ? 874
        : '100%',

    maxWidth: '100%',

    overflow: 'hidden',

    backgroundColor:
      COLORS.background,
  },

  safeArea: {
    flex: 1,

    backgroundColor:
      COLORS.background,
  },

  header: {
    height: 125,

    paddingHorizontal: 24,

    flexDirection: 'row',

    alignItems: 'center',
    justifyContent: 'space-between',

    backgroundColor:
      COLORS.red,
  },

  headerSmall: {
    color:
      'rgba(255,255,255,0.85)',

    fontFamily:
      'Inter_400Regular',

    fontSize: 11,
  },

  headerTitle: {
    marginTop: 2,

    color:
      COLORS.white,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 25,
  },

  logoutButton: {
    width: 42,
    height: 42,

    borderRadius: 21,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      'rgba(255,255,255,0.17)',
  },

  body: {
    flex: 1,

    paddingHorizontal: 24,
    paddingTop: 30,
  },

  placeholderCard: {
    paddingHorizontal: 24,
    paddingVertical: 35,

    alignItems: 'center',

    borderRadius: 22,

    backgroundColor:
      COLORS.white,

    shadowColor: '#000000',

    shadowOffset: {
      width: 0,
      height: 2,
    },

    shadowOpacity: 0.08,

    shadowRadius: 5,

    elevation: 3,
  },

  iconCircle: {
    width: 78,
    height: 78,

    borderRadius: 39,

    alignItems: 'center',
    justifyContent: 'center',

    backgroundColor:
      '#FDECEC',

    marginBottom: 18,
  },

  title: {
    color:
      COLORS.black,

    fontFamily:
      'Poppins_700Bold',

    fontSize: 22,
  },

  description: {
    marginTop: 8,

    color:
      COLORS.muted,

    fontFamily:
      'Inter_400Regular',

    fontSize: 12,

    lineHeight: 18,

    textAlign: 'center',
  },

  status: {
    marginTop: 22,

    paddingHorizontal: 16,
    paddingVertical: 12,

    borderRadius: 10,

    color:
      COLORS.redDark,

    backgroundColor:
      '#FFF1F1',

    fontFamily:
      'Inter_500Medium',

    fontSize: 10,

    lineHeight: 15,

    textAlign: 'center',
  },
});