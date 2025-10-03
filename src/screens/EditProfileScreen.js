import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  TextInput,
  Alert,
  ActivityIndicator,
  StatusBar,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import colors from '../styles/colors';
import { typography } from '../styles/typography';
import { spacing, radius } from '../styles/spacing';
import * as ImagePicker from 'expo-image-picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { withTokenRefresh } from '../utils/authUtils';

const EditProfileScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [userData, setUserData] = useState(null);
  const [profileImage, setProfileImage] = useState(null);
  const [fullName, setFullName] = useState('');
  const [zodiacSign, setZodiacSign] = useState('');
  const [risingSign, setRisingSign] = useState('');
  const [gender, setGender] = useState('');
  const [maritalStatus, setMaritalStatus] = useState('');
  const [favoriteFortuneTeller, setFavoriteFortuneTeller] = useState('');
  const [birthPlace, setBirthPlace] = useState('');
  const [birthDate, setBirthDate] = useState(new Date());
  const [showDatePicker, setShowDatePicker] = useState(false);

  // Burç listesi
  const zodiacSigns = [
    'Koç', 'Boğa', 'İkizler', 'Yengeç', 'Aslan', 'Başak',
    'Terazi', 'Akrep', 'Yay', 'Oğlak', 'Kova', 'Balık'
  ];

  // Cinsiyet seçenekleri
  const genderOptions = ['Kadın', 'Erkek', 'Belirtmek İstemiyorum'];

  // Medeni durum seçenekleri
  const maritalStatusOptions = ['Bekar', 'İlişkisi Var', 'Nişanlı', 'Evli', 'Boşanmış', 'Belirtmek İstemiyorum'];

  // Kullanıcı verilerini al
  const fetchUserData = async () => {
    try {
      setLoading(true);
      
      // AuthContext'ten gelen kullanıcı bilgisini kontrol et
      if (!user) {
        setLoading(false);
        return;
      }
      
      // Kullanıcı profil bilgilerini getir
      const { data: profile, error } = await withTokenRefresh(
        () => supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single(),
        navigation
      );
      
      if (error) {
        console.error('Profil bilgileri alınamadı:', error);
        setLoading(false);
        return;
      }
      
      // Kullanıcı verilerini ayarla
      setUserData(profile);
      setFullName(profile?.full_name || '');
      setProfileImage(profile?.profile_image || null);
      setZodiacSign(profile?.zodiac_sign || '');
      setRisingSign(profile?.rising_sign || '');
      setGender(profile?.gender || '');
      setMaritalStatus(profile?.marital_status || '');
      setFavoriteFortuneTeller(profile?.favorite_fortune_teller || '');
      setBirthPlace(profile?.birth_place || '');
      
      // Doğum tarihi
      if (profile?.birth_date) {
        setBirthDate(new Date(profile.birth_date));
      }
      
    } catch (error) {
      console.error('Hata:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchUserData();
    }
  }, [user]);

  // Profil fotoğrafı seçme
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert('İzin Gerekli', 'Galeriye erişim izni vermeniz gerekiyor.');
        return;
      }
      
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
        allowsMultipleSelection: false,
      });
      
      if (!result.canceled && result.assets[0]) {
        const selectedImage = result.assets[0];
        
        // Dosya boyutu kontrolü (5MB limit)
        if (selectedImage.fileSize && selectedImage.fileSize > 5 * 1024 * 1024) {
          Alert.alert('Dosya Boyutu Hatası', 'Seçilen fotoğraf 5MB\'dan büyük. Lütfen daha küçük bir fotoğraf seçin.');
          return;
        }
        
        // Dosya formatı kontrolü
        const fileExtension = selectedImage.uri.split('.').pop().toLowerCase();
        if (!['jpg', 'jpeg', 'png'].includes(fileExtension)) {
          Alert.alert('Dosya Formatı Hatası', 'Sadece JPG ve PNG formatında fotoğraflar desteklenir.');
          return;
        }
        
        setProfileImage(selectedImage.uri);
      }
    } catch (error) {
      console.error('Fotoğraf seçme hatası:', error);
      Alert.alert('Hata', 'Fotoğraf seçilirken bir hata oluştu.');
    }
  };

  // Tarih seçiciyi gösterme/gizleme
  const toggleDatePicker = () => {
    setShowDatePicker(!showDatePicker);
  };

  // Tarih değişikliği
  const onDateChange = (event, selectedDate) => {
    setShowDatePicker(Platform.OS === 'ios');
    
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };



  // Profil fotoğrafı yükleme fonksiyonu
  const uploadProfileImage = async (uri) => {
    try {
      // Eğer zaten bir URL ise (http ile başlıyorsa) direkt döndür
      if (uri && uri.startsWith('http')) {
        return uri;
      }
      
      // Eğer profil fotoğrafı seçilmediyse mevcut fotoğrafı koru
      if (!uri) {
        return userData?.profile_image || null;
      }
      
      
      // Dosya adını oluştur (kullanıcı ID'si ile klasörleme)
      const fileExt = uri.split('.').pop().toLowerCase();
      const timestamp = Date.now();
      const fileName = `${user.id}/${timestamp}.${fileExt}`;
      
      // React Native'den dosyayı oku
      const response = await fetch(uri);
      const blob = await response.blob();
      
      // ArrayBuffer'a çevir
      const arrayBuffer = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = reject;
        reader.readAsArrayBuffer(blob);
      });
      
      
      // Supabase Storage'a yükle (profile-images bucket)
      const { data, error } = await supabase.storage
        .from('profile-images')
        .upload(fileName, arrayBuffer, {
          contentType: `image/${fileExt}`,
          upsert: false
        });
      
      if (error) {
        console.error('❌ Profil fotoğrafı upload hatası:', error);
        throw error;
      }
      
      
      // Public URL al
      const { data: publicUrlData } = supabase.storage
        .from('profile-images')
        .getPublicUrl(fileName);
      
      
      return publicUrlData.publicUrl;
    } catch (error) {
      console.error('❌ Profil fotoğrafı upload hatası:', error);
      throw new Error('Profil fotoğrafı yüklenirken bir hata oluştu: ' + error.message);
    }
  };

  // Profil güncelleme
  const handleUpdateProfile = async () => {
    try {
      setSaving(true);
      
      // AuthContext'ten gelen kullanıcı bilgisini kullan
      if (!user || !user.id) {
        setSaving(false);
        Alert.alert('Hata', 'Oturum bilgileriniz alınamadı. Lütfen tekrar giriş yapın.', [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('Login')
          }
        ]);
        return;
      }
      
      // Profil fotoğrafını Supabase Storage'a yükle
      let profileImageUrl = userData?.profile_image || null;
      if (profileImage && profileImage !== userData?.profile_image) {
        try {
          setUploadingImage(true);
          profileImageUrl = await uploadProfileImage(profileImage);
        } catch (uploadError) {
          console.error('Profil fotoğrafı yükleme hatası:', uploadError);
          Alert.alert(
            'Fotoğraf Yükleme Hatası', 
            uploadError.message || 'Profil fotoğrafı yüklenirken bir hata oluştu. Diğer bilgiler güncellendi.',
            [
              { text: 'Devam Et', onPress: () => {} },
              { text: 'İptal', style: 'cancel', onPress: () => setSaving(false) }
            ]
          );
          return; // Hata durumunda işlemi durdur
        } finally {
          setUploadingImage(false);
        }
      }
      
      // Güncellenecek kullanıcı verileri
      const updatedUserData = {
        full_name: fullName,
        profile_image: profileImageUrl,
        zodiac_sign: zodiacSign,
        rising_sign: risingSign,
        gender: gender,
        marital_status: maritalStatus,
        favorite_fortune_teller: favoriteFortuneTeller,
        birth_place: birthPlace,
        birth_date: birthDate.toISOString().split('T')[0],
        updated_at: new Date(),
      };
      
      // Profil bilgilerini güncelle
      const { error } = await withTokenRefresh(
        () => supabase
          .from('users')
          .update(updatedUserData)
          .eq('id', user.id),
        navigation
      );
      
      if (error) {
        console.error('Profil güncellenirken hata:', error);
        Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
        setSaving(false);
        return;
      }
      
      Alert.alert('Başarılı', 'Profil bilgileriniz güncellendi.');
      
      // Profil ekranına güncel verileri gönder
      navigation.navigate('ProfileScreen', { 
        updatedUserData: {
          ...updatedUserData,
          id: user.id
        },
        profileUpdated: true 
      });
      
    } catch (error) {
      console.error('Hata:', error);
      Alert.alert('Hata', 'İşlem sırasında bir hata oluştu.');
    } finally {
      setSaving(false);
    }
  };

  // Seçenek seçme fonksiyonu
  const handleOptionSelect = (option, setter) => {
    setter(option);
  };

  // Seçenek render fonksiyonu
  const renderOptions = (options, selectedValue, setter) => {
    return (
      <View style={styles.optionsContainer}>
        {options.map((option, index) => (
          <TouchableOpacity
            key={index}
            style={[
              styles.optionButton,
              selectedValue === option && styles.selectedOption
            ]}
            onPress={() => handleOptionSelect(option, setter)}
          >
            <Text style={[
              styles.optionText,
              selectedValue === option && styles.selectedOptionText
            ]}>
              {option}
            </Text>
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Profil yükleniyor...</Text>
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
          <Text style={styles.headerTitle}>Profili Düzenle</Text>
          <View style={styles.headerRight} />
        </View>
      </LinearGradient>

      <ScrollView style={styles.scrollView}>
        {/* Profil Fotoğrafı */}
        <View style={styles.profileImageContainer}>
          <View style={styles.profileImageWrapper}>
            {profileImage ? (
              <Image
                source={{ uri: profileImage }}
                style={styles.profileImage}
              />
            ) : (
              <View style={[styles.profileImage, styles.defaultProfileImage]}>
                <Ionicons name="person" size={50} color={colors.text.light} />
              </View>
            )}
            <TouchableOpacity
              style={styles.cameraButton}
              onPress={pickImage}
              disabled={uploadingImage}
            >
              {uploadingImage ? (
                <ActivityIndicator size="small" color={colors.text.light} />
              ) : (
                <Ionicons name="camera" size={16} color={colors.text.light} />
              )}
            </TouchableOpacity>
          </View>
          <Text style={styles.changePhotoText}>Fotoğrafı Değiştir</Text>
        </View>

        {/* Form */}
        <View style={styles.formContainer}>
          {/* İsim */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>İsim Soyisim</Text>
            <TextInput
              style={styles.input}
              value={fullName}
              onChangeText={setFullName}
              placeholder="İsim Soyisim"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Doğum Tarihi */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doğum Tarihi</Text>
            <TouchableOpacity 
              style={styles.datePickerButton}
              onPress={toggleDatePicker}
            >
              <Text style={styles.dateText}>
                {birthDate ? birthDate.toLocaleDateString('tr-TR', { year: 'numeric', month: '2-digit', day: '2-digit' }) : 'Tarih Seçin'}
              </Text>
              <Ionicons name="calendar" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
            {showDatePicker && (
              <DateTimePicker
                testID="dateTimePicker"
                value={birthDate || new Date()}
                mode="date"
                display={Platform.OS === 'ios' ? 'spinner' : 'default'}
                onChange={onDateChange}
                maximumDate={new Date()}
                minimumDate={new Date(1920, 0, 1)}
                locale="tr-TR"
              />
            )}
          </View>

          {/* Doğum Yeri */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Doğum Yeri</Text>
            <TextInput
              style={styles.input}
              value={birthPlace}
              onChangeText={setBirthPlace}
              placeholder="Doğum yerinizi yazın"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          {/* Burç */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Burç</Text>
            {renderOptions(zodiacSigns, zodiacSign, setZodiacSign)}
          </View>

          {/* Yükselen Burç */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Yükselen Burç</Text>
            {renderOptions(zodiacSigns, risingSign, setRisingSign)}
          </View>

          {/* Cinsiyet */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Cinsiyet</Text>
            {renderOptions(genderOptions, gender, setGender)}
          </View>

          {/* Medeni Durum */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Medeni Durum</Text>
            {renderOptions(maritalStatusOptions, maritalStatus, setMaritalStatus)}
          </View>

          {/* Favori Falcı */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Favori Falcı</Text>
            <TextInput
              style={styles.input}
              value={favoriteFortuneTeller}
              onChangeText={setFavoriteFortuneTeller}
              placeholder="Favori falcınızı yazın"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>
        </View>

        {/* Kaydet Butonu */}
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleUpdateProfile}
          disabled={saving || uploadingImage}
        >
          {(saving || uploadingImage) ? (
            <ActivityIndicator size="small" color={colors.text.light} />
          ) : (
            <Text style={styles.saveButtonText}>Değişiklikleri Kaydet</Text>
          )}
        </TouchableOpacity>

        {/* Alt Boşluk */}
        <View style={{ height: 85 }} />
      </ScrollView>
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
    backgroundColor: 'rgba(255,255,255,0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  headerRight: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  profileImageContainer: {
    alignItems: 'center',
    marginTop: spacing.xl,
  },
  profileImageWrapper: {
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'rgba(255,255,255,0.2)',
    padding: 5,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  defaultProfileImage: {
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    backgroundColor: colors.secondary,
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: colors.primary,
  },
  changePhotoText: {
    marginTop: spacing.sm,
    color: colors.secondary,
    fontSize: typography.fontSize.sm,
  },
  formContainer: {
    padding: spacing.lg,
  },
  inputGroup: {
    marginBottom: spacing.lg,
  },
  label: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  input: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
  },
  datePickerButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    padding: spacing.md,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateText: {
    color: colors.text.primary,
    fontSize: typography.fontSize.md,
  },
  optionsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: spacing.xs,
  },
  optionButton: {
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    margin: spacing.xs,
  },
  selectedOption: {
    backgroundColor: colors.primary,
    borderColor: colors.secondary,
  },
  optionText: {
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  selectedOptionText: {
    color: colors.text.light,
    fontWeight: typography.fontWeight.bold,
  },
  saveButton: {
    backgroundColor: colors.primary,
    marginHorizontal: spacing.lg,
    marginTop: spacing.lg,
    padding: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
});

export default EditProfileScreen; 