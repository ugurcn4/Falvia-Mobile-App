import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import { supabase } from '../../lib/supabase';
import messaging from '@react-native-firebase/messaging';

// Bildirim davranışını ayarla
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
  }),
});

/**
 * Push notification servisi
 */
export class NotificationService {
  
  /**
   * Push notification izinlerini al ve token kaydet
   */
  static async registerForPushNotifications() {
    try {
      // Firebase'den izin iste (iOS için önemli, Android'de genellikle varsayılan olarak izin verilir)
      const authStatus = await messaging().requestPermission();
      const enabled =
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        return null;
      }

      // FCM token al
      const fcmToken = await messaging().getToken();
      
      if (!fcmToken) {
        console.error('FCM token alınamadı.');
        return null;
      }

      // Token'ı veritabanına kaydet
      const saveResult = await this.savePushToken(fcmToken);

      // Android için notification channel oluştur
      if (Platform.OS === 'android') {
        await Notifications.setNotificationChannelAsync('default', {
          name: 'Falvia Bildirimleri',
          importance: Notifications.AndroidImportance.MAX,
          vibrationPattern: [0, 250, 250, 250],
          lightColor: '#4A0080',
          sound: 'default',
        });
      }
      return fcmToken;
    } catch (error) {
      console.error('❌ Push notification kayıt hatası:', {
        error: error.message,
        stack: error.stack,
        name: error.name
      });
      return null;
    }
  }

  /**
   * Push token'ı veritabanına kaydet
   */
  static async savePushToken(token) {
    try {
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      
      if (authError) {      
        console.error('❌ Supabase auth.getUser() HATA:', authError.message);
        return { success: false, error: authError };
      }

      if (!user) {
        console.error('❌ Kullanıcı oturumu bulunamadı. Token kaydedilemedi.');
        return { success: false, error: 'No user session' };
      }


      const { data, error } = await supabase
        .from('users')
        .update({ 
          push_token: token,
          updated_at: new Date().toISOString()
        })
        .eq('id', user.id)
        .select();

      if (error) {
        console.error('❌ Push token veritabanına kaydetme hatası (UPDATE):', error.message);
        return { success: false, error };
      } else {
        return { success: true, data };
      }
    } catch (error) {
      console.error('❌ savePushToken fonksiyonunda genel HATA:', error.message);
      return { success: false, error };
    }
  }

  /**
   * Yerel bildirim gönder (test için)
   */
  static async sendLocalNotification(title, body, data = {}) {
    try {
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          data,
          sound: 'default',
        },
        trigger: null, // Hemen gönder
      });
    } catch (error) {
      console.error('Yerel bildirim gönderme hatası:', error);
    }
  }

  /**
   * Bildirim dinleyicilerini ayarla
   */
  static setupNotificationListeners(navigation) {
    // Uygulama açıkken gelen bildirimler
    const notificationListener = Notifications.addNotificationReceivedListener(notification => {
      
      // Bildirim tipine göre işlem yap
      const { type, fortuneId, chatId } = notification.request.content.data || {};
      
      if (type === 'fortune_ready') {
        // Fal hazır bildirimi - badge sayısını artır
        this.setBadgeCount(1);
      }
    });

    // Bildirime tıklandığında
    const responseListener = Notifications.addNotificationResponseReceivedListener(response => {
      
      const { type, fortuneId, chatId } = response.notification.request.content.data || {};
      
      // Bildirim tipine göre yönlendirme yap
      if (type === 'fortune_ready' && fortuneId) {
        navigation.navigate('FortuneDetail', { fortuneId });
      } else if (type === 'new_message' && chatId) {
        navigation.navigate('Chat', { chatId });
      }

      // Badge sayısını sıfırla
      this.setBadgeCount(0);
    });

    return {
      notificationListener,
      responseListener,
    };
  }

  /**
   * Bildirim dinleyicilerini temizle
   */
  static removeNotificationListeners(listeners) {
    if (listeners.notificationListener) {
      Notifications.removeNotificationSubscription(listeners.notificationListener);
    }
    if (listeners.responseListener) {
      Notifications.removeNotificationSubscription(listeners.responseListener);
    }
  }

  /**
   * Badge sayısını ayarla
   */
  static async setBadgeCount(count) {
    try {
      await Notifications.setBadgeCountAsync(count);
    } catch (error) {
      console.error('Badge sayısı ayarlama hatası:', error);
    }
  }

  /**
   * Tüm bildirimleri temizle
   */
  static async clearAllNotifications() {
    try {
      await Notifications.dismissAllNotificationsAsync();
      await this.setBadgeCount(0);
    } catch (error) {
      console.error('Bildirimleri temizleme hatası:', error);
    }
  }

  /**
   * Bildirim geçmişini al
   */
  static async getNotificationHistory() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];

      const { data, error } = await supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(50);

      if (error) throw error;
      return data || [];
    } catch (error) {
      console.error('Bildirim geçmişi alma hatası:', error);
      return [];
    }
  }

  /**
   * Bildirimi okundu olarak işaretle
   */
  static async markNotificationAsRead(notificationId) {
    try {
      const { error } = await supabase
        .from('notifications')
        .update({ 
          read: true,
          updated_at: new Date().toISOString()
        })
        .eq('id', notificationId);

      if (error) throw error;
    } catch (error) {
      console.error('Bildirim okundu işaretleme hatası:', error);
    }
  }

  /**
   * Okunmamış bildirim sayısını al
   */
  static async getUnreadNotificationCount() {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return 0;

      const { count, error } = await supabase
        .from('notifications')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error('Okunmamış bildirim sayısı alma hatası:', error);
      return 0;
    }
  }

  /**
   * Server-side push notification gönderme fonksiyonu
   * (Supabase Edge Function veya backend tarafından kullanılacak)
   */
  static async sendPushNotification(userToken, title, body, data = {}) {
    try {
      const message = {
        to: userToken,
        sound: 'default',
        title,
        body,
        data,
        priority: 'high',
        channelId: 'default',
      };

      const response = await fetch('https://exp.host/--/api/v2/push/send', {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Accept-encoding': 'gzip, deflate',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(message),
      });

      const result = await response.json();
      return result;
    } catch (error) {
      console.error('❌ Push notification gönderme hatası:', error);
      throw error;
    }
  }

  /**
   * Fal tamamlandığında kullanıcıya bildirim gönder
   */
  static async sendFortuneReadyNotification(userId, fortuneId, fortuneType) {
    try {
      // Kullanıcının push token'ını al
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('push_token, first_name')
        .eq('id', userId)
        .single();

      if (userError || !userData?.push_token) {
        return;
      }

      const title = '🔮 Falınız Hazır!';
      const body = `${fortuneType} falınız tamamlandı. Sonuçlarını görmek için tıklayın.`;

      // Push notification gönder
      await this.sendPushNotification(
        userData.push_token,
        title,
        body,
        {
          type: 'fortune_ready',
          fortuneId,
          fortuneType
        }
      );

      // Veritabanına bildirim kaydı ekle
      await supabase
        .from('notifications')
        .insert({
          user_id: userId,
          title,
          content: body,
          type: 'fortune_ready',
          reference_id: fortuneId,
          read: false,
          created_at: new Date().toISOString()
        });

    } catch (error) {
      console.error('❌ Fal hazır bildirimi gönderme hatası:', error);
    }
  }



  /**
   * Yeni mesaj bildirimi gönder
   */
  static async sendNewMessageNotification(receiverId, senderId, messageContent) {
    try {
      // Alıcının push token'ını al
      const { data: receiverData, error: receiverError } = await supabase
        .from('users')
        .select('push_token, first_name')
        .eq('id', receiverId)
        .single();

      if (receiverError || !receiverData?.push_token) {
        return;
      }

      // Gönderenin adını al
      const { data: senderData, error: senderError } = await supabase
        .from('users')
        .select('first_name, last_name')
        .eq('id', senderId)
        .single();

      const senderName = senderData 
        ? `${senderData.first_name} ${senderData.last_name}`.trim()
        : 'Bilinmeyen Kullanıcı';

      const title = `💬 ${senderName}`;
      const body = messageContent.length > 50 
        ? messageContent.substring(0, 50) + '...'
        : messageContent;

      // Push notification gönder
      await this.sendPushNotification(
        receiverData.push_token,
        title,
        body,
        {
          type: 'new_message',
          senderId,
          senderName
        }
      );

    } catch (error) {
      console.error('❌ Yeni mesaj bildirimi gönderme hatası:', error);
    }
  }
}

export default NotificationService; 