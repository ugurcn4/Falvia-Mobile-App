import React, { useState, useEffect } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  Switch,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import { useAuth } from '../context/AuthContext';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const AccountSettingsScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState(null);
  const [settings, setSettings] = useState({
    emailNotifications: true,
    pushNotifications: true,
    marketingEmails: false,
    darkMode: true,
    privateProfile: false,
    twoFactorAuth: false,
  });

  // Kullanıcı verilerini getir
  useEffect(() => {
    const fetchUserData = async () => {
      try {
        setLoading(true);
        
        // Kullanıcı oturumu kontrolü
        const { data: { user: authUser } } = await supabase.auth.getUser();
        
        if (!authUser) {
          setLoading(false);
          return;
        }
        
        // Kullanıcı profil bilgilerini getir
        const { data: profile, error } = await supabase
          .from('users')
          .select('*')
          .eq('id', authUser.id)
          .single();
        
        if (error) {
          console.error('Kullanıcı verileri alınırken hata:', error);
          setLoading(false);
          return;
        }
        
        setUserData(profile);
        
        // Kullanıcı ayarlarını getir (eğer varsa)
        if (profile.settings) {
          setSettings(prevSettings => ({
            ...prevSettings,
            ...profile.settings
          }));
        }
        
      } catch (error) {
        console.error('Veri çekerken hata:', error);
      } finally {
        setLoading(false);
      }
    };

    fetchUserData();
  }, []);

  // Ayarları güncelle
  const updateSetting = async (key, value) => {
    try {
      const newSettings = { ...settings, [key]: value };
      setSettings(newSettings);
      
      // Supabase'e ayarları kaydet
      const { error } = await supabase
        .from('users')
        .update({ settings: newSettings })
        .eq('id', user.id);
      
      if (error) {
        console.error('Ayarlar güncellenirken hata:', error);
        Alert.alert('Hata', 'Ayarlar güncellenirken bir hata oluştu.');
        // Hata durumunda eski değere geri dön
        setSettings(settings);
      }
    } catch (error) {
      console.error('Ayarlar güncellenirken hata:', error);
      Alert.alert('Hata', 'Ayarlar güncellenirken bir hata oluştu.');
      setSettings(settings);
    }
  };

  // Şifre değiştirme
  const handleChangePassword = async () => {
    try {
      Alert.alert(
        "Şifre Değiştir",
        "Şifre sıfırlama bağlantısı e-posta adresinize gönderilecektir.",
        [
          {
            text: "İptal",
            style: "cancel"
          },
          { 
            text: "Gönder", 
            onPress: async () => {
              setLoading(true);
              const { error } = await supabase.auth.resetPasswordForEmail(user.email);
              setLoading(false);
              
              if (error) {
                Alert.alert("Hata", "Şifre sıfırlama bağlantısı gönderilirken bir hata oluştu.");
              } else {
                Alert.alert("Başarılı", "Şifre sıfırlama bağlantısı e-posta adresinize gönderildi.");
              }
            }
          }
        ]
      );
    } catch (error) {
      console.error('Şifre sıfırlama hatası:', error);
      Alert.alert('Hata', 'Şifre sıfırlama işlemi sırasında bir hata oluştu.');
      setLoading(false);
    }
  };

  // E-posta değiştirme
  const handleChangeEmail = () => {
    navigation.navigate('ChangeEmail');
  };

  // Hesabı silme
  const handleDeleteAccount = () => {
    Alert.alert(
      "Hesabı Sil",
      "Hesabınızı silmek istediğinize emin misiniz? Bu işlem geri alınamaz ve tüm verileriniz silinecektir.",
      [
        {
          text: "İptal",
          style: "cancel"
        },
        { 
          text: "Hesabımı Sil", 
          onPress: () => {
            Alert.alert(
              "Son Onay",
              "Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecektir. Devam etmek istediğinize emin misiniz?",
              [
                {
                  text: "İptal",
                  style: "cancel"
                },
                { 
                  text: "Evet, Hesabımı Sil", 
                  onPress: async () => {
                    try {
                      setLoading(true);
                      
                      // Önce kullanıcının verilerini sil
                      const { error: dataError } = await supabase
                        .from('users')
                        .delete()
                        .eq('id', user.id);
                      
                      if (dataError) {
                        throw dataError;
                      }
                      
                      // Sonra auth hesabını sil
                      const { error: authError } = await supabase.auth.admin.deleteUser(user.id);
                      
                      if (authError) {
                        throw authError;
                      }
                      
                      // Başarılı silme işlemi sonrası çıkış yap
                      await supabase.auth.signOut();
                      
                      // Giriş ekranına yönlendir
                      navigation.reset({
                        index: 0,
                        routes: [{ name: 'Login' }],
                      });
                      
                    } catch (error) {
                      console.error('Hesap silme hatası:', error);
                      Alert.alert('Hata', 'Hesabınız silinirken bir hata oluştu. Lütfen daha sonra tekrar deneyin.');
                      setLoading(false);
                    }
                  },
                  style: "destructive"
                }
              ]
            );
          },
          style: "destructive"
        }
      ]
    );
  };

  // Yükleniyor durumu
  if (loading && !userData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Yükleniyor...</Text>
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
          <Text style={styles.headerTitle}>Hesap Bilgileri</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>
      
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Hesap Bilgileri Bölümü */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Hesap Bilgileri</Text>
          
          <View style={styles.card}>
            {/* E-posta */}
            <View style={styles.infoRow}>
              <View style={styles.infoIconContainer}>
                <MaterialIcons name="email" size={20} color={colors.text.light} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>E-posta</Text>
                <Text style={styles.infoValue}>{userData?.email || user?.email}</Text>
              </View>
            </View>
            
            {/* Üyelik Tarihi */}
            <View style={styles.infoRow}>
              <View style={[styles.infoIconContainer, { backgroundColor: '#3498db' }]}>
                <MaterialIcons name="date-range" size={20} color={colors.text.light} />
              </View>
              <View style={styles.infoContent}>
                <Text style={styles.infoLabel}>Üyelik Tarihi</Text>
                <Text style={styles.infoValue}>
                  {new Date(userData?.created_at).toLocaleDateString('tr-TR', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </Text>
              </View>
            </View>
            
            {/* Şifre Değiştir */}
            <TouchableOpacity 
              style={styles.actionButton}
              onPress={handleChangePassword}
            >
              <MaterialIcons name="lock" size={20} color={colors.text.light} />
              <Text style={styles.actionButtonText}>Şifre Değiştir</Text>
              <MaterialIcons name="chevron-right" size={20} color={colors.text.light} />
            </TouchableOpacity>
          </View>
        </View>
        
        {/* Bildirim Ayarları */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Bildirim Ayarları</Text>
          
          <View style={styles.card}>
            {/* E-posta Bildirimleri */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="email" size={20} color={colors.text.primary} />
                <Text style={styles.settingText}>E-posta Bildirimleri</Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={settings.emailNotifications ? colors.secondary : '#f4f3f4'}
                ios_backgroundColor={colors.border}
                onValueChange={(value) => updateSetting('emailNotifications', value)}
                value={settings.emailNotifications}
              />
            </View>
            
            {/* Push Bildirimleri */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="notifications" size={20} color={colors.text.primary} />
                <Text style={styles.settingText}>Push Bildirimleri</Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={settings.pushNotifications ? colors.secondary : '#f4f3f4'}
                ios_backgroundColor={colors.border}
                onValueChange={(value) => updateSetting('pushNotifications', value)}
                value={settings.pushNotifications}
              />
            </View>
            
            {/* Pazarlama E-postaları */}
            <View style={styles.settingRow}>
              <View style={styles.settingInfo}>
                <MaterialIcons name="campaign" size={20} color={colors.text.primary} />
                <Text style={styles.settingText}>Pazarlama E-postaları</Text>
              </View>
              <Switch
                trackColor={{ false: colors.border, true: colors.primaryLight }}
                thumbColor={settings.marketingEmails ? colors.secondary : '#f4f3f4'}
                ios_backgroundColor={colors.border}
                onValueChange={(value) => updateSetting('marketingEmails', value)}
                value={settings.marketingEmails}
              />
            </View>
          </View>
        </View>
        
        {/* Hesap Silme */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Tehlikeli Bölge</Text>
          
          <TouchableOpacity 
            style={styles.deleteButton}
            onPress={handleDeleteAccount}
          >
            <MaterialIcons name="delete-forever" size={20} color="#fff" />
            <Text style={styles.deleteButtonText}>Hesabımı Sil</Text>
          </TouchableOpacity>
          
          <Text style={styles.warningText}>
            Bu işlem geri alınamaz. Hesabınız ve tüm verileriniz kalıcı olarak silinecektir.
          </Text>
        </View>
        
        {/* Alt Boşluk */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
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
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  content: {
    flex: 1,
    padding: spacing.lg,
  },
  section: {
    marginBottom: spacing.xl,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  card: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    ...shadows.md,
    borderWidth: 1,
    borderColor: colors.border,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  infoIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  infoContent: {
    flex: 1,
  },
  infoLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  infoValue: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  actionButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  actionButtonText: {
    flex: 1,
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    marginLeft: spacing.md,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  settingInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingText: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    marginLeft: spacing.md,
  },
  deleteButton: {
    flexDirection: 'row',
    backgroundColor: colors.error,
    borderRadius: radius.md,
    padding: spacing.md,
    alignItems: 'center',
    justifyContent: 'center',
    ...shadows.md,
  },
  deleteButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    marginLeft: spacing.sm,
  },
  warningText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    textAlign: 'center',
    marginTop: spacing.sm,
    fontStyle: 'italic',
  },
});

export default AccountSettingsScreen; 