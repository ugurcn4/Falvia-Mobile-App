import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  StatusBar,
  ActivityIndicator,
  Alert,
  Image,
  ScrollView
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
import { acceptMessageRequest, rejectMessageRequest } from '../services/supabaseService';

const MessageRequestScreen = ({ route, navigation }) => {
  const { user } = useAuth();
  const { requestId, sender, message } = route.params;
  
  const [loading, setLoading] = useState(false);
  const [action, setAction] = useState(null); // 'accept' veya 'reject'

  // Kullanıcının kendisiyle mesajlaşmasını engelle
  useEffect(() => {
    if (sender?.id === user?.id) {
      Alert.alert(
        'Hata', 
        'Kendinize mesaj gönderemezsiniz.',
        [{ text: 'Tamam', onPress: () => navigation.goBack() }]
      );
    }
  }, [sender?.id, user?.id, navigation]);

  const handleAccept = async () => {
    // Ek kontrol
    if (sender?.id === user?.id) {
      Alert.alert('Hata', 'Kendinize mesaj gönderemezsiniz.');
      return;
    }

    setAction('accept');
    setLoading(true);
    
    try {
      const { data, error } = await acceptMessageRequest(requestId, user.id);
      if (error) throw error;

      Alert.alert(
        'Başarılı',
        'Mesaj isteğini kabul ettiniz. Artık bu kullanıcıyla sohbet edebilirsiniz.',
        [
          {
            text: 'Sohbete Git',
            onPress: () => {
              navigation.navigate('ChatScreen', {
                partnerId: sender.id,
                partnerName: sender.full_name,
                partnerAvatar: sender.profile_image
              });
            }
          },
          {
            text: 'Tamam',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Mesaj isteği kabul hatası:', error);
      Alert.alert('Hata', 'Mesaj isteği kabul edilemedi.');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const handleReject = async () => {
    setAction('reject');
    setLoading(true);
    
    try {
      const { data, error } = await rejectMessageRequest(requestId, user.id);
      if (error) throw error;

      Alert.alert(
        'Reddedildi',
        'Mesaj isteğini reddettiniz.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.goBack()
          }
        ]
      );
    } catch (error) {
      console.error('Mesaj isteği red hatası:', error);
      Alert.alert('Hata', 'Mesaj isteği reddedilemedi.');
    } finally {
      setLoading(false);
      setAction(null);
    }
  };

  const formatTime = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {/* Header */}
            <View style={styles.header}>
              <MaterialCommunityIcons 
                name="message-text-outline" 
                size={48} 
                color={colors.secondary} 
              />
              <Text style={styles.headerTitle}>Mesaj İsteği</Text>
              <Text style={styles.headerSubtitle}>
                Size mesaj göndermek isteyen bir kullanıcı var
              </Text>
            </View>

            {/* Gönderen Kullanıcı Bilgisi */}
            <View style={styles.senderCard}>
              <View style={styles.senderInfo}>
                <View style={styles.senderAvatar}>
                  {sender?.profile_image ? (
                    <Image 
                      source={{ uri: sender.profile_image }} 
                      style={styles.senderAvatarImage} 
                    />
                  ) : (
                    <Text style={styles.senderAvatarText}>
                      {sender?.full_name?.charAt(0) || '?'}
                    </Text>
                  )}
                </View>
                <View style={styles.senderDetails}>
                  <Text style={styles.senderName}>
                    {sender?.full_name || 'Bilinmeyen Kullanıcı'}
                  </Text>
                  <Text style={styles.senderEmail}>
                    {sender?.email || 'Email bilgisi yok'}
                  </Text>
                </View>
              </View>
            </View>

            {/* Mesaj İçeriği */}
            <View style={styles.messageCard}>
              <View style={styles.messageHeader}>
                <Ionicons name="chatbubble-outline" size={20} color={colors.secondary} />
                <Text style={styles.messageHeaderText}>Gelen Mesaj</Text>
              </View>
              <View style={styles.messageContent}>
                <Text style={styles.messageText}>{message}</Text>
              </View>
            </View>

            {/* Bilgi Kartı */}
            <View style={styles.infoCard}>
              <MaterialCommunityIcons 
                name="information-outline" 
                size={24} 
                color={colors.info} 
              />
              <Text style={styles.infoTitle}>Nasıl Çalışır?</Text>
              <Text style={styles.infoText}>
                Bu kullanıcı size mesaj göndermek istiyor. İsteği kabul ederseniz, 
                artık sürekli sohbet edebilirsiniz. Reddederseniz, kullanıcı size 
                tekrar mesaj gönderemez.
              </Text>
            </View>

            {/* Aksiyon Butonları */}
            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.rejectButton,
                  action === 'reject' && styles.actionButtonDisabled
                ]}
                onPress={handleReject}
                disabled={loading}
              >
                {action === 'reject' && loading ? (
                  <ActivityIndicator size="small" color={colors.text.light} />
                ) : (
                  <>
                    <Ionicons name="close-circle" size={24} color={colors.text.light} />
                    <Text style={styles.rejectButtonText}>Reddet</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.actionButton,
                  styles.acceptButton,
                  action === 'accept' && styles.actionButtonDisabled
                ]}
                onPress={handleAccept}
                disabled={loading}
              >
                {action === 'accept' && loading ? (
                  <ActivityIndicator size="small" color={colors.background} />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle" size={24} color={colors.background} />
                    <Text style={styles.acceptButtonText}>Kabul Et</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>

            {/* Uyarı */}
            <View style={styles.warningCard}>
              <MaterialCommunityIcons 
                name="shield-alert-outline" 
                size={20} 
                color={colors.warning} 
              />
              <Text style={styles.warningText}>
                Sadece tanıdığınız ve güvendiğiniz kişilerin mesaj isteklerini kabul edin.
              </Text>
            </View>

            {/* Alt Boşluk */}
            <View style={{ height: 100 }} />
          </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: spacing.lg,
  },
  header: {
    alignItems: 'center',
    marginBottom: spacing.xl,
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  headerSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 24,
  },
  senderCard: {
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  senderInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  senderAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  senderAvatarImage: {
    width: 60,
    height: 60,
    borderRadius: 30,
  },
  senderAvatarText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  senderDetails: {
    flex: 1,
  },
  senderName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  senderEmail: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  messageCard: {
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    ...shadows.md,
  },
  messageHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  messageHeaderText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginLeft: spacing.sm,
  },
  messageContent: {
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    borderRadius: radius.md,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  messageText: {
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    lineHeight: 24,
  },
  infoCard: {
    backgroundColor: 'rgba(33, 150, 243, 0.1)',
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.info,
  },
  infoTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginTop: spacing.sm,
    marginBottom: spacing.sm,
  },
  infoText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    ...shadows.md,
  },
  rejectButton: {
    backgroundColor: colors.error,
  },
  acceptButton: {
    backgroundColor: colors.secondary,
  },
  actionButtonDisabled: {
    opacity: 0.7,
  },
  rejectButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginLeft: spacing.sm,
  },
  acceptButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.background,
    marginLeft: spacing.sm,
  },
  warningCard: {
    flexDirection: 'row',
    backgroundColor: 'rgba(255, 193, 7, 0.1)',
    borderRadius: radius.lg,
    padding: spacing.md,
    borderWidth: 1,
    borderColor: colors.warning,
  },
  warningText: {
    flex: 1,
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    lineHeight: 18,
  },
});

export default MessageRequestScreen; 