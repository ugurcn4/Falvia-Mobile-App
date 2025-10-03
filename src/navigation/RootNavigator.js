import { NavigationContainer } from '@react-navigation/native';
import { View, ActivityIndicator, StyleSheet } from 'react-native';
import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

// Navigators
import AppNavigator from './AppNavigator';
import AuthNavigator from './AuthNavigator';
import OnboardingScreen from '../screens/OnboardingScreen';

// Auth Context
import { useAuth } from '../context/AuthContext';
import { colors } from '../styles/colors';

const RootNavigator = ({ navigationRef, onNavigationReady }) => {
  const { user, initializing } = useAuth();
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [checkingOnboarding, setCheckingOnboarding] = useState(true);

  useEffect(() => {
    if (!initializing && user) {
      checkOnboardingStatus();
    } else if (!initializing && !user) {
      setCheckingOnboarding(false);
    }
  }, [user, initializing]);

  const checkOnboardingStatus = async () => {
    try {
      const onboardingCompleted = await AsyncStorage.getItem('onboardingCompleted');
      setShowOnboarding(onboardingCompleted !== 'true');
    } catch (error) {
      console.error('Onboarding durumu kontrol hatası:', error);
      setShowOnboarding(true);
    } finally {
      setCheckingOnboarding(false);
    }
  };

  if (initializing || checkingOnboarding) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  if (!user) {
    return (
      <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
        <AuthNavigator />
      </NavigationContainer>
    );
  }

  if (showOnboarding) {
    return <OnboardingScreen onComplete={() => setShowOnboarding(false)} />;
  }

  return (
    <NavigationContainer ref={navigationRef} onReady={onNavigationReady}>
      <AppNavigator />
    </NavigationContainer>
  );
};

const styles = StyleSheet.create({
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
});

export default RootNavigator; 