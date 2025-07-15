import React, { useEffect, useState, useCallback } from 'react';
import { 
  Text, 
  View, 
  ScrollView, 
  TouchableOpacity, 
  Image, 
  Alert, 
  StatusBar, 
  ActivityIndicator,
  RefreshControl,
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons, FontAwesome5, MaterialIcons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../../lib/supabase';
import colors from '../styles/colors';
import { useFocusEffect } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';

const ProfileScreen = ({ navigation, route }) => {
  const { user, logout } = useAuth();
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [userData, setUserData] = useState(null);
  const [imageUploading, setImageUploading] = useState(false);
  
  const [stats, setStats] = useState({
    tokens: 0,
    fortuneCount: 0,
    favoriteCount: 0
  });

  // Kullanıcı verilerini Supabase'den al
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
        console.error('Profil bilgileri getirilemedi:', error);
        // Hata durumunda da temel bilgileri göster
        setUserData({
          id: authUser.id,
          email: authUser.email,
          first_name: authUser.user_metadata?.first_name || '',
          last_name: authUser.user_metadata?.last_name || '',
          full_name: authUser.user_metadata?.full_name || authUser.email.split('@')[0],
          profile_image: authUser.user_metadata?.avatar_url || null,
          token_balance: 0,
          is_admin: false
        });
        setLoading(false);
        return;
      }
      
      // Kullanıcının fal sayısını getir
      const { count: fortuneCount, error: fortuneError } = await supabase
        .from('fortunes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);
      
      // Kullanıcının favori sayısını getir
      const { count: favoriteCount, error: favoriteError } = await supabase
        .from('favorites')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', authUser.id);
      
      // Kullanıcı verileri ve istatistiklerini ayarla
      setUserData(profile);
      setStats({
        tokens: profile?.token_balance || 0,
        fortuneCount: fortuneCount || 0,
        favoriteCount: favoriteCount || 0
      });
      
    } catch (error) {
      console.error('Veri çekerken hata:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Profil fotoğrafı seçme fonksiyonu
  const selectProfileImage = async () => {
    try {
      // Kamera rulo izni iste
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'İzin Gerekli',
          'Profil fotoğrafı seçmek için galeri erişim iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      // Seçenekleri göster
      Alert.alert(
        'Profil Fotoğrafı',
        'Profil fotoğrafınızı nasıl güncellemek istersiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Galeriden Seç', onPress: () => openImagePicker() },
          { text: 'Kamera', onPress: () => openCamera() }
        ]
      );
    } catch (error) {
      console.error('Profil fotoğrafı seçme hatası:', error);
      Alert.alert('Hata', 'Profil fotoğrafı seçilirken bir hata oluştu.');
    }
  };

  // Galeriden fotoğraf seçme
  const openImagePicker = async () => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Galeri hatası:', error);
      Alert.alert('Hata', 'Galeriden fotoğraf seçilirken bir hata oluştu.');
    }
  };

  // Kameradan fotoğraf çekme
  const openCamera = async () => {
    try {
      const { status } = await ImagePicker.requestCameraPermissionsAsync();
      
      if (status !== 'granted') {
        Alert.alert(
          'İzin Gerekli',
          'Fotoğraf çekmek için kamera erişim iznine ihtiyacımız var.',
          [{ text: 'Tamam' }]
        );
        return;
      }

      const result = await ImagePicker.launchCameraAsync({
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        uploadProfileImage(result.assets[0].uri);
      }
    } catch (error) {
      console.error('Kamera hatası:', error);
      Alert.alert('Hata', 'Kameradan fotoğraf çekilirken bir hata oluştu.');
    }
  };

  // Profil fotoğrafını Supabase'e yükleme
  const uploadProfileImage = async (imageUri) => {
    try {
      setImageUploading(true);
      
      const { data: { user: authUser } } = await supabase.auth.getUser();
      if (!authUser) {
        Alert.alert('Hata', 'Kullanıcı oturumu bulunamadı.');
        return;
      }

      // Dosya uzantısını al
      const fileExt = imageUri.split('.').pop();
      const fileName = `${authUser.id}-${Date.now()}.${fileExt}`;
      const filePath = `${authUser.id}/${fileName}`;

      // Fotoğrafı blob'a dönüştür
      const response = await fetch(imageUri);
      const blob = await response.blob();

      // Önce eski fotoğrafı sil (varsa)
      if (userData?.profile_image) {
        try {
          const oldFileName = userData.profile_image.split('/').pop();
          const oldFilePath = `${authUser.id}/${oldFileName}`;
          await supabase.storage
            .from('profile-images')
            .remove([oldFilePath]);
        } catch (error) {
          console.log('Eski fotoğraf silinemedi:', error);
        }
      }

      // Supabase Storage'a yükle
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('profile-images')
        .upload(filePath, blob, {
          cacheControl: '3600',
          upsert: true
        });

      if (uploadError) {
        console.error('Yükleme hatası:', uploadError);
        Alert.alert('Hata', `Fotoğraf yüklenirken bir hata oluştu: ${uploadError.message}`);
        return;
      }

      // Yüklenen fotoğrafın public URL'sini al
      const { data: { publicUrl } } = supabase.storage
        .from('profile-images')
        .getPublicUrl(filePath);

      // Kullanıcı profilini güncelle
      const { error: updateError } = await supabase
        .from('users')
        .update({ profile_image: publicUrl })
        .eq('id', authUser.id);

      if (updateError) {
        console.error('Profil günceleme hatası:', updateError);
        Alert.alert('Hata', 'Profil güncellenirken bir hata oluştu.');
        return;
      }

      // Yerel state'i güncelle
      setUserData(prevData => ({
        ...prevData,
        profile_image: publicUrl
      }));

      Alert.alert('Başarılı', 'Profil fotoğrafınız başarıyla güncellendi.');
      
    } catch (error) {
      console.error('Profil fotoğrafı yükleme hatası:', error);
      Alert.alert('Hata', `Profil fotoğrafı yüklenirken bir hata oluştu: ${error.message}`);
    } finally {
      setImageUploading(false);
    }
  };

  // Edit ekranından gelen güncellemeleri kontrol et
  const checkForProfileUpdates = () => {
    // Route params'dan güncellenmiş veri kontrolü
    if (route.params?.updatedUserData && route.params?.profileUpdated) {
      // Kullanıcı verilerini güncelle
      setUserData(prevData => ({
        ...prevData,
        ...route.params.updatedUserData
      }));
      
      // Route params'ı temizle (çift güncelleme olmaması için)
      navigation.setParams({ profileUpdated: false, updatedUserData: null });
    }
  };

  // Sayfa yüklendiğinde verileri al
  useEffect(() => {
    fetchUserData();
  }, []);
  
  // Eğer userData yoksa ve AuthContext'ten user varsa, onu kullan
  useEffect(() => {
    if (!userData && user && user.profile) {
      setUserData(user.profile);
    }
  }, [userData, user]);

  // Sayfa odaklandığında güncellemeleri kontrol et
  useFocusEffect(
    useCallback(() => {
      checkForProfileUpdates();
    }, [route.params])
  );

  // Sayfayı yenile
  const onRefresh = () => {
    setRefreshing(true);
    fetchUserData();
  };

  // Çıkış yapma işlemi
  const handleLogout = async () => {
    Alert.alert(
      "Çıkış Yap",
      "Hesabınızdan çıkış yapmak istediğinize emin misiniz?",
      [
        {
          text: "İptal",
          style: "cancel"
        },
        { 
          text: "Çıkış Yap", 
          onPress: async () => {
            setLoading(true);
            const { error } = await logout();
            if (!error) {
              // Başarılı çıkış durumunda giriş ekranına yönlendir
              navigation.reset({
                index: 0,
                routes: [{ name: 'Login' }],
              });
            } else {
              setLoading(false);
              Alert.alert("Hata", "Çıkış yapılırken bir hata oluştu.");
            }
          },
          style: "destructive"
        }
      ]
    );
  };

  // Menu items
  const menuItems = [
    { 
      id: 1, 
      title: 'Hesap Bilgileri', 
      icon: 'person-circle', 
      iconType: 'ionicons',
      color: '#3498db',
      onPress: () => navigation.navigate('AccountSettings')
    },
    { 
      id: 2, 
      title: 'Fal Geçmişim', 
      icon: 'history', 
      iconType: 'fontawesome',
      color: '#9b59b6',
      onPress: () => navigation.navigate('FortuneHistory')
    },
    { 
      id: 3, 
      title: 'Jeton Satın Al', 
      icon: 'diamond', 
      iconType: 'ionicons',
      color: '#f39c12',
      onPress: () => navigation.navigate('BuyTokens')
    },
    { 
      id: 4, 
      title: 'Favorilerim', 
      icon: 'heart', 
      iconType: 'ionicons',
      color: '#e74c3c',
      onPress: () => navigation.navigate('Favorites')
    },
    { 
      id: 5, 
      title: 'Bildirimler', 
      icon: 'notifications', 
      iconType: 'ionicons',
      color: '#f39c12',
      onPress: () => navigation.navigate('Notifications')
    },
    { 
      id: 6, 
      title: 'Ayarlar', 
      icon: 'settings', 
      iconType: 'ionicons',
      color: '#1abc9c',
      onPress: () => navigation.navigate('Settings')
    },
    { 
      id: 7, 
      title: 'Yardım ve Destek', 
      icon: 'help-circle', 
      iconType: 'ionicons',
      color: '#3498db',
      onPress: () => navigation.navigate('Support')
    },
  ];

  // Admin menü öğesi (sadece admin kullanıcılar için)
  const adminMenuItem = {
    id: 999,
    title: 'Admin Paneli',
    icon: 'shield-checkmark',
    iconType: 'ionicons',
    color: '#e74c3c',
    onPress: () => navigation.navigate('AdminPanel')
  };

  // Final menu items (admin ise admin paneli eklenir)
  const finalMenuItems = userData?.is_admin ? [...menuItems, adminMenuItem] : menuItems;

  // İkon render fonksiyonu
  const renderIcon = (item) => {
    if (item.iconType === 'fontawesome') {
      return <FontAwesome5 name={item.icon} size={20} color="#fff" />;
    }
    if (item.iconType === 'material') {
      return <MaterialIcons name={item.icon} size={20} color="#fff" />;
    }
    return <Ionicons name={item.icon} size={20} color="#fff" />;
  };

  // Yükleniyor durumu
  if (loading && !userData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Profil yükleniyor...</Text>
      </View>
    );
  }

  // Burç simgesi getirme fonksiyonu
  const getZodiacIcon = (zodiac) => {
    switch(zodiac?.toLowerCase()) {
      case 'koç': return 'star-shooting';
      case 'boğa': return 'star-face';
      case 'ikizler': return 'star-three-points';
      case 'yengeç': return 'star-four-points';
      case 'aslan': return 'star-circle';
      case 'başak': return 'star-box';
      case 'terazi': return 'star-check';
      case 'akrep': return 'star-plus';
      case 'yay': return 'star-david';
      case 'oğlak': return 'star-outline';
      case 'kova': return 'star-half';
      case 'balık': return 'star-crescent';
      default: return 'zodiac';
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      <ScrollView 
        style={{ flex: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.text.light}
            colors={[colors.primary, colors.secondary]}
          />
        }
      >
        {/* Profil Üst Bölüm */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={{
            paddingTop: 60,
            paddingBottom: 30,
            borderBottomLeftRadius: 30,
            borderBottomRightRadius: 30,
          }}
        >
          <View style={{ alignItems: 'center' }}>
            {/* Profil Fotoğrafı */}
            <View style={{
              width: 110,
              height: 110,
              borderRadius: 55,
              backgroundColor: 'rgba(255,255,255,0.2)',
              padding: 5,
            }}>
              <TouchableOpacity onPress={selectProfileImage}>
                {userData?.profile_image ? (
                  <Image
                    source={{ uri: userData.profile_image }}
                    style={{
                      width: 100,
                      height: 100,
                      borderRadius: 50,
                      borderWidth: 2,
                      borderColor: colors.secondary,
                    }}
                  />
                ) : (
                  <View style={{
                    width: 100,
                    height: 100,
                    borderRadius: 50,
                    backgroundColor: colors.secondary,
                    justifyContent: 'center',
                    alignItems: 'center',
                    borderWidth: 2,
                    borderColor: colors.primary,
                  }}>
                    <Ionicons name="person" size={50} color={colors.text.light} />
                  </View>
                )}
              </TouchableOpacity>
              
              <TouchableOpacity
                style={{
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
                }}
                onPress={selectProfileImage}
                disabled={imageUploading}
              >
                {imageUploading ? (
                  <ActivityIndicator size="small" color={colors.text.light} />
                ) : (
                  <Ionicons name="camera" size={16} color={colors.text.light} />
                )}
              </TouchableOpacity>
            </View>

            {/* Kullanıcı Bilgileri */}
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.light, marginTop: 15 }}>
              {userData?.full_name || 'İsimsiz Kullanıcı'}
            </Text>
            <Text style={{ fontSize: 14, color: colors.text.secondary, marginTop: 5 }}>
              {userData?.email || 'E-posta yok'}
            </Text>

            {/* Üyelik Tarihi */}
            <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10 }}>
              <Ionicons name="calendar" size={14} color={colors.text.secondary} />
              <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 5 }}>
                Üyelik: {new Date(userData?.created_at).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
              </Text>
            </View>

            {/* Doğum Tarihi */}
            {userData?.birth_date && (
              <View style={{ flexDirection: 'row', alignItems: 'center', marginTop: 5 }}>
                <Ionicons name="gift" size={14} color={colors.text.secondary} />
                <Text style={{ fontSize: 12, color: colors.text.secondary, marginLeft: 5 }}>
                  Doğum: {new Date(userData?.birth_date).toLocaleDateString('tr-TR', { year: 'numeric', month: 'long', day: 'numeric' })}
                </Text>
              </View>
            )}

            {/* İstatistikler */}
            <View style={{ 
              flexDirection: 'row', 
              marginTop: 25, 
              width: '90%', 
              backgroundColor: 'rgba(0,0,0,0.2)',
              borderRadius: 15,
              padding: 15,
            }}>
              {/* Jeton */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <MaterialCommunityIcons name="diamond" size={22} color={colors.secondary} />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.light }}>{stats.tokens}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Jeton</Text>
              </View>

              {/* Ayraç */}
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />

              {/* Fal Sayısı */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <MaterialCommunityIcons name="coffee" size={22} color="#e74c3c" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.light }}>{stats.fortuneCount}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Fal</Text>
              </View>

              {/* Ayraç */}
              <View style={{ width: 1, backgroundColor: 'rgba(255,255,255,0.2)' }} />

              {/* Favoriler */}
              <View style={{ flex: 1, alignItems: 'center' }}>
                <View style={{
                  width: 40,
                  height: 40,
                  borderRadius: 20,
                  backgroundColor: 'rgba(255,255,255,0.1)',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginBottom: 8,
                }}>
                  <Ionicons name="heart" size={22} color="#e74c3c" />
                </View>
                <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.light }}>{stats.favoriteCount}</Text>
                <Text style={{ fontSize: 12, color: colors.text.secondary }}>Favori</Text>
              </View>
            </View>
          </View>
        </LinearGradient>

        {/* Hızlı Erişim */}
        <View style={{
          flexDirection: 'row',
          justifyContent: 'space-around',
          marginHorizontal: 20,
          marginTop: -25,
          backgroundColor: colors.card,
          borderRadius: 15,
          padding: 15,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 5 },
          shadowOpacity: 0.3,
          shadowRadius: 5,
          elevation: 8,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('BuyTokens')}>
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="diamond" size={24} color={colors.text.light} />
            </LinearGradient>
            <Text style={{ fontSize: 12, color: colors.text.primary }}>Jeton Al</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('NewFortune')}>
            <LinearGradient
              colors={[colors.secondary, colors.primary]}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="cafe" size={24} color={colors.text.light} />
            </LinearGradient>
            <Text style={{ fontSize: 12, color: colors.text.primary }}>Fal Baktır</Text>
          </TouchableOpacity>
          
          <TouchableOpacity style={{ alignItems: 'center' }} onPress={() => navigation.navigate('Promotions')}>
            <LinearGradient
              colors={['#e74c3c', '#c0392b']}
              style={{
                width: 50,
                height: 50,
                borderRadius: 25,
                justifyContent: 'center',
                alignItems: 'center',
                marginBottom: 8,
              }}
            >
              <Ionicons name="gift" size={24} color={colors.text.light} />
            </LinearGradient>
            <Text style={{ fontSize: 12, color: colors.text.primary }}>Promosyon</Text>
          </TouchableOpacity>
        </View>

        {/* Kişisel Bilgiler Kartı */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 15,
          margin: 20,
          marginTop: 25,
          padding: 15,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 5,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>Kişisel Bilgiler</Text>
            <TouchableOpacity onPress={() => navigation.navigate('EditProfile')}>
              <Text style={{ fontSize: 14, color: colors.secondary }}>Düzenle</Text>
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
            <View style={{ width: '48%' }}>
              {/* Sol Sütun */}
              {/* Burç */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#9b59b6',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name={userData?.zodiac_sign ? 'star' : 'star-outline'} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Burç</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.zodiac_sign || 'Belirtilmemiş'}</Text>
                </View>
              </View>

              {/* Cinsiyet */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#e74c3c',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name={userData?.gender === 'Erkek' ? 'male' : (userData?.gender === 'Kadın' ? 'female' : 'male-female')} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Cinsiyet</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.gender || 'Belirtilmemiş'}</Text>
                </View>
              </View>

              {/* Doğum Yeri */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#f39c12',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name="location" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Doğum Yeri</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>
                    {userData?.birth_place || 'Belirtilmemiş'}
                  </Text>
                </View>
              </View>
            </View>

            <View style={{ width: '48%' }}>
              {/* Sağ Sütun */}
              {/* Yükselen */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#3498db',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <Ionicons name={userData?.zodiac_sign ? 'star' : 'star-outline'} size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Yükselen</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.rising_sign || 'Belirtilmemiş'}</Text>
                </View>
              </View>

              {/* Medeni Durum */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#2ecc71',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <MaterialIcons name="favorite" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Medeni Durum</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }}>{userData?.marital_status || 'Belirtilmemiş'}</Text>
                </View>
              </View>
              
              {/* Favori Falcı */}
              <View style={{ flexDirection: 'row', marginBottom: 12 }}>
                <View style={{ 
                  width: 32, 
                  height: 32, 
                  borderRadius: 16, 
                  backgroundColor: '#8e44ad',
                  justifyContent: 'center',
                  alignItems: 'center',
                  marginRight: 8 
                }}>
                  <MaterialCommunityIcons name="crystal-ball" size={18} color="#fff" />
                </View>
                <View>
                  <Text style={{ fontSize: 11, color: colors.text.tertiary }}>Favori Falcı</Text>
                  <Text style={{ fontSize: 13, color: colors.text.primary }} numberOfLines={1} ellipsizeMode="tail">
                    {userData?.favorite_fortune_teller || 'Belirtilmemiş'}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        </View>

        {/* Menü */}
        <View style={{
          backgroundColor: colors.card,
          borderRadius: 15,
          margin: 20,
          marginTop: 10,
          padding: 10,
          shadowColor: colors.shadow,
          shadowOffset: { width: 0, height: 3 },
          shadowOpacity: 0.2,
          shadowRadius: 5,
          elevation: 5,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
                          {finalMenuItems.map((item, index) => (
            <TouchableOpacity 
              key={item.id} 
              style={{
                flexDirection: 'row',
                alignItems: 'center',
                padding: 15,
                borderBottomWidth: index < menuItems.length - 1 ? 1 : 0,
                borderBottomColor: colors.border,
              }}
              onPress={item.onPress}
            >
              <View style={{
                width: 36,
                height: 36,
                borderRadius: 18,
                backgroundColor: item.color,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 15,
              }}>
                {renderIcon(item)}
              </View>
              <Text style={{ flex: 1, fontSize: 16, color: colors.text.primary }}>{item.title}</Text>
              <Ionicons name="chevron-forward" size={20} color={colors.text.tertiary} />
            </TouchableOpacity>
          ))}
        </View>

        {/* Çıkış Yap Butonu */}
        <TouchableOpacity 
          style={{
            flexDirection: 'row',
            backgroundColor: colors.error,
            borderRadius: 15,
            padding: 15,
            margin: 20,
            marginTop: 10,
            alignItems: 'center',
            justifyContent: 'center',
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
          }} 
          onPress={handleLogout}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.light} />
          ) : (
            <>
              <Ionicons name="log-out" size={20} color={colors.text.light} />
              <Text style={{ 
                color: colors.text.light, 
                fontWeight: 'bold',
                fontSize: 16,
                marginLeft: 10,
              }}>
                Çıkış Yap
              </Text>
            </>
          )}
        </TouchableOpacity>

        {/* Alt Boşluk */}
        <View style={{ height: 80 }} />
      </ScrollView>
    </View>
  );
};

export default ProfileScreen; 