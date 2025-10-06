import React, { useEffect, useState, useCallback } from 'react';
import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  StatusBar, 
  ActivityIndicator,
  RefreshControl,
  Platform,
  Linking,
  StyleSheet
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import { useFocusEffect } from '@react-navigation/native';
import DailyLoginStatusCard from '../components/DailyLoginStatusCard';
import DailyLoginRewardModal from '../components/DailyLoginRewardModal';
import dailyLoginService from '../services/dailyLoginService';
import PremiumTrialCard from '../components/PremiumTrialCard';
import { checkUserSubscriptionWithTrial } from '../services/supabaseService';
import { TrialService } from '../services/trialService';
import BadgeModal from '../components/BadgeModal';
import badgeService from '../services/badgeService';

const ProfileScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);

  
  const [stats, setStats] = useState({
    tokens: 0,
    fortuneCount: 0,
    favoriteCount: 0
  });
  const [subscriptionType, setSubscriptionType] = useState('free');
  const [showDailyLoginModal, setShowDailyLoginModal] = useState(false);
  const [userBadges, setUserBadges] = useState([]);
  const [showBadgeModal, setShowBadgeModal] = useState(false);
  const [earnedBadge, setEarnedBadge] = useState(null);

  // Kullanıcı verilerini Supabase'den al
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı oturumu kontrolü
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setLoading(false);
        return;
      }
      
      // Kullanıcı profil bilgilerini getir
      const { data: profile, error } = await supabase
        .from('users')
        .select('id, email, first_name, last_name, full_name, birth_date, birth_place, profile_image, zodiac_sign, rising_sign, gender, marital_status, favorite_fortune_teller, token_balance, is_admin, is_premium, subscription_type, subscription_end_date, subscription_auto_renew, created_at, updated_at')
        .eq('id', authUser.id)
        .single();
      
      if (error) {
        console.error('Profil bilgileri getirilemedi:', error);
      }

      // Hata olsa bile mevcut verileri kullan, yoksa auth verilerini kullan
      const userData = profile || {
        id: authUser.id,
        email: authUser.email,
        first_name: authUser.user_metadata?.first_name || '',
        last_name: authUser.user_metadata?.last_name || '',
        full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
        profile_image: authUser.user_metadata?.avatar_url || null,
        token_balance: 0,
        is_admin: false
      };
      
      // Kullanıcının fal sayısını getir
      const { count: fortuneCount, error: fortuneError } = await supabase
        .from('fortunes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);
      
      // Kullanıcının favori sayısını getir (eğer favorites tablosu varsa)
      let favoriteCount = 0;
      try {
        const { count, error: favoriteError } = await supabase
          .from('favorites')
          .select('*', { count: 'exact', head: true })
          .eq('user_id', authUser.id);
        favoriteCount = count || 0;
      } catch (error) {
        // Favorites tablosu yoksa 0 olarak ayarla
        favoriteCount = 0;
      }
      
      // Kullanıcı verileri ve istatistiklerini ayarla
      setUserData(userData);
      setSubscriptionType(userData?.subscription_type || 'free');
      setStats({
        tokens: userData?.token_balance || 0,
        fortuneCount: fortuneCount || 0,
        favoriteCount: favoriteCount || 0
      });
      
      // Günlük giriş durumunu da kontrol et (arka planda)
      if (authUser?.id) {
        dailyLoginService.getCurrentStatus(authUser.id).catch(error => {
          console.error('Günlük giriş durumu kontrol edilirken hata:', error);
        });
      }
      
      // Kullanıcının rozetlerini getir
      if (authUser?.id) {
        const badgesResult = await badgeService.getUserBadges(authUser.id);
        if (badgesResult.success) {
          setUserBadges(badgesResult.data);
        }
      }
      
    } catch (error) {
      console.error('Veri çekerken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };



  // Edit ekranından gelen güncellemeleri kontrol et
  const checkForProfileUpdates = () => {
    // Route params'dan güncellenmiş veri kontrolü
    if (route.params?.updatedUserData && route.params?.profileUpdated) {
      // Kullanıcı verilerini güncelle
      setUserData(prevData => ({
        ...prevData,
        ...route.params.updatedUserData
      }));
      
      // Route params'ı temizle (çift güncelleme olmaması için)
      navigation.setParams({ profileUpdated: false, updatedUserData: null });
    }
  };

  // Sayfa yüklendiğinde verileri al
  useEffect(() => {
    fetchUserData();
  }, []);
  
  // Eğer userData yoksa ve AuthContext'ten user varsa, onu kullan
  useEffect(() => {
    if (!userData && user?.profile) {
      setUserData(user.profile);
    }
  }, [userData, user]);

  // Sayfa odaklandığında güncellemeleri kontrol et
  useFocusEffect(
    useCallback(() => {
      checkForProfileUpdates();
    }, [route.params])
  );

  // Sayfayı yenile
  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      // Önce günlük giriş ödülü kontrolü yap
      if (user?.id) {
        const dailyLoginResult = await dailyLoginService.checkAndRewardDailyLogin(user.id);
        if (dailyLoginResult.success) {
          // Ödül alındıysa modal'ı göster
          setShowDailyLoginModal(true);
          
          // Rozet kazanıldıysa rozet modalını göster
          if (dailyLoginResult.badge) {
            setEarnedBadge(dailyLoginResult.badge);
            setShowBadgeModal(true);
          }
        }
      }
      
      // Sonra tüm verileri yenile
      await fetchUserData();
    } catch (error) {
      console.error('Yenileme sırasında hata:', error);
    } finally {
      setRefreshing(false);
    }
  };

  // Çıkış yapma işlemi
  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel"
        },
        { 
          text: "Çıkış Yap", 
          onPress: async () => {
            setLoading(true);
            const { error } = await logout();
            if (!error) {
              // Başarılı çıkış durumunda giriş ekranına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } else {
              setLoading(false);
              Alert.alert("Hata", "Çıkış yapılırken bir hata oluştu.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Menu items
  const menuItems = [
    { 
      id: 1, 
      title: 'Hesap Bilgileri', 
      icon: 'person-circle', 
      iconType: 'ionicons',
      color: '#3498db',
      onPress: () => navigation.navigate('AccountSettings')
    },
    { 
      id: 2, 
      title: 'Fal Geçmişim', 
      icon: 'history', 
      iconType: 'fontawesome',
      color: '#9b59b6',
      onPress: () => navigation.navigate('FalScreen')
    },
    { 
      id: 3, 
      title: 'Arkadaş Davet Et', 
      icon: 'person-add', 
      iconType: 'ionicons',
      color: colors.secondary,
      onPress: () => navigation.navigate('ReferralInvite')
    },
    { 
      id: 4, 
      title: 'Jeton Satın Al', 
      icon: 'diamond', 
      iconType: 'ionicons',
      color: '#f39c12',
      onPress: () => navigation.navigate('BuyTokens')
    },
    { 
      id: 5, 
      title: 'Uygulama Tanıtımı', 
      icon: 'play-circle', 
      iconType: 'ionicons',
      color: '#e74c3c',
      onPress: () => navigation.navigate('Onboarding')
    },
    { 
      id: 6, 
      title: 'Bildirimler', 
      icon: 'notifications', 
      iconType: 'ionicons',
      color: '#f39c12',
      onPress: () => navigation.navigate('Notifications')
    },
    { 
      id: 7, 
      title: 'Yardım ve Destek', 
      icon: 'help-circle', 
      iconType: 'ionicons',
      color: '#3498db',
      onPress: () => navigation.navigate('Support')
    },
  ];

  // Admin menü öğesi (sadece admin kullanıcılar için)
  const adminMenuItem = {
    id: 999,
    title: 'Admin Paneli',
    icon: 'shield-checkmark',
    iconType: 'ionicons',
    color: '#e74c3c',
    onPress: () => navigation.navigate('AdminPanel')
  };

  // Final menu items (admin ise admin paneli eklenir)
  const finalMenuItems = userData?.is_admin ? [...menuItems, adminMenuItem] : menuItems;

  // Hesap türü için renk ve metin
  const getSubscriptionInfo = (type) => {
    switch (type) {
      case 'standart':
        return { text: 'Standart Üye', color: colors.success, bgColor: 'rgba(11, 230, 102, 0.15)' };
      case 'premium':
        return { text: 'Premium Üye', color: colors.gold, bgColor: 'rgba(255, 217, 0, 0.74)' };
      case 'free':
      default:
        return { text: 'Ücretsiz Üye', color: colors.info, bgColor: 'rgba(16, 135, 214, 0.15)' };
    }
  };

  // İkon render fonksiyonu
  const renderIcon = (item) => {
    if (item.iconType === 'fontawesome') {
      return <FontAwesome5 name={item.icon} size={20} color="#fff" />;
    }
    if (item.iconType === 'material') {
      return <MaterialIcons name={item.icon} size={20} color="#fff" />;
    }
    return <Ionicons name={item.icon} size={20} color="#fff" />;
  };

  // Yükleniyor durumu
  if (loading && !userData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Profil yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.light}
            colors={[colors.primary, colors.secondary]}
          />
        }
      >
        {/* Profil Üst Bölüm */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 50,
            paddingBottom: 20,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            {/* Profil Fotoğrafı */}
            <View style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 5,
            }}>
              {userData?.profile_image ? (
                <Image
                  source={{ uri: userData.profile_image }}
                  style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    borderWidth: 2,
                    borderColor: colors.secondary,
                  }}
                />
              ) : (
                <View style={{
                  width: 100,
                  height: 100,
                  borderRadius: 50,
                  backgroundColor: colors.primary,
                  justifyContent: 'center',
                  alignItems: 'center',
                  borderWidth: 2,
                  borderColor: colors.secondary,
                }}>
                  <Ionicons name="person" size={50} color={colors.text.light} />
                </View>
              )}
            </View>

            {/* Kullanıcı Bilgileri */}
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.light, marginTop: 15 }}>
              {userData?.full_name || 'İsimsiz Kullanıcı'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 5 }}>
              {userData?.email || 'E-posta yok'}
            </Text>

            {/* Hesap Türü */}
            <View style={{
              marginTop: 10,
              paddingHorizontal: 15,
              paddingVertical: 6,
              borderRadius: 20,
              backgroundColor: getSubscriptionInfo(subscriptionType).bgColor,
              borderWidth: 1,
              borderColor: getSubscriptionInfo(subscriptionType).color,
            }}>
              <Text style={{
                fontSize: 12,
                fontWeight: 'bold',
                color: getSubscriptionInfo(subscriptionType).color,
                textAlign: 'center',
              }}>
                {getSubscriptionInfo(subscriptionType).text}
              </Text>
            </View>

            {/* Üyelik Tarihi */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Ionicons name="calendar" size={14} color={colors.text.secondary} />
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 5 }}>
                Üyelik: {new Date(userData?.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>

            {/* Doğum Tarihi */}
            {userData?.birth_date && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Ionicons name="gift" size={14} color={colors.text.secondary} />
                <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 5 }}>
                  Doğum: {new Date(userData?.birth_date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            )}

            {/* İstatistikler */}
            <View style={{ 
              flexDirection: 'row', 
              marginTop: 20, 
              width: '90%', 
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 15,
              padding: 15,
            }}>
              {/* Jeton */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <MaterialCommunityIcons name="diamond" size={22} color={colors.secondary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.light }}>{stats.tokens}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Jeton</Text>
              </View>

              {/* Ayraç */}
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />

              {/* Fal Sayısı */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <MaterialCommunityIcons name="coffee" size={22} color="#e74c3c" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.light }}>{stats.fortuneCount}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Fal</Text>
              </View>

              {/* Ayraç */}
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />

              {/* Rozet Sayısı */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <Ionicons name="trophy" size={22} color={colors.secondary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.light }}>{userBadges.length}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Rozet</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Rozetler Bölümü */}
        {userBadges.length > 0 && (
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 15,
            marginHorizontal: 20,
            marginTop: 20,
            padding: 15,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 15 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                <Ionicons name="trophy" size={20} color={colors.secondary} />
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginLeft: 8 }}>
                  Kazanılan Rozetler
                </Text>
              </View>
              <View style={{
                backgroundColor: colors.secondary,
                paddingHorizontal: 10,
                paddingVertical: 4,
                borderRadius: 12,
              }}>
                <Text style={{ fontSize: 12, fontWeight: 'bold', color: colors.text.dark }}>
                  {userBadges.length}/3
                </Text>
              </View>
            </View>

            {/* Rozetler Grid */}
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-start' }}>
              {userBadges.map((badge, index) => (
                <View key={badge.id || index} style={{
                  width: '30%',
                  marginRight: '3.33%',
                  marginBottom: 15,
                  alignItems: 'center',
                }}>
                  <View style={{
                    width: 70,
                    height: 70,
                    borderRadius: 35,
                    backgroundColor: badge.color || colors.primary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    shadowColor: badge.color || colors.primary,
                    shadowOffset: { width: 0, height: 3 },
                    shadowOpacity: 0.4,
                    shadowRadius: 5,
                    elevation: 5,
                    marginBottom: 8,
                  }}>
                    <Ionicons name={badge.iconName || 'star'} size={36} color="#fff" />
                  </View>
                  <Text style={{
                    fontSize: 11,
                    color: colors.text.primary,
                    textAlign: 'center',
                    fontWeight: '600',
                  }} numberOfLines={2}>
                    {badge.name}
                  </Text>
                  <Text style={{
                    fontSize: 9,
                    color: colors.text.tertiary,
                    textAlign: 'center',
                    marginTop: 2,
                  }}>
                    {new Date(badge.earned_at).toLocaleDateString('tr-TR')}
                  </Text>
                </View>
              ))}
            </View>
          </View>
        )}

        {/* Günlük Giriş Ödülü Kartı */}
        <DailyLoginStatusCard
          userId={user?.id}
          onClaimReward={async () => {
            try {
              // Önce günlük giriş ödülü kontrolü yap
              const result = await dailyLoginService.checkAndRewardDailyLogin(user.id);
              if (result.success) {
                // Ödül alındıysa kullanıcı verilerini güncelle
                setUserData(prevData => ({
                  ...prevData,
                  token_balance: result.data.totalBalance
                }));
                setStats(prevStats => ({
                  ...prevStats,
                  tokens: result.data.totalBalance
                }));

                // Rozet kazanıldıysa rozet modalını göster
                if (result.badge) {
                  setEarnedBadge(result.badge);
                  setShowBadgeModal(true);
                }
              }
              // Modal'ı göster
              setShowDailyLoginModal(true);
            } catch (error) {
              console.error('Günlük giriş ödülü alınırken hata:', error);
              // Hata olsa bile modal'ı göster
              setShowDailyLoginModal(true);
            }
          }}
        />

        {/* Premium Üyelik Deneme Kartı */}
        <PremiumTrialCard
          isVisible={!userData?.is_premium && subscriptionType === 'free'}
          onTrialStarted={async (result) => {
            // Deneme başladığında profil verilerini yenile
            await fetchUserData();
          }}
          onTrialExpired={async () => {
            // Deneme bittiğinde profil verilerini yenile
            await fetchUserData();
            Alert.alert(
              'Deneme Süresi Sona Erdi',
              'Ücretsiz deneme süreniz sona erdi. Premium özelliklerden yararlanmaya devam etmek için mağazayı ziyaret edebilirsiniz.',
              [
                { text: 'Tamam', style: 'cancel' },
                { text: 'Mağaza', onPress: () => navigation.navigate('TokenStore') }
              ]
            );
          }}
          onLearnMore={() => {
            // Premium özellikler hakkında detay bilgi
            Alert.alert(
              "Premium Özellikler",
              "• Sınırsız fal baktır\n• Öncelikli falcı seçimi\n• Günlük bonus jetonlar\n• Reklamsız deneyim\n• Özel falcılar\n• Hızlı yanıt süreleri",
              [{ text: "Anladım" }]
            );
          }}
        />

        {/* Günlük Giriş Ödülü Modal */}
        <DailyLoginRewardModal
          visible={showDailyLoginModal}
          onClose={() => setShowDailyLoginModal(false)}
          userId={user?.id}
          onRewardClaimed={(rewardData) => {
            // Ödül alındığında kullanıcı verilerini güncelle
            setUserData(prevData => ({
              ...prevData,
              token_balance: rewardData.totalBalance
            }));
            setStats(prevStats => ({
              ...prevStats,
              tokens: rewardData.totalBalance
            }));
          }}
        />

        {/* Rozet Kazanma Modal */}
        <BadgeModal
          visible={showBadgeModal}
          badge={earnedBadge}
          onClose={() => {
            setShowBadgeModal(false);
            setEarnedBadge(null);
            // Rozetleri yenile
            fetchUserData();
          }}
        />

        {/* Hızlı Erişim */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginHorizontal: 20,
          marginTop: -25,
          backgroundColor: colors.card,
          borderRadius: 15,
          padding: 15,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('BuyTokens')}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="diamond" size={24} color={colors.text.light} />
            </LinearGradient>
            <Text style={{ fontSize: 12, color: colors.text.primary }}>Jeton Al</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('FalScreen')}>
            <LinearGradient
              colors={[colors.secondary, colors.primary]}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="cafe" size={24} color={colors.text.light} />
            </LinearGradient>
            <Text style={{ fontSize: 12, color: colors.text.primary }}>Fal Baktır</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('BuyTokens')}>
            <LinearGradient
              colors={['#e74c3c', '#c0392b']}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="gift" size={24} color={colors.text.light} />
            </LinearGradient>
            <Text style={{ fontSize: 12, color: colors.text.primary }}>Promosyon</Text>
          </TouchableOpacity>
        </View>

        {/* Kişisel Bilgiler Kartı */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 15,
          margin: 20,
          marginTop: 25,
          padding: 15,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 5,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>Kişisel Bilgiler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Text style={{ fontSize: 14, color: colors.secondary }}>Düzenle</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              {/* Sol Sütun */}
              {/* Burç */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#9b59b6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name={userData?.zodiac_sign ? 'star' : 'star-outline'} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Burç</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.zodiac_sign || '-'}</Text>
                </View>
              </View>

              {/* Cinsiyet */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e74c3c',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name={userData?.gender === 'Erkek' ? 'male' : (userData?.gender === 'Kadın' ? 'female' : 'male-female')} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Cinsiyet</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.gender || '-'}</Text>
                </View>
              </View>

              {/* Doğum Yeri */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#f39c12',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name="location" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Doğum Yeri</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>
                    {userData?.birth_place || '-'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ width: '48%' }}>
              {/* Sağ Sütun */}
              {/* Yükselen */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#3498db',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name={userData?.zodiac_sign ? 'star' : 'star-outline'} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Yükselen</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.rising_sign || '-'}</Text>
                </View>
              </View>

              {/* Medeni Durum */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#2ecc71',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <MaterialIcons name="favorite" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Medeni Durum</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.marital_status || '-'}</Text>
                </View>
              </View>
              
              {/* Favori Falcı */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#8e44ad',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <MaterialCommunityIcons name="crystal-ball" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Favori Falcı</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }} numberOfLines={1} ellipsizeMode="tail">
                    {userData?.favorite_fortune_teller || '-'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Menü */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 15,
          margin: 20,
          marginTop: 10,
          padding: 10,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 5,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
                          {finalMenuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 15,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
              onPress={item.onPress}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: item.color,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 15,
              }}>
                {renderIcon(item)}
              </View>
              <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
                <Text style={{ fontSize: 16, color: colors.text.primary }}>{item.title}</Text>
                {item.id === 3 && (
                  <View style={styles.jetonBadge}>
                    <MaterialCommunityIcons name="diamond" size={10} color="#fff" />
                    <Text style={styles.jetonBadgeText}>Jeton Kazan</Text>
                  </View>
                )}
              </View>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Gizlilik Politikası Kısmı */}
        <TouchableOpacity
          style={{
            backgroundColor: colors.card,
            borderRadius: 12,
            marginHorizontal: 20,
            padding: 14,
            flexDirection: 'row',
            alignItems: 'center',
            justifyContent: 'center',
            borderWidth: 1,
            borderColor: colors.info,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.12,
            shadowRadius: 3,
            elevation: 2,
            marginBottom: 16,
          }}
          onPress={() => {
            const url = 'https://sites.google.com/view/falvia/ana-sayfa';
            if (Platform.OS === 'web') {
              window.open(url, '_blank');
            } else {
              Linking.openURL(url);
            }
          }}
        >
          <Ionicons name="shield-checkmark-outline" size={18} color={colors.info} style={{ marginRight: 8 }} />
          <Text style={{ color: colors.info, fontSize: 15, fontWeight: 'bold' }}>Gizlilik Politikası</Text>
          <Ionicons name="open-outline" size={16} color={colors.info} style={{ marginLeft: 8 }} />
        </TouchableOpacity>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            backgroundColor: colors.error,
            borderRadius: 15,
            padding: 15,
            margin: 20,
            marginTop: 0,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
          }} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.light} />
          ) : (
            <>
              <Ionicons name="log-out" size={20} color={colors.text.light} />
              <Text style={{ 
                color: colors.text.light, 
                fontWeight: 'bold',
                fontSize: 16,
                marginLeft: 10,
              }}>
                Çıkış Yap
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Alt Boşluk */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  jetonBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 3,
    marginLeft: 8,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  jetonBadgeText: {
    color: '#fff',
    fontSize: 8,
    fontWeight: 'bold',
    marginLeft: 3,
  },
});

export default ProfileScreen; 