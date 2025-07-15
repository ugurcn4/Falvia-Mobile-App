import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, ScrollView, TouchableOpacity, Image, StatusBar, ImageBackground, Dimensions, RefreshControl } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { supabase } from '../../lib/supabase';
import { getAllFortuneTellers } from '../services/supabaseService';

const { width } = Dimensions.get('window');

const HomeScreen = ({ navigation }) => {
  const [activeCategory, setActiveCategory] = useState(1);
  const [userTokens, setUserTokens] = useState(0);
  const [firstName, setFirstName] = useState('');
  const [profileImage, setProfileImage] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [fortuneTellers, setFortuneTellers] = useState([]);
  const [loading, setLoading] = useState(true);

  // Kullanıcının bilgilerini al
  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('token_balance, first_name, profile_image')
          .eq('id', user.id)
          .single();
        
        if (data && !error) {
          setUserTokens(data.token_balance);
          if (data.first_name) {
            setFirstName(data.first_name);
          }
          if (data.profile_image) {
            setProfileImage(data.profile_image);
          }
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
    } catch (error) {
      console.error('Falcılar getirilemedi:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchUserData();
    fetchFortuneTellers();
  }, []);

  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
    fetchFortuneTellers();
  };

  // Falcı müsaitlik durumu için renk
  const getAvailabilityColor = (isAvailable) => {
    return isAvailable ? colors.success : colors.error;
  };

  // Falcı müsaitlik durumu için metin
  const getAvailabilityText = (isAvailable) => {
    return isAvailable ? 'Müsait' : 'Meşgul';
  };

  // Fal kategorileri
  const categories = [
    { id: 1, name: 'Kahve Falı', icon: 'coffee', iconType: 'material', color: colors.primary },
    { id: 2, name: 'Tarot', icon: 'cards', iconType: 'material', color: colors.primaryLight },
    { id: 3, name: 'El Falı', icon: 'hand-left', iconType: 'ionicons', color: colors.info },
    { id: 4, name: 'Astroloji', icon: 'star-four-points', iconType: 'material', color: colors.secondary },
  ];

  // Günün önerileri
  const dailyRecommendations = [
    { id: 1, title: 'Aşk Falı', description: 'İlişkinizin geleceğini öğrenin', icon: 'heart', color: colors.social.google },
    { id: 2, title: 'Kariyer Falı', description: 'İş hayatınızdaki fırsatlar', icon: 'briefcase', color: colors.warning },
    { id: 3, title: 'Şans Falı', description: 'Şansınızı keşfedin', icon: 'dice', color: colors.primaryLight },
  ];

  const renderIcon = (item) => {
    if (item.iconType === 'material') {
      return <MaterialCommunityIcons name={item.icon} size={24} color={colors.text.light} />;
    }
    return <Ionicons name={item.icon} size={24} color={colors.text.light} />;
  };

  // Falcı kartına tıklama
  const handleFortuneTellerPress = (teller) => {
    // Fal oluşturma sayfasına yönlendir
    navigation.navigate('NewFortune', { 
      fortuneType: { 
        id: 1, 
        name: teller.specialties?.[0] || 'Kahve Falı' 
      } 
    });
  };

  // Keşfet sayfasına yönlendir
  const handleExplorePress = () => {
    navigation.navigate('Explore');
  };

  // Fal geçmişi sayfasına yönlendir
  const handleFortuneHistoryPress = () => {
    navigation.navigate('FortuneHistory');
  };

  // Kategori seçimi
  const handleCategoryPress = (category) => {
    setActiveCategory(category.id);
    navigation.navigate('NewFortune', { 
      fortuneType: { 
        id: category.id, 
        name: category.name 
      } 
    });
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
            <View>
              <Text style={styles.greeting}>Merhaba{firstName ? `, ${firstName}` : ''}!</Text>
              <Text style={styles.subtitle}>Bugün şansın ne diyor?</Text>
            </View>
            <View style={styles.headerRightContainer}>
              {/* Jeton Bilgisi */}
              <View style={styles.tokenContainer}>
                <MaterialCommunityIcons name="diamond" size={18} color={colors.secondary} />
                <Text style={styles.tokenText}>{userTokens}</Text>
                <TouchableOpacity 
                  style={styles.addTokenButton}
                  onPress={() => navigation.navigate('TokenStore')}
                >
                  <Ionicons name="add" size={14} color="#fff" />
                </TouchableOpacity>
              </View>
              
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
                  <Ionicons name="person" size={20} color={colors.text.light} />
                )}
              </TouchableOpacity>
            </View>
          </View>
          
          {/* Arama ve Bildirim */}
          <View style={styles.searchRow}>
            <TouchableOpacity 
              style={styles.searchBar}
              onPress={handleExplorePress}
            >
              <Ionicons name="search" size={20} color="#666" />
              <Text style={styles.searchText}>Falcı veya fal türü ara...</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.notificationButton}>
              <Ionicons name="notifications" size={22} color={colors.text.light} />
              <View style={styles.notificationBadge} />
            </TouchableOpacity>
          </View>
        </LinearGradient>

        {/* Kategoriler */}
        <View style={styles.categoriesSection}>
          <View style={[styles.sectionHeader, styles.categorySectionHeader]}>
            <Text style={styles.sectionTitle}>Fal Kategorileri</Text>
            <TouchableOpacity onPress={handleExplorePress}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.categoriesContainer}
            style={styles.categoriesScrollView}
          >
            {categories.map((category) => (
              <TouchableOpacity 
                key={category.id} 
                style={[
                  styles.categoryItem,
                  activeCategory === category.id && styles.activeCategoryItem
                ]}
                onPress={() => handleCategoryPress(category)}
              >
                <LinearGradient
                  colors={activeCategory === category.id ? 
                    [category.color, colors.primary] : 
                    [colors.card, colors.primaryDark]}
                  style={[styles.categoryIcon, activeCategory === category.id && styles.activeIcon]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  {renderIcon(category)}
                </LinearGradient>
                <Text 
                  style={[
                    styles.categoryName,
                    activeCategory === category.id && styles.activeCategoryName
                  ]}
                >
                  {category.name}
                </Text>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Günün Önerileri */}
        <View style={styles.recommendationsSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Günün Önerileri</Text>
            <TouchableOpacity onPress={handleExplorePress}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false} 
            contentContainerStyle={styles.recommendationsContainer}
          >
            {dailyRecommendations.map((item) => (
              <TouchableOpacity 
                key={item.id} 
                style={styles.recommendationCard}
                onPress={() => navigation.navigate('NewFortune', { 
                  fortuneType: { id: item.id, name: item.title } 
                })}
              >
                <LinearGradient
                  colors={[item.color, colors.primary]}
                  style={styles.recommendationGradient}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons name={item.icon} size={30} color={colors.text.light} />
                  <View style={styles.recommendationContent}>
                    <Text style={styles.recommendationTitle}>{item.title}</Text>
                    <Text style={styles.recommendationDescription}>{item.description}</Text>
                  </View>
                </LinearGradient>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>

        {/* Popüler Falcılar */}
        <View style={styles.tellersSection}>
          <View style={styles.sectionHeader}>
            <Text style={styles.sectionTitle}>Popüler Falcılar</Text>
            <TouchableOpacity onPress={handleExplorePress}>
              <Text style={styles.seeAllText}>Tümünü Gör</Text>
            </TouchableOpacity>
          </View>
          
          {loading ? (
            <View style={styles.loadingContainer}>
              <Text style={styles.loadingText}>Falcılar yükleniyor...</Text>
            </View>
          ) : fortuneTellers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>Henüz falcı bulunmuyor</Text>
            </View>
          ) : (
            fortuneTellers.slice(0, 4).map((teller) => (
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
                    <Text style={styles.priceText}>{teller.price_per_fortune} jeton</Text>
                  </View>
                </View>
                
                <TouchableOpacity 
                  style={styles.messageButton}
                  onPress={() => handleFortuneTellerPress(teller)}
                >
                  <LinearGradient
                    colors={[colors.primary, colors.primaryDark]}
                    style={styles.messageButtonGradient}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                  >
                    <Ionicons name="chatbubble-ellipses" size={18} color={colors.text.light} />
                  </LinearGradient>
                </TouchableOpacity>
              </TouchableOpacity>
            ))
          )}
        </View>
      </ScrollView>

      {/* Alt Menü */}
      <View style={styles.bottomMenu}>
        <TouchableOpacity style={styles.menuItem}>
          <Ionicons name="home" size={24} color={colors.primary} />
          <Text style={[styles.menuText, styles.activeMenuText]}>Ana Sayfa</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleExplorePress}
        >
          <Ionicons name="search" size={24} color="#999" />
          <Text style={styles.menuText}>Keşfet</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.cameraButton}
          onPress={() => navigation.navigate('NewFortune', { 
            fortuneType: { id: 1, name: 'Kahve Falı' } 
          })}
        >
          <LinearGradient
            colors={[colors.primary, colors.primaryDark]}
            style={styles.cameraButtonGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <Ionicons name="camera" size={24} color={colors.text.light} />
          </LinearGradient>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={handleFortuneHistoryPress}
        >
          <Ionicons name="chatbubbles" size={24} color="#999" />
          <Text style={styles.menuText}>Mesajlar</Text>
        </TouchableOpacity>
        <TouchableOpacity 
          style={styles.menuItem}
          onPress={() => navigation.navigate('Profile')}
        >
          <Ionicons name="person" size={24} color="#999" />
          <Text style={styles.menuText}>Profil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomLeftRadius: 30,
    borderBottomRightRadius: 30,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerRightContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 20,
    paddingHorizontal: 10,
    paddingVertical: 5,
    marginRight: 10,
  },
  tokenText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 5,
    marginRight: 5,
  },
  addTokenButton: {
    backgroundColor: colors.success,
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  greeting: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: colors.text.secondary,
  },
  profileButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
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
    paddingVertical: 10,
    marginRight: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  searchText: {
    marginLeft: 10,
    fontSize: 14,
    color: colors.text.tertiary,
  },
  notificationButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  notificationBadge: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.error,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
    paddingHorizontal: 20,
  },
  categorySectionHeader: {
    marginBottom: 20,
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
  categoriesSection: {
    marginTop: 10,
    marginBottom: 10,
    paddingTop: 10,
  },
  categoriesContainer: {
    paddingHorizontal: 15,
    paddingTop: 10,
  },
  categoriesScrollView: {
    paddingTop: 5,
  },
  categoryItem: {
    alignItems: 'center',
    marginHorizontal: 8,
    width: 80,
  },
  activeCategoryItem: {
    transform: [{ scale: 1.05 }],
  },
  categoryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  activeIcon: {
    borderWidth: 2,
    borderColor: colors.secondary,
    shadowOpacity: 0.5,
    shadowRadius: 6,
    elevation: 8,
  },
  categoryName: {
    fontSize: 13,
    textAlign: 'center',
    color: colors.text.tertiary,
    fontWeight: '500',
  },
  activeCategoryName: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  recommendationsSection: {
    marginVertical: 15,
  },
  recommendationsContainer: {
    paddingHorizontal: 15,
    paddingBottom: 10,
  },
  recommendationCard: {
    width: width * 0.7,
    height: 100,
    marginHorizontal: 8,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 8,
  },
  recommendationGradient: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  recommendationContent: {
    marginLeft: 15,
  },
  recommendationTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  recommendationDescription: {
    fontSize: 13,
    color: colors.text.secondary,
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
  bottomMenu: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 70,
    backgroundColor: colors.card,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 10,
    paddingHorizontal: 10,
    borderTopWidth: 1,
    borderColor: colors.border,
  },
  menuItem: {
    alignItems: 'center',
    justifyContent: 'center',
  },
  menuText: {
    fontSize: 12,
    marginTop: 4,
    color: colors.text.tertiary,
  },
  activeMenuText: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  cameraButton: {
    width: 50,
    height: 50,
    borderRadius: 25,
    overflow: 'hidden',
    marginTop: -20,
    borderWidth: 2,
    borderColor: colors.border,
  },
  cameraButtonGradient: {
    width: '100%',
    height: '100%',
    alignItems: 'center',
    justifyContent: 'center',
  },
});

export default HomeScreen; 