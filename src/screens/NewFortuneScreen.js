import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  Dimensions,
  Platform,
  KeyboardAvoidingView,
  Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { Picker } from '@react-native-picker/picker';
import { supabase } from '../../lib/supabase';
import { getFortuneTellersByCategory, getUserProfileForFortune, checkHoroscopeDailyLimit, incrementHoroscopeDailyCount } from '../services/supabaseService';
import AIFortuneService from '../services/aiFortuneService';
import colors from '../styles/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import badgeService from '../services/badgeService';

// Kart falları için import'lar
import CardComponent from '../components/CardComponent';
import { 
  createTarotDeck, 
  createKatinaDeck, 
  shuffleDeck, 
  drawKatinaFortune, 
  drawTarotFortune,
  prepareAnimatedDeck,
  shuffleAnimation
} from '../services/cardService';

const { width } = Dimensions.get('window');
const USER_TOKENS_KEY = '@user_tokens';

const NewFortuneScreen = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { fortuneType } = route.params || { fortuneType: { id: 1, name: 'Kahve Falı' } };
  
  const [images, setImages] = useState([null, null, null]);
  const [description, setDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [fortuneTellers, setFortuneTellers] = useState([]);
  const [selectedFortuneTeller, setSelectedFortuneTeller] = useState(null);
  const [userTokens, setUserTokens] = useState(0);
  
  // El Falı için state'ler
  const [selectedHand, setSelectedHand] = useState('right'); // 'right', 'left', 'both'
  const [rightHandImage, setRightHandImage] = useState(null);
  const [leftHandImage, setLeftHandImage] = useState(null);
  
  // Yüz Falı için state'ler
  const [faceImage, setFaceImage] = useState(null);
  
  // Yıldızname için state'ler
  const [birthDate, setBirthDate] = useState(new Date());
  const [birthTime, setBirthTime] = useState(new Date());
  const [birthCity, setBirthCity] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [showCityModal, setShowCityModal] = useState(false);
  
  // Rüya Yorumu için state'ler
  const [dreamText, setDreamText] = useState('');
  
  // Burç Yorumları için state'ler
  const [selectedZodiacSign, setSelectedZodiacSign] = useState('');
  const [selectedPeriod, setSelectedPeriod] = useState('günlük'); // 'günlük', 'haftalık', 'aylık'
  const [horoscopeDailyLimit, setHoroscopeDailyLimit] = useState(null);
  const [horoscopeLoading, setHoroscopeLoading] = useState(false);
  
  // Kart falları için state'ler
  const [tarotCards, setTarotCards] = useState({ past: null, present: null, future: null });
  const [selectedTarotCards, setSelectedTarotCards] = useState([]);
  const [tarotDeck, setTarotDeck] = useState([]);
  const [tarotStep, setTarotStep] = useState('selection'); // 'selection', 'reveal'
  const [isShufflingTarot, setIsShufflingTarot] = useState(false);
  const [tarotDealAnimation, setTarotDealAnimation] = useState(false);
  
  const [katinaCards, setKatinaCards] = useState({ yourCards: [], theirCards: [], sharedCard: null });
  const [katinaStep, setKatinaStep] = useState('selection'); // 'selection', 'reveal'
  const [isShufflingKatina, setIsShufflingKatina] = useState(false);
  const [katinaDealAnimation, setKatinaDealAnimation] = useState(false);
  
  // Burç listesi
  const zodiacSigns = [
    { key: 'koc', name: 'Koç', icon: 'ram', dates: '21 Mart - 19 Nisan' },
    { key: 'boga', name: 'Boğa', icon: 'bull', dates: '20 Nisan - 20 Mayıs' },
    { key: 'ikizler', name: 'İkizler', icon: 'twins', dates: '21 Mayıs - 20 Haziran' },
    { key: 'yengec', name: 'Yengeç', icon: 'crab', dates: '21 Haziran - 22 Temmuz' },
    { key: 'aslan', name: 'Aslan', icon: 'lion', dates: '23 Temmuz - 22 Ağustos' },
    { key: 'basak', name: 'Başak', icon: 'wheat', dates: '23 Ağustos - 22 Eylül' },
    { key: 'terazi', name: 'Terazi', icon: 'balance-scale', dates: '23 Eylül - 22 Ekim' },
    { key: 'akrep', name: 'Akrep', icon: 'scorpion', dates: '23 Ekim - 21 Kasım' },
    { key: 'yay', name: 'Yay', icon: 'bow-arrow', dates: '22 Kasım - 21 Aralık' },
    { key: 'oglak', name: 'Oğlak', icon: 'goat', dates: '22 Aralık - 19 Ocak' },
    { key: 'kova', name: 'Kova', icon: 'water', dates: '20 Ocak - 18 Şubat' },
    { key: 'balik', name: 'Balık', icon: 'fish', dates: '19 Şubat - 20 Mart' },
  ];
  
  // Türkiye şehirleri listesi
  const turkishCities = [
    'Adana', 'Adıyaman', 'Afyonkarahisar', 'Ağrı', 'Amasya', 'Ankara', 'Antalya', 'Artvin',
    'Aydın', 'Balıkesir', 'Bilecik', 'Bingöl', 'Bitlis', 'Bolu', 'Burdur', 'Bursa', 'Çanakkale',
    'Çankırı', 'Çorum', 'Denizli', 'Diyarbakır', 'Edirne', 'Elazığ', 'Erzincan', 'Erzurum',
    'Eskişehir', 'Gaziantep', 'Giresun', 'Gümüşhane', 'Hakkâri', 'Hatay', 'Isparta', 'Mersin',
    'İstanbul', 'İzmir', 'Kars', 'Kastamonu', 'Kayseri', 'Kırklareli', 'Kırşehir', 'Kocaeli',
    'Konya', 'Kütahya', 'Malatya', 'Manisa', 'Kahramanmaraş', 'Mardin', 'Muğla', 'Muş',
    'Nevşehir', 'Niğde', 'Ordu', 'Rize', 'Sakarya', 'Samsun', 'Siirt', 'Sinop', 'Sivas',
    'Tekirdağ', 'Tokat', 'Trabzon', 'Tunceli', 'Şanlıurfa', 'Uşak', 'Van', 'Yozgat', 'Zonguldak',
    'Aksaray', 'Bayburt', 'Karaman', 'Kırıkkale', 'Batman', 'Şırnak', 'Bartın', 'Ardahan',
    'Iğdır', 'Yalova', 'Karabük', 'Kilis', 'Osmaniye', 'Düzce'
  ];
  
  useEffect(() => {
    (async () => {
      // Kamera ve galeri izinlerini kontrol et
      if (Platform.OS !== 'web') {
        const { status: cameraStatus } = await ImagePicker.requestCameraPermissionsAsync();
        const { status: libraryStatus } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (cameraStatus !== 'granted' || libraryStatus !== 'granted') {
          Alert.alert('Uyarı', 'Fal göndermek için kamera ve galeri izinleri gereklidir.');
        }
      }
    })();
    
    fetchFortuneTellers();
    fetchUserTokens();
    
    // Kart falları için initialization
    initializeCardFortunes();
    
    // Burç yorumları için günlük hak bilgisini al
    if (fortuneType.name.toLowerCase() === 'burç yorumları') {
      fetchHoroscopeDailyLimit();
    }
  }, [fortuneType.name]);
  
  const fetchUserTokens = async () => {
    try {
      // AsyncStorage'dan kontrol et
      const storedTokens = await AsyncStorage.getItem(USER_TOKENS_KEY);
      if (storedTokens) {
        setUserTokens(parseInt(storedTokens, 10));
      }
      
      // Veritabanından güncel bilgiyi al
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
          await AsyncStorage.setItem(USER_TOKENS_KEY, tokenBalance.toString());
        }
      }
    } catch (error) {
      console.error('Jeton bilgisi alınamadı:', error);
    }
  };

  // Burç yorumları için günlük hak bilgisini al
  const fetchHoroscopeDailyLimit = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const dailyLimit = await checkHoroscopeDailyLimit(user.id);
      setHoroscopeDailyLimit(dailyLimit);
    } catch (error) {
      console.error('Burç yorumu günlük limit bilgisi alınamadı:', error);
    }
  };
  
  // Kart falları initialization
  const initializeCardFortunes = () => {
    const falType = fortuneType.name.toLowerCase();
    
    if (falType === 'tarot falı') {
      // Tarot için animasyonlu başlatma
      setIsShufflingTarot(true);
      setTarotDealAnimation(false);
      
      // Karıştırma animasyonu
      const initialDeck = prepareAnimatedDeck('tarot', 12);
      shuffleAnimation(initialDeck, 3, (shuffledDeck, iteration, isComplete) => {
        setTarotDeck(shuffledDeck);
        if (isComplete) {
          setIsShufflingTarot(false);
          setTarotDealAnimation(true);
        }
      });
    } else if (falType === 'katina falı') {
      // Katina için animasyonlu başlatma
      setIsShufflingKatina(true);
      setKatinaDealAnimation(false);
      setKatinaStep('selection'); // Step'i selection olarak ayarla
      
      setTimeout(() => {
        const cards = drawKatinaFortune();
        setKatinaCards(cards);
        setIsShufflingKatina(false);
        setKatinaDealAnimation(true);
      }, 1500); // 1.5 saniye karıştırma
    }
  };
  
  // Tarot kart seçimi
  const handleTarotCardSelect = (card) => {
    if (selectedTarotCards.length >= 3) return;
    
    const newSelected = [...selectedTarotCards, card];
    setSelectedTarotCards(newSelected);
    
    // 3 kart seçilince otomatik olarak çevir
    if (newSelected.length === 3) {
      setTimeout(() => {
        const tarotReading = {
          past: { ...newSelected[0], position: 'Geçmiş' },
          present: { ...newSelected[1], position: 'Şimdi' },
          future: { ...newSelected[2], position: 'Gelecek' }
        };
        setTarotCards(tarotReading);
        setTarotStep('reveal');
      }, 500);
    }
  };
  
  // Tarot kartlarını sıfırla
  const resetTarotCards = () => {
    setSelectedTarotCards([]);
    setTarotCards({ past: null, present: null, future: null });
    setTarotStep('selection');
    initializeCardFortunes();
  };
  
  // Katina kartlarını çevir
  const revealKatinaCards = () => {
    setKatinaStep('reveal');
  };
  
  // Katina kartlarını sıfırla
  const resetKatinaCards = () => {
    setKatinaStep('selection');
    setKatinaCards({ yourCards: [], theirCards: [], sharedCard: null });
    initializeCardFortunes();
  };
  
  const fetchFortuneTellers = async () => {
    try {
      setLoading(true);
      
      // Fal türünü standart formata çevir
      const falType = getCategoryKey(fortuneType.name);
      
      const { data, error } = await getFortuneTellersByCategory(falType);
      
      if (error) throw error;
      
      setFortuneTellers(data || []);
    } catch (error) {
      console.error('Falcılar alınamadı:', error);
      Alert.alert('Hata', 'Falcılar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };
  
  const pickImage = async (index, source) => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.5,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.5,
        });
      }
      
      if (!result.canceled) {
        const newImages = [...images];
        newImages[index] = result.assets[0].uri;
        setImages(newImages);
      }
    } catch (error) {
      console.error('Resim seçilirken hata oluştu:', error);
      Alert.alert('Hata', 'Resim seçilirken bir hata oluştu.');
    }
  };

  // El falı için özel fotoğraf çekme fonksiyonu
  const pickHandImage = async (hand, source) => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.7,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 5],
          quality: 0.7,
        });
      }
      
      if (!result.canceled) {
        if (hand === 'Sağ El') {
          setRightHandImage(result.assets[0].uri);
        } else if (hand === 'Sol El') {
          setLeftHandImage(result.assets[0].uri);
        }
      }
    } catch (error) {
      console.error('El fotoğrafı seçilirken hata oluştu:', error);
      Alert.alert('Hata', 'El fotoğrafı seçilirken bir hata oluştu.');
    }
  };

  // Yüz falı için özel fotoğraf çekme fonksiyonu
  const pickFaceImage = async (source) => {
    try {
      let result;
      
      if (source === 'camera') {
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [3, 4],
          quality: 0.8,
        });
      }
      
      if (!result.canceled) {
        setFaceImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Yüz fotoğrafı seçilirken hata oluştu:', error);
      Alert.alert('Hata', 'Yüz fotoğrafı seçilirken bir hata oluştu.');
    }
  };
  
  const uploadImageToSupabase = async (uri) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');
      
      
      // Dosya adını oluştur
      const fileExt = uri.split('.').pop().toLowerCase();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `fortune_images/${fileName}`;
      
      // React Native'den dosyayı oku
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // ArrayBuffer'a çevir (EditProfileScreen'daki gibi)
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      
      
      // Supabase Storage'a yükle
      const { data, error } = await supabase.storage
        .from('fortunes')
        .upload(filePath, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false
        });
      
      if (error) {
        console.error('❌ Fal görseli upload hatası:', error);
        throw error;
      }
      
      
      // Yüklenen dosyanın URL'sini al
      const { data: urlData } = supabase.storage
        .from('fortunes')
        .getPublicUrl(filePath);
      
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('❌ Resim yüklenirken hata oluştu:', error);
      throw new Error('Resim yüklenirken bir hata oluştu: ' + error.message);
    }
  };
  
  // Fal türü ismini veritabanı kategorisine çeviren yardımcı fonksiyon
  const getCategoryKey = (name) => {
    switch (name.toLowerCase()) {
      case 'kahve falı':
        return 'kahve falı';
      case 'tarot falı':
        return 'tarot falı';
      case 'katina falı':
        return 'katina falı';
      case 'el falı':
        return 'el falı';
      case 'yüz falı':
        return 'yüz falı';
      case 'yıldızname':
        return 'yıldızname';
      case 'rüya yorumu':
        return 'rüya yorumu';
      case 'burç yorumları':
        return 'burç yorumları';
      default:
        return name.toLowerCase();
    }
  };

  // Burç yorumları için özel submit fonksiyonu (ücretsiz)
  const handleHoroscopeSubmit = async () => {
    try {
      // Burç seçimi kontrolü
      if (!selectedZodiacSign) {
        return Alert.alert('Uyarı', 'Lütfen burcunuzu seçin.');
      }

      setHoroscopeLoading(true);

      // Kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');

      // Günlük burç yorumu hakkını kontrol et
      const dailyLimit = await checkHoroscopeDailyLimit(user.id);
      
      if (!dailyLimit.canUse) {
        Alert.alert(
          'Günlük Limit Doldu! 🌟',
          `Bugün ${dailyLimit.totalCount} burç yorumu hakkınızı kullandınız. Yarın tekrar deneyebilirsiniz.`,
          [{ text: 'Tamam' }]
        );
        setHoroscopeLoading(false);
        return;
      }


      
      // Kullanıcı profil bilgilerini al
      const userProfile = await getUserProfileForFortune(user.id);


      // AI'dan burç yorumu al
      const zodiacName = zodiacSigns.find(z => z.key === selectedZodiacSign)?.name || selectedZodiacSign;
      const horoscopePrompt = `${zodiacName} burcu için ${selectedPeriod} yorum ${description ? '- ' + description : ''}`.trim();
      

      const fortuneText = await AIFortuneService.generateFortune(
         'Burç Yorumları',
         [], // Resim yok
         userProfile,
         horoscopePrompt,
         null, // Falcı yok
         { period: selectedPeriod, zodiac_sign: selectedZodiacSign } // Özel veriler
       );


      if (!fortuneText) {
        throw new Error('Burç yorumu oluşturulamadı');
      }


      // Özel veriler hazırla
      const specialData = {
        zodiac_sign: selectedZodiacSign,
        period: selectedPeriod
      };

      const finalDescription = `${zodiacName} burcu için ${selectedPeriod} yorum ${description ? '- ' + description : ''}`.trim();

      // Burç yorumu kaydını oluştur (ücretsiz)
      const { data: fortune, error: fortuneError } = await supabase
        .from('fortunes')
        .insert({
          user_id: user.id,
          fortune_teller_id: null, // Falcı yok
          category: getCategoryKey(fortuneType.name),
          status: 'tamamlandı', // Direkt tamamlandı
          image_url: JSON.stringify([]), // Resim yok
          description: finalDescription,
          fortune_text: fortuneText,
          token_amount: 0, // Ücretsiz
          process_after: new Date().toISOString(), // Şimdi
          completed_at: new Date().toISOString(), // Hemen tamamlandı
          special_data: JSON.stringify(specialData),
        })
        .select()
        .single();

      if (fortuneError) throw fortuneError;


      // Günlük sayacı artır
      await incrementHoroscopeDailyCount(user.id);

      Alert.alert(
        'Burç Yorumunuz Hazır! 🌟',
        `Ücretsiz burç yorumunuz hazırlandı. Bugün ${dailyLimit.remainingCount - 1} hakkınız kaldı.`,
        [
          { 
            text: 'Yorumu Gör', 
            onPress: () => navigation.navigate('FortuneDetail', { fortuneId: fortune.id })
          }
        ]
      );

    } catch (error) {
      console.error('Burç yorumu oluşturma hatası:', error);
      Alert.alert('Hata', 'Burç yorumunuz oluşturulurken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setHoroscopeLoading(false);
    }
  };

  const handleSubmit = async () => {
    try {
      // Burç yorumları için özel işlem
      const falType = fortuneType.name.toLowerCase();
      
      if (falType === 'burç yorumları') {
        return handleHoroscopeSubmit();
      }
      
      // Diğer fal türleri için kontroller
      if (!selectedFortuneTeller) {
        return Alert.alert('Uyarı', 'Lütfen bir falcı seçin.');
      }
      
      // Fal türüne göre validation
      
      if (falType === 'el falı') {
        const hasRightHand = selectedHand === 'right' || selectedHand === 'both';
        const hasLeftHand = selectedHand === 'left' || selectedHand === 'both';
        
        if ((hasRightHand && !rightHandImage) || (hasLeftHand && !leftHandImage)) {
          return Alert.alert('Uyarı', 'Lütfen seçtiğiniz el(ler)in fotoğrafını yükleyin.');
        }
        if (!hasRightHand && !hasLeftHand) {
          return Alert.alert('Uyarı', 'Lütfen en az bir el seçin.');
        }
      } else if (falType === 'yüz falı') {
        if (!faceImage) {
          return Alert.alert('Uyarı', 'Lütfen yüz fotoğrafınızı yükleyin.');
        }
      } else if (falType === 'yıldızname') {
        if (!birthCity) {
          return Alert.alert('Uyarı', 'Lütfen doğum şehrinizi seçin.');
        }
             } else if (falType === 'rüya yorumu') {
         if (!dreamText.trim()) {
           return Alert.alert('Uyarı', 'Lütfen rüyanızı anlatın.');
         }
         if (dreamText.trim().length < 20) {
           return Alert.alert('Uyarı', 'Lütfen rüyanızı daha detaylı anlatın (en az 20 karakter).');
         }
       } else if (falType === 'burç yorumları') {
         if (!selectedZodiacSign) {
           return Alert.alert('Uyarı', 'Lütfen burcunuzu seçin.');
         }
       } else if (falType === 'tarot falı') {
         // Tarot falı için kart seçimi kontrolü
         if (tarotStep !== 'reveal') {
           return Alert.alert('Uyarı', 'Lütfen 3 tarot kartı seçin.');
         }
       } else if (falType === 'katina falı') {
         // Katina falı için kart seçimi kontrolü
         if (katinaStep !== 'reveal') {
           return Alert.alert('Uyarı', 'Lütfen kartları çevirin.');
         }
       } else {
        // Geleneksel fal türleri için resim kontrolü (kahve falı)
        if (!images.some(img => img !== null)) {
          return Alert.alert('Uyarı', 'Lütfen en az bir resim yükleyin.');
        }
      }
      
      // Jeton kontrolü
      const requiredTokens = selectedFortuneTeller.price_per_fortune;
      if (userTokens < requiredTokens) {
        return Alert.alert(
          'Yetersiz Jeton',
          `Bu fal için ${requiredTokens} jeton gerekiyor. Jeton satın almak ister misiniz?`,
          [
            { text: 'İptal', style: 'cancel' },
            { text: 'Jeton Satın Al', onPress: () => navigation.navigate('TokenStore') }
          ]
        );
      }
      
      setLoading(true);
      
      // Kullanıcı bilgisini al
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');
      
      // Fal türüne göre resimleri yükle
      const imageUrls = [];
      
      if (falType === 'el falı') {
        if (rightHandImage) {
          const url = await uploadImageToSupabase(rightHandImage);
          imageUrls.push(url);
        }
        if (leftHandImage) {
          const url = await uploadImageToSupabase(leftHandImage);
          imageUrls.push(url);
        }
      } else if (falType === 'yüz falı') {
        if (faceImage) {
          const url = await uploadImageToSupabase(faceImage);
          imageUrls.push(url);
        }
      } else if (falType === 'kahve falı') {
        // Sadece kahve falı için resim yükleme
        for (const image of images) {
          if (image) {
            const url = await uploadImageToSupabase(image);
            imageUrls.push(url);
          }
        }
      }
      // Tarot ve katina falları için resim yükleme yapılmaz (kartlar zaten seçilmiş)
      
      let fortuneText = '';
      let status = 'beklemede';
      
      // Fal kaydı için özel veriler hazırla (AI servisi çağrılmadan önce)
              let specialData = {};
        
        if (falType === 'el falı') {
          specialData.hand_selection = selectedHand;
        } else if (falType === 'yıldızname') {
          specialData.birth_date = birthDate.toISOString();
          specialData.birth_time = birthTime.toTimeString().slice(0, 5); // HH:MM formatında
          specialData.birth_city = birthCity;
        } else if (falType === 'rüya yorumu') {
          specialData.dream_text = dreamText.trim();
        } else if (falType === 'burç yorumları') {
          specialData.zodiac_sign = selectedZodiacSign;
          specialData.period = selectedPeriod;
        } else if (falType === 'tarot falı') {
          specialData.selected_cards = tarotCards;
        } else if (falType === 'katina falı') {
          specialData.selected_cards = katinaCards;
        }
        


      // Fal oluşturma
      try {
        
        // Kullanıcı profil bilgilerini al
        const userProfile = await getUserProfileForFortune(user.id);
        
        // Fal oluştur
        fortuneText = await AIFortuneService.generateFortune(
          fortuneType.name,
          imageUrls,
          userProfile,
          description,
          selectedFortuneTeller,
          specialData
        );
        
        status = 'yorumlanıyor';
      } catch (falError) {
        console.error('❌ Fal oluşturma hatası:', falError);
        
        // Fal başarısız olursa işlemi durdur
        Alert.alert(
          'Fal Hatası', 
          'Fal oluşturulurken bir hata oluştu. Lütfen daha sonra tekrar deneyin veya profesyonel falcı seçeneğini kullanın.',
          [{ text: 'Tamam' }]
        );
        setLoading(false);
        return; // İşlemi burada durdur, jeton düşürülmesin
      }
      
          // 20-30 dakika arası random süre hesapla
    const randomMinutes = Math.floor(Math.random() * 11) + 20; // 20-30 dakika
    const processAfter = new Date(Date.now() + randomMinutes * 60 * 1000);
      
      if (falType === 'el falı') {
        specialData.hand_selection = selectedHand;
      } else if (falType === 'yıldızname') {
        specialData.birth_date = birthDate.toISOString();
        specialData.birth_time = birthTime.toTimeString().slice(0, 5); // HH:MM formatında
        specialData.birth_city = birthCity;
      } else if (falType === 'rüya yorumu') {
        specialData.dream_text = dreamText.trim();
      } else if (falType === 'burç yorumları') {
        specialData.zodiac_sign = selectedZodiacSign;
        specialData.period = selectedPeriod;
      } else if (falType === 'tarot falı') {
        specialData.selected_cards = tarotCards;
      } else if (falType === 'katina falı') {
        specialData.selected_cards = katinaCards;
      }
      
      // Description'ı türe göre ayarla
      let finalDescription = description;
      if (falType === 'rüya yorumu') {
        finalDescription = dreamText.trim();
      } else if (falType === 'yıldızname') {
        finalDescription = `Doğum: ${birthDate.toLocaleDateString('tr-TR')} ${birthTime.toTimeString().slice(0, 5)}, ${birthCity}`;
             } else if (falType === 'el falı') {
         finalDescription = `${description} (${selectedHand === 'right' ? 'Sağ El' : selectedHand === 'left' ? 'Sol El' : 'Her İki El'})`.trim();
       } else if (falType === 'burç yorumları') {
         const zodiacName = zodiacSigns.find(z => z.key === selectedZodiacSign)?.name || selectedZodiacSign;
         finalDescription = `${zodiacName} burcu için ${selectedPeriod} yorum ${description ? '- ' + description : ''}`.trim();
       }

      // Fal kaydı oluştur
      const { data: fortune, error: fortuneError } = await supabase
        .from('fortunes')
        .insert({
          user_id: user.id,
          fortune_teller_id: selectedFortuneTeller.id,
          category: getCategoryKey(fortuneType.name),
          status: status,
          image_url: JSON.stringify(imageUrls),
          description: finalDescription,
          fortune_text: fortuneText || null,
          token_amount: requiredTokens,
          process_after: processAfter.toISOString(),
          completed_at: null,
          special_data: Object.keys(specialData).length > 0 ? JSON.stringify(specialData) : null,
        })
        .select()
        .single();
      
      if (fortuneError) throw fortuneError;
      
      // Jeton işlemi kaydet
      const { error: tokenError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          amount: -requiredTokens,
          transaction_type: 'fal_gönderme',
          reference_id: fortune.id,
        });
      
      if (tokenError) throw tokenError;
      
      // Kullanıcı jeton bakiyesini güncelle
      const newTokenBalance = userTokens - requiredTokens;
      const { error: updateError } = await supabase
        .from('users')
        .update({ token_balance: newTokenBalance })
        .eq('id', user.id);
      
      if (updateError) throw updateError;
      
      // AsyncStorage'ı güncelle
      await AsyncStorage.setItem(USER_TOKENS_KEY, newTokenBalance.toString());
      
      // Global token güncelleme fonksiyonunu çağır
      if (global.updateUserTokens) {
        global.updateUserTokens(newTokenBalance);
      }
      
      setUserTokens(newTokenBalance);
      
      // Günlük görev ilerlemesini güncelle (fal gönderme)
      try {
        await supabase.rpc('update_daily_task_progress', {
          p_user_id: user.id,
          p_task_type: 'fortune_sent',
          p_increment: 1
        });
      } catch (taskError) {
        console.warn('Günlük görev güncellenirken hata:', taskError);
        // Fal işlemi başarılıysa görev hatası işlemi durdurmasın
      }
      
      // Kullanıcının total_fortunes_sent değerini güncelle
      const { data: userData } = await supabase
        .from('users')
        .select('total_fortunes_sent')
        .eq('id', user.id)
        .single();
      
      const newFortuneCount = (userData?.total_fortunes_sent || 0) + 1;
      await supabase
        .from('users')
        .update({ total_fortunes_sent: newFortuneCount })
        .eq('id', user.id);
      
      // Falsever rozetini kontrol et (10 fal gönderme)
      const badgeResult = await badgeService.checkFortuneLoverBadge(user.id);
      
      if (badgeResult.success && badgeResult.newBadge) {
        // Rozet kazanıldıysa özel mesaj göster
        Alert.alert(
          '🎉 Tebrikler!',
          `Falınız gönderildi ve "${badgeResult.data.name}" rozetini kazandınız!\n\n${selectedFortuneTeller.name}, ${randomMinutes} dakika (tahmini) içinde size cevap verecektir.`,
          [{ text: 'Harika!', onPress: () => navigation.navigate('FalScreen') }]
        );
      } else {
        Alert.alert(
          'Falınız Gönderildi',
          `${selectedFortuneTeller.name}, ${randomMinutes} dakika (tahmini) içinde size cevap verecektir. Hazır olduğunda bildirim alacaksınız.`,
          [{ text: 'Tamam', onPress: () => navigation.navigate('FalScreen') }]
        );
      }
    } catch (error) {
      console.error('Fal gönderilirken hata oluştu:', error);
      Alert.alert('Hata', 'Falınız gönderilirken bir hata oluştu. Lütfen tekrar deneyin.');
    } finally {
      setLoading(false);
    }
  };
  
  const renderImagePicker = (index) => {
    return (
      <TouchableOpacity
        style={styles.imagePickerContainer}
        onPress={() => {
          Alert.alert(
            'Resim Seç',
            'Resim kaynağını seçin',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Kamera', onPress: () => pickImage(index, 'camera') },
              { text: 'Galeri', onPress: () => pickImage(index, 'gallery') },
            ]
          );
        }}
      >
        {images[index] ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: images[index] }} style={styles.image} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => {
                const newImages = [...images];
                newImages[index] = null;
                setImages(newImages);
              }}
            >
              <AntDesign name="closecircle" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.imagePlaceholder}>
            <Ionicons name="add-circle" size={40} color={colors.secondary} />
            <Text style={styles.imagePlaceholderText}>Resim Ekle</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // El falı için el seçim bileşeni
  const renderHandSelector = () => {
    return (
      <View style={styles.handSelectorContainer}>
        <Text style={styles.sectionTitle}>El Seçimi</Text>
        <View style={styles.handOptions}>
          <TouchableOpacity
            style={[styles.handOption, selectedHand === 'right' && styles.selectedHandOption]}
            onPress={() => setSelectedHand('right')}
          >
            <Ionicons name="hand-right" size={24} color={selectedHand === 'right' ? colors.secondary : colors.text.tertiary} />
            <Text style={[styles.handOptionText, selectedHand === 'right' && styles.selectedHandOptionText]}>
              Sağ El
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.handOption, selectedHand === 'left' && styles.selectedHandOption]}
            onPress={() => setSelectedHand('left')}
          >
            <Ionicons name="hand-left" size={24} color={selectedHand === 'left' ? colors.secondary : colors.text.tertiary} />
            <Text style={[styles.handOptionText, selectedHand === 'left' && styles.selectedHandOptionText]}>
              Sol El
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.handOption, selectedHand === 'both' && styles.selectedHandOption]}
            onPress={() => setSelectedHand('both')}
          >
            <MaterialCommunityIcons name="hand-extended" size={24} color={selectedHand === 'both' ? colors.secondary : colors.text.tertiary} />
            <Text style={[styles.handOptionText, selectedHand === 'both' && styles.selectedHandOptionText]}>
              Her İki El
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // El falı için fotoğraf yükleme bileşeni
  const renderHandImagePicker = (hand, image, setImage) => {
    return (
      <TouchableOpacity
        style={styles.handImagePickerContainer}
        onPress={() => {
          Alert.alert(
            `${hand} Fotoğrafı`,
            'Resim kaynağını seçin',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Kamera', onPress: () => pickHandImage(hand, 'camera') },
              { text: 'Galeri', onPress: () => pickHandImage(hand, 'gallery') },
            ]
          );
        }}
      >
        {image ? (
          <View style={styles.imageContainer}>
            <Image source={{ uri: image }} style={styles.handImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setImage(null)}
            >
              <AntDesign name="closecircle" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.handImagePlaceholder}>
            <Ionicons name="add-circle" size={40} color={colors.secondary} />
            <Text style={styles.imagePlaceholderText}>{hand} Fotoğrafı</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Yüz falı için fotoğraf yükleme bileşeni
  const renderFaceImagePicker = () => {
    return (
      <TouchableOpacity
        style={styles.faceImagePickerContainer}
        onPress={() => {
          Alert.alert(
            'Yüz Fotoğrafı',
            'Resim kaynağını seçin',
            [
              { text: 'İptal', style: 'cancel' },
              { text: 'Kamera', onPress: () => pickFaceImage('camera') },
              { text: 'Galeri', onPress: () => pickFaceImage('gallery') },
            ]
          );
        }}
      >
        {faceImage ? (
          <View style={styles.faceImageContainer}>
            <Image source={{ uri: faceImage }} style={styles.faceImage} />
            <TouchableOpacity
              style={styles.removeImageButton}
              onPress={() => setFaceImage(null)}
            >
              <AntDesign name="closecircle" size={24} color={colors.error} />
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.faceImagePlaceholder}>
            <Ionicons name="add-circle" size={60} color={colors.secondary} />
            <Text style={styles.imagePlaceholderText}>Yüz Fotoğrafı Ekle</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Yıldızname için tarih/saat/şehir seçim bileşeni
  const renderBirthInfoPicker = () => {
    return (
      <View style={styles.birthInfoContainer}>
        {/* Doğum Tarihi */}
        <TouchableOpacity
          style={styles.birthInfoItem}
          onPress={() => setShowDatePicker(true)}
        >
          <View style={styles.birthInfoLabel}>
            <Ionicons name="calendar" size={20} color={colors.secondary} />
            <Text style={styles.birthInfoLabelText}>Doğum Tarihi</Text>
          </View>
          <Text style={styles.birthInfoValue}>
            {birthDate.toLocaleDateString('tr-TR')}
          </Text>
        </TouchableOpacity>

        {/* Doğum Saati */}
        <TouchableOpacity
          style={styles.birthInfoItem}
          onPress={() => setShowTimePicker(true)}
        >
          <View style={styles.birthInfoLabel}>
            <Ionicons name="time" size={20} color={colors.secondary} />
            <Text style={styles.birthInfoLabelText}>Doğum Saati</Text>
          </View>
          <Text style={styles.birthInfoValue}>
            {birthTime.toLocaleTimeString('tr-TR', { hour: '2-digit', minute: '2-digit' })}
          </Text>
        </TouchableOpacity>

        {/* Doğum Şehri */}
        <TouchableOpacity
          style={styles.birthInfoItem}
          onPress={() => setShowCityModal(true)}
        >
          <View style={styles.birthInfoLabel}>
            <Ionicons name="location" size={20} color={colors.secondary} />
            <Text style={styles.birthInfoLabelText}>Doğum Şehri</Text>
          </View>
          <Text style={styles.birthInfoValue}>
            {birthCity || 'Şehir Seçin'}
          </Text>
        </TouchableOpacity>

        {/* Date Picker Modal */}
        {showDatePicker && (
          <DateTimePicker
            value={birthDate}
            mode="date"
            display="default"
            onChange={(event, selectedDate) => {
              setShowDatePicker(false);
              if (selectedDate) {
                setBirthDate(selectedDate);
              }
            }}
          />
        )}

        {/* Time Picker Modal */}
        {showTimePicker && (
          <DateTimePicker
            value={birthTime}
            mode="time"
            display="default"
            onChange={(event, selectedTime) => {
              setShowTimePicker(false);
              if (selectedTime) {
                setBirthTime(selectedTime);
              }
            }}
          />
        )}

        {/* Şehir Seçimi Modal */}
        <Modal
          visible={showCityModal}
          animationType="slide"
          transparent={true}
          onRequestClose={() => setShowCityModal(false)}
        >
          <View style={styles.cityModalContainer}>
            <View style={styles.cityModalContent}>
              <View style={styles.cityModalHeader}>
                <Text style={styles.cityModalTitle}>Doğum Şehrinizi Seçin</Text>
                <TouchableOpacity onPress={() => setShowCityModal(false)}>
                  <Ionicons name="close" size={24} color={colors.text.primary} />
                </TouchableOpacity>
              </View>
              <ScrollView style={styles.cityList}>
                {turkishCities.map((city, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.cityItem}
                    onPress={() => {
                      setBirthCity(city);
                      setShowCityModal(false);
                    }}
                  >
                    <Text style={styles.cityItemText}>{city}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </View>
    );
  };

  // Rüya yorumu için metin girme bileşeni
  const renderDreamTextInput = () => {
    return (
      <View style={styles.dreamInputContainer}>
        <Text style={styles.sectionTitle}>Rüyanızı Anlatın</Text>
        <TextInput
          style={styles.dreamTextInput}
          placeholder="Gördüğünüz rüyayı mümkün olduğunca detaylı bir şekilde anlatın. Rüyada gördüğünüz kişiler, mekanlar, objeler, renkler ve hissettikleriniz gibi ayrıntıları da ekleyin..."
          placeholderTextColor={colors.text.tertiary}
          multiline
          value={dreamText}
          onChangeText={setDreamText}
          textAlignVertical="top"
        />
      </View>
    );
  };

  // Burç yorumları için burç seçimi bileşeni
  const renderZodiacSelector = () => {
    return (
      <View style={styles.zodiacSelectorContainer}>
        <View style={styles.zodiacHeader}>
          <Text style={styles.sectionTitle}>Burcunuzu Seçin</Text>
          {horoscopeDailyLimit && (
            <View style={styles.dailyLimitInfo}>
              <MaterialCommunityIcons name="star" size={16} color={colors.secondary} />
              <Text style={styles.dailyLimitText}>
                Bugün {horoscopeDailyLimit.remainingCount}/{horoscopeDailyLimit.totalCount} hakkınız kaldı
              </Text>
            </View>
          )}
        </View>
        <View style={styles.zodiacGrid}>
          {zodiacSigns.map((sign) => (
            <TouchableOpacity
              key={sign.key}
              style={[
                styles.zodiacItem,
                selectedZodiacSign === sign.key && styles.selectedZodiacItem,
                !horoscopeDailyLimit?.canUse && styles.disabledZodiacItem
              ]}
              onPress={() => horoscopeDailyLimit?.canUse && setSelectedZodiacSign(sign.key)}
              disabled={!horoscopeDailyLimit?.canUse}
            >
              <View style={styles.zodiacIconContainer}>
                <MaterialCommunityIcons 
                  name={getZodiacIcon(sign.key)} 
                  size={28} 
                  color={selectedZodiacSign === sign.key ? colors.secondary : colors.text.tertiary} 
                />
              </View>
              <Text style={[
                styles.zodiacName,
                selectedZodiacSign === sign.key && styles.selectedZodiacName
              ]}>
                {sign.name}
              </Text>
              <Text style={[
                styles.zodiacDates,
                selectedZodiacSign === sign.key && styles.selectedZodiacDates
              ]}>
                {sign.dates}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
        {!horoscopeDailyLimit?.canUse && (
          <View style={styles.limitWarning}>
            <MaterialCommunityIcons name="alert-circle" size={20} color={colors.warning} />
            <Text style={styles.limitWarningText}>
              Bugün {horoscopeDailyLimit?.totalCount} burç yorumu hakkınızı kullandınız. Yarın tekrar deneyebilirsiniz.
            </Text>
          </View>
        )}
      </View>
    );
  };

  // Periyot seçimi bileşeni
  const renderPeriodSelector = () => {
    const periods = [
      { key: 'günlük', name: 'Günlük', icon: 'calendar-today', description: 'Bugün için' },
      { key: 'haftalık', name: 'Haftalık', icon: 'calendar-week', description: 'Bu hafta için' },
      { key: 'aylık', name: 'Aylık', icon: 'calendar-month', description: 'Bu ay için' }
    ];

    return (
      <View style={styles.periodSelectorContainer}>
        <Text style={styles.sectionTitle}>Periyot Seçin</Text>
        <View style={styles.periodOptions}>
          {periods.map((period) => (
            <TouchableOpacity
              key={period.key}
              style={[
                styles.periodOption,
                selectedPeriod === period.key && styles.selectedPeriodOption
              ]}
              onPress={() => setSelectedPeriod(period.key)}
            >
              <MaterialCommunityIcons 
                name={period.icon} 
                size={24} 
                color={selectedPeriod === period.key ? colors.secondary : colors.text.tertiary} 
              />
              <Text style={[
                styles.periodName,
                selectedPeriod === period.key && styles.selectedPeriodName
              ]}>
                {period.name}
              </Text>
              <Text style={[
                styles.periodDescription,
                selectedPeriod === period.key && styles.selectedPeriodDescription
              ]}>
                {period.description}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>
    );
  };

  // Burç ikonları için yardımcı fonksiyon
  const getZodiacIcon = (signKey) => {
    switch (signKey) {
      case 'koc': return 'zodiac-aries';
      case 'boga': return 'zodiac-taurus';
      case 'ikizler': return 'zodiac-gemini';
      case 'yengec': return 'zodiac-cancer';
      case 'aslan': return 'zodiac-leo';
      case 'basak': return 'zodiac-virgo';
      case 'terazi': return 'zodiac-libra';
      case 'akrep': return 'zodiac-scorpio';
      case 'yay': return 'zodiac-sagittarius';
      case 'oglak': return 'zodiac-capricorn';
      case 'kova': return 'zodiac-aquarius';
      case 'balik': return 'zodiac-pisces';
      default: return 'star-circle';
    }
  };
  
  // Tarot falı render fonksiyonu
  const renderTarotCards = () => {
    if (isShufflingTarot) {
      return (
        <View style={styles.tarotContainer}>
          <Text style={styles.sectionTitle}>Kartlar Karıştırılıyor...</Text>
          <Text style={styles.cardInstructions}>
            Tarot kartları sizin için hazırlanıyor ✨
          </Text>
          
          <View style={styles.shufflingContainer}>
            {[1, 2, 3, 4, 5].map((_, index) => (
              <CardComponent
                key={`shuffle-${index}`}
                card={null}
                isFlipped={false}
                cardType="tarot"
                size="medium"
                isShuffling={true}
                style={[styles.shufflingCard, { zIndex: 5 - index }]}
              />
            ))}
          </View>
        </View>
      );
    }
    
    if (tarotStep === 'selection') {
      return (
        <View style={styles.tarotContainer}>
          <Text style={styles.sectionTitle}>3 Kart Seçin</Text>
          <Text style={styles.cardInstructions}>
            Geçmiş, Şimdi ve Gelecek için 3 kart seçin ({selectedTarotCards.length}/3)
          </Text>
          
          <View style={styles.cardGrid}>
            {tarotDeck.map((card, index) => (
              <CardComponent
                key={`${card.id}-${index}`}
                card={card}
                isFlipped={false}
                cardType="tarot"
                onPress={handleTarotCardSelect}
                isSelected={selectedTarotCards.includes(card)}
                disabled={selectedTarotCards.length >= 3 && !selectedTarotCards.includes(card)}
                size="medium"
                style={styles.tarotCard}
                dealAnimation={tarotDealAnimation}
                animationDelay={index * 100}
              />
            ))}
          </View>
          
          {selectedTarotCards.length > 0 && (
            <TouchableOpacity style={styles.resetButton} onPress={resetTarotCards}>
              <Text style={styles.resetButtonText}>Yeniden Seç</Text>
            </TouchableOpacity>
          )}
        </View>
      );
    } else {
      return (
        <View style={styles.tarotContainer}>
          <Text style={styles.sectionTitle}>Tarot Yorumunuz</Text>
          
          <View style={styles.tarotResultsContainer}>
            {['past', 'present', 'future'].map((position, index) => {
              const card = tarotCards[position];
              const positionNames = { past: 'Geçmiş', present: 'Şimdi', future: 'Gelecek' };
              
              return (
                <View key={position} style={styles.tarotResultCard}>
                  <Text style={styles.tarotPositionTitle}>{positionNames[position]}</Text>
                  <CardComponent
                    card={card}
                    isFlipped={true}
                    cardType="tarot"
                    size="large"
                    showMeaning={true}
                    style={styles.tarotResultCardComponent}
                    animationDelay={index * 300}
                  />
                </View>
              );
            })}
          </View>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetTarotCards}>
            <Text style={styles.resetButtonText}>Yeniden Başla</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };
  
  // Katina falı render fonksiyonu
  const renderKatinaCards = () => {
    if (isShufflingKatina) {
      return (
        <View style={styles.katinaContainer}>
          <Text style={styles.sectionTitle}>Kartlar Karıştırılıyor...</Text>
          <Text style={styles.cardInstructions}>
            Aşk kartları sizin için hazırlanıyor 💕
          </Text>
          
          <View style={styles.shufflingContainer}>
            {[1, 2, 3, 4, 5].map((_, index) => (
              <CardComponent
                key={`katina-shuffle-${index}`}
                card={null}
                isFlipped={false}
                cardType="katina"
                size="medium"
                isShuffling={true}
                style={[styles.shufflingCard, { zIndex: 5 - index }]}
              />
            ))}
          </View>
        </View>
      );
    }
    
    if (katinaStep === 'selection') {
      return (
        <View style={styles.katinaContainer}>
          <Text style={styles.sectionTitle}>Kartlarınız Hazır</Text>
          <Text style={styles.cardInstructions}>
            Aşk falınız için kartlar hazırlandı. Kartları çevirmek için butona basın.
          </Text>
          
          <View style={styles.katinaCardsLayout}>
            {/* Sizin Kartlarınız */}
            <View style={styles.katinaSection}>
              <Text style={styles.katinaSectionTitle}>👤 Sizin Kartlarınız</Text>
              <View style={styles.katinaCardRow}>
                {katinaCards.yourCards?.map((card, index) => (
                  <CardComponent
                    key={`your-${index}`}
                    card={card}
                    isFlipped={false}
                    cardType="katina"
                    size="medium"
                    style={styles.katinaCard}
                    dealAnimation={katinaDealAnimation}
                    animationDelay={index * 150}
                  />
                ))}
              </View>
            </View>
            
            {/* O Kişinin Kartları */}
            <View style={styles.katinaSection}>
              <Text style={styles.katinaSectionTitle}>💕 O Kişinin Kartları</Text>
              <View style={styles.katinaCardRow}>
                {katinaCards.theirCards?.map((card, index) => (
                  <CardComponent
                    key={`their-${index}`}
                    card={card}
                    isFlipped={false}
                    cardType="katina"
                    size="medium"
                    style={styles.katinaCard}
                    dealAnimation={katinaDealAnimation}
                    animationDelay={(index + 3) * 150}
                  />
                ))}
              </View>
            </View>
            
            {/* Ortak Kart */}
            <View style={styles.katinaSection}>
              <Text style={styles.katinaSectionTitle}>🔮 Ortak Kartınız</Text>
              <View style={styles.katinaSharedCard}>
                {katinaCards.sharedCard && (
                  <CardComponent
                    card={katinaCards.sharedCard}
                    isFlipped={false}
                    cardType="katina"
                    size="large"
                    style={styles.katinaCard}
                    dealAnimation={katinaDealAnimation}
                    animationDelay={6 * 150}
                  />
                )}
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.revealButton} onPress={revealKatinaCards}>
            <LinearGradient
              colors={[colors.secondary, colors.primary]}
              style={styles.revealButtonGradient}
            >
              <Text style={styles.revealButtonText}>Kartları Çevir ✨</Text>
            </LinearGradient>
          </TouchableOpacity>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetKatinaCards}>
            <Text style={styles.resetButtonText}>Yeni Kartlar Çek</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.katinaContainer}>
          <Text style={styles.sectionTitle}>Katina Falı Sonucu</Text>
          
          <View style={styles.katinaResultsLayout}>
            {/* Sizin Kartlarınız - Açık */}
            <View style={styles.katinaSection}>
              <Text style={styles.katinaSectionTitle}>👤 Sizin Kartlarınız</Text>
              <View style={styles.katinaCardRow}>
                {katinaCards.yourCards?.map((card, index) => (
                  <CardComponent
                    key={`your-revealed-${index}`}
                    card={card}
                    isFlipped={true}
                    cardType="katina"
                    size="medium"
                    style={styles.katinaCard}
                    animationDelay={index * 200}
                  />
                ))}
              </View>
            </View>
            
            {/* O Kişinin Kartları - Açık */}
            <View style={styles.katinaSection}>
              <Text style={styles.katinaSectionTitle}>💕 O Kişinin Kartları</Text>
              <View style={styles.katinaCardRow}>
                {katinaCards.theirCards?.map((card, index) => (
                  <CardComponent
                    key={`their-revealed-${index}`}
                    card={card}
                    isFlipped={true}
                    cardType="katina"
                    size="medium"
                    style={styles.katinaCard}
                    animationDelay={(index + 3) * 200}
                  />
                ))}
              </View>
            </View>
            
            {/* Ortak Kart - Açık */}
            <View style={styles.katinaSection}>
              <Text style={styles.katinaSectionTitle}>🔮 Ortak Kartınız</Text>
              <View style={styles.katinaSharedCard}>
                {katinaCards.sharedCard && (
                  <CardComponent
                    card={katinaCards.sharedCard}
                    isFlipped={true}
                    cardType="katina"
                    size="large"
                    showMeaning={true}
                    style={styles.katinaCard}
                    animationDelay={6 * 200}
                  />
                )}
              </View>
            </View>
          </View>
          
          <TouchableOpacity style={styles.resetButton} onPress={resetKatinaCards}>
            <Text style={styles.resetButtonText}>Yeniden Başla</Text>
          </TouchableOpacity>
        </View>
      );
    }
  };
  
  const renderFortuneTellerItem = (fortuneTeller) => {
    const isSelected = selectedFortuneTeller?.id === fortuneTeller.id;
    
    return (
      <TouchableOpacity
        key={fortuneTeller.id}
        style={[
          styles.fortuneTellerItem,
          isSelected && styles.selectedFortuneTellerItem
        ]}
        onPress={() => setSelectedFortuneTeller(fortuneTeller)}
      >
        <Image
          source={{ uri: fortuneTeller.profile_image }}
          style={styles.fortuneTellerImage}
        />
        <View style={styles.fortuneTellerInfo}>
          <Text style={styles.fortuneTellerName}>{fortuneTeller.name}</Text>
          <View style={styles.fortuneTellerRating}>
            <Text style={styles.fortuneTellerRatingText}>{fortuneTeller.rating.toFixed(1)}</Text>
            <Ionicons name="star" size={14} color={colors.secondary} />
          </View>
          <Text style={styles.fortuneTellerExperience}>{fortuneTeller.experience_years} yıl deneyim</Text>
        </View>
        <View style={styles.fortuneTellerPrice}>
          <Text style={styles.fortuneTellerPriceText}>{fortuneTeller.price_per_fortune}</Text>
          <MaterialCommunityIcons name="diamond" size={16} color={colors.secondary} />
        </View>
      </TouchableOpacity>
    );
  };
  
  const getFortuneTypeInstructions = () => {
    const falType = fortuneType.name.toLowerCase();
    
    switch (falType) {
      case 'kahve falı':
        return 'Fincanın içi, fincanın dışı ve tabağın altı olmak üzere 3 farklı açıdan fotoğraf çekin.';
      case 'tarot falı':
        return 'Kartları karıştırdık ve sizin için 12 kart seçtik. Bu kartlardan 3 tanesini seçin: Geçmiş, Şimdi ve Gelecek için.';
      case 'katina falı':
        return 'Aşk temalı iskambil falı için kartlarınızı hazırladık. Sizin ve sevdiğiniz kişinin kartları ile ortak kartınızı göreceksiniz.';
      case 'el falı':
        return 'Sağ ve/veya sol elinizin avuç içi fotoğrafını çekin. Çizgiler net görünecek şekilde iyi aydınlatma altında çekiniz.';
      case 'yüz falı':
        return 'Ön yüzünüzün net bir fotoğrafını çekin. Saçlarınız yüzünüzü kapatmayacak şekilde konumlandırın.';
      case 'yıldızname':
        return 'Doğum tarihinizi, saatinizi ve doğum yerinizi (şehir) giriniz. Bu bilgiler yıldız haritanızı çıkarmak için gereklidir.';
      case 'rüya yorumu':
        return 'Gördüğünüz rüyayı detaylı bir şekilde yazın. Ne kadar ayrıntılı yazarsanız yorumunuz o kadar isabetli olur.';
      case 'burç yorumları':
        return 'Burcunuzu seçin ve günlük, haftalık veya aylık yorumunuzu alın. Yıldızların size ne söylediğini öğrenin.';
      default:
        return 'Lütfen falınız için gerekli bilgileri girin.';
    }
  };
  
  if (loading && fortuneTellers.length === 0) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Falcılar yükleniyor...</Text>
      </View>
    );
  }
  
  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <LinearGradient
        colors={[colors.background, colors.primaryDark, colors.background]}
        style={styles.container}
      >
        <ScrollView 
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Header */}
          <View style={styles.header}>
            <TouchableOpacity 
              style={styles.backButton}
              onPress={() => navigation.goBack()}
            >
              <Ionicons name="arrow-back" size={24} color={colors.text.primary} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>{fortuneType.name}</Text>
            <View style={styles.tokenContainer}>
              <Text style={styles.tokenText}>{userTokens}</Text>
              <MaterialCommunityIcons name="diamond" size={18} color={colors.secondary} />
            </View>
          </View>
          
          {/* Yönlendirme */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>{getFortuneTypeInstructions()}</Text>
          </View>
          
          {/* Fal türüne göre özel input alanları */}
          {(() => {
            const falType = fortuneType.name.toLowerCase();
            
            if (falType === 'el falı') {
              return (
                <>
                  {renderHandSelector()}
                  <Text style={styles.sectionTitle}>El Fotoğrafları</Text>
                  <View style={styles.handImagesContainer}>
                    {(selectedHand === 'right' || selectedHand === 'both') && (
                      <View style={styles.handImageWrapper}>
                        <Text style={styles.handImageLabel}>Sağ El</Text>
                        {renderHandImagePicker('Sağ El', rightHandImage, setRightHandImage)}
                      </View>
                    )}
                    {(selectedHand === 'left' || selectedHand === 'both') && (
                      <View style={styles.handImageWrapper}>
                        <Text style={styles.handImageLabel}>Sol El</Text>
                        {renderHandImagePicker('Sol El', leftHandImage, setLeftHandImage)}
                      </View>
                    )}
                  </View>
                </>
              );
            } else if (falType === 'yüz falı') {
              return (
                <>
                  <Text style={styles.sectionTitle}>Yüz Fotoğrafı</Text>
                  {renderFaceImagePicker()}
                </>
              );
            } else if (falType === 'yıldızname') {
              return (
                <>
                  <Text style={styles.sectionTitle}>Doğum Bilgileri</Text>
                  {renderBirthInfoPicker()}
                </>
              );
                         } else if (falType === 'rüya yorumu') {
               return renderDreamTextInput();
             } else if (falType === 'burç yorumları') {
               return (
                 <>
                   {renderZodiacSelector()}
                   {renderPeriodSelector()}
                 </>
               );
             } else if (falType === 'tarot falı') {
               return renderTarotCards();
             } else if (falType === 'katina falı') {
               return renderKatinaCards();
             } else {
              // Geleneksel fal türleri için (kahve, tarot, katina)
              return (
                <>
                  <Text style={styles.sectionTitle}>Fotoğraflar</Text>
                  <View style={styles.imagePickersContainer}>
                    {renderImagePicker(0)}
                    {renderImagePicker(1)}
                    {renderImagePicker(2)}
                  </View>
                </>
              );
            }
          })()}
          
          {/* Not Alanı - Rüya yorumu ve burç yorumları hariç diğer türler için */}
          {fortuneType.name.toLowerCase() !== 'rüya yorumu' && 
           fortuneType.name.toLowerCase() !== 'burç yorumları' && (
            <>
              <Text style={styles.sectionTitle}>Notunuz (İsteğe Bağlı)</Text>
              <TextInput
                style={styles.descriptionInput}
                placeholder="Falcıya iletmek istediğiniz notlar..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                value={description}
                onChangeText={setDescription}
              />
            </>
          )}
          
          {/* Falcı Seçimi - Burç yorumları hariç */}
          {fortuneType.name.toLowerCase() !== 'burç yorumları' && (
            <>
              <Text style={styles.sectionTitle}>Falcı Seçimi</Text>
              {fortuneTellers.length > 0 ? (
                <View style={styles.fortuneTellersContainer}>
                  {fortuneTellers.map(fortuneTeller => renderFortuneTellerItem(fortuneTeller))}
                </View>
              ) : (
                <Text style={styles.noFortuneTellersText}>
                  Bu fal türü için falcı bulunamadı.
                </Text>
              )}
            </>
          )}
          
          {/* Gönder Butonu */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading || (fortuneType.name.toLowerCase() === 'burç yorumları' && horoscopeLoading)}
          >
            {(loading || (fortuneType.name.toLowerCase() === 'burç yorumları' && horoscopeLoading)) ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>
                  {fortuneType.name.toLowerCase() === 'burç yorumları' ? 'Ücretsiz Yorumu Al' : 'Falımı Gönder'}
                </Text>
                <Ionicons 
                  name={fortuneType.name.toLowerCase() === 'burç yorumları' ? 'star' : 'send'} 
                  size={20} 
                  color={colors.text.primary} 
                />
              </>
            )}
          </TouchableOpacity>
        </ScrollView>
      </LinearGradient>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginBottom: 70,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 50,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.primary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tokenContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  tokenText: {
    color: colors.text.primary,
    marginRight: 4,
    fontWeight: 'bold',
  },
  instructionsContainer: {
    backgroundColor: 'rgba(0,0,0,0.3)',
    padding: 16,
    borderRadius: 12,
    marginBottom: 20,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  instructionsText: {
    color: colors.text.secondary,
    fontSize: 14,
    lineHeight: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 12,
    marginTop: 20,
  },
  imagePickersContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 20,
  },
  imagePickerContainer: {
    width: (width - 40) / 3,
    height: (width - 40) / 3,
    borderRadius: 12,
    overflow: 'hidden',
  },
  imagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  imagePlaceholderText: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  imageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 12,
  },
  imagePickerOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 8,
  },
  imagePickerOption: {
    alignItems: 'center',
  },
  imagePickerOptionText: {
    color: colors.text.tertiary,
    fontSize: 12,
    marginTop: 4,
  },
  descriptionInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    color: colors.text.primary,
    height: 120,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
  },
  fortuneTellersContainer: {
    marginBottom: 20,
  },
  fortuneTellerItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedFortuneTellerItem: {
    borderColor: colors.secondary,
    borderWidth: 2,
    backgroundColor: 'rgba(74, 0, 128, 0.3)',
  },
  fortuneTellerImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  fortuneTellerInfo: {
    flex: 1,
    marginLeft: 12,
    justifyContent: 'center',
  },
  fortuneTellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 4,
  },
  fortuneTellerRating: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  fortuneTellerRatingText: {
    color: colors.text.secondary,
    marginRight: 4,
    fontSize: 14,
  },
  fortuneTellerExperience: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  fortuneTellerPrice: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.3)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 15,
    alignSelf: 'flex-start',
  },
  fortuneTellerPriceText: {
    color: colors.secondary,
    fontWeight: 'bold',
    marginRight: 4,
  },
  noFortuneTellersText: {
    color: colors.text.tertiary,
    textAlign: 'center',
    marginVertical: 20,
  },
  submitButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    marginVertical: 20,
    flexDirection: 'row',
    justifyContent: 'center',
  },
  submitButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
    marginRight: 8,
  },

  // El falı stilleri
  handSelectorContainer: {
    marginBottom: 20,
  },
  handOptions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  handOption: {
    alignItems: 'center',
    padding: 15,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: 'rgba(0,0,0,0.2)',
    minWidth: 80,
  },
  selectedHandOption: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(74, 0, 128, 0.3)',
  },
  handOptionText: {
    color: colors.text.tertiary,
    marginTop: 8,
    fontSize: 14,
    textAlign: 'center',
  },
  selectedHandOptionText: {
    color: colors.secondary,
    fontWeight: 'bold',
  },
  handImagesContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  handImageWrapper: {
    alignItems: 'center',
  },
  handImageLabel: {
    color: colors.text.secondary,
    fontSize: 14,
    marginBottom: 8,
    fontWeight: '500',
  },
  handImagePickerContainer: {
    width: (width - 80) / 2,
    height: (width - 80) / 2,
    borderRadius: 12,
    overflow: 'hidden',
  },
  handImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
  },
  handImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },

  // Yüz falı stilleri
  faceImagePickerContainer: {
    width: width - 80,
    height: width - 80,
    alignSelf: 'center',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 20,
  },
  faceImageContainer: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  faceImage: {
    width: '100%',
    height: '100%',
    borderRadius: 12,
  },
  faceImagePlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: 'rgba(0,0,0,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: 12,
    borderStyle: 'dashed',
  },

  // Yıldızname stilleri
  birthInfoContainer: {
    marginBottom: 20,
  },
  birthInfoItem: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: colors.border,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  birthInfoLabel: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  birthInfoLabelText: {
    color: colors.text.primary,
    fontSize: 16,
    marginLeft: 10,
    fontWeight: '500',
  },
  birthInfoValue: {
    color: colors.secondary,
    fontSize: 16,
    fontWeight: 'bold',
  },
  cityModalContainer: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cityModalContent: {
    width: width - 40,
    maxHeight: '80%',
    backgroundColor: colors.background,
    borderRadius: 20,
    padding: 0,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
    elevation: 20,
  },
  cityModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cityModalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  cityList: {
    maxHeight: 400,
  },
  cityItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  cityItemText: {
    fontSize: 16,
    color: colors.text.primary,
  },

  // Rüya yorumu stilleri
  dreamInputContainer: {
    marginBottom: 20,
  },
  dreamTextInput: {
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    color: colors.text.primary,
    height: 200,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: colors.border,
    fontSize: 16,
    lineHeight: 24,
  },

  // Burç yorumları stilleri
  zodiacSelectorContainer: {
    marginBottom: 20,
  },
  zodiacHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 15,
  },
  dailyLimitInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 0, 128, 0.1)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  dailyLimitText: {
    color: colors.secondary,
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 6,
  },
  disabledZodiacItem: {
    opacity: 0.5,
    backgroundColor: 'rgba(0,0,0,0.1)',
  },
  limitWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.warning,
    marginTop: 15,
  },
  limitWarningText: {
    color: colors.warning,
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
    flex: 1,
  },
  zodiacGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  zodiacItem: {
    width: (width - 80) / 3,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedZodiacItem: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(74, 0, 128, 0.3)',
    borderWidth: 2,
  },
  zodiacIconContainer: {
    marginBottom: 8,
  },
  zodiacName: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedZodiacName: {
    color: colors.secondary,
  },
  zodiacDates: {
    color: colors.text.tertiary,
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  selectedZodiacDates: {
    color: colors.text.secondary,
  },
  periodSelectorContainer: {
    marginBottom: 20,
  },
  periodOptions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  periodOption: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.2)',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  selectedPeriodOption: {
    borderColor: colors.secondary,
    backgroundColor: 'rgba(74, 0, 128, 0.3)',
    borderWidth: 2,
  },
  periodName: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedPeriodName: {
    color: colors.secondary,
  },
  periodDescription: {
    color: colors.text.tertiary,
    fontSize: 12,
    textAlign: 'center',
  },
  selectedPeriodDescription: {
    color: colors.text.secondary,
  },

  // Tarot falı stilleri
  tarotContainer: {
    marginBottom: 20,
  },
  cardInstructions: {
    color: colors.text.tertiary,
    fontSize: 14,
    marginBottom: 15,
    textAlign: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  tarotCard: {
    margin: 5,
  },
  resetButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  resetButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  tarotResultsContainer: {
    marginBottom: 15,
  },
  tarotResultCard: {
    marginBottom: 10,
  },
  tarotPositionTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  tarotResultCardComponent: {
    marginTop: 5,
  },

  // Katina falı stilleri
  katinaContainer: {
    marginBottom: 20,
  },
  katinaCardsLayout: {
    marginBottom: 15,
  },
  katinaSection: {
    marginBottom: 15,
  },
  katinaSectionTitle: {
    color: colors.text.primary,
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 8,
    textAlign: 'center',
  },
  katinaCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    flexWrap: 'wrap',
  },
  katinaCard: {
    margin: 5,
  },
  katinaSharedCard: {
    alignItems: 'center',
    marginTop: 10,
  },
  revealButton: {
    backgroundColor: colors.primary,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  revealButtonGradient: {
    width: '100%',
    paddingVertical: 10,
    borderRadius: 12,
  },
  revealButtonText: {
    color: colors.text.primary,
    fontWeight: 'bold',
    fontSize: 16,
  },
  katinaResultsLayout: {
    marginBottom: 15,
  },
  shufflingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginTop: 10,
  },
  shufflingCard: {
    width: 60,
    height: 80,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    borderWidth: 2,
    borderColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

export default NewFortuneScreen; 