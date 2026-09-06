import {
  Platform,
  Pressable,
  StyleSheet,
  Text,
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
  useLocalSearchParams,
} from 'expo-router';

import {
  StatusBar,
} from 'expo-status-bar';

import {
  SafeAreaView,
} from 'react-native-safe-area-context';

export default function ApplicationDetailsPlaceholder() {
  const {
    id,
  } =
    useLocalSearchParams<{
      id: string;
    }>();

  return (
    <View
      style={
        styles.outer
      }
    >
      <StatusBar
        style="light"
      />

      <LinearGradient
        colors={[
          '#102454',
          '#071126',
          '#050B19',
        ]}
        style={
          styles.screen
        }
      >
        <SafeAreaView
          style={
            styles.safeArea
          }
        >
          <View
            style={
              styles.header
            }
          >
            <Pressable
              style={
                styles.backButton
              }
              onPress={() =>
                router.back()
              }
            >
              <MaterialIcons
                name="arrow-back"
                size={22}
                color="#FFFFFF"
              />

              <Text
                style={
                  styles.backText
                }
              >
                Applications
              </Text>
            </Pressable>
          </View>

          <View
            style={
              styles.content
            }
          >
            <MaterialIcons
              name="fact-check"
              size={54}
              color="#EF3340"
            />

            <Text
              style={
                styles.title
              }
            >
              Application Review
            </Text>

            <Text
              style={
                styles.description
              }
            >
              Application ID
            </Text>

            <Text
              style={
                styles.idText
              }
            >
              {id}
            </Text>

            <Text
              style={
                styles.nextText
              }
            >
              The complete donor verification and approval screen is the next part we will build.
            </Text>
          </View>
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
}

const styles =
  StyleSheet.create({
    outer: {
      flex: 1,

      backgroundColor:
        '#02040A',
    },

    screen: {
      flex: 1,
    },

    safeArea: {
      flex: 1,
    },

    header: {
      height: 86,

      paddingHorizontal: 40,

      justifyContent:
        'center',

      borderBottomWidth: 1,

      borderBottomColor:
        '#243554',
    },

    backButton: {
      flexDirection:
        'row',

      alignItems:
        'center',

      gap: 9,

      alignSelf:
        'flex-start',
    },

    backText: {
      color:
        '#FFFFFF',

      fontFamily:
        'Inter_600SemiBold',

      fontSize: 13,
    },

    content: {
      flex: 1,

      alignItems:
        'center',

      justifyContent:
        'center',

      paddingHorizontal:
        40,
    },

    title: {
      marginTop: 15,

      color:
        '#FFFFFF',

      fontFamily:
        'Poppins_700Bold',

      fontSize: 28,
    },

    description: {
      marginTop: 16,

      color:
        '#909BB7',

      fontFamily:
        'Inter_400Regular',

      fontSize: 12,
    },

    idText: {
      marginTop: 5,

      color:
        '#B7C1D8',

      fontFamily:
        'Inter_500Medium',

      fontSize: 11,
    },

    nextText: {
      maxWidth: 520,

      marginTop: 24,

      color:
        '#909BB7',

      fontFamily:
        'Inter_400Regular',

      fontSize: 13,

      lineHeight: 20,

      textAlign:
        'center',
    },
  });