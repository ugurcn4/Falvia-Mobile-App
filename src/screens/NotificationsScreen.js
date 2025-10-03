import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Switch,
  Alert,
  StatusBar,
  ScrollView,
  ActivityIndicator,
  FlatList,
  RefreshControl,
  Dimensions,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import NotificationService from '../services/notificationService';
import { 
  getUserNotifications, 
  getUnreadNotificationCount, 
  markNotificationAsRead, 
  markAllNotificationsAsRead 
} from '../services/supabaseService';

const { width } = Dimensions.get('window');

const NotificationsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);


  const [refreshing, setRefreshing] = useState(false);
  
  // Bildirim ayarları state'leri
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
  });

  // Bildirim listesi state'leri
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeTab, setActiveTab] = useState('notifications'); // 'notifications' veya 'settings'

  // Kullanıcının bildirim ayarlarını yükle
  useEffect(() => {
    loadNotificationSettings();
    loadNotifications();
  }, []);

  useEffect(() => {
    if (activeTab === 'notifications') {
      loadNotifications();
    }
  }, [activeTab]);

  const loadNotificationSettings = async () => {
    try {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Kullanıcının bildirim ayarlarını getir
      const { data: settings, error } = await supabase
        .from('users')
        .select('notification_settings')
        .eq('id', authUser.id)
        .single();

      if (settings?.notification_settings) {
        setNotificationSettings(settings.notification_settings);
      }
    } catch (error) {
      console.error('Bildirim ayarları yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bildirimleri yükle
  const loadNotifications = async () => {
    try {
      if (!user?.id) return;
      
      setLoading(true);
      
      // Bildirimleri al
      const { data: notificationData, error: notificationError } = await getUserNotifications(user.id);
      if (notificationError) {
        console.error('Bildirimler yüklenirken hata:', notificationError);
      } else {
        setNotifications(notificationData || []);
      }
      
      // Okunmamış bildirim sayısını al
      const { count, error: countError } = await getUnreadNotificationCount(user.id);
      if (countError) {
        console.error('Okunmamış bildirim sayısı alınırken hata:', countError);
      } else {
        setUnreadCount(count || 0);
      }
    } catch (error) {
      console.error('Bildirimler yüklenirken genel hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Bildirimi okundu olarak işaretle
  const handleMarkAsRead = async (notificationId) => {
    try {
      const { error } = await markNotificationAsRead(notificationId);
      if (error) {
        console.error('Bildirim okundu işaretlenirken hata:', error);
      } else {
        // Local state güncelle
        setNotifications(prev => 
          prev.map(notif => 
            notif.id === notificationId 
              ? { ...notif, read: true }
              : notif
          )
        );
        setUnreadCount(prev => Math.max(0, prev - 1));
      }
    } catch (error) {
      console.error('Bildirim okundu işaretleme genel hatası:', error);
    }
  };

  // Tüm bildirimleri okundu olarak işaretle
  const handleMarkAllAsRead = async () => {
    try {
      if (!user?.id || unreadCount === 0) return;
      
      const { error } = await markAllNotificationsAsRead(user.id);
      if (error) {
        console.error('Tüm bildirimler okundu işaretlenirken hata:', error);
        Alert.alert('Hata', 'Bildirimler okundu işaretlenirken bir hata oluştu.');
      } else {
        // Local state güncelle
        setNotifications(prev => 
          prev.map(notif => ({ ...notif, read: true }))
        );
        setUnreadCount(0);
        Alert.alert('Başarılı', 'Tüm bildirimler okundu olarak işaretlendi.');
      }
    } catch (error) {
      console.error('Tüm bildirimler okundu işaretleme genel hatası:', error);
      Alert.alert('Hata', 'Beklenmeyen bir hata oluştu.');
    }
  };

  // Refresh
  const onRefresh = () => {
    setRefreshing(true);
    loadNotifications();
  };



  // Bildirim item render
  const renderNotificationItem = ({ item }) => {
    const formatDate = (dateString) => {
      const date = new Date(dateString);
      const now = new Date();
      const diffInHours = (now - date) / (1000 * 60 * 60);
      
      if (diffInHours < 1) {
        return 'Az önce';
      } else if (diffInHours < 24) {
        return `${Math.floor(diffInHours)} saat önce`;
      } else {
        return date.toLocaleDateString('tr-TR', {
          day: 'numeric',
          month: 'short',
          hour: '2-digit',
          minute: '2-digit'
        });
      }
    };

    const getNotificationIcon = (type) => {
      switch (type) {
        case 'admin_notification':
          return 'megaphone';
        case 'mesaj':
          return 'chatbubble';
        case 'fal hazır':
          return 'star';
        case 'promosyon':
          return 'gift';
        default:
          return 'notifications';
      }
    };

    const getNotificationColor = (type) => {
      switch (type) {
        case 'admin_notification':
          return colors.secondary;
        case 'mesaj':
          return colors.info;
        case 'fal hazır':
          return colors.primary;
        case 'promosyon':
          return colors.success;
        default:
          return colors.primary;
      }
    };

    return (
      <TouchableOpacity
        style={[
          styles.notificationItem,
          !item.read && styles.unreadNotificationItem
        ]}
        onPress={() => !item.read && handleMarkAsRead(item.id)}
        activeOpacity={0.7}
      >
        <View style={styles.notificationLeft}>
          <View style={[
            styles.notificationIcon,
            { backgroundColor: getNotificationColor(item.type) }
          ]}>
            <Ionicons 
              name={getNotificationIcon(item.type)} 
              size={20} 
              color={colors.text.light} 
            />
          </View>
          {!item.read && <View style={styles.unreadDot} />}
        </View>
        
        <View style={styles.notificationContent}>
          <Text style={[
            styles.notificationTitle,
            !item.read && styles.unreadNotificationTitle
          ]}>
            {item.title}
          </Text>
          <Text style={styles.notificationBody} numberOfLines={2}>
            {item.content}
          </Text>
          <Text style={styles.notificationTime}>
            {formatDate(item.created_at)}
          </Text>
        </View>
      </TouchableOpacity>
    );
  };

  // Bildirim ayarını güncelle
  const updateNotificationSetting = async (key, value) => {
    try {
      const newSettings = { ...notificationSettings, [key]: value };
      setNotificationSettings(newSettings);

      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) return;

      // Supabase'de güncelle
      const { error } = await supabase
        .from('users')
        .update({ notification_settings: newSettings })
        .eq('id', authUser.id);

      if (error) {
        console.error('Bildirim ayarı güncellenirken hata:', error);
        // Hata durumunda eski değere geri dön
        setNotificationSettings(prev => ({ ...prev, [key]: !value }));
        Alert.alert('Hata', 'Bildirim ayarı güncellenirken bir hata oluştu.');
      }
    } catch (error) {
      console.error('Bildirim ayarı güncellenirken hata:', error);
      setNotificationSettings(prev => ({ ...prev, [key]: !value }));
      Alert.alert('Hata', 'Bildirim ayarı güncellenirken bir hata oluştu.');
    }
  };



  // Push token kontrolü
  const debugPushToken = async () => {
    try {
      setLoading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
        return;
      }

      // Kullanıcının push token'ını kontrol et
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('push_token')
        .eq('id', authUser.id)
        .single();

      if (userError) {
        Alert.alert('Hata', 'Token kontrol edilirken hata oluştu.');
        return;
      }

      // Token yoksa kayıt işlemini başlat
      if (!userData?.push_token) {
        const newToken = await NotificationService.registerForPushNotifications();
        if (newToken) {
          Alert.alert('Başarılı', 'Push token başarıyla kaydedildi. Artık bildirim alabilirsiniz.');
        } else {
          Alert.alert('Hata', 'Push token kaydedilemedi. Lütfen uygulama ayarlarından bildirimlere izin verin.');
        }
      } else {
        Alert.alert('Bilgi', 'Push token mevcut. Bildirim sistemi aktif.');
      }

    } catch (error) {
      console.error('Push token kontrol hatası:', error);
      Alert.alert('Hata', 'Token kontrol edilirken hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Bildirim ayarları listesi
  const notificationOptions = [
    {
      key: 'pushNotifications',
      title: 'Push Bildirimleri',
      description: 'Fal hazır, yeni mesaj ve diğer bildirimleri al',
      icon: 'notifications',
      color: '#3498db'
    }
  ];

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Bildirim ayarları yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
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
          <Ionicons name="arrow-back" size={24} color={colors.text.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Bildirimler</Text>
        <View style={styles.headerSpacer} />
      </LinearGradient>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'notifications' && styles.activeTab]}
          onPress={() => setActiveTab('notifications')}
        >
          <Ionicons 
            name="notifications" 
            size={20} 
            color={activeTab === 'notifications' ? colors.text.light : colors.text.tertiary} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'notifications' && styles.activeTabText
          ]}>
            Bildirimler {unreadCount > 0 && `(${unreadCount})`}
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.tabItem, activeTab === 'settings' && styles.activeTab]}
          onPress={() => setActiveTab('settings')}
        >
          <Ionicons 
            name="settings" 
            size={20} 
            color={activeTab === 'settings' ? colors.text.light : colors.text.tertiary} 
          />
          <Text style={[
            styles.tabText, 
            activeTab === 'settings' && styles.activeTabText
          ]}>
            Ayarlar
          </Text>
        </TouchableOpacity>
      </View>

      {activeTab === 'notifications' ? (
        // Bildirimler Tab
        <View style={styles.notificationsContainer}>
          {/* Header Actions */}
          {notifications.length > 0 && (
            <View style={styles.notificationActions}>
              <Text style={styles.notificationCount}>
                {notifications.length} bildirim{unreadCount > 0 && `, ${unreadCount} okunmamış`}
              </Text>
              {unreadCount > 0 && (
                <TouchableOpacity 
                  onPress={handleMarkAllAsRead}
                  style={styles.markAllButton}
                >
                  <Text style={styles.markAllText}>Tümünü Okundu İşaretle</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {/* Bildirim Listesi */}
          <FlatList
            data={notifications}
            keyExtractor={(item) => item.id}
            renderItem={renderNotificationItem}
            refreshControl={
              <RefreshControl
                refreshing={refreshing}
                onRefresh={onRefresh}
                colors={[colors.primary]}
                tintColor={colors.primary}
              />
            }
            contentContainerStyle={styles.notificationsList}
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={styles.emptyContainer}>
                <Ionicons name="notifications-off" size={64} color={colors.text.tertiary} />
                <Text style={styles.emptyTitle}>Bildirim Yok</Text>
                <Text style={styles.emptyDescription}>
                  Henüz herhangi bir bildirim almadınız.
                </Text>
              </View>
            }
          />
        </View>
      ) : (
        // Ayarlar Tab
        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Bilgi Kartı */}
          <View style={styles.infoCard}>
            <View style={styles.infoIconContainer}>
              <Ionicons name="information-circle" size={24} color={colors.info} />
            </View>
            <View style={styles.infoContent}>
              <Text style={styles.infoTitle}>Bildirim Ayarları</Text>
              <Text style={styles.infoDescription}>
                Push bildirimlerini açıp kapatabilirsiniz. Ayarlarınız otomatik olarak kaydedilir.
              </Text>
            </View>
          </View>

        {/* Bildirim Ayarları */}
        <View style={styles.settingsContainer}>
          <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
          
          {notificationOptions.map((option, index) => (
            <View key={option.key} style={styles.settingItem}>
              <View style={styles.settingLeft}>
                <View style={[styles.settingIcon, { backgroundColor: option.color }]}>
                  <Ionicons name={option.icon} size={20} color={colors.text.light} />
                </View>
                <View style={styles.settingText}>
                  <Text style={styles.settingTitle}>{option.title}</Text>
                  <Text style={styles.settingDescription}>{option.description}</Text>
                </View>
              </View>
              <Switch
                value={notificationSettings[option.key]}
                onValueChange={(value) => updateNotificationSetting(option.key, value)}
                trackColor={{ false: colors.border, true: colors.primary }}
                thumbColor={notificationSettings[option.key] ? colors.text.light : colors.text.tertiary}
                ios_backgroundColor={colors.border}
              />
            </View>
          ))}
        </View>


        {/* Push Token Kontrolü */}
        <View style={styles.testContainer}>
          <Text style={styles.sectionTitle}>Push Token Kontrolü</Text>
          <Text style={styles.testDescription}>
            Bildirim sisteminizin çalışıp çalışmadığını kontrol edin.
          </Text>
          <TouchableOpacity
            style={[styles.debugButton, loading && styles.testButtonDisabled]}
            onPress={debugPushToken}
            disabled={loading}
          >
            <View style={styles.debugButtonContent}>
              {loading ? (
                <ActivityIndicator size="small" color={colors.info} />
              ) : (
                <Ionicons name="notifications-outline" size={20} color={colors.info} />
              )}
              <Text style={styles.debugButtonText}>
                {loading ? 'Kontrol Ediliyor...' : 'Bildirim Durumunu Kontrol Et'}
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Alt Boşluk */}
        <View style={{ height: 100 }} />
      </ScrollView>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginHorizontal: 20,
    marginTop: 20,
    borderRadius: 12,
    padding: 4,
  },
  tabItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: colors.primary,
  },
  tabText: {
    marginLeft: 8,
    fontSize: 14,
    fontWeight: '500',
    color: colors.text.tertiary,
  },
  activeTabText: {
    color: colors.text.light,
    fontWeight: '600',
  },
  notificationsContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  notificationActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  notificationCount: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  markAllButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: colors.primary,
    borderRadius: 6,
  },
  markAllText: {
    fontSize: 12,
    color: colors.text.light,
    fontWeight: '500',
  },
  notificationsList: {
    paddingBottom: 100,
  },
  notificationItem: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    marginVertical: 4,
    borderRadius: 12,
    padding: 16,
    borderLeftWidth: 3,
    borderLeftColor: 'transparent',
  },
  unreadNotificationItem: {
    borderLeftColor: colors.secondary,
    backgroundColor: colors.primaryDark + '20',
  },
  notificationLeft: {
    position: 'relative',
    marginRight: 12,
  },
  notificationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  unreadDot: {
    position: 'absolute',
    top: -2,
    right: -2,
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.secondary,
  },
  notificationContent: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '500',
    color: colors.text.secondary,
    marginBottom: 4,
  },
  unreadNotificationTitle: {
    color: colors.text.light,
    fontWeight: '600',
  },
  notificationBody: {
    fontSize: 14,
    color: colors.text.tertiary,
    lineHeight: 20,
    marginBottom: 8,
  },
  notificationTime: {
    fontSize: 12,
    color: colors.text.tertiary,
  },
  emptyContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: colors.text.secondary,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyDescription: {
    fontSize: 14,
    color: colors.text.tertiary,
    textAlign: 'center',
    paddingHorizontal: 32,
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
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
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
    flex: 1,
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginHorizontal: 10,
  },
  headerSpacer: {
    width: 40,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
  },
  infoCard: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginTop: 20,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoIconContainer: {
    marginRight: 12,
  },
  infoContent: {
    flex: 1,
  },
  infoTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 5,
  },
  infoDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  settingsContainer: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
  },
  settingItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    flex: 1,
  },
  settingTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    marginBottom: 2,
  },
  settingDescription: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  testContainer: {
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    marginBottom: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.2,
    shadowRadius: 5,
    elevation: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  testDescription: {
    fontSize: 14,
    color: colors.text.secondary,
    marginBottom: 20,
    lineHeight: 20,
  },
  testButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  testButtonDisabled: {
    opacity: 0.7,
  },
  testButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  testButtonText: {
    color: colors.text.light,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  debugButton: {
    borderRadius: 12,
    overflow: 'hidden',
    marginTop: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  debugButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 20,
  },
  debugButtonText: {
    color: colors.info,
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default NotificationsScreen; 