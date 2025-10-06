import React, { useState, useEffect, useRef } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Image, 
  Dimensions, 
  Alert,
  ActivityIndicator,
  Animated,
  Pressable,
  Platform,
  ToastAndroid,
  RefreshControl
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import AnimatedButton from '../components/AnimatedButton';
import PremiumButton from '../components/PremiumButton';
import PremiumPackageCard from '../components/PremiumPackageCard';
import PremiumTrialCard from '../components/PremiumTrialCard';

// RevenueCat servisleri
import { 
  initializeRevenueCat,
  setRevenueCatUserID,
  getOfferings,
  purchaseSubscription,
  purchaseTokenPackage,
  restorePurchases,
  testPurchase,
  getTestUserInfo,
  checkSubscriptionStatus,
  SUBSCRIPTION_PRODUCTS,
  SUBSCRIPTION_INFO
} from '../services/revenueCatService';

// Supabase servisleri
import { 
  checkUserSubscription,
  checkUserSubscriptionWithTrial,
  updateTokenBalance 
} from '../services/supabaseService';

// Trial servisleri
import { TrialService } from '../services/trialService';
import badgeService from '../services/badgeService';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;

const USER_TOKENS_KEY = '@user_tokens';

const TokenStoreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [userTokens, setUserTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState(null);
  const [subscriptionData, setSubscriptionData] = useState(null);
  const [availablePackages, setAvailablePackages] = useState([]);
  const [loadingSubscriptions, setLoadingSubscriptions] = useState(true);
  const [revenueCatInitialized, setRevenueCatInitialized] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('subscription'); // 'subscription' veya 'tokens'
  
  // Jeton paketlerini RevenueCat'ten al
  const [tokenPackages, setTokenPackages] = useState([]);
  const [loadingTokenPackages, setLoadingTokenPackages] = useState(true);
  
  // Deneme durumu
  const [trialStatus, setTrialStatus] = useState({
    canStartTrial: false,
    isTrialActive: false,
    trialRemainingDays: 0,
    trialEndDate: null,
    isFreeTrial: false
  });
  
  // RevenueCat'i başlat
  useEffect(() => {
    initializeRevenueCatSDK();
  }, []);

  // Kullanıcı giriş yaptığında RevenueCat user ID'sini ayarla
  useEffect(() => {
    if (user && revenueCatInitialized) {
      setupRevenueCatUser();
    }
  }, [user, revenueCatInitialized]);

  // RevenueCat SDK'yı başlat
  const initializeRevenueCatSDK = async () => {
    try {
      const result = await initializeRevenueCat();
      if (result.success) {
        setRevenueCatInitialized(true);
      } else {
        console.error('RevenueCat SDK başlatma hatası:', result.error);
        Alert.alert('Hata', 'Ödeme sistemi başlatılamadı. Lütfen uygulamayı yeniden başlatın.');
      }
    } catch (error) {
      console.error('RevenueCat başlatma hatası:', error);
    }
  };

  // RevenueCat kullanıcı kurulumu
  const setupRevenueCatUser = async () => {
    try {
      if (!user?.id) return;
      
      // Kullanıcı ID'sini RevenueCat'e kaydet
      await setRevenueCatUserID(user.id);
      
      // Kullanıcı verilerini yükle
      await Promise.all([
        fetchUserTokens(),
        fetchUserSubscription(),
        fetchAvailableSubscriptions(),
        fetchTokenPackages()
      ]);
    } catch (error) {
      console.error('RevenueCat kullanıcı kurulum hatası:', error);
    }
  };

  // Kullanıcının jeton sayısını al
  const fetchUserTokens = async () => {
    try {
      if (!user?.id) return;
      
      // Önce AsyncStorage'dan kontrol et
      const storedTokens = await AsyncStorage.getItem(USER_TOKENS_KEY);
      if (storedTokens) {
        setUserTokens(parseInt(storedTokens, 10));
      }
      
      // Veritabanından güncel bilgiyi al
      const { data: userData, error } = await supabase
        .from('users')
        .select('token_balance')
        .eq('id', user.id)
        .single();
      
      if (!error && userData) {
        const tokenBalance = userData.token_balance || 0;
        setUserTokens(tokenBalance);
        await AsyncStorage.setItem(USER_TOKENS_KEY, tokenBalance.toString());
      } else {
        console.error('Jeton bilgisi alınamadı:', error);
      }
    } catch (error) {
      console.error('Jeton bilgisi alınamadı:', error);
    }
  };

  // Kullanıcının abonelik durumunu kontrol et (deneme dahil)
  const fetchUserSubscription = async () => {
    try {
      if (!user?.id) return;
      
      // Deneme dahil abonelik kontrolü
      const subscriptionInfo = await checkUserSubscriptionWithTrial(user.id);
      setSubscriptionData(subscriptionInfo);
      
      // Deneme durumunu ayrıca state'e kaydet
      setTrialStatus({
        canStartTrial: !subscriptionInfo.isPremium && !subscriptionInfo.isFreeTrial,
        isTrialActive: subscriptionInfo.isFreeTrial || false,
        trialRemainingDays: subscriptionInfo.trialRemainingDays || 0,
        trialEndDate: subscriptionInfo.trialEndDate || null,
        isFreeTrial: subscriptionInfo.isFreeTrial || false
      });
    } catch (error) {
      console.error('Abonelik durumu kontrol hatası:', error);
    }
  };

  // Mevcut abonelik paketlerini al
  const fetchAvailableSubscriptions = async () => {
    try {
      setLoadingSubscriptions(true);
      const result = await getOfferings();
      
      if (result.success) {
        // Sadece abonelik paketlerini filtrele
        const subscriptionPacks = result.offerings.filter(pkg => {
          const productId = pkg.product.identifier;
          // Abonelik paketlerini tanımla (monthly, yearly, subscription içeren)
          return productId.includes('monthly') || productId.includes('yearly') || productId.includes('subscription');
        });
        
        // Paketleri sırala: Mini (popüler) en üstte
        const sortedPacks = subscriptionPacks.sort((a, b) => {
          const aId = a.product.identifier.split(':')[0].toLowerCase();
          const bId = b.product.identifier.split(':')[0].toLowerCase();
          
          // Sıralama önceliği: mini -> standart -> premium
          const order = { 'mini_monthly': 1, 'standart_monthly': 2, 'premium_monthly': 3 };
          return (order[aId] || 999) - (order[bId] || 999);
        });
        
        setAvailablePackages(sortedPacks);
      } else {
        console.error('Abonelik paketleri alma hatası:', result.error);
        Alert.alert('Hata', 'Abonelik paketleri yüklenemedi.');
      }
    } catch (error) {
      console.error('Abonelik paketleri yükleme hatası:', error);
    } finally {
      setLoadingSubscriptions(false);
    }
  };

  // Jeton paketlerini RevenueCat'ten al
  const fetchTokenPackages = async () => {
    try {
      setLoadingTokenPackages(true);
      const result = await getOfferings();
      
      if (result.success) {
        // Sadece jeton paketlerini filtrele (abonelik olmayan ürünler)
        const tokenPacks = result.offerings.filter(pkg => {
          const productId = pkg.product.identifier;
          // Jeton paketlerini tanımla (abonelik olmayan ürünler)
          return !productId.includes('monthly') && !productId.includes('yearly') && !productId.includes('subscription');
        });
        
        // Jeton paketlerini formatla
        const formattedTokenPacks = tokenPacks.map((pkg, index) => {
          const productId = pkg.product.identifier;
          const tokens = getTokenAmountFromProductId(productId);
          
          return {
            id: index + 1,
            name: pkg.product.title || `${tokens} Fal Paketi`,
            tokens: tokens,
            price: pkg.product.priceString || '0₺',
            description: getTokenPackageDescription(tokens),
            features: getTokenPackageFeatures(tokens),
            color: getTokenPackageColor(index),
            popular: index === 2, // 3. paket popüler olsun
            package: pkg // RevenueCat paket referansı
          };
        });
        
        setTokenPackages(formattedTokenPacks);
      } else {
        console.error('Jeton paketleri alma hatası:', result.error);
      }
    } catch (error) {
      console.error('Jeton paketleri yükleme hatası:', error);
    } finally {
      setLoadingTokenPackages(false);
    }
  };

  // Ürün ID'sinden jeton miktarını al
  const getTokenAmountFromProductId = (productId) => {
    const tokenMap = {
      'token_10': 10,
      'token_30': 30,
      'token_50': 50,
      'token_80': 80,
      'token_100': 100,
      'token_150': 150,
      'token_200': 200
    };
    return tokenMap[productId] || 10;
  };

  // Jeton paketi açıklamasını al
  const getTokenPackageDescription = (tokens) => {
    const descriptions = {
      10: 'Tek bir fal için ideal başlangıç paketi',
      30: 'Daha fazla fal için ekonomik seçim',
      50: 'En çok tercih edilen jeton paketi',
      80: 'Gerçek bir fal tutkunuysan, en büyük tasarruf!',
      100: 'Uzun vadeli fal keyfi için mükemmel paket',
      150: 'Premium fal deneyimi için özel paket',
      200: 'Sınırsız fal keyfi için ultimate paket'
    };
    return descriptions[tokens] || 'Fal jeton paketi';
  };

  // Jeton paketi özelliklerini al
  const getTokenPackageFeatures = (tokens) => {
    return [
      `${tokens} Fal Jetonu`,
      'Tüm Fal Türleri',
      'Sınırsız Geçerlilik'
    ];
  };

  // Jeton paketi rengini al
  const getTokenPackageColor = (index) => {
    const colorArray = [
      colors.info,
      colors.primaryLight,
      colors.secondary,
      colors.social.google,
      colors.success,
      colors.warning,
      colors.error
    ];
    return colorArray[index % colorArray.length];
  };



  // Abonelik satın alma işlemi
  const handleSubscriptionPurchase = async (packageToPurchase) => {
    if (!user?.id) {
      Alert.alert('Hata', 'Lütfen giriş yapın.');
      return;
    }

    setLoadingPackageId(packageToPurchase.product.identifier);
    setLoading(true);
    
    try {
      const result = await purchaseSubscription(packageToPurchase, user.id);
      
      if (result.success) {
        // Başarılı satın alma
        await fetchUserSubscription(); // Abonelik durumunu güncelle
        
        // Bonus jeton ekle (abonelik tipine göre)
        const bonusTokens = getBonusTokensForSubscription(result.productIdentifier);
        if (bonusTokens > 0) {
          await updateTokenBalance(user.id, bonusTokens, 'subscription_bonus', result.productIdentifier);
          await fetchUserTokens();
          
          if (Platform.OS === 'android') {
            ToastAndroid.show(`${bonusTokens} bonus jeton hesabınıza eklendi!`, ToastAndroid.LONG);
          }
        }
        
        // İlk alım rozetini kontrol et
        const { data: userData } = await supabase
          .from('users')
          .select('first_purchase_date')
          .eq('id', user.id)
          .single();
        
        // Eğer ilk alım değilse, first_purchase_date'i güncelle
        if (!userData?.first_purchase_date) {
          await supabase
            .from('users')
            .update({ first_purchase_date: new Date().toISOString() })
            .eq('id', user.id);
          
          // VIP Deneyim rozetini kontrol et
          const badgeResult = await badgeService.checkFirstPurchaseBadge(user.id);
          
          if (badgeResult.success && badgeResult.newBadge) {
            Alert.alert(
              '🎉 Tebrikler!',
              `Aboneliğiniz aktif edildi ve "${badgeResult.data.name}" rozetini kazandınız! Tüm premium özelliklere erişebilirsiniz!`,
              [{ text: 'Harika!', onPress: () => navigation.goBack() }]
            );
          } else {
            Alert.alert(
              'Başarılı!',
              'Aboneliğiniz aktif edildi. Tüm premium özelliklere erişebilirsiniz!',
              [{ text: 'Tamam', onPress: () => navigation.goBack() }]
            );
          }
        } else {
          Alert.alert(
            'Başarılı!',
            'Aboneliğiniz aktif edildi. Tüm premium özelliklere erişebilirsiniz!',
            [{ text: 'Tamam', onPress: () => navigation.goBack() }]
          );
        }
      } else {
        // Hata durumu
        Alert.alert(
          'Satın Alma Hatası',
          result.errorMessage || 'Satın alma işlemi sırasında bir hata oluştu.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Abonelik satın alma hatası:', error);
      Alert.alert(
        'Hata',
        'Satın alma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
      setLoadingPackageId(null);
    }
  };

  // Satın alımları geri yükle
  const handleRestorePurchases = async () => {
    if (!user?.id) {
      Alert.alert('Hata', 'Lütfen giriş yapın.');
      return;
    }

    setLoading(true);
    
    try {
      const result = await restorePurchases(user.id);
      
      if (result.success) {
        await fetchUserSubscription(); // Abonelik durumunu güncelle
        
        Alert.alert(
          'Başarılı',
          result.message,
          [{ text: 'Tamam' }]
        );
      } else {
        Alert.alert(
          'Hata',
          result.message || 'Satın alımları geri yükleme sırasında bir hata oluştu.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Satın alımları geri yükleme hatası:', error);
      Alert.alert(
        'Hata',
        'Satın alımları geri yükleme sırasında bir hata oluştu.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Abonelik tipine göre bonus jeton miktarını al
  const getBonusTokensForSubscription = (productId) => {
    const bonusTokens = {
      [SUBSCRIPTION_PRODUCTS.MINI_MONTHLY]: 40,
      [SUBSCRIPTION_PRODUCTS.STANDART_MONTHLY]: 20,
      [SUBSCRIPTION_PRODUCTS.PREMIUM_MONTHLY]: 60
    };
    return bonusTokens[productId] || 0;
  };

  // Pull to refresh işlemi
  const onRefresh = async () => {
    setRefreshing(true);
    try {
      await Promise.all([
        fetchUserTokens(),
        fetchUserSubscription(),
        fetchAvailableSubscriptions(),
        fetchTokenPackages()
      ]);
      
      if (Platform.OS === 'android') {
        ToastAndroid.show('Veriler yenilendi!', ToastAndroid.SHORT);
      }
    } catch (error) {
      console.error('Veri yenileme hatası:', error);
      if (Platform.OS === 'android') {
        ToastAndroid.show('Veri yenileme sırasında hata oluştu', ToastAndroid.SHORT);
      }
    } finally {
      setRefreshing(false);
    }
  };

  // Jeton paketi satın alma işlemi
  const handleTokenPurchase = async (pack) => {
    if (!user?.id) {
      Alert.alert('Hata', 'Lütfen giriş yapın.');
      return;
    }

    setLoading(true);
    
    try {
      // Jeton paketini RevenueCat'ten satın al
      const result = await purchaseTokenPackage(pack.package, user.id);
      
      if (result.success) {
        // Başarılı satın alma
        await updateTokenBalance(user.id, pack.tokens, 'token_purchase', pack.package.product.identifier);
        await fetchUserTokens();
        
        // İlk alım rozetini kontrol et
        const { data: userData } = await supabase
          .from('users')
          .select('first_purchase_date')
          .eq('id', user.id)
          .single();
        
        // Eğer ilk alım değilse, first_purchase_date'i güncelle
        if (!userData?.first_purchase_date) {
          await supabase
            .from('users')
            .update({ first_purchase_date: new Date().toISOString() })
            .eq('id', user.id);
          
          // VIP Deneyim rozetini kontrol et
          const badgeResult = await badgeService.checkFirstPurchaseBadge(user.id);
          
          if (badgeResult.success && badgeResult.newBadge) {
            Alert.alert(
              '🎉 Tebrikler!',
              `${pack.tokens} jeton hesabınıza eklendi ve "${badgeResult.data.name}" rozetini kazandınız!`,
              [{ text: 'Harika!' }]
            );
          } else {
            Alert.alert(
              'Başarılı!',
              `${pack.tokens} jeton hesabınıza eklendi!`,
              [{ text: 'Tamam' }]
            );
          }
        } else {
          Alert.alert(
            'Başarılı!',
            `${pack.tokens} jeton hesabınıza eklendi!`,
            [{ text: 'Tamam' }]
          );
        }
      } else {
        Alert.alert(
          'Satın Alma Hatası',
          result.errorMessage || 'Satın alma işlemi sırasında bir hata oluştu.',
          [{ text: 'Tamam' }]
        );
      }
    } catch (error) {
      console.error('Jeton satın alma hatası:', error);
      Alert.alert(
        'Hata',
        'Satın alma işlemi sırasında bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };



  // Abonelik durumunu göster
  const renderSubscriptionStatus = () => {
    if (!subscriptionData) return null;
    
    const { isPremium, subscriptionType, expiresAt, isTrial, isFreeTrial, trialRemainingDays } = subscriptionData;
    
    if (isPremium) {
      const subscriptionInfo = SUBSCRIPTION_INFO[subscriptionType];
      const isTrialActive = isTrial || isFreeTrial;
      
      return (
        <View style={[
          styles.subscriptionStatusContainer,
          isFreeTrial && styles.freeTrialStatusContainer
        ]}>
          <View style={styles.subscriptionStatusHeader}>
            <MaterialCommunityIcons 
              name={isFreeTrial ? "diamond" : "crown"} 
              size={24} 
              color={isFreeTrial ? colors.success : colors.secondary} 
            />
            <Text style={[
              styles.subscriptionStatusTitle,
              isFreeTrial && styles.freeTrialStatusTitle
            ]}>
              {isFreeTrial ? '3 Gün Ücretsiz Deneme Aktif' : 
               isTrialActive ? 'Deneme Süresi' : 'Aktif Abonelik'}
            </Text>
          </View>
          
          {isFreeTrial && trialRemainingDays !== undefined && (
            <Text style={styles.trialRemainingText}>
              {trialRemainingDays > 0 ? `${trialRemainingDays} gün kaldı` : 'Bugün sona eriyor'}
            </Text>
          )}
          
          <Text style={styles.subscriptionStatusText}>
            {isFreeTrial ? 'Premium Özellikler Aktif' : (subscriptionInfo?.title || subscriptionType)}
          </Text>
          
          {expiresAt && (
            <Text style={styles.subscriptionStatusExpiry}>
              {isFreeTrial ? 'Deneme bitiş:' : 
               isTrialActive ? 'Deneme bitiş:' : 'Yenileme:'} {new Date(expiresAt).toLocaleDateString('tr-TR')}
            </Text>
          )}
          
          {isFreeTrial && (
            <Text style={styles.freeTrialInfo}>
              Deneme bitiminde otomatik olarak ücretsiz hesaba döneceksiniz
            </Text>
          )}
        </View>
      );
    }
    
    return null;
  };

  // Tab navigation render fonksiyonu
  const renderTabNavigation = () => {
    return (
      <View style={styles.tabWrapper}>
        <LinearGradient
          colors={['#FFD700', '#FFF8DC', '#FFD700']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={styles.tabBorder}
        >
          <View style={styles.tabContainer}>
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('subscription')}
              activeOpacity={0.8}
            >
              {activeTab === 'subscription' ? (
                <LinearGradient
                  colors={['#FFD700', '#FFF8DC', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTabButton}
                >
                  <MaterialCommunityIcons 
                    name="crown" 
                    size={20} 
                    color={colors.text.dark} 
                  />
                  <Text style={styles.activeTabText}>Abonelik</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTabButton}>
                  <MaterialCommunityIcons 
                    name="crown" 
                    size={20} 
                    color={colors.text.tertiary} 
                  />
                  <Text style={styles.tabText}>Abonelik</Text>
                </View>
              )}
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.tabButton}
              onPress={() => setActiveTab('tokens')}
              activeOpacity={0.8}
            >
              {activeTab === 'tokens' ? (
                <LinearGradient
                  colors={['#FFD700', '#FFF8DC', '#FFD700']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.activeTabButton}
                >
                  <MaterialCommunityIcons 
                    name="diamond" 
                    size={20} 
                    color={colors.text.dark} 
                  />
                  <Text style={styles.activeTabText}>Jeton Paketleri</Text>
                </LinearGradient>
              ) : (
                <View style={styles.inactiveTabButton}>
                  <MaterialCommunityIcons 
                    name="diamond" 
                    size={20} 
                    color={colors.text.tertiary} 
                  />
                  <Text style={styles.tabText}>Jeton Paketleri</Text>
                </View>
              )}
            </TouchableOpacity>
          </View>
        </LinearGradient>
      </View>
    );
  };

  // Abonelik paketleri render fonksiyonu
  const renderSubscriptionPackages = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="crown" size={24} color={colors.secondary} />
          <Text style={styles.sectionTitle}>Abonelik Paketleri</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Her ay düzenli fal baktıranlar için özel fırsatlar</Text>
        
        {availablePackages.length > 0 ? (
          availablePackages.map((packageItem) => {
            const productId = packageItem.product.identifier;
            
            // ProductId'yi temizle (RevenueCat ':p1m' gibi ekler ekliyor)
            const cleanProductId = productId.split(':')[0];
            
            // Preview modunda gelen paketler için varsayılan bilgiler
            // Önce tam eşleşme dene
            let subscriptionInfo = SUBSCRIPTION_INFO[cleanProductId];
            
            // Tam eşleşme yoksa, küçük harfe çevirip dene
            if (!subscriptionInfo) {
              const normalizedId = cleanProductId.toLowerCase();
              subscriptionInfo = SUBSCRIPTION_INFO[normalizedId];
            }
            

            
            // Eğer paket bilgisi yoksa varsayılan bilgiler oluştur
            if (!subscriptionInfo) {
              subscriptionInfo = {
                title: packageItem.product.title || 'Premium Paket',
                price: packageItem.product.priceString || '99,99₺',
                features: [
                  'Aylık Fal Hakkı',
                  'Jeton Alımlarında İndirim',
                  'Premium Rozetler',
                  'Sınırsız Fal Geçmişi',
                  'Öncelikli Destek'
                ],
                color: colors.secondary,
                popular: false
              };
            }
            
            const isLoading = loading && loadingPackageId === productId;
            
            return (
              <PremiumPackageCard
                key={productId}
                type="subscription"
                title={subscriptionInfo.title}
                price={packageItem.product.priceString}
                priceNote="/ay"
                features={subscriptionInfo.features}
                icon="crown"
                iconColor={subscriptionInfo.color}
                iconLabel="Premium"
                popular={subscriptionInfo.popular}
                buttonText="Abone Ol"
                onPress={() => handleSubscriptionPurchase(packageItem)}
                loading={isLoading}
                disabled={loading}
              />
            );
          })
        ) : loadingSubscriptions ? (
          <View style={styles.noPackagesContainer}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={styles.noPackagesText}>Abonelik paketleri yükleniyor...</Text>
          </View>
        ) : (
          <View style={styles.noPackagesContainer}>
            <MaterialCommunityIcons name="package-variant" size={48} color={colors.text.tertiary} />
            <Text style={styles.noPackagesText}>Abonelik paketi bulunamadı</Text>
            <Text style={styles.noPackagesSubtext}>Lütfen daha sonra tekrar deneyin</Text>
          </View>
        )}
      </View>
    );
  };

  // Jeton paketleri render fonksiyonu
  const renderTokenPackages = () => {
    return (
      <View style={styles.section}>
        <View style={styles.sectionTitleRow}>
          <MaterialCommunityIcons name="diamond" size={24} color={colors.secondary} />
          <Text style={styles.sectionTitle}>Ek Jeton Paketleri</Text>
        </View>
        <Text style={styles.sectionSubtitle}>Abonelik dışında ek jeton satın alabilirsiniz</Text>
        
        {loadingTokenPackages ? (
          <View style={styles.noPackagesContainer}>
            <ActivityIndicator size="large" color={colors.secondary} />
            <Text style={styles.noPackagesText}>Jeton paketleri yükleniyor...</Text>
          </View>
        ) : tokenPackages.length > 0 ? (
          tokenPackages.map((pack) => (
            <PremiumPackageCard
              key={pack.id}
              type="token"
              title={pack.name}
              description={pack.description}
              price={pack.price}
              originalPrice={pack.originalPrice}
              discount={pack.discount}
              features={pack.features}
              icon="diamond"
              iconColor={pack.color}
              iconLabel="Jeton"
              tokenCount={pack.tokens}
              popular={pack.popular}
              buttonText="Satın Al"
              onPress={() => handleTokenPurchase(pack)}
              loading={loading}
              disabled={loading}
            />
          ))
        ) : (
          <View style={styles.noPackagesContainer}>
            <MaterialCommunityIcons name="package-variant" size={48} color={colors.text.tertiary} />
            <Text style={styles.noPackagesText}>Jeton paketi bulunamadı</Text>
            <Text style={styles.noPackagesSubtext}>Lütfen daha sonra tekrar deneyin</Text>
          </View>
        )}
      </View>
    );
  };

  // Yükleme göstergesi
  if (loadingSubscriptions) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Abonelik paketleri yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header */}
      <LinearGradient
        colors={['#4A0080', '#6A1B9A', '#4A0080']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Decorative elements */}
        <View style={styles.headerDecoTop} />
        <View style={styles.headerDecoBottom} />
        
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 255, 255, 0.1)']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.backButtonGradient}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.light} />
            </LinearGradient>
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <MaterialCommunityIcons name="shopping" size={22} color={colors.secondary} />
            <Text style={styles.headerTitle}>Mağaza</Text>
          </View>
          
          <View style={styles.headerRight}>
            <LinearGradient
              colors={['#FFD700', '#FFF8DC', '#FFD700']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.tokenContainer}
            >
              <MaterialCommunityIcons name="diamond" size={18} color={colors.text.dark} />
              <Text style={styles.tokenText}>{userTokens}</Text>
            </LinearGradient>
            
            <TouchableOpacity 
              style={styles.restoreButton}
              onPress={handleRestorePurchases}
              disabled={loading}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={['rgba(255, 215, 0, 0.2)', 'rgba(255, 255, 255, 0.1)']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.restoreButtonGradient}
              >
                <Ionicons name="refresh" size={20} color={colors.text.light} />
              </LinearGradient>
            </TouchableOpacity>
          </View>
        </View>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            colors={[colors.secondary]}
            tintColor={colors.secondary}
            title="Yenileniyor..."
            titleColor={colors.text.secondary}
          />
        }
      >
        {/* Abonelik Durumu */}
        {renderSubscriptionStatus()}

        {/* Üst Banner */}
        <View style={styles.bannerWrapper}>
          <LinearGradient
            colors={['#FFD700', '#FFF8DC', '#FFD700']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
            style={styles.bannerBorder}
          >
            <LinearGradient
              colors={['#6A1B9A', '#4A0080']}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.banner}
            >
              {/* Decorative sparkles */}
              <MaterialCommunityIcons 
                name="sparkles" 
                size={20} 
                color="rgba(255, 215, 0, 0.3)" 
                style={styles.sparkle1}
              />
              <MaterialCommunityIcons 
                name="sparkles" 
                size={16} 
                color="rgba(255, 215, 0, 0.2)" 
                style={styles.sparkle2}
              />
              
              <View style={styles.bannerContent}>
                <View style={styles.bannerTextContainer}>
                  <View style={styles.bannerTitleRow}>
                    <MaterialCommunityIcons name="crown" size={24} color={colors.secondary} />
                    <Text style={styles.bannerTitle}>Premium Abonelik</Text>
                  </View>
                  <Text style={styles.bannerSubtitle}>
                    Sınırsız fal deneyimi ve özel avantajlar
                  </Text>
                </View>
                <View style={styles.bannerImageContainer}>
                  <LinearGradient
                    colors={['rgba(255, 215, 0, 0.3)', 'rgba(255, 215, 0, 0.1)']}
                    style={styles.bannerIconGradient}
                  >
                    <MaterialCommunityIcons 
                      name="crystal-ball" 
                      size={50} 
                      color={colors.secondary} 
                      style={styles.bannerImage}
                    />
                  </LinearGradient>
                </View>
              </View>
            </LinearGradient>
          </LinearGradient>
        </View>

        {/* Premium Deneme Kartı - Büyük Boyut */}
        <PremiumTrialCard
          isVisible={true}
          onTrialStarted={async (result) => {
            // Deneme başladığında sayfayı yenile
            if (Platform.OS === 'android') {
              ToastAndroid.show('Premium deneme aktif! Sayfa yenileniyor...', ToastAndroid.SHORT);
            }
            
            // Tüm verileri yenile
            await Promise.all([
              fetchUserTokens(),
              fetchUserSubscription(),
              fetchAvailableSubscriptions(),
              fetchTokenPackages()
            ]);
          }}
          onTrialExpired={async () => {
            // Deneme bittiğinde sayfayı yenile
            if (Platform.OS === 'android') {
              ToastAndroid.show('Deneme süresi sona erdi. Sayfa yenileniyor...', ToastAndroid.SHORT);
            }
            
            Alert.alert(
              'Deneme Süresi Sona Erdi',
              'Ücretsiz deneme süreniz sona erdi. Premium özelliklerden yararlanmaya devam etmek için abonelik satın alabilirsiniz.',
              [
                { text: 'Şimdi Değil', style: 'cancel' },
                { text: 'Abonelik Al', onPress: () => setActiveTab('subscription') }
              ]
            );
            
            // Verileri yenile
            await Promise.all([
              fetchUserTokens(),
              fetchUserSubscription(),
              fetchAvailableSubscriptions()
            ]);
          }}
          onLearnMore={() => {
            // Premium özellikler hakkında detay bilgi
            Alert.alert(
              "Premium Özellikler",
              "• 6 Fal Hakkı (Aylık)\n• Jeton Alımlarında %20 İndirim\n• Fal Yorum Önceliği\n• Keşfet'te Paylaşım Hakkı\n• Özel Falcılar\n• Hızlı Yanıt Süreleri",
              [{ text: "Anladım" }]
            );
          }}
        />

        {/* Tab Navigation */}
        {renderTabNavigation()}

        {/* Tab İçerikleri */}
        {activeTab === 'subscription' ? renderSubscriptionPackages() : renderTokenPackages()}

        {/* Neden Abonelik Almalıyım? */}
        <View style={styles.section}>
          <View style={styles.sectionTitleRow}>
            <MaterialCommunityIcons name="information" size={24} color={colors.secondary} />
            <Text style={styles.sectionTitle}>Neden Premium?</Text>
          </View>
          <View style={styles.reasonsContainer}>
            <View style={styles.reasonCardWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFF8DC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reasonCardBorder}
              >
                <View style={styles.reasonCard}>
                  <LinearGradient
                    colors={['#6A1B9A', '#4A0080']}
                    style={styles.reasonIcon}
                  >
                    <Ionicons name="time" size={24} color={colors.secondary} />
                  </LinearGradient>
                  <Text style={styles.reasonTitle}>Aylık Fal Hakkı</Text>
                  <Text style={styles.reasonText}>Her ay belirli sayıda fal hakkınız olur</Text>
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.reasonCardWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFF8DC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reasonCardBorder}
              >
                <View style={styles.reasonCard}>
                  <LinearGradient
                    colors={['#6A1B9A', '#4A0080']}
                    style={styles.reasonIcon}
                  >
                    <Ionicons name="people" size={24} color={colors.secondary} />
                  </LinearGradient>
                  <Text style={styles.reasonTitle}>Keşfet Hakkı</Text>
                  <Text style={styles.reasonText}>Keşfet sayfasında paylaşım yapma hakkı</Text>
                </View>
              </LinearGradient>
            </View>
            
            <View style={styles.reasonCardWrapper}>
              <LinearGradient
                colors={['#FFD700', '#FFF8DC']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.reasonCardBorder}
              >
                <View style={styles.reasonCard}>
                  <LinearGradient
                    colors={['#6A1B9A', '#4A0080']}
                    style={styles.reasonIcon}
                  >
                    <Ionicons name="sparkles" size={24} color={colors.secondary} />
                  </LinearGradient>
                  <Text style={styles.reasonTitle}>Jeton İndirimi</Text>
                  <Text style={styles.reasonText}>Jeton alımlarında özel indirimler</Text>
                </View>
              </LinearGradient>
            </View>
          </View>
        </View>
        
        {/* Test Butonu - Sadece Debug Modunda */}
        {__DEV__ && (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🧪 Test Alanı</Text>
            <View style={styles.testContainer}>
              <PremiumButton
                onPress={async () => {
                  try {
                    const result = await testPurchase('mini_monthly');
                    if (result.success) {
                      Alert.alert('Başarılı', 'Test satın alma işlemi başarılı!');
                    } else if (result.cancelled) {
                      Alert.alert('İptal', 'Test satın alma işlemi iptal edildi.');
                    } else {
                      Alert.alert('Hata', result.error?.message || 'Bilinmeyen hata');
                    }
                  } catch (error) {
                    Alert.alert('Hata', error.message);
                  }
                }}
                title="Mini Test Satın Al"
                icon="test-tube"
                iconSize={20}
                variant="secondary"
                style={styles.testButton}
                textStyle={styles.testButtonText}
              />
              
              <PremiumButton
                onPress={async () => {
                  try {
                    const result = await testPurchase('standart_monthly');
                    if (result.success) {
                      Alert.alert('Başarılı', 'Test satın alma işlemi başarılı!');
                    } else if (result.cancelled) {
                      Alert.alert('İptal', 'Test satın alma işlemi iptal edildi.');
                    } else {
                      Alert.alert('Hata', result.error?.message || 'Bilinmeyen hata');
                    }
                  } catch (error) {
                    Alert.alert('Hata', error.message);
                  }
                }}
                title="Standart Test Satın Al"
                icon="test-tube"
                iconSize={20}
                variant="secondary"
                style={styles.testButton}
                textStyle={styles.testButtonText}
              />
              
              <PremiumButton
                onPress={async () => {
                  try {
                    const result = await testPurchase('premium_monthly');
                    if (result.success) {
                      Alert.alert('Başarılı', 'Test satın alma işlemi başarılı!');
                    } else if (result.cancelled) {
                      Alert.alert('İptal', 'Test satın alma işlemi iptal edildi.');
                    } else {
                      Alert.alert('Hata', result.error?.message || 'Bilinmeyen hata');
                    }
                  } catch (error) {
                    Alert.alert('Hata', error.message);
                  }
                }}
                title="Premium Test Satın Al"
                icon="test-tube"
                iconSize={20}
                variant="secondary"
                style={styles.testButton}
                textStyle={styles.testButtonText}
              />
              
              <PremiumButton
                onPress={async () => {
                  const info = await getTestUserInfo();
                  Alert.alert('Test Kullanıcı Bilgisi', JSON.stringify(info, null, 2));
                }}
                title="Kullanıcı Bilgilerini Göster"
                icon="account-circle"
                iconSize={20}
                variant="outlined"
                style={styles.testButton}
                textStyle={styles.testButtonText}
              />

              <PremiumButton
                onPress={async () => {
                  try {
                    if (!user?.id) return Alert.alert('Hata', 'Önce giriş yapın');
                    const offerings = await getOfferings();
                    if (!offerings.success) return Alert.alert('Hata', 'Offerings alınamadı');
                    const pkg = offerings.offerings.find(p => {
                      const id = (p.product?.identifier || '').toLowerCase();
                      return id.endsWith('token_10') || id.includes('token_10');
                    });
                    if (!pkg) return Alert.alert('Bulunamadı', 'token_10 paketi bulunamadı');

                    const purchase = await purchaseTokenPackage(pkg, user.id);
                    if (purchase.success) {
                      const tokens = getTokenAmountFromProductId(pkg.product.identifier);
                      await updateTokenBalance(user.id, tokens, 'token_purchase_test', pkg.product.identifier);
                      await fetchUserTokens();
                      Alert.alert('Başarılı', `${tokens} jeton test olarak eklendi.`);
                    } else if (purchase.cancelled) {
                      Alert.alert('İptal', 'Satın alma iptal edildi.');
                    } else {
                      Alert.alert('Hata', purchase.errorMessage || 'Satın alma başarısız');
                    }
                  } catch (error) {
                    Alert.alert('Hata', error.message);
                  }
                }}
                title="Test 10 Jeton Satın Al"
                icon="diamond"
                iconSize={20}
                variant="secondary"
                style={styles.testButton}
                textStyle={styles.testButtonText}
              />

              <PremiumButton
                onPress={async () => {
                  try {
                    if (!user?.id) return Alert.alert('Hata', 'Önce giriş yapın');
                    const offerings = await getOfferings();
                    if (!offerings.success) return Alert.alert('Hata', 'Offerings alınamadı');
                    const pkg = offerings.offerings.find(p => {
                      const id = (p.product?.identifier || '').toLowerCase();
                      return id.endsWith('token_30') || id.includes('token_30');
                    });
                    if (!pkg) return Alert.alert('Bulunamadı', 'token_30 paketi bulunamadı');

                    const purchase = await purchaseTokenPackage(pkg, user.id);
                    if (purchase.success) {
                      const tokens = getTokenAmountFromProductId(pkg.product.identifier);
                      await updateTokenBalance(user.id, tokens, 'token_purchase_test', pkg.product.identifier);
                      await fetchUserTokens();
                      Alert.alert('Başarılı', `${tokens} jeton test olarak eklendi.`);
                    } else if (purchase.cancelled) {
                      Alert.alert('İptal', 'Satın alma iptal edildi.');
                    } else {
                      Alert.alert('Hata', purchase.errorMessage || 'Satın alma başarısız');
                    }
                  } catch (error) {
                    Alert.alert('Hata', error.message);
                  }
                }}
                title="Test 30 Jeton Satın Al"
                icon="diamond"
                iconSize={20}
                variant="secondary"
                style={styles.testButton}
                textStyle={styles.testButtonText}
              />

              {__DEV__ && (
                <>
                  <PremiumButton
                    onPress={async () => {
                      try {
                        if (!user?.id) return Alert.alert('Hata', 'Önce giriş yapın');
                        await updateTokenBalance(user.id, 10, 'token_purchase_simulated', 'sim_token_10');
                        await fetchUserTokens();
                        Alert.alert('Simülasyon', '10 jeton test olarak eklendi.');
                      } catch (error) {
                        Alert.alert('Hata', error.message);
                      }
                    }}
                    title="Simülasyon: 10 Jeton Ekle"
                    icon="plus-circle"
                    iconSize={20}
                    variant="primary"
                    style={styles.testButton}
                    textStyle={styles.testButtonText}
                  />

                  <PremiumButton
                    onPress={async () => {
                      try {
                        if (!user?.id) return Alert.alert('Hata', 'Önce giriş yapın');
                        await updateTokenBalance(user.id, 30, 'token_purchase_simulated', 'sim_token_30');
                        await fetchUserTokens();
                        Alert.alert('Simülasyon', '30 jeton test olarak eklendi.');
                      } catch (error) {
                        Alert.alert('Hata', error.message);
                      }
                    }}
                    title="Simülasyon: 30 Jeton Ekle"
                    icon="plus-circle"
                    iconSize={20}
                    variant="primary"
                    style={styles.testButton}
                    textStyle={styles.testButtonText}
                  />
                </>
              )}
            </View>
          </View>
        )}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginBottom: 65,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondary,
    marginTop: 16,
    fontSize: 16,
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    position: 'relative',
    overflow: 'hidden',
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 8,
  },
  headerDecoTop: {
    position: 'absolute',
    top: -50,
    right: -50,
    width: 150,
    height: 150,
    borderRadius: 75,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  headerDecoBottom: {
    position: 'absolute',
    bottom: -30,
    left: -30,
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    zIndex: 2,
  },
  backButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  backButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
    marginLeft: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
    letterSpacing: 0.5,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.4,
    shadowRadius: 4,
    elevation: 4,
  },
  tokenText: {
    color: colors.text.dark,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 15,
  },
  restoreButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  restoreButtonGradient: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollContent: {
    paddingBottom: 100,
  },
  subscriptionStatusContainer: {
    marginHorizontal: 20,
    marginTop: 20,
    padding: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  subscriptionStatusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  subscriptionStatusTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
    marginLeft: 8,
  },
  subscriptionStatusText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  subscriptionStatusExpiry: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  // Free Trial specific styles
  freeTrialStatusContainer: {
    backgroundColor: 'rgba(34, 197, 94, 0.1)',
    borderColor: colors.success,
  },
  freeTrialStatusTitle: {
    color: colors.success,
  },
  trialRemainingText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  freeTrialInfo: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
  bannerWrapper: {
    marginHorizontal: 20,
    marginTop: 20,
  },
  bannerBorder: {
    borderRadius: 20,
    padding: 2,
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.4,
    shadowRadius: 10,
    elevation: 8,
  },
  banner: {
    borderRadius: 18,
    overflow: 'hidden',
    position: 'relative',
  },
  sparkle1: {
    position: 'absolute',
    top: 10,
    right: 20,
  },
  sparkle2: {
    position: 'absolute',
    bottom: 15,
    left: 25,
  },
  bannerContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    letterSpacing: 0.3,
  },
  bannerSubtitle: {
    fontSize: 13,
    color: colors.text.secondary,
    opacity: 0.9,
    lineHeight: 18,
  },
  bannerImageContainer: {
    width: 70,
    height: 70,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerIconGradient: {
    width: 70,
    height: 70,
    borderRadius: 35,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    shadowColor: colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
  },
  // Tab Navigation Styles
  tabWrapper: {
    marginHorizontal: 20,
    marginTop: 25,
  },
  tabBorder: {
    borderRadius: 16,
    padding: 2,
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 6,
    gap: 8,
  },
  tabButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  activeTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  inactiveTabButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    gap: 8,
    backgroundColor: 'transparent',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.tertiary,
  },
  activeTabText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.dark,
    letterSpacing: 0.3,
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
  },
  sectionTitle: {
    fontSize: 19,
    fontWeight: 'bold',
    color: colors.text.light,
    letterSpacing: 0.3,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: 18,
    lineHeight: 20,
  },
  reasonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 10,
  },
  reasonCardWrapper: {
    flex: 1,
  },
  reasonCardBorder: {
    borderRadius: 16,
    padding: 2,
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 5,
  },
  reasonCard: {
    backgroundColor: colors.card,
    borderRadius: 14,
    padding: 16,
    alignItems: 'center',
    minHeight: 150,
  },
  reasonIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 6,
    textAlign: 'center',
    letterSpacing: 0.2,
  },
  reasonText: {
    fontSize: 11,
    color: colors.text.tertiary,
    textAlign: 'center',
    lineHeight: 16,
  },
  testContainer: {
    gap: 10,
  },
  testButton: {
    marginBottom: 8,
  },
  testButtonText: {
    fontSize: 14,
  },
  noPackagesContainer: {
    alignItems: 'center',
    paddingVertical: 40,
    backgroundColor: colors.card,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  noPackagesText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 16,
    marginBottom: 8,
  },
  noPackagesSubtext: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
});

export default TokenStoreScreen; 