import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Modal, 
  TouchableOpacity, 
  TextInput,
  Image,
  TouchableWithoutFeedback,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons, Feather } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';
import { uploadPostImage } from '../services/supabaseService';
import { useAuth } from '../context/AuthContext';

const FortuneCreateModal = ({ visible, onClose, onPublish }) => {
  const { user } = useAuth();
  
  const [description, setDescription] = useState('');
  const [image, setImage] = useState(null);
  const [fortuneType, setFortuneType] = useState('coffee'); // coffee, tarot, palm
  const [uploading, setUploading] = useState(false);

  const pickImage = async () => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [4, 3],
      quality: 1,
    });

    if (!result.canceled) {
      setImage(result.assets[0].uri);
    }
  };

  const handleFortuneTypeChange = (type) => {
    setFortuneType(type);
  };

  const handlePublish = async () => {
    if (!image || !description.trim()) {
      Alert.alert('Eksik Bilgi', 'Lütfen resim ve açıklama ekleyin.');
      return;
    }

    if (!user) {
      Alert.alert('Hata', 'Giriş yapmalısınız.');
      return;
    }

    setUploading(true);

    try {
      
      // Resmi Supabase Storage'a yükle
      const uploadResult = await uploadPostImage(image, user.id);
      
      if (!uploadResult.success) {
        throw new Error(uploadResult.error || 'Upload başarısız');
      }


      const newPost = {
        description,
        imageUrl: uploadResult.url, // Storage URL'i kullan
        imagePath: uploadResult.path, // Silme işlemi için path'i sakla
        fortuneType,
      };

      onPublish(newPost);
      resetForm();
      onClose();
      
    } catch (error) {
      console.error('❌ Publish hatası:', error);
      Alert.alert('Hata', 'Paylaşım yapılırken bir hata oluştu: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const resetForm = () => {
    setDescription('');
    setImage(null);
    setFortuneType('coffee');
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      transparent={true}
      onRequestClose={onClose}
    >
      <TouchableWithoutFeedback onPress={onClose}>
        <View style={styles.overlay}>
          <TouchableWithoutFeedback>
            <KeyboardAvoidingView
              behavior={Platform.OS === 'ios' ? 'padding' : null}
              style={styles.centeredView}
            >
              <LinearGradient
                colors={[colors.primaryDark, colors.primary]}
                style={styles.modalView}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
              >
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Fal Paylaş</Text>
                  <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                    <Ionicons name="close" size={24} color={colors.text.light} />
                  </TouchableOpacity>
                </View>

                <ScrollView style={styles.modalContent}>
                  {/* Fal Türü Seçimi */}
                  <View style={styles.fortuneTypeContainer}>
                    <TouchableOpacity 
                      style={[
                        styles.fortuneTypeButton, 
                        fortuneType === 'coffee' && styles.fortuneTypeButtonActive
                      ]}
                      onPress={() => handleFortuneTypeChange('coffee')}
                    >
                      <Ionicons 
                        name="cafe" 
                        size={20} 
                        color={fortuneType === 'coffee' ? colors.secondary : colors.text.secondary} 
                      />
                      <Text 
                        style={[
                          styles.fortuneTypeText, 
                          fortuneType === 'coffee' && styles.fortuneTypeTextActive
                        ]}
                      >
                        Kahve Falı
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.fortuneTypeButton, 
                        fortuneType === 'tarot' && styles.fortuneTypeButtonActive
                      ]}
                      onPress={() => handleFortuneTypeChange('tarot')}
                    >
                      <MaterialIcons 
                        name="auto-stories" 
                        size={20} 
                        color={fortuneType === 'tarot' ? colors.secondary : colors.text.secondary} 
                      />
                      <Text 
                        style={[
                          styles.fortuneTypeText, 
                          fortuneType === 'tarot' && styles.fortuneTypeTextActive
                        ]}
                      >
                        Tarot
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity 
                      style={[
                        styles.fortuneTypeButton, 
                        fortuneType === 'palm' && styles.fortuneTypeButtonActive
                      ]}
                      onPress={() => handleFortuneTypeChange('palm')}
                    >
                      <Feather 
                        name="heart" 
                        size={20} 
                        color={fortuneType === 'palm' ? colors.secondary : colors.text.secondary} 
                      />
                      <Text 
                        style={[
                          styles.fortuneTypeText, 
                          fortuneType === 'palm' && styles.fortuneTypeTextActive
                        ]}
                      >
                        El Falı
                      </Text>
                    </TouchableOpacity>
                  </View>

                  {/* Görsel Yükleme Alanı */}
                  <TouchableOpacity 
                    style={styles.imagePickerContainer}
                    onPress={pickImage}
                  >
                    {image ? (
                      <Image source={{ uri: image }} style={styles.selectedImage} />
                    ) : (
                      <View style={styles.imagePlaceholder}>
                        <Ionicons name="image-outline" size={40} color={colors.text.tertiary} />
                        <Text style={styles.imagePlaceholderText}>Görsel Seçin</Text>
                      </View>
                    )}
                  </TouchableOpacity>

                  {/* Açıklama Alanı */}
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      placeholder="Açıklama yazın..."
                      placeholderTextColor={colors.text.tertiary}
                      multiline={true}
                      value={description}
                      onChangeText={setDescription}
                      maxLength={300}
                    />
                  </View>
                  
                  <Text style={styles.characterCount}>
                    {description.length}/300
                  </Text>

                  {/* İpucu Mesajı */}
                  <View style={styles.tipContainer}>
                    <Ionicons name="information-circle-outline" size={20} color={colors.text.tertiary} />
                    <Text style={styles.tipText}>
                      Paylaşımınız, Keşfet sayfasında diğer kullanıcılar tarafından görüntülenecektir.
                    </Text>
                  </View>
                </ScrollView>

                <View style={styles.actionButtons}>
                  <TouchableOpacity 
                    style={styles.cancelButton} 
                    onPress={onClose}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity 
                    style={[
                      styles.publishButton, 
                      ((!image || !description.trim()) || uploading) && styles.publishButtonDisabled
                    ]} 
                    onPress={handlePublish}
                    disabled={(!image || !description.trim()) || uploading}
                  >
                    {uploading ? (
                      <View style={styles.loadingContainer}>
                        <ActivityIndicator size="small" color={colors.text.light} />
                        <Text style={[styles.publishButtonText, { marginLeft: spacing.sm }]}>
                          Yükleniyor...
                        </Text>
                      </View>
                    ) : (
                      <Text style={styles.publishButtonText}>Paylaş</Text>
                    )}
                  </TouchableOpacity>
                </View>
              </LinearGradient>
            </KeyboardAvoidingView>
          </TouchableWithoutFeedback>
        </View>
      </TouchableWithoutFeedback>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
  },
  centeredView: {
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 22,
  },
  modalView: {
    width: '100%',
    backgroundColor: colors.card,
    borderTopLeftRadius: radius.xl,
    borderTopRightRadius: radius.xl,
    paddingTop: spacing.lg,
    paddingBottom: Platform.OS === 'ios' ? 40 : spacing.lg,
    ...shadows.lg,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    marginBottom: spacing.md,
    position: 'relative',
  },
  modalTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  closeButton: {
    position: 'absolute',
    right: spacing.lg,
    padding: spacing.xs,
  },
  modalContent: {
    paddingHorizontal: spacing.lg,
  },
  fortuneTypeContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
  },
  fortuneTypeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.sm,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingHorizontal: spacing.md,
  },
  fortuneTypeButtonActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  fortuneTypeText: {
    marginLeft: spacing.xs,
    color: colors.text.secondary,
    fontSize: typography.fontSize.sm,
  },
  fortuneTypeTextActive: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.semiBold,
  },
  imagePickerContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    borderStyle: 'dashed',
    marginBottom: spacing.lg,
    overflow: 'hidden',
    height: 200,
  },
  imagePlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
  },
  imagePlaceholderText: {
    marginTop: spacing.sm,
    color: colors.text.tertiary,
    fontSize: typography.fontSize.md,
  },
  selectedImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  inputContainer: {
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radius.md,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    marginBottom: spacing.xs,
  },
  input: {
    color: colors.text.light,
    padding: spacing.md,
    minHeight: 80,
    textAlignVertical: 'top',
    fontSize: typography.fontSize.md,
  },
  characterCount: {
    textAlign: 'right',
    color: colors.text.tertiary,
    fontSize: typography.fontSize.xs,
    marginBottom: spacing.md,
  },
  tipContainer: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    padding: spacing.md,
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    alignItems: 'flex-start',
  },
  tipText: {
    marginLeft: spacing.xs,
    color: colors.text.tertiary,
    fontSize: typography.fontSize.sm,
    flex: 1,
  },
  actionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.lg,
    marginTop: spacing.md,
  },
  cancelButton: {
    flex: 1,
    padding: spacing.md,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.border,
    marginRight: spacing.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
  },
  publishButton: {
    flex: 2,
    padding: spacing.md,
    borderRadius: radius.md,
    backgroundColor: colors.secondary,
    alignItems: 'center',
    ...shadows.colored(colors.secondary),
  },
  publishButtonDisabled: {
    backgroundColor: 'rgba(255, 215, 0, 0.5)',
    ...shadows.sm,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  publishButtonText: {
    color: colors.background,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
  },
});

export default FortuneCreateModal; 