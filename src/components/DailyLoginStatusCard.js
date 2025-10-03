import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import dailyLoginService from '../services/dailyLoginService';

const { width } = Dimensions.get('window');

const DailyLoginStatusCard = ({ userId, onClaimReward }) => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (userId) {
      fetchStatus();
    }
  }, [userId]);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const result = await dailyLoginService.getCurrentStatus(userId);
      if (result.success) {
        setStatus(result.data);
      }
    } catch (error) {
      console.error('Günlük giriş durumu alınırken hata:', error);
      // Hata durumunda status'u null yap
      setStatus(null);
    } finally {
      setLoading(false);
    }
  };

  // Yenileme fonksiyonu - dışarıdan çağrılabilir
  const refreshStatus = async () => {
    await fetchStatus();
  };

  // useEffect'i dışa aktar
  useEffect(() => {
    if (userId) {
      fetchStatus();
    }
  }, [userId]);

  const getProgressPercentage = () => {
    if (!status) return 0;
    const { consecutiveDays } = status;
    if (consecutiveDays >= 7) return 100;
    return (consecutiveDays / 7) * 100;
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

  const getRewardText = (consecutiveDays) => {
    if (consecutiveDays >= 7) return 'Maksimum Ödül!';
    if (consecutiveDays >= 3) return 'Harika Gidiş!';
    return 'Başlangıç';
  };

  // 7 günlük takvim verilerini oluştur
  const getCalendarDays = () => {
    if (!status) return [];
    
    const { consecutiveDays } = status;
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

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={onClaimReward}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={getRewardColor(status.consecutiveDays)}
        style={styles.gradientContainer}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Text style={styles.rewardIcon}>
              {getRewardIcon(status.consecutiveDays)}
            </Text>
          </View>
          <View style={styles.headerText}>
            <Text style={styles.title}>Günlük Giriş Ödülü</Text>
            <Text style={styles.subtitle}>{getRewardText(status.consecutiveDays)}</Text>
          </View>
        </View>

        {/* 7 Günlük Takvim */}
        <View style={styles.calendarSection}>
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
                      size={14} 
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
                      size={12} 
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

        <View style={styles.progressSection}>
          <View style={styles.progressHeader}>
            <Text style={styles.progressText}>
              {status.consecutiveDays}/7 gün üst üste
            </Text>
            <Text style={styles.nextRewardText}>
              Sonraki: {status.nextReward} jeton
            </Text>
          </View>
          
          <View style={styles.progressBar}>
            <View
              style={[
                styles.progressFill,
                { width: `${getProgressPercentage()}%` },
              ]}
            />
          </View>
        </View>

        <View style={styles.statusSection}>
          {status.hasClaimedToday ? (
            <View style={styles.claimedContainer}>
              <Ionicons name="checkmark-circle" size={20} color={colors.text.primary} />
              <Text style={styles.claimedText}>Bugünkü ödülünüzü aldınız!</Text>
            </View>
          ) : (
            <View style={styles.claimContainer}>
              <Ionicons name="gift" size={20} color={colors.text.primary} />
              <Text style={styles.claimText}>Ödülünüzü almak için dokunun!</Text>
            </View>
          )}
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 15,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  gradientContainer: {
    padding: 20,
  },
  loadingContainer: {
    marginHorizontal: 20,
    marginVertical: 10,
    padding: 20,
    backgroundColor: colors.card,
    borderRadius: 15,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    fontSize: 14,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  iconContainer: {
    marginRight: 15,
  },
  rewardIcon: {
    fontSize: 30,
  },
  headerText: {
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 2,
  },
  subtitle: {
    fontSize: 14,
    color: colors.text.primary,
    opacity: 0.8,
  },
  progressSection: {
    marginBottom: 15,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  progressText: {
    fontSize: 14,
    color: colors.text.primary,
    fontWeight: '600',
  },
  nextRewardText: {
    fontSize: 12,
    color: colors.text.primary,
    opacity: 0.8,
  },
  progressBar: {
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 3,
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.text.primary,
    borderRadius: 3,
  },
  statusSection: {
    alignItems: 'center',
  },
  claimedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimedText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  claimContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 15,
    paddingVertical: 8,
    borderRadius: 20,
  },
  claimText: {
    color: colors.text.primary,
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  // Takvim stilleri
  calendarSection: {
    marginBottom: 15,
    width: '100%',
    alignItems: 'center',
    marginTop: -8,
  },
  calendarTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: 15,
    width: '100%',
  },
  calendarGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    width: '100%',
    maxWidth: 320,
    alignSelf: 'center',
  },
  dayContainer: {
    width: '13%',
    aspectRatio: 1,
    marginHorizontal: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dayCard: {
    width: '100%',
    height: '100%',
    borderRadius: 10,
    padding: 8,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    position: 'relative',
    minHeight: 65,
    minWidth: 40,
  },
  dayHeader: {
    alignItems: 'center',
    marginBottom: 4,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: 'bold',
    marginTop: 2,
  },
  dayRewardContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 2,
  },
  dayReward: {
    fontSize: 9,
    fontWeight: '600',
    textAlign: 'center',
    lineHeight: 12,
    marginLeft: 4,
  },
  todayIndicator: {
    position: 'absolute',
    top: -4,
    right: -4,
    backgroundColor: colors.warning,
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  todayText: {
    fontSize: 7,
    color: colors.text.light,
    fontWeight: 'bold',
  },
});

export default DailyLoginStatusCard; 