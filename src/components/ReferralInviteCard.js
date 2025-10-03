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
  Platform
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import referralService from '../services/referralService';

const ReferralInviteCard = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [referralCode, setReferralCode] = useState('');
  const [inputCode, setInputCode] = useState('');
  const [referralCount, setReferralCount] = useState(0);
  const [hasUsedReferral, setHasUsedReferral] = useState(false);

  // Kullanıcının referral bilgilerini al
  useEffect(() => {
    fetchReferralData();
  }, [user]);

  const fetchReferralData = async () => {
    if (!user?.id) return;

    const result = await referralService.getUserReferralData(user.id);
    if (result.success) {
      setReferralCode(result.data.referralCode);
      setReferralCount(result.data.referralCount);
      setHasUsedReferral(result.data.hasUsedReferral);
    }
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

  return (
    <View style={{
      backgroundColor: colors.card,
      borderRadius: 15,
      margin: 20,
      padding: 20,
      shadowColor: colors.shadow,
      shadowOffset: { width: 0, height: 3 },
      shadowOpacity: 0.2,
      shadowRadius: 5,
      elevation: 5,
      borderWidth: 1,
      borderColor: colors.border,
    }}>
      {/* Başlık */}
      <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 15 }}>
        <LinearGradient
          colors={[colors.secondary, colors.primary]}
          style={{
            width: 40,
            height: 40,
            borderRadius: 20,
            justifyContent: 'center',
            alignItems: 'center',
            marginRight: 12,
          }}
        >
          <MaterialCommunityIcons name="account-plus" size={20} color={colors.text.light} />
        </LinearGradient>
        <View style={{ flex: 1 }}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary }}>
            Arkadaş Davet Et
          </Text>
          <Text style={{ fontSize: 12, color: colors.text.tertiary }}>
            5 Jeton Kazan
          </Text>
        </View>
      </View>

      {/* Istatistik */}
      <View style={{
        flexDirection: 'row',
        backgroundColor: 'rgba(255, 215, 0, 0.1)',
        borderRadius: 10,
        padding: 12,
        marginBottom: 15,
        borderWidth: 1,
        borderColor: 'rgba(255, 215, 0, 0.3)',
      }}>
        <MaterialCommunityIcons name="diamond" size={20} color={colors.secondary} />
        <Text style={{ fontSize: 14, color: colors.text.primary, marginLeft: 8 }}>
          Davet ettiğin arkadaş sayısı: <Text style={{ fontWeight: 'bold', color: colors.secondary }}>{referralCount}</Text>
        </Text>
      </View>

      {/* Senin Kodun Bölümü */}
      <View style={{ marginBottom: 20 }}>
        <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 10 }}>
          🎯 Senin Kodun
        </Text>
        
        <View style={{
          flexDirection: 'row',
          backgroundColor: colors.background,
          borderRadius: 10,
          padding: 12,
          borderWidth: 1,
          borderColor: colors.border,
        }}>
          <Text style={{
            flex: 1,
            fontSize: 16,
            fontWeight: 'bold',
            color: colors.secondary,
            textAlign: 'center',
            letterSpacing: 2,
          }}>
            {referralCode || 'Yükleniyor...'}
          </Text>
          <TouchableOpacity
            onPress={copyReferralCode}
            style={{
              backgroundColor: colors.primary,
              borderRadius: 8,
              paddingHorizontal: 12,
              paddingVertical: 6,
              marginLeft: 10,
            }}
          >
            <Ionicons name="copy" size={16} color={colors.text.light} />
          </TouchableOpacity>
        </View>

        {/* Paylaş Butonu */}
        <TouchableOpacity
          onPress={shareReferralCode}
          style={{
            flexDirection: 'row',
            backgroundColor: colors.success,
            borderRadius: 10,
            padding: 12,
            alignItems: 'center',
            justifyContent: 'center',
            marginTop: 10,
          }}
        >
          <Ionicons name="share-social" size={20} color={colors.text.light} />
          <Text style={{
            fontSize: 14,
            fontWeight: 'bold',
            color: colors.text.light,
            marginLeft: 8,
          }}>
            Arkadaşlarına Paylaş
          </Text>
        </TouchableOpacity>
      </View>

      {/* Kod Gir Bölümü */}
      {!hasUsedReferral && (
        <View>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: colors.text.primary, marginBottom: 10 }}>
            🎁 Arkadaşının Kodunu Gir
          </Text>
          
          <View style={{
            flexDirection: 'row',
            backgroundColor: colors.background,
            borderRadius: 10,
            padding: 4,
            borderWidth: 1,
            borderColor: colors.border,
          }}>
            <TextInput
              style={{
                flex: 1,
                fontSize: 16,
                color: colors.text.primary,
                paddingHorizontal: 12,
                paddingVertical: 8,
                textAlign: 'center',
                letterSpacing: 1,
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
                paddingHorizontal: 16,
                paddingVertical: 8,
                marginLeft: 4,
              }}
            >
              {loading ? (
                <ActivityIndicator size="small" color={colors.text.light} />
              ) : (
                <Text style={{
                  fontSize: 14,
                  fontWeight: 'bold',
                  color: colors.text.light,
                }}>
                  Gönder
                </Text>
              )}
            </TouchableOpacity>
          </View>

          <Text style={{
            fontSize: 11,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: 8,
            lineHeight: 16,
          }}>
            Arkadaşının kodunu girdiğinde her ikiniz de 5 jeton kazanacaksınız! 🎉
          </Text>
        </View>
      )}

      {/* Zaten kullanılmış durumu */}
      {hasUsedReferral && (
        <View style={{
          backgroundColor: 'rgba(76, 175, 80, 0.1)',
          borderRadius: 10,
          padding: 12,
          alignItems: 'center',
          borderWidth: 1,
          borderColor: 'rgba(76, 175, 80, 0.3)',
        }}>
          <Ionicons name="checkmark-circle" size={24} color={colors.success} />
          <Text style={{
            fontSize: 14,
            color: colors.success,
            fontWeight: 'bold',
            textAlign: 'center',
            marginTop: 5,
          }}>
            Bir referral kodu kullanmışsın! ✅
          </Text>
          <Text style={{
            fontSize: 12,
            color: colors.text.tertiary,
            textAlign: 'center',
            marginTop: 3,
          }}>
            Her hesap sadece bir kez referral kodu kullanabilir
          </Text>
        </View>
      )}
    </View>
  );
};

export default ReferralInviteCard; 