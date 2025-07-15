import React, { useState, useEffect, useRef } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  FlatList,
  SafeAreaView,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
  ToastAndroid,
  Alert,
  Platform,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

// Özel bileşenler
import FortuneStoryCard from '../components/FortuneStoryCard';
import FortuneTellerItem from '../components/FortuneTellerItem';
import SubscriptionInfoBox from '../components/SubscriptionInfoBox';
import FortuneCreateModal from '../components/FortuneCreateModal';

// Auth Context
import { useAuth } from '../context/AuthContext';

// Supabase servisleri
import { 
  getAllFortuneTellers, 
  getPosts, 
  getStories, 
  createPost, 
  likePost, 
  checkIfLiked 
} from '../services/supabaseService';

// Günlük mesajlar - bu kısmı sabit tutabiliriz
const DAILY_MESSAGES = [
  "Bugün sezgilerinize güvenin...",
  "Yıldızlar size yeni fırsatlar getiriyor...",
  "İçinizden gelen sesi dinleyin...",
  "Önünüzdeki engelleri aşmak için sabırlı olun...",
  "Hayatınızdaki değişimlere açık olun..."
];

const ExploreScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [activeFortuneTellers, setActiveFortuneTellers] = useState([]);
  const [fortuneStories, setFortuneStories] = useState([]);
  const [dailyMessage, setDailyMessage] = useState("");
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddButton, setShowAddButton] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);

  // Animasyon değerleri
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;
  const likeAnim = useRef({}).current;

  // İlk yükleme
  useEffect(() => {
    loadInitialData();
    
    // Rastgele günlük mesaj seçimi
    const randomIndex = Math.floor(Math.random() * DAILY_MESSAGES.length);
    setDailyMessage(DAILY_MESSAGES[randomIndex]);
  }, []);

  // Verileri yükle
  const loadInitialData = async () => {
    setLoading(true);
    
    try {
      // Falcıları yükle
      const { data: tellers, error: tellersError } = await getAllFortuneTellers();
      if (tellersError) throw tellersError;
      
      // Eğer admin kullanıcısıysa, falcı ekleme butonu ekle
      let tellersList = [...tellers];
      if (user?.profile?.is_admin) {
        tellersList.push({ 
          id: 'add-teller', 
          name: 'Falcı Ekle', 
          type: 'add'
        });
      }
      setActiveFortuneTellers(tellersList);
      
      // Gönderileri yükle
      const { data: posts, error: postsError } = await getPosts(10, 0);
      if (postsError) throw postsError;
      setFortuneStories(posts || []);
      setHasMorePosts(posts && posts.length === 10);
      
      // Kullanıcı beğenilerini kontrol et
      if (user && posts && posts.length > 0) {
        await checkUserLikes(posts);
      }
      
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Kullanıcı beğenilerini kontrol et
  const checkUserLikes = async (posts) => {
    if (!user) return;
    
    try {
      const postIds = posts.map(post => post.id);
      const likePromises = postIds.map(postId => 
        checkIfLiked(user.id, postId)
      );
      
      const likeResults = await Promise.all(likePromises);
      
      const updatedPosts = [...posts];
      likeResults.forEach((result, index) => {
        if (result.liked) {
          updatedPosts[index].isLiked = true;
        }
      });
      
      setFortuneStories(updatedPosts);
    } catch (error) {
      console.error('Beğeni kontrolü hatası:', error);
    }
  };

  // Daha fazla gönderi yükle
  const loadMorePosts = async () => {
    if (!hasMorePosts || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const { data: morePosts, error } = await getPosts(10, nextPage);
      if (error) throw error;
      
      if (morePosts && morePosts.length > 0) {
        setFortuneStories(prev => [...prev, ...morePosts]);
        setPage(nextPage);
        setHasMorePosts(morePosts.length === 10);
        
        // Yeni gönderilerin beğeni durumunu kontrol et
        if (user) {
          await checkUserLikes(morePosts);
        }
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Daha fazla gönderi yükleme hatası:', error);
    } finally {
      setLoadingMore(false);
    }
  };

  // Hikaye kartları için animasyon başlatma
  const startLikeAnimation = (storyId) => {
    if (!likeAnim[storyId]) {
      likeAnim[storyId] = new Animated.Value(1);
    }
    
    Animated.sequence([
      Animated.timing(likeAnim[storyId], {
        toValue: 1.3,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true
      }),
      Animated.timing(likeAnim[storyId], {
        toValue: 1,
        duration: 200,
        easing: Easing.ease,
        useNativeDriver: true
      })
    ]).start();
  };

  const handleFortuneTellerPress = (teller) => {
    // Eğer "add" tipindeyse ve kullanıcı admin ise falcı ekleme sayfasına yönlendir
    if (teller.type === 'add' && user?.profile?.is_admin) {
      navigation.navigate('AddFortuneTeller');
    } else {
      // Burada falcı profil sayfasına yönlendirilebilir
      // navigation.navigate('FortuneTellerProfile', { tellerId: teller.id });
    }
  };

  const handleLike = async (storyId, isLiked) => {
    if (!user) {
      Alert.alert('Giriş Yapın', 'Beğeni yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    startLikeAnimation(storyId);
    
    try {
      // Beğeni işlemini gerçekleştir
      const { liked, error } = await likePost(user.id, storyId);
      if (error) throw error;
      
      // Beğeni sayısını güncelle
      setFortuneStories(prev => 
        prev.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              likes: isLiked ? story.likes + 1 : Math.max(0, story.likes - 1),
              isLiked: isLiked
            };
          }
          return story;
        })
      );
    } catch (error) {
      console.error('Beğeni hatası:', error);
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu.');
    }
  };

  const handleComment = (storyId) => {
    // Yorum ekranına yönlendirilebilir
    // navigation.navigate('Comments', { postId: storyId });
  };

  const handleSubscribe = () => {
    // Abonelik sayfasına yönlendirilebilir
    // navigation.navigate('TokenStore');
  };

  const onRefresh = async () => {
    setRefreshing(true);
    
    try {
      await loadInitialData();
      
      // Rastgele yeni bir günlük mesaj
      const randomIndex = Math.floor(Math.random() * DAILY_MESSAGES.length);
      setDailyMessage(DAILY_MESSAGES[randomIndex]);
    } catch (error) {
      console.error('Yenileme hatası:', error);
    } finally {
      setRefreshing(false);
    }
  };

  const handleAddPost = () => {
    // Kullanıcı giriş yapmış mı kontrol et
    if (!user) {
      Alert.alert('Giriş Yapın', 'Paylaşım yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    // Kullanıcının aboneliğini kontrol et - gerçek bir uygulamada bu veritabanından kontrol edilmeli
    const hasSubscription = true; // Gerçek bir uygulamada bu veritabanından kontrol edilmeli
    
    if (hasSubscription) {
      setCreateModalVisible(true);
    } else {
      showSubscriptionRequiredMessage();
    }
  };

  const showSubscriptionRequiredMessage = () => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(
        'Keşfet\'te paylaşım yapmak için abonelik gereklidir', 
        ToastAndroid.LONG
      );
    } else {
      Alert.alert(
        'Abonelik Gerekli',
        'Keşfet\'te paylaşım yapmak için abonelik almanız gerekmektedir.',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Abonelik Al', onPress: handleSubscribe }
        ]
      );
    }
  };

  const handlePublishPost = async (post) => {
    if (!user) return;
    
    try {
      // Gönderiyi veritabanına kaydet
      const { data, error } = await createPost(
        user.id,
        post.imageUrl,
        post.description,
        'general' // Kategori
      );
      
      if (error) throw error;
      
      if (data && data[0]) {
        // Yeni post oluştur
        const newPost = {
          id: data[0].id,
          name: user.profile?.full_name || 'Kullanıcı',
          avatar: user.profile?.profile_image,
          time: 'Az önce',
          imageUrl: post.imageUrl,
          description: post.description,
          likes: 0,
          comments: 0
        };
        
        // Listeye ekle
        setFortuneStories(prev => [newPost, ...prev]);
        
        // Bildirim göster
        if (Platform.OS === 'android') {
          ToastAndroid.show('Paylaşımınız başarıyla eklendi!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Başarılı', 'Paylaşımınız başarıyla eklendi!');
        }
      }
    } catch (error) {
      console.error('Gönderi oluşturma hatası:', error);
      Alert.alert('Hata', 'Paylaşım yapılırken bir hata oluştu.');
    }
  };

  // Kaydırma olayını izle ve FAB'ı buna göre göster/gizle
  const handleScroll = Animated.event(
    [{ nativeEvent: { contentOffset: { y: scrollY } } }],
    { 
      useNativeDriver: false,
      listener: (event) => {
        const currentScrollY = event.nativeEvent.contentOffset.y;
        
        if (currentScrollY > 150 && showAddButton) {
          Animated.spring(fabAnim, {
            toValue: 1,
            useNativeDriver: true,
            friction: 6
          }).start();
        } else if (currentScrollY <= 150 && !showAddButton) {
          Animated.spring(fabAnim, {
            toValue: 0,
            useNativeDriver: true,
            friction: 6
          }).start();
        }
        
        setShowAddButton(currentScrollY > 150);
      }
    }
  );

  // Yükleme göstergesi
  if (loading && !refreshing) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
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
          <Animated.ScrollView 
            showsVerticalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
            refreshControl={
              <RefreshControl 
                refreshing={refreshing} 
                onRefresh={onRefresh}
                tintColor={colors.secondary}
                colors={[colors.secondary, colors.primary]}
                progressBackgroundColor={colors.card}
              />
            }
            onEndReached={loadMorePosts}
            onEndReachedThreshold={0.5}
          >
            <Animated.View 
              style={[
                styles.header, 
                {
                  opacity: scrollY.interpolate({
                    inputRange: [0, 100],
                    outputRange: [1, 0.8],
                    extrapolate: 'clamp'
                  })
                }
              ]}
            >
              <Text style={styles.headerTitle}>Keşfet</Text>
            </Animated.View>
            
            {/* Aktif Falcılar */}
            <Animated.View 
              style={[
                styles.section,
                {
                  transform: [{
                    translateX: scrollY.interpolate({
                      inputRange: [0, 100],
                      outputRange: [0, -5],
                      extrapolate: 'clamp'
                    })
                  }]
                }
              ]}
            >
              <FlatList
                data={activeFortuneTellers}
                renderItem={({ item }) => (
                  <FortuneTellerItem 
                    item={item} 
                    onPress={handleFortuneTellerPress}
                  />
                )}
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.fortuneTellersList}
                keyExtractor={(item) => item.id}
                ListEmptyComponent={
                  <View style={styles.emptyListContainer}>
                    <Text style={styles.emptyListText}>Henüz falcı bulunmuyor</Text>
                  </View>
                }
              />
            </Animated.View>
            
            {/* Fal Akışı Girişi */}
            <View style={styles.coffeeQuestionContainer}>
              <Text style={styles.coffeeQuestion}>
                Kahve falına baktırmak isteyenler?
              </Text>
              <View style={styles.coffeeIcons}>
                <Ionicons name="cafe" size={18} color={colors.secondary} />
                <Ionicons name="sparkles" size={18} color={colors.secondary} style={{marginLeft: 4}} />
              </View>
            </View>
            
            {/* Fal Hikayeleri */}
            <View style={styles.storiesContainer}>
              {fortuneStories.length > 0 ? (
                fortuneStories.map(story => (
                  <Animated.View 
                    key={story.id}
                    style={{
                      transform: [{ 
                        scale: likeAnim[story.id] ? likeAnim[story.id] : 1 
                      }]
                    }}
                  >
                    <FortuneStoryCard 
                      item={story} 
                      onLike={handleLike}
                      onComment={handleComment}
                    />
                  </Animated.View>
                ))
              ) : (
                <View style={styles.emptyStoriesContainer}>
                  <Text style={styles.emptyStoriesText}>
                    Henüz paylaşım bulunmuyor. İlk paylaşımı siz yapın!
                  </Text>
                  <TouchableOpacity 
                    style={styles.emptyStoriesButton}
                    onPress={handleAddPost}
                  >
                    <Text style={styles.emptyStoriesButtonText}>Paylaşım Yap</Text>
                  </TouchableOpacity>
                </View>
              )}
              
              {/* Daha fazla yükleniyor göstergesi */}
              {loadingMore && (
                <View style={styles.loadMoreContainer}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                  <Text style={styles.loadMoreText}>Daha fazla yükleniyor...</Text>
                </View>
              )}
            </View>
            
            {/* Günlük Mesaj */}
            <View style={styles.dailyMessageContainer}>
              <Text style={styles.dailyMessage}>
                {dailyMessage}
              </Text>
              <View style={styles.dailyMessageIcons}>
                <MaterialCommunityIcons name="crystal-ball" size={28} color={colors.secondary} style={{marginHorizontal: spacing.xs}} />
                <MaterialCommunityIcons name="cards" size={28} color={colors.secondary} style={{marginHorizontal: spacing.xs}} />
              </View>
            </View>

            {/* Abonelik Bilgisi */}
            <SubscriptionInfoBox onSubscribe={handleSubscribe} />
          </Animated.ScrollView>

          {/* Sağ altta yeni paylaşım butonu */}
          <Animated.View 
            style={[
              styles.fabContainer,
              {
                transform: [
                  { scale: fabAnim },
                  { 
                    translateY: fabAnim.interpolate({
                      inputRange: [0, 1],
                      outputRange: [100, 0]
                    })
                  }
                ]
              }
            ]}
          >
            <TouchableOpacity 
              style={styles.fab}
              onPress={handleAddPost}
              activeOpacity={0.8}
            >
              <AntDesign name="plus" size={24} color={colors.background} />
            </TouchableOpacity>
          </Animated.View>

          {/* Paylaşım Oluşturma Modalı */}
          <FortuneCreateModal 
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onPublish={handlePublishPost}
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
    marginBottom: spacing.xxxl,
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
  header: {
    padding: 20,
    paddingTop: 40,
  },
  headerTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: colors.secondary,
    textAlign: 'center',
  },
  section: {
    marginVertical: spacing.md,
  },
  fortuneTellersList: {
    paddingHorizontal: spacing.md,
  },
  coffeeQuestionContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
    marginBottom: spacing.lg,
  },
  coffeeQuestion: {
    fontSize: typography.fontSize.lg,
    color: colors.text.light,
    textAlign: 'center',
  },
  coffeeIcons: {
    flexDirection: 'row',
    marginLeft: spacing.xs,
    alignItems: 'center',
  },
  storiesContainer: {
    paddingHorizontal: spacing.md,
  },
  emptyListContainer: {
    width: 150,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyListText: {
    color: colors.text.tertiary,
    fontSize: typography.fontSize.sm,
    textAlign: 'center',
  },
  emptyStoriesContainer: {
    padding: spacing.xl,
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginVertical: spacing.lg,
  },
  emptyStoriesText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  emptyStoriesButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.sm,
  },
  emptyStoriesButtonText: {
    color: colors.background,
    fontWeight: typography.fontWeight.semiBold,
  },
  loadMoreContainer: {
    padding: spacing.md,
    alignItems: 'center',
  },
  loadMoreText: {
    color: colors.text.tertiary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
  },
  dailyMessageContainer: {
    padding: spacing.lg,
    marginTop: spacing.md,
  },
  dailyMessage: {
    fontSize: typography.fontSize.lg,
    color: colors.secondary,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
  },
  dailyMessageIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: spacing.md,
  },
  fabContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    right: spacing.lg,
    ...shadows.lg,
  },
  fab: {
    backgroundColor: colors.secondary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  }
});

export default ExploreScreen; 