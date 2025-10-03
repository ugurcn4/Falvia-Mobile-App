import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
  Alert,
  Image,
  Animated,
  Dimensions,
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
import {
  getMessages,
  sendMessage,
  markMessagesAsRead,
  subscribeToMessages,
  unsubscribeFromAll,
  updateUserOnlineStatus
} from '../services/supabaseService';
import { supabase } from '../services/supabaseService';

const { width } = Dimensions.get('window');

const ChatScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { partnerId, partnerName, partnerAvatar } = route.params;
  
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [showMenuModal, setShowMenuModal] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const typingAnim = useRef(new Animated.Value(0)).current;

  // Kullanıcının kendisiyle mesajlaşmasını engelle
  useEffect(() => {
    if (partnerId === user?.id) {
      Alert.alert(
        'Hata', 
        'Kendinize mesaj gönderemezsiniz.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
      return;
    }
  }, [partnerId, user?.id, navigation]);

  useEffect(() => {
    if (user && partnerId) {
      // Kendisiyle mesajlaşma kontrolü
      if (partnerId === user.id) {
        return;
      }
      
      loadMessages();
      setupRealTimeSubscription();
      markMessagesAsRead(user.id, partnerId);
      updateUserOnlineStatus(user.id, 'online');
    }

    return () => {
      unsubscribeFromAll();
    };
  }, [user, partnerId]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <View style={styles.headerAvatar}>
            {partnerAvatar ? (
              <Image source={{ uri: partnerAvatar }} style={styles.headerAvatarImage} />
            ) : (
              <Text style={styles.headerAvatarText}>
                {partnerName?.charAt(0) || '?'}
              </Text>
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{partnerName}</Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <TouchableOpacity style={styles.headerButton} onPress={() => setShowMenuModal(true)}>
          <Ionicons name="ellipsis-vertical" size={24} color={colors.text.light} />
        </TouchableOpacity>
      ),
    });
  }, []);

  const setupRealTimeSubscription = () => {
    if (!user) return;

    subscribeToMessages(user.id, (payload) => {
      if (payload.new && payload.new.sender_id === partnerId) {
        // Karşıdan gelen mesajı formatla
        const formattedMessage = {
          id: payload.new.id,
          content: payload.new.content,
          isOwn: false, // Karşıdan gelen mesaj
          timestamp: new Date(payload.new.created_at),
          isRead: false,
          imageUrl: payload.new.image_url,
          videoUrl: payload.new.video_url
        };
        
        setMessages(prev => [...prev, formattedMessage]);
        markMessagesAsRead(user.id, partnerId);
        scrollToBottom();
      }
    });
  };

  const loadMessages = async () => {
    try {
      const { data, error } = await getMessages(user.id, partnerId, 50);
      if (error) throw error;
      
      const formattedMessages = data.map(formatMessage);
      setMessages(formattedMessages);
      
      if (formattedMessages.length > 0) {
        setTimeout(scrollToBottom, 100);
      }
    } catch (error) {
      console.error('Mesajlar yükleme hatası:', error);
      Alert.alert('Hata', 'Mesajlar yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const formatMessage = (message) => ({
    id: message.id,
    content: message.content,
    isOwn: message.sender?.id === user?.id,
    timestamp: new Date(message.created_at),
    isRead: message.isRead,
    imageUrl: message.imageUrl,
    videoUrl: message.videoUrl
  });

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending) return;

    // Kendisiyle mesajlaşma kontrolü
    if (partnerId === user?.id) {
      Alert.alert('Hata', 'Kendinize mesaj gönderemezsiniz.');
      return;
    }

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);

    try {
      const { data, error } = await sendMessage(user.id, partnerId, messageContent);
      if (error) throw error;

      // Mesajı manuel olarak formatla (sender_id'yi doğru ayarla)
      const formattedMessage = {
        id: data.id,
        content: data.content,
        isOwn: true, // Gönderen kişi biz olduğumuz için true
        timestamp: new Date(data.created_at),
        isRead: false, // Yeni gönderilen mesaj henüz okunmamış
        imageUrl: data.image_url,
        videoUrl: data.video_url
      };
      
      setMessages(prev => [...prev, formattedMessage]);
      scrollToBottom();
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi.');
      setNewMessage(messageContent); // Mesajı geri koy
    } finally {
      setSending(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      flatListRef.current.scrollToEnd({ animated: true });
    }
  };

  const handleReportUser = () => {
    setShowMenuModal(false);
    Alert.alert(
      'Kullanıcıyı Şikayet Et',
      'Bu kullanıcıyı şikayet etmek istediğinizden emin misiniz?',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Şikayet Et', 
          style: 'destructive',
          onPress: () => {
            Alert.alert('Başarılı', 'Şikayetiniz alınmıştır. İnceleme sürecinde bilgilendirileceksiniz.');
          }
        }
      ]
    );
  };

  const handleDeleteMessages = () => {
    setShowMenuModal(false);
    Alert.alert(
      'Sohbeti Sil',
      'Bu sohbeti ve tüm mesajları silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.',
      [
        { text: 'İptal', style: 'cancel' },
        { 
          text: 'Sil', 
          style: 'destructive',
          onPress: async () => {
            try {
              // Önce conversation'ı bul
              const { data: conversation, error: convError } = await supabase
                .from('conversations')
                .select('id')
                .or(`and(user1_id.eq.${user.id},user2_id.eq.${partnerId}),and(user1_id.eq.${partnerId},user2_id.eq.${user.id})`)
                .single();

              if (convError && convError.code !== 'PGRST116') {
                throw convError;
              }

              if (conversation) {
                // Conversation'ı sil (bu otomatik olarak mesajları da silecek)
                const { error: deleteError } = await supabase
                  .from('conversations')
                  .delete()
                  .eq('id', conversation.id);

                if (deleteError) throw deleteError;
              } else {
                // Conversation yoksa sadece mesajları sil
                const { error: msgError } = await supabase
                  .from('messages')
                  .delete()
                  .or(`and(sender_id.eq.${user.id},receiver_id.eq.${partnerId}),and(sender_id.eq.${partnerId},receiver_id.eq.${user.id})`);

                if (msgError) throw msgError;
              }

              // Local state'i temizle
              setMessages([]);
              
              Alert.alert('Başarılı', 'Sohbet silindi.', [
                { text: 'Tamam', onPress: () => navigation.goBack() }
              ]);
            } catch (error) {
              console.error('Sohbet silme hatası:', error);
              Alert.alert('Hata', 'Sohbet silinirken bir hata oluştu.');
            }
          }
        }
      ]
    );
  };

  const renderMessage = ({ item, index }) => {
    const isOwn = item.isOwn;
    const showAvatar = !isOwn && (index === 0 || messages[index - 1]?.isOwn);
    const showTime = index === messages.length - 1 || 
                    messages[index + 1]?.isOwn !== isOwn ||
                    new Date(messages[index + 1]?.timestamp) - item.timestamp > 5 * 60 * 1000;

    return (
      <View style={[
        styles.messageContainer,
        isOwn ? styles.ownMessageContainer : styles.otherMessageContainer
      ]}>
        {showAvatar && !isOwn && (
          <View style={styles.messageAvatar}>
            {partnerAvatar ? (
              <Image source={{ uri: partnerAvatar }} style={styles.messageAvatarImage} />
            ) : (
              <Text style={styles.messageAvatarText}>
                {partnerName?.charAt(0) || '?'}
              </Text>
            )}
          </View>
        )}
        
        <View style={[
          styles.messageBubble,
          isOwn ? styles.ownMessageBubble : styles.otherMessageBubble
        ]}>
          <Text style={[
            styles.messageText,
            isOwn ? styles.ownMessageText : styles.otherMessageText
          ]}>
            {item.content}
          </Text>
          
          {showTime && (
            <View style={styles.messageTimeContainer}>
              <Text style={[
                styles.messageTime,
                isOwn ? styles.ownMessageTime : styles.otherMessageTime
              ]}>
                {item.timestamp.toLocaleTimeString('tr-TR', { 
                  hour: '2-digit', 
                  minute: '2-digit' 
                })}
              </Text>
              {isOwn && (
                <Ionicons 
                  name={item.isRead ? "checkmark-done" : "checkmark"} 
                  size={16} 
                  color={item.isRead ? colors.secondary : colors.text.tertiary} 
                  style={styles.readIndicator}
                />
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => (
    <View style={styles.typingContainer}>
      <View style={styles.typingBubble}>
        <Animated.View style={[styles.typingDot, { opacity: typingAnim }]}>
          <View style={styles.typingDotInner} />
        </Animated.View>
        <Animated.View style={[styles.typingDot, { opacity: typingAnim }]}>
          <View style={styles.typingDotInner} />
        </Animated.View>
        <Animated.View style={[styles.typingDot, { opacity: typingAnim }]}>
          <View style={styles.typingDotInner} />
        </Animated.View>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Mesajlar yükleniyor...</Text>
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
        <View style={styles.mainContainer}>
          <View style={styles.chatContainer}>
            <FlatList
              ref={flatListRef}
              data={messages}
              renderItem={renderMessage}
              keyExtractor={(item) => item.id}
              style={styles.messagesList}
              contentContainerStyle={styles.messagesContainer}
              showsVerticalScrollIndicator={false}
              onContentSizeChange={scrollToBottom}
              onLayout={scrollToBottom}
              ListFooterComponent={renderTypingIndicator}
            />
          </View>
          
          <View style={styles.inputContainer}>
            <View style={styles.inputWrapper}>
              <TextInput
                ref={inputRef}
                style={styles.textInput}
                value={newMessage}
                onChangeText={setNewMessage}
                placeholder="Mesajınızı yazın..."
                placeholderTextColor={colors.text.tertiary}
                multiline
                maxLength={1000}
                onSubmitEditing={handleSendMessage}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending}
              >
                {sending ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <Ionicons 
                    name="send" 
                    size={20} 
                    color={colors.background} 
                  />
                )}
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </LinearGradient>

      {/* Menu Modal */}
      <Modal
        visible={showMenuModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowMenuModal(false)}
      >
        <TouchableOpacity 
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowMenuModal(false)}
        >
          <View style={styles.menuModal}>
            <TouchableOpacity style={styles.menuItem} onPress={handleDeleteMessages}>
              <Ionicons name="trash-outline" size={20} color={colors.error} />
              <Text style={[styles.menuItemText, { color: colors.error }]}>Sohbeti Sil</Text>
            </TouchableOpacity>
            <View style={styles.menuDivider} />
            <TouchableOpacity style={styles.menuItem} onPress={handleReportUser}>
              <Ionicons name="flag-outline" size={20} color={colors.warning} />
              <Text style={[styles.menuItemText, { color: colors.warning }]}>Şikayet Et</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.secondary,
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
  },
  mainContainer: {
    flex: 1,
    paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight || 0 : 0,
    paddingBottom: Platform.OS === 'android' ? 30 : 0,
  },
  backgroundGradient: {
    flex: 1,
    width: '100%',
  },
  chatContainer: {
    flex: 1,
    paddingBottom: Platform.OS === 'android' ? spacing.md : 0,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    maxWidth: width * 0.8,
  },
  ownMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: width * 0.2,
  },
  otherMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: width * 0.2,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: spacing.xs,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageAvatarText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  messageBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    maxWidth: '100%',
  },
  ownMessageBubble: {
    backgroundColor: colors.secondary,
    borderBottomRightRadius: radius.xs,
  },
  otherMessageBubble: {
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderBottomLeftRadius: radius.xs,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    lineHeight: 20,
  },
  ownMessageText: {
    color: colors.background,
  },
  otherMessageText: {
    color: colors.text.light,
  },
  messageTimeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: spacing.xs,
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
  },
  ownMessageTime: {
    color: colors.background,
  },
  otherMessageTime: {
    color: colors.text.tertiary,
  },
  readIndicator: {
    marginLeft: spacing.xs,
  },
  typingContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    marginLeft: width * 0.2,
  },
  typingBubble: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
    marginHorizontal: 2,
  },
  typingDotInner: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: Platform.OS === 'android' ? spacing.xxl * 2 : spacing.lg,
    backgroundColor: 'rgba(18, 18, 37, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    minHeight: 70,
    marginBottom: Platform.OS === 'android' ? -18 : 0,
  },
  inputWrapper: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.lg,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.sm,
    minHeight: 50,
  },
  textInput: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    maxHeight: 100,
    paddingVertical: spacing.sm,
  },
  sendButton: {
    backgroundColor: colors.secondary,
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  sendButtonDisabled: {
    backgroundColor: colors.text.tertiary,
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    position: 'relative',
    marginRight: spacing.sm,
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerAvatarText: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    color: colors.text.light,
    fontSize: 16,
    fontWeight: 'bold',
    textAlign: 'center',
    lineHeight: 36,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  headerButton: {
    padding: spacing.xs,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-start',
    alignItems: 'flex-end',
    paddingTop: Platform.OS === 'ios' ? 120 : 100,
    paddingRight: spacing.md,
  },
  menuModal: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingVertical: spacing.xs,
    minWidth: 160,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.medium,
    elevation: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.sm,
  },
  menuItemText: {
    fontSize: typography.fontSize.md,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  menuDivider: {
    height: 1,
    backgroundColor: colors.border,
    marginVertical: spacing.xs,
  },
});

export default ChatScreen; 