import { supabase } from '../../lib/supabase';

/**
 * Supabase tabanlı push notification servisi
 * Edge Function kullanarak push notification gönderir
 */
export class SupabasePushService {
  
  /**
   * Supabase Edge Function ile push notification gönder
   */
  static async sendPushNotification(userId, title, body, data = {}) {
    try {

      // Supabase Edge Function çağır
      const { data: result, error } = await supabase.functions.invoke('send-push-notification', {
        body: {
          userId,
          title,
          body,
          data
        }
      });

      if (error) {
        console.error('❌ Supabase push error:', error);
        throw error;
      }
      return result;
    } catch (error) {
      console.error('❌ Supabase push hatası:', error);
      throw error;
    }
  }

  /**
   * Test push notification gönder
   */
  static async sendTestPush(userId) {
    try {
      return await this.sendPushNotification(
        userId,
        '🔮 Falvia Test (Supabase)',
        'Bu Supabase Edge Function ile gönderilen test bildirimidir!',
        {
          type: 'test_notification',
          source: 'supabase_edge_function',
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      console.error('❌ Supabase test push hatası:', error);
      throw error;
    }
  }
}

export default SupabasePushService; 