

import React, { useState, useEffect, useCallback } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, StatusBar, ImageBackground, Dimensions, RefreshControl, TextInput, Modal } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { supabase } from '../../lib/supabase';
import { getAllFortuneTellers, checkUserSubscriptionWithTrial } from '../services/supabaseService';
import { TrialService } from '../services/trialService';
import adMobService from '../services/adMobService';
import DailyLoginRewardModal from '../components/DailyLoginRewardModal';
import dailyLoginService from '../services/dailyLoginService';
import HomeAdminBanner from '../components/HomeAdminBanner';
import homeBannerService from '../services/homeBannerService';
import DailyTasksCard from '../components/DailyTasksCard';
import dailyTaskService from '../services/dailyTaskService';
import AstrologyAnalysisCard from '../components/AstrologyAnalysisCard';
import NotificationService from '../services/notificationService';
import { useFocusEffect } from '@react-navigation/native';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {

  const [userTokens, setUserTokens] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fortuneTellers, setFortuneTellers] = useState([]);
  const [filteredFortuneTellers, setFilteredFortuneTellers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const [showAllTellersModal, setShowAllTellersModal] = useState(false);
  const [selectedTeller, setSelectedTeller] = useState(null);
  const [showTellerModal, setShowTellerModal] = useState(false);
  const [dailyAdCount, setDailyAdCount] = useState(0);
  const [adLoading, setAdLoading] = useState(false);
  const [showDailyLoginModal, setShowDailyLoginModal] = useState(false);
  const [userId, setUserId] = useState(null);
  const [adminBanners, setAdminBanners] = useState([]);
  const [adminBannerIndex, setAdminBannerIndex] = useState(0);
  const [bannersLoading, setBannersLoading] = useState(false);
  const [astrologyTrialUsed, setAstrologyTrialUsed] = useState(false);

  const [premiumStatus, setPremiumStatus] = useState({
    isPremium: false,
    isFreeTrial: false,
    subscriptionType: 'free'
  });
  const [showDailyTasksModal, setShowDailyTasksModal] = useState(false);
  const [dailyTasksProgress, setDailyTasksProgress] = useState(null);
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0);

  // Günün sözleri
  const dailyQuotes = [
    { text: "En fazla çabayı gerektiren her zaman başlangıçtır.", author: "James Cash Penny" },
    { text: "Hayatta en önemli şey, asla pes etmemektir.", author: "Winston Churchill" },
    { text: "Başarı, hazırlık ile fırsatın buluştuğu yerde doğar.", author: "Bobby Unser" },
    { text: "Geleceği tahmin etmenin en iyi yolu onu yaratmaktır.", author: "Peter Drucker" },
    { text: "Büyük işler büyük riskler gerektirir.", author: "Julius Caesar" }
  ];

  // Günün sözünü al (günlük değişen)
  const getDailyQuote = () => {
    const today = new Date().getDate();
    return dailyQuotes[today % dailyQuotes.length];
  };

  const todayQuote = getDailyQuote();

  // Kullanıcının bilgilerini al
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        setUserId(user.id);
        
        const { data, error } = await supabase
          .from('users')
          .select('token_balance, first_name, profile_image, astrology_trial_used')
          .eq('id', user.id)
          .single();
          
        
        if (error) {
          console.error('❌ Kullanıcı bilgileri alınırken hata:', error);
        }
        
        
        // Hata olsa bile mevcut verileri kullan
        if (data) {
          const newTokens = data.token_balance || 0;
          setUserTokens(newTokens);
          
          if (data.first_name) {
            setFirstName(data.first_name);
          }
          if (data.profile_image) {
            setProfileImage(data.profile_image);
          }
          if (data.astrology_trial_used !== undefined) {
            setAstrologyTrialUsed(data.astrology_trial_used);
          }
        }
        
        // Günlük giriş ödülünü geçici olarak devre dışı (AsyncStorage sorunu)
        // await checkDailyLoginReward();
        

        
        // Premium durumu kontrol et
        try {
          const subscriptionInfo = await checkUserSubscriptionWithTrial(user.id);
          setPremiumStatus({
            isPremium: subscriptionInfo.isPremium || false,
            isFreeTrial: subscriptionInfo.isFreeTrial || false,
            subscriptionType: subscriptionInfo.subscriptionType || 'free'
          });
        } catch (error) {
          console.error('Premium durum kontrol hatası:', error);
        }
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri alınamadı:', error);
    }
  };

  // Falcıları getir
  const fetchFortuneTellers = async () => {
    try {
      const { data, error } = await getAllFortuneTellers();
      if (error) throw error;
      
      // Sadece müsait falcıları al ve popüler olanları önce göster
      const availableTellers = data?.filter(teller => teller.is_available) || [];
      const sortedTellers = availableTellers.sort((a, b) => b.rating - a.rating);
      
      setFortuneTellers(sortedTellers);
      setFilteredFortuneTellers(sortedTellers); // Başlangıçta tümünü göster
    } catch (error) {
      console.error('Falcılar getirilemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Günlük görev durumunu yükle
  const fetchDailyTasksProgress = async () => {
    try {
      if (!userId) return;
      
      const result = await dailyTaskService.getDailyTaskStatus(userId);
      if (result.success) {
        setDailyTasksProgress(result.data);
      }
    } catch (error) {
      console.error('Günlük görev durumu alınırken hata:', error);
    }
  };

  // Okunmamış bildirim sayısını yükle
  const fetchUnreadNotificationCount = async () => {
    try {
      const count = await NotificationService.getUnreadNotificationCount();
      setUnreadNotificationCount(count);
    } catch (error) {
      console.error('Okunmamış bildirim sayısı alınırken hata:', error);
    }
  };

  // Günlük giriş ödülünü kontrol et
  const checkDailyLoginReward = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const today = new Date().toISOString().split('T')[0];
      const lastLoginKey = `@last_login_date_${user.id}`;
      
      // Son giriş tarihini AsyncStorage'dan al
      const lastLoginDate = await AsyncStorage.getItem(lastLoginKey);
      
      // Bugün zaten giriş yapılmış mı kontrol et
      if (lastLoginDate === today) {
        return; // Bugün zaten giriş yapılmış
      }
      
      // Günlük giriş ödülü modalını göster
      setShowDailyLoginModal(true);
      
    } catch (error) {
    }
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
        await fetchUserData();
        // Günlük reklam sayısını güncelle
        await checkDailyAdCount();
        
        // Mini görev ilerlemesini güncelle
        if (userId) {
          try {
            await dailyTaskService.updateAdProgress(userId);
          } catch (error) {
            console.error('Görev ilerlemesi güncellenirken hata:', error);
          }
        }
      }
    } catch (error) {
      console.error('Reklam izleme hatası:', error);
    } finally {
      setAdLoading(false);
    }
  };

  const fetchAdminBanner = async (userTokenBalance) => {
    try {
      setBannersLoading(true);
      const banners = await homeBannerService.getActiveHomeBanners(userId, {
        appVersion: '1.1.0',
        currentUserTokens: typeof userTokenBalance === 'number' ? userTokenBalance : userTokens,
      });
      
      if (!banners || banners.length === 0) {
        setAdminBanners([]);
        return;
      }
      
      // Her banner için dismiss ve impression cap kontrolü yap
      const validBanners = [];
      for (const banner of banners) {
        const dismissed = await homeBannerService.isDismissed(banner);
        const underCap = await homeBannerService.checkImpressionCap(banner);
        if (!dismissed && underCap) {
          validBanners.push(banner);
          // Banner gösterildiğinde impression count'ı artır
          await homeBannerService.incrementImpression(banner);
        }
      }
      
      setAdminBanners(validBanners);
    } catch (e) {
      setAdminBanners([]);
    } finally {
      setBannersLoading(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchUserData();
    fetchFortuneTellers();
    checkDailyAdCount();
  }, []);

  useEffect(() => {
    if (userId) {
      fetchAdminBanner();
      fetchDailyTasksProgress();
      fetchUnreadNotificationCount();
    }
  }, [userId, userTokens]);

  // Sayfa odaklandığında bildirim sayısını yenile
  useFocusEffect(
    useCallback(() => {
      if (userId) {
        fetchUnreadNotificationCount();
      }
    }, [userId])
  );

  // Yenileme işlemi
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Önce günlük giriş ödülü kontrolü yap
      if (userId) {
        const dailyLoginResult = await dailyLoginService.checkAndRewardDailyLogin(userId);
        if (dailyLoginResult.success) {
          // Ödül alındıysa modal'ı göster
          setShowDailyLoginModal(true);
        }
      }
      
      // Sonra diğer verileri yenile
      await fetchUserData();
      await fetchFortuneTellers();
      await checkDailyAdCount();
      
      // Banner'ları da yenile
      if (userId) {
        await fetchAdminBanner();
        await fetchDailyTasksProgress();
        await fetchUnreadNotificationCount();
      }
      

    } catch (error) {
      console.error('Yenileme sırasında hata:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Falcı müsaitlik durumu için renk
  const getAvailabilityColor = (isAvailable) => {
    return isAvailable ? colors.success : colors.error;
  };

  // Falcı müsaitlik durumu için metin
  const getAvailabilityText = (isAvailable) => {
    return isAvailable ? 'Müsait' : 'Meşgul';
  };

  // Fal türleri - Yeni tasarım için
  const fortuneTypes = [
    { 
      id: 1, 
      name: 'Kahve Falı', 
      icon: 'coffee',
      image: require('../../assets/görseller/kahve.png'),
      category: 'kahve',
      price: 49.99,
      description: 'Fincanınızdaki sırları keşfedin',
      gradient: [colors.primary, colors.primaryDark]
    },
    { 
      id: 2, 
      name: 'Tarot Falı', 
      icon: 'cards',
      image: require('../../assets/görseller/tarot.png'),
      category: 'tarot',
      price: 49.99,
      description: 'Kartların size söylediklerini öğrenin',
      gradient: [colors.secondary, colors.primary]
    },
    { 
      id: 3, 
      name: 'Katina Falı', 
      icon: 'eye',
      image: require('../../assets/görseller/katina.png'),
      category: 'katina',
      price: 49.99,
      description: 'Aşk temalı iskambil falı ile duygularınızı keşfedin',
      gradient: [colors.warning, colors.primary]
    },
    { 
      id: 4, 
      name: 'El Falı', 
      icon: 'hand-left',
      image: require('../../assets/görseller/el.png'),
      category: 'el',
      price: 49.99,
      description: 'Avucunuzdaki geleceği görün',
      gradient: [colors.info, colors.primaryDark]
    },
    { 
      id: 5, 
      name: 'Yüz Falı', 
      icon: 'emoticon',
      image: require('../../assets/görseller/yüz.png'),
      category: 'yuz',
      price: 49.99,
      description: 'Yüz hatlarınızdan karakter ve kaderinizi öğrenin',
      gradient: [colors.success, colors.primaryDark]
    },
    { 
      id: 6, 
      name: 'Yıldızname', 
      icon: 'star-four-points',
      image: require('../../assets/görseller/yıldızname.png'),
      category: 'yildizname',
      price: 49.99,
      description: 'Yıldızların rehberliğinde geleceğe bakın',
      gradient: [colors.social.google, colors.primary]
    },
    { 
      id: 7, 
      name: 'Rüya Yorumu', 
      icon: 'sleep',
      image: require('../../assets/görseller/rüya.png'),
      category: 'ruya',
      price: 49.99,
      description: 'Rüyalarınızın gizli anlamlarını keşfedin',
      gradient: [colors.primaryLight, colors.primaryDark]
    },
    { 
      id: 8, 
      name: 'Burç Yorumları', 
      icon: 'star-outline',
      image: require('../../assets/görseller/günlükburç.png'),
      category: 'burc',
      price: 0,
      description: 'Günlük, haftalık ve aylık burç yorumlarınızı alın - ÜCRETSİZ!',
      gradient: [colors.success, colors.primary]
    },
  ];



  // Falcı kartına tıklama
  const handleFortuneTellerPress = (teller) => {
    setSelectedTeller(teller);
    setShowTellerModal(true);
  };

  // Fal türüne tıklama
  const handleFortuneTypePress = (fortuneType) => {
    navigation.navigate('NewFortune', { fortuneType });
  };

  // Keşfet sayfasına yönlendir
  const handleExplorePress = () => {
    navigation.navigate('BuyTokens');
  };

  const handleFalScreenPress = () => {
    navigation.navigate('FalScreen');
  };

  // Astroloji analizi sayfasına yönlendir
  const handleAstrologyAnalysisPress = () => {
    navigation.navigate('AstrologyAnalysis');
  };

  // Fal geçmişi sayfasına yönlendir
  const handleFortuneHistoryPress = () => {
    navigation.navigate('FortuneHistory');
  };

  // Arama fonksiyonu
  const handleSearch = (query) => {
    setSearchQuery(query);
    
    if (!query.trim()) {
      setFilteredFortuneTellers(fortuneTellers);
      return;
    }
    
    // Arama filtrelemesi
    const searchLower = query.toLowerCase();
    const filtered = fortuneTellers.filter(teller => 
      teller.name.toLowerCase().includes(searchLower) ||
      (teller.specialties && teller.specialties.some(specialty => 
        specialty.toLowerCase().includes(searchLower)
      ))
    );
    
    setFilteredFortuneTellers(filtered);
  };

  // Arama çubuğuna odaklanma
  const handleSearchFocus = () => {
    setIsSearching(true);
  };

  // Arama çubuğundan çıkma
  const handleSearchBlur = () => {
    setIsSearching(false);
  };

  // Arama temizleme
  const clearSearch = () => {
    setSearchQuery('');
    handleSearch('');
  };



  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      <ScrollView 
        showsVerticalScrollIndicator={false} 
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.light}
            colors={[colors.primary, colors.secondary]}
          />
        }
      >
        {/* Header Bölümü */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.header}
        >
          <View style={styles.headerContent}>
            <View style={styles.headerLeft}>
              <View style={styles.greetingContainer}>
                <Text style={styles.greetingFaded}>Merhaba</Text>
                {firstName ? (
                  <Text style={styles.greetingName} numberOfLines={1} ellipsizeMode="tail">{firstName}!</Text>
                ) : null}
                <Text style={styles.subtitle}>Bugün şansın ne diyor?</Text>
              </View>
            </View>
            <View style={styles.headerRightContainer}>
              {/* Jeton Bilgisi */}
              <View style={styles.tokenContainer}>
                <MaterialCommunityIcons name="diamond" size={16} color={colors.secondary} />
                <Text style={styles.tokenText}>{userTokens}</Text>
                <TouchableOpacity 
                  style={styles.addTokenButton}
                  onPress={() => navigation.navigate('BuyTokens')}
                >
                  <Ionicons name="add" size={12} color="#fff" />
                </TouchableOpacity>
              </View>
              
              {/* Günlük Görevler Simgesi */}
              <TouchableOpacity 
                style={styles.miniTasksIcon}
                activeOpacity={0.7}
                onPress={() => setShowDailyTasksModal(true)}
              >
                <LinearGradient
                  colors={[colors.warning, colors.success, colors.secondary]}
                  style={styles.miniTasksIconGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <Text style={styles.emojiIcon}>🎯</Text>
                  {dailyTasksProgress && (
                    <View style={styles.miniTasksBadge}>
                      <Text style={styles.miniTasksBadgeText}>
                        {dailyTasksProgress.current_level}/3
                      </Text>
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
              
              {/* Profil Butonu */}
              <TouchableOpacity 
                style={styles.profileButton}
                onPress={() => navigation.navigate('Profile')}
              >
                {profileImage ? (
                  <Image 
                    source={{ uri: profileImage }} 
                    style={styles.profileImage} 
                  />
                ) : (
                  <Ionicons name="person" size={18} color={colors.text.light} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Arama ve Logo */}
          <View style={styles.searchRow}>
            <View style={[styles.searchBar, isSearching && styles.searchBarActive]}>
              <Ionicons name="search" size={20} color={searchQuery ? colors.primary : "#666"} />
              <TextInput
                style={styles.searchInput}
                placeholder="Falcı veya fal türü ara..."
                placeholderTextColor="#666"
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={handleSearchFocus}
                onBlur={handleSearchBlur}
                returnKeyType="search"
                autoCapitalize="none"
                autoCorrect={false}
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity onPress={clearSearch} style={styles.clearButton}>
                  <Ionicons name="close-circle" size={18} color="#666" />
                </TouchableOpacity>
              )}
            </View>

            <TouchableOpacity 
              style={styles.notificationButton}
              onPress={() => navigation.navigate('Notifications')}
            >
              <Ionicons name="notifications" size={24} color={colors.text.light} />
              {unreadNotificationCount > 0 && (
                <View style={styles.notificationBadge}>
                  <Text style={styles.notificationBadgeText}>
                    {unreadNotificationCount > 99 ? '99+' : unreadNotificationCount}
                  </Text>
                </View>
              )}
            </TouchableOpacity>
          </View>

          {/* Premium Rozet - Güvenli Alan */}
          <View style={styles.premiumBadgeWrapper}>
          {(premiumStatus.isPremium || premiumStatus.isFreeTrial) && (
            <View style={styles.premiumBadgeContainer}>
              <View style={[
                styles.premiumBadgeMinimal,
                premiumStatus.isFreeTrial && styles.trialBadgeMinimal
              ]}>
                <MaterialCommunityIcons 
                  name={premiumStatus.isFreeTrial ? "diamond" : "crown"} 
                    size={14} 
                  color={premiumStatus.isFreeTrial ? colors.success : colors.secondary} 
                />
                <Text style={[
                  styles.premiumBadgeTextMinimal,
                  premiumStatus.isFreeTrial && styles.trialBadgeTextMinimal
                ]}>
                  {premiumStatus.isFreeTrial ? '3 GÜN DENEME AKTİF' : 'PREMİUM ÜYE'}
                </Text>
              </View>
            </View>
          )}
          </View>
        </LinearGradient>

        {(adminBanners.length > 0 || bannersLoading) && (
          <View style={{ marginTop: 12 }}>
            {bannersLoading ? (
              <View style={styles.bannerLoadingContainer}>
                <View style={styles.bannerLoadingPlaceholder}>
                  <Text style={styles.bannerLoadingText}>Banner'lar yükleniyor...</Text>
                </View>
              </View>
            ) : (
              <>
                <ScrollView
                  horizontal
                  pagingEnabled
                  showsHorizontalScrollIndicator={false}
                  onScroll={(e) => {
                    const x = e.nativeEvent.contentOffset.x;
                    const w = e.nativeEvent.layoutMeasurement.width;
                    const idx = Math.round(x / w);
                    if (idx !== adminBannerIndex) setAdminBannerIndex(idx);
                  }}
                  scrollEventThrottle={16}
                >
                  {adminBanners.map((b) => (
                    <View key={b.id} style={{ width: width, paddingHorizontal: 20 }}>
                      <HomeAdminBanner
                        config={b}
                        onClose={async () => {
                          await homeBannerService.dismiss(b);
                          setAdminBanners((prev) => prev.filter((x) => x.id !== b.id));
                          // Banner listesini yenile (yeni banner'lar varsa göster)
                          setTimeout(() => {
                            if (userId) {
                              fetchAdminBanner();
                            }
                          }, 500);
                        }}
                        onPress={async () => {
                          // Banner tıklandığında impression count'ı artır
                          await homeBannerService.incrementImpression(b);
                          homeBannerService.handleAction(b, navigation);
                        }}
                        styles={{
                          container: { borderRadius: 16, overflow: 'hidden' },
                          gradient: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 16, borderWidth: 1, borderColor: colors.border },
                          contentRow: { flexDirection: 'row', alignItems: 'center' },
                          left: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center', marginRight: 10 },
                          image: { width: 36, height: 36, borderRadius: 18 },
                          center: { flex: 1 },
                          title: { fontSize: 15, fontWeight: 'bold' },
                          subtitle: { fontSize: 12, marginTop: 2 },
                          close: { width: 28, height: 28, alignItems: 'center', justifyContent: 'center' },
                        }}
                      />
                    </View>
                  ))}
                </ScrollView>
                {adminBanners.length > 1 && (
                  <View style={{ flexDirection: 'row', justifyContent: 'center', marginTop: 8 }}>
                    {adminBanners.map((_, i) => (
                      <View
                        key={`dot-${i}`}
                        style={{
                          width: 6,
                          height: 6,
                          borderRadius: 3,
                          marginHorizontal: 4,
                          backgroundColor: i === adminBannerIndex ? colors.secondary : colors.text.tertiary,
                        }}
                      />
                    ))}
                  </View>
                )}
              </>
            )}
          </View>
        )}

        {/* Günlük Giriş Ödülü Modal */}
        <DailyLoginRewardModal
          visible={showDailyLoginModal}
          onClose={() => setShowDailyLoginModal(false)}
          userId={userId}
          onRewardClaimed={(rewardData) => {
            // Ödül alındığında kullanıcı verilerini güncelle
            setUserTokens(rewardData.totalBalance);
          }}
        />



                  {/* Falcı ile Canlı Sohbet Et Butonu */}
          <TouchableOpacity 
            style={styles.fortuneTellerChatButton}
            onPress={() => navigation.navigate('FortuneTellerList')}
          >
            <LinearGradient
              colors={['#8E2DE2', '#4A00E0']}
              style={styles.fortuneTellerChatGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <View style={styles.fortuneTellerChatContent}>
                <View style={styles.fortuneTellerChatLeft}>
                  <View style={styles.fortuneTellerChatIconContainer}>
                    <MaterialCommunityIcons 
                      name="crystal-ball" 
                      size={32} 
                      color={colors.secondary} 
                    />
                    <View style={styles.onlinePulse} />
                  </View>
                  <View style={styles.fortuneTellerChatTextContainer}>
                    <Text style={styles.fortuneTellerChatTitle}>
                      Falcı ile Canlı Sohbet Et
                    </Text>
                    <Text style={styles.fortuneTellerChatSubtitle}>
                      Deneyimli falcılarımızla anında bağlan
                    </Text>
                  </View>
                </View>
                <View style={styles.fortuneTellerChatRight}>
                  <Ionicons name="arrow-forward-circle" size={32} color={colors.secondary} />
                </View>
              </View>
              
              {/* Alt bilgi */}
              <View style={styles.fortuneTellerChatFooter}>
                <View style={styles.fortuneTellerChatBadge}>
                  <MaterialCommunityIcons name="chat-processing" size={14} color={colors.success} />
                  <Text style={styles.fortuneTellerChatBadgeText}>Mesaj başı ücretli</Text>
                </View>
                <View style={styles.fortuneTellerChatBadge}>
                  <MaterialCommunityIcons name="account-group" size={14} color={colors.info} />
                  <Text style={styles.fortuneTellerChatBadgeText}>Müsait falcılar</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Ödüllü Reklam Butonu */}
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
                    size={24} 
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
                  <MaterialCommunityIcons name="diamond" size={18} color="#000000" />
                                <Text style={styles.rewardedAdRewardText}>
                {dailyAdCount >= 10 ? '0/10' : `${dailyAdCount}/10`}
              </Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Günlük Giriş Ödülü Kartı */}
          <TouchableOpacity 
            style={styles.dailyLoginButton}
            onPress={async () => {
              try {
                // Günlük giriş ödülü kontrolü yap
                const result = await dailyLoginService.checkAndRewardDailyLogin(userId);
                if (result.success) {
                  // Ödül alındıysa kullanıcı verilerini güncelle
                  setUserTokens(result.data.totalBalance);
                  // Modal'ı göster
                  setShowDailyLoginModal(true);
                } else {
                  // Bugün zaten ödül alınmışsa sadece modal'ı göster
                  setShowDailyLoginModal(true);
                }
              } catch (error) {
                console.error('Günlük giriş ödülü alınırken hata:', error);
                // Hata olsa bile modal'ı göster
                setShowDailyLoginModal(true);
              }
            }}
          >
            <LinearGradient
              colors={['#4ECDC4', '#44A08D']}
              style={styles.dailyLoginGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <View style={styles.dailyLoginContent}>
                <View style={styles.dailyLoginIcon}>
                  <Text style={styles.dailyLoginEmoji}>🌟</Text>
                </View>
                <View style={styles.dailyLoginTextContainer}>
                  <Text style={styles.dailyLoginTitle}>Günlük Giriş Ödülü</Text>
                  <Text style={styles.dailyLoginSubtitle}>
                    Her gün giriş yap, jeton kazan!
                  </Text>
                </View>
                <View style={styles.dailyLoginReward}>
                  <MaterialCommunityIcons name="diamond" size={18} color="#000000" />
                  <Text style={styles.dailyLoginRewardText}>+1</Text>
                </View>
              </View>
            </LinearGradient>
          </TouchableOpacity>

          {/* Yeni Bir Fal Baktır! */}
          <View style={styles.fortuneTypesSection}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>🔮 Yeni Bir Fal Baktır!</Text>
            </View>
            
            <View style={styles.fortuneTypesGrid}>
              {fortuneTypes.map((fortuneType, index) => (
                <TouchableOpacity
                  key={fortuneType.id}
                  style={styles.fortuneTypeCard}
                  onPress={() => handleFortuneTypePress(fortuneType)}
                >
                  <LinearGradient
                    colors={fortuneType.gradient}
                    style={styles.fortuneTypeGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Image
                      source={fortuneType.image}
                      style={styles.fortuneTypeImage}
                      resizeMode="contain"
                    />
                  </LinearGradient>
                  <Text style={styles.fortuneTypeName}>{fortuneType.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Premium Üyelik Butonu */}
          <TouchableOpacity 
            style={styles.premiumButton}
            onPress={() => navigation.navigate('BuyTokens')}
          >
            <LinearGradient
              colors={[colors.social.google, colors.primary]}
              style={styles.premiumGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
            >
              <Text style={styles.premiumEmoji}>👑</Text>
              <Text style={styles.premiumText}>Premium Üye Ol</Text>
              <Ionicons name="arrow-forward" size={20} color={colors.text.light} />
            </LinearGradient>
          </TouchableOpacity>

          {/* Detaylı Astroloji Analizi */}
          <AstrologyAnalysisCard 
            onPress={handleAstrologyAnalysisPress}
            isPremium={premiumStatus.isPremium || premiumStatus.isFreeTrial}
            trialUsed={astrologyTrialUsed}
          />

          {/* Günün Sözü */}
          <View style={styles.dailyQuoteSection}>
            <Text style={styles.dailyQuoteTitle}>📜 Günün Sözü</Text>
            <Text style={styles.dailyQuoteText}>{todayQuote.text}</Text>
            <Text style={styles.dailyQuoteAuthor}>~ {todayQuote.author}</Text>
          </View>

        {/* Popüler Falcılar */}
        <View style={styles.tellersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>
              {searchQuery ? `"${searchQuery}" için sonuçlar` : '🔝 Popüler Falcılar'}
            </Text>
            <TouchableOpacity onPress={() => setShowAllTellersModal(true)}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Falcılar yükleniyor...</Text>
            </View>
          ) : filteredFortuneTellers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>
                {searchQuery ? `"${searchQuery}" için sonuç bulunamadı` : 'Henüz falcı bulunmuyor'}
              </Text>
              {searchQuery && (
                <TouchableOpacity 
                  style={styles.clearSearchButton}
                  onPress={clearSearch}
                >
                  <Text style={styles.clearSearchText}>Aramayı Temizle</Text>
                </TouchableOpacity>
              )}
            </View>
          ) : (
            filteredFortuneTellers.slice(0, 4).map((teller) => (
              <TouchableOpacity 
                key={teller.id} 
                style={styles.tellerCard}
                onPress={() => handleFortuneTellerPress(teller)}
              >
                <Image 
                  source={{ 
                    uri: teller.profile_image || 'https://via.placeholder.com/60x60?text=👤' 
                  }} 
                  style={styles.tellerImage} 
                />
                <View style={styles.tellerInfo}>
                  <View style={styles.tellerNameRow}>
                    <Text style={styles.tellerName}>{teller.name}</Text>
                    <View style={[
                      styles.availabilityIndicator, 
                      { backgroundColor: getAvailabilityColor(teller.is_available) }
                    ]}>
                      <Text style={styles.availabilityText}>
                        {getAvailabilityText(teller.is_available)}
                      </Text>
                    </View>
                  </View>
                  
                  <Text style={styles.tellerSpecialty}>
                    {teller.specialties?.[0] || 'Genel'} • {teller.experience_years} yıl
                  </Text>
                  
                  <View style={styles.tellerStatsRow}>
                    <View style={styles.ratingContainer}>
                      <Ionicons name="star" size={16} color={colors.warning} />
                      <Text style={styles.ratingText}>{teller.rating.toFixed(1)}</Text>
                      <Text style={styles.reviewsText}>({teller.total_readings})</Text>
                    </View>
                    <Text style={styles.priceText}>
                      <MaterialCommunityIcons name="diamond" size={16} color={colors.secondary} /> {teller.price_per_fortune}
                    </Text>
                  </View>
                </View>
                
                {/* Sohbet butonu kaldırıldı */}
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Günlük Görevler Modal'ı */}
      <Modal
        visible={showDailyTasksModal}
        animationType="slide"
        onRequestClose={() => setShowDailyTasksModal(false)}
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Günlük Görevler</Text>
              <TouchableOpacity 
                onPress={() => setShowDailyTasksModal(false)}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text.primary} />
              </TouchableOpacity>
            </View>
            
            {userId && (
              <DailyTasksCard 
                userId={userId}
                isModal={true}
                onTokensEarned={(tokenAmount) => {
                  // Token kazanıldığında kullanıcı bakiyesini güncelle
                  setUserTokens(prev => prev + tokenAmount);
                  // Günlük görev durumunu yenile
                  fetchDailyTasksProgress();
                }}
              />
            )}
          </View>
        </View>
      </Modal>

      {/* Tüm Falcılar Modalı */}
      <Modal
        visible={showAllTellersModal}
        animationType="slide"
        onRequestClose={() => setShowAllTellersModal(false)}
        transparent={true}
      >
        <View style={styles.modalContainer}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Tüm Falcılar</Text>
            <ScrollView>
              {filteredFortuneTellers.map((teller) => (
                <View key={teller.id} style={styles.modalTellerRow}>
                  <Image
                    source={{ uri: teller.profile_image || 'https://via.placeholder.com/60x60?text=👤' }}
                    style={styles.modalTellerImage}
                  />
                  <View style={styles.modalTellerInfo}>
                    <Text style={styles.modalTellerName}>{teller.name}</Text>
                    <Text style={styles.modalTellerSpecialty}>{teller.specialties?.[0] || 'Genel'} • {teller.experience_years} yıl</Text>
                    <View style={styles.modalTellerStats}>
                      <Ionicons name="star" size={14} color={colors.warning} />
                      <Text style={styles.modalTellerRating}>{teller.rating.toFixed(1)}</Text>
                      <Text style={styles.modalTellerReviews}>({teller.total_readings})</Text>
                    </View>
                  </View>
                </View>
              ))}
            </ScrollView>
            <TouchableOpacity onPress={() => setShowAllTellersModal(false)} style={styles.modalCloseButton}>
              <Text style={styles.modalCloseButtonText}>Kapat</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Falcı Detay Modalı */}
      <Modal
        visible={showTellerModal}
        animationType="fade"
        transparent={true}
        onRequestClose={() => setShowTellerModal(false)}
      >
        <View style={styles.tellerModalContainer}>
          <View style={styles.tellerModalContent}>
            {selectedTeller && (
              <>
                <View style={styles.tellerModalHeader}>
                  <Image 
                    source={{ 
                      uri: selectedTeller.profile_image || 'https://via.placeholder.com/60x60?text=👤' 
                    }} 
                    style={styles.tellerModalImage} 
                  />
                  <View style={styles.tellerModalHeaderInfo}>
                    <Text style={styles.tellerModalName}>{selectedTeller.name}</Text>
                    <View style={[
                      styles.availabilityIndicator, 
                      { backgroundColor: getAvailabilityColor(selectedTeller.is_available) }
                    ]}>
                      <Text style={styles.availabilityText}>
                        {getAvailabilityText(selectedTeller.is_available)}
                      </Text>
                    </View>
                  </View>
                </View>

                <View style={styles.tellerModalStats}>
                  <View style={styles.tellerModalStatItem}>
                    <Ionicons name="star" size={20} color={colors.warning} />
                    <Text style={styles.tellerModalStatValue}>{selectedTeller.rating.toFixed(1)}</Text>
                    <Text style={styles.tellerModalStatLabel}>Puan</Text>
                  </View>
                  <View style={styles.tellerModalStatItem}>
                    <Ionicons name="book" size={20} color={colors.info} />
                    <Text style={styles.tellerModalStatValue}>{selectedTeller.total_readings}</Text>
                    <Text style={styles.tellerModalStatLabel}>Fal</Text>
                  </View>
                  <View style={styles.tellerModalStatItem}>
                    <Ionicons name="time" size={20} color={colors.success} />
                    <Text style={styles.tellerModalStatValue}>{selectedTeller.experience_years}</Text>
                    <Text style={styles.tellerModalStatLabel}>Yıl</Text>
                  </View>
                </View>

                <View style={styles.tellerModalSpecialties}>
                  <Text style={styles.tellerModalSectionTitle}>Uzmanlık Alanları</Text>
                  <View style={styles.tellerModalTags}>
                    {selectedTeller.specialties?.map((specialty, index) => (
                      <View key={index} style={styles.tellerModalTag}>
                        <Text style={styles.tellerModalTagText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>

                <View style={styles.tellerModalActions}>
                  <TouchableOpacity 
                    style={styles.tellerModalActionButton}
                    onPress={() => {
                      setShowTellerModal(false);
                      navigation.navigate('NewFortune', { 
                        fortuneType: { 
                          id: 1, 
                          name: selectedTeller.specialties?.[0] || 'Kahve Falı' 
                        } 
                      });
                    }}
                  >
                    <LinearGradient
                      colors={[colors.primary, colors.primaryDark]}
                      style={styles.tellerModalActionGradient}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 1 }}
                    >
                      <Text style={styles.tellerModalActionText}>Fal Baktır ({selectedTeller.price_per_fortune} Jeton)</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity 
                  style={styles.tellerModalCloseButton}
                  onPress={() => setShowTellerModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text.light} />
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  // Premium rozet stilleri - güvenli alan
  premiumBadgeWrapper: {
    minHeight: 50, // Sabit yükseklik - rozet olsun ya da olmasın
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 8,
  },
  premiumBadgeContainer: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadgeMinimal: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  premiumBadgeTextMinimal: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.secondary,
    marginLeft: 5,
  },
  trialBadgeMinimal: {
    backgroundColor: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'rgba(34, 197, 94, 0.3)',
  },
  trialBadgeTextMinimal: {
    color: colors.success,
  },
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 0,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start', // Üstten hizala
    marginBottom: 20,
    minHeight: 70, // Minimum yükseklik
  },
  headerLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-start',
    maxWidth: '60%', // Sol taraf maksimum genişlik
  },
  greetingContainer: {
    flex: 1,
    maxWidth: '100%',
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexShrink: 0, // Küçülmeyi engelle
    minWidth: 140, // Minimum genişlik
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 18,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    minWidth: 60, // Minimum genişlik
  },
  tokenText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 13,
    marginLeft: 4,
    marginRight: 4,
    minWidth: 20, // Minimum genişlik
    textAlign: 'center',
  },
  addTokenButton: {
    backgroundColor: colors.success,
    width: 18,
    height: 18,
    borderRadius: 9,
    alignItems: 'center',
    justifyContent: 'center',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginRight: 8,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  trialBadge: {
    backgroundColor: 'rgba(34, 197, 94, 0.2)',
    borderColor: colors.success,
  },
  premiumBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.secondary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  trialBadgeText: {
    color: colors.success,
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  greetingFaded: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.tertiary,
    opacity: 0.7,
    marginBottom: 0,
  },
  greetingName: {
    fontSize: 26,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
    maxWidth: '100%', // Container genişliğine göre ayarla
    flexShrink: 1, // Gerekirse küçül
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  profileButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.secondary,
    marginLeft: 8,
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    resizeMode: 'cover',
  },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 25,
    paddingHorizontal: 15,
    paddingVertical: 5, // Yüksekliği azaltmak için padding'i düşürdüm
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchBarActive: {
    borderColor: colors.primary,
    borderWidth: 2,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: colors.text.light,
    marginLeft: 10,
  },
  clearButton: {
    padding: 5,
  },
  searchText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  notificationButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: colors.secondary,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 6,
    borderWidth: 2,
    borderColor: colors.primary,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 5,
  },
  notificationBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000000',
    textAlign: 'center',
    includeFontPadding: false,
    textAlignVertical: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  seeAllText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
  },
  premiumButton: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  premiumGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  premiumEmoji: {
    fontSize: 24,
    marginRight: 10,
  },
  premiumText: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  rewardedAdButton: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 25,
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
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  rewardedAdContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  rewardedAdIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  rewardedAdTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  rewardedAdTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  rewardedAdSubtitle: {
    fontSize: 13,
    color: '#000000',
    opacity: 0.9,
  },
  rewardedAdReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  rewardedAdRewardText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 4,
  },
  dailyLoginButton: {
    marginHorizontal: 20,
    marginVertical: 8,
    borderRadius: 25,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  dailyLoginGradient: {
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  dailyLoginContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  dailyLoginIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dailyLoginEmoji: {
    fontSize: 20,
  },
  dailyLoginTextContainer: {
    flex: 1,
    marginLeft: 15,
  },
  dailyLoginTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#000000',
    marginBottom: 2,
  },
  dailyLoginSubtitle: {
    fontSize: 13,
    color: '#000000',
    opacity: 0.9,
  },
  dailyLoginReward: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  dailyLoginRewardText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#000000',
    marginLeft: 4,
  },
  dailyQuoteSection: {
    marginHorizontal: 20,
    marginTop: 20,
    marginBottom: 20,
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  dailyQuoteTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 10,
    textAlign: 'center',
  },
  dailyQuoteText: {
    fontSize: 15,
    color: colors.text.light,
    fontStyle: 'italic',
    lineHeight: 22,
    textAlign: 'center',
    marginBottom: 8,
  },
  dailyQuoteAuthor: {
    fontSize: 13,
    color: colors.text.secondary,
    textAlign: 'right',
    fontStyle: 'italic',
  },
  fortuneTypesSection: {
    marginTop: 15,
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  fortuneTypesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    paddingTop: 10,
  },
  fortuneTypeCard: {
    width: '22%', // 4 sütun için (8 fal türü)
    marginBottom: 20,
    alignItems: 'center',
  },
  fortuneTypeGradient: {
    width: (width - 80) / 3,
    height: (width - 80) / 3,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 32,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  fortuneTypeImage: {
    width: '100%',
    height: '100%',
    borderRadius: 32,
    overflow: 'hidden',
    resizeMode: 'cover',
  },
  fortuneTypeName: {
    fontSize: 13,
    fontWeight: '600',
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 16,
  },
  tellersSection: {
    marginVertical: 10,
    paddingBottom: 90, // Bottom menu için alan bırak
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  clearSearchButton: {
    marginTop: 10,
    paddingVertical: 8,
    paddingHorizontal: 15,
    backgroundColor: colors.card,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  clearSearchText: {
    fontSize: 14,
    color: colors.secondary,
    fontWeight: '500',
  },
  tellerCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginHorizontal: 20,
    marginBottom: 15,
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 6,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tellerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 15,
    borderWidth: 2,
    borderColor: colors.primary,
  },
  tellerInfo: {
    flex: 1,
  },
  tellerNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  tellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  availabilityIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  availabilityText: {
    fontSize: 10,
    color: colors.text.light,
    fontWeight: 'bold',
  },
  tellerSpecialty: {
    fontSize: 13,
    color: colors.text.secondary,
    marginBottom: 8,
  },
  tellerStatsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: 14,
    color: colors.text.light,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  reviewsText: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginLeft: 2,
  },
  priceText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  messageButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    overflow: 'hidden',
  },
  messageButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    margin: 20,
    borderRadius: 20,
    padding: 20,
    maxHeight: '80%',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
    color: colors.text.primary,
    textAlign: 'center',
  },
  modalCloseButton: {
    marginTop: 15,
    alignSelf: 'center',
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingVertical: 8,
    paddingHorizontal: 30,
  },
  modalCloseButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  modalTellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  modalTellerImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
    marginRight: 12,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  modalTellerInfo: {
    flex: 1,
  },
  modalTellerName: {
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalTellerSpecialty: {
    color: colors.text.secondary,
    fontSize: 13,
  },
  modalTellerStats: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  modalTellerRating: {
    marginLeft: 3,
    color: colors.text.primary,
    fontSize: 13,
  },
  modalTellerReviews: {
    marginLeft: 5,
    color: colors.text.tertiary,
    fontSize: 12,
  },
  tellerModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  tellerModalContent: {
    backgroundColor: colors.card,
    width: '85%',
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tellerModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  tellerModalImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  tellerModalHeaderInfo: {
    marginLeft: 15,
    flex: 1,
  },
  tellerModalName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  tellerModalStats: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
    paddingVertical: 15,
    borderTopWidth: 1,
    borderBottomWidth: 1,
    borderColor: colors.border,
  },
  tellerModalStatItem: {
    alignItems: 'center',
  },
  tellerModalStatValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 5,
  },
  tellerModalStatLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tellerModalSpecialties: {
    marginBottom: 20,
  },
  tellerModalSectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 10,
  },
  tellerModalTags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  tellerModalTag: {
    backgroundColor: colors.primaryLight,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  tellerModalTagText: {
    color: colors.text.light,
    fontSize: 13,
  },
  tellerModalActions: {
    marginTop: 10,
  },
  tellerModalActionButton: {
    overflow: 'hidden',
    borderRadius: 15,
  },
  tellerModalActionGradient: {
    paddingVertical: 12,
    alignItems: 'center',
  },
  tellerModalActionText: {
    color: colors.text.light,
    fontSize: 16,
    fontWeight: 'bold',
  },
  tellerModalCloseButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.primaryDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  miniTasksIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 6,
    marginRight: 8,
  },
  miniTasksIconGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    padding: 0, // Tüm padding'leri kaldır
  },
  miniTasksBadge: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.error,
    borderRadius: 8,
    minWidth: 16,
    height: 16,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 3,
    borderWidth: 1.5,
    borderColor: colors.card,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  miniTasksBadgeText: {
    fontSize: 8,
    fontWeight: 'bold',
    color: colors.text.light,
    textShadowColor: 'rgba(0, 0, 0, 0.5)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 1,
  },
  emojiIcon: {
    fontSize: 38.5, // Tam daire boyutunda
    textAlign: 'center',
    lineHeight: 36, // Daire yüksekliği ile aynı
    includeFontPadding: false, // Android için padding'i kaldır
    textAlignVertical: 'center', // Android için dikey ortalama
    width: 36, // Daire genişliği ile aynı
    height: 36, // Daire yüksekliği ile aynı
  },
  // Banner loading stilleri
  bannerLoadingContainer: {
    paddingHorizontal: 20,
  },
  bannerLoadingPlaceholder: {
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 80,
  },
  bannerLoadingText: {
    fontSize: 14,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  // Modal stilleri
  modalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 0,
    margin: 20,
    maxHeight: '80%',
    width: '90%',
    borderWidth: 1,
    borderColor: colors.border,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  modalCloseButton: {
    padding: 5,
  },
  // Falcı Sohbet Butonu Stilleri
  fortuneTellerChatButton: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  fortuneTellerChatGradient: {
    padding: 20,
    borderRadius: 20,
  },
  fortuneTellerChatContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  fortuneTellerChatLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  fortuneTellerChatIconContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  onlinePulse: {
    position: 'absolute',
    top: 2,
    right: 2,
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: '#8E2DE2',
  },
  fortuneTellerChatTextContainer: {
    flex: 1,
  },
  fortuneTellerChatTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 4,
  },
  fortuneTellerChatSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  fortuneTellerChatRight: {
    marginLeft: 10,
  },
  fortuneTellerChatFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.2)',
  },
  fortuneTellerChatBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  fortuneTellerChatBadgeText: {
    fontSize: 12,
    color: colors.text.secondary,
    fontWeight: '500',
  },
});

export default HomeScreen; 