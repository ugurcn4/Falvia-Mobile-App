import { supabase } from '../../lib/supabase';

// Rozet türleri ve bilgileri
export const BADGE_TYPES = {
  ACTIVE_USER: 'active_user',
  FORTUNE_LOVER: 'fortune_lover',
  VIP_EXPERIENCE: 'vip_experience'
};

// Rozet bilgileri
export const BADGE_INFO = {
  [BADGE_TYPES.ACTIVE_USER]: {
    key: 'active_user',
    name: 'Aktif Kullanıcı',
    description: '7 gün üst üste giriş yaparak bu rozeti kazandınız!',
    iconName: 'flame',
    iconType: 'ionicons',
    color: '#FF6B35',
    requirementType: 'consecutive_login',
    requirementValue: 7
  },
  [BADGE_TYPES.FORTUNE_LOVER]: {
    key: 'fortune_lover',
    name: 'Falsever',
    description: 'Toplam 10 fal göndererek bu rozeti kazandınız!',
    iconName: 'cafe',
    iconType: 'ionicons',
    color: '#9b59b6',
    requirementType: 'fortune_count',
    requirementValue: 10
  },
  [BADGE_TYPES.VIP_EXPERIENCE]: {
    key: 'vip_experience',
    name: 'VIP Deneyim',
    description: 'İlk alımınızı yaparak premium deneyime adım attınız!',
    iconName: 'diamond',
    iconType: 'ionicons',
    color: '#FFD700',
    requirementType: 'first_purchase',
    requirementValue: 1
  }
};

/**
 * Kullanıcının kazandığı rozetleri getir
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Array>} Kullanıcının rozetleri
 */
export const getUserBadges = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('*')
      .eq('user_id', userId)
      .eq('is_displayed', true)
      .order('earned_at', { ascending: false });

    if (error) throw error;

    // Rozet bilgilerini ekle
    const badgesWithInfo = (data || []).map(badge => ({
      ...badge,
      ...BADGE_INFO[badge.badge_key]
    }));

    return {
      success: true,
      data: badgesWithInfo
    };
  } catch (error) {
    console.error('Rozetler getirilirken hata:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * Kullanıcının belirli bir rozete sahip olup olmadığını kontrol et
 * @param {string} userId - Kullanıcı ID
 * @param {string} badgeKey - Rozet anahtarı
 * @returns {Promise<boolean>} Rozete sahip mi?
 */
export const hasBadge = async (userId, badgeKey) => {
  try {
    const { data, error } = await supabase
      .from('user_badges')
      .select('id')
      .eq('user_id', userId)
      .eq('badge_key', badgeKey)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned
    
    return !!data;
  } catch (error) {
    console.error('Rozet kontrolü sırasında hata:', error);
    return false;
  }
};

/**
 * Kullanıcının rozet kazanma kriterlerini kontrol et ve rozet ver
 * @param {string} userId - Kullanıcı ID
 * @param {string} badgeKey - Rozet anahtarı
 * @returns {Promise<Object>} Rozet verme sonucu
 */
export const checkAndAwardBadge = async (userId, badgeKey) => {
  try {
    // Rozet zaten kazanılmış mı kontrol et
    const alreadyHas = await hasBadge(userId, badgeKey);
    if (alreadyHas) {
      return {
        success: false,
        alreadyHas: true,
        message: 'Bu rozet zaten kazanılmış'
      };
    }

    // Rozet bilgisini al
    const badgeInfo = BADGE_INFO[badgeKey];
    if (!badgeInfo) {
      return {
        success: false,
        error: 'Geçersiz rozet anahtarı'
      };
    }

    // Kullanıcının kriterlerini kontrol et
    const isEligible = await checkBadgeEligibility(userId, badgeKey);
    
    if (!isEligible) {
      return {
        success: false,
        eligible: false,
        message: 'Rozet kriterleri henüz karşılanmadı'
      };
    }

    // Önce badge_id'yi al
    const { data: badgeData, error: badgeError } = await supabase
      .from('badges')
      .select('id')
      .eq('badge_key', badgeKey)
      .single();

    if (badgeError || !badgeData) {
      throw new Error('Rozet bulunamadı');
    }

    // Rozeti kullanıcıya ver
    const { data, error } = await supabase
      .from('user_badges')
      .insert({
        user_id: userId,
        badge_id: badgeData.id,
        badge_key: badgeKey,
        is_displayed: true
      })
      .select()
      .single();

    if (error) throw error;

    // Kullanıcının toplam rozet sayısını güncelle
    await updateUserBadgeCount(userId);

    return {
      success: true,
      data: {
        ...data,
        ...badgeInfo
      },
      newBadge: true,
      message: `${badgeInfo.name} rozetini kazandınız!`
    };
  } catch (error) {
    console.error('Rozet verilirken hata:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

/**
 * Kullanıcının bir rozeti kazanmaya uygun olup olmadığını kontrol et
 * @param {string} userId - Kullanıcı ID
 * @param {string} badgeKey - Rozet anahtarı
 * @returns {Promise<boolean>} Uygun mu?
 */
export const checkBadgeEligibility = async (userId, badgeKey) => {
  try {
    const badgeInfo = BADGE_INFO[badgeKey];
    if (!badgeInfo) return false;

    // Kullanıcı bilgilerini getir
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('consecutive_login_days, total_fortunes_sent, first_purchase_date')
      .eq('id', userId)
      .single();

    if (userError) throw userError;

    // Rozet türüne göre kriterleri kontrol et
    switch (badgeInfo.requirementType) {
      case 'consecutive_login':
        return userData.consecutive_login_days >= badgeInfo.requirementValue;
      
      case 'fortune_count':
        return userData.total_fortunes_sent >= badgeInfo.requirementValue;
      
      case 'first_purchase':
        return !!userData.first_purchase_date;
      
      default:
        return false;
    }
  } catch (error) {
    console.error('Rozet uygunluğu kontrolü sırasında hata:', error);
    return false;
  }
};

/**
 * Kullanıcının toplam rozet sayısını güncelle
 * @param {string} userId - Kullanıcı ID
 */
const updateUserBadgeCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('user_badges')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId);

    if (error) throw error;

    // Kullanıcının toplam rozet sayısını güncelle
    const { error: updateError } = await supabase
      .from('users')
      .update({ total_badges_earned: count })
      .eq('id', userId);

    if (updateError) throw updateError;
  } catch (error) {
    console.error('Rozet sayısı güncellenirken hata:', error);
  }
};

/**
 * Tüm rozet kriterlerini kontrol et ve uygun olanları ver
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<Array>} Yeni kazanılan rozetler
 */
export const checkAllBadges = async (userId) => {
  try {
    const newBadges = [];
    
    // Tüm rozet türlerini kontrol et
    for (const badgeKey of Object.values(BADGE_TYPES)) {
      const result = await checkAndAwardBadge(userId, badgeKey);
      if (result.success && result.newBadge) {
        newBadges.push(result.data);
      }
    }

    return {
      success: true,
      data: newBadges,
      hasNewBadges: newBadges.length > 0
    };
  } catch (error) {
    console.error('Tüm rozetler kontrol edilirken hata:', error);
    return {
      success: false,
      error: error.message,
      data: []
    };
  }
};

/**
 * İlk alım yapıldığında VIP Deneyim rozetini kontrol et
 * @param {string} userId - Kullanıcı ID
 */
export const checkFirstPurchaseBadge = async (userId) => {
  return await checkAndAwardBadge(userId, BADGE_TYPES.VIP_EXPERIENCE);
};

/**
 * Fal gönderildiğinde Falsever rozetini kontrol et
 * @param {string} userId - Kullanıcı ID
 */
export const checkFortuneLoverBadge = async (userId) => {
  return await checkAndAwardBadge(userId, BADGE_TYPES.FORTUNE_LOVER);
};

/**
 * Günlük giriş yapıldığında Aktif Kullanıcı rozetini kontrol et
 * @param {string} userId - Kullanıcı ID
 */
export const checkActiveUserBadge = async (userId) => {
  return await checkAndAwardBadge(userId, BADGE_TYPES.ACTIVE_USER);
};

export default {
  getUserBadges,
  hasBadge,
  checkAndAwardBadge,
  checkBadgeEligibility,
  checkAllBadges,
  checkFirstPurchaseBadge,
  checkFortuneLoverBadge,
  checkActiveUserBadge,
  BADGE_TYPES,
  BADGE_INFO
};

