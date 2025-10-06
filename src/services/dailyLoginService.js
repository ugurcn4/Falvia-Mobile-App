import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import badgeService from './badgeService';

class DailyLoginService {
  // Günlük giriş ödülünü kontrol et ve ver
  async checkAndRewardDailyLogin(userId) {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      // Bugün zaten ödül alınmış mı kontrol et
      const { data: existingReward, error: checkError } = await supabase
        .from('daily_login_rewards')
        .select('*')
        .eq('user_id', userId)
        .eq('login_date', today)
        .single();

      if (checkError && checkError.code !== 'PGRST116') {
        throw checkError;
      }

      // Bugün zaten ödül alınmışsa
      if (existingReward) {
        // Kullanıcının güncel profil bilgilerini al
        const { data: currentProfile, error: currentProfileError } = await supabase
          .from('users')
          .select('token_balance')
          .eq('id', userId)
          .single();

        if (currentProfileError) {
          console.error('Güncel profil bilgileri alınırken hata:', currentProfileError);
        }

        return {
          success: false,
          message: 'Bugün zaten giriş ödülünüzü aldınız!',
          data: {
            consecutiveDays: existingReward.consecutive_days,
            tokensEarned: 0,
            totalBalance: currentProfile?.token_balance || 0
          }
        };
      }

      // Kullanıcının profil bilgilerini al
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('token_balance')
        .eq('id', userId)
        .single();

      if (profileError) {
        console.error('Profil bilgileri alınırken hata:', profileError);
        throw profileError;
      }

      if (!profile) {
        throw new Error('Kullanıcı profili bulunamadı');
      }

      // Günlük giriş bilgilerini AsyncStorage'dan al
      const lastLoginDate = await AsyncStorage.getItem(`@last_login_date_${userId}`);
      const storedConsecutiveDays = await AsyncStorage.getItem(`@consecutive_login_days_${userId}`);
      
      profile.last_login_date = lastLoginDate;
      profile.consecutive_login_days = parseInt(storedConsecutiveDays || '0', 10);

      // Üst üste giriş günü sayısını hesapla
      let consecutiveDays = 1;
      let tokensEarned = 1;

      if (profile.last_login_date) {
        const lastLogin = new Date(profile.last_login_date);
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        
        // Dün giriş yapmışsa üst üste sayıyı artır
        if (lastLogin.toDateString() === yesterday.toDateString()) {
          consecutiveDays = (profile.consecutive_login_days || 0) + 1;
        }
        // Daha önce giriş yapmışsa ama dün yapmamışsa sıfırla
        else if (lastLogin.toDateString() !== yesterday.toDateString()) {
          consecutiveDays = 1;
        }
      }

      // Ödül miktarını hesapla
      tokensEarned = this.calculateReward(consecutiveDays);

      // Günlük giriş ödülünü kaydet
      const { data: reward, error: rewardError } = await supabase
        .from('daily_login_rewards')
        .insert({
          user_id: userId,
          login_date: today,
          consecutive_days: consecutiveDays,
          tokens_earned: tokensEarned
        })
        .select()
        .single();

      if (rewardError) {
        throw rewardError;
      }

      // Kullanıcı token bakiyesini güncelle
      const { error: updateError } = await supabase
        .from('users')
        .update({
          token_balance: (profile.token_balance || 0) + tokensEarned
        })
        .eq('id', userId);

      if (updateError) {
        throw updateError;
      }

      // Günlük giriş bilgilerini AsyncStorage'a kaydet
      await AsyncStorage.setItem(`@last_login_date_${userId}`, today);
      await AsyncStorage.setItem(`@consecutive_login_days_${userId}`, consecutiveDays.toString());

      // Jeton işlemini kaydet
      const { error: transactionError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: userId,
          amount: tokensEarned,
          transaction_type: 'günlük_giriş_ödülü',
          reference_id: reward.id
        });

      if (transactionError) {
        console.error('Jeton işlemi kaydedilemedi:', transactionError);
      }

