import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  StatusBar,
  Dimensions,
  Alert,
  Modal,
  TextInput,
  Pressable
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5 } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import { 
  createFortuneQuestion, 
  getFortuneQuestions, 
  updateFortuneQuestionAnswer,
  getUserTokenBalance 
} from '../services/supabaseService';
import AIFortuneService from '../services/aiFortuneService';
import adMobService from '../services/adMobService';
import AsyncStorage from '@react-native-async-storage/async-storage';

const { width } = Dimensions.get('window');

const FortuneDetailScreen = ({ navigation, route }) => {
  const { fortuneId } = route.params;
  const [fortune, setFortune] = useState(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState([]);
  
  // Ek soru state'leri
  const [questions, setQuestions] = useState([]);
  const [showQuestionModal, setShowQuestionModal] = useState(false);
  const [newQuestion, setNewQuestion] = useState('');
  const [questionLoading, setQuestionLoading] = useState(false);
  const [userTokens, setUserTokens] = useState(0);
  const [questionSubmitting, setQuestionSubmitting] = useState(false);
  
  // Reklam bazlı soru state'leri
  const [questionAdCount, setQuestionAdCount] = useState(0);
  const [watchingAds, setWatchingAds] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState('token'); // 'token' veya 'ad'
  
  // Yorum yapma state'leri
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [userReview, setUserReview] = useState(null);
  const [reviewRating, setReviewRating] = useState(0);
  const [reviewText, setReviewText] = useState('');
  const [reviewSubmitting, setReviewSubmitting] = useState(false);

  useEffect(() => {
    fetchFortuneDetails();
    fetchUserTokens();
    checkQuestionAdCount();
    fetchUserReview();
  }, [fortuneId]);

  // Fortune yüklendikten sonra soruları getir
  useEffect(() => {
    if (fortune) {
      fetchQuestions();
    }
  }, [fortune]);

  const fetchFortuneDetails = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('fortunes')
        .select(`
          *,
          fortune_teller:fortune_teller_id (
            id, name, profile_image, bio, experience_years, rating, specialties
          )
        `)
        .eq('id', fortuneId)
        .single();

      if (error) throw error;

      setFortune(data);
      
      // Görselleri parse et
      if (data.image_url) {
        try {
          const imageUrls = JSON.parse(data.image_url);
          setImages(imageUrls);
        } catch (e) {
        }
      }
      
    } catch (error) {
      console.error('Fal detayları alınamadı:', error);
      Alert.alert('Hata', 'Fal detayları yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Ek soruları getir
  const fetchQuestions = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !fortune) return;

      const { data, error } = await getFortuneQuestions(fortuneId, user.id);
      if (!error && data) {
        // Süre dolmuş soruları kontrol et ve cevapla
        const currentTime = new Date();
        const questionsToAnswer = data.filter(question => 
          question.status === 'cevaplanıyor' && 
          question.process_after && 
          new Date(question.process_after) <= currentTime &&
          !question.answer_text
        );

        // Süre dolmuş soruları cevapla
        for (const question of questionsToAnswer) {
          try {
            // Kullanıcı bilgilerini al
            const { data: userProfile } = await supabase
              .from('users')
              .select('*')
              .eq('id', user.id)
              .single();

            if (userProfile && fortune && fortune.category && fortune.fortune_text) {
              try {
                // AI'dan cevap al
                const answer = await AIFortuneService.answerFollowUpQuestion(
                  fortune,
                  question.question_text,
                  userProfile
                );

                // Cevabı kaydet
                await updateFortuneQuestionAnswer(question.id, answer);
              } catch (aiError) {
                console.error('AI yanıt oluşturma hatası:', aiError);
                // Hata durumunda soruyu tekrar işleme alınacak şekilde bırak
              }
            }
          } catch (answerError) {
            console.error('Soru cevaplanırken hata:', answerError);
          }
        }

        // Güncellenmiş soruları tekrar getir
        const { data: updatedData } = await getFortuneQuestions(fortuneId, user.id);
        setQuestions(updatedData || data);
      }
    } catch (error) {
      console.error('Sorular yüklenemedi:', error);
    }
  };

  // Kullanıcı token bakiyesini getir
  const fetchUserTokens = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const balance = await getUserTokenBalance(user.id);
      setUserTokens(balance);
    } catch (error) {
      console.error('Token bakiyesi alınamadı:', error);
    }
  };

  // Ek soru için izlenen reklam sayısını kontrol et
  const checkQuestionAdCount = async () => {
    try {
      const adCountKey = `@question_ads_${fortuneId}`;
      const storedCount = await AsyncStorage.getItem(adCountKey);
      const adCount = storedCount ? parseInt(storedCount, 10) : 0;
      setQuestionAdCount(adCount);
    } catch (error) {
      console.error('Reklam sayısı kontrolü hatası:', error);
    }
  };

  // Kullanıcının bu fal için yaptığı yorumu getir
  const fetchUserReview = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from('fortune_reviews')
        .select('*')
        .eq('fortune_id', fortuneId)
        .eq('user_id', user.id)
        .single();

      if (!error && data) {
        setUserReview(data);
        setReviewRating(data.rating);
        setReviewText(data.review_text || '');
      }
    } catch (error) {
      console.error('Kullanıcı yorumu alınamadı:', error);
    }
  };

  // Yorum gönder veya güncelle
  const handleSubmitReview = async () => {
    if (reviewRating === 0) {
      Alert.alert('Uyarı', 'Lütfen bir yıldız puanı verin.');
      return;
    }

    try {
      setReviewSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

      const reviewData = {
        fortune_id: fortuneId,
        user_id: user.id,
        rating: reviewRating,
        review_text: reviewText.trim() || null,
      };

      let result;
      if (userReview) {
        // Mevcut yorumu güncelle
        result = await supabase
          .from('fortune_reviews')
          .update(reviewData)
          .eq('id', userReview.id)
          .select()
          .single();
      } else {
        // Yeni yorum ekle
        result = await supabase
          .from('fortune_reviews')
          .insert(reviewData)
          .select()
          .single();
      }

      if (result.error) {
        throw result.error;
      }

      setUserReview(result.data);
      setShowReviewModal(false);

      Alert.alert(
        '✨ Teşekkürler!',
        userReview 
          ? 'Yorumunuz başarıyla güncellendi. Geri bildiriminiz bizim için çok değerli!' 
          : 'Yorumunuz başarıyla kaydedildi. Geri bildiriminiz bizim için çok değerli!',
        [{ text: 'Tamam' }]
      );

    } catch (error) {
      console.error('Yorum gönderme hatası:', error);
      Alert.alert('Hata', 'Yorum gönderilirken bir hata oluştu.');
    } finally {
      setReviewSubmitting(false);
    }
  };

  // Yorum modalını aç
  const openReviewModal = () => {
    if (userReview) {
      setReviewRating(userReview.rating);
      setReviewText(userReview.review_text || '');
    } else {
      setReviewRating(0);
      setReviewText('');
    }
    setShowReviewModal(true);
  };

  // Ek soru için reklam izle
  const handleWatchAdForQuestion = async () => {
    if (questionAdCount >= 3) {
      Alert.alert(
        'Tebrikler!',
        'Artık reklam izleyerek ek soru sorabilirsiniz!',
        [{ text: 'Tamam' }]
      );
      return;
    }

    try {
      setWatchingAds(true);
      // Ek soru için reklam izle (günlük limit uygulanmaz)
      const success = await adMobService.showRewardedAd(false);
      
      if (success) {
        const newCount = questionAdCount + 1;
        setQuestionAdCount(newCount);
        
        // AsyncStorage'a kaydet
        const adCountKey = `@question_ads_${fortuneId}`;
        await AsyncStorage.setItem(adCountKey, newCount.toString());

        if (newCount >= 3) {
          Alert.alert(
            '🎉 Harika!',
            'Artık bu fal için ücretsiz ek soru sorabilirsiniz!',
            [{ text: 'Soru Sor', onPress: () => setSelectedPaymentMethod('ad') }]
          );
        } else {
          Alert.alert(
            'Reklam İzlendi!',
            `${newCount}/3 reklam tamamlandı. ${3 - newCount} reklam daha izleyerek ücretsiz soru hakkı kazanabilirsiniz.`,
            [{ text: 'Tamam' }]
          );
        }
      }
    } catch (error) {
      console.error('Reklam izleme hatası:', error);
      Alert.alert('Hata', 'Reklam izlenirken bir hata oluştu.');
    } finally {
      setWatchingAds(false);
    }
  };

  // Ek soru gönder
  const handleSubmitQuestion = async () => {
    if (!newQuestion.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir soru yazın.');
      return;
    }

    // Ödeme yöntemi kontrolü
    if (selectedPaymentMethod === 'token') {
      if (userTokens < 5) {
        Alert.alert(
          'Yetersiz Jeton',
          'Ek soru için 5 jeton gereklidir. Jeton satın almak ister misiniz?',
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Jeton Al', onPress: () => navigation.navigate('TokenStore') }
          ]
        );
        return;
      }
    } else if (selectedPaymentMethod === 'ad') {
      if (questionAdCount < 3) {
        Alert.alert(
          'Reklam Gerekli',
          'Ücretsiz soru hakkı için 3 reklam izlemeniz gerekiyor.',
          [{ text: 'Tamam' }]
        );
        return;
      }
    }

    try {
      setQuestionSubmitting(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı oturumu bulunamadı');

      // Soruyu oluştur
      const { data: question, error } = await createFortuneQuestion(
        fortuneId, 
        user.id, 
        newQuestion.trim(),
        selectedPaymentMethod === 'ad'
      );

      if (error) {
        Alert.alert('Hata', error);
        return;
      }

      // Reklam bazlı soru ise reklam sayacını sıfırla
      if (selectedPaymentMethod === 'ad') {
        const adCountKey = `@question_ads_${fortuneId}`;
        await AsyncStorage.setItem(adCountKey, '0');
        setQuestionAdCount(0);
      }

      // Listeyi güncelle
      await fetchQuestions();
      await fetchUserTokens();

      // Modal'ı kapat ve formu temizle
      setShowQuestionModal(false);
      setNewQuestion('');
      setSelectedPaymentMethod('token'); // Varsayılan değere dön

      const paymentMessage = selectedPaymentMethod === 'ad' 
        ? 'Ek sorunuz ücretsiz olarak gönderildi.' 
        : 'Ek sorunuz gönderildi ve 5 jeton kesildi.';

      Alert.alert(
        '✨ Soru Gönderildi!',
        `${paymentMessage} Cevabı 5-10 dakika içinde hazır olacak.`,
        [{ text: 'Tamam' }]
      );

    } catch (error) {
      console.error('Soru gönderme hatası:', error);
      Alert.alert('Hata', 'Soru gönderilirken bir hata oluştu.');
    } finally {
      setQuestionSubmitting(false);
      setQuestionLoading(false);
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

  const getCategoryText = (category) => {
    switch (category) {
      case 'kahve':
        return 'Kahve Falı';
      case 'tarot':
        return 'Tarot';
      case 'el':
        return 'El Falı';
      case 'yıldızname':
        return 'Yıldızname';
      default:
        return 'Fal';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'kahve':
        return 'coffee';
      case 'tarot':
        return 'cards';
      case 'el':
        return 'hand-left';
      case 'yıldızname':
        return 'star-four-points';
      default:
        return 'crystal-ball';
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Seçilen kartları parse et ve görüntüle
  const parseSelectedCards = (specialData, category) => {
    if (!specialData) return null;
    
    try {
      const data = JSON.parse(specialData);
      const selectedCards = data.selected_cards;
      
      if (!selectedCards) return null;
      
      const cleanCategory = category?.toLowerCase().trim();
      
      if (cleanCategory === 'tarot' || cleanCategory === 'tarot falı') {
        // Tarot kartları
        const { past, present, future } = selectedCards;
        return (
          <View style={styles.selectedCardsContainer}>
            <Text style={styles.selectedCardsTitle}>Seçilen Tarot Kartları</Text>
            <View style={styles.tarotCardsRow}>
              {past && (
                <View style={styles.tarotCard}>
                  <Text style={styles.tarotCardPosition}>Geçmiş</Text>
                  <Text style={styles.tarotCardName}>{past.turkishName}</Text>
                  <Text style={styles.tarotCardMeaning}>{past.meaning?.meaning}</Text>
                </View>
              )}
              {present && (
                <View style={styles.tarotCard}>
                  <Text style={styles.tarotCardPosition}>Şimdi</Text>
                  <Text style={styles.tarotCardName}>{present.turkishName}</Text>
                  <Text style={styles.tarotCardMeaning}>{present.meaning?.meaning}</Text>
                </View>
              )}
              {future && (
                <View style={styles.tarotCard}>
                  <Text style={styles.tarotCardPosition}>Gelecek</Text>
                  <Text style={styles.tarotCardName}>{future.turkishName}</Text>
                  <Text style={styles.tarotCardMeaning}>{future.meaning?.meaning}</Text>
                </View>
              )}
            </View>
          </View>
        );
      } else if (cleanCategory === 'katina' || cleanCategory === 'katina falı') {
        // Katina kartları
        const { yourCards, theirCards, sharedCard } = selectedCards;
        return (
          <View style={styles.selectedCardsContainer}>
            <Text style={styles.selectedCardsTitle}>Seçilen Katina Kartları</Text>
            <View style={styles.katinaCardsContainer}>
              {yourCards && yourCards.length > 0 && (
                <View style={styles.katinaCardGroup}>
                  <Text style={styles.katinaCardGroupTitle}>Danışanın Kartları:</Text>
                  <View style={styles.katinaCardsRow}>
                    {yourCards.map((card, index) => (
                      <View key={index} style={styles.katinaCard}>
                        <Text style={styles.katinaCardText}>{card.suitName} {card.valueName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {theirCards && theirCards.length > 0 && (
                <View style={styles.katinaCardGroup}>
                  <Text style={styles.katinaCardGroupTitle}>Karşı Tarafın Kartları:</Text>
                  <View style={styles.katinaCardsRow}>
                    {theirCards.map((card, index) => (
                      <View key={index} style={styles.katinaCard}>
                        <Text style={styles.katinaCardText}>{card.suitName} {card.valueName}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              {sharedCard && (
                <View style={styles.katinaCardGroup}>
                  <Text style={styles.katinaCardGroupTitle}>Ortak Kart:</Text>
                  <View style={styles.katinaCard}>
                    <Text style={styles.katinaCardText}>{sharedCard.suitName} {sharedCard.valueName}</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        );
      }
    } catch (error) {
      console.error('Kart bilgileri parse edilemedi:', error);
    }
    
    return null;
  };

  // Fal Yorumu render fonksiyonu
  const renderFortuneText = (fortuneText) => {
    if (!fortuneText) return null;
    return fortuneText.split(/\r?\n/).map((line, idx) => {
      const boldMatch = line.match(/^\*\*(.+)\*\*$/);
      if (boldMatch) {
        return (
          <Text key={idx} style={{ fontWeight: 'bold', color: colors.text.light, fontSize: 15, marginTop: 12, marginBottom: 4 }}>{boldMatch[1]}</Text>
        );
      }
      return (
        <Text key={idx} style={{ color: colors.text.secondary, fontSize: 14, lineHeight: 22 }}>{line}</Text>
      );
    });
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Fal detayları yükleniyor...</Text>
      </View>
    );
  }

  if (!fortune) {
    return (
      <View style={styles.errorContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <Ionicons name="alert-circle" size={60} color={colors.error} />
        <Text style={styles.errorText}>Fal bulunamadı</Text>
        <TouchableOpacity 
          style={styles.errorButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={styles.errorButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </View>
    );
  }

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
          <Text style={styles.headerTitle}>Fal Detayları</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Fal Türü ve Durum */}
        <View style={styles.statusSection}>
          <LinearGradient
            colors={[colors.card, colors.background]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.statusCard}
          >
            <View style={styles.statusHeader}>
              <View style={styles.categoryInfo}>
                <LinearGradient
                  colors={[colors.primary, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.categoryIcon}
                >
                  <MaterialCommunityIcons 
                    name={getCategoryIcon(fortune.category)} 
                    size={24} 
                    color={colors.text.light} 
                  />
                </LinearGradient>
                <View style={{ flex: 1 }}>
                  <Text style={styles.categoryTitle}>{getCategoryText(fortune.category)}</Text>
                  <Text style={styles.categoryDate}>{formatDate(fortune.created_at)}</Text>
                </View>
              </View>
            </View>
            
            <LinearGradient
              colors={[getStatusColor(fortune.status), colors.card]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 0 }}
              style={styles.statusBadgeAbsolute}
            >
              <Text style={styles.statusText}>{getStatusText(fortune.status)}</Text>
            </LinearGradient>

            <View style={styles.tokenInfo}>
              <MaterialCommunityIcons name="diamond" size={16} color={colors.secondary} />
              <Text style={styles.tokenText}>{fortune.token_amount} Jeton</Text>
            </View>
          </LinearGradient>
        </View>

        {/* Falcı Bilgileri */}
        {fortune.fortune_teller && (
          <View style={styles.fortuneTellerSection}>
            <Text style={styles.sectionTitle}>Falcı Bilgileri</Text>
            <LinearGradient
              colors={[colors.card, colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fortuneTellerCard}
            >
              <View style={styles.fortuneTellerHeader}>
                <View style={styles.fortuneTellerImageContainer}>
                  <Image 
                    source={{ 
                      uri: fortune.fortune_teller.profile_image
                    }} 
                    style={styles.fortuneTellerImage} 
                  />
                  <View style={styles.fortuneTellerImageGlow} />
                </View>
                
                <View style={styles.fortuneTellerInfo}>
                  <Text style={styles.fortuneTellerName}>
                    {fortune.fortune_teller.name}
                  </Text>
                  <Text style={styles.fortuneTellerExperience}>
                    {fortune.fortune_teller.experience_years} yıl deneyim
                  </Text>
                  
                  <View style={styles.ratingContainer}>
                    <View style={styles.starsRow}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome5 
                          key={star}
                          name="star" 
                          size={14} 
                          color={star <= Math.round(fortune.fortune_teller.rating) ? 
                                colors.secondary : colors.border} 
                          style={styles.starIcon}
                        />
                      ))}
                    </View>
                    <Text style={styles.ratingText}>
                      {fortune.fortune_teller.rating.toFixed(1)}
                    </Text>
                  </View>
                </View>
              </View>
              
              {fortune.fortune_teller.bio && (
                <Text style={styles.fortuneTellerBio}>
                  {fortune.fortune_teller.bio}
                </Text>
              )}
              
              {fortune.fortune_teller.specialties && fortune.fortune_teller.specialties.length > 0 && (
                <View style={styles.specialtiesContainer}>
                  <Text style={styles.specialtiesTitle}>Uzmanlık Alanları:</Text>
                  <View style={styles.specialtiesList}>
                    {fortune.fortune_teller.specialties.map((specialty, index) => (
                      <View key={index} style={styles.specialtyTag}>
                        <Text style={styles.specialtyText}>{specialty}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
            </LinearGradient>
          </View>
        )}

        {/* Görseller */}
        {images.length > 0 && (
          <View style={styles.imagesSection}>
            <Text style={styles.sectionTitle}>Fal Görselleri</Text>
            <ScrollView 
              horizontal 
              showsHorizontalScrollIndicator={false}
              style={styles.imagesScrollView}
            >
              {images.map((imageUrl, index) => (
                <View key={index} style={styles.imageContainer}>
                  <Image 
                    source={{ uri: imageUrl }} 
                    style={styles.fortuneImage}
                    resizeMode="cover"
                  />
                  <View style={styles.imageOverlay}>
                    <Text style={styles.imageNumber}>Görsel {index + 1}</Text>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Açıklama */}
        {fortune.description && (
          <View style={styles.descriptionSection}>
            <Text style={styles.sectionTitle}>Notunuz</Text>
            <LinearGradient
              colors={[colors.card, colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.descriptionCard}
            >
              <Text style={styles.descriptionText}>{fortune.description}</Text>
            </LinearGradient>
          </View>
        )}

        {/* Seçilen Kartlar */}
        {parseSelectedCards(fortune.special_data, fortune.category) && (
          <View style={styles.selectedCardsSection}>
            <Text style={styles.sectionTitle}>Seçilen Kartlar</Text>
            <LinearGradient
              colors={[colors.card, colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.selectedCardsWrapper}
            >
              {parseSelectedCards(fortune.special_data, fortune.category)}
            </LinearGradient>
          </View>
        )}

        {/* Fal Yorumu */}
        {fortune.fortune_text && (
          <View style={styles.fortuneTextSection}>
            <Text style={styles.sectionTitle}>Fal Yorumu</Text>
            <LinearGradient
              colors={[colors.card, colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.fortuneTextCard}
            >
              <View style={styles.fortuneTextHeader}>
                <MaterialCommunityIcons name="crystal-ball" size={20} color={colors.secondary} />
                <Text style={styles.fortuneTextTitle}>Yorum</Text>
              </View>
              {renderFortuneText(fortune.fortune_text)}
              
              {fortune.completed_at && (
                <View style={styles.completionInfo}>
                  <Ionicons name="checkmark-circle" size={16} color={colors.success} />
                  <Text style={styles.completionText}>
                    Tamamlandı: {formatDate(fortune.completed_at)}
                  </Text>
                </View>
              )}
            </LinearGradient>

            {/* Yorum Yapma Butonu - Sadece tamamlanan fallar için */}
            {fortune.status === 'tamamlandı' && (
              <TouchableOpacity 
                style={styles.reviewButton}
                onPress={openReviewModal}
              >
                <LinearGradient
                  colors={userReview ? [colors.success, colors.primary] : [colors.warning, colors.secondary]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={styles.reviewButtonGradient}
                >
                  <MaterialCommunityIcons 
                    name={userReview ? "star-check" : "star-plus"} 
                    size={20} 
                    color={colors.text.light} 
                  />
                  <Text style={styles.reviewButtonText}>
                    {userReview ? 'Deneyimi Güncelle' : 'Deneyim Paylaş'}
                  </Text>
                  {userReview && (
                    <View style={styles.userRatingDisplay}>
                      {[1, 2, 3, 4, 5].map((star) => (
                        <FontAwesome5 
                          key={star}
                          name="star" 
                          size={12} 
                          color={star <= userReview.rating ? colors.secondary : 'rgba(255,255,255,0.3)'} 
                        />
                      ))}
                    </View>
                  )}
                </LinearGradient>
              </TouchableOpacity>
            )}

            {/* Ek Soru Butonu - Sadece tamamlanan fallar için */}
            {fortune.status === 'tamamlandı' && (
              <View style={styles.questionButtonsContainer}>
                <TouchableOpacity 
                  style={styles.askQuestionButton}
                  onPress={() => setShowQuestionModal(true)}
                >
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.askQuestionGradient}
                  >
                    <MaterialCommunityIcons name="help-circle" size={20} color={colors.text.light} />
                    <Text style={styles.askQuestionText}>Ek Soru Sor</Text>
                    <View style={styles.tokenCost}>
                      <MaterialCommunityIcons name="diamond" size={16} color={colors.text.light} />
                      <Text style={styles.tokenCostText}>5</Text>
                    </View>
                  </LinearGradient>
                </TouchableOpacity>

                {/* Veya İbaresi */}
                <View style={styles.orDivider}>
                  <View style={styles.orLine} />
                  <Text style={styles.orText}>veya</Text>
                  <View style={styles.orLine} />
                </View>

                {/* Reklam ile Soru Sor */}
                <TouchableOpacity 
                  style={[styles.askQuestionButton, questionAdCount >= 3 && styles.adQuestionEnabled]}
                  onPress={questionAdCount >= 3 ? () => {
                    setSelectedPaymentMethod('ad');
                    setShowQuestionModal(true);
                  } : handleWatchAdForQuestion}
                  disabled={watchingAds}
                >
                  <LinearGradient
                    colors={questionAdCount >= 3 
                      ? [colors.success, colors.primary] 
                      : [colors.warning, colors.primaryLight]
                    }
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.askQuestionGradient}
                  >
                    {watchingAds ? (
                      <ActivityIndicator size="small" color={colors.text.light} />
                    ) : (
                      <>
                        <MaterialCommunityIcons 
                          name={questionAdCount >= 3 ? "check-circle" : "play-circle"} 
                          size={20} 
                          color={colors.text.light} 
                        />
                        <Text style={styles.askQuestionText}>
                          {questionAdCount >= 3 ? 'Ücretsiz Soru' : 'Reklam İzle'}
                        </Text>
                        <View style={styles.adProgress}>
                          <Text style={styles.adProgressText}>{questionAdCount}/3</Text>
                        </View>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Ek Sorular Listesi */}
        {questions.length > 0 && (
          <View style={styles.questionsSection}>
            <Text style={styles.sectionTitle}>Ek Sorularınız</Text>
            {questions.map((question, index) => (
              <View key={question.id} style={styles.questionCard}>
                <LinearGradient
                  colors={[colors.card, colors.background]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={styles.questionGradient}
                >
                  {/* Soru */}
                  <View style={styles.questionHeader}>
                    <View style={styles.questionNumber}>
                      <Text style={styles.questionNumberText}>{question.question_order}</Text>
                    </View>
                    <View style={styles.questionTextContainer}>
                      <Text style={styles.questionLabel}>Sorunuz:</Text>
                      <Text style={styles.questionText}>{question.question_text}</Text>
                    </View>
                  </View>

                  {/* Cevap veya Durum */}
                  {question.answer_text ? (
                    <View style={styles.answerSection}>
                      <View style={styles.answerHeader}>
                        <MaterialCommunityIcons name="crystal-ball" size={16} color={colors.secondary} />
                        <Text style={styles.answerLabel}>Cevap:</Text>
                      </View>
                      <Text style={styles.answerText}>{question.answer_text}</Text>
                      {question.answered_at && (
                        <View style={styles.answerTime}>
                          <Ionicons name="time" size={12} color={colors.text.tertiary} />
                          <Text style={styles.answerTimeText}>
                            Cevaplandı: {formatDate(question.answered_at)}
                          </Text>
                        </View>
                      )}
                    </View>
                  ) : (
                    <View style={styles.pendingSection}>
                      <View style={styles.pendingHeader}>
                        <ActivityIndicator size="small" color={colors.warning} />
                        <Text style={styles.pendingLabel}>Cevaplanıyor...</Text>
                      </View>
                      {question.process_after && (
                        <View style={styles.estimatedTime}>
                          <Ionicons name="time-outline" size={12} color={colors.text.tertiary} />
                          <Text style={styles.estimatedTimeText}>
                            Tahmini süre: {Math.max(0, Math.ceil((new Date(question.process_after) - new Date()) / (1000 * 60)))} dakika
                          </Text>
                        </View>
                      )}
                    </View>
                  )}
                </LinearGradient>
              </View>
            ))}
          </View>
        )}

        {/* Alt Boşluk */}
        <View style={{ height: 100 }} />
      </ScrollView>

      {/* Ek Soru Modal */}
      <Modal
        visible={showQuestionModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowQuestionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[colors.card, colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <MaterialCommunityIcons name="help-circle" size={24} color={colors.secondary} />
                  <Text style={styles.modalTitle}>Ek Soru Sor</Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowQuestionModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>

              {/* Ödeme Yöntemi Seçimi */}
              <View style={styles.paymentMethodContainer}>
                <Text style={styles.paymentMethodTitle}>Nasıl soru sormak istiyorsunuz?</Text>
                
                {/* Jeton Seçeneği */}
                <TouchableOpacity 
                  style={[styles.paymentOption, selectedPaymentMethod === 'token' && styles.paymentOptionSelected]}
                  onPress={() => setSelectedPaymentMethod('token')}
                >
                  <View style={styles.paymentOptionContent}>
                    <MaterialCommunityIcons name="diamond" size={20} color={colors.secondary} />
                    <View style={styles.paymentOptionText}>
                      <Text style={styles.paymentOptionTitle}>Jeton ile Ödeme</Text>
                      <Text style={styles.paymentOptionSubtitle}>
                        Mevcut: {userTokens} jeton | Gerekli: 5 jeton
                      </Text>
                    </View>
                    <View style={[styles.radioButton, selectedPaymentMethod === 'token' && styles.radioButtonSelected]} />
                  </View>
                </TouchableOpacity>

                {/* Reklam Seçeneği */}
                <TouchableOpacity 
                  style={[styles.paymentOption, selectedPaymentMethod === 'ad' && styles.paymentOptionSelected]}
                  onPress={() => setSelectedPaymentMethod('ad')}
                  disabled={questionAdCount < 3}
                >
                  <View style={[styles.paymentOptionContent, questionAdCount < 3 && styles.paymentOptionDisabled]}>
                    <MaterialCommunityIcons 
                      name={questionAdCount >= 3 ? "check-circle" : "play-circle"} 
                      size={20} 
                      color={questionAdCount >= 3 ? colors.success : colors.text.tertiary} 
                    />
                    <View style={styles.paymentOptionText}>
                      <Text style={[styles.paymentOptionTitle, questionAdCount < 3 && styles.paymentOptionTitleDisabled]}>
                        Reklam ile Ücretsiz
                      </Text>
                      <Text style={[styles.paymentOptionSubtitle, questionAdCount < 3 && styles.paymentOptionSubtitleDisabled]}>
                        {questionAdCount >= 3 
                          ? 'Artık ücretsiz soru sorabilirsiniz!' 
                          : `${questionAdCount}/3 reklam izlendi. ${3 - questionAdCount} reklam daha gerekli.`
                        }
                      </Text>
                    </View>
                    <View style={[styles.radioButton, selectedPaymentMethod === 'ad' && styles.radioButtonSelected]} />
                  </View>
                </TouchableOpacity>
              </View>

              {/* Soru Input */}
              <View style={styles.questionInputContainer}>
                <Text style={styles.inputLabel}>Falınız hakkında merak ettiğiniz soruyu yazın:</Text>
                <TextInput
                  style={styles.questionInput}
                  placeholder="Örn: Aşk hayatım hakkında söylediklerinizi daha detaylandırabilir misiniz?"
                  placeholderTextColor={colors.text.tertiary}
                  value={newQuestion}
                  onChangeText={setNewQuestion}
                  multiline={true}
                  numberOfLines={4}
                  maxLength={500}
                />
                <Text style={styles.characterCount}>
                  {newQuestion.length}/500 karakter
                </Text>
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowQuestionModal(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitButton, (questionSubmitting || questionLoading || !newQuestion.trim()) && styles.submitButtonDisabled]}
                  onPress={handleSubmitQuestion}
                  disabled={questionSubmitting || questionLoading || !newQuestion.trim()}
                >
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {questionSubmitting || questionLoading ? (
                      <ActivityIndicator size="small" color={colors.text.light} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="send" size={18} color={colors.text.light} />
                        <Text style={styles.submitButtonText}>Gönder</Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>

              {/* Loading mesajı */}
              {questionLoading && (
                <View style={styles.loadingMessage}>
                  <ActivityIndicator size="small" color={colors.secondary} />
                  <Text style={styles.loadingText}>Sorunuz yanıtlanıyor...</Text>
                </View>
              )}
            </LinearGradient>
          </View>
        </View>
      </Modal>

      {/* Yorum Modal */}
      <Modal
        visible={showReviewModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowReviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <LinearGradient
              colors={[colors.card, colors.background]}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
              style={styles.modalGradient}
            >
              {/* Modal Header */}
              <View style={styles.modalHeader}>
                <View style={styles.modalTitleContainer}>
                  <MaterialCommunityIcons name="star-plus" size={24} color={colors.secondary} />
                  <Text style={styles.modalTitle}>
                    {userReview ? 'Deneyimi Güncelle' : 'Deneyim Paylaş'}
                  </Text>
                </View>
                <TouchableOpacity 
                  style={styles.modalCloseButton}
                  onPress={() => setShowReviewModal(false)}
                >
                  <Ionicons name="close" size={24} color={colors.text.tertiary} />
                </TouchableOpacity>
              </View>

              {/* Yıldız Puanlama */}
              <View style={styles.ratingContainer}>
                <Text style={styles.ratingTitle}>Bu faldan ne kadar memnun kaldınız?</Text>
                <View style={styles.starsContainer}>
                  {[1, 2, 3, 4, 5].map((star) => (
                    <TouchableOpacity
                      key={star}
                      style={styles.starButton}
                      onPress={() => setReviewRating(star)}
                    >
                      <FontAwesome5 
                        name="star" 
                        size={30} 
                        color={star <= reviewRating ? colors.secondary : colors.text.tertiary} 
                      />
                    </TouchableOpacity>
                  ))}
                </View>
                <Text style={styles.ratingDescription}>
                  {reviewRating === 0 ? 'Puan verin' :
                   reviewRating === 1 ? 'Çok kötü' :
                   reviewRating === 2 ? 'Kötü' :
                   reviewRating === 3 ? 'Orta' :
                   reviewRating === 4 ? 'İyi' : 'Mükemmel'}
                </Text>
              </View>

              {/* Yorum Input */}
              <View style={styles.reviewInputContainer}>
                <Text style={styles.inputLabel}>Deneyiminizi paylaşın (opsiyonel):</Text>
                <TextInput
                  style={styles.reviewInput}
                  placeholder="Falınız hakkında düşüncelerinizi yazın..."
                  placeholderTextColor={colors.text.tertiary}
                  value={reviewText}
                  onChangeText={setReviewText}
                  multiline={true}
                  numberOfLines={4}
                  maxLength={300}
                />
                <Text style={styles.characterCount}>
                  {reviewText.length}/300 karakter
                </Text>
              </View>

              {/* Modal Buttons */}
              <View style={styles.modalButtons}>
                <TouchableOpacity 
                  style={styles.cancelButton}
                  onPress={() => setShowReviewModal(false)}
                >
                  <Text style={styles.cancelButtonText}>İptal</Text>
                </TouchableOpacity>

                <TouchableOpacity 
                  style={[styles.submitButton, (reviewSubmitting || reviewRating === 0) && styles.submitButtonDisabled]}
                  onPress={handleSubmitReview}
                  disabled={reviewSubmitting || reviewRating === 0}
                >
                  <LinearGradient
                    colors={[colors.secondary, colors.primary]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.submitButtonGradient}
                  >
                    {reviewSubmitting ? (
                      <ActivityIndicator size="small" color={colors.text.light} />
                    ) : (
                      <>
                        <MaterialCommunityIcons name="send" size={18} color={colors.text.light} />
                        <Text style={styles.submitButtonText}>
                          {userReview ? 'Güncelle' : 'Gönder'}
                        </Text>
                      </>
                    )}
                  </LinearGradient>
                </TouchableOpacity>
              </View>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: 10,
    fontSize: 16,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    color: colors.text.primary,
    fontSize: 18,
    marginTop: 20,
    marginBottom: 30,
  },
  errorButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
  },
  errorButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: 20,
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
    paddingHorizontal: 20,
  },
  statusSection: {
    marginTop: 20,
    marginBottom: 20,
  },
  statusCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  statusHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  categoryInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  categoryIcon: {
    width: 50,
    height: 50,
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 15,
  },
  categoryText: {
    flex: 1,
  },
  categoryTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 5,
  },
  categoryDate: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  statusBadge: {
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  statusText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  tokenText: {
    color: colors.secondary,
    fontWeight: 'bold',
    marginLeft: 6,
    fontSize: 16,
    lineHeight: 16,
  },
  fortuneTellerSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 15,
  },
  fortuneTellerCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  fortuneTellerHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  fortuneTellerImageContainer: {
    position: 'relative',
    marginRight: 15,
    alignSelf: 'flex-start',
    width: 80,
    height: 80,
  },
  fortuneTellerImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  fortuneTellerImageGlow: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    backgroundColor: colors.secondary,
    opacity: 0.2,
    borderRadius: 43,
    zIndex: -1,
  },
  fortuneTellerInfo: {
    flex: 1,
    justifyContent: 'flex-start',
  },
  fortuneTellerName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 4,
    lineHeight: 22,
  },
  fortuneTellerExperience: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 6,
    lineHeight: 18,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
    marginTop: 2,
    flexWrap: 'nowrap',
  },
  starsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-start',
  },
  starIcon: {
    marginRight: 2,
    marginLeft: 0,
  },
  ratingText: {
    color: colors.secondary,
    fontWeight: 'bold',
    marginLeft: 8,
    fontSize: 14,
    lineHeight: 14,
  },
  fortuneTellerBio: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 15,
  },
  specialtiesContainer: {
    marginTop: 10,
  },
  specialtiesTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 8,
  },
  specialtiesList: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  specialtyTag: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 8,
  },
  specialtyText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: 'bold',
  },
  imagesSection: {
    marginBottom: 20,
  },
  imagesScrollView: {
    marginBottom: 10,
  },
  imageContainer: {
    marginRight: 15,
    borderRadius: 15,
    overflow: 'hidden',
    position: 'relative',
  },
  fortuneImage: {
    width: 120,
    height: 120,
    borderRadius: 15,
  },
  imageOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    paddingVertical: 5,
    paddingHorizontal: 10,
  },
  imageNumber: {
    color: colors.text.light,
    fontSize: 12,
    textAlign: 'center',
  },
  descriptionSection: {
    marginBottom: 20,
  },
  descriptionCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  descriptionText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  fortuneTextSection: {
    marginBottom: 20,
  },
  fortuneTextCard: {
    borderRadius: 20,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  fortuneTextHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  fortuneTextTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 10,
  },
  fortuneText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: 15,
  },
  completionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(76, 175, 80, 0.1)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 10,
  },
  completionText: {
    color: colors.success,
    fontSize: 12,
    marginLeft: 8,
    fontWeight: 'bold',
  },
  statusBadgeAbsolute: {
    position: 'absolute',
    top: 16,
    right: 16,
    zIndex: 2,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    minWidth: 70,
    alignItems: 'center',
    justifyContent: 'center',
  },
  // Seçilen kartlar stilleri
  selectedCardsSection: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  selectedCardsWrapper: {
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    overflow: 'hidden',
  },
  selectedCardsContainer: {
    padding: 20,
  },
  selectedCardsTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 15,
    textAlign: 'center',
  },
  // Tarot kartları stilleri
  tarotCardsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    gap: 10,
  },
  tarotCard: {
    flex: 1,
    alignItems: 'center',
    padding: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  tarotCardPosition: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginBottom: 6,
  },
  tarotCardName: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 6,
  },
  tarotCardMeaning: {
    fontSize: 11,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  // Katina kartları stilleri
  katinaCardsContainer: {
    gap: 15,
  },
  katinaCardGroup: {
    alignItems: 'center',
  },
  katinaCardGroupTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 10,
  },
  katinaCardsRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    flexWrap: 'wrap',
  },
  katinaCard: {
    padding: 10,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    minWidth: 80,
    alignItems: 'center',
  },
  katinaCardText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  
  // Ek Soru Buton Stilleri
  questionButtonsContainer: {
    marginTop: 15,
    gap: 5,
  },
  orDivider: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 5,
    paddingHorizontal: 20,
  },
  orLine: {
    flex: 1,
    height: 1,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
  },
  orText: {
    color: colors.text.secondary,
    fontSize: 14,
    fontWeight: '500',
    marginHorizontal: 15,
    fontStyle: 'italic',
  },
  askQuestionButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  adQuestionEnabled: {
    shadowColor: colors.success,
  },
  askQuestionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  askQuestionText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    marginRight: 15,
  },
  tokenCost: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tokenCostText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 14,
    marginLeft: 4,
  },
  adProgress: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  adProgressText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 12,
  },

  // Ek Sorular Listesi Stilleri
  questionsSection: {
    marginBottom: 20,
  },
  questionCard: {
    marginBottom: 15,
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 5,
  },
  questionGradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  questionHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 15,
  },
  questionNumber: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 15,
  },
  questionNumberText: {
    color: colors.text.dark,
    fontWeight: 'bold',
    fontSize: 14,
  },
  questionTextContainer: {
    flex: 1,
  },
  questionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 5,
  },
  questionText: {
    fontSize: 14,
    color: colors.text.light,
    lineHeight: 20,
  },
  answerSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  answerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  answerLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.secondary,
    marginLeft: 8,
  },
  answerText: {
    fontSize: 14,
    color: colors.text.light,
    lineHeight: 22,
    marginBottom: 10,
  },
  answerTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  answerTimeText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginLeft: 5,
  },
  pendingSection: {
    marginTop: 15,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 215, 0, 0.2)',
  },
  pendingHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  pendingLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.warning,
    marginLeft: 8,
  },
  estimatedTime: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  estimatedTimeText: {
    fontSize: 11,
    color: colors.text.tertiary,
    marginLeft: 5,
    fontStyle: 'italic',
  },

  // Modal Stilleri
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'flex-end',
  },
  modalContainer: {
    borderTopLeftRadius: 25,
    borderTopRightRadius: 25,
    overflow: 'hidden',
    maxHeight: '90%',
  },
  modalGradient: {
    padding: 25,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 10,
  },
  modalCloseButton: {
    padding: 5,
  },
  modalTokenInfo: {
    marginBottom: 20,
    borderRadius: 12,
    overflow: 'hidden',
  },
  tokenInfoGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 15,
  },
  tokenInfoText: {
    color: colors.text.light,
    fontWeight: '600',
    fontSize: 14,
    marginLeft: 8,
  },
  questionInputContainer: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.light,
    marginBottom: 10,
  },
  questionInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: colors.text.light,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  characterCount: {
    fontSize: 12,
    color: colors.text.tertiary,
    textAlign: 'right',
    marginTop: 5,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 15,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 15,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  cancelButtonText: {
    color: colors.text.light,
    fontWeight: '600',
    fontSize: 16,
  },
  submitButton: {
    flex: 1,
    borderRadius: 12,
    overflow: 'hidden',
  },
  submitButtonDisabled: {
    opacity: 0.6,
  },
  submitButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
  },
  submitButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
  },
  loadingMessage: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 15,
    padding: 15,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: 12,
  },
  loadingText: {
    color: colors.text.light,
    fontSize: 14,
    marginLeft: 10,
    fontWeight: '500',
  },

  // Ödeme Yöntemi Seçimi Stilleri
  paymentMethodContainer: {
    marginBottom: 20,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 15,
  },
  paymentOption: {
    borderRadius: 12,
    borderWidth: 2,
    borderColor: 'rgba(255, 215, 0, 0.2)',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: 10,
    overflow: 'hidden',
  },
  paymentOptionSelected: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  paymentOptionContent: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
  },
  paymentOptionDisabled: {
    opacity: 0.5,
  },
  paymentOptionText: {
    flex: 1,
    marginLeft: 12,
  },
  paymentOptionTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 4,
  },
  paymentOptionTitleDisabled: {
    color: colors.text.tertiary,
  },
  paymentOptionSubtitle: {
    fontSize: 12,
    color: colors.text.secondary,
    lineHeight: 16,
  },
  paymentOptionSubtitleDisabled: {
    color: colors.text.tertiary,
  },
  radioButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: colors.text.tertiary,
    marginLeft: 10,
  },
  radioButtonSelected: {
    borderColor: colors.secondary,
    backgroundColor: colors.secondary,
  },

  // Yorum Butonu Stilleri
  reviewButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    marginBottom: 15,
  },
  reviewButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  reviewButtonText: {
    color: colors.text.light,
    fontWeight: 'bold',
    fontSize: 16,
    marginLeft: 8,
    marginRight: 10,
  },
  userRatingDisplay: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
  },

  // Yorum Modal Stilleri
  ratingContainer: {
    alignItems: 'center',
    marginBottom: 25,
    paddingVertical: 20,
    paddingHorizontal: 15,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.2)',
  },
  ratingTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 20,
    textAlign: 'center',
  },
  starsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 15,
  },
  starButton: {
    padding: 5,
    borderRadius: 25,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
  },
  ratingDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.secondary,
    textAlign: 'center',
    marginTop: 5,
  },
  reviewInputContainer: {
    marginBottom: 20,
  },
  reviewInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 12,
    padding: 15,
    color: colors.text.light,
    fontSize: 14,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
});

export default FortuneDetailScreen; 