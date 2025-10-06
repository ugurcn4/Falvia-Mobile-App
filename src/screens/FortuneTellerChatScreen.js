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
  Modal,
  Keyboard
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

// Auth Context
import { useAuth } from '../context/AuthContext';

// Servisler
import FortuneTellerChatService from '../services/fortuneTellerChatService';

const { width } = Dimensions.get('window');

const FortuneTellerChatScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { fortuneTeller } = route.params;

  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [aiTyping, setAiTyping] = useState(false);
  const [tokenBalance, setTokenBalance] = useState(0);
  const [showTokenWarning, setShowTokenWarning] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [keyboardVisible, setKeyboardVisible] = useState(false);

  const flatListRef = useRef(null);
  const inputRef = useRef(null);
  const typingAnim = useRef(new Animated.Value(0)).current;
  const subscriptionRef = useRef(null);

  useEffect(() => {
    if (user && fortuneTeller) {
      initializeChat();
    }

    // Klavye listener'ları
    const keyboardWillShow = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      () => setKeyboardVisible(true)
    );
    const keyboardWillHide = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardVisible(false)
    );

    return () => {
      if (subscriptionRef.current) {
        FortuneTellerChatService.unsubscribeFromMessages(subscriptionRef.current);
      }
      keyboardWillShow.remove();
      keyboardWillHide.remove();
    };
  }, [user, fortuneTeller]);

  useEffect(() => {
    // Typing animasyonu
    if (aiTyping) { 
      Animated.loop(
        Animated.sequence([
          Animated.timing(typingAnim, {
            toValue: 1,
            duration: 500,
            useNativeDriver: true
          }),
          Animated.timing(typingAnim, {
            toValue: 0,
            duration: 500,
            useNativeDriver: true
          })
        ])
      ).start();
    } else {
      typingAnim.setValue(0);
    }
  }, [aiTyping]);

  useEffect(() => {
    // Token uyarısı
    if (tokenBalance > 0 && tokenBalance < fortuneTeller.message_price * 3) {
      setShowTokenWarning(true);
    } else {
      setShowTokenWarning(false);
    }
  }, [tokenBalance, fortuneTeller]);

  useEffect(() => {
    navigation.setOptions({
      headerTitle: () => (
        <View style={styles.headerTitle}>
          <View style={styles.headerAvatar}>
            {fortuneTeller.profile_image ? (
              <Image 
                source={{ uri: fortuneTeller.profile_image }} 
                style={styles.headerAvatarImage} 
              />
            ) : (
              <MaterialCommunityIcons
                name="crystal-ball"
                size={24}
                color={colors.secondary}
              />
            )}
            {fortuneTeller.is_available && (
              <View style={styles.headerOnlineDot} />
            )}
          </View>
          <View style={styles.headerInfo}>
            <Text style={styles.headerName}>{fortuneTeller.name}</Text>
            <Text style={styles.headerStatus}>
              {fortuneTeller.is_available ? 'Çevrimiçi' : 'Çevrimdışı'}
            </Text>
          </View>
        </View>
      ),
      headerRight: () => (
        <View style={styles.headerRight}>
          <TouchableOpacity 
            style={styles.headerButton}
            onPress={handleToggleFavorite}
          >
            <Ionicons
              name={isFavorite ? "heart" : "heart-outline"}
              size={24}
              color={isFavorite ? colors.error : colors.text.light}
            />
          </TouchableOpacity>
        </View>
      ),
    });
  }, [fortuneTeller, isFavorite]);

  const initializeChat = async () => {
    setLoading(true);
    try {
      // Sohbeti al veya oluştur
      const { data: chatData, error: chatError } = await FortuneTellerChatService.getOrCreateChat(
        user.id,
        fortuneTeller.id
      );

      if (chatError) throw chatError;
      setChat(chatData);
      setIsFavorite(chatData.is_favorite || false);

      // Mesajları yükle
      const { data: messagesData, error: messagesError } = await FortuneTellerChatService.getChatMessages(
        chatData.id
      );

      if (messagesError) throw messagesError;
      setMessages(messagesData || []);

      // Token bakiyesini al
      await updateTokenBalance();

      // Mesajları okundu işaretle
      await FortuneTellerChatService.markMessagesAsRead(chatData.id);

      // Gerçek zamanlı dinleme başlat
      setupRealtimeSubscription(chatData.id);

      setTimeout(scrollToBottom, 100);
    } catch (error) {
      console.error('Sohbet başlatma hatası:', error);
      Alert.alert('Hata', 'Sohbet başlatılırken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const setupRealtimeSubscription = (chatId) => {
    
    // Önceki subscription varsa kapat
    if (subscriptionRef.current) {
      FortuneTellerChatService.unsubscribeFromMessages(subscriptionRef.current);
      subscriptionRef.current = null;
    }
    
    // Yeni subscription başlat
    const channel = FortuneTellerChatService.subscribeToMessages(
      chatId,
      (newMessage) => {
        
        
        // Mesaj zaten listede var mı kontrol et (duplikasyon önleme)
        setMessages(prev => {
          const exists = prev.some(msg => msg.id === newMessage.id);
          if (exists) {
            return prev;
          }
          return [...prev, newMessage];
        });
        
        // AI typing kapatılıyor
        setAiTyping(false);
        setTimeout(scrollToBottom, 100);
        
        // Falcı mesajıysa okundu işaretle
        if (newMessage.sender_type === 'fortune_teller') {
          FortuneTellerChatService.markMessagesAsRead(chatId);
        }
      }
    );
    
    subscriptionRef.current = channel;
  };

  const updateTokenBalance = async () => {
    const { currentBalance } = await FortuneTellerChatService.checkUserTokenBalance(
      user.id,
      0
    );
    setTokenBalance(currentBalance);
  };

  const handleToggleFavorite = async () => {
    const newFavoriteStatus = !isFavorite;
    setIsFavorite(newFavoriteStatus);

    const { success } = await FortuneTellerChatService.toggleFavoriteFortuneTeller(
      user.id,
      fortuneTeller.id,
      newFavoriteStatus
    );

    if (!success) {
      setIsFavorite(!newFavoriteStatus);
      Alert.alert('Hata', 'Favori güncellenirken bir hata oluştu.');
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || sending || aiTyping) return;

    const messageContent = newMessage.trim();
    setNewMessage('');
    setSending(true);
    
    // Klavyeyi kapat
    Keyboard.dismiss();

    try {
      // Kullanıcı mesajını gönder (token kesilir)
      const { data: userMessage, error: userError } = await FortuneTellerChatService.sendUserMessage(
        user.id,
        chat.id,
        messageContent,
        fortuneTeller.message_price
      );

      if (userError) {
        if (userError.code === 'INSUFFICIENT_TOKENS') {
          Alert.alert(
            'Yetersiz Jeton',
            `Mesaj göndermek için ${fortuneTeller.message_price} jeton gerekli. Jeton almak ister misiniz?`,
            [
              { text: 'İptal', style: 'cancel' },
              { 
                text: 'Jeton Al', 
                onPress: () => navigation.navigate('TokenStore')
              }
            ]
          );
          setNewMessage(messageContent);
          return;
        }
        throw userError;
      }

      // Mesajı UI'a ekle
      setMessages(prev => [...prev, userMessage]);
      scrollToBottom();

      // Token bakiyesini güncelle
      await updateTokenBalance();

      // AI yanıtını oluştur (arka planda, asenkron)
      const { data: aiMessage, error: aiError } = await FortuneTellerChatService.generateFortuneTellerResponse(
        chat.id,
        user.id,
        fortuneTeller.id,
        messageContent,
        messages
      );

      if (aiError) {
        throw aiError;
      }


      // Gerçekçi bekleme süresi: 45-100 saniye arası
      const thinkingTime = Math.floor(Math.random() * (100000 - 45000 + 1)) + 45000; // 45-100 saniye
      const typingTime = 20000; // Yazıyor gösterme süresi: 20 saniye
      
      
      // İlk bekle (falcı düşünüyor)
      await new Promise(resolve => setTimeout(resolve, thinkingTime));
      
      // Sonra yazıyor göster (state güncelleniyor!)
      setAiTyping(true);
      
      // Yazıyor animasyonu göster
      await new Promise(resolve => setTimeout(resolve, typingTime));
      
      // Mesajı veritabanına kaydet
      const { data: savedMessage, error: saveError } = await FortuneTellerChatService.saveFortuneTellerMessage(
        chat.id,
        fortuneTeller.id,
        user.id,
        aiMessage
      );
      
      if (saveError) {
        setAiTyping(false);
        throw saveError;
      }
      
      
      // MUTLAKA mesajı ekrana ekle (realtime beklemeden)
      setMessages(prev => {
        // Zaten eklenmiş mi kontrol et
        const exists = prev.some(msg => msg.id === savedMessage.id);
        if (exists) {
          return prev;
        }
        return [...prev, savedMessage];
      });
      
      // Yazıyor animasyonunu kapat
      setAiTyping(false);
      
      // Ekranı scroll et
      setTimeout(() => {
        scrollToBottom();
      }, 100);
    } catch (error) {
      console.error('Mesaj gönderme hatası:', error);
      Alert.alert('Hata', 'Mesaj gönderilemedi. Lütfen tekrar deneyin.');
      setNewMessage(messageContent);
    } finally {
      setSending(false);
      setAiTyping(false);
    }
  };

  const scrollToBottom = () => {
    if (flatListRef.current && messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.sender_type === 'user';
    const showAvatar = !isUser && (index === 0 || messages[index - 1]?.sender_type === 'user');

    return (
      <View style={[
        styles.messageContainer,
        isUser ? styles.userMessageContainer : styles.aiMessageContainer
      ]}>
        {showAvatar && !isUser && (
          <View style={styles.messageAvatar}>
            {fortuneTeller.profile_image ? (
              <Image 
                source={{ uri: fortuneTeller.profile_image }} 
                style={styles.messageAvatarImage} 
              />
            ) : (
              <MaterialCommunityIcons
                name="crystal-ball"
                size={20}
                color={colors.secondary}
              />
            )}
          </View>
        )}

        <View style={[
          styles.messageBubble,
          isUser ? styles.userMessageBubble : styles.aiMessageBubble,
          !isUser && !showAvatar && { marginLeft: 40 }
        ]}>
          {!isUser && showAvatar && (
            <Text style={styles.senderName}>{fortuneTeller.name}</Text>
          )}
          
          <Text style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.aiMessageText
          ]}>
            {item.content}
          </Text>

          <View style={styles.messageFooter}>
            <Text style={[
              styles.messageTime,
              isUser ? styles.userMessageTime : styles.aiMessageTime
            ]}>
              {new Date(item.created_at).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>

            {isUser && item.token_cost > 0 && (
              <View style={styles.tokenBadge}>
                <MaterialCommunityIcons
                  name="diamond-outline"
                  size={12}
                  color={colors.background}
                />
                <Text style={styles.tokenText}>{item.token_cost}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
    );
  };

  const renderTypingIndicator = () => {
    if (!aiTyping) {
      return null;
    }

    return (
      <View style={styles.typingContainer}>
        <View style={styles.messageAvatar}>
          {fortuneTeller.profile_image ? (
            <Image 
              source={{ uri: fortuneTeller.profile_image }} 
              style={styles.messageAvatarImage} 
            />
          ) : (
            <MaterialCommunityIcons
              name="crystal-ball"
              size={20}
              color={colors.secondary}
            />
          )}
        </View>
        <View style={styles.typingBubble}>
          <Animated.View style={{ opacity: typingAnim }}>
            <View style={styles.typingDots}>
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
              <View style={styles.typingDot} />
            </View>
          </Animated.View>
        </View>
      </View>
    );
  };

  const renderHeader = () => {
    if (messages.length > 0) return null;

    return (
      <View style={styles.welcomeContainer}>
        <View style={styles.welcomeAvatar}>
          {fortuneTeller.profile_image ? (
            <Image 
              source={{ uri: fortuneTeller.profile_image }} 
              style={styles.welcomeAvatarImage} 
            />
          ) : (
            <MaterialCommunityIcons
              name="crystal-ball"
              size={60}
              color={colors.secondary}
            />
          )}
        </View>
        <Text style={styles.welcomeTitle}>{fortuneTeller.name}</Text>
        <Text style={styles.welcomeSubtitle}>
          {fortuneTeller.experience_years} yıl deneyimli falcı
        </Text>
        <Text style={styles.welcomeText}>
          Merhaba! Ben {fortuneTeller.name}. Size nasıl yardımcı olabilirim?
        </Text>
        <View style={styles.welcomeInfo}>
          <MaterialCommunityIcons
            name="information-outline"
            size={20}
            color={colors.info}
          />
          <Text style={styles.welcomeInfoText}>
            Her mesaj için {fortuneTeller.message_price} jeton kesilir. 
            Falcı yanıtları ücretsizdir. Ortalama yanıt süresi: {fortuneTeller.average_response_time || 5} dk.
          </Text>
        </View>
      </View>
    );
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Sohbet hazırlanıyor...</Text>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="light-content" />
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        <LinearGradient
          colors={[colors.background, colors.primaryDark, colors.background]}
          style={styles.backgroundGradient}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        >
          {/* Token Uyarısı */}
          {showTokenWarning && (
            <View style={styles.tokenWarning}>
              <MaterialCommunityIcons
                name="alert"
                size={20}
                color={colors.warning}
              />
              <Text style={styles.tokenWarningText}>
                Jetonlarınız azalıyor! Mevcut: {tokenBalance} jeton
              </Text>
              <TouchableOpacity
                style={styles.tokenWarningButton}
                onPress={() => navigation.navigate('TokenStore')}
              >
                <Text style={styles.tokenWarningButtonText}>Al</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Mesajlar */}
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            ListHeaderComponent={renderHeader}
            ListFooterComponent={renderTypingIndicator}
            style={styles.messagesList}
            contentContainerStyle={styles.messagesContainer}
            showsVerticalScrollIndicator={false}
            onContentSizeChange={scrollToBottom}
            onLayout={scrollToBottom}
            keyboardShouldPersistTaps="handled"
          />

          {/* Input */}
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
                editable={!sending && !aiTyping}
              />
              <TouchableOpacity
                style={[
                  styles.sendButton,
                  (!newMessage.trim() || sending || aiTyping) && styles.sendButtonDisabled
                ]}
                onPress={handleSendMessage}
                disabled={!newMessage.trim() || sending || aiTyping}
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
            <View style={styles.inputFooter}>
              <View style={styles.tokenInfo}>
                <MaterialCommunityIcons
                  name="diamond-outline"
                  size={16}
                  color={colors.secondary}
                />
                <Text style={styles.tokenInfoText}>
                  Bakiye: {tokenBalance}
                </Text>
              </View>
              <View style={styles.messageCostContainer}>
                <MaterialCommunityIcons
                  name="diamond-outline"
                  size={14}
                  color={colors.text.tertiary}
                />
                <Text style={styles.messageCost}>
                  {fortuneTeller.message_price}/mesaj
                </Text>
              </View>
            </View>
          </View>
        </LinearGradient>
      </KeyboardAvoidingView>
    </SafeAreaView>
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
  flex: {
    flex: 1,
  },
  backgroundGradient: {
    flex: 1,
    width: '100%',
  },
  headerTitle: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
    position: 'relative',
  },
  headerAvatarImage: {
    width: 36,
    height: 36,
    borderRadius: 18,
  },
  headerOnlineDot: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.success,
    borderWidth: 2,
    borderColor: colors.background,
  },
  headerInfo: {
    flex: 1,
  },
  headerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  headerStatus: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  headerRight: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  headerButton: {
    padding: spacing.xs,
  },
  tokenWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.2)',
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(255, 193, 7, 0.3)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    gap: spacing.sm,
  },
  tokenWarningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.light,
  },
  tokenWarningButton: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    backgroundColor: colors.secondary,
  },
  tokenWarningButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
  messagesList: {
    flex: 1,
  },
  messagesContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.sm,
    paddingBottom: spacing.lg,
    flexGrow: 1,
  },
  welcomeContainer: {
    alignItems: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  welcomeAvatar: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  welcomeAvatarImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
  },
  welcomeTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  welcomeText: {
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: spacing.lg,
  },
  welcomeInfo: {
    flexDirection: 'row',
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(33, 150, 243, 0.3)',
    gap: spacing.sm,
  },
  welcomeInfoText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  messageContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    maxWidth: width * 0.8,
  },
  userMessageContainer: {
    alignSelf: 'flex-end',
    marginLeft: width * 0.2,
  },
  aiMessageContainer: {
    alignSelf: 'flex-start',
    marginRight: width * 0.2,
  },
  messageAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.xs,
  },
  messageAvatarImage: {
    width: 32,
    height: 32,
    borderRadius: 16,
  },
  messageBubble: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    maxWidth: '100%',
  },
  userMessageBubble: {
    backgroundColor: colors.secondary,
    borderBottomRightRadius: radius.xs,
  },
  aiMessageBubble: {
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderBottomLeftRadius: radius.xs,
  },
  senderName: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    marginBottom: spacing.xs,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    lineHeight: 20,
  },
  userMessageText: {
    color: colors.background,
  },
  aiMessageText: {
    color: colors.text.light,
  },
  messageFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  messageTime: {
    fontSize: typography.fontSize.xs,
  },
  userMessageTime: {
    color: colors.background,
    opacity: 0.7,
  },
  aiMessageTime: {
    color: colors.text.tertiary,
  },
  tokenBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 2,
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.xs,
    backgroundColor: 'rgba(0, 0, 0, 0.2)',
  },
  tokenText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
  typingContainer: {
    flexDirection: 'row',
    marginVertical: spacing.xs,
    marginLeft: 0,
  },
  typingBubble: {
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.lg,
    borderBottomLeftRadius: radius.xs,
  },
  typingDots: {
    flexDirection: 'row',
    gap: spacing.xs,
  },
  typingDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.tertiary,
  },
  inputContainer: {
    paddingHorizontal: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.md,
    backgroundColor: 'rgba(18, 18, 37, 0.95)',
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
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
    opacity: 0.5,
  },
  inputFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: spacing.xs,
    paddingHorizontal: spacing.xs,
  },
  tokenInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  tokenInfoText: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  messageCostContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
  },
  messageCost: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
});

export default FortuneTellerChatScreen;