      // Aktif Kullanıcı rozetini kontrol et (7 gün üst üste giriş)
      let badgeResult = null;
      if (consecutiveDays >= 7) {
        badgeResult = await badgeService.checkActiveUserBadge(userId);
      }

      return {
        success: true,
        message: this.getRewardMessage(consecutiveDays, tokensEarned),
        data: {
          consecutiveDays,
          tokensEarned,
          totalBalance: (profile.token_balance || 0) + tokensEarned
        },
        badge: badgeResult && badgeResult.success && badgeResult.newBadge ? badgeResult.data : null
      };

    } catch (error) {
      console.error('Günlük giriş ödülü hatası:', error);
      return {
        success: false,
        message: error.message || 'Günlük giriş ödülü alınırken bir hata oluştu.',
        error: error.message
      };
    }
  }

  // Ödül miktarını hesapla
  calculateReward(consecutiveDays) {
    if (consecutiveDays === 7) {
      return 2; // 7. gün: 2 jeton
    } else if (consecutiveDays >= 3) {
      return 1; // 3+ gün üst üste: 1 jeton
    } else {
      return 1; // Her gün: 1 jeton
    }
  }

  // Ödül mesajını oluştur
  getRewardMessage(consecutiveDays, tokensEarned) {
    if (consecutiveDays >= 7) {
      return `Harika! ${consecutiveDays} gün üst üste giriş yaptınız! 🎉 ${tokensEarned} jeton kazandınız!`;
    } else if (consecutiveDays >= 3) {
      return `Mükemmel! ${consecutiveDays} gün üst üste giriş yaptınız! ⭐ ${tokensEarned} jeton kazandınız!`;
    } else {
      return `Günlük giriş ödülünüzü aldınız! 🌟 ${tokensEarned} jeton kazandınız!`;
    }
  }

  // Kullanıcının günlük giriş geçmişini al
  async getLoginHistory(userId, limit = 30) {
    try {
      const { data, error } = await supabase
        .from('daily_login_rewards')
        .select('*')
        .eq('user_id', userId)
        .order('login_date', { ascending: false })
        .limit(limit);

      if (error) {
        throw error;
      }

      return {
        success: true,
        data
      };

    } catch (error) {
      console.error('Giriş geçmişi alınırken hata:', error);
      return {
        success: false,
        message: 'Giriş geçmişi alınırken bir hata oluştu.',
        error: error.message
      };
    }
  }

  // Kullanıcının mevcut durumunu al
  async getCurrentStatus(userId) {
    try {
      const { data: profile, error } = await supabase
        .from('users')
        .select('token_balance')
        .eq('id', userId)
        .single();

      if (error) {
        console.error('Profil bilgileri alınırken hata:', error);
        throw error;
      }

      if (!profile) {
        throw new Error('Kullanıcı profili bulunamadı');
      }

      // AsyncStorage'dan günlük giriş bilgilerini al
      const lastLoginDate = await AsyncStorage.getItem(`@last_login_date_${userId}`);
      const storedConsecutiveDays = await AsyncStorage.getItem(`@consecutive_login_days_${userId}`);
      
      profile.last_login_date = lastLoginDate;
      profile.consecutive_login_days = parseInt(storedConsecutiveDays || '0', 10);

      const today = new Date().toISOString().split('T')[0];
      const hasClaimedToday = profile.last_login_date === today;

      return {
        success: true,
        data: {
          lastLoginDate: profile.last_login_date,
          consecutiveDays: profile.consecutive_login_days || 0,
          tokenBalance: profile.token_balance || 0,
          hasClaimedToday,
          nextReward: this.calculateReward((profile.consecutive_login_days || 0) + 1)
        }
      };

    } catch (error) {
      console.error('Mevcut durum alınırken hata:', error);
      return {
        success: false,
        message: error.message || 'Mevcut durum alınırken bir hata oluştu.',
        error: error.message
      };
    }
  }
}

export default new DailyLoginService(); 