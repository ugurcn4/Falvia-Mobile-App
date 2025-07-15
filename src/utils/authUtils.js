import { supabase } from '../../lib/supabase';
import { Alert } from 'react-native';

/**
 * JWT expired hatası durumunda token yenileme ve işlemi tekrar deneme
 * @param {Function} operation - Yeniden denenmesi gereken işlem
 * @param {Object} navigation - Navigation objesi (opsiyonel)
 * @returns {Promise} İşlem sonucu
 */
export const handleJWTExpired = async (operation, navigation = null) => {
  try {
    // İşlemi ilk kez dene
    let result = await operation();
    
    // JWT expired hatası varsa token yenileme dene
    if (result.error && result.error.code === 'PGRST301') {
      console.log('JWT expired, token yenileniyor...');
      
      const { data: { session }, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError) {
        console.error('Token yenileme hatası:', refreshError);
        
        if (navigation) {
          Alert.alert('Oturum Süresi Doldu', 'Oturum süreniz dolmuş. Lütfen tekrar giriş yapın.', [
            {
              text: 'Tamam',
              onPress: () => navigation.navigate('Login')
            }
          ]);
        }
        
        return result;
      }
      
      if (session) {
        // Token yenilendi, işlemi tekrar dene
        result = await operation();
      }
    }
    
    return result;
  } catch (error) {
    console.error('Auth utils hatası:', error);
    return { error };
  }
};

/**
 * Supabase işlemleri için JWT token yenileme wrapper'ı
 * @param {Function} supabaseOperation - Supabase işlemi
 * @param {Object} navigation - Navigation objesi (opsiyonel)
 * @returns {Promise} İşlem sonucu
 */
export const withTokenRefresh = async (supabaseOperation, navigation = null) => {
  return await handleJWTExpired(supabaseOperation, navigation);
}; 