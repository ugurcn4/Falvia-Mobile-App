import { RewardedAd, RewardedAdEventType, TestIds } from 'react-native-google-mobile-ads';
import { supabase } from '../../lib/supabase';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Alert } from 'react-native';

// Gerçek AdMob bilgileri - Test için geçici olarak dev modu kapatıldı
const adUnitId = 'ca-app-pub-2358689887265683/4028101618';

class AdMobService {
  constructor() {
    this.rewardedAd = null;
    this.isLoading = false;
    this.isReady = false;
    this.init();
  }

  // AdMob servisini başlat
  init() {
    this.createRewardedAd();
  }

  // Ödüllü reklam oluştur
  createRewardedAd() {
    if (this.rewardedAd) {
      return;
    }

    this.rewardedAd = RewardedAd.createForAdRequest(adUnitId, {
      requestNonPersonalizedAdsOnly: false,
      // Uzun reklamları önceliklendir
      keywords: ['long_video', 'high_engagement', 'premium_content'],
      // Server-side verification seçenekleri
      serverSideVerificationOptions: {
        customData: JSON.stringify({
          user_preference: 'long_ads',
          min_duration: 30,
          app_version: '1.1.0'
        })
      }
    });

    // Reklam yüklendiğinde
    this.rewardedAd.addAdEventListener(RewardedAdEventType.LOADED, () => {
      this.isReady = true;
      this.isLoading = false;
    });

    this.loadRewardedAd();
  }

  // Ödüllü reklam yükle
  loadRewardedAd() {
    if (this.isLoading || this.isReady) {
      return;
    }

    if (!this.rewardedAd) {
      this.createRewardedAd();
      return;
    }

    this.isLoading = true;
    this.isReady = false;
    
    try {
      this.rewardedAd.load();
    } catch (error) {
      console.error('Reklam yükleme hatası:', error);
      this.isLoading = false;
      this.isReady = false;
    }
  }

