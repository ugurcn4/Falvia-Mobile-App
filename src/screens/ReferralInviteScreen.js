import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  TextInput,
  Alert,
  ActivityIndicator,
  Share,
  Clipboard,
  Platform,
  ScrollView,
  StatusBar,
  StyleSheet
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import referralService from '../services/referralService';

const ReferralInviteScreen = ({ navigation }) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);

  // Kullanıcının referral bilgilerini al
  useEffect(() => {
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user?.id) return;

    setInitialLoading(true);
    const result = await referralService.getUserReferralData(user.id);
    if (result.success) {
      setReferralCode(result.data.referralCode);
      setReferralCount(result.data.referralCount);
      setHasUsedReferral(result.data.hasUsedReferral);
    }
    setInitialLoading(false);
  };

  // Referral kodunu paylaş
  const shareReferralCode = async () => {
    if (!referralCode) return;

    const shareMessage = referralService.generateShareMessage(referralCode);

    try {
      if (Platform.OS === 'web') {
        // Web için clipboard
        await Clipboard.setString(shareMessage);
        Alert.alert('Başarılı', 'Davet mesajı panoya kopyalandı!');
      } else {
        // Mobil için share
        await Share.share({
          message: shareMessage,
          title: 'Falvia\'ya Davet Et'
        });
      }
    } catch (error) {
      console.error('Paylaşım hatası:', error);
      // Fallback olarak clipboard kullan
      try {
        await Clipboard.setString(shareMessage);
        Alert.alert('Paylaşım', 'Davet mesajı panoya kopyalandı!');
      } catch (clipboardError) {
        Alert.alert('Hata', 'Paylaşım sırasında bir hata oluştu.');
      }
    }
  };

  // Referral kodunu kopyala
  const copyReferralCode = async () => {
    if (!referralCode) return;

    try {
      await Clipboard.setString(referralCode);
      Alert.alert('Başarılı', 'Referral kodunuz panoya kopyalandı!');
    } catch (error) {
      Alert.alert('Hata', 'Kod kopyalanırken bir hata oluştu.');
    }
  };

  // Referral kodu gir
  const submitReferralCode = async () => {
    if (!inputCode.trim()) {
      Alert.alert('Uyarı', 'Lütfen bir referral kodu girin.');
      return;
    }

    if (inputCode.trim().toUpperCase() === referralCode.toUpperCase()) {
      Alert.alert('Uyarı', 'Kendi referral kodunuzu kullanamazsınız.');
      return;
    }

    setLoading(true);

    const result = await referralService.processReferral(user.id, inputCode);

    if (result.success) {
      Alert.alert(
        'Tebrikler! 🎉',
        result.message,
        [
          {
            text: 'Tamam',
            onPress: () => {
              setInputCode('');
              fetchReferralData(); // Verileri yenile
            }
          }
        ]
      );
    } else {
      Alert.alert('Uyarı', result.message || 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }

    setLoading(false);
  };

  if (initialLoading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: colors.background }}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={{ color: colors.text.secondary, marginTop: 10 }}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={{
          paddingTop: 50,
          paddingBottom: 20,
          paddingHorizontal: 20,
        }}
      >
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 20 }}>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{
              width: 40,
              height: 40,
              borderRadius: 20,
              backgroundColor: 'rgba(255,255,255,0.2)',
              justifyContent: 'center',
              alignItems: 'center',
              marginRight: 15,
            }}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.light} />
          </TouchableOpacity>
          <View style={{ flex: 1, flexDirection: 'row', alignItems: 'center' }}>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.text.light }}>
              Arkadaş Davet Et
            </Text>
            <View style={styles.jetonBadge}>
              <MaterialCommunityIcons name="diamond" size={12} color="#fff" />
              <Text style={styles.jetonBadgeText}>Jeton Kazan</Text>
            </View>
          </View>
        </View>

        {/* Header İstatistik */}
        <View style={{
          flexDirection: 'row',
          backgroundColor: 'rgba(255,255,255,0.1)',
          borderRadius: 15,
          padding: 15,
          alignItems: 'center',
        }}>
          <MaterialCommunityIcons name="account-group" size={30} color={colors.secondary} />
          <View style={{ marginLeft: 15 }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.light }}>
              Davet Ettiğin Arkadaş
            </Text>
            <Text style={{ fontSize: 24, fontWeight: 'bold', color: colors.secondary }}>
              {referralCount} Kişi
            </Text>
          </View>
        </View>
      </LinearGradient>

      <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
        {/* Ana İçerik */}
        <View style={{ padding: 20 }}>
          
          {/* Nasıl Çalışır Kartı */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 15,
            padding: 20,
            marginBottom: 20,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 15 }}>
              🎁 Nasıl Çalışır?
            </Text>
            
            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.primary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: colors.text.light, fontWeight: 'bold', fontSize: 14 }}>1</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                  Kodunu arkadaşlarınla paylaş
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row', marginBottom: 12 }}>
              <View style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.secondary,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: colors.text.dark, fontWeight: 'bold', fontSize: 14 }}>2</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                  Arkadaşın uygulamaya kayıt olup kodunu girsin
                </Text>
              </View>
            </View>

            <View style={{ flexDirection: 'row' }}>
              <View style={{
                width: 30,
                height: 30,
                borderRadius: 15,
                backgroundColor: colors.success,
                justifyContent: 'center',
                alignItems: 'center',
                marginRight: 12,
              }}>
                <Text style={{ color: colors.text.light, fontWeight: 'bold', fontSize: 14 }}>3</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={{ fontSize: 14, color: colors.text.primary, lineHeight: 20 }}>
                  İkiniz de <Text style={{ fontWeight: 'bold', color: colors.secondary }}>5 jeton</Text> kazanın! 🎉
                </Text>
              </View>
            </View>
          </View>

          {/* Senin Kodun Bölümü */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 15,
            padding: 20,
            marginBottom: 20,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 15 }}>
              🎯 Senin Kodun
            </Text>
            
            <View style={{
              flexDirection: 'row',
              backgroundColor: colors.background,
              borderRadius: 10,
              padding: 15,
              borderWidth: 1,
              borderColor: colors.border,
              marginBottom: 15,
            }}>
              <Text style={{
                flex: 1,
                fontSize: 20,
                fontWeight: 'bold',
                color: colors.secondary,
                textAlign: 'center',
                letterSpacing: 3,
              }}>
                {referralCode || 'Yükleniyor...'}
              </Text>
              <TouchableOpacity
                onPress={copyReferralCode}
                style={{
                  backgroundColor: colors.primary,
                  borderRadius: 8,
                  paddingHorizontal: 15,
                  paddingVertical: 8,
                  marginLeft: 15,
                }}
              >
                <Ionicons name="copy" size={18} color={colors.text.light} />
              </TouchableOpacity>
            </View>

            {/* Paylaş Butonu */}
            <TouchableOpacity
              onPress={shareReferralCode}
              style={{
                flexDirection: 'row',
                backgroundColor: colors.success,
                borderRadius: 12,
                padding: 15,
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <Ionicons name="share-social" size={22} color={colors.text.light} />
              <Text style={{
                fontSize: 16,
                fontWeight: 'bold',
                color: colors.text.light,
                marginLeft: 10,
              }}>
                Arkadaşlarına Paylaş
              </Text>
            </TouchableOpacity>
          </View>

          {/* Kod Gir Bölümü */}
          {!hasUsedReferral && (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 15,
              padding: 20,
              marginBottom: 20,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 5,
              borderWidth: 1,
              borderColor: colors.border,
            }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 15 }}>
                🎁 Arkadaşının Kodunu Gir
              </Text>
              
              <View style={{
                flexDirection: 'row',
                backgroundColor: colors.background,
                borderRadius: 10,
                padding: 6,
                borderWidth: 1,
                borderColor: colors.border,
                marginBottom: 15,
              }}>
                <TextInput
                  style={{
                    flex: 1,
                    fontSize: 18,
                    color: colors.text.primary,
                    paddingHorizontal: 15,
                    paddingVertical: 10,
                    textAlign: 'center',
                    letterSpacing: 2,
                  }}
                  placeholder="Örn: ABC123"
                  placeholderTextColor={colors.text.tertiary}
                  value={inputCode}
                  onChangeText={setInputCode}
                  maxLength={10}
                  autoCapitalize="characters"
                  editable={!loading}
                />
                <TouchableOpacity
                  onPress={submitReferralCode}
                  disabled={loading || !inputCode.trim()}
                  style={{
                    backgroundColor: loading || !inputCode.trim() ? colors.text.tertiary : colors.primary,
                    borderRadius: 8,
                    paddingHorizontal: 20,
                    paddingVertical: 10,
                    marginLeft: 6,
                  }}
                >
                  {loading ? (
                    <ActivityIndicator size="small" color={colors.text.light} />
                  ) : (
                    <Text style={{
                      fontSize: 16,
                      fontWeight: 'bold',
                      color: colors.text.light,
                    }}>
                      Gönder
                    </Text>
                  )}
                </TouchableOpacity>
              </View>

              <Text style={{
                fontSize: 12,
                color: colors.text.tertiary,
                textAlign: 'center',
                lineHeight: 18,
              }}>
                Arkadaşının kodunu girdiğinde her ikiniz de 5 jeton kazanacaksınız! 🎉
              </Text>
            </View>
          )}

          {/* Zaten kullanılmış durumu */}
          {hasUsedReferral && (
            <View style={{
              backgroundColor: colors.card,
              borderRadius: 15,
              padding: 20,
              marginBottom: 20,
              shadowColor: colors.shadow,
              shadowOffset: { width: 0, height: 3 },
              shadowOpacity: 0.2,
              shadowRadius: 5,
              elevation: 5,
              borderWidth: 1,
              borderColor: colors.success,
            }}>
              <View style={{ alignItems: 'center' }}>
                <Ionicons name="checkmark-circle" size={40} color={colors.success} />
                <Text style={{
                  fontSize: 18,
                  color: colors.success,
                  fontWeight: 'bold',
                  textAlign: 'center',
                  marginTop: 10,
                }}>
                  Bir referral kodu kullanmışsın! ✅
                </Text>
                <Text style={{
                  fontSize: 14,
                  color: colors.text.tertiary,
                  textAlign: 'center',
                  marginTop: 5,
                  lineHeight: 20,
                }}>
                  Her hesap sadece bir kez referral kodu kullanabilir. Şimdi sen de arkadaşlarını davet edebilirsin!
                </Text>
              </View>
            </View>
          )}

          {/* SSS */}
          <View style={{
            backgroundColor: colors.card,
            borderRadius: 15,
            padding: 20,
            shadowColor: colors.shadow,
            shadowOffset: { width: 0, height: 3 },
            shadowOpacity: 0.2,
            shadowRadius: 5,
            elevation: 5,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginBottom: 15 }}>
              ❓ Sık Sorulan Sorular
            </Text>
            
            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text.primary, marginBottom: 5 }}>
                Kaç kez referral kodu kullanabilirim?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                Her hesap sadece bir kez referral kodu kullanabilir.
              </Text>
            </View>

            <View style={{ marginBottom: 12 }}>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text.primary, marginBottom: 5 }}>
                Jetonlar ne zaman hesabıma yatırılır?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                Referral kodu başarıyla kullanıldığında anında hesabınıza 5 jeton yatırılır.
              </Text>
            </View>

            <View>
              <Text style={{ fontSize: 14, fontWeight: 'bold', color: colors.text.primary, marginBottom: 5 }}>
                Kaç arkadaş davet edebilirim?
              </Text>
              <Text style={{ fontSize: 13, color: colors.text.secondary, lineHeight: 18 }}>
                Sınır yok! Dilediğiniz kadar arkadaşınızı davet edebilir ve her biri için 5 jeton kazanabilirsiniz.
              </Text>
            </View>
          </View>

          {/* Alt Boşluk */}
          <View style={{ height: 40 }} />
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  jetonBadge: {
    backgroundColor: '#e74c3c',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 4,
    marginLeft: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3,
    elevation: 5,
  },
  jetonBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
    marginLeft: 4,
  },
});

export default ReferralInviteScreen; 