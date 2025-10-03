import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  Animated,
  Image,
  Alert,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import dailyLoginService from '../services/dailyLoginService';

const { width, height } = Dimensions.get('window');

const DailyLoginRewardModal = ({ visible, onClose, userId, onRewardClaimed }) => {
  const [loading, setLoading] = useState(false);
  const [rewardData, setRewardData] = useState(null);
  const [currentStatus, setCurrentStatus] = useState(null);
  const [scaleAnim] = useState(new Animated.Value(0));
  const [opacityAnim] = useState(new Animated.Value(0));

  useEffect(() => {
    if (visible) {
      checkDailyLogin();
      animateIn();
    } else {
      animateOut();
    }
  }, [visible]);

  const animateIn = () => {
    scaleAnim.setValue(0);
    opacityAnim.setValue(0);
    
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 1,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const animateOut = () => {
    Animated.parallel([
      Animated.spring(scaleAnim, {
        toValue: 0,
        useNativeDriver: true,
        tension: 100,
        friction: 8,
      }),
      Animated.timing(opacityAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start();
  };

  const checkDailyLogin = async () => {
    if (!userId) return;

    setLoading(true);
    try {
      // Mevcut durumu al
      const statusResult = await dailyLoginService.getCurrentStatus(userId);
      if (statusResult.success) {
        setCurrentStatus(statusResult.data);
      }

      // Günlük giriş ödülünü kontrol et
      const result = await dailyLoginService.checkAndRewardDailyLogin(userId);
      
      if (result.success) {
        setRewardData(result.data);
        // Ödül alındığında callback'i çağır
        if (onRewardClaimed) {
          onRewardClaimed(result.data);
        }
        // 3 saniye sonra otomatik kapat
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        // Bugün zaten ödül alınmışsa
        setRewardData(result.data);
      }
    } catch (error) {
      console.error('Günlük giriş kontrolü hatası:', error);
      // Hata durumunda kullanıcıya bilgi ver
      Alert.alert(
        'Hata',
        'Günlük giriş ödülü kontrol edilirken bir hata oluştu. Lütfen tekrar deneyin.',
        [{ text: 'Tamam', onPress: onClose }]
      );
    } finally {
      setLoading(false);
    }
  };

  const getRewardIcon = (consecutiveDays) => {
    if (consecutiveDays >= 7) return '🎉';
    if (consecutiveDays >= 3) return '⭐';
    return '🌟';
  };

  const getRewardColor = (consecutiveDays) => {
    if (consecutiveDays >= 7) return [colors.secondary, colors.primary];
    if (consecutiveDays >= 3) return [colors.warning, colors.secondary];
    return [colors.primaryLight, colors.primary];
  };

  const getProgressPercentage = () => {
    if (!currentStatus) return 0;
    const { consecutiveDays } = currentStatus;
    if (consecutiveDays >= 7) return 100;
    return (consecutiveDays / 7) * 100;
  };

  // 7 günlük takvim verilerini oluştur
  const getCalendarDays = () => {
    if (!currentStatus) return [];
    
    const { consecutiveDays } = currentStatus;
    const days = [];
    
    for (let i = 1; i <= 7; i++) {
      const isCompleted = i <= consecutiveDays;
      const isToday = i === consecutiveDays + 1;
      
      let reward = 1;
      if (i === 7) reward = 2; // 7. gün 2 jeton
      
      days.push({
        day: i,
        isCompleted,
        isToday,
        reward,
        status: isCompleted ? 'completed' : (isToday ? 'today' : 'future')
      });
    }
    
    return days;
  };

  const getDayStatusColor = (status) => {
    switch (status) {
      case 'completed':
        return [colors.success, colors.primaryLight];
      case 'today':
        return [colors.warning, colors.secondary];
      case 'future':
        return [colors.card, colors.border];
      default:
        return [colors.card, colors.border];
    }
  };

  const getDayStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return 'check-circle';
      case 'today':
        return 'star-circle';
      case 'future':
        return 'circle-outline';
      default:
        return 'circle-outline';
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }],
              opacity: opacityAnim,
            },
          ]}
        >
          <LinearGradient
            colors={getRewardColor(currentStatus?.consecutiveDays || 1)}
            style={styles.gradientContainer}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.content}>
              {loading ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Yükleniyor...</Text>
                </View>
              ) : rewardData && rewardData.tokensEarned > 0 ? (
                // Ödül alındığında gösterilecek ekran
                <>
                  <View style={styles.iconContainer}>
                    <Text style={styles.rewardIcon}>🎉</Text>
                  </View>
                  
                  <Text style={styles.title}>Tebrikler!</Text>
                  <Text style={styles.message}>
                    Günlük giriş ödülünüzü kazandınız!
                  </Text>
                  
                  <View style={styles.tokenContainer}>
                    <Text style={styles.tokenAmount}>
                      +{rewardData.tokensEarned}
                    </Text>
                    <Text style={styles.tokenLabel}>
                      Jeton
                    </Text>
                  </View>
                  
                  <Text style={styles.balanceText}>
                    Toplam Bakiye: {rewardData.totalBalance} Jeton
                  </Text>
                </>
              ) : (
                <>
                  <View style={styles.iconContainer}>
                    <Text style={styles.rewardIcon}>🌟</Text>
                  </View>
                  
                  <Text style={styles.title}>Günlük Giriş Ödülü</Text>
                  
                  {currentStatus && (
                    <View style={styles.statusContainer}>
                      <Text style={styles.statusText}>
                        Üst üste giriş: {currentStatus.consecutiveDays} gün
                      </Text>
                      
                      {/* 7 Günlük Takvim */}
                      <View style={styles.calendarContainer}>
                        <Text style={styles.calendarTitle}>7 Günlük Takvim</Text>
                        <View style={styles.calendarGrid}>
                          {getCalendarDays().map((dayData, index) => (
                            <View key={index} style={styles.dayContainer}>
                              <LinearGradient
                                colors={getDayStatusColor(dayData.status)}
                                style={styles.dayCard}
                                start={{ x: 0, y: 0 }}
                                end={{ x: 1, y: 1 }}
                              >
                                <View style={styles.dayHeader}>
                                  <MaterialCommunityIcons 
                                    name={getDayStatusIcon(dayData.status)} 
                                    size={16} 
                                    color={dayData.status === 'completed' ? colors.background : colors.text.light} 
                                  />
                                  <Text style={[
                                    styles.dayNumber,
                                    { color: dayData.status === 'completed' ? colors.background : colors.text.light }
                                  ]}>
                                    {dayData.day}
                                  </Text>
                                </View>
                                <View style={styles.dayRewardContainer}>
                                  <MaterialCommunityIcons 
                                    name="diamond" 
                                    size={14} 
                                    color={dayData.status === 'completed' ? colors.background : colors.text.light} 
                                  />
                                  <Text style={[
                                    styles.dayReward,
                                    { color: dayData.status === 'completed' ? colors.background : colors.text.light }
                                  ]}>
                                    {dayData.reward}
                                  </Text>
                                </View>
                                {dayData.isToday && (
                                  <View style={styles.todayIndicator}>
                                    <Text style={styles.todayText}>Bugün</Text>
                                  </View>
                                )}
                              </LinearGradient>
                            </View>
                          ))}
                        </View>
                      </View>
                      
                      <View style={styles.progressContainer}>
                        <View style={styles.progressBar}>
                          <View
                            style={[
                              styles.progressFill,
                              { width: `${getProgressPercentage()}%` },
                            ]}
                          />
                        </View>
                        <Text style={styles.progressText}>
                          {currentStatus.consecutiveDays}/7 gün
                        </Text>
                      </View>
                      
                      <Text style={styles.nextRewardText}>
                        Sonraki ödül: {currentStatus.nextReward} jeton
                      </Text>
                    </View>
                  )}
                </>
              )}
              
              <TouchableOpacity style={styles.closeButton} onPress={onClose}>
                <Text style={styles.closeButtonText}>Tamam</Text>
              </TouchableOpacity>
            </View>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  modalContainer: {
    width: Math.min(width * 0.92, 420),
    maxHeight: height * 0.85,
    borderRadius: 20,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.3,
    shadowRadius: 20,
  },
  gradientContainer: {
    paddingHorizontal: 20,
    paddingVertical: 24,
    width: '100%',
  },
  content: {
    alignItems: 'center',
    width: '100%',
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.light,
    fontSize: 16,
    textAlign: 'center',
  },
  iconContainer: {
    marginBottom: 16,
  },
  rewardIcon: {
    fontSize: 50,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 8,
    paddingHorizontal: 10,
  },
  message: {
    fontSize: 15,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 18,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  tokenContainer: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    borderRadius: 15,
    paddingHorizontal: 20,
    paddingVertical: 16,
    alignItems: 'center',
    marginBottom: 12,
    minWidth: 120,
  },
  tokenAmount: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  tokenLabel: {
    fontSize: 14,
    color: colors.text.light,
    marginTop: 4,
  },
  balanceText: {
    fontSize: 13,
    color: colors.text.light,
    opacity: 0.8,
    marginBottom: 16,
    textAlign: 'center',
  },
  statusContainer: {
    alignItems: 'center',
    marginBottom: 16,
    width: '100%',
  },
  statusText: {
    fontSize: 15,
    color: colors.text.light,
    marginBottom: 16,
    fontWeight: '600',
    textAlign: 'center',
  },
  // Takvim stilleri - Optimize edildi
  calendarContainer: {
    width: '100%',
    marginBottom: 16,
    alignItems: 'center',
  },
  calendarTitle: {
    fontSize: 15,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 16,
    width: '100%',
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingHorizontal: 4,
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  dayContainer: {
    flex: 1,
    maxWidth: (width * 0.92 - 60) / 7, // Genişlik artırıldı
    aspectRatio: 0.9, // Biraz daha kare yapıldı
    marginHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    width: '100%',
    height: '100%',
    borderRadius: 14,
    padding: 10,
    alignItems: 'center',
    justifyContent: 'space-between',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
    position: 'relative',
    minHeight: 70,
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 2,
  },
  dayNumber: {
    fontSize: 15,
    fontWeight: 'bold',
    marginTop: 2,
    textAlign: 'center',
  },
  dayRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 3,
  },
  dayReward: {
    fontSize: 11,
    fontWeight: '600',
    textAlign: 'center',
    marginLeft: 3,
  },
  todayIndicator: {
    position: 'absolute',
    top: -6,
    right: -6,
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    zIndex: 1,
  },
  todayText: {
    fontSize: 8,
    color: colors.text.light,
    fontWeight: 'bold',
  },
  progressContainer: {
    width: '100%',
    marginTop: 8,
    marginBottom: 12,
    paddingHorizontal: 8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
    marginBottom: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.background,
    borderRadius: 3,
    minWidth: 6,
  },
  progressText: {
    fontSize: 11,
    color: colors.text.light,
    textAlign: 'center',
  },
  nextRewardText: {
    fontSize: 13,
    color: colors.text.light,
    opacity: 0.9,
    textAlign: 'center',
    paddingHorizontal: 8,
  },
  closeButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 28,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    marginTop: 8,
    minWidth: 100,
  },
  closeButtonText: {
    color: colors.text.light,
    fontSize: 15,
    fontWeight: '600',
    textAlign: 'center',
  },
});

export default DailyLoginRewardModal; 