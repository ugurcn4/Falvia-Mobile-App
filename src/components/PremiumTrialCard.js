import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator, Platform, ToastAndroid } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { useAuth } from '../context/AuthContext';
import { TrialService } from '../services/trialService';

const PremiumTrialCard = ({ 
  onStartTrial, 
  onLearnMore, 
  isVisible = true,
  onTrialStarted, // Deneme başladığında çağrılacak callback
  onTrialExpired, // Deneme bittiğinde çağrılacak callback
  autoRefresh = true // Otomatik durum yenileme
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [trialStatus, setTrialStatus] = useState({
    canStartTrial: false,
    isTrialActive: false,
    trialRemainingDays: 0,
    trialEndDate: null,
    loading: true
  });
  const [countdown, setCountdown] = useState({
    days: 0,
    hours: 0,
    minutes: 0,
    expired: false
  });

  // Deneme durumunu kontrol et
  const checkTrialStatus = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const status = await TrialService.checkTrialStatus(user.id);
      setTrialStatus({
        ...status,
        loading: false
      });
      
      // Eğer aktif deneme varsa countdown başlat
      if (status.isTrialActive && status.trialEndDate) {
        updateCountdown(status.trialEndDate);
      }
    } catch (error) {
      console.error('Deneme durumu kontrol hatası:', error);
      setTrialStatus(prev => ({ ...prev, loading: false }));
    }
  }, [user?.id]);

  // Countdown güncelleme
  const updateCountdown = useCallback((endDate) => {
    const remaining = TrialService.calculateRemainingTime(endDate);
    setCountdown(remaining);
    
    // Eğer süre dolmuşsa callback çağır
    if (remaining.expired && onTrialExpired) {
      onTrialExpired();
    }
  }, [onTrialExpired]);

  // Deneme başlatma
  const handleStartTrial = async () => {
    if (!user?.id) {
      Alert.alert('Hata', 'Lütfen giriş yapın.');
      return;
    }

    if (loading) return;

    Alert.alert(
      'Premium Deneme',
      '3 günlük ücretsiz premium deneme başlatmak istediğinizden emin misiniz?\n\n• Tüm premium özellikler aktif olacak\n• 3 gün sonra otomatik olarak sona erecek\n• İstediğiniz zaman iptal edebilirsiniz',
      [
        {
          text: 'İptal',
          style: 'cancel'
        },
        {
          text: 'Başlat',
          onPress: confirmStartTrial
        }
      ]
    );
  };

  const confirmStartTrial = async () => {
    setLoading(true);
    
    try {
      const result = await TrialService.startFreeTrial(user.id);
      
      if (result.success) {
        // Başarılı mesaj
        if (Platform.OS === 'android') {
          ToastAndroid.show('3 günlük deneme başlatıldı! 🎉', ToastAndroid.LONG);
        }
        
        Alert.alert(
          'Başarılı! 🎉',
          `Premium denemeniz başladı!\n\nBitiş tarihi: ${new Date(result.trialEndDate).toLocaleDateString('tr-TR')}\n\nTüm premium özelliklere erişebilirsiniz!`,
          [{ text: 'Harika!' }]
        );

        // Durumu güncelle
        await checkTrialStatus();
        
        // Callback çağır
        if (onTrialStarted) {
          onTrialStarted(result);
        }
        
        // Eğer parent callback varsa çağır
        if (onStartTrial) {
          onStartTrial(result);
        }
      } else {
        // Hata durumu
        let errorMessage = 'Deneme başlatılamadı.';
        
        switch (result.code) {
          case 'TRIAL_ALREADY_ACTIVE':
            errorMessage = 'Zaten aktif bir deneme süreciniz var.';
            break;
          case 'TRIAL_ALREADY_USED':
            errorMessage = 'Bu hesap daha önce deneme süresini kullanmış.';
            break;
          default:
            errorMessage = result.error || 'Beklenmeyen bir hata oluştu.';
        }
        
        Alert.alert('Uyarı', errorMessage);
      }
    } catch (error) {
      console.error('Deneme başlatma hatası:', error);
      Alert.alert(
        'Hata',
        'Deneme başlatılırken bir sorun oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam' }]
      );
    } finally {
      setLoading(false);
    }
  };

  // Component mount olduğunda durum kontrol et
  useEffect(() => {
    checkTrialStatus();
  }, [checkTrialStatus]);

  // Otomatik yenileme (her 30 saniyede bir)
  useEffect(() => {
    if (!autoRefresh || !trialStatus.isTrialActive) return;

    const interval = setInterval(() => {
      if (trialStatus.trialEndDate) {
        updateCountdown(trialStatus.trialEndDate);
      }
    }, 30000); // 30 saniyede bir güncelle

    return () => clearInterval(interval);
  }, [autoRefresh, trialStatus.isTrialActive, trialStatus.trialEndDate, updateCountdown]);

  // Countdown timer (her dakika güncelle)
  useEffect(() => {
    if (!trialStatus.isTrialActive || !trialStatus.trialEndDate) return;

    const interval = setInterval(() => {
      updateCountdown(trialStatus.trialEndDate);
    }, 60000); // Her dakika güncelle

    return () => clearInterval(interval);
  }, [trialStatus.isTrialActive, trialStatus.trialEndDate, updateCountdown]);

  // Deneme değişikliklerini dinle (real-time)
  useEffect(() => {
    if (!user?.id) return;

    const unsubscribe = TrialService.subscribeToTrialChanges(user.id, (payload) => {
      // Durum değişikliğinde yeniden kontrol et
      setTimeout(checkTrialStatus, 1000);
    });

    return unsubscribe;
  }, [user?.id, checkTrialStatus]);

  // Görünürlük kontrolü
  if (!isVisible) return null;

  // Yükleniyor durumu
  if (trialStatus.loading) {
    return (
      <View style={styles.loadingCard}>
        <ActivityIndicator size="small" color={colors.secondary} />
        <Text style={styles.loadingText}>Kontrol ediliyor...</Text>
      </View>
    );
  }

  // Eğer aktif deneme varsa countdown kartı göster
  if (trialStatus.isTrialActive) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.success, colors.successLight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.activeCard}
        >
          <View style={styles.activeHeader}>
            <View style={styles.activeBadge}>
              <MaterialCommunityIcons name="diamond" size={16} color={colors.text.light} />
              <Text style={styles.activeBadgeText}>DENEME AKTİF</Text>
            </View>
            <Text style={styles.activeTitle}>Premium Denemeniz Aktif! 🎉</Text>
          </View>

          <View style={styles.countdownContainer}>
            <View style={styles.countdownDisplay}>
              {countdown.days > 0 && (
                <View style={styles.countdownItem}>
                  <Text style={styles.countdownNumber}>{countdown.days}</Text>
                  <Text style={styles.countdownLabel}>Gün</Text>
                </View>
              )}
              <View style={styles.countdownItem}>
                <Text style={styles.countdownNumber}>{countdown.hours}</Text>
                <Text style={styles.countdownLabel}>Saat</Text>
              </View>
              <View style={styles.countdownItem}>
                <Text style={styles.countdownNumber}>{countdown.minutes}</Text>
                <Text style={styles.countdownLabel}>Dk</Text>
              </View>
            </View>
          </View>

          <TouchableOpacity 
            style={styles.upgradeButton}
            onPress={() => {
              Alert.alert(
                'Premium Abonelik',
                'Deneme süreniz bitmeden önce premium abonelik satın alarak kesintisiz premium deneyime devam edebilirsiniz!',
                [
                  { text: 'Şimdi Değil', style: 'cancel' },
                  { text: 'Abonelik Al', onPress: onLearnMore }
                ]
              );
            }}
          >
            <Text style={styles.upgradeButtonText}>Premium'a Geç</Text>
            <Ionicons name="arrow-forward" size={14} color={colors.text.light} />
          </TouchableOpacity>
        </LinearGradient>
      </View>
    );
  }

  // Eğer deneme kullanılmışsa gizle
  if (!trialStatus.canStartTrial) {
    return null;
  }

  // Varsayılan deneme kartı (henüz kullanılmamış)
  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.secondary, '#FFA500']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.card}
      >
        <View style={styles.header}>
          <View style={styles.badge}>
            <MaterialCommunityIcons name="crown" size={14} color={colors.primary} />
            <Text style={styles.badgeText}>PREMIUM</Text>
          </View>
          <Text style={styles.title}>3 Gün Ücretsiz Deneme</Text>
          <Text style={styles.subtitle}>Premium özellikleri keşfet!</Text>
        </View>

        <View style={styles.features}>
          {/* Sol Sütun */}
          <View style={styles.featuresColumn}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.featureText}>6 Fal Hakkı</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.featureText}>%20 Jeton İndirimi</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.featureText}>Öncelikli Destek</Text>
            </View>
          </View>

          {/* Orta Ayraç */}
          <View style={styles.featureDivider} />

          {/* Sağ Sütun */}
          <View style={styles.featuresColumn}>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.featureText}>Fal Önceliği</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.featureText}>Özel Rozetler</Text>
            </View>
            <View style={styles.featureRow}>
              <Ionicons name="checkmark-circle" size={14} color={colors.primary} />
              <Text style={styles.featureText}>Reklamsız</Text>
            </View>
          </View>
        </View>

        <TouchableOpacity 
          style={[styles.startButton, loading && styles.disabledButton]}
          onPress={handleStartTrial}
          disabled={loading}
        >
          {loading ? (
            <ActivityIndicator size="small" color={colors.text.light} />
          ) : (
            <>
              <Text style={styles.startButtonText}>Denemeyi Başlat</Text>
              <Ionicons name="arrow-forward" size={16} color={colors.text.light} />
            </>
          )}
        </TouchableOpacity>

        <TouchableOpacity onPress={onLearnMore}>
          <Text style={styles.learnMoreText}>Detayları Gör</Text>
        </TouchableOpacity>

        <Text style={styles.disclaimer}>
          Otomatik ücretlendirme yok • İstediğin zaman iptal et
        </Text>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 12,
  },
  loadingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: colors.border,
  },
  loadingText: {
    color: colors.text.secondary,
    marginLeft: 8,
    fontSize: 14,
  },
  // Varsayılan kart stilleri
  card: {
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  header: {
    alignItems: 'center',
    marginBottom: 16,
  },
  badge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  badgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.primary,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.primary,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: colors.primary,
    textAlign: 'center',
    opacity: 0.9,
  },
     features: {
     flexDirection: 'row',
     alignItems: 'stretch',
     marginBottom: 20,
     minHeight: 80,
   },
   featuresColumn: {
     flex: 1,
     justifyContent: 'space-between',
   },
   featureDivider: {
     width: 1,
     backgroundColor: colors.primary,
     opacity: 0.3,
     marginHorizontal: 16,
     alignSelf: 'stretch',
   },
   featureRow: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 6,
   },
   featureText: {
     fontSize: 12,
     color: colors.primary,
     fontWeight: '500',
     marginLeft: 6,
     flex: 1,
   },
  startButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  disabledButton: {
    opacity: 0.7,
  },
  startButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginRight: 8,
  },
  learnMoreText: {
    fontSize: 14,
    color: colors.primary,
    fontWeight: '600',
    textAlign: 'center',
    textDecorationLine: 'underline',
    marginBottom: 12,
  },
  disclaimer: {
    fontSize: 11,
    color: colors.primary,
    textAlign: 'center',
    opacity: 0.8,
    lineHeight: 14,
  },
  // Aktif deneme kartı stilleri
  activeCard: {
    borderRadius: 16,
    padding: 20,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
    borderWidth: 2,
    borderColor: colors.success,
  },
  activeHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 12,
  },
  activeBadgeText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 4,
    letterSpacing: 0.5,
  },
  activeTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
  },
  countdownContainer: {
    alignItems: 'center',
    marginBottom: 16,
  },
  countdownDisplay: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 12,
  },
  countdownItem: {
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    minWidth: 50,
  },
  countdownNumber: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 2,
  },
  countdownLabel: {
    fontSize: 10,
    color: colors.text.light,
    opacity: 0.8,
  },
  upgradeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 12,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  upgradeButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.light,
    marginRight: 6,
  },
});

export default PremiumTrialCard; 