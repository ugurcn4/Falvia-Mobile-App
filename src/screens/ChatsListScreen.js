import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  RefreshControl,
  ActivityIndicator,
  Alert,
  Platform,
  Animated,
  Image
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

// Auth Context
import { useAuth } from '../context/AuthContext';
import { useFocusEffect } from '@react-navigation/native';

// Supabase servisleri
import {
  getConversations,
  getMessageRequests,
  updateUserOnlineStatus,
  subscribeToConversations,
  subscribeToMessageRequests,
  unsubscribeFromAll
} from '../services/supabaseService';

const ChatsListScreen = ({ navigation, isEmbedded = false }) => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [messageRequests, setMessageRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // Animasyon değerleri
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(50)).current;

  useEffect(() => {
    if (user) {
      loadData();
      setupRealTimeSubscriptions();
      updateUserOnlineStatus(user.id, 'online');
    }

    return () => {
      unsubscribeFromAll();
    };
  }, [user]);

  // Odaklandığında verileri tazele (yalnızca gömülü değilse)
  useFocusEffect(
    React.useCallback(() => {
      if (!isEmbedded && user) {
        loadData();
      }
      return undefined;
    }, [isEmbedded, user])
  );

  const setupRealTimeSubscriptions = () => {
    if (!user) return;

    // Konuşma güncellemelerini dinle
    subscribeToConversations(user.id, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        loadConversations();
      }
    });

    // Mesaj isteklerini dinle
    subscribeToMessageRequests(user.id, (payload) => {
      if (payload.eventType === 'INSERT' || payload.eventType === 'UPDATE') {
        loadMessageRequests();
        // Kabul edildiğinde konuşmaları da yenile
        if (payload.new?.status === 'accepted') {
          loadConversations();
        }
      }
    });
  };

  const loadData = async () => {
    setLoading(true);
    try {
      await Promise.all([
        loadConversations(),
        loadMessageRequests()
      ]);
    } catch (error) {
      console.error('Veri yükleme hatası:', error);
      Alert.alert('Hata', 'Veriler yüklenirken bir hata oluştu.');
    } finally {
      setLoading(false);
      startAnimations();
    }
  };

  const loadConversations = async () => {
    try {
      const { data, error } = await getConversations(user.id);
      if (error) throw error;
      setConversations(data || []);
    } catch (error) {
      console.error('Konuşmalar yükleme hatası:', error);
    }
  };

  const loadMessageRequests = async () => {
    try {
      // Hem gelen hem giden istekleri al
      const { data, error } = await getMessageRequests(user.id, 'pending');
      if (error) throw error;
      
      // Gelen ve giden istekleri ayır
      const incomingRequests = data?.filter(request => request.receiver_id === user.id) || [];
      const outgoingRequests = data?.filter(request => request.sender_id === user.id) || [];
      
      setMessageRequests([...incomingRequests, ...outgoingRequests]);
    } catch (error) {
      console.error('Mesaj istekleri yükleme hatası:', error);
    }
  };

  const startAnimations = () => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true
      })
    ]).start();
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadData();
    setRefreshing(false);
  };

  const handleConversationPress = (conversation) => {
    navigation.navigate('ChatScreen', {
      partnerId: conversation.partner.id,
      partnerName: conversation.partner.full_name,
      partnerAvatar: conversation.partner.profile_image
    });
  };

  const handleMessageRequestPress = (request) => {
    const isOutgoing = request.sender_id === user.id;
    
    if (isOutgoing) {
      // Giden istek için bilgi mesajı göster
      Alert.alert(
        'Gönderilen İstek',
        `Bu kullanıcıya gönderdiğiniz mesaj isteği henüz kabul edilmedi. İstek kabul edilene kadar bekleyin.`,
        [
          { text: 'Tamam', style: 'default' }
        ]
      );
    } else {
      // Gelen istek için normal işlem
      navigation.navigate('MessageRequest', {
        requestId: request.id,
        sender: request.sender,
        message: request.message_content
      });
    }
  };

  const handleNewChatPress = () => {
    navigation.navigate('NewChat');
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now - date) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString('tr-TR', { 
        hour: '2-digit', 
        minute: '2-digit' 
      });
    } else if (diffInHours < 48) {
      return 'Dün';
    } else {
      return date.toLocaleDateString('tr-TR', { 
        day: '2-digit', 
        month: '2-digit' 
      });
    }
  };

  const renderMessageRequest = ({ item }) => {
    const isOutgoing = item.sender_id === user.id;
    const displayUser = isOutgoing ? item.receiver : item.sender;
    
    return (
      <TouchableOpacity
        style={[
          styles.messageRequestItem,
          isOutgoing && styles.outgoingMessageRequestItem
        ]}
        onPress={() => handleMessageRequestPress(item)}
        activeOpacity={0.7}
      >
        <View style={styles.avatarContainer}>
          <View style={styles.avatar}>
            {displayUser?.profile_image ? (
              <Image
                source={{ uri: displayUser.profile_image }}
                style={styles.avatarImage}
              />
            ) : (
              <Text style={styles.avatarText}>
                {displayUser?.full_name?.charAt(0) || '?'}
              </Text>
            )}
          </View>
          {!isOutgoing && <View style={styles.onlineIndicator} />}
        </View>
        
        <View style={styles.messageRequestContent}>
          <View style={styles.messageRequestHeader}>
            <Text style={styles.messageRequestName}>
              {displayUser?.full_name || 'Bilinmeyen Kullanıcı'}
            </Text>
            <Text style={styles.messageRequestTime}>
              {formatTime(item.created_at)}
            </Text>
          </View>
          <Text style={styles.messageRequestText} numberOfLines={2}>
            {isOutgoing ? `Sen: ${item.message_content}` : item.message_content}
          </Text>
          <View style={[
            styles.messageRequestBadge,
            isOutgoing && styles.outgoingMessageRequestBadge
          ]}>
            <Text style={styles.messageRequestBadgeText}>
              {isOutgoing ? 'Gönderildi' : 'Yeni İstek'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const renderConversation = ({ item }) => (
    <TouchableOpacity
      style={styles.conversationItem}
      onPress={() => handleConversationPress(item)}
      activeOpacity={0.7}
    >
      <View style={styles.avatarContainer}>
        <View style={styles.avatar}>
          {item.partner?.profile_image ? (
            <Image
              source={{ uri: item.partner.profile_image }}
              style={styles.avatarImage}
            />
          ) : (
            <Text style={styles.avatarText}>
              {item.partner?.full_name?.charAt(0) || '?'}
            </Text>
          )}
        </View>
        {item.partner?.online_status === 'online' && (
          <View style={styles.onlineIndicator} />
        )}
      </View>
      
      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text style={styles.conversationName}>
            {item.partner?.full_name || 'Bilinmeyen Kullanıcı'}
          </Text>
          <Text style={styles.conversationTime}>
            {formatTime(item.lastMessageTime)}
          </Text>
        </View>
        <Text style={styles.conversationLastMessage} numberOfLines={1}>
          {item.lastMessage || 'Henüz mesaj yok'}
        </Text>
      </View>
      
      {item.unreadCount > 0 && (
        <View style={styles.unreadBadge}>
          <Text style={styles.unreadBadgeText}>
            {item.unreadCount > 99 ? '99+' : item.unreadCount}
          </Text>
        </View>
      )}
    </TouchableOpacity>
  );

  const renderHeader = () => (
    <View style={styles.header}>
      <View style={styles.headerTop}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.light} />
        </TouchableOpacity>
        <View style={styles.headerTitleContainer}>
          <Text style={styles.headerTitle}>Sohbetler</Text>
        </View>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChatPress}
        >
          <Ionicons name="add" size={24} color={colors.background} />
        </TouchableOpacity>
      </View>
      
      {messageRequests.length > 0 && (
        <View style={styles.messageRequestsSection}>
          <Text style={styles.sectionTitle}>Mesaj İstekleri</Text>
          <Text style={styles.sectionSubtitle}>
            Gelen ve gönderdiğiniz mesaj istekleri
          </Text>
          <FlatList
            data={messageRequests}
            renderItem={renderMessageRequest}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.messageRequestsList}
          />
        </View>
      )}
      
      <Text style={styles.sectionTitle}>Konuşmalar</Text>
    </View>
  );

  const renderEmbeddedHeader = () => (
    <View style={styles.embeddedHeader}>
      {messageRequests.length > 0 && (
        <View style={styles.messageRequestsSection}>
          <Text style={styles.sectionTitle}>Mesaj İstekleri</Text>
          <Text style={styles.sectionSubtitle}>
            Gelen ve gönderdiğiniz mesaj istekleri
          </Text>
          <FlatList
            data={messageRequests}
            renderItem={renderMessageRequest}
            keyExtractor={(item) => item.id}
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.messageRequestsList}
          />
        </View>
      )}
      
      <View style={styles.embeddedHeaderRow}>
        <Text style={styles.sectionTitle}>Konuşmalar</Text>
        <TouchableOpacity
          style={styles.newChatButton}
          onPress={handleNewChatPress}
          activeOpacity={0.8}
        >
          <Ionicons name="add" size={20} color={colors.background} />
        </TouchableOpacity>
      </View>
    </View>
  );

  const renderEmptyComponent = () => (
    <View style={styles.emptyContainer}>
      <MaterialCommunityIcons 
        name="chat-outline" 
        size={64} 
        color={colors.text.tertiary} 
      />
      <Text style={styles.emptyTitle}>Henüz sohbet yok</Text>
      <Text style={styles.emptySubtitle}>
        Yeni sohbetler başlatmak için "Yeni sohbet başlat" butonuna tıklayın
      </Text>
      <TouchableOpacity
        style={styles.emptyButton}
        onPress={handleNewChatPress}
      >
        <Text style={styles.emptyButtonText}>Yeni Sohbet Başlat</Text>
      </TouchableOpacity>
    </View>
  );

  if (loading) {
    return (
      <View style={[styles.container, styles.loadingContainer]}>
        <ActivityIndicator size="large" color={colors.secondary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  const content = (
    <Animated.View
      style={[
        styles.content,
        {
          opacity: fadeAnim,
          transform: [{ translateY: slideAnim }]
        }
      ]}
    >
      <FlatList
        data={conversations}
        renderItem={renderConversation}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={isEmbedded ? renderEmbeddedHeader : renderHeader}
        ListEmptyComponent={renderEmptyComponent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.secondary}
            colors={[colors.secondary, colors.primary]}
            progressBackgroundColor={colors.card}
          />
        }
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
      />
    </Animated.View>
  );

  if (isEmbedded) {
    return content;
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
          {content}
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
  content: {
    flex: 1,
  },
  listContainer: {
    flexGrow: 1,
  },
  header: {
    padding: spacing.lg,
    paddingTop: spacing.xl + 20, // Üst boşluk ekle
  },
  embeddedHeader: {
    padding: spacing.lg,
    paddingTop: spacing.md,
  },
  embeddedHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  headerTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.sm,
  },
  headerTitleContainer: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  newChatButton: {
    backgroundColor: colors.secondary,
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.md,
  },
  messageRequestsSection: {
    marginBottom: spacing.lg,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: spacing.md,
  },
  messageRequestsList: {
    paddingRight: spacing.lg,
  },
  messageRequestItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(74, 0, 128, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginRight: spacing.md,
    width: 280,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  outgoingMessageRequestItem: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderColor: colors.secondary,
  },
  conversationItem: {
    flexDirection: 'row',
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderRadius: radius.md,
    padding: spacing.md,
    marginHorizontal: spacing.lg,
    marginBottom: spacing.sm,
    ...shadows.sm,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.sm,
  },
  avatarImage: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  avatarText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
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
  messageRequestContent: {
    flex: 1,
  },
  messageRequestHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  messageRequestName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  messageRequestTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  messageRequestText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.xs,
  },
  messageRequestBadge: {
    backgroundColor: colors.secondary,
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    alignSelf: 'flex-start',
  },
  outgoingMessageRequestBadge: {
    backgroundColor: colors.warning,
  },
  messageRequestBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
  conversationContent: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  conversationName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  conversationTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },
  conversationLastMessage: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  unreadBadge: {
    backgroundColor: colors.secondary,
    minWidth: 20,
    height: 20,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: spacing.sm,
  },
  unreadBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
  },
  emptyTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginTop: spacing.lg,
    marginBottom: spacing.sm,
  },
  emptySubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 24,
  },
  emptyButton: {
    backgroundColor: colors.secondary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
  },
  emptyButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.background,
  },
});

export default ChatsListScreen; 