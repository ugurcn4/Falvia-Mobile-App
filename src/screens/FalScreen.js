import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  StatusBar, 
  Dimensions,
  ActivityIndicator,
  RefreshControl,
  Alert,
  Animated,
  Pressable
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import NotificationService from '../services/notificationService';
import adMobService from '../services/adMobService';
import { checkUserSubscriptionWithTrial } from '../services/supabaseService';
import { TrialService } from '../services/trialService';

const { width } = Dimensions.get('window');
const USER_TOKENS_KEY = '@user_tokens';

// Global token güncelleme fonksiyonunu tanımla
if (!global.updateUserTokens) {
  global.updateUserTokens = null;
}

const FalScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('new'); // 'new' veya 'history'
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [pastFortunes, setPastFortunes] = useState([]);
  const [userTokens, setUserTokens] = useState(0);
  const [dailyAdCount, setDailyAdCount] = useState(0);
  const [adLoading, setAdLoading] = useState(false);
  const [isPremium, setIsPremium] = useState(false);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [fortuneAdProgress, setFortuneAdProgress] = useState({}); // Reklam ilerlemelerini state'de tut
  const [fortuneTypes, setFortuneTypes] = useState([
    { id: 1, name: 'Kahve Falı', icon: 'coffee', image: require('../../assets/görseller/kahve.png'), category: 'kahve', price: 49.99, description: 'Fincanınızdaki sırları keşfedin' },
    { id: 2, name: 'Tarot Falı', icon: 'cards', image: require('../../assets/görseller/tarot.png'), category: 'tarot', price: 49.99, description: 'Kartların size söylediklerini öğrenin' },
    { id: 3, name: 'Katina Falı', icon: 'eye', image: require('../../assets/görseller/katina.png'), category: 'katina', price: 49.99, description: 'Aşk temalı iskambil falı ile duygularınızı keşfedin' },
    { id: 4, name: 'El Falı', icon: 'hand-left', image: require('../../assets/görseller/el.png'), category: 'el', price: 49.99, description: 'Avucunuzdaki geleceği görün' },
    { id: 5, name: 'Yüz Falı', icon: 'emoticon', image: require('../../assets/görseller/yüz.png'), category: 'yuz', price: 49.99, description: 'Yüz hatlarınızdan karakter ve kaderinizi öğrenin' },
    { id: 6, name: 'Yıldızname', icon: 'star-four-points', image: require('../../assets/görseller/yıldızname.png'), category: 'yildizname', price: 49.99, description: 'Yıldızların rehberliğinde geleceğe bakın' },
    { id: 7, name: 'Rüya Yorumu', icon: 'sleep', image: require('../../assets/görseller/rüya.png'), category: 'ruya', price: 49.99, description: 'Rüyalarınızın gizli anlamlarını keşfedin' },
    { id: 8, name: 'Burç Yorumları', icon: 'star-outline', image: require('../../assets/görseller/günlükburç.png'), category: 'burc', price: 0, description: 'Günlük, haftalık ve aylık burç yorumlarınızı alın - Günlük 3 hak!' },
  ]);
  
  // Kullanıcının geçmiş fallarını ve jeton sayısını getir
  useEffect(() => {
    fetchPastFortunes();
    fetchUserTokens();
    checkDailyAdCount();
    checkUserPremiumStatus();
    loadFortuneAdProgress();
    
    // Global token güncelleme fonksiyonunu ayarla
    global.updateUserTokens = (newTokens) => {
      setUserTokens(newTokens);
    };
    
    // Component unmount olduğunda temizle
    return () => {
      global.updateUserTokens = null;
    };
  }, []);
  
  const checkUserPremiumStatus = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Deneme dahil subscription kontrolü
        const subscriptionInfo = await checkUserSubscriptionWithTrial(user.id);
        setSubscriptionData(subscriptionInfo);
        setIsPremium(subscriptionInfo.isPremium || false);
        
      }
    } catch (error) {
      console.error('Premium durum kontrol hatası:', error);
      // Hata durumunda eski yöntemi dene
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const { data, error } = await supabase
            .from('users')
            .select('is_premium, subscription_type')
            .eq('id', user.id)
            .single();
          
          if (data && !error) {
            const hasSubscription = data.subscription_type && ['mini', 'standart', 'premium', 'premium_trial'].includes(data.subscription_type);
            setIsPremium(data.is_premium || hasSubscription);
          }
        }
      } catch (fallbackError) {
        console.error('Fallback premium kontrol hatası:', fallbackError);
      }
    }
  };
  
  const fetchUserTokens = async () => {
    try {
      // Önce AsyncStorage'dan kontrol et
      const storedTokens = await AsyncStorage.getItem(USER_TOKENS_KEY);
      if (storedTokens) {
        setUserTokens(parseInt(storedTokens, 10));
      }
      
      // Sonra veritabanından güncel bilgiyi al
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('token_balance')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          const tokenBalance = data.token_balance || 0;
          setUserTokens(tokenBalance);
          // AsyncStorage'a kaydet
          await AsyncStorage.setItem(USER_TOKENS_KEY, tokenBalance.toString());
        }
      }
    } catch (error) {
      console.error('Jeton bilgisi alınamadı:', error);
    }
  };
  
  const fetchPastFortunes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        // Premium durumunu users tablosundan kontrol et
        const { data: profileData, error: profileError } = await supabase
          .from('users')
          .select('is_premium, subscription_type')
          .eq('id', user.id)
          .single();
        
        const userIsPremium = profileData?.is_premium || 
                             (profileData?.subscription_type && 
                              ['mini', 'standart', 'premium'].includes(profileData.subscription_type));
        

        
        let query = supabase
          .from('fortunes')
          .select(`
            *,
            fortune_teller:fortune_teller_id (
              id, name, profile_image, bio, experience_years, rating
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        // Premium olmayan kullanıcılar için son 3 fal
        if (!userIsPremium) {
          query = query.limit(3);
        }
        
        const { data, error } = await query;
        
        if (error) throw error;
        
        // Süre dolmuş falları kontrol et ve güncelle
        const currentTime = new Date();
        const fortunesToUpdate = [];
        
        data?.forEach(fortune => {
          if (
            fortune.status === 'yorumlanıyor' && 
            fortune.process_after && 
            new Date(fortune.process_after) <= currentTime &&
            !fortune.completed_at
          ) {
            fortunesToUpdate.push(fortune.id);
          }
        });
        
        // Süre dolmuş falları toplu güncelle
        if (fortunesToUpdate.length > 0) {
          const { error: updateError } = await supabase
            .from('fortunes')
            .update({
              status: 'tamamlandı',
              completed_at: currentTime.toISOString()
            })
            .in('id', fortunesToUpdate);
            
          if (updateError) {
            console.error('Fallar güncellenemedi:', updateError);
          } else {
            // Güncellenen falları listede de güncelle ve bildirim gönder
            data?.forEach(fortune => {
              if (fortunesToUpdate.includes(fortune.id)) {
                fortune.status = 'tamamlandı';
                fortune.completed_at = currentTime.toISOString();
                
                // Fal hazır bildirimi gönder
                const fortuneTypeName = getFortuneName(fortune.category);
                NotificationService.sendFortuneReadyNotification(
                  fortune.user_id,
                  fortune.id,
                  fortuneTypeName
                ).catch(error => {
                  console.error('Bildirim gönderme hatası:', error);
                });
              }
            });
          }
        }
        
        setPastFortunes(data || []);
        
        // Premium durumunu güncelle
        if (profileData && !profileError) {
          const userIsPremium = profileData.is_premium || 
                               (profileData.subscription_type && 
                                ['mini', 'standart', 'premium'].includes(profileData.subscription_type));
          setIsPremium(userIsPremium);
        }
      }
    } catch (error) {
      console.error('Geçmiş fallar alınamadı:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };
  
  const onRefresh = () => {
    setRefreshing(true);
    fetchPastFortunes();
    fetchUserTokens();
    checkDailyAdCount();
    loadFortuneAdProgress();
    // Premium durumu fetchPastFortunes içinde kontrol ediliyor
  };

  // Günlük reklam sayısını kontrol et
  const checkDailyAdCount = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const adCountKey = `@daily_ad_count_${today}`;
      
      const storedCount = await AsyncStorage.getItem(adCountKey);
      const dailyCount = storedCount ? parseInt(storedCount, 10) : 0;
      
      setDailyAdCount(dailyCount);
    } catch (error) {
      console.error('Günlük reklam sayısı kontrol hatası:', error);
    }
  };

  // Ödüllü reklam izle
  const handleWatchRewardedAd = async () => {
    setAdLoading(true);
    
    try {
      // Jeton kazanma için reklam izle (günlük limit uygulanır)
      const success = await adMobService.showRewardedAd(true);
      
      if (success) {
        // Jeton bakiyesini güncelle
        await fetchUserTokens();
        // Günlük reklam sayısını güncelle
        await checkDailyAdCount();
      }
    } catch (error) {
      console.error('Reklam izleme hatası:', error);
    } finally {
      setAdLoading(false);
    }
  };

  // Reklam izle ve falı hemen gör
  const watchAdForImmediateFortune = async (fortune) => {
    try {
      // Fal için izlenen reklam sayısını kontrol et
      const watchedAdsKey = `@fortune_ads_${fortune.id}`;
      const watchedAds = await AsyncStorage.getItem(watchedAdsKey);
      const currentWatchedAds = watchedAds ? parseInt(watchedAds, 10) : 0;
      
      if (currentWatchedAds >= 2) {
        // 2 reklam zaten izlendi, hızlandırma yapıldı
        Alert.alert(
          '🚀 Zaten Hızlandırıldı!',
          'Bu fal için reklam izleme hızlandırması zaten yapıldı. Falınız sırada öncelikli olarak işleniyor.',
          [{ text: 'Tamam' }]
        );
        return;
      }
      
      // Reklam izleme işlemi (fal hızlandırma için - günlük limit uygulanmaz)
      const adWatched = await adMobService.showRewardedAd(false);
      
      if (adWatched) {
        // İzlenen reklam sayısını artır
        const newWatchedAds = currentWatchedAds + 1;
        await updateFortuneAdProgress(fortune.id, newWatchedAds);
        
        if (newWatchedAds >= 2) {
          // 2 reklam tamamlandı, falı sırada öne geçir
          await prioritizeFortuneInQueue(fortune.id);
        } else {
          // Daha fazla reklam izleme gerekiyor
          Alert.alert(
            'Reklam İzlendi!',
            `1/2 reklam tamamlandı. Falınızı görmek için 1 reklam daha izleyin.`,
            [{ text: 'Tamam' }]
          );
          // Falları yeniden yükle
          fetchPastFortunes();
        }
      }
    } catch (error) {
      console.error('Reklam izleme hatası:', error);
      Alert.alert('Hata', 'Reklam izlenirken bir hata oluştu.');
    }
  };

  // Falı sırada öne geçir
  const prioritizeFortuneInQueue = async (fortuneId) => {
    try {
      // Fal bilgilerini al
      const { data: fortune, error: fortuneError } = await supabase
        .from('fortunes')
        .select('process_after, created_at')
        .eq('id', fortuneId)
        .single();

      if (fortuneError) {
        console.error('Fal bilgisi alınamadı:', fortuneError);
        Alert.alert('Hata', 'Fal bilgisi alınamadı.');
        return;
      }

      // Hızlandırılmış süreyi hesapla
      const originalProcessTime = new Date(fortune.process_after);
      const currentTime = new Date();
      const remainingMinutes = Math.ceil((originalProcessTime - currentTime) / (1000 * 60));
      
      let newProcessTime;
      let message;
      
      if (remainingMinutes <= 10) {
        // 10 dakikadan az kaldıysa 2 dakika içinde göster
        newProcessTime = new Date(currentTime.getTime() + 2 * 60 * 1000);
        message = 'Falınız 2 dakika içinde gösterilecek!';
      } else {
        // 10-20 dakika arası random süre
        const randomMinutes = Math.floor(Math.random() * 11) + 10; // 10-20 dakika
        newProcessTime = new Date(currentTime.getTime() + randomMinutes * 60 * 1000);
        message = `Falınız ${randomMinutes} dakika içinde gösterilecek!`;
      }

      // Fal süresini güncelle
      const { error: updateError } = await supabase
        .from('fortunes')
        .update({ 
          process_after: newProcessTime.toISOString()
        })
        .eq('id', fortuneId);

      if (updateError) {
        console.error('Fal süresi güncellenemedi:', updateError);
        Alert.alert('Hata', 'Fal süresi güncellenemedi.');
        return;
      }

      // Fal için izlenen reklam sayısını 2/2 olarak sabitle (tekrar izlemeye kapalı)
      await updateFortuneAdProgress(fortuneId, 2);

      // Falları yeniden yükle
      fetchPastFortunes();
      
      Alert.alert(
        '🚀 Fal Hızlandırıldı!',
        message,
        [{ text: 'Harika!' }]
      );
    } catch (error) {
      console.error('Fal öncelik güncelleme hatası:', error);
      Alert.alert('Hata', 'Fal önceliği güncellenirken bir hata oluştu.');
    }
  };

  // Tüm falların reklam ilerlemelerini yükle
  const loadFortuneAdProgress = async () => {
    try {
      const progressData = {};
      for (const fortune of pastFortunes) {
        const watchedAdsKey = `@fortune_ads_${fortune.id}`;
        const watchedAds = await AsyncStorage.getItem(watchedAdsKey);
        progressData[fortune.id] = watchedAds ? parseInt(watchedAds, 10) : 0;
      }
      setFortuneAdProgress(progressData);
    } catch (error) {
      console.error('Reklam ilerleme durumu yüklenemedi:', error);
    }
  };

  // Tek bir falın reklam ilerlemesini güncelle
  const updateFortuneAdProgress = async (fortuneId, newProgress) => {
    try {
      const watchedAdsKey = `@fortune_ads_${fortuneId}`;
      await AsyncStorage.setItem(watchedAdsKey, newProgress.toString());
      setFortuneAdProgress(prev => ({
        ...prev,
        [fortuneId]: newProgress
      }));
    } catch (error) {
      console.error('Reklam ilerleme durumu güncellenemedi:', error);
    }
  };
  
  const handleNewFortune = (fortuneType) => {
    // Burç yorumları ücretsiz - jeton kontrolü yapma
    if (fortuneType.name !== 'Burç Yorumları' && userTokens < 10) {
      Alert.alert(
        'Yetersiz Jeton',
        'Fal baktırmak için yeterli jetonunuz bulunmuyor. Jeton satın almak ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Jeton Satın Al', 
            onPress: () => navigation.navigate('TokenStore') 
          }
        ]
      );
      return;
    }
    
    navigation.navigate('NewFortune', { fortuneType });
  };
  
  const fortuneTypeImage = (category) => {
    // Kategoriyi küçük harfe çevir ve temizle
    const cleanCategory = category?.toLowerCase().trim();
    
    switch (cleanCategory) {
      case 'kahve': 
      case 'kahve falı': 
        return require('../../assets/görseller/kahve.png');
      case 'tarot': 
      case 'tarot falı': 
        return require('../../assets/görseller/tarot.png');
      case 'katina': 
      case 'katina falı': 
        return require('../../assets/görseller/katina.png');
      case 'el': 
      case 'el falı': 
        return require('../../assets/görseller/el.png');
      case 'yuz': 
      case 'yüz falı': 
        return require('../../assets/görseller/yüz.png');
      case 'yildizname': 
      case 'yıldızname': 
        return require('../../assets/görseller/yıldızname.png');
      case 'ruya': 
      case 'rüya yorumu': 
        return require('../../assets/görseller/rüya.png');
      case 'burc': 
      case 'burç yorumları': 
      case 'burç yorumu': 
        return require('../../assets/görseller/günlükburç.png');
      default: 
        return require('../../assets/görseller/kahve.png');
    }
  };
  
  const getStatusColor = (status) => {
    switch (status) {
      case 'beklemede':
        return colors.warning;
      case 'yorumlanıyor':
        return colors.info;
      case 'tamamlandı':
        return colors.success;
      default:
        return colors.text.tertiary;
    }
  };
  
  const getStatusText = (status) => {
    switch (status) {
      case 'beklemede':
        return 'Beklemede';
      case 'yorumlanıyor':
        return 'Yorumlanıyor';
      case 'tamamlandı':
        return 'Tamamlandı';
      default:
        return 'Bilinmiyor';
    }
  };
  
  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  };

  // Seçilen kartları parse et ve görüntüle
  const parseSelectedCards = (specialData, category) => {
    if (!specialData) return null;
    
    try {
      const data = JSON.parse(specialData);
      const selectedCards = data.selected_cards;
      
      if (!selectedCards) return null;
      
      const cleanCategory = category?.toLowerCase().trim();
      
      if (cleanCategory === 'tarot' || cleanCategory === 'tarot falı') {
        // Tarot kartları
        const { past, present, future } = selectedCards;
        return (
          <View style={styles.selectedCardsContainer}>
            <Text style={styles.selectedCardsTitle}>Seçilen Tarot Kartları:</Text>
            <View style={styles.tarotCardsRow}>
              {past && (
                <View style={styles.tarotCard}>
                  <Text style={styles.tarotCardPosition}>Geçmiş</Text>
                  <Text style={styles.tarotCardName}>{past.turkishName}</Text>
                </View>
              )}
              {present && (
                <View style={styles.tarotCard}>
                  <Text style={styles.tarotCardPosition}>Şimdi</Text>
                  <Text style={styles.tarotCardName}>{present.turkishName}</Text>
                </View>
              )}
              {future && (
                <View style={styles.tarotCard}>
                  <Text style={styles.tarotCardPosition}>Gelecek</Text>
                  <Text style={styles.tarotCardName}>{future.turkishName}</Text>
                </View>
              )}
            </View>
          </View>
        );
      } else if (cleanCategory === 'katina' || cleanCategory === 'katina falı') {
        // Katina kartları
        const { yourCards, theirCards, sharedCard } = selectedCards;
        return (
          <View style={styles.selectedCardsContainer}>
            <Text style={styles.selectedCardsTitle}>Seçilen Katina Kartları:</Text>
            <View style={styles.katinaCardsContainer}>
              {yourCards && yourCards.length > 0 && (
                <View style={styles.katinaCardGroup}>
                  <Text style={styles.katinaCardGroupTitle}>Sizin Kartlarınız:</Text>
                  <View style={styles.katinaCardsRow}>
                    {yourCards.map((card, index) => (
                      <View key={index} style={styles.katinaCard}>
                        <Text style={styles.katinaCardText}>{card.suitName} {card.valueName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {theirCards && theirCards.length > 0 && (
                <View style={styles.katinaCardGroup}>
                  <Text style={styles.katinaCardGroupTitle}>Karşı Tarafın Kartları:</Text>
                  <View style={styles.katinaCardsRow}>
                    {theirCards.map((card, index) => (
                      <View key={index} style={styles.katinaCard}>
                        <Text style={styles.katinaCardText}>{card.suitName} {card.valueName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {sharedCard && (
                <View style={styles.katinaCardGroup}>
                  <Text style={styles.katinaCardGroupTitle}>Ortak Kart:</Text>
                  <View style={styles.katinaCard}>
                    <Text style={styles.katinaCardText}>{sharedCard.suitName} {sharedCard.valueName}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      }
    } catch (error) {
      console.error('Kart bilgileri parse edilemedi:', error);
    }
    
    return null;
  };

  const getFortuneName = (category) => {
    // Kategoriyi küçük harfe çevir ve temizle
    const cleanCategory = category?.toLowerCase().trim();
    
    switch (cleanCategory) {
      case 'kahve': 
      case 'kahve falı': 
        return 'Kahve Falı';
      case 'tarot': 
      case 'tarot falı': 
        return 'Tarot Falı';
      case 'katina': 
      case 'katina falı': 
        return 'Katina Falı';
      case 'el': 
      case 'el falı': 
        return 'El Falı';
      case 'yuz': 
      case 'yüz falı': 
        return 'Yüz Falı';
      case 'yildizname': 
      case 'yıldızname': 
      case 'astroloji': 
        return 'Yıldızname';
      case 'ruya': 
      case 'rüya yorumu': 
        return 'Rüya Yorumu';
      case 'burc': 
      case 'burç yorumları': 
      case 'burç yorumu': 
        return 'Burç Yorumu';
      default: 
        return 'Fal';
    }
  };

  // Fal silme fonksiyonu
  const handleDeleteFortune = async (fortuneId) => {
    Alert.alert(
      'Fal Sil',
      'Bu falı silmek istediğinize emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              setLoading(true);
              const { error } = await supabase
                .from('fortunes')
                .delete()
                .eq('id', fortuneId);
              if (error) throw error;
              // Silindikten sonra listeyi güncelle
              fetchPastFortunes();
              Alert.alert('Başarılı', 'Fal başarıyla silindi.');
            } catch (err) {
              Alert.alert('Hata', 'Fal silinirken bir hata oluştu.');
            } finally {
              setLoading(false);
            }
          }
        }
      ]
    );
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header Bölümü */}
      <View style={styles.header}>
        {/* Banner Görsel Arka Plan */}
        <Image 
          source={require('../../assets/görseller/banner.png')} 
          style={styles.headerBackgroundImage} 
          resizeMode="cover"
        />
        
        {/* Overlay Gradient */}
        <LinearGradient
          colors={['rgba(0,0,0,0.5)', 'rgba(0,0,0,0.7)']}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
          style={styles.headerOverlay}
        />
        
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Falınız</Text>
            <Text style={styles.headerSubtitle}>Geleceğinizi keşfedin</Text>
          </View>
          
          <View style={styles.tokenInfoContainer}>
            <LinearGradient
              colors={[colors.secondary, colors.primaryLight]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tokenInfoGradient}
            >
              <MaterialCommunityIcons name="diamond" size={18} color={colors.background} />
              <Text style={styles.tokenInfoText}>{userTokens} Jeton</Text>
            </LinearGradient>
          </View>
        </View>
      </View>

      {/* Ödüllü Reklam Butonu */}
      <View style={styles.rewardedAdContainer}>
        <TouchableOpacity 
          style={[styles.rewardedAdButton, dailyAdCount >= 10 && styles.rewardedAdButtonDisabled]}
          onPress={handleWatchRewardedAd}
          disabled={adLoading || dailyAdCount >= 10}
        >
          <LinearGradient
            colors={dailyAdCount >= 10 
              ? [colors.text.tertiary, colors.text.secondary] 
              : [colors.warning, colors.secondary]
            }
            style={styles.rewardedAdGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <View style={styles.rewardedAdContent}>
              <View style={styles.rewardedAdIcon}>
                <MaterialCommunityIcons 
                  name={adLoading ? "loading" : "play-circle"} 
                  size={20} 
                  color="#000000" 
                />
              </View>
              <View style={styles.rewardedAdTextContainer}>
                <Text style={styles.rewardedAdTitle}>
                  {dailyAdCount >= 10 ? 'Günlük Limit Doldu' : 'Reklam İzle'}
                </Text>
                <Text style={styles.rewardedAdSubtitle}>
                  {dailyAdCount >= 10 
                    ? 'Yarın tekrar deneyin' 
                    : '1 Jeton Kazan!'
                  }
                </Text>
              </View>
              <View style={styles.rewardedAdReward}>
                                  <MaterialCommunityIcons name="diamond" size={14} color="#000000" />
                <Text style={styles.rewardedAdRewardText}>
                  {dailyAdCount >= 10 ? '0/10' : `${dailyAdCount}/10`}
                </Text>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </View>
      
      {/* Tab Menü */}
      <View style={styles.tabContainer}>
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'new' && styles.activeTabButton]}
          onPress={() => setActiveTab('new')}
        >
          <Text style={[styles.tabText, activeTab === 'new' && styles.activeTabText]}>Yeni Fal</Text>
          {activeTab === 'new' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tabButton, activeTab === 'history' && styles.activeTabButton]}
          onPress={() => setActiveTab('history')}
        >
          <Text style={[styles.tabText, activeTab === 'history' && styles.activeTabText]}>Fal Geçmişim</Text>
          {activeTab === 'history' && <View style={styles.activeIndicator} />}
        </TouchableOpacity>
      </View>
      
      {/* İçerik Alanı */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        {activeTab === 'new' ? (
          <View style={styles.newFortuneContainer}>
            <Text style={styles.sectionTitle}>Fal Türünü Seçin</Text>
            <Text style={styles.sectionDescription}>
              Merak ettiğiniz konular hakkında uzman falcılarımızdan yorum alın
            </Text>
            
            <View style={styles.promotionCard}>
              <LinearGradient
                colors={[colors.secondary, colors.primary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.promotionGradient}
              >
                <View style={styles.promotionContent}>
                  <View style={{width: '100%'}}>
                    <Text style={styles.promotionTitle}>Özel Teklif!</Text>
                    <Text style={styles.promotionDescription}>
                      İlk falınız için 10 jeton hediye! Hemen kayıt ol ve falına bak.
                    </Text>
                  </View>
                </View>
              </LinearGradient>
            </View>
            
            {fortuneTypes.map((type, index) => (
              <TouchableOpacity 
                key={type.id} 
                style={styles.fortuneTypeCard}
                onPress={() => handleNewFortune(type)}
                activeOpacity={0.8}
              >
                <LinearGradient
                  colors={[colors.card, colors.background]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.fortuneTypeCardGradient}
                >
                  {/* Glow effect */}
                  <View style={styles.fortuneTypeGlow} />
                  
                  <View style={styles.fortuneTypeCardContent}>
                    <LinearGradient
                      colors={[colors.primary, colors.secondary]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.fortuneTypeIconContainer}
                    >
                      <Image source={type.image} style={styles.fortuneTypeImage} />
                      <View style={styles.iconGlow} />
                    </LinearGradient>
                    
                    <View style={styles.fortuneTypeInfo}>
                      <View style={styles.fortuneTypeTextContainer}>
                        <Text style={styles.fortuneTypeName}>{type.name}</Text>
                        <Text style={styles.fortuneTypeDescription}>{type.description}</Text>
                      </View>
                      
                      <View style={styles.priceContainer}>
                        <LinearGradient
                          colors={type.name === 'Burç Yorumları' ? [colors.success, colors.primaryLight] : [colors.secondary, colors.primaryLight]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.priceGradient}
                        >
                                                  {type.name === 'Burç Yorumları' ? (
                          <>
                            <MaterialCommunityIcons name="star" size={16} color={colors.background} />
                            <Text style={styles.priceText}>GÜNLÜK 3</Text>
                          </>
                        ) : (
                            <>
                              <MaterialCommunityIcons name="diamond" size={16} color={colors.background} />
                              <Text style={styles.priceText}>10</Text>
                            </>
                          )}
                        </LinearGradient>
                      </View>
                    </View>
                  </View>
                  
                  {/* Decorative elements */}
                  <View style={[styles.decorativeCircle, { top: 10, right: 15 }]} />
                  <View style={[styles.decorativeCircle, { bottom: 15, left: 10, opacity: 0.3 }]} />
                </LinearGradient>
              </TouchableOpacity>
            ))}
            
            <View style={styles.subscriptionPromoCard}>
              <LinearGradient
                colors={[colors.primaryLight, colors.primaryDark]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.subscriptionPromoGradient}
              >
                <View style={styles.subscriptionPromoContent}>
                  <MaterialCommunityIcons name="crown" size={28} color={colors.secondary} />
                  <View style={styles.subscriptionPromoTextContainer}>
                    <Text style={styles.subscriptionPromoTitle}>Aylık Abonelik Avantajı</Text>
                    <Text style={styles.subscriptionPromoDescription}>
                      Her ay 4 fal + jetonlarda %15 indirim
                    </Text>
                  </View>
                  <TouchableOpacity 
                    style={styles.subscriptionPromoButton}
                    onPress={() => navigation.navigate('BuyTokens')}
                  >
                    <Text style={styles.subscriptionPromoButtonText}>İncele</Text>
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </View>
          </View>
        ) : (
          <View style={styles.historyContainer}>
            <Text style={styles.sectionTitle}>Fal Geçmişiniz</Text>
            <Text style={styles.sectionDescription}>
              Daha önce baktırdığınız falları görüntüleyin ve sonuçları okuyun
            </Text>
            
            {/* Premium Bilgilendirme Mesajı */}
            {!isPremium && pastFortunes.length > 0 && (
              <View style={styles.premiumInfoCard}>
                <LinearGradient
                  colors={[colors.primaryLight, colors.primaryDark]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.premiumInfoGradient}
                >
                  <View style={styles.premiumInfoContent}>
                    <MaterialCommunityIcons name="crown" size={24} color={colors.secondary} />
                    <View style={styles.premiumInfoTextContainer}>
                      <Text style={styles.premiumInfoTitle}>Abonelik Alın</Text>
                                          <Text style={styles.premiumInfoDescription}>
                      Tüm fal geçmişinizi görüntülemek ve sınırsız erişim için abonelik alın
                    </Text>
                    </View>
                    <TouchableOpacity 
                      style={styles.premiumInfoButton}
                      onPress={() => navigation.navigate('BuyTokens')}
                    >
                      <Text style={styles.premiumInfoButtonText}>Abonelik Al</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </View>
            )}
            
            {/* Fal Sayısı Bilgisi */}
            <View style={styles.fortuneCountInfo}>
              <LinearGradient
                colors={[colors.card, colors.background]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.fortuneCountGradient}
              >
                <View style={styles.fortuneCountContent}>
                  <MaterialCommunityIcons 
                    name={isPremium ? "crown" : "information"} 
                    size={20} 
                    color={isPremium ? colors.secondary : colors.info} 
                  />
                  <Text style={styles.fortuneCountText}>
                    {isPremium 
                      ? 'Sınırsız fal geçmişi erişimi' 
                      : `Son ${pastFortunes.length} fal görüntüleniyor (${pastFortunes.length}/3)`
                    }
                  </Text>

                </View>
              </LinearGradient>
            </View>
            
            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : pastFortunes.length > 0 ? (
              pastFortunes.map((fortune, index) => (
                <View key={fortune.id} style={styles.pastFortuneCardWrapper}>
                  <TouchableOpacity
                    style={[
                      styles.pastFortuneCard,
                      fortune.status === 'yorumlanıyor' && styles.disabledFortuneCard
                    ]}
                    onPress={() => {
                      if (fortune.status === 'yorumlanıyor') {
                        Alert.alert(
                          'Fal Henüz Hazır Değil',
                          'Falınız hala yorumlanıyor. Lütfen biraz bekleyin, hazır olduğunda bildirim alacaksınız.',
                          [{ text: 'Tamam' }]
                        );
                        return;
                      }
                      navigation.navigate('FortuneDetail', { fortuneId: fortune.id });
                    }}
                    activeOpacity={fortune.status === 'yorumlanıyor' ? 1 : 0.8}
                    disabled={fortune.status === 'yorumlanıyor'}
                  >
                    {/* Silme butonu */}
                    <TouchableOpacity
                      style={styles.deleteButton}
                      onPress={() => handleDeleteFortune(fortune.id)}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Ionicons name="trash-outline" size={20} color={colors.error} />
                    </TouchableOpacity>
                    {/* Kart içeriği */}
                    <LinearGradient
                      colors={[colors.card, colors.background]}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                      style={styles.pastFortuneGradient}
                    >
                      <View style={styles.pastFortuneHeader}>
                        <View style={styles.pastFortuneType}>
                          <LinearGradient
                            colors={[colors.primary, colors.secondary]}
                            start={{ x: 0, y: 0 }}
                            end={{ x: 1, y: 0 }}
                            style={styles.pastFortuneTypeIcon}
                          >
                            <Image source={fortuneTypeImage(fortune.category)} style={styles.pastFortuneTypeImage} />
                          </LinearGradient>
                          <Text style={styles.pastFortuneTypeText}>
                            {getFortuneName(fortune.category)}
                          </Text>
                        </View>
                        <LinearGradient
                          colors={[getStatusColor(fortune.status), colors.card]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.statusBadge}
                        >
                          <Text style={styles.statusText}>{getStatusText(fortune.status)}</Text>
                        </LinearGradient>
                      </View>
                      
                      <View style={styles.pastFortuneContent}>
                        {fortune.fortune_teller && (
                          <View style={styles.fortuneTellerInfo}>
                            <View style={styles.fortuneTellerImageContainer}>
                              <Image 
                                source={{ 
                                  uri: fortune.fortune_teller.profile_image || 
                                      'https://via.placeholder.com/50' 
                                }} 
                                style={styles.fortuneTellerImage} 
                              />
                              <View style={styles.fortuneTellerImageGlow} />
                            </View>
                            <View style={styles.fortuneTellerDetails}>
                              <Text style={styles.fortuneTellerName}>
                                {fortune.fortune_teller.name || 'İsimsiz Falcı'}
                              </Text>
                              <View style={styles.ratingContainer}>
                                {[1, 2, 3, 4, 5].map((star) => (
                                  <FontAwesome5 
                                    key={star}
                                    name="star" 
                                    size={12} 
                                    color={star <= Math.round(fortune.fortune_teller.rating) ? 
                                          colors.secondary : colors.border} 
                                    style={styles.starIcon}
                                  />
                                ))}
                              </View>
                            </View>
                          </View>
                        )}
                        
                        {/* Seçilen kartları göster */}
                        {parseSelectedCards(fortune.special_data, fortune.category)}
                        
                        <View style={styles.pastFortuneDetails}>
                          <View style={styles.pastFortuneDetail}>
                            <Ionicons name="calendar-outline" size={14} color={colors.secondary} />
                            <Text style={styles.pastFortuneDetailText}>
                              {formatDate(fortune.created_at)}
                            </Text>
                          </View>
                          
                          <View style={styles.pastFortuneDetail}>
                            <MaterialCommunityIcons name="diamond" size={14} color={colors.secondary} />
                            <Text style={styles.pastFortuneDetailText}>
                              {fortune.token_amount} Jeton
                            </Text>
                          </View>
                        </View>
                      </View>
                      
                                              {fortune.status === 'yorumlanıyor' ? (
                        // Bekleyen fallar için reklam izleme butonu
                        <View style={styles.pendingFortuneFooter}>
                          <TouchableOpacity 
                            style={[
                              styles.watchAdButton,
                              (fortuneAdProgress[fortune.id] || 0) >= 2 && styles.watchAdButtonDisabled
                            ]}
                            onPress={() => (fortuneAdProgress[fortune.id] || 0) >= 2 ? null : watchAdForImmediateFortune(fortune)}
                            disabled={(fortuneAdProgress[fortune.id] || 0) >= 2}
                          >
                            <LinearGradient
                              colors={(fortuneAdProgress[fortune.id] || 0) >= 2 ? [colors.success, colors.primary] : [colors.warning, colors.secondary]}
                              start={{ x: 0, y: 0 }}
                              end={{ x: 1, y: 0 }}
                              style={styles.watchAdButtonGradient}
                            >
                              <Ionicons 
                                name={(fortuneAdProgress[fortune.id] || 0) >= 2 ? "checkmark-circle" : "play-circle"} 
                                size={16} 
                                color={colors.text.light} 
                              />
                              <View style={styles.watchAdButtonContent}>
                                <Text style={styles.watchAdButtonText}>
                                  {(fortuneAdProgress[fortune.id] || 0) >= 2 
                                    ? "🚀 Zaten Hızlandırıldı!" 
                                    : "Reklam İzle ve Daha Kısa Sürede Gör!"
                                  }
                                </Text>
                                <Text style={styles.watchAdProgressText}>
                                  {fortuneAdProgress[fortune.id] || 0}/2
                                </Text>
                              </View>
                            </LinearGradient>
                          </TouchableOpacity>
                        </View>
                      ) : (
                        // Tamamlanan fallar için normal footer
                        <LinearGradient
                          colors={['rgba(74, 0, 128, 0.1)', 'rgba(255, 215, 0, 0.1)']}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.pastFortuneFooter}
                        >
                          <Text style={styles.viewDetailsText}>Detayları Görüntüle</Text>
                          <Ionicons 
                            name="chevron-forward" 
                            size={16} 
                            color={colors.secondary} 
                          />
                        </LinearGradient>
                      )}
                    </LinearGradient>
                  </TouchableOpacity>
                </View>
              ))
            ) : (
              <View style={styles.emptyContainer}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.emptyIconContainer}
                >
                  <MaterialCommunityIcons name="crystal-ball" size={60} color={colors.text.light} />
                  <View style={styles.emptyIconGlow} />
                </LinearGradient>
                <Text style={styles.emptyText}>Henüz fal baktırmadınız</Text>
                <Text style={styles.emptySubText}>Geleceğinizi keşfetmek için ilk falınızı baktırın</Text>
                <TouchableOpacity 
                  style={styles.emptyButton}
                  onPress={() => setActiveTab('new')}
                  activeOpacity={0.8}
                >
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.emptyButtonGradient}
                  >
                    <Text style={styles.emptyButtonText}>İlk Falınızı Baktırın</Text>
                    <Ionicons name="arrow-forward" size={16} color={colors.text.light} />
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
        
        {/* Alt Boşluk */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    height: 200,
    position: 'relative',
    overflow: 'hidden',
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerBackgroundImage: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  headerOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingTop: 50,
    paddingHorizontal: 20,
    zIndex: 1,
  },
  headerTextContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 36,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 5,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.light,
    fontWeight: '500',
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.secondary,
    opacity: 0.05,
    borderRadius: 10,
    blur: 10,
  },
  tokenInfoContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginLeft: 'auto', // Sağa yaslamak için
  },
  tokenInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  tokenInfoText: {
    color: colors.background,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 14,
  },
  headerImageContainer: {
    position: 'absolute',
    right: 70,
    bottom: -50,
    zIndex: 0,
  },
  headerImage: {
    width: 200,
    height: 200,
  },
  headerImageGlow: {
    position: 'absolute',
    top: 20,
    left: 20,
    right: 20,
    bottom: 20,
    backgroundColor: colors.secondary,
    opacity: 0.1,
    borderRadius: 100,
    blur: 20,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    marginTop: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  tabButton: {
    paddingVertical: 12,
    marginRight: 20,
    position: 'relative',
  },
  activeTabButton: {
    borderBottomWidth: 0,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  activeTabText: {
    color: colors.text.light,
    fontWeight: '600',
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    left: 0,
    right: 0,
    height: 3,
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  newFortuneContainer: {
    paddingBottom: 20,
  },
  historyContainer: {
    paddingBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 8,
  },
  sectionDescription: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: 20,
  },
  fortuneTypeCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  fortuneTypeCardGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    position: 'relative',
  },
  fortuneTypeGlow: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: colors.secondary,
    opacity: 0.05,
    borderRadius: 20,
  },
  fortuneTypeCardContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
    zIndex: 1,
  },
  fortuneTypeIconContainer: {
    width: 65,
    height: 65,
    borderRadius: 32.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 20,
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  iconGlow: {
    position: 'absolute',
    top: -5,
    left: -5,
    right: -5,
    bottom: -5,
    backgroundColor: colors.secondary,
    opacity: 0.2,
    borderRadius: 37.5,
    blur: 10,
  },
  fortuneTypeInfo: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  fortuneTypeTextContainer: {
    flex: 1,
    marginRight: 15,
  },
  fortuneTypeName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 6,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  fortuneTypeDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    fontWeight: '500',
    lineHeight: 18,
  },
  priceContainer: {
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  priceGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 10,
  },
  priceText: {
    color: colors.background,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 16,
  },
  decorativeCircle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.secondary,
    opacity: 0.1,
  },
  promotionCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  promotionGradient: {
    padding: 25,
    position: 'relative',
  },
  promotionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  promotionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.dark,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  promotionDescription: {
    fontSize: 14,
    color: colors.text.dark,
    fontWeight: '500',
    lineHeight: 20,
  },
  pastFortuneCard: {
    borderRadius: 20,
    marginBottom: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  pastFortuneGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  pastFortuneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end', // Rozeti biraz aşağıda başlat
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
    paddingTop: 28, // Status badge ile çöp kutusu arasında boşluk
  },
  pastFortuneType: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastFortuneTypeIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  pastFortuneTypeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  statusBadge: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  pastFortuneContent: {
    padding: 20,
  },
  fortuneTellerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  fortuneTellerImageContainer: {
    position: 'relative',
    marginRight: 15,
  },
  fortuneTellerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    borderWidth: 3,
    borderColor: colors.secondary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  fortuneTellerImageGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: colors.secondary,
    opacity: 0.2,
    borderRadius: 28,
    blur: 10,
  },
  fortuneTellerDetails: {
    flex: 1,
  },
  fortuneTellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  ratingContainer: {
    flexDirection: 'row',
  },
  starIcon: {
    marginRight: 2,
  },
  pastFortuneDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  pastFortuneDetail: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  pastFortuneDetailText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 5,
  },
  pastFortuneFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.1)',
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
    position: 'relative',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  emptyIconGlow: {
    position: 'absolute',
    top: -10,
    left: -10,
    right: -10,
    bottom: -10,
    backgroundColor: colors.secondary,
    opacity: 0.2,
    borderRadius: 70,
    blur: 20,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  emptySubText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 20,
    paddingHorizontal: 20,
  },
  emptyButton: {
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },

  emptyButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 25,
    paddingVertical: 15,
  },
  emptyButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 10,
  },
  loader: {
    marginTop: 30,
  },
  subscriptionPromoCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  subscriptionPromoGradient: {
    padding: 15,
  },
  subscriptionPromoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  subscriptionPromoTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  subscriptionPromoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  subscriptionPromoDescription: {
    fontSize: 13,
    color: colors.text.secondary,
  },
  subscriptionPromoButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  subscriptionPromoButtonText: {
    color: colors.text.light,
    fontWeight: '600',
    fontSize: 13,
  },
  pastFortuneCardWrapper: {
    position: 'relative',
    marginBottom: 20, // Kartlar arası boşluk
  },
  deleteButton: {
    position: 'absolute',
    top: 2, // Daha yukarıda dursun
    right: 2,
    zIndex: 3,
    backgroundColor: colors.background,
    borderRadius: 12,
    padding: 4,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.12,
    shadowRadius: 2,
    elevation: 3,
  },
  disabledFortuneCard: {
    opacity: 0.6,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  fortuneTypeImage: {
    width: 65,
    height: 65,
    borderRadius: 28,
    backgroundColor: '#fff',
    resizeMode: 'cover',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  pastFortuneTypeImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fff',
    resizeMode: 'cover',
    alignSelf: 'center',
  },
  // Seçilen kartlar stilleri
  selectedCardsContainer: {
    marginTop: 15,
    marginBottom: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  selectedCardsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 12,
    textAlign: 'center',
  },
  // Tarot kartları stilleri
  tarotCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
  },
  tarotCard: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minWidth: 80,
  },
  tarotCardPosition: {
    fontSize: 11,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 4,
  },
  tarotCardName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  // Katina kartları stilleri
  katinaCardsContainer: {
    gap: 12,
  },
  katinaCardGroup: {
    alignItems: 'center',
  },
  katinaCardGroupTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  katinaCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
    flexWrap: 'wrap',
  },
  katinaCard: {
    padding: 6,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minWidth: 60,
    alignItems: 'center',
  },
  katinaCardText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  // Ödüllü reklam stilleri
  rewardedAdContainer: {
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  rewardedAdButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  rewardedAdButtonDisabled: {
    opacity: 0.6,
  },
  rewardedAdGradient: {
    paddingVertical: 12,
    paddingHorizontal: 15,
  },
  rewardedAdContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardedAdIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardedAdTextContainer: {
    flex: 1,
    marginLeft: 12,
  },
  rewardedAdTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 1,
  },
  rewardedAdSubtitle: {
    fontSize: 11,
    color: '#000000',
    opacity: 0.9,
  },
  rewardedAdReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  rewardedAdRewardText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 3,
  },
  // Bekleyen fallar için reklam izleme butonu stilleri
  pendingFortuneFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.1)',
  },
  watchAdButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  watchAdButtonDisabled: {
    opacity: 0.6,
  },
  watchAdButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  watchAdButtonContent: {
    flex: 1,
    alignItems: 'center',
    marginLeft: 8,
  },
  watchAdButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 2,
  },
  watchAdProgressText: {
    color: colors.text.light,
    fontWeight: '600',
    fontSize: 12,
    opacity: 0.9,
  },
  // Premium bilgilendirme kartı stilleri
  premiumInfoCard: {
    marginBottom: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 16,
    elevation: 12,
  },
  premiumInfoGradient: {
    padding: 20,
  },
  premiumInfoContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  premiumInfoTextContainer: {
    flex: 1,
    marginLeft: 15,
    marginRight: 15,
  },
  premiumInfoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  premiumInfoDescription: {
    fontSize: 13,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  premiumInfoButton: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  premiumInfoButtonText: {
    color: colors.secondary,
    fontWeight: '600',
    fontSize: 13,
  },
  // Fal sayısı bilgi kartı stilleri
  fortuneCountInfo: {
    marginBottom: 20,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  fortuneCountGradient: {
    padding: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  fortuneCountContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  fortuneCountText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 12,
    fontWeight: '500',
  },
});

export default FalScreen; 