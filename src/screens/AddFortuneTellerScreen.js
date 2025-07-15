import React, { useState } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  TextInput,
  StyleSheet,
  Alert,
  ActivityIndicator,
  Image,
  StatusBar,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import colors from '../styles/colors';
import { createFortuneTeller } from '../services/supabaseService';
import { supabase } from '../../lib/supabase';

const AddFortuneTellerScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    profile_image: null,
    bio: '',
    experience_years: '',
    specialties: [],
    price_per_fortune: '',
    rank: 'başlangıç',
    is_available: true,
  });

  // Uzmanlık alanları
  const specialtyOptions = [
    { id: 'kahve falı', name: 'Kahve Falı', icon: 'coffee' },
    { id: 'tarot', name: 'Tarot', icon: 'cards' },
    { id: 'astroloji', name: 'Astroloji', icon: 'planet' },
    { id: 'el', name: 'El Falı', icon: 'hand-left' },
    { id: 'rüya', name: 'Rüya Yorumu', icon: 'moon' },
    { id: 'kristal', name: 'Kristal Falı', icon: 'diamond' },
  ];

  // Rütbe seçenekleri
  const rankOptions = [
    { id: 'başlangıç', name: 'Başlangıç', color: colors.success },
    { id: 'uzman', name: 'Uzman', color: colors.primary },
    { id: 'usta', name: 'Usta', color: colors.secondary },
  ];

  // Form alanı güncelleme
  const updateFormData = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Uzmanlık alanı toggle
  const toggleSpecialty = (specialtyId) => {
    setFormData(prev => ({
      ...prev,
      specialties: prev.specialties.includes(specialtyId)
        ? prev.specialties.filter(id => id !== specialtyId)
        : [...prev.specialties, specialtyId]
    }));
  };

  // Resim seçme
  const pickImage = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Uyarı', 'Galeri izni gerekiyor!');
        return;
      }

      Alert.alert(
        'Resim Seç',
        'Resim kaynağını seçin',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Kamera', onPress: () => openCamera() },
          { text: 'Galeri', onPress: () => openGallery() },
        ]
      );
    } catch (error) {
      console.error('Resim seçme hatası:', error);
    }
  };

  const openCamera = async () => {
    try {
      const result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        updateFormData('profile_image', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
    }
  };

  const openGallery = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled) {
        updateFormData('profile_image', result.assets[0].uri);
      }
    } catch (error) {
      console.error('Galeri hatası:', error);
    }
  };

  // Resim yükleme
  const uploadImage = async (uri) => {
    try {
      const fileExt = uri.split('.').pop();
      const fileName = `fortune_teller_${Date.now()}.${fileExt}`;
      const filePath = `fortune_teller_images/${fileName}`;

      const response = await fetch(uri);
      const blob = await response.blob();

      const { data, error } = await supabase.storage
        .from('avatars')
        .upload(filePath, blob);

      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath);

      return urlData.publicUrl;
    } catch (error) {
      console.error('Resim yükleme hatası:', error);
      throw error;
    }
  };

  // Form validasyonu
  const validateForm = () => {
    if (!formData.name.trim()) {
      Alert.alert('Hata', 'Falcı adı gerekli!');
      return false;
    }

    if (!formData.bio.trim()) {
      Alert.alert('Hata', 'Biyografi gerekli!');
      return false;
    }

    if (!formData.experience_years || isNaN(formData.experience_years) || formData.experience_years < 0) {
      Alert.alert('Hata', 'Geçerli bir deneyim yılı girin!');
      return false;
    }

    if (formData.specialties.length === 0) {
      Alert.alert('Hata', 'En az bir uzmanlık alanı seçin!');
      return false;
    }

    if (!formData.price_per_fortune || isNaN(formData.price_per_fortune) || formData.price_per_fortune < 1) {
      Alert.alert('Hata', 'Geçerli bir fiyat girin!');
      return false;
    }

    return true;
  };

  // Falcı kaydetme
  const handleSave = async () => {
    if (!validateForm()) return;

    try {
      setLoading(true);

      let profileImageUrl = null;
      if (formData.profile_image) {
        profileImageUrl = await uploadImage(formData.profile_image);
      }

      const fortuneTellerData = {
        name: formData.name.trim(),
        profile_image: profileImageUrl,
        bio: formData.bio.trim(),
        experience_years: parseInt(formData.experience_years),
        specialties: formData.specialties,
        price_per_fortune: parseInt(formData.price_per_fortune),
        rank: formData.rank,
        is_available: formData.is_available,
        rating: 5.0, // Yeni falcı için başlangıç puanı
        total_readings: 0,
      };

      const { data, error } = await createFortuneTeller(fortuneTellerData);

      if (error) throw error;

      Alert.alert(
        'Başarılı',
        'Falcı başarıyla eklendi!',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack()
          }
        ]
      );

    } catch (error) {
      console.error('Falcı kaydetme hatası:', error);
      Alert.alert('Hata', 'Falcı kaydedilirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Yeni Falcı Ekle</Text>
        <TouchableOpacity
          style={styles.saveButton}
          onPress={handleSave}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Ionicons name="checkmark" size={24} color="#fff" />
          )}
        </TouchableOpacity>
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Profil Resmi */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profil Resmi</Text>
          <TouchableOpacity style={styles.imageContainer} onPress={pickImage}>
            {formData.profile_image ? (
              <Image source={{ uri: formData.profile_image }} style={styles.profileImage} />
            ) : (
              <View style={styles.imagePlaceholder}>
                <Ionicons name="camera" size={40} color={colors.text.secondary} />
                <Text style={styles.imagePlaceholderText}>Resim Seç</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>

        {/* Temel Bilgiler */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Temel Bilgiler</Text>
          
          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Falcı Adı *</Text>
            <TextInput
              style={styles.textInput}
              value={formData.name}
              onChangeText={(text) => updateFormData('name', text)}
              placeholder="Örn: Ayşe Hanım"
              placeholderTextColor={colors.text.tertiary}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.inputLabel}>Biyografi *</Text>
            <TextInput
              style={[styles.textInput, styles.multilineInput]}
              value={formData.bio}
              onChangeText={(text) => updateFormData('bio', text)}
              placeholder="Falcı hakkında kısa bilgi..."
              placeholderTextColor={colors.text.tertiary}
              multiline
              numberOfLines={4}
            />
          </View>

          <View style={styles.row}>
            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Deneyim (Yıl) *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.experience_years}
                onChangeText={(text) => updateFormData('experience_years', text)}
                placeholder="5"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>

            <View style={[styles.inputContainer, styles.halfWidth]}>
              <Text style={styles.inputLabel}>Fiyat (Jeton) *</Text>
              <TextInput
                style={styles.textInput}
                value={formData.price_per_fortune}
                onChangeText={(text) => updateFormData('price_per_fortune', text)}
                placeholder="25"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="numeric"
              />
            </View>
          </View>
        </View>

        {/* Uzmanlık Alanları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Uzmanlık Alanları *</Text>
          <View style={styles.specialtiesContainer}>
            {specialtyOptions.map((specialty) => (
              <TouchableOpacity
                key={specialty.id}
                style={[
                  styles.specialtyItem,
                  formData.specialties.includes(specialty.id) && styles.selectedSpecialty
                ]}
                onPress={() => toggleSpecialty(specialty.id)}
              >
                <MaterialCommunityIcons
                  name={specialty.icon}
                  size={20}
                  color={formData.specialties.includes(specialty.id) ? '#fff' : colors.text.secondary}
                />
                <Text style={[
                  styles.specialtyText,
                  formData.specialties.includes(specialty.id) && styles.selectedSpecialtyText
                ]}>
                  {specialty.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Rütbe */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Rütbe</Text>
          <View style={styles.rankContainer}>
            {rankOptions.map((rank) => (
              <TouchableOpacity
                key={rank.id}
                style={[
                  styles.rankItem,
                  formData.rank === rank.id && { backgroundColor: rank.color }
                ]}
                onPress={() => updateFormData('rank', rank.id)}
              >
                <Text style={[
                  styles.rankText,
                  formData.rank === rank.id && styles.selectedRankText
                ]}>
                  {rank.name}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Müsaitlik Durumu */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Müsaitlik Durumu</Text>
          <TouchableOpacity
            style={styles.toggleContainer}
            onPress={() => updateFormData('is_available', !formData.is_available)}
          >
            <Text style={styles.toggleLabel}>
              {formData.is_available ? 'Müsait' : 'Müsait Değil'}
            </Text>
            <View style={[
              styles.toggle,
              formData.is_available && styles.toggleActive
            ]}>
              <View style={[
                styles.toggleButton,
                formData.is_available && styles.toggleButtonActive
              ]} />
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  saveButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
    padding: 20,
  },
  section: {
    marginBottom: 25,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
  },
  imageContainer: {
    alignSelf: 'center',
    marginBottom: 10,
  },
  profileImage: {
    width: 120,
    height: 120,
    borderRadius: 60,
    borderWidth: 3,
    borderColor: colors.primary,
  },
  imagePlaceholder: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: colors.surface,
    borderWidth: 2,
    borderColor: colors.border,
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imagePlaceholderText: {
    color: colors.text.secondary,
    fontSize: 12,
    marginTop: 5,
  },
  inputContainer: {
    marginBottom: 15,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: colors.surface,
    borderRadius: 10,
    padding: 15,
    fontSize: 16,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  multilineInput: {
    height: 100,
    textAlignVertical: 'top',
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  halfWidth: {
    width: '48%',
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  specialtyItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.border,
    marginBottom: 5,
  },
  selectedSpecialty: {
    backgroundColor: colors.primary,
    borderColor: colors.primary,
  },
  specialtyText: {
    marginLeft: 8,
    fontSize: 14,
    color: colors.text.secondary,
  },
  selectedSpecialtyText: {
    color: '#fff',
  },
  rankContainer: {
    flexDirection: 'row',
    gap: 10,
  },
  rankItem: {
    flex: 1,
    backgroundColor: colors.surface,
    paddingVertical: 12,
    paddingHorizontal: 15,
    borderRadius: 10,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
  },
  rankText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.secondary,
  },
  selectedRankText: {
    color: '#fff',
  },
  toggleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surface,
    padding: 15,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: colors.border,
  },
  toggleLabel: {
    fontSize: 16,
    color: colors.text.primary,
  },
  toggle: {
    width: 50,
    height: 25,
    borderRadius: 12.5,
    backgroundColor: colors.border,
    justifyContent: 'center',
    paddingHorizontal: 2,
  },
  toggleActive: {
    backgroundColor: colors.success,
  },
  toggleButton: {
    width: 21,
    height: 21,
    borderRadius: 10.5,
    backgroundColor: '#fff',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 3,
  },
  toggleButtonActive: {
    alignSelf: 'flex-end',
  },
  bottomSpacing: {
    height: 50,
  },
});

export default AddFortuneTellerScreen; 