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
  KeyboardAvoidingView
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, AntDesign } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../../lib/supabase';
import { getFortuneTellersByCategory } from '../services/supabaseService';
import colors from '../styles/colors';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
  }, []);
  
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
  
  const fetchFortuneTellers = async () => {
    try {
      setLoading(true);
      
      // Fal türünü küçük harfe çevir
      const falType = fortuneType.name.toLowerCase();
      
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
          aspect: [4, 3],
          quality: 0.8,
        });
      } else {
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsEditing: true,
          aspect: [4, 3],
          quality: 0.8,
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
  
  const uploadImageToSupabase = async (uri) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Kullanıcı bulunamadı');
      
      // Dosya adını oluştur
      const fileExt = uri.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;
      const filePath = `fortune_images/${fileName}`;
      
      // Resmi fetch ile al
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // Supabase'e yükle
      const { data, error } = await supabase.storage
        .from('fortunes')
        .upload(filePath, blob);
      
      if (error) throw error;
      
      // Yüklenen dosyanın URL'sini al
      const { data: urlData } = supabase.storage
        .from('fortunes')
        .getPublicUrl(filePath);
      
      return urlData.publicUrl;
    } catch (error) {
      console.error('Resim yüklenirken hata oluştu:', error);
      throw error;
    }
  };
  
  const handleSubmit = async () => {
    try {
      // Kontroller
      if (!selectedFortuneTeller) {
        return Alert.alert('Uyarı', 'Lütfen bir falcı seçin.');
      }
      
      if (!images.some(img => img !== null)) {
        return Alert.alert('Uyarı', 'Lütfen en az bir resim yükleyin.');
      }
      
      // Jeton kontrolü
      if (userTokens < selectedFortuneTeller.price_per_fortune) {
        return Alert.alert(
          'Yetersiz Jeton',
          `Bu fal için ${selectedFortuneTeller.price_per_fortune} jeton gerekiyor. Jeton satın almak ister misiniz?`,
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
      
      // Resimleri yükle
      const imageUrls = [];
      for (const image of images) {
        if (image) {
          const url = await uploadImageToSupabase(image);
          imageUrls.push(url);
        }
      }
      
      // Fal kaydı oluştur
      const { data: fortune, error: fortuneError } = await supabase
        .from('fortunes')
        .insert({
          user_id: user.id,
          fortune_teller_id: selectedFortuneTeller.id,
          category: fortuneType.name.toLowerCase(),
          status: 'beklemede',
          image_url: JSON.stringify(imageUrls),
          description: description,
          token_amount: selectedFortuneTeller.price_per_fortune,
        })
        .select()
        .single();
      
      if (fortuneError) throw fortuneError;
      
      // Jeton işlemi kaydet
      const { error: tokenError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: user.id,
          amount: -selectedFortuneTeller.price_per_fortune,
          transaction_type: 'fal_gönderme',
          reference_id: fortune.id,
        });
      
      if (tokenError) throw tokenError;
      
      // Kullanıcı jeton bakiyesini güncelle
      const newTokenBalance = userTokens - selectedFortuneTeller.price_per_fortune;
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
      
      Alert.alert(
        'Başarılı',
        'Falınız başarıyla gönderildi. Falcı yorumunu tamamladığında bildirim alacaksınız.',
        [{ text: 'Tamam', onPress: () => navigation.navigate('FalScreen') }]
      );
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
          source={{ uri: fortuneTeller.profile_image || 'https://via.placeholder.com/100' }}
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
          <MaterialCommunityIcons name="ticket-confirmation" size={16} color={colors.secondary} />
        </View>
      </TouchableOpacity>
    );
  };
  
  const getFortuneTypeInstructions = () => {
    const falType = fortuneType.name.toLowerCase();
    
    switch (falType) {
      case 'kahve falı':
        return 'Fincanın içi, fincanın dışı ve tabağın altı olmak üzere 3 farklı açıdan fotoğraf çekin.';
      case 'tarot':
        return 'Seçtiğiniz kartların net ve düz bir şekilde fotoğrafını çekin.';
      case 'el falı':
        return 'Avuç içinizin ve el sırtınızın net fotoğraflarını çekin.';
      case 'yıldızname':
        return 'Doğum tarihinizi ve saatinizi not olarak belirtin.';
      default:
        return 'Lütfen falınız için net fotoğraflar çekin.';
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
              <MaterialCommunityIcons name="ticket-confirmation" size={18} color={colors.secondary} />
            </View>
          </View>
          
          {/* Yönlendirme */}
          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsText}>{getFortuneTypeInstructions()}</Text>
          </View>
          
          {/* Resim Yükleme Alanı */}
          <Text style={styles.sectionTitle}>Fotoğraflar (3 adet)</Text>
          <View style={styles.imagePickersContainer}>
            {renderImagePicker(0)}
            {renderImagePicker(1)}
            {renderImagePicker(2)}
          </View>
          
          {/* Not Alanı */}
          <Text style={styles.sectionTitle}>Notunuz (İsteğe Bağlı)</Text>
          <TextInput
            style={styles.descriptionInput}
            placeholder="Falcıya iletmek istediğiniz notlar..."
            placeholderTextColor={colors.text.tertiary}
            multiline
            value={description}
            onChangeText={setDescription}
          />
          
          {/* Falcı Seçimi */}
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
          
          {/* Gönder Butonu */}
          <TouchableOpacity
            style={styles.submitButton}
            onPress={handleSubmit}
            disabled={loading}
          >
            {loading ? (
              <ActivityIndicator size="small" color={colors.text.primary} />
            ) : (
              <>
                <Text style={styles.submitButtonText}>Falımı Gönder</Text>
                <Ionicons name="send" size={20} color={colors.text.primary} />
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
});

export default NewFortuneScreen; 