import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  FlatList,
  StatusBar,
  TouchableOpacity,
  RefreshControl,
  Animated,
  Easing,
  ToastAndroid,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  Image,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons, MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

// Yeni modüler bileşenler
import ExploreTabNavigation from '../components/ExploreTabNavigation';
import ExploreCallToAction from '../components/ExploreCallToAction';
import ExplorePremiumSection from '../components/ExplorePremiumSection';
import ExplorePopularFortuneTellers from '../components/ExplorePopularFortuneTellers';
import ExploreFeaturedFortuneTeller from '../components/ExploreFeaturedFortuneTeller';
import ExploreIncentiveSection from '../components/ExploreIncentiveSection';
import NewFortuneTellersSection from '../components/NewFortuneTellersSection';
import ExploreFeaturedPosts from '../components/ExploreFeaturedPosts';

// Özel bileşenler
import FortuneStoryCard from '../components/FortuneStoryCard';
import FortuneTellerStoryItem from '../components/FortuneTellerStoryItem';
import SubscriptionInfoBox from '../components/SubscriptionInfoBox';
import FortuneCreateModal from '../components/FortuneCreateModal';
import CommentsModal from '../components/CommentsModal';
import StoryModal from '../components/StoryModal';

// Mesaj ekranları
import ChatsListScreen from './ChatsListScreen';

// Auth Context
import { useAuth } from '../context/AuthContext';

// Supabase servisleri
import { 
  getPosts, 
  getFortuneTellerPosts,
  getAllPosts,
  getFeaturedPosts,
  getStories, 
  createPost, 
  likePost, 
  checkIfLiked, 
  checkUserSubscription,
  checkUserSubscriptionWithTrial,
  checkSubscriptionPermissions,
  getAllFortuneTellerStories,
  recordStoryView,
  checkStoryViewStatus,
  uploadPostImage,
  getFortuneTellersByCategory,
  getAllFortuneTellers
} from '../services/supabaseService';

// RevenueCat servisleri
import { 
  initializeRevenueCat, 
  setRevenueCatUserID,
  checkSubscriptionStatus 
} from '../services/revenueCatService';

// AdMob servisi
import adMobService from '../services/adMobService';

const { width } = Dimensions.get('window');

const ExploreScreen = ({ navigation }) => {
  const { user } = useAuth();

  // Yeni state'ler
  const [activeTab, setActiveTab] = useState('posts');
  const [isNewUser, setIsNewUser] = useState(false);
  const [showAllTellersModal, setShowAllTellersModal] = useState(false);

  // Mevcut state'ler
  const [fortuneStories, setFortuneStories] = useState([]);
  const [featuredPosts, setFeaturedPosts] = useState([]);
  const [fortuneTellerStories, setFortuneTellerStories] = useState([]);
  const [storyViewStatus, setStoryViewStatus] = useState({});
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [showAddButton, setShowAddButton] = useState(true);
  const [createModalVisible, setCreateModalVisible] = useState(false);
  const [page, setPage] = useState(0);
  const [hasMorePosts, setHasMorePosts] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [isCommentsModalVisible, setCommentsModalVisible] = useState(false);
  const [selectedPostId, setSelectedPostId] = useState(null);
  const [selectedPostType, setSelectedPostType] = useState('user_post');
  const [likingPosts, setLikingPosts] = useState(new Set());
  const [subscriptionData, setSubscriptionData] = useState(null);
  
  // Hikaye modal state'leri
  const [storyModalVisible, setStoryModalVisible] = useState(false);
  const [allStories, setAllStories] = useState([]);
  const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
  const [currentFortuneTeller, setCurrentFortuneTeller] = useState(null);

  // Animasyon değerleri
  const scrollY = useRef(new Animated.Value(0)).current;
  const fabAnim = useRef(new Animated.Value(1)).current;
  const likeAnim = useRef({}).current;

  // İlk yükleme
  useEffect(() => {
    loadInitialData();
    initializeRevenueCatIfNeeded();
    checkIfNewUser();
  }, []);

  // Kullanıcı değiştiğinde abonelik durumunu güncelle
  useEffect(() => {
    if (user) {
      checkUserSubscriptionStatus();
    }
  }, [user]);

  // Yeni kullanıcı kontrolü
  const checkIfNewUser = useCallback(async () => {
    try {
      const hasSeenWelcome = await AsyncStorage.getItem('hasSeenWelcome');
      setIsNewUser(!hasSeenWelcome);
    } catch (error) {
      console.error('Yeni kullanıcı kontrolü hatası:', error);
    }
  }, []);

  // Tab değiştirme
  const handleTabPress = useCallback((tabId) => {
    setActiveTab(tabId);
  }, []);



  // Call-to-action tıklama
  const handleCallToActionPress = useCallback(() => {
    navigation.navigate('FalScreen');
  }, [navigation]);

  // Premium butonu tıklama
  const handlePremiumPress = useCallback(() => {
    navigation.navigate('BuyTokens');
  }, [navigation]);

  // Tüm falcıları gör butonu
  const handleViewAllFortuneTellerPress = useCallback(async () => {
    try {
      const { data, error } = await getAllFortuneTellers();
      
      if (error) {
        console.error('Tüm falcılar yüklenirken hata:', error);
        return;
      }

      // Tüm falcılar modal'ını aç
      setShowAllTellersModal(true);
    } catch (error) {
      console.error('Tüm falcılar yükleme hatası:', error);
    }
  }, []);

  // Falcı müsaitlik durumu için renk
  const getAvailabilityColor = useCallback((isAvailable) => {
    return isAvailable ? '#4CAF50' : '#F44336';
  }, []);

  // Falcı müsaitlik durumu için metin
  const getAvailabilityText = useCallback((isAvailable) => {
    return isAvailable ? 'Müsait' : 'Meşgul';
  }, []);

  // Tüm falcıları yükle
  const [allFortuneTellers, setAllFortuneTellers] = useState([]);
  const [loadingAllTellers, setLoadingAllTellers] = useState(false);

  const loadAllFortuneTellers = useCallback(async () => {
    try {
      setLoadingAllTellers(true);
      const { data, error } = await getAllFortuneTellers();
      
      if (error) {
        console.error('Tüm falcılar yüklenirken hata:', error);
        return;
      }

      // Sadece müsait falcıları al ve popüler olanları önce göster
      const availableTellers = data?.filter(teller => teller.is_available) || [];
      const sortedTellers = availableTellers.sort((a, b) => b.rating - a.rating);
      
      setAllFortuneTellers(sortedTellers);
    } catch (error) {
      console.error('Tüm falcılar yükleme hatası:', error);
    } finally {
      setLoadingAllTellers(false);
    }
  }, []);

  // Modal açıldığında falcıları yükle
  useEffect(() => {
    if (showAllTellersModal) {
      loadAllFortuneTellers();
    }
  }, [showAllTellersModal, loadAllFortuneTellers]);

  // Falcı kartına tıklama
  const handleFortuneTellerPress = useCallback((fortuneTeller) => {
    // Kullanıcının kendisiyle mesajlaşmasını engelle
    if (fortuneTeller.id === user?.id) {
      Alert.alert(
        'Bilgi', 
        'Kendinize mesaj gönderemezsiniz. Başka bir falcı seçin.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }
    
    navigation.navigate('NewChat', { fortuneTeller });
  }, [navigation, user?.id]);

  // Fal gönder butonu
  const handleSendFortunePress = useCallback(() => {
    navigation.navigate('FalScreen');
  }, [navigation]);

  // Reklam izle
  const handleWatchAdPress = useCallback(async () => {
    try {
      // Jeton kazanma için reklam izle (günlük limit uygulanır)
      const success = await adMobService.showRewardedAd(true);
      
      if (success) {
        // Başarılı reklam izleme sonrası kullanıcıya bilgi ver
        if (Platform.OS === 'android') {
          ToastAndroid.show('Reklam başarıyla izlendi! 1 jeton kazandınız.', ToastAndroid.SHORT);
        } else {
          Alert.alert('Başarılı', 'Reklam başarıyla izlendi! 1 jeton kazandınız.');
        }
      }
    } catch (error) {
      console.error('Reklam izleme hatası:', error);
      Alert.alert('Hata', 'Reklam izlenirken bir hata oluştu.');
    }
  }, []);

  // İlk fal hediyesi
  const handleFirstFortunePress = useCallback(async () => {
    await AsyncStorage.setItem('hasSeenWelcome', 'true');
    setIsNewUser(false);
    navigation.navigate('NewFortune');
  }, [navigation]);

  // Kullanıcı beğenilerini kontrol et
  const checkUserLikes = useCallback(async (posts, isFeatured = false) => {
    if (!user) return;
    
    try {
      const likePromises = posts.map(post => 
        checkIfLiked(user.id, post.id, post.type || 'user_post')
      );
      
      const likeResults = await Promise.all(likePromises);
      
      const updatedPosts = [...posts];
      likeResults.forEach((result, index) => {
        // Beğeni durumunu doğru şekilde set et
        updatedPosts[index].isLiked = result.liked || false;
      });
      
      // Hangi state'i güncelleyeceğimizi belirle
      if (isFeatured) {
        setFeaturedPosts(updatedPosts);
      } else {
        setFortuneStories(updatedPosts);
      }
    } catch (error) {
      console.error('Beğeni kontrolü hatası:', error);
    }
  }, [user]);

  // Daha fazla gönderi yükle
  const loadMorePosts = useCallback(async () => {
    if (!hasMorePosts || loadingMore) return;
    
    setLoadingMore(true);
    const nextPage = page + 1;
    
    try {
      const { data: morePosts, error } = await getAllPosts(10, nextPage);
      if (error) throw error;
      
      if (morePosts && morePosts.length > 0) {
        setFortuneStories(prev => [...prev, ...morePosts]);
        setPage(nextPage);
        setHasMorePosts(morePosts.length === 10);
        
        if (user) {
          await checkUserLikes(morePosts, false);
        }
      } else {
        setHasMorePosts(false);
      }
    } catch (error) {
      console.error('Daha fazla gönderi yükleme hatası:', error);
    } finally {
      setLoadingMore(false);
    }
  }, [hasMorePosts, loadingMore, page, user, checkUserLikes]);

  // Hikaye kartları için animasyon başlatma
  const startLikeAnimation = useCallback((storyId) => {
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
  }, [likeAnim]);

  // RevenueCat'i başlat
  const initializeRevenueCatIfNeeded = useCallback(async () => {
    try {
      await initializeRevenueCat();
      
      if (user?.id) {
        await setRevenueCatUserID(user.id);
      }
    } catch (error) {
      console.error('RevenueCat başlatma hatası:', error);
    }
  }, [user?.id]);

  // Kullanıcının abonelik durumunu kontrol et (deneme dahil)
  const checkUserSubscriptionStatus = useCallback(async () => {
    try {
      if (!user?.id) return;
      const subscriptionInfo = await checkUserSubscriptionWithTrial(user.id);
      setSubscriptionData(subscriptionInfo);
      
    } catch (error) {
      console.error('Abonelik durumu kontrol hatası:', error);
      // Fallback
      try {
        const subscriptionInfo = await checkUserSubscription(user.id);
        setSubscriptionData(subscriptionInfo);
      } catch (fallbackError) {
        console.error('Fallback abonelik kontrol hatası:', fallbackError);
      }
    }
  }, [user?.id]);

  // Abonelik kontrolü (deneme dahil)
  const checkPremium = useCallback(async () => {
    if (!user) return false;
    
    if (subscriptionData) {
      return subscriptionData.isPremium || subscriptionData.isFreeTrial;
    }
    
    try {
      const subscriptionInfo = await checkUserSubscriptionWithTrial(user.id);
      return subscriptionInfo.isPremium || subscriptionInfo.isFreeTrial;
    } catch (error) {
      // Fallback
      const { isPremium } = await checkUserSubscription(user.id);
      return isPremium;
    }
  }, [user, subscriptionData]);

  // Abonelik izni kontrol et
  const checkSubscriptionPermission = useCallback(async (action) => {
    if (!user) return { hasPermission: false, reason: 'Giriş yapmalısınız' };
    
    const result = await checkSubscriptionPermissions(user.id, action);
    return result;
  }, [user]);

  const handleLike = useCallback(async (storyId, isLiked) => {
    if (!user) {
      Alert.alert('Giriş Yapın', 'Beğeni yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    if (likingPosts.has(storyId)) {
      return;
    }
    
    // Free kullanıcılar da beğeni yapabilir (günlük görevler için)
    // const permissionResult = await checkSubscriptionPermission('post_to_explore');
    // if (!permissionResult.hasPermission) {
    //   showSubscriptionRequiredMessage('Gönderi beğenebilmek için abonelik gereklidir.');
    //   return;
    // }
    
    setLikingPosts(prev => new Set([...prev, storyId]));
    startLikeAnimation(storyId);

    try {
      // Post tipini bul (hem ana gönderiler hem öne çıkan gönderilerde ara)
      const post = fortuneStories.find(story => story.id === storyId) || 
                   featuredPosts.find(story => story.id === storyId);
      const postType = post?.type || 'user_post';

      // UI'da beğeni sayısını güncelle (optimistic update) - hem ana gönderiler hem öne çıkan gönderiler için
      setFortuneStories(prev =>
        prev.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              likes: isLiked ? Math.max(0, story.likes - 1) : story.likes + 1,
              isLiked: !isLiked
            };
          }
          return story;
        })
      );
      
      // Öne çıkan gönderilerde de güncelle
      setFeaturedPosts(prev =>
        prev.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              likes: isLiked ? Math.max(0, story.likes - 1) : story.likes + 1,
              isLiked: !isLiked
            };
          }
          return story;
        })
      );

      const { liked, error } = await likePost(user.id, storyId, postType);
      
      if (error) {
        if (error.code === '23505') {
          console.warn('Duplicate like attempt - updating UI only');
          const currentLikeStatus = await checkIfLiked(user.id, storyId, postType);
          setFortuneStories(prev =>
            prev.map(story => {
              if (story.id === storyId) {
                return {
                  ...story,
                  isLiked: currentLikeStatus.liked
                };
              }
              return story;
            })
          );
          
          // Öne çıkan gönderilerde de güncelle
          setFeaturedPosts(prev =>
            prev.map(story => {
              if (story.id === storyId) {
                return {
                  ...story,
                  isLiked: currentLikeStatus.liked
                };
              }
              return story;
            })
          );
          return;
        }
        throw error;
      }

      // Beğeni işlemi başarılı olduktan sonra UI'ı güncelle - hem ana gönderiler hem öne çıkan gönderiler için
      setFortuneStories(prev =>
        prev.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              isLiked: liked,
              // Beğeni sayısını da güncelle
              likes: liked ? story.likes + 1 : Math.max(0, story.likes - 1)
            };
          }
          return story;
        })
      );
      
      // Öne çıkan gönderilerde de güncelle
      setFeaturedPosts(prev =>
        prev.map(story => {
          if (story.id === storyId) {
            return {
              ...story,
              isLiked: liked,
              // Beğeni sayısını da güncelle
              likes: liked ? story.likes + 1 : Math.max(0, story.likes - 1)
            };
          }
          return story;
        })
      );

    } catch (error) {
      console.error('Beğeni hatası:', error);
      
      // Hata durumunda UI'ı eski haline getir - hem ana gönderiler hem öne çıkan gönderiler için
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
      
      // Öne çıkan gönderilerde de geri al
      setFeaturedPosts(prev =>
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
      
      Alert.alert('Hata', 'Beğeni işlemi sırasında bir hata oluştu.');
    } finally {
      setLikingPosts(prev => {
        const newSet = new Set(prev);
        newSet.delete(storyId);
        return newSet;
      });
    }
  }, [user, likingPosts, checkSubscriptionPermission, startLikeAnimation, featuredPosts]);

  const handleComment = useCallback(async (storyId) => {
    if (!user) {
      Alert.alert('Giriş Yapın', 'Yorum yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    // Free kullanıcılar da yorum yapabilir (günlük görevler için)
    // const permissionResult = await checkSubscriptionPermission('post_to_explore');
    // if (!permissionResult.hasPermission) {
    //   showSubscriptionRequiredMessage('Yorum yapabilmek için abonelik gereklidir.');
    //   return;
    // }
    
    // Post tipini bul ve sakla
    const post = fortuneStories.find(story => story.id === storyId);
    const postType = post?.type || 'user_post';
    
    setSelectedPostId(storyId);
    setSelectedPostType(postType);
    setCommentsModalVisible(true);
  }, [user, fortuneStories]);

  const handleSubscribe = useCallback(() => {
    navigation.navigate('BuyTokens');
  }, [navigation]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    setPage(0);
    
    try {
      await loadInitialData();
    } catch (error) {
      console.error('Yenileme hatası:', error);
    } finally {
      setRefreshing(false);
    }
  }, []);

  const handleAddPost = useCallback(async () => {
    if (!user) {
      Alert.alert('Giriş Yapın', 'Paylaşım yapabilmek için giriş yapmalısınız.');
      return;
    }
    
    const permissionResult = await checkSubscriptionPermission('post_to_explore');
    if (permissionResult.hasPermission) {
      setCreateModalVisible(true);
    } else {
      showSubscriptionRequiredMessage(
        permissionResult.reason || 'Keşfet\'te paylaşım yapmak için abonelik gereklidir.'
      );
    }
  }, [user, checkSubscriptionPermission]);

  const showSubscriptionRequiredMessage = useCallback((message) => {
    if (Platform.OS === 'android') {
      ToastAndroid.show(message, ToastAndroid.LONG);
    } else {
      Alert.alert(
        'Abonelik Gerekli',
        message,
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Abonelik Al', onPress: handleSubscribe }
        ]
      );
    }
  }, [handleSubscribe]);

  const handlePublishPost = useCallback(async (post) => {
    if (!user) return;
    
    try {
      const { data, error } = await createPost(
        user.id,
        post.imageUrl,
        post.description,
        'general'
      );
      
      if (error) throw error;
      
      if (data && data[0]) {
        const newPost = {
          id: data[0].id,
          name: user.profile?.full_name || 'Kullanıcı',
          avatar: user.profile?.profile_image,
          time: 'Az önce',
          imageUrl: post.imageUrl,
          imagePath: post.imagePath,
          description: post.description,
          likes: 0,
          comments: 0
        };
        
        setFortuneStories(prev => [newPost, ...prev]);
        
        if (Platform.OS === 'android') {
          ToastAndroid.show('Paylaşımınız başarıyla eklendi!', ToastAndroid.SHORT);
        } else {
          Alert.alert('Başarılı', 'Paylaşımınız başarıyla eklendi!');
        }
      }
    } catch (error) {
      console.error('❌ Gönderi oluşturma hatası:', error);
      Alert.alert('Hata', 'Paylaşım yapılırken bir hata oluştu: ' + error.message);
    }
  }, [user]);

  // Tüm hikayeleri birleştir ve sırala
  const getAllStoriesWithFortuneTeller = useCallback(() => {
    const allStories = [];
    
    groupStoriesByFortuneTeller().forEach(group => {
      const sortedStories = group.stories.sort((a, b) => new Date(b.created_at || b.createdAt) - new Date(a.created_at || a.createdAt));
      
      sortedStories.forEach(story => {
        allStories.push({
          ...story,
          id: story.id,
          mediaUrl: story.media_url || story.mediaUrl,
          mediaType: story.media_type || story.mediaType || 'image',
          caption: story.caption || story.description,
          createdAt: story.created_at || story.createdAt,
          fortuneTeller: story.fortuneTeller || group.fortuneTeller
        });
      });
    });
    
    return allStories;
  }, [groupStoriesByFortuneTeller]);

  // Falcı hikayesi görüntüleme
  const handleFortuneTellerStoryPress = useCallback((fortuneTeller, stories) => {
    if (!user) {
      Alert.alert('Giriş Yapın', 'Hikayeleri görüntülemek için giriş yapmalısınız.');
      return;
    }

    // Yardımcı: hikaye nesnesini normalize et
    const normalizeStory = (story) => {
      const mediaUrl = story.media_url || story.mediaUrl;
      // Uzantıya göre tip belirle
      let mediaType = story.media_type || story.mediaType;
      if (!mediaType && mediaUrl) {
        const cleanUrl = mediaUrl.split('?')[0];
        const ext = (cleanUrl.split('.').pop() || '').toLowerCase();
        if (['mp4', 'mov', 'm4v', 'avi', 'webm'].includes(ext)) mediaType = 'video';
        else mediaType = 'image';
    }

      return {
      ...story,
      id: story.id,
        mediaUrl,
        mediaType: mediaType || 'image',
      caption: story.caption || story.description,
        createdAt: story.created_at || story.createdAt,
      fortuneTeller: story.fortuneTeller || {
          id: fortuneTeller.id,
          name: fortuneTeller.name,
          profile_image: fortuneTeller.profile_image,
          specialties: fortuneTeller.specialties,
        },
      };
    };

    // Öncelik: Bize gelen stories parametresi kullanılmalı (gruptan geliyor ve doğru kişi)
    let selectedStories = Array.isArray(stories) ? stories : [];

    if (selectedStories.length === 0) {
      // Geriye dönük: tüm hikayelerden filtrele
      const allStories = getAllStoriesWithFortuneTeller();
      selectedStories = allStories.filter(s => (s.fortuneTeller?.id || s.fortuneTellerId) === fortuneTeller.id);
    }

    // Geçersiz/URL'si olmayan kayıtları ele ve normalleştir
    const formattedStories = selectedStories
      .filter(s => (s.media_url || s.mediaUrl))
      .map(normalizeStory)
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt));

    if (formattedStories.length === 0) {
      Alert.alert('Hata', 'Bu falcının hikayesi bulunamadı.');
      return;
    }

    setAllStories(formattedStories);
    setCurrentStoryIndex(0);
    setCurrentFortuneTeller({
      id: fortuneTeller.id,
      name: fortuneTeller.name,
      profile_image: fortuneTeller.profile_image,
    });
    setStoryModalVisible(true);
  }, [user, getAllStoriesWithFortuneTeller]);

  // Hikaye tamamlandığında
  const handleStoryComplete = useCallback(async (storyId, completed) => {
    if (!user) return;

    try {
      await recordStoryView(storyId, user.id, 15, completed);
      
      setStoryViewStatus(prev => ({
        ...prev,
        [storyId]: {
          hasViewed: true,
          isCompleted: completed
        }
      }));
      
      const viewedStories = JSON.parse(await AsyncStorage.getItem('viewedStories') || '{}');
      viewedStories[storyId] = {
        hasViewed: true,
        isCompleted: completed,
        timestamp: Date.now()
      };
      await AsyncStorage.setItem('viewedStories', JSON.stringify(viewedStories));
    } catch (error) {
      console.error('Hikaye görüntüleme kaydı hatası:', error);
    }
  }, [user]);

  // Hikaye navigasyonu
  const handleStoryNavigation = useCallback((direction) => {
    if (direction === 'next') {
      if (currentStoryIndex < allStories.length - 1) {
        const nextIndex = currentStoryIndex + 1;
        const nextStory = allStories[nextIndex];
        
        setCurrentStoryIndex(nextIndex);
        setCurrentFortuneTeller(nextStory.fortuneTeller);
      } else {
        setStoryModalVisible(false);
      }
    } else if (direction === 'prev') {
      if (currentStoryIndex > 0) {
        const prevIndex = currentStoryIndex - 1;
        const prevStory = allStories[prevIndex];
        
        setCurrentStoryIndex(prevIndex);
        setCurrentFortuneTeller(prevStory.fortuneTeller);
      }
    }
  }, [currentStoryIndex, allStories]);

  // Hikaye modalını kapat
  const handleStoryModalClose = useCallback(() => {
    setStoryModalVisible(false);
    setAllStories([]);
    setCurrentStoryIndex(0);
    setCurrentFortuneTeller(null);
  }, []);

  // Kaydırma olayını izle
  const handleScroll = useCallback(Animated.event(
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
  ), [showAddButton, fabAnim]);

  // Falcı hikayelerini yükle
  const loadFortuneTellerStories = useCallback(async () => {
    try {
      const { data: stories, error } = await getAllFortuneTellerStories();
      if (error) throw error;
      
      setFortuneTellerStories(stories || []);
      
      if (user && stories && stories.length > 0) {
        await checkStoryViewStatuses(stories);
      }
    } catch (error) {
      console.error('Falcı hikayeleri yükleme hatası:', error);
    }
  }, [user]);

  // Kullanıcının hikaye görüntüleme durumlarını kontrol et
  const checkStoryViewStatuses = useCallback(async (stories) => {
    if (!user) return;
    
    try {
      const viewedStories = JSON.parse(await AsyncStorage.getItem('viewedStories') || '{}');
      
      const statusPromises = stories.map(story => 
        checkStoryViewStatus(story.id, user.id)
      );
      
      const statusResults = await Promise.all(statusPromises);
      
      const newStatus = {};
      stories.forEach((story, index) => {
        const dbResult = statusResults[index];
        const localResult = viewedStories[story.id];
        
        if (dbResult.hasViewed || localResult?.hasViewed) {
          newStatus[story.id] = {
            hasViewed: true,
            isCompleted: dbResult.isCompleted || localResult?.isCompleted || false
          };
        }
      });
      
      setStoryViewStatus(newStatus);
    } catch (error) {
      console.error('Hikaye durumu kontrolü hatası:', error);
    }
  }, [user]);

  // Verileri yükle
  const loadInitialData = useCallback(async () => {
    setLoading(true);
    
    try {
      await loadFortuneTellerStories();
      
      // Öne çıkan gönderileri getir
      const { data: featured, error: featuredError } = await getFeaturedPosts(3);
      if (featuredError) throw featuredError;
      setFeaturedPosts(featured || []);
      
      // Hem kullanıcı hem falcı postlarını getir
      const { data: allPosts, error: postsError } = await getAllPosts(10, 0);
      if (postsError) throw postsError;
      setFortuneStories(allPosts || []);
      setHasMorePosts(allPosts && allPosts.length === 10);
      
      // Kullanıcı beğenilerini kontrol et (hem ana gönderiler hem öne çıkan gönderiler için)
      if (user) {
        if (allPosts && allPosts.length > 0) {
          await checkUserLikes(allPosts);
        }
        if (featured && featured.length > 0) {
          await checkUserLikes(featured, true);
        }
      }
      
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  }, [loadFortuneTellerStories, user, checkUserLikes]);

  // Falcı hikayelerini gruplandır
  const groupStoriesByFortuneTeller = useCallback(() => {
    const grouped = {};
    
    
    fortuneTellerStories.forEach(story => {
      // Supabase'den gelen veri yapısına göre alanları kontrol et
      const tellerId = story.fortune_teller_id || story.fortuneTellerId;
      const tellerName = story.fortune_teller_name || story.fortuneTellerName;
      const tellerAvatar = story.fortune_teller_avatar || story.fortuneTellerAvatar;
      const tellerSpecialties = story.fortune_teller_specialties || story.fortuneTellerSpecialties;
      
      const mediaUrl = story.media_url || story.mediaUrl;
      if (!mediaUrl) return; // Geçersiz kaydı atla
      // Uzantıya göre media_type tespit et
      const cleanUrl = mediaUrl.split('?')[0];
      const ext = (cleanUrl.split('.').pop() || '').toLowerCase();
      let inferredType = story.media_type || story.mediaType;
      if (!inferredType) {
        if (['mp4','mov','m4v','avi','webm'].includes(ext)) inferredType = 'video';
        else inferredType = 'image';
      }
      
      
      if (!grouped[tellerId]) {
        grouped[tellerId] = {
          fortuneTeller: {
            id: tellerId,
            name: tellerName,
            profile_image: tellerAvatar,
            specialties: tellerSpecialties
          },
          stories: []
        };
      }
      grouped[tellerId].stories.push({
        ...story,
        id: story.id,
        media_url: mediaUrl,
        media_type: inferredType,
        caption: story.caption || story.description,
        created_at: story.created_at || story.createdAt,
        fortuneTeller: {
          id: tellerId,
          name: tellerName,
          profile_image: tellerAvatar,
          specialties: tellerSpecialties
        }
      });
    });
    
    const result = Object.values(grouped)
      .map(group => ({
        ...group,
        stories: group.stories
          .filter(s => !!s.media_url)
          .sort((a, b) => new Date(a.created_at) - new Date(b.created_at))
      }))
      .filter(group => group.stories.length > 0);
    
    return result;
  }, [fortuneTellerStories]);

  // Sekmelere göre içerik render etme
  const renderTabContent = useMemo(() => {
    switch (activeTab) {
      case 'posts':
        return (
          <View>
            {/* Öne Çıkan Gönderiler - En Üstte */}
            <ExploreFeaturedPosts
              featuredPosts={featuredPosts}
              onPostPress={(post) => {
              }}
              onLike={handleLike}
              onComment={handleComment}
            />

            {/* Gönderiler */}
            {fortuneStories.length > 0 && (
              <View style={styles.postsSection}>
                <Text style={styles.sectionTitle}>Tüm Gönderiler</Text>
                {fortuneStories.map((item) => (
                  <Animated.View 
                    key={item.id}
                    style={{
                      transform: [{ 
                        scale: likeAnim[item.id] ? likeAnim[item.id] : 1 
                      }]
                    }}
                  >
                    <FortuneStoryCard 
                      item={item} 
                      onLike={handleLike}
                      onComment={handleComment}
                    />
                  </Animated.View>
                ))}
                
                {/* Daha fazla yükle */}
                {loadingMore && (
                  <View style={styles.loadMoreContainer}>
                    <ActivityIndicator size="small" color={colors.secondary} />
                    <Text style={styles.loadMoreText}>Daha fazla yükleniyor...</Text>
                  </View>
                )}
                
                {hasMorePosts && !loadingMore && (
                  <TouchableOpacity style={styles.loadMoreButton} onPress={loadMorePosts}>
                    <Text style={styles.loadMoreButtonText}>Daha Fazla Göster</Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        );
      
      case 'stories':
        return (
          <View style={styles.storiesContent}>
            {/* Falcı Hikayeleri - Yatay Kaydıralabilir */}
            {fortuneTellerStories.length > 0 ? (
              <View>
                <Text style={styles.storiesSectionTitle}>Falcı Hikayeleri</Text>
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.storiesHorizontalContainer}
                >
                  {groupStoriesByFortuneTeller().map((item) => {
                    const isViewed = item.stories.every(story => 
                      storyViewStatus[story.id]?.hasViewed
                    );
                    
                    return (
                      <FortuneTellerStoryItem 
                        key={item.fortuneTeller.id}
                        fortuneTeller={item.fortuneTeller}
                        stories={item.stories}
                        onPress={handleFortuneTellerStoryPress}
                        isViewed={isViewed}
                      />
                    );
                  })}
                </ScrollView>
              </View>
            ) : (
              <View style={styles.emptyStoriesContainer}>
                <LinearGradient
                  colors={[colors.card, colors.primaryLight + '20']}
                  style={styles.emptyStoriesCard}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                >
                  <MaterialCommunityIcons 
                    name="camera-outline" 
                    size={64} 
                    color={colors.text.secondary} 
                  />
                  <Text style={styles.emptyStoriesTitle}>Henüz Hikaye Yok</Text>
                  <Text style={styles.emptyStoriesSubtitle}>
                    Falcılarımız henüz hikaye paylaşmadı.{'\n'}
                    Yakında harika hikayeler göreceksin!
                  </Text>
                  <View style={styles.emptyStoriesBadge}>
                    <Text style={styles.emptyStoriesBadgeText}>Yakında</Text>
                  </View>
                </LinearGradient>
              </View>
            )}

            {/* Keşfet İçeriği - (Posts sekmesinden taşındı) */}
            <ExploreCallToAction onActionPress={handleCallToActionPress} />
            <ExplorePremiumSection 
              onPremiumPress={handlePremiumPress} 
              isPremium={subscriptionData?.isPremium} 
            />
            <ExploreIncentiveSection
              onSendFortunePress={handleSendFortunePress}
              onWatchAdPress={handleWatchAdPress}
              onFirstFortunePress={handleFirstFortunePress}
              isNewUser={isNewUser}
            />

            {/* Harekete Geçirici İçerikler */}
            <View style={styles.actionContentContainer}>
              {/* Hikaye Paylaşım Teşviki */}
              <LinearGradient
                colors={[colors.secondary + '20', colors.primaryLight + '20']}
                style={styles.actionCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.actionCardHeader}>
                  <MaterialCommunityIcons 
                    name="camera-plus" 
                    size={32} 
                    color={colors.secondary} 
                  />
                  <Text style={styles.actionCardTitle}>Hikayeni Paylaş</Text>
                </View>
                <Text style={styles.actionCardSubtitle}>
                  Fal deneyimini hikaye olarak paylaş ve diğer kullanıcılarla etkileşime geç! Falcıların hikayelerini izle ve kendi deneyimlerini anlat.
                </Text>
                <TouchableOpacity 
                  style={styles.actionButton}
                  onPress={() => navigation.navigate('FalScreen')}
                >
                  <Text style={styles.actionButtonText}>Fal Çek & Paylaş</Text>
                  <MaterialCommunityIcons name="arrow-right" size={20} color={colors.background} />
                </TouchableOpacity>
              </LinearGradient>

              {/* Hikaye İpuçları */}
              <LinearGradient
                colors={[colors.success + '20', colors.primaryLight + '20']}
                style={styles.actionCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.actionCardHeader}>
                  <MaterialCommunityIcons 
                    name="lightbulb-on" 
                    size={32} 
                    color={colors.success} 
                  />
                  <Text style={styles.actionCardTitle}>Hikaye İpuçları</Text>
                </View>
                <Text style={styles.actionCardSubtitle}>
                  • Fal sonuçlarını hikaye haline getir{'\n'}
                  • Tarot kartlarının anlamlarını paylaş{'\n'}
                  • Burç yorumlarını anlat{'\n'}
                  • Fal deneyimlerini hikaye olarak sun
                </Text>
                <View style={styles.tipsContainer}>
                  <Text style={styles.tipsText}>💡 İpucu: Hikayelerin daha etkileşimli olması için sorular sor ve deneyimlerini paylaş!</Text>
                </View>
              </LinearGradient>

              {/* Falcı Hikayeleri Hakkında */}
              <LinearGradient
                colors={[colors.primary + '20', colors.secondary + '20']}
                style={styles.actionCard}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.actionCardHeader}>
                  <MaterialCommunityIcons 
                    name="account-group" 
                    size={32} 
                    color={colors.primary} 
                  />
                  <Text style={styles.actionCardTitle}>Falcı Hikayeleri</Text>
                </View>
                <Text style={styles.actionCardSubtitle}>
                  Falcılarımızın paylaştığı özel hikayeleri izleyerek fal dünyasının derinliklerine dal! Her hikaye yeni bir keşif ve bilgelik sunuyor.
                </Text>
              </LinearGradient>
            </View>
          </View>
        );
      
      case 'fortunetellers':
        return (
          <View style={styles.fortuneTellersContent}>
            <ExploreFeaturedFortuneTeller 
              onFortuneTellerPress={handleFortuneTellerPress}
              navigation={navigation}
            />
            <NewFortuneTellersSection />
            <ExplorePopularFortuneTellers 
              onFortuneTellerPress={handleFortuneTellerPress}
              onViewAllPress={handleViewAllFortuneTellerPress}
            />
          </View>
        );
      
      case 'messages':
        return (
          <View style={styles.messagesContent}>
            <ChatsListScreen 
              navigation={navigation} 
              isEmbedded={true}
            />
          </View>
        );
      
      default:
        return null;
    }
  }, [
    activeTab,
    fortuneTellerStories,
    loading,
    handleCallToActionPress,
    handlePremiumPress,
    subscriptionData?.isPremium,
    handleSendFortunePress,
    handleWatchAdPress,
    handleFirstFortunePress,
    isNewUser,
    featuredPosts,
    fortuneStories,
    likeAnim,
    handleLike,
    handleComment,
    loadingMore,
    hasMorePosts,
    loadMorePosts,
    groupStoriesByFortuneTeller,
    storyViewStatus,
    handleFortuneTellerStoryPress,
    handleFortuneTellerPress,
    handleViewAllFortuneTellerPress,
    navigation
  ]);

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
          {/* Tab Navigation */}
          <ExploreTabNavigation 
            activeTab={activeTab} 
            onTabPress={handleTabPress} 
          />

          {/* İçerik */}
          {activeTab === 'messages' ? (
            <View style={{ flex: 1 }}>
              {renderTabContent}
            </View>
          ) : (
          <FlatList
            data={[{ key: 'content' }]}
            renderItem={() => renderTabContent}
            keyExtractor={(item) => item.key}
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
            contentContainerStyle={styles.listContainer}
            onEndReached={activeTab === 'posts' ? loadMorePosts : null}
            onEndReachedThreshold={0.5}
            removeClippedSubviews={true}
            maxToRenderPerBatch={1}
            windowSize={3}
            initialNumToRender={1}
          />
          )}

          {/* FAB */}
          {activeTab !== 'messages' && (
            <View style={styles.fabContainer}>
              <TouchableOpacity 
                style={styles.fab}
                onPress={handleAddPost}
                activeOpacity={0.8}
              >
                <AntDesign name="plus" size={24} color={colors.background} />
              </TouchableOpacity>
            </View>
          )}

          {/* Modal'lar */}
          <FortuneCreateModal 
            visible={createModalVisible}
            onClose={() => setCreateModalVisible(false)}
            onPublish={handlePublishPost}
          />
          <CommentsModal
            visible={isCommentsModalVisible}
            onClose={() => setCommentsModalVisible(false)}
            postId={selectedPostId}
            postType={selectedPostType}
            user={user}
          />
          <StoryModal
            visible={storyModalVisible}
            stories={allStories}
            initialIndex={currentStoryIndex}
            onClose={handleStoryModalClose}
            onStoryComplete={handleStoryComplete}
            onNavigation={handleStoryNavigation}
            fortuneTellerName={currentFortuneTeller?.name || 'Falcı'}
            fortuneTellerAvatar={currentFortuneTeller?.profile_image}
            currentStoryIndex={currentStoryIndex}
            totalStories={allStories.length}
          />

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
                <ScrollView showsVerticalScrollIndicator={false}>
                  {loadingAllTellers ? (
                    <View style={styles.modalLoadingContainer}>
                      <ActivityIndicator size="small" color={colors.secondary} />
                      <Text style={styles.modalLoadingText}>Falcılar yükleniyor...</Text>
                    </View>
                  ) : allFortuneTellers.length === 0 ? (
                    <View style={styles.modalEmptyContainer}>
                      <Text style={styles.modalEmptyText}>Henüz falcı bulunmuyor</Text>
                    </View>
                  ) : (
                    allFortuneTellers.map((teller) => (
                      <TouchableOpacity 
                        key={teller.id} 
                        style={styles.modalTellerRow}
                        onPress={() => {
                          setShowAllTellersModal(false);
                          handleFortuneTellerPress(teller);
                        }}
                      >
                        <Image
                          source={{ 
                            uri: teller.profile_image || 'https://via.placeholder.com/60x60?text=👤' 
                          }}
                          style={styles.modalTellerImage}
                        />
                        <View style={styles.modalTellerInfo}>
                          <View style={styles.modalTellerNameRow}>
                            <Text style={styles.modalTellerName}>{teller.name}</Text>
                            <View style={[
                              styles.modalAvailabilityIndicator, 
                              { backgroundColor: getAvailabilityColor(teller.is_available) }
                            ]}>
                              <Text style={styles.modalAvailabilityText}>
                                {getAvailabilityText(teller.is_available)}
                              </Text>
                            </View>
                          </View>
                          <Text style={styles.modalTellerSpecialty}>
                            {teller.specialties?.[0] || 'Genel'} • {teller.experience_years} yıl
                          </Text>
                          <View style={styles.modalTellerStats}>
                            <View style={styles.modalRatingContainer}>
                              <MaterialCommunityIcons name="star" size={14} color={colors.warning} />
                              <Text style={styles.modalTellerRating}>{teller.rating.toFixed(1)}</Text>
                              <Text style={styles.modalTellerReviews}>({teller.total_readings})</Text>
                            </View>
                            <Text style={styles.modalPriceText}>
                              <MaterialCommunityIcons name="diamond" size={14} color={colors.secondary} /> {teller.price_per_fortune}
                            </Text>
                          </View>
                        </View>
                      </TouchableOpacity>
                    ))
                  )}
                </ScrollView>
                <TouchableOpacity onPress={() => setShowAllTellersModal(false)} style={styles.modalCloseButton}>
                  <Text style={styles.modalCloseButtonText}>Kapat</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
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

  listContainer: {
    flexGrow: 1,
    paddingBottom: 80,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    marginTop: spacing.lg,
  },
  postsSection: {
    paddingVertical: spacing.md,
  },
  storiesContent: {
    padding: spacing.md,
  },
  storiesSectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
    paddingHorizontal: spacing.sm,
  },
  storiesHorizontalContainer: {
    paddingHorizontal: spacing.sm,
    paddingBottom: spacing.md,
  },
  storiesGrid: {
    gap: spacing.md,
  },
  fortuneTellersContent: {
    paddingVertical: spacing.md,
  },
  messagesContent: {
    flex: 1,
    paddingTop: 0,
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
  loadMoreButton: {
    margin: spacing.md,
    paddingVertical: spacing.md,
    backgroundColor: colors.primaryLight,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  loadMoreButtonText: {
    color: colors.background,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
  },
  fabContainer: {
    position: 'absolute',
    bottom: 100, // Bottom bar'ın üstünde
    right: spacing.md,
    zIndex: 1000,
  },
  fab: {
    backgroundColor: colors.secondary,
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.large,
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
  modalLoadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  modalLoadingText: {
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  modalEmptyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  modalEmptyText: {
    color: colors.text.tertiary,
  },
  modalTellerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  modalTellerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: spacing.sm,
  },
  modalTellerInfo: {
    flex: 1,
  },
  modalTellerNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  modalTellerName: {
    fontSize: typography.fontSize.md,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginRight: spacing.xs,
  },
  modalAvailabilityIndicator: {
    paddingHorizontal: spacing.xs,
    paddingVertical: spacing.xs,
    borderRadius: 5,
  },
  modalAvailabilityText: {
    color: colors.text.light,
    fontSize: typography.fontSize.xs,
    fontWeight: 'bold',
  },
  modalTellerSpecialty: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  modalTellerStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalRatingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTellerRating: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  modalTellerReviews: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  modalPriceText: {
    fontSize: typography.fontSize.sm,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  
  // Boş hikayeler durumu
  emptyStoriesContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xl,
  },
  emptyStoriesCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    minWidth: 280,
    ...shadows.large,
  },
  emptyStoriesTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.lg,
    marginBottom: spacing.md,
    textAlign: 'center',
  },
  emptyStoriesSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  emptyStoriesBadge: {
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  emptyStoriesBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  
  // Harekete Geçirici İçerik Stilleri
  actionContentContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
  },
  actionCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.large,
  },
  actionCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  actionCardTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  actionCardSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.medium,
  },
  tipsContainer: {
    backgroundColor: colors.success + '20',
    padding: spacing.md,
    borderRadius: radius.md,
    borderLeftWidth: 4,
    borderLeftColor: colors.success,
  },
  tipsText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.primary,
    fontStyle: 'italic',
  },
});

export default ExploreScreen; 