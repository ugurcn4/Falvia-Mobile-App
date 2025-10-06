import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  RefreshControl,
  ScrollView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

// Auth Context
import { useAuth } from '../context/AuthContext';

// Servisler
import FortuneTellerChatService from '../services/fortuneTellerChatService';

const FortuneTellerListScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [fortuneTellers, setFortuneTellers] = useState([]);
  const [filteredFortuneTellers, setFilteredFortuneTellers] = useState([]);
  const [favorites, setFavorites] = useState([]);
  const [userChats, setUserChats] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [filter, setFilter] = useState('all'); // 'all', 'available', 'favorites', 'chats'

  // Animasyonlar
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    loadData();
  }, [user]);

  useEffect(() => {
    applyFilter();
  }, [filter, fortuneTellers, favorites, userChats]);

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadFortuneTellers(),
        loadFavorites(),
        loadUserChats()
      ]);
      startAnimations();
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const loadFortuneTellers = async () => {
    const { data, error } = await FortuneTellerChatService.getAllFortuneTellers();
    if (error) {
      console.error('Falcı listesi hatası:', error);
      return;
    }
    setFortuneTellers(data || []);
  };

  const loadFavorites = async () => {
    if (!user) return;
    const { data, error } = await FortuneTellerChatService.getFavoriteFortuneTellers(user.id);
    if (error) {
      console.error('Favori listesi hatası:', error);
      return;
    }
    setFavorites(data?.map(f => f.fortune_teller_id) || []);
  };

  const loadUserChats = async () => {
    if (!user) return;
    const { data, error } = await FortuneTellerChatService.getUserChats(user.id);
    if (error) {
      console.error('Sohbet listesi hatası:', error);
      return;
    }
    setUserChats(data || []);
  };

  const applyFilter = () => {
    let filtered = [];

    if (filter === 'chats') {
      // Sohbet geçmişi olan falcıları göster
      filtered = userChats.map(chat => ({
        ...chat.fortune_teller,
        chatInfo: {
          last_message: chat.last_message,
          last_message_time: chat.last_message_time,
          total_messages: chat.total_messages,
          total_tokens_spent: chat.total_tokens_spent,
          unread_count: chat.unread_count,
          chat_id: chat.id
        }
      }));
    } else {
      filtered = [...fortuneTellers];

      if (filter === 'available') {
        filtered = filtered.filter(ft => ft.is_available);
      } else if (filter === 'favorites') {
        filtered = filtered.filter(ft => favorites.includes(ft.id));
      }
    }

    setFilteredFortuneTellers(filtered);
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleFortuneTellerPress = async (fortuneTeller) => {
    // Müsait değilse uyarı göster
    if (!fortuneTeller.is_available) {
      Alert.alert(
        'Falcı Müsait Değil',
        `${fortuneTeller.name} şu anda müsait değil. Lütfen daha sonra tekrar deneyin.`,
        [{ text: 'Tamam' }]
      );
      return;
    }

    // Token kontrolü
    const { hasEnough, currentBalance } = await FortuneTellerChatService.checkUserTokenBalance(
      user.id, 
      fortuneTeller.message_price
    );

    if (!hasEnough) {
      Alert.alert(
        'Yetersiz Jeton',
        `Bu falcı ile sohbet etmek için ${fortuneTeller.message_price} jeton gerekli. Mevcut bakiyeniz: ${currentBalance} jeton.`,
        [
          { text: 'İptal', style: 'cancel' },
          { 
            text: 'Jeton Al', 
            onPress: () => navigation.navigate('TokenStore')
          }
        ]
      );
      return;
    }

    // Sohbet ekranına git
    navigation.navigate('FortuneTellerChat', {
      fortuneTeller: fortuneTeller
    });
  };

  const handleToggleFavorite = async (fortuneTellerId, isFavorite) => {
    const newFavoriteStatus = !isFavorite;
    
    // Optimistic update
    if (newFavoriteStatus) {
      setFavorites([...favorites, fortuneTellerId]);
    } else {
      setFavorites(favorites.filter(id => id !== fortuneTellerId));
    }

    // Server'a gönder
    const { success } = await FortuneTellerChatService.toggleFavoriteFortuneTeller(
      user.id,
      fortuneTellerId,
      newFavoriteStatus
    );

    if (!success) {
      // Hata varsa geri al
      if (newFavoriteStatus) {
        setFavorites(favorites.filter(id => id !== fortuneTellerId));
      } else {
        setFavorites([...favorites, fortuneTellerId]);
      }
      Alert.alert('Hata', 'Favori güncellenirken bir hata oluştu.');
    }
  };

  const renderFilterButton = (filterType, label, icon) => {
    const isActive = filter === filterType;
    return (
      <TouchableOpacity
        style={[styles.filterButton, isActive && styles.filterButtonActive]}
        onPress={() => setFilter(filterType)}
      >
        <MaterialCommunityIcons 
          name={icon} 
          size={18} 
          color={isActive ? colors.background : colors.text.light} 
        />
        <Text style={[
          styles.filterButtonText,
          isActive && styles.filterButtonTextActive
        ]}>
          {label}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderFortuneTellerItem = ({ item, index }) => {
    const isFavorite = favorites.includes(item.id);
    
    return (
      <Animated.View
        style={[
          styles.fortuneTellerCard,
          {
            opacity: fadeAnim,
            transform: [{ translateY: slideAnim }]
          }
        ]}
      >
        <TouchableOpacity
          activeOpacity={0.8}
          onPress={() => handleFortuneTellerPress(item)}
        >
          <LinearGradient
            colors={item.is_available 
              ? ['rgba(74, 0, 128, 0.3)', 'rgba(74, 0, 128, 0.1)']
              : ['rgba(42, 42, 64, 0.3)', 'rgba(42, 42, 64, 0.1)']
            }
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.cardGradient}
          >
            {/* Favori Butonu */}
            <TouchableOpacity
              style={styles.favoriteButton}
              onPress={() => handleToggleFavorite(item.id, isFavorite)}
            >
              <Ionicons
                name={isFavorite ? "heart" : "heart-outline"}
                size={24}
                color={isFavorite ? colors.error : colors.text.tertiary}
              />
            </TouchableOpacity>

            {/* Üst Bilgiler */}
            <View style={styles.cardHeader}>
              <View style={styles.avatarContainer}>
                {item.profile_image ? (
                  <Image 
                    source={{ uri: item.profile_image }} 
                    style={styles.avatar}
                  />
                ) : (
                  <View style={styles.avatarPlaceholder}>
                    <MaterialCommunityIcons
                      name="crystal-ball"
                      size={40}
                      color={colors.secondary}
                    />
                  </View>
                )}
                {/* Online Göstergesi */}
                {item.is_available && (
                  <View style={styles.onlineBadge}>
                    <View style={styles.onlineDot} />
                  </View>
                )}
              </View>

              <View style={styles.cardInfo}>
                <Text style={styles.fortuneTellerName}>{item.name}</Text>
                
                <View style={styles.experienceRow}>
                  <MaterialCommunityIcons
                    name="star-circle"
                    size={16}
                    color={colors.secondary}
                  />
                  <Text style={styles.experienceText}>
                    {item.experience_years} yıl deneyim
                  </Text>
                </View>

                <View style={styles.ratingRow}>
                  <Ionicons name="star" size={16} color={colors.secondary} />
                  <Text style={styles.ratingText}>
                    {item.rating.toFixed(1)} • {item.total_readings} yorum
                  </Text>
                </View>
              </View>
            </View>

            {/* Sohbet Bilgisi (eğer sohbetlerim filtresindeyse) */}
            {item.chatInfo && (
              <View style={styles.chatInfoContainer}>
                <View style={styles.chatInfoRow}>
                  <MaterialCommunityIcons
                    name="message-text-outline"
                    size={14}
                    color={colors.text.tertiary}
                  />
                  <Text style={styles.chatInfoText} numberOfLines={1}>
                    {item.chatInfo.last_message || 'Sohbet başladı'}
                  </Text>
                </View>
                <View style={styles.chatMetaRow}>
                  <Text style={styles.chatMetaText}>
                    {item.chatInfo.total_messages} mesaj
                  </Text>
                  <View style={styles.chatMetaDot} />
                  <MaterialCommunityIcons
                    name="diamond-outline"
                    size={12}
                    color={colors.secondary}
                  />
                  <Text style={[styles.chatMetaText, { color: colors.secondary }]}>
                    {item.chatInfo.total_tokens_spent} harcandı
                  </Text>
                  {item.chatInfo.unread_count > 0 && (
                    <>
                      <View style={styles.chatMetaDot} />
                      <View style={styles.unreadBadge}>
                        <Text style={styles.unreadText}>
                          {item.chatInfo.unread_count}
                        </Text>
                      </View>
                    </>
                  )}
                </View>
              </View>
            )}

            {/* Bio (sadece sohbetlerim filtresinde değilse) */}
            {!item.chatInfo && item.bio && (
              <Text style={styles.bio} numberOfLines={2}>
                {item.bio}
              </Text>
            )}

            {/* Uzmanlıklar */}
            {item.specialties && item.specialties.length > 0 && (
              <View style={styles.specialtiesContainer}>
                {item.specialties.slice(0, 3).map((specialty, idx) => (
                  <View key={idx} style={styles.specialtyBadge}>
                    <Text style={styles.specialtyText}>{specialty}</Text>
                  </View>
                ))}
                {item.specialties.length > 3 && (
                  <View style={styles.specialtyBadge}>
                    <Text style={styles.specialtyText}>
                      +{item.specialties.length - 3}
                    </Text>
                  </View>
                )}
              </View>
            )}

            {/* Alt Bilgiler */}
            <View style={styles.cardFooter}>
              <View style={styles.footerItem}>
                <MaterialCommunityIcons
                  name="clock-outline"
                  size={16}
                  color={colors.text.tertiary}
                />
                <Text style={styles.footerText}>
                  Ort. {item.average_response_time || 5} dk
                </Text>
              </View>

              <View style={styles.footerDivider} />

              <View style={styles.footerItem}>
                <MaterialCommunityIcons
                  name="diamond-outline"
                  size={16}
                  color={colors.secondary}
                />
                <Text style={[styles.footerText, { color: colors.secondary }]}>
                  {item.message_price}/mesaj
                </Text>
              </View>

              <View style={styles.footerDivider} />

              {/* Durum Badge - Footer içinde */}
              <View style={styles.footerItem}>
                <View style={[
                  styles.statusBadgeInline,
                  item.is_available ? styles.statusAvailable : styles.statusUnavailable
                ]}>
                  <View style={[
                    styles.statusDot,
                    !item.is_available && { backgroundColor: colors.text.tertiary }
                  ]} />
                  <Text style={styles.statusText}>
                    {item.is_available ? 'Müsait' : 'Meşgul'}
                  </Text>
                </View>
              </View>
            </View>
          </LinearGradient>
        </TouchableOpacity>
      </Animated.View>
    );
  };

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.light} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Falcılarımız</Text>
          <Text style={styles.headerSubtitle}>
            {filteredFortuneTellers.length} falcı
          </Text>
        </View>
        <View style={{ width: 40 }} />
      </View>

      {/* Filtreler */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={[styles.filtersContainer, { paddingRight: spacing.lg }]}
        style={styles.filtersScrollView}
      >
        {renderFilterButton('all', 'Tümü', 'account-group')}
        {renderFilterButton('chats', 'Sohbetlerim', 'chat-processing')}
        {renderFilterButton('available', 'Müsait', 'account-check')}
        {renderFilterButton('favorites', 'Favoriler', 'heart')}
      </ScrollView>

      {/* Bilgi Kartı */}
      <View style={styles.infoCard}>
        <MaterialCommunityIcons
          name="information-outline"
          size={20}
          color={colors.info}
        />
        <Text style={styles.infoText}>
          Her mesaj için falcının belirlediği jeton ücreti kesilir. 
          Falcı yanıtları ücretsizdir.
        </Text>
      </View>
    </View>
  );

  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons
        name={filter === 'chats' ? 'chat-outline' : 'account-search'}
        size={64}
        color={colors.text.tertiary}
      />
      <Text style={styles.emptyTitle}>
        {filter === 'chats' 
          ? 'Henüz sohbet yok' 
          : filter === 'favorites' 
          ? 'Favori falcı yok' 
          : 'Falcı bulunamadı'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {filter === 'chats'
          ? 'Bir falcı ile sohbet başlatarak buradan takip edebilirsiniz.'
          : filter === 'favorites' 
          ? 'Henüz favori falcı eklemediniz.'
          : filter === 'available'
          ? 'Şu anda müsait falcı bulunmuyor.'
          : 'Henüz falcı eklenmemiş.'
        }
      </Text>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Falcılar yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" />
      <LinearGradient
        colors={[colors.background, colors.primaryDark, colors.background]}
        style={styles.backgroundGradient}
        start={{ x: 0.5, y: 0 }}
        end={{ x: 0.5, y: 1 }}
      >
        <SafeAreaView style={styles.safeArea}>
          <FlatList
            data={filteredFortuneTellers}
            renderItem={renderFortuneTellerItem}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListEmptyComponent={renderEmptyState}
            contentContainerStyle={styles.listContent}
            showsVerticalScrollIndicator={false}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                tintColor={colors.secondary}
                colors={[colors.secondary, colors.primary]}
              />
            }
          />
        </SafeAreaView>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondary,
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    width: '100%',
  },
  listContent: {
    flexGrow: 1,
    paddingBottom: 100, // Alt boşluk
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl, // Üst boşluk
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xxl,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  filtersScrollView: {
    marginBottom: spacing.lg,
    paddingHorizontal: spacing.lg,
  },
  filtersContainer: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  filterButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderWidth: 1,
    borderColor: 'transparent',
    gap: spacing.xs,
    minWidth: 100,
  },
  filterButtonActive: {
    backgroundColor: colors.secondary,
    borderColor: colors.secondary,
  },
  filterButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.light,
  },
  filterButtonTextActive: {
    color: colors.background,
    fontWeight: typography.fontWeight.bold,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
    gap: spacing.sm,
  },
  infoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  fortuneTellerCard: {
    marginHorizontal: spacing.lg,
    marginBottom: spacing.md,
  },
  cardGradient: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    ...shadows.md,
  },
  favoriteButton: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    zIndex: 10,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardHeader: {
    flexDirection: 'row',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  avatarPlaceholder: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  onlineBadge: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  onlineDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
  },
  cardInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  fortuneTellerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  experienceRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  experienceText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  ratingText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  bio: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: spacing.md,
  },
  chatInfoContainer: {
    backgroundColor: 'rgba(255, 215, 0, 0.05)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  chatInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    marginBottom: spacing.xs,
  },
  chatInfoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    fontStyle: 'italic',
  },
  chatMetaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  chatMetaText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  chatMetaDot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
    backgroundColor: colors.text.tertiary,
    marginHorizontal: spacing.xs,
  },
  unreadBadge: {
    backgroundColor: colors.error,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.light,
    fontWeight: typography.fontWeight.bold,
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    marginBottom: spacing.md,
  },
  specialtyBadge: {
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  specialtyText: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  cardFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: spacing.md,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.1)',
  },
  footerItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  footerDivider: {
    width: 1,
    height: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    marginHorizontal: spacing.sm,
  },
  footerText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  statusBadgeInline: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    paddingHorizontal: spacing.sm,
    paddingVertical: 4,
    borderRadius: radius.sm,
  },
  statusAvailable: {
    backgroundColor: 'rgba(76, 175, 80, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(76, 175, 80, 0.5)',
  },
  statusUnavailable: {
    backgroundColor: 'rgba(158, 158, 158, 0.2)',
    borderWidth: 1,
    borderColor: 'rgba(158, 158, 158, 0.5)',
  },
  statusDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.success,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.light,
    fontWeight: typography.fontWeight.medium,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingTop: spacing.xxl * 2,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
});

export default FortuneTellerListScreen;