  // Reklam göster ve ödül ver
  async showRewardedAd(forTokenReward = true) {
    try {
      if (!this.isReady || !this.rewardedAd) {
        Alert.alert(
          'Reklam Hazır Değil',
          'Reklam henüz yüklenmedi. Lütfen biraz bekleyip tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
        return false;
      }

      // Sadece jeton kazanma için günlük reklam limitini kontrol et
      if (forTokenReward) {
        const canWatchAd = await this.checkDailyAdLimit();
        if (!canWatchAd) {
          Alert.alert(
            'Günlük Limit',
            'Günlük reklam izleme limitinize ulaştınız. Yarın tekrar deneyebilirsiniz.',
            [{ text: 'Tamam' }]
          );
          return false;
        }
      }

      return new Promise((resolve) => {
        // Ödül kazanıldığında
        const unsubscribeEarned = this.rewardedAd.addAdEventListener(
          RewardedAdEventType.EARNED_REWARD,
          async (reward) => {
            
            try {
              // Sadece jeton kazanma için ödül ver ve sayaç artır
              if (forTokenReward) {
                const success = await this.giveTokenReward(1);
                
                if (success) {
                  Alert.alert(
                    '🎉 Tebrikler!',
                    '1 jeton kazandınız! Jetonunuz hesabınıza eklendi.',
                    [{ text: 'Harika!' }]
                  );
                  
                  // Günlük reklam sayısını artır (sadece jeton kazanma için)
                  await this.incrementDailyAdCount();
                } else {
                  Alert.alert(
                    'Hata',
                    'Jetonlar eklenirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                    [{ text: 'Tamam' }]
                  );
                  resolve(false);
                  return;
                }
              } else {
                // Fal süresi hızlandırma gibi işlemler için sadece başarı mesajı
                Alert.alert(
                  '✅ Başarılı!',
                  'İşleminiz tamamlandı!',
                  [{ text: 'Tamam' }]
                );
              }
              
              // Reklam durumunu sıfırla ve yeni reklam yükle
              this.isReady = false;
              this.isLoading = false;
              setTimeout(() => {
                this.loadRewardedAd();
              }, 1000);
              
              resolve(true);
            } catch (error) {
              console.error('Ödül verme hatası:', error);
              Alert.alert(
                'Hata',
                'Bir hata oluştu. Lütfen daha sonra tekrar deneyin.',
                [{ text: 'Tamam' }]
              );
              resolve(false);
            }
            
            unsubscribeEarned();
          }
        );

        // Reklamı göster
        this.rewardedAd.show();
        
        // Reklam gösterildikten sonra durumu sıfırla
        setTimeout(() => {
          this.isReady = false;
          this.isLoading = false;
          // Yeni reklam yükle
          setTimeout(() => {
            this.loadRewardedAd();
          }, 2000);
        }, 1000);
      });
      
    } catch (error) {
      console.error('Reklam gösterme hatası:', error);
      Alert.alert(
        'Hata',
        'Reklam gösterilirken bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
      return false;
    }
  }

  // Kullanıcıya jeton ödülü ver
  async giveTokenReward(tokenAmount) {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        console.error('Kullanıcı bulunamadı');
        return false;
      }

      // Users tablosundan mevcut jeton bakiyesini al
      const { data: userData, error: getUserError } = await supabase
        .from('users')
        .select('token_balance')
        .eq('id', user.id)
        .single();

      if (getUserError) {
        console.error('Kullanıcı bilgisi alınamadı:', getUserError);
        return false;
      }

      const currentBalance = userData.token_balance || 0;
      const newBalance = currentBalance + tokenAmount;

      // Kullanıcının jeton bakiyesini güncelle
      const { error: updateError } = await supabase
        .from('users')
        .update({ token_balance: newBalance })
        .eq('id', user.id);

      if (updateError) {
        console.error('Jeton bakiyesi güncellenemedi:', updateError);
        return false;
      }

      // İşlem kaydı oluştur
      const { error: transactionError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          amount: tokenAmount,
          transaction_type: 'reklam_odulu',
          created_at: new Date().toISOString()
        });

      if (transactionError) {
        console.error('İşlem kaydı oluşturulamadı:', transactionError);
        // Bu hata kritik değil, jeton yine de verildi
      }

      // AsyncStorage'daki token bilgisini güncelle
      await AsyncStorage.setItem('@user_tokens', newBalance.toString());

      // Global token güncelleme fonksiyonunu çağır (varsa)
      if (global.updateUserTokens) {
        global.updateUserTokens(newBalance);
      }

      // Günlük görev ilerlemesini güncelle (reklam izleme)
      try {
        await supabase.rpc('update_daily_task_progress', {
          p_user_id: user.id,
          p_task_type: 'ad_watched',
          p_increment: 1
        });
      } catch (taskError) {
        console.warn('Günlük görev güncellenirken hata:', taskError);
        // Reklam ödülü başarılıysa görev hatası işlemi durdurmasın
      }

      return true;

    } catch (error) {
      console.error('Jeton ödülü verme hatası:', error);
      return false;
    }
  }

  // Günlük reklam limitini kontrol et (maksimum 10 reklam/gün)
  async checkDailyAdLimit() {
    try {
      const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
      const adCountKey = `@daily_ad_count_${today}`;
      
      const storedCount = await AsyncStorage.getItem(adCountKey);
      const dailyCount = storedCount ? parseInt(storedCount, 10) : 0;
      
      return dailyCount < 10; // Maksimum 10 reklam/gün
    } catch (error) {
      console.error('Günlük limit kontrolü hatası:', error);
      return true; // Hata durumunda izin ver
    }
  }

  // Günlük reklam sayısını artır
  async incrementDailyAdCount() {
    try {
      const today = new Date().toISOString().split('T')[0];
      const adCountKey = `@daily_ad_count_${today}`;
      
      const storedCount = await AsyncStorage.getItem(adCountKey);
      const dailyCount = storedCount ? parseInt(storedCount, 10) : 0;
      
      await AsyncStorage.setItem(adCountKey, (dailyCount + 1).toString());
    } catch (error) {
      console.error('Günlük sayaç artırma hatası:', error);
    }
  }

  // Reklamın hazır olup olmadığını kontrol et
  isAdReady() {
    return this.isReady;
  }

  // Reklam yükleme durumunu kontrol et
  isAdLoading() {
    return this.isLoading;
  }

  // Servisi temizle
  destroy() {
    if (this.rewardedAd) {
      this.rewardedAd.removeAllListeners();
      this.rewardedAd = null;
    }
    this.isReady = false;
    this.isLoading = false;
  }

  // Reklam servisini yeniden başlat
  restart() {
    this.destroy();
    this.init();
  }
}

// Singleton instance
const adMobService = new AdMobService();

export default adMobService; 