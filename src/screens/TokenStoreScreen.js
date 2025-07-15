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
  Pressable
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../styles/colors';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85;

const USER_TOKENS_KEY = '@user_tokens';

const TokenStoreScreen = ({ navigation }) => {
  const [selectedPackage, setSelectedPackage] = useState(null);
  const [userTokens, setUserTokens] = useState(0);
  const [loading, setLoading] = useState(false);
  const [loadingPackageId, setLoadingPackageId] = useState(null);
  const buttonScale = useRef(new Animated.Value(1)).current;
  
  // Kullanıcının jeton sayısını al
  useEffect(() => {
    fetchUserTokens();
  }, []);

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

  // Buton animasyonu
  const animateButton = (scale) => {
    Animated.spring(buttonScale, {
      toValue: scale,
      friction: 5,
      tension: 200,
      useNativeDriver: true
    }).start();
  };

  // Jeton satın alma işlemi
  const handlePurchase = async (pack) => {
    setLoadingPackageId(pack.id);
    setLoading(true);
    
    // Animasyon efekti
    Animated.sequence([
      Animated.timing(buttonScale, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(buttonScale, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();
    
    // Simüle edilmiş işlem süresi
    setTimeout(async () => {
      try {
        // Gerçek bir uygulamada burada ödeme işlemi yapılır
        
        // Kullanıcı bilgilerini al
        const { data: { user } } = await supabase.auth.getUser();
        
        if (user) {
          // Jeton bakiyesini güncelle
          const newBalance = userTokens + pack.tokens;
          
          // Veritabanını güncelle
          const { error } = await supabase
            .from('users')
            .update({ token_balance: newBalance })
            .eq('id', user.id);
            
          if (error) throw error;
          
          // Jeton işlemini kaydet
          const { error: transactionError } = await supabase
            .from('token_transactions')
            .insert({
              user_id: user.id,
              amount: pack.tokens,
              transaction_type: 'purchase',
              description: `${pack.name} satın alındı`
            });
            
          if (transactionError) console.error('İşlem kaydedilemedi:', transactionError);
          
          // UI'ı güncelle
          setUserTokens(newBalance);
          
          // AsyncStorage'a kaydet
          await AsyncStorage.setItem(USER_TOKENS_KEY, newBalance.toString());
          
          // Global olarak jeton sayısını güncelle
          if (global.updateUserTokens) {
            global.updateUserTokens(newBalance);
          }
          
          Alert.alert(
            'Başarılı',
            `${pack.tokens} jeton hesabınıza eklendi!`,
            [{ text: 'Tamam' }]
          );
        }
      } catch (error) {
        console.error('Jeton satın alma hatası:', error);
        Alert.alert(
          'Hata',
          'Jeton satın alınırken bir sorun oluştu. Lütfen tekrar deneyin.',
          [{ text: 'Tamam' }]
        );
      } finally {
        setLoading(false);
        setLoadingPackageId(null);
      }
    }, 1500);
  };

  // Jeton paketleri
  const tokenPackages = [
    {
      id: 1,
      name: '1 Fal Paketi',
      tokens: 10,
      price: '49,99₺',
      discount: '0%',
      description: 'Tek bir fal için ideal başlangıç paketi',
      image: require('../../assets/tokens/starter-pack.png'),
      features: ['10 Fal Jetonu', 'Tüm Fal Türleri', 'Sınırsız Geçerlilik'],
      color: colors.info,
      popular: false
    },
    {
      id: 2,
      name: '3 Fal Paketi',
      tokens: 30,
      price: '129,99₺',
      originalPrice: '149,97₺',
      discount: '13%',
      description: 'Daha fazla fal için ekonomik seçim',
      image: require('../../assets/tokens/standard-pack.png'),
      features: ['30 Fal Jetonu', 'Tüm Fal Türleri', 'Sınırsız Geçerlilik'],
      color: colors.primaryLight,
      popular: false
    },
    {
      id: 3,
      name: '5 Fal Paketi',
      tokens: 50,
      price: '209,99₺',
      originalPrice: '249,95₺',
      discount: '16%',
      description: 'En çok tercih edilen jeton paketi',
      image: require('../../assets/tokens/premium-pack.png'),
      features: ['50 Fal Jetonu', 'Tüm Fal Türleri', 'Sınırsız Geçerlilik'],
      color: colors.secondary,
      popular: true
    },
    {
      id: 4,
      name: '8 Fal Paketi',
      tokens: 80,
      price: '299,99₺',
      originalPrice: '399,92₺',
      discount: '25%',
      description: 'Gerçek bir fal tutkunuysan, en büyük tasarruf!',
      image: require('../../assets/tokens/vip-pack.png'),
      features: ['80 Fal Jetonu', 'Tüm Fal Türleri', 'Sınırsız Geçerlilik'],
      color: colors.social.google,
      popular: false
    },
  ];

  // Özel teklifler
  const specialOffers = [
    {
      id: 1,
      title: 'İlk Alışverişe Özel',
      description: 'İlk jeton alışverişinizde +1 fal hediye! (10 jeton bonus)',
      expiry: '3 gün kaldı',
      badge: 'YENİ',
      color: colors.info
    },
    {
      id: 2,
      title: 'Aylık Abonelik',
      description: 'Her ay 4 fal + jetonlarda %15 indirim avantajı',
      expiry: 'Sınırlı Süre',
      badge: 'FIRSAT',
      color: colors.social.google
    }
  ];

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 0 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Jeton Mağazası</Text>
          <Animated.View 
            style={[
              styles.tokenContainer,
              userTokens > 0 && { transform: [{ scale: buttonScale }] }
            ]}
          >
            <MaterialCommunityIcons name="diamond" size={18} color={colors.secondary} />
            <Text style={styles.tokenText}>{userTokens}</Text>
          </Animated.View>
        </View>
      </LinearGradient>

      <ScrollView 
        showsVerticalScrollIndicator={false} 
        contentContainerStyle={styles.scrollContent}
      >
        {/* Üst Banner */}
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.banner}
        >
          <View style={styles.bannerContent}>
            <View style={styles.bannerTextContainer}>
              <Text style={styles.bannerTitle}>Jetonlarla Daha Fazla Fal!</Text>
              <Text style={styles.bannerSubtitle}>
                1 fal = 10 jeton (49,99₺) değerinde
              </Text>
            </View>
            <View style={styles.bannerImageContainer}>
              <MaterialCommunityIcons 
                name="crystal-ball" 
                size={60} 
                color={colors.secondary} 
                style={styles.bannerImage}
              />
            </View>
          </View>
        </LinearGradient>

        {/* Özel Teklifler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Özel Teklifler</Text>
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.offersContainer}
          >
            {specialOffers.map((offer) => (
              <TouchableOpacity 
                key={offer.id}
                style={styles.offerCard}
              >
                <LinearGradient
                  colors={[offer.color, colors.card]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.offerGradient}
                >
                  <View style={styles.offerBadge}>
                    <Text style={styles.offerBadgeText}>{offer.badge}</Text>
                  </View>
                  <Text style={styles.offerTitle}>{offer.title}</Text>
                  <Text style={styles.offerDescription}>{offer.description}</Text>
                  <View style={styles.offerFooter}>
                    <Text style={styles.offerExpiry}>{offer.expiry}</Text>
                    <TouchableOpacity style={styles.offerButton}>
                      <Text style={styles.offerButtonText}>Fırsatı Yakala</Text>
                    </TouchableOpacity>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Jeton Paketleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Jeton Paketleri</Text>
          
          {tokenPackages.map((pack) => (
            <TouchableOpacity 
              key={pack.id}
              style={[
                styles.packageCard,
                selectedPackage?.id === pack.id && styles.selectedPackage
              ]}
              onPress={() => setSelectedPackage(pack)}
              activeOpacity={0.9}
            >
              {pack.popular && (
                <View style={styles.popularBadge}>
                  <Text style={styles.popularText}>En Popüler</Text>
                </View>
              )}
              
              <View style={styles.packageHeader}>
                <View>
                  <Text style={styles.packageName}>{pack.name}</Text>
                  <Text style={styles.packageDescription}>{pack.description}</Text>
                </View>
                <View style={[styles.packageIconContainer, { backgroundColor: pack.color }]}>
                  <MaterialCommunityIcons name="diamond" size={22} color={colors.text.light} />
                  <Text style={styles.packageTokens}>{pack.tokens}</Text>
                </View>
              </View>
              
              <View style={styles.packageDetails}>
                <View style={styles.packageFeatures}>
                  {pack.features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
                
                <View style={styles.packagePricing}>
                  {pack.originalPrice && (
                    <Text style={styles.originalPrice}>{pack.originalPrice}</Text>
                  )}
                  <View style={styles.priceRow}>
                    <Text style={styles.packagePrice}>{pack.price}</Text>
                    {pack.discount !== '0%' && (
                      <View style={styles.discountBadge}>
                        <Text style={styles.discountText}>{pack.discount}</Text>
                      </View>
                    )}
                  </View>
                </View>
              </View>
              
              <Animated.View style={{
                transform: [{ scale: buttonScale }],
                width: '100%'
              }}>
                <Pressable 
                  style={[styles.buyButton, { backgroundColor: colors.secondary }]}
                  onPress={() => handlePurchase(pack)}
                  android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
                  disabled={loading}
                  onPressIn={() => animateButton(0.95)}
                  onPressOut={() => animateButton(1)}
                >
                  {loading && loadingPackageId === pack.id ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.buyButtonText}>Satın Al</Text>
                  )}
                </Pressable>
              </Animated.View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Neden Jeton Almalıyım? */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Neden Jeton Almalıyım?</Text>
          <View style={styles.reasonsContainer}>
            <View style={styles.reasonCard}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.primaryLight }]}>
                <Ionicons name="time" size={24} color={colors.text.light} />
              </View>
              <Text style={styles.reasonTitle}>Anında Fal</Text>
              <Text style={styles.reasonText}>Jetonlarınızla anında fal baktırın, sıra beklemeyin</Text>
            </View>
            
            <View style={styles.reasonCard}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.success }]}>
                <Ionicons name="people" size={24} color={colors.text.light} />
              </View>
              <Text style={styles.reasonTitle}>En İyi Falcılar</Text>
              <Text style={styles.reasonText}>Deneyimli falcılara öncelikli erişim</Text>
            </View>
            
            <View style={styles.reasonCard}>
              <View style={[styles.reasonIcon, { backgroundColor: colors.secondary }]}>
                <Ionicons name="sparkles" size={24} color={colors.text.light} />
              </View>
              <Text style={styles.reasonTitle}>Premium Üyelik</Text>
              <Text style={styles.reasonText}>Aylık abonelikle daha fazla avantaj</Text>
            </View>
          </View>
        </View>

        {/* Abonelik Paketleri */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Abonelik Paketleri</Text>
          <Text style={styles.subscriptionSubtitle}>Her ay düzenli fal baktıranlar için özel fırsatlar</Text>
          
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionName}>Aylık Mini</Text>
              <Text style={styles.subscriptionPrice}>99,99₺<Text style={styles.perMonth}>/ay</Text></Text>
            </View>
            
            <View style={styles.subscriptionFeatures}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>2 Fal Hakkı</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>Jeton Alımlarında %10 İndirim</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.subscriptionButton, { backgroundColor: colors.secondary }]}
              onPress={() => Alert.alert('Abonelik', 'Mini abonelik seçildi!')}
            >
              <Text style={styles.subscriptionButtonText}>Abone Ol</Text>
            </TouchableOpacity>
          </View>
          
          <View style={[styles.subscriptionCard, styles.popularSubscription]}>
            <View style={styles.popularBadge}>
              <Text style={styles.popularText}>En Çok Tercih Edilen</Text>
            </View>
            
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionName}>Aylık Standart</Text>
              <Text style={styles.subscriptionPrice}>149,99₺<Text style={styles.perMonth}>/ay</Text></Text>
            </View>
            
            <View style={styles.subscriptionFeatures}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>4 Fal Hakkı</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>Jeton Alımlarında %15 İndirim</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>Keşfete Çıkma Hakkı (İsteğe Bağlı)</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.subscriptionButton, { backgroundColor: colors.secondary }]}
              onPress={() => Alert.alert('Abonelik', 'Standart abonelik seçildi!')}
            >
              <Text style={styles.subscriptionButtonText}>Abone Ol</Text>
            </TouchableOpacity>
          </View>
          
          <View style={styles.subscriptionCard}>
            <View style={styles.subscriptionHeader}>
              <Text style={styles.subscriptionName}>Aylık Premium</Text>
              <Text style={styles.subscriptionPrice}>219,99₺<Text style={styles.perMonth}>/ay</Text></Text>
            </View>
            
            <View style={styles.subscriptionFeatures}>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>6 Fal Hakkı</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>Jeton Alımlarında %15 İndirim</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>Fal Yorum Önceliği</Text>
              </View>
              <View style={styles.featureRow}>
                <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                <Text style={styles.featureText}>Keşfete Çıkma Hakkı (İsteğe Bağlı)</Text>
              </View>
              <View style={styles.premiumFeature}>
                <Ionicons name="flash" size={16} color={colors.secondary} />
                <Text style={styles.premiumFeatureText}>Fal sırası beklemeden hızlı yorum!</Text>
              </View>
            </View>
            
            <TouchableOpacity 
              style={[styles.subscriptionButton, { backgroundColor: colors.secondary }]}
              onPress={() => Alert.alert('Abonelik', 'Premium abonelik seçildi!')}
            >
              <Text style={styles.subscriptionButtonText}>Abone Ol</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* SSS */}
        <View style={[styles.section, styles.faqSection]}>
          <Text style={styles.sectionTitle}>Sıkça Sorulan Sorular</Text>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Jetonlar ne kadar süre geçerli?</Text>
            <Text style={styles.faqAnswer}>Satın aldığınız jetonlar süresiz olarak geçerlidir.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Ödeme yöntemleri nelerdir?</Text>
            <Text style={styles.faqAnswer}>Kredi kartı, banka kartı, havale/EFT ve mobil ödeme seçenekleriyle güvenli ödeme yapabilirsiniz.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Abonelik ve jeton arasındaki fark nedir?</Text>
            <Text style={styles.faqAnswer}>Abonelik, her ay belirli sayıda fal hakkı ve indirimler sunar. Jetonlar ise tek seferlik fal baktırmak için kullanılır.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>İade politikanız nedir?</Text>
            <Text style={styles.faqAnswer}>Kullanılmamış jetonlar için satın alma işleminden sonraki 24 saat içinde iade talep edebilirsiniz.</Text>
          </View>
          
          <View style={styles.faqItem}>
            <Text style={styles.faqQuestion}>Yeni kayıt olduğumda jeton alabilir miyim?</Text>
            <Text style={styles.faqAnswer}>Evet! Yeni kayıt olan kullanıcılara 10 jeton (1 fal) hediye edilmektedir.</Text>
          </View>
        </View>
      </ScrollView>
      
      {/* Seçilen paket varsa satın alma butonu göster */}
      {selectedPackage && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarContent}>
            <View>
              <Text style={styles.selectedPackageText}>{selectedPackage.name}</Text>
              <Text style={styles.selectedPackageTokens}>{selectedPackage.tokens} Jeton</Text>
            </View>
            <Animated.View style={{
              transform: [{ scale: buttonScale }]
            }}>
              <Pressable 
                style={[styles.purchaseButton, { backgroundColor: colors.success }]}
                onPress={() => handlePurchase(selectedPackage)}
                android_ripple={{ color: 'rgba(255,255,255,0.2)', borderless: false }}
                disabled={loading}
                onPressIn={() => animateButton(0.95)}
                onPressOut={() => animateButton(1)}
              >
                {loading && loadingPackageId === selectedPackage.id ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <Text style={styles.purchaseButtonText}>{selectedPackage.price} Öde</Text>
                )}
              </Pressable>
            </Animated.View>
          </View>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginBottom: 65,
  },
  header: {
    paddingTop: StatusBar.currentHeight + 10,
    paddingBottom: 15,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 20,
    borderBottomRightRadius: 20,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tokenText: {
    color: colors.text.light,
    fontWeight: 'bold',
    marginLeft: 6,
  },
  scrollContent: {
    paddingBottom: 100,
  },
  banner: {
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 16,
    overflow: 'hidden',
  },
  bannerContent: {
    flexDirection: 'row',
    padding: 20,
    alignItems: 'center',
  },
  bannerTextContainer: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  bannerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    opacity: 0.8,
  },
  bannerImageContainer: {
    width: 80,
    height: 80,
    justifyContent: 'center',
    alignItems: 'center',
  },
  bannerImage: {
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  section: {
    marginTop: 25,
    paddingHorizontal: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 15,
  },
  offersContainer: {
    paddingRight: 20,
  },
  offerCard: {
    width: width * 0.7,
    height: 150,
    marginRight: 15,
    borderRadius: 16,
    overflow: 'hidden',
  },
  offerGradient: {
    flex: 1,
    padding: 15,
    justifyContent: 'space-between',
  },
  offerBadge: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: colors.secondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  offerBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.background,
  },
  offerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  offerDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 15,
  },
  offerFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  offerExpiry: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  offerButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  offerButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  packageCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPackage: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderRadius: 12,
    zIndex: 1,
  },
  popularText: {
    color: colors.background,
    fontSize: 12,
    fontWeight: 'bold',
  },
  packageHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  packageName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 4,
  },
  packageDescription: {
    fontSize: 13,
    color: colors.text.tertiary,
    maxWidth: width * 0.5,
  },
  packageIconContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
  },
  packageTokens: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 5,
  },
  packageDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  packageFeatures: {
    flex: 1,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 6,
  },
  featureText: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.text.secondary,
  },
  packagePricing: {
    alignItems: 'flex-end',
  },
  originalPrice: {
    fontSize: 14,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
    marginBottom: 4,
  },
  priceRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  packagePrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  discountBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    marginLeft: 8,
  },
  discountText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  buyButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    transform: [{scale: 1}], // Animasyon için başlangıç değeri
    // Android ripple efekti
    android_ripple: {
      color: 'rgba(255,255,255,0.2)',
      borderless: false,
    },
  },
  buyButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  reasonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  reasonCard: {
    width: '31%',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 12,
    alignItems: 'center',
  },
  reasonIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 10,
  },
  reasonTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
    textAlign: 'center',
  },
  reasonText: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  faqSection: {
    marginTop: 25,
    backgroundColor: colors.card,
    marginHorizontal: 20,
    borderRadius: 16,
    padding: 16,
  },
  faqItem: {
    marginBottom: 16,
  },
  faqQuestion: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  faqAnswer: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  bottomBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: colors.card,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  bottomBarContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  selectedPackageText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  selectedPackageTokens: {
    fontSize: 14,
    color: colors.text.tertiary,
  },
  purchaseButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 120,
  },
  purchaseButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: colors.text.tertiary,
    marginBottom: 15,
    marginTop: -10,
  },
  subscriptionCard: {
    backgroundColor: colors.card,
    borderRadius: 16,
    marginBottom: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  popularSubscription: {
    borderColor: colors.secondary,
    borderWidth: 2,
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  subscriptionName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  subscriptionPrice: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  perMonth: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.text.tertiary,
  },
  subscriptionFeatures: {
    marginBottom: 15,
  },
  subscriptionButton: {
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    paddingVertical: 12,
  },
  subscriptionButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  premiumFeature: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    padding: 8,
    borderRadius: 8,
  },
  premiumFeatureText: {
    marginLeft: 8,
    fontSize: 13,
    color: colors.secondary,
    fontWeight: 'bold',
  },
});

export default TokenStoreScreen; 