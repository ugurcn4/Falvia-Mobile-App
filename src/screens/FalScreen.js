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
  const [fortuneTypes, setFortuneTypes] = useState([
    { id: 1, name: 'Kahve Falı', icon: 'coffee', price: 49.99, description: 'Fincanınızdaki sırları keşfedin' },
    { id: 2, name: 'Tarot', icon: 'cards', price: 49.99, description: 'Kartların size söylediklerini öğrenin' },
    { id: 3, name: 'El Falı', icon: 'hand-left', price: 49.99, description: 'Avucunuzdaki geleceği görün' },
    { id: 4, name: 'Yıldızname', icon: 'star-four-points', price: 49.99, description: 'Yıldızların rehberliğinde geleceğe bakın' },
  ]);
  
  // Kullanıcının geçmiş fallarını ve jeton sayısını getir
  useEffect(() => {
    fetchPastFortunes();
    fetchUserTokens();
    
    // Global token güncelleme fonksiyonunu ayarla
    global.updateUserTokens = (newTokens) => {
      setUserTokens(newTokens);
    };
    
    // Component unmount olduğunda temizle
    return () => {
      global.updateUserTokens = null;
    };
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
  
  const fetchPastFortunes = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('fortunes')
          .select(`
            *,
            fortune_teller:fortune_teller_id (
              id, name, profile_image, bio, experience_years, rating
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        setPastFortunes(data || []);
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
  };
  
  const handleNewFortune = (fortuneType) => {
    // Jeton kontrolü yap
    if (userTokens < 10) {
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
  
  const renderIcon = (iconName) => {
    switch (iconName) {
      case 'coffee':
        return <MaterialCommunityIcons name="coffee" size={28} color="#fff" />;
      case 'cards':
        return <MaterialCommunityIcons name="cards" size={28} color="#fff" />;
      case 'hand-left':
        return <Ionicons name="hand-left" size={28} color="#fff" />;
      case 'star-four-points':
        return <MaterialCommunityIcons name="star-four-points" size={28} color="#fff" />;
      default:
        return <MaterialCommunityIcons name="crystal-ball" size={28} color="#fff" />;
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

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header Bölümü */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark, colors.background]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        {/* Background decoration */}
        <View style={styles.headerDecoration}>
          <View style={[styles.floatingOrb, { top: 20, left: 30 }]} />
          <View style={[styles.floatingOrb, { top: 80, right: 80, opacity: 0.3 }]} />
          <View style={[styles.floatingOrb, { bottom: 40, left: 60, opacity: 0.5 }]} />
        </View>
        
        <View style={styles.headerContent}>
          <View style={styles.headerTextContainer}>
            <Text style={styles.headerTitle}>Falınız</Text>
            <Text style={styles.headerSubtitle}>Geleceğinizi keşfedin</Text>
            <View style={styles.headerGlow} />
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
        
        <View style={styles.headerImageContainer}>
          <Image 
            source={require('../../assets/görseller/falci.png')} 
            style={styles.headerImage} 
            resizeMode="contain"
          />
          <View style={styles.headerImageGlow} />
        </View>
      </LinearGradient>
      
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
            
            {fortuneTypes.map((type, index) => (
              <Pressable 
                key={type.id} 
                style={({ pressed }) => [
                  styles.fortuneTypeCard,
                  pressed && styles.fortuneTypeCardPressed
                ]}
                onPress={() => handleNewFortune(type)}
                android_ripple={{ color: 'rgba(255, 215, 0, 0.1)' }}
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
                      {renderIcon(type.icon)}
                      <View style={styles.iconGlow} />
                    </LinearGradient>
                    
                    <View style={styles.fortuneTypeInfo}>
                      <View style={styles.fortuneTypeTextContainer}>
                        <Text style={styles.fortuneTypeName}>{type.name}</Text>
                        <Text style={styles.fortuneTypeDescription}>{type.description}</Text>
                      </View>
                      
                      <View style={styles.priceContainer}>
                        <LinearGradient
                          colors={[colors.secondary, colors.primaryLight]}
                          start={{ x: 0, y: 0 }}
                          end={{ x: 1, y: 0 }}
                          style={styles.priceGradient}
                        >
                          <MaterialCommunityIcons name="diamond" size={16} color={colors.background} />
                          <Text style={styles.priceText}>10</Text>
                        </LinearGradient>
                      </View>
                    </View>
                  </View>
                  
                  {/* Decorative elements */}
                  <View style={[styles.decorativeCircle, { top: 10, right: 15 }]} />
                  <View style={[styles.decorativeCircle, { bottom: 15, left: 10, opacity: 0.3 }]} />
                </LinearGradient>
              </Pressable>
            ))}
            
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
                    onPress={() => navigation.navigate('TokenStore')}
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
            
            {loading && !refreshing ? (
              <ActivityIndicator size="large" color={colors.primary} style={styles.loader} />
            ) : pastFortunes.length > 0 ? (
              pastFortunes.map((fortune, index) => (
                <Pressable 
                  key={fortune.id} 
                  style={({ pressed }) => [
                    styles.pastFortuneCard,
                    pressed && styles.pastFortuneCardPressed
                  ]}
                  onPress={() => navigation.navigate('FortuneDetail', { fortuneId: fortune.id })}
                  android_ripple={{ color: 'rgba(255, 215, 0, 0.1)' }}
                >
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
                          <MaterialCommunityIcons 
                            name={fortune.category === 'kahve' ? 'coffee' : 
                                  fortune.category === 'tarot' ? 'cards' : 
                                  fortune.category === 'el' ? 'hand-left' : 'star-four-points'} 
                            size={16} 
                            color={colors.text.light} 
                          />
                        </LinearGradient>
                        <Text style={styles.pastFortuneTypeText}>
                          {fortune.category === 'kahve' ? 'Kahve Falı' : 
                           fortune.category === 'tarot' ? 'Tarot' : 
                           fortune.category === 'el' ? 'El Falı' : 'Yıldızname'}
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
                    
                    <LinearGradient
                      colors={['rgba(74, 0, 128, 0.1)', 'rgba(255, 215, 0, 0.1)']}
                      start={{ x: 0, y: 0 }}
                      end={{ x: 1, y: 0 }}
                      style={styles.pastFortuneFooter}
                    >
                      <Text style={styles.viewDetailsText}>Detayları Görüntüle</Text>
                      <Ionicons name="chevron-forward" size={16} color={colors.secondary} />
                    </LinearGradient>
                  </LinearGradient>
                </Pressable>
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
                <Pressable 
                  style={({ pressed }) => [
                    styles.emptyButton,
                    pressed && styles.emptyButtonPressed
                  ]}
                  onPress={() => setActiveTab('new')}
                  android_ripple={{ color: 'rgba(255, 255, 255, 0.2)' }}
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
                </Pressable>
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
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
    position: 'relative',
    overflow: 'hidden',
  },
  headerDecoration: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  floatingOrb: {
    position: 'absolute',
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.secondary,
    opacity: 0.1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    zIndex: 1,
  },
  headerTextContainer: {
    flex: 1,
    position: 'relative',
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  headerSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    fontWeight: '500',
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
    right: 20,
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
  fortuneTypeCardPressed: {
    transform: [{ scale: 0.98 }],
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
    marginTop: 15,
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
    color: colors.text.light,
    marginBottom: 8,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  promotionDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    fontWeight: '500',
    lineHeight: 20,
  },
  promotionButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  promotionButtonText: {
    color: colors.text.light,
    fontWeight: '600',
    fontSize: 13,
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
  pastFortuneCardPressed: {
    transform: [{ scale: 0.98 }],
  },
  pastFortuneGradient: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  pastFortuneHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 215, 0, 0.1)',
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
  emptyButtonPressed: {
    transform: [{ scale: 0.98 }],
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
});

export default FalScreen; 