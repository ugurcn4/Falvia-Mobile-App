import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Image,
  ActivityIndicator,
  RefreshControl,
  FlatList,
  Alert
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';
import adMobService from '../services/adMobService';

const FortuneHistoryScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fortunes, setFortunes] = useState([]);
  const [filter, setFilter] = useState('all'); // 'all', 'completed', 'pending'

  // Falları getir
  const fetchFortunes = async () => {
    try {
      setLoading(true);
      
      // Kullanıcı oturumu kontrolü
      const { data: { user: authUser } } = await supabase.auth.getUser();
      
      if (!authUser) {
        setLoading(false);
        return;
      }
      
      // Kullanıcının fallarını getir
      let query = supabase
        .from('fortunes')
        .select(`
          *,
          fortune_tellers:fortune_teller_id (
            id,
            name,
            profile_image,
            rating,
            experience_years
          )
        `)
        .eq('user_id', authUser.id)
        .order('created_at', { ascending: false });
      
      // Filtreleme
      if (filter === 'completed') {
        query = query.eq('status', 'completed');
      } else if (filter === 'pending') {
        query = query.in('status', ['pending', 'in_progress']);
      }
      
      const { data, error } = await query;
      
      if (error) {
        console.error('Fallar getirilirken hata:', error);
        setLoading(false);
        return;
      }
      
      setFortunes(data || []);
      
    } catch (error) {
      console.error('Veri çekerken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // İlk yükleme
  useEffect(() => {
    fetchFortunes();
  }, [filter]);

  // Yenileme işlemi
  const onRefresh = () => {
    setRefreshing(true);
    fetchFortunes();
  };

  // Fal durumuna göre renk ve metin
  const getStatusInfo = (status) => {
    switch(status) {
      case 'completed':
        return {
          color: colors.success,
          text: 'Tamamlandı',
          icon: 'checkmark-circle'
        };
      case 'in_progress':
        return {
          color: colors.warning,
          text: 'İnceleniyor',
          icon: 'time'
        };
      case 'pending':
        return {
          color: colors.info,
          text: 'Bekliyor',
          icon: 'hourglass'
        };
      case 'cancelled':
        return {
          color: colors.error,
          text: 'İptal Edildi',
          icon: 'close-circle'
        };
      default:
        return {
          color: colors.text.tertiary,
          text: 'Bilinmiyor',
          icon: 'help-circle'
        };
    }
  };

  // Fal türüne göre ikon
  const getFortuneTypeIcon = (type) => {
    switch(type?.toLowerCase()) {
      case 'kahve falı':
        return 'cafe';
      case 'tarot falı':
        return 'albums';
      case 'el falı':
        return 'hand-left';
      case 'yıldızname':
        return 'star';
      default:
        return 'sparkles';
    }
  };

  // Fal detay sayfasına git
  const goToFortuneDetail = (fortune) => {
    navigation.navigate('FortuneDetail', { fortuneId: fortune.id });
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
        await AsyncStorage.setItem(watchedAdsKey, newWatchedAds.toString());
        
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
          fetchFortunes();
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
      const watchedAdsKey = `@fortune_ads_${fortuneId}`;
      await AsyncStorage.setItem(watchedAdsKey, '2');

      // Falları yeniden yükle
      fetchFortunes();
      
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

  // Fal için izlenen reklam sayısını getir
  const getFortuneAdProgress = async (fortuneId) => {
    try {
      const watchedAdsKey = `@fortune_ads_${fortuneId}`;
      const watchedAds = await AsyncStorage.getItem(watchedAdsKey);
      return watchedAds ? parseInt(watchedAds, 10) : 0;
    } catch (error) {
      console.error('Reklam ilerleme durumu alınamadı:', error);
      return 0;
    }
  };

  // Fal kartı render
  const renderFortuneCard = ({ item }) => {
    const statusInfo = getStatusInfo(item.status);
    const date = new Date(item.created_at);
    const formattedDate = date.toLocaleDateString('tr-TR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });
    const formattedTime = date.toLocaleTimeString('tr-TR', {
      hour: '2-digit',
      minute: '2-digit',
    });
    
    return (
      <TouchableOpacity 
        style={styles.fortuneCard}
        onPress={() => goToFortuneDetail(item)}
        activeOpacity={0.8}
      >
        {/* Üst Kısım - Durum ve Tarih */}
        <View style={styles.cardHeader}>
          <View style={[styles.statusBadge, { backgroundColor: statusInfo.color }]}>
            <Ionicons name={statusInfo.icon} size={12} color="#fff" style={{ marginRight: 4 }} />
            <Text style={styles.statusText}>{statusInfo.text}</Text>
          </View>
          <Text style={styles.dateText}>{formattedDate} • {formattedTime}</Text>
        </View>
        
        {/* Orta Kısım - Fal Bilgileri */}
        <View style={styles.cardContent}>
          {/* Fal Türü */}
          <View style={styles.fortuneTypeContainer}>
            <View style={styles.fortuneTypeIconContainer}>
              <Ionicons name={getFortuneTypeIcon(item.fortune_type)} size={18} color="#fff" />
            </View>
            <Text style={styles.fortuneTypeText}>{item.fortune_type || 'Fal'}</Text>
          </View>
          
          {/* Fal Açıklaması */}
          <Text style={styles.fortuneDescription} numberOfLines={2}>
            {item.description || 'Bu fal için açıklama girilmemiş.'}
          </Text>
          
          {/* Falcı Bilgileri */}
          <View style={styles.fortuneTellerContainer}>
            <Image 
              source={{ uri: item.fortune_tellers?.profile_image || 'https://randomuser.me/api/portraits/women/17.jpg' }}
              style={styles.fortuneTellerImage}
            />
            <View style={styles.fortuneTellerInfo}>
              <Text style={styles.fortuneTellerName}>
                {item.fortune_tellers?.name || 'İsimsiz Falcı'}
              </Text>
              <View style={styles.ratingContainer}>
                <Ionicons name="star" size={12} color={colors.secondary} />
                <Text style={styles.ratingText}>
                  {item.fortune_tellers?.rating || '4.5'} • {item.fortune_tellers?.experience_years || '5'} yıl deneyim
                </Text>
              </View>
            </View>
          </View>
        </View>
        
        {/* Alt Kısım - Butonlar */}
        <View style={styles.cardFooter}>
          {item.status === 'completed' && (
            <>
              <TouchableOpacity style={styles.footerButton}>
                <Ionicons name="heart-outline" size={18} color={colors.text.primary} />
                <Text style={styles.footerButtonText}>Favorilere Ekle</Text>
              </TouchableOpacity>
              
              <View style={styles.footerDivider} />
              
              <TouchableOpacity style={styles.footerButton}>
                <Ionicons name="share-social-outline" size={18} color={colors.text.primary} />
                <Text style={styles.footerButtonText}>Paylaş</Text>
              </TouchableOpacity>
            </>
          )}
          
          {(item.status === 'pending' || item.status === 'in_progress') && (
            <>
                            <TouchableOpacity 
                style={[
                  styles.footerButton, 
                  { flex: 1, justifyContent: 'center' },
                  getFortuneAdProgress(item.id) >= 2 && styles.footerButtonDisabled
                ]}
                onPress={() => getFortuneAdProgress(item.id) >= 2 ? null : watchAdForImmediateFortune(item)}
                disabled={getFortuneAdProgress(item.id) >= 2}
              >
                <Ionicons 
                  name={getFortuneAdProgress(item.id) >= 2 ? "checkmark-circle-outline" : "play-circle-outline"} 
                  size={18} 
                  color={getFortuneAdProgress(item.id) >= 2 ? colors.success : colors.primary} 
                />
                <View style={styles.footerButtonContent}>
                  <Text style={[styles.footerButtonText, { 
                    color: getFortuneAdProgress(item.id) >= 2 ? colors.success : colors.primary 
                  }]}>
                    {getFortuneAdProgress(item.id) >= 2 
                      ? "🚀 Zaten Hızlandırıldı!" 
                      : "Reklam İzle ve Daha Kısa Sürede Gör!"
                    }
                  </Text>
                  <Text style={[styles.footerButtonProgressText, { 
                    color: getFortuneAdProgress(item.id) >= 2 ? colors.success : colors.primary 
                  }]}>
                    {getFortuneAdProgress(item.id)}/2
                  </Text>
                </View>
              </TouchableOpacity>
              
              <View style={styles.footerDivider} />
              
              <TouchableOpacity 
                style={[styles.footerButton, { flex: 1, justifyContent: 'center' }]}
                onPress={() => {
                  // İptal etme işlemi
                }}
              >
                <Ionicons name="close-circle-outline" size={18} color={colors.error} />
                <Text style={[styles.footerButtonText, { color: colors.error }]}>İptal Et</Text>
              </TouchableOpacity>
            </>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  // Boş durum gösterimi
  const renderEmptyState = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons name="coffee-off" size={80} color={colors.text.tertiary} />
      <Text style={styles.emptyTitle}>Henüz falınız yok</Text>
      <Text style={styles.emptyText}>
        Fal baktırmak için ana sayfadan "Fal Baktır" butonuna tıklayabilirsiniz.
      </Text>
      <TouchableOpacity 
        style={styles.emptyButton}
        onPress={() => navigation.navigate('NewFortune')}
      >
        <Text style={styles.emptyButtonText}>Fal Baktır</Text>
      </TouchableOpacity>
    </View>
  );

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Fal Geçmişim</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>
      
      {/* Filtre Butonları */}
      <View style={styles.filterContainer}>
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'all' && styles.activeFilterButton]}
          onPress={() => setFilter('all')}
        >
          <Text style={[styles.filterText, filter === 'all' && styles.activeFilterText]}>
            Tümü
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'completed' && styles.activeFilterButton]}
          onPress={() => setFilter('completed')}
        >
          <Text style={[styles.filterText, filter === 'completed' && styles.activeFilterText]}>
            Tamamlanan
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.filterButton, filter === 'pending' && styles.activeFilterButton]}
          onPress={() => setFilter('pending')}
        >
          <Text style={[styles.filterText, filter === 'pending' && styles.activeFilterText]}>
            Bekleyen
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Fal Listesi */}
      {loading && fortunes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={colors.primary} />
          <Text style={styles.loadingText}>Fallarınız yükleniyor...</Text>
        </View>
      ) : (
        <FlatList
          data={fortunes}
          renderItem={renderFortuneCard}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={renderEmptyState}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.primary}
              colors={[colors.primary, colors.secondary]}
            />
          }
        />
      )}
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
    paddingBottom: 15,
    paddingHorizontal: spacing.lg,
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    backgroundColor: colors.card,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  filterButton: {
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.md,
    borderRadius: radius.sm,
    marginRight: spacing.sm,
  },
  activeFilterButton: {
    backgroundColor: colors.primary,
  },
  filterText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  activeFilterText: {
    color: colors.text.light,
    fontWeight: typography.fontWeight.semiBold,
  },
  listContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.xxxl,
  },
  fortuneCard: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.xs / 2,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  dateText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  cardContent: {
    padding: spacing.md,
  },
  fortuneTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  fortuneTypeIconContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  fortuneTypeText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
  },
  fortuneDescription: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: typography.lineHeight.md,
  },
  fortuneTellerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: spacing.sm,
  },
  fortuneTellerImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
    marginRight: spacing.sm,
  },
  fortuneTellerInfo: {
    flex: 1,
  },
  fortuneTellerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.primary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: 4,
  },
  cardFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  footerButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  footerButtonDisabled: {
    opacity: 0.6,
  },
  footerButtonText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    marginLeft: spacing.xs,
    marginBottom: 2,
  },
  footerButtonContent: {
    alignItems: 'center',
  },
  footerButtonProgressText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.primary,
    opacity: 0.8,
  },
  footerDivider: {
    width: 1,
    backgroundColor: colors.border,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xxxl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptyText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  emptyButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    ...shadows.md,
  },
  emptyButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
  },
});

export default FortuneHistoryScreen; 