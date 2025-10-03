import { supabase } from '../../lib/supabase';

/**
 * 3 Günlük Ücretsiz Deneme Servisleri
 * - Deneme durumu kontrolü
 * - Deneme başlatma
 * - Deneme sonlandırma
 * - Deneme geçmişi
 */

export const TrialService = {
  /**
   * Kullanıcının deneme durumunu kontrol eder
   * @param {string} userId - Kullanıcı ID
   * @returns {Object} Deneme durumu bilgileri
   */
  async checkTrialStatus(userId) {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gerekli');
      }

      const { data, error } = await supabase.rpc('check_trial_status', {
        user_id: userId
      });

      if (error) {
        console.error('Deneme durumu kontrol hatası:', error);
        throw error;
      }

      const result = data[0] || {};
      
      return {
        success: true,
        canStartTrial: result.can_start_trial || false,
        isTrialActive: result.is_trial_active || false,
        trialRemainingDays: result.trial_remaining_days || 0,
        trialEndDate: result.trial_end_date || null,
        data: result
      };
    } catch (error) {
      console.error('Deneme durumu kontrol hatası:', error);
      return {
        success: false,
        error: error.message,
        canStartTrial: false,
        isTrialActive: false,
        trialRemainingDays: 0,
        trialEndDate: null
      };
    }
  },

  /**
   * 3 günlük ücretsiz deneme başlatır
   * @param {string} userId - Kullanıcı ID
   * @returns {Object} Başlatma sonucu
   */
  async startFreeTrial(userId) {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gerekli');
      }

      // Önce deneme hakkı kontrolü
      const statusCheck = await this.checkTrialStatus(userId);
      if (!statusCheck.success) {
        throw new Error('Deneme durumu kontrol edilemedi');
      }

      if (!statusCheck.canStartTrial) {
        if (statusCheck.isTrialActive) {
          return {
            success: false,
            error: 'Zaten aktif bir deneme süreciniz var',
            code: 'TRIAL_ALREADY_ACTIVE'
          };
        } else {
          return {
            success: false,
            error: 'Bu hesap zaten deneme süresini kullanmış',
            code: 'TRIAL_ALREADY_USED'
          };
        }
      }

      // Deneme başlatma fonksiyonunu çağır
      const { data, error } = await supabase.rpc('start_free_trial', {
        user_id: userId
      });

      if (error) {
        console.error('Deneme başlatma hatası:', error);
        throw error;
      }

      const result = data[0] || {};
      
      if (!result.success) {
        return {
          success: false,
          error: result.message || 'Deneme başlatılamadı',
          code: 'START_FAILED'
        };
      }

      return {
        success: true,
        message: result.message,
        trialEndDate: result.trial_end_date,
        trialDays: 3
      };
    } catch (error) {
      console.error('Deneme başlatma hatası:', error);
      return {
        success: false,
        error: error.message,
        code: 'SYSTEM_ERROR'
      };
    }
  },

  /**
   * Deneme süresini sonlandırır
   * @param {string} userId - Kullanıcı ID
   * @param {string} reason - Sonlandırma sebebi: 'expired', 'converted', 'cancelled'
   * @returns {Object} Sonlandırma sonucu
   */
  async endTrial(userId, reason = 'expired') {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gerekli');
      }

      const validReasons = ['expired', 'converted', 'cancelled'];
      if (!validReasons.includes(reason)) {
        throw new Error('Geçersiz sonlandırma sebebi');
      }

      const { data, error } = await supabase.rpc('end_trial', {
        user_id: userId,
        reason: reason
      });

      if (error) {
        console.error('Deneme sonlandırma hatası:', error);
        throw error;
      }

      return {
        success: true,
        message: 'Deneme süresi sonlandırıldı',
        reason: reason
      };
    } catch (error) {
      console.error('Deneme sonlandırma hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  },

  /**
   * Kullanıcının deneme geçmişini alır
   * @param {string} userId - Kullanıcı ID
   * @returns {Object} Deneme geçmişi
   */
  async getTrialHistory(userId) {
    try {
      if (!userId) {
        throw new Error('Kullanıcı ID gerekli');
      }

      const { data, error } = await supabase
        .from('user_trials')
        .select('*')
        .eq('user_id', userId)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Deneme geçmişi alma hatası:', error);
        throw error;
      }

      return {
        success: true,
        data: data || null,
        hasTrialHistory: !!data
      };
    } catch (error) {
      console.error('Deneme geçmişi alma hatası:', error);
      return {
        success: false,
        error: error.message,
        data: null,
        hasTrialHistory: false
      };
    }
  },

  /**
   * Deneme süresinin kalan günlerini hesaplar
   * @param {string} endDate - Bitiş tarihi (ISO string)
   * @returns {Object} Kalan süre bilgisi
   */
  calculateRemainingTime(endDate) {
    try {
      if (!endDate) return { days: 0, hours: 0, minutes: 0, expired: true };

      const now = new Date();
      const end = new Date(endDate);
      const diffMs = end.getTime() - now.getTime();

      if (diffMs <= 0) {
        return { days: 0, hours: 0, minutes: 0, expired: true };
      }

      const days = Math.floor(diffMs / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diffMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));

      return {
        days,
        hours,
        minutes,
        expired: false,
        totalHours: Math.floor(diffMs / (1000 * 60 * 60))
      };
    } catch (error) {
      console.error('Kalan süre hesaplama hatası:', error);
      return { days: 0, hours: 0, minutes: 0, expired: true };
    }
  },

  /**
   * Deneme süresinin sona ermesine kalan süreyi formatlar
   * @param {string} endDate - Bitiş tarihi
   * @returns {string} Formatlanmış kalan süre
   */
  formatRemainingTime(endDate) {
    const remaining = this.calculateRemainingTime(endDate);
    
    if (remaining.expired) {
      return 'Süresi dolmuş';
    }

    if (remaining.days > 0) {
      return `${remaining.days} gün ${remaining.hours} saat`;
    } else if (remaining.hours > 0) {
      return `${remaining.hours} saat ${remaining.minutes} dakika`;
    } else {
      return `${remaining.minutes} dakika`;
    }
  },

  /**
   * Deneme süresi bitmek üzere mi kontrol eder
   * @param {string} endDate - Bitiş tarihi
   * @param {number} warningHours - Uyarı verilecek saat sayısı (varsayılan: 24)
   * @returns {boolean} Uyarı verilmeli mi?
   */
  shouldShowExpiryWarning(endDate, warningHours = 24) {
    const remaining = this.calculateRemainingTime(endDate);
    return !remaining.expired && remaining.totalHours <= warningHours;
  },

  /**
   * Otomatik süre dolmuş denemeleri temizle (admin kullanımı)
   * @returns {Object} Temizleme sonucu
   */
  async autoExpireTrials() {
    try {
      const { data, error } = await supabase.rpc('auto_expire_trials');

      if (error) {
        console.error('Otomatik deneme temizleme hatası:', error);
        throw error;
      }

      return {
        success: true,
        expiredCount: data || 0,
        message: `${data || 0} deneme süresi sonlandırıldı`
      };
    } catch (error) {
      console.error('Otomatik deneme temizleme hatası:', error);
      return {
        success: false,
        error: error.message,
        expiredCount: 0
      };
    }
  },

  /**
   * Deneme durumu değişikliklerini dinler (real-time)
   * @param {string} userId - Kullanıcı ID
   * @param {function} callback - Değişiklik callback'i
   * @returns {function} Unsubscribe fonksiyonu
   */
  subscribeToTrialChanges(userId, callback) {
    try {
      if (!userId || !callback) {
        throw new Error('Kullanıcı ID ve callback gerekli');
      }

      const subscription = supabase
        .channel(`trial_changes_${userId}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'user_trials',
            filter: `user_id=eq.${userId}`
          },
          (payload) => {
            callback(payload);
          }
        )
        .subscribe();

      // Unsubscribe fonksiyonu döndür
      return () => {
        supabase.removeChannel(subscription);
      };
    } catch (error) {
      console.error('Deneme değişiklik dinleme hatası:', error);
      return () => {}; // Boş unsubscribe fonksiyonu
    }
  }
};

export default TrialService; 