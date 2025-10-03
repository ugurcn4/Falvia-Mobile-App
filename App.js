import { StatusBar } from 'expo-status-bar';
import { StyleSheet, View } from 'react-native';
import { useEffect, useRef } from 'react';
import RootNavigator from './src/navigation/RootNavigator';
import { AuthProvider } from './src/context/AuthContext';
import { initializeRevenueCat } from './src/services/revenueCatService';
import NotificationService from './src/services/notificationService';

export default function App() {
  const navigationRef = useRef();
  const notificationListeners = useRef();

  // RevenueCat ve Notification servislerini uygulama başlatılırken initialize et
  useEffect(() => {
    const initializeApp = async () => {
      try {
        // RevenueCat'i başlat
        const result = await initializeRevenueCat();
        if (!result.success) {
          console.error('RevenueCat başlatma hatası:', result.error);
        }

        // Push notification'ları kaydet
        await NotificationService.registerForPushNotifications();
      } catch (error) {
        console.error('App başlatma hatası:', error);
      }
    };
    
    initializeApp();
  }, []);

  // Navigation hazır olduğunda notification dinleyicilerini ayarla
  const onNavigationReady = () => {
    if (navigationRef.current) {
      notificationListeners.current = NotificationService.setupNotificationListeners(
        navigationRef.current
      );
    }
  };

  // Component unmount olduğunda dinleyicileri temizle
  useEffect(() => {
    return () => {
      if (notificationListeners.current) {
        NotificationService.removeNotificationListeners(notificationListeners.current);
      }
    };
  }, []);

  return (
    <AuthProvider>
      <View style={styles.container}>
        <RootNavigator 
          navigationRef={navigationRef}
          onNavigationReady={onNavigationReady}
        />
        <StatusBar style="auto" />
      </View>
    </AuthProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
});
