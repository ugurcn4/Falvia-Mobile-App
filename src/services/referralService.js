import { supabase } from '../../lib/supabase';

export const referralService = {
  // Kullanıcının referral bilgilerini al
  async getUserReferralData(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('referral_code, referral_count, referred_by_code')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Referral bilgileri alınırken hata:', error);
        return { success: false, error: error.message };
      }

      return {
        success: true,
        data: {
          referralCode: data?.referral_code || '',
          referralCount: data?.referral_count || 0,
          hasUsedReferral: !!data?.referred_by_code
        }
      };
    } catch (error) {
      console.error('Referral verileri alınırken hata:', error);
      return { success: false, error: error.message };
    }
  },

  // Referral kodu işle
  async processReferral(userId, referralCode) {
    try {
      const { data, error } = await supabase
        .rpc('process_referral', {
          user_id: userId,
          referral_code_input: referralCode.trim().toUpperCase()
        });

      if (error) {
        console.error('Referral işlemi hatası:', error);
        return { success: false, error: error.message };
      }

      return {
        success: data.success,
        message: data.message,
        data: data
      };
    } catch (error) {
      console.error('Referral kodu işlenirken hata:', error);
      return { success: false, error: error.message };
    }
  },

  // Paylaşım mesajı oluştur
  generateShareMessage(referralCode) {
    return `🔮 Falvia uygulamasına katıl ve 5 jeton kazan! 

Benim referral kodum: ${referralCode}

📱 Uygulamayı indir ve "Arkadaş Davet Et" bölümünden kodumu gir. İkimiz de 5 jeton kazanacağız!

✨ Falvia ile hayatındaki her sorunun cevabını bul!

🔗 App Store / Google Play'den "Falvia" uygulamasını indir!`;
  },

  // Referral istatistiklerini al
  async getReferralStats(userId) {
    try {
      const { data, error } = await supabase
        .from('users')
        .select('referral_count')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Referral istatistikleri alınırken hata:', error);
        return { success: false, error: error.message };
      }

      // Referral verdiği kullanıcıların listesini al (email gizli şekilde)
      const { data: referredUsers, error: referredError } = await supabase
        .from('users')
        .select('email, created_at')
        .eq('referred_by_code', data?.referral_code)
        .order('created_at', { ascending: false });

      return {
        success: true,
        data: {
          referralCount: data?.referral_count || 0,
          referredUsers: referredUsers?.map(user => ({
            email: user.email.substring(0, 3) + '***@' + user.email.split('@')[1],
            joinDate: new Date(user.created_at).toLocaleDateString('tr-TR')
          })) || []
        }
      };
    } catch (error) {
      console.error('Referral istatistikleri alınırken hata:', error);
      return { success: false, error: error.message };
    }
  }
};

export default referralService; 