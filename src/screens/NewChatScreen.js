import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  ActivityIndicator,
  Alert,
  Image,
  Modal
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

// Auth Context
import { useAuth } from '../context/AuthContext';

// Supabase servisleri
import { searchUsersForChat, sendMessageRequest } from '../services/supabaseService';

const NewChatScreen = ({ navigation, route }) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [messageContent, setMessageContent] = useState('');
  const [showMessageModal, setShowMessageModal] = useState(false);
  const [sending, setSending] = useState(false);

  // Route parametrelerini kontrol et
  useEffect(() => {
    const { fortuneTeller } = route.params || {};
    
    if (fortuneTeller) {
      // Falcı parametresi ile geldiyse, kendisiyle mesajlaşmasını engelle
      if (fortuneTeller.id === user?.id) {
        Alert.alert(
          'Bilgi', 
          'Kendinize mesaj gönderemezsiniz. Başka bir falcı seçin.',
          [{ text: 'Tamam', onPress: () => navigation.goBack() }]
        );
        return;
      }
      
      // Falcıyı seç ve mesaj modalını aç
      setSelectedUser(fortuneTeller);
      setShowMessageModal(true);
    }
  }, [route.params, user?.id, navigation]);

  useEffect(() => {
    if (searchQuery.trim().length >= 2) {
      searchUsers();
    } else {
      setSearchResults([]);
    }
  }, [searchQuery]);

  const searchUsers = async () => {
    if (!user) return;

    setLoading(true);
    try {
      const { data, error } = await searchUsersForChat(searchQuery, user.id, 20);
      if (error) throw error;
      setSearchResults(data || []);
    } catch (error) {
      console.error('Kullanıcı arama hatası:', error);
      Alert.alert('Hata', 'Kullanıcılar aranırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const handleUserSelect = (selectedUser) => {
    // Kullanıcının kendisini seçmesini engelle
    if (selectedUser.id === user.id) {
      Alert.alert(
        'Bilgi', 
        'Kendinize mesaj gönderemezsiniz. Başka bir kullanıcı seçin.',
        [{ text: 'Tamam', style: 'default' }]
      );
      return;
    }

    if (selectedUser.has_permission) {
      // Zaten sohbet izni varsa direkt sohbete git
      navigation.navigate('ChatScreen', {
        partnerId: selectedUser.id,
        partnerName: selectedUser.full_name,
        partnerAvatar: selectedUser.profile_image
      });
    } else if (selectedUser.has_pending_request) {
      Alert.alert(
        'Bekleyen İstek', 
        'Bu kullanıcıya zaten mesaj isteği gönderdiniz. İstek kabul edilene kadar bekleyin.',
        [{ text: 'Tamam', style: 'default' }]
      );
    } else {
      // Mesaj isteği gönder
      setSelectedUser(selectedUser);
      setShowMessageModal(true);
    }
  };

  const handleSendMessageRequest = async () => {
    if (!messageContent.trim() || !selectedUser || sending) return;

    // Son bir kontrol daha yap
    if (selectedUser.id === user.id) {
      Alert.alert('Hata', 'Kendinize mesaj gönderemezsiniz.');
      return;
    }

    setSending(true);
    try {
      const { data, error } = await sendMessageRequest(
        user.id,
        selectedUser.id,
        messageContent.trim()
      );
      
      if (error) {
        // Özel hata mesajlarını kontrol et
        if (error.message?.includes('Kendinize mesaj gönderemezsiniz')) {
          Alert.alert('Hata', 'Kendinize mesaj gönderemezsiniz.');
        } else if (error.message?.includes('Bu kullanıcıya zaten mesaj isteği gönderdiniz')) {
          Alert.alert('Bilgi', 'Bu kullanıcıya zaten mesaj isteği gönderdiniz.');
        } else if (error.message?.includes('Bu kullanıcıyla zaten sohbet edebilirsiniz')) {
          Alert.alert('Bilgi', 'Bu kullanıcıyla zaten sohbet edebilirsiniz.');
          // Direkt sohbete git
          navigation.navigate('ChatScreen', {
            partnerId: selectedUser.id,
            partnerName: selectedUser.full_name,
            partnerAvatar: selectedUser.profile_image
          });
        } else if (error.message?.includes('Bu kullanıcı mesaj almıyor')) {
          Alert.alert('Bilgi', 'Bu kullanıcı mesaj almıyor.');
        } else {
          throw error;
        }
        return;
      }

      Alert.alert(
        'Başarılı',
        'Mesaj isteğiniz gönderildi. Kullanıcı isteğinizi kabul ettiğinde sohbet edebileceksiniz.',
        [
          {
            text: 'Tamam',
            onPress: () => {
              setShowMessageModal(false);
              setMessageContent('');
              setSelectedUser(null);
              navigation.goBack();
            }
          }
        ]
      );
    } catch (error) {
      console.error('Mesaj isteği gönderme hatası:', error);
      Alert.alert('Hata', error.message || 'Mesaj isteği gönderilemedi.');
    } finally {
      setSending(false);
    }
  };

  const renderUserItem = ({ item }) => {
    // Kullanıcının kendisini gösterme
    if (item.id === user?.id) {
      return null;
    }

    return (
      <TouchableOpacity
        style={styles.userItem}
        onPress={() => handleUserSelect(item)}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatar}>
          {item.profile_image ? (
            <Image source={{ uri: item.profile_image }} style={styles.userAvatarImage} />
          ) : (
            <Text style={styles.userAvatarText}>
              {item.full_name?.charAt(0) || '?'}
            </Text>
          )}
          {item.online_status === 'online' && (
            <View style={styles.onlineIndicator} />
          )}
        </View>
        
        <View style={styles.userInfo}>
          <Text style={styles.userName}>{item.full_name}</Text>
          <Text style={styles.userEmail}>{item.email}</Text>
        </View>
        
        <View style={styles.userStatus}>
          {item.has_permission ? (
            <View style={styles.statusBadge}>
              <Ionicons name="chatbubbles" size={16} color={colors.success} />
              <Text style={styles.statusText}>Sohbet</Text>
            </View>
          ) : item.has_pending_request ? (
            <View style={styles.statusBadge}>
              <MaterialCommunityIcons name="clock-outline" size={16} color={colors.warning} />
              <Text style={styles.statusText}>Beklemede</Text>
            </View>
          ) : (
            <View style={styles.statusBadge}>
              <Ionicons name="add-circle-outline" size={16} color={colors.secondary} />
              <Text style={styles.statusText}>İstek Gönder</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="account-search" 
        size={64} 
        color={colors.text.tertiary} 
      />
      <Text style={styles.emptyTitle}>
        {searchQuery.trim().length >= 2 ? 'Kullanıcı bulunamadı' : 'Kullanıcı arayın'}
      </Text>
      <Text style={styles.emptySubtitle}>
        {searchQuery.trim().length >= 2 
          ? 'Arama kriterlerinizi değiştirmeyi deneyin'
          : 'Sohbet başlatmak istediğiniz kişiyi isim veya email ile arayın'
        }
      </Text>
    </View>
  );

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
          {/* Arama Çubuğu */}
          <View style={styles.searchContainer}>
            <View style={styles.searchWrapper}>
              <Ionicons name="search" size={20} color={colors.text.tertiary} />
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={setSearchQuery}
                placeholder="İsim veya email ile arayın..."
                placeholderTextColor={colors.text.tertiary}
                autoFocus
              />
              {searchQuery.length > 0 && (
                <TouchableOpacity
                  onPress={() => setSearchQuery('')}
                  style={styles.clearButton}
                >
                  <Ionicons name="close-circle" size={20} color={colors.text.tertiary} />
                </TouchableOpacity>
              )}
            </View>
          </View>

          {/* Kullanıcı Listesi */}
          <FlatList
            data={searchResults}
            renderItem={renderUserItem}
            keyExtractor={(item) => item.id}
            ListEmptyComponent={renderEmptyComponent}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.listContainer}
          />

          {/* Yükleme Göstergesi */}
          {loading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color={colors.secondary} />
              <Text style={styles.loadingText}>Aranıyor...</Text>
            </View>
          )}

          {/* Mesaj İsteği Modalı */}
          <Modal
            visible={showMessageModal}
            transparent
            animationType="slide"
            onRequestClose={() => setShowMessageModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContent}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Mesaj İsteği Gönder</Text>
                  <TouchableOpacity
                    onPress={() => setShowMessageModal(false)}
                    style={styles.closeButton}
                  >
                    <Ionicons name="close" size={24} color={colors.text.light} />
                  </TouchableOpacity>
                </View>

                <View style={styles.selectedUserInfo}>
                  <View style={styles.selectedUserAvatar}>
                    {selectedUser?.profile_image ? (
                      <Image 
                        source={{ uri: selectedUser.profile_image }} 
                        style={styles.selectedUserAvatarImage} 
                      />
                    ) : (
                      <Text style={styles.selectedUserAvatarText}>
                        {selectedUser?.full_name?.charAt(0) || '?'}
                      </Text>
                    )}
                  </View>
                  <Text style={styles.selectedUserName}>
                    {selectedUser?.full_name}
                  </Text>
                </View>

                <Text style={styles.modalSubtitle}>
                  Bu kullanıcıya ilk mesajınızı gönderin. Kullanıcı mesajınızı kabul ettiğinde sohbet edebileceksiniz.
                </Text>

                <TextInput
                  style={styles.messageInput}
                  value={messageContent}
                  onChangeText={setMessageContent}
                  placeholder="Mesajınızı yazın..."
                  placeholderTextColor={colors.text.tertiary}
                  multiline
                  maxLength={500}
                  textAlignVertical="top"
                />

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => setShowMessageModal(false)}
                  >
                    <Text style={styles.cancelButtonText}>İptal</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.sendButton,
                      (!messageContent.trim() || sending) && styles.sendButtonDisabled
                    ]}
                    onPress={handleSendMessageRequest}
                    disabled={!messageContent.trim() || sending}
                  >
                    {sending ? (
                      <ActivityIndicator size="small" color={colors.background} />
                    ) : (
                      <Text style={styles.sendButtonText}>Gönder</Text>
                    )}
                  </TouchableOpacity>
                </View>
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
  safeArea: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    width: '100%',
  },
  searchContainer: {
    padding: spacing.lg,
    paddingBottom: spacing.md,
  },
  searchWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  searchInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    marginLeft: spacing.sm,
  },
  clearButton: {
    padding: spacing.xs,
  },
  listContainer: {
    flexGrow: 1,
    paddingHorizontal: spacing.lg,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  userAvatar: {
    position: 'relative',
    marginRight: spacing.md,
  },
  userAvatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  userAvatarText: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    color: colors.text.light,
    fontSize: 20,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 50,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  userEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  userStatus: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(74, 0, 128, 0.2)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  statusText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.light,
    marginLeft: spacing.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondary,
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.lg,
    width: '90%',
    maxWidth: 400,
    ...shadows.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  modalTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  closeButton: {
    padding: spacing.xs,
  },
  selectedUserInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  selectedUserAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  selectedUserAvatarImage: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  selectedUserAvatarText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  selectedUserName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  modalSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
    lineHeight: 20,
  },
  messageInput: {
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    minHeight: 100,
    marginBottom: spacing.lg,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: spacing.md,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  sendButton: {
    flex: 1,
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    alignItems: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  sendButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.background,
  },
});

export default NewChatScreen; 