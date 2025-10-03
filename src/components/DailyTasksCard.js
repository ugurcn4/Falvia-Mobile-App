import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  Animated,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons, Ionicons } from '@expo/vector-icons';
import { colors } from '../styles/colors';
import dailyTaskService from '../services/dailyTaskService';
import SocialTasksCard from './SocialTasksCard';

const { width } = Dimensions.get('window');

const DailyTasksCard = ({ userId, onTokensEarned, isModal = false }) => {
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState(null);
  const [progressAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    loadTaskData();
  }, [userId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      const result = await dailyTaskService.getDailyTaskStatus(userId);
      if (result.success) {
        setTaskData(result.data);
        // Progress animasyonu
        Animated.timing(progressAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: false
        }).start();
      }
    } catch (error) {
      console.error('Görev verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleClaimReward = async (level) => {
    try {
      setClaimingReward(level);
      const result = await dailyTaskService.claimTaskReward(userId, level);
      
      if (result.success) {
        Alert.alert('Tebrikler! 🎉', result.message);
        await loadTaskData(); // Verileri yenile
        
        // Token kazanıldığını parent component'e bildir
        const rewardAmount = level === 1 ? 2 : level === 2 ? 3 : 5;
        if (onTokensEarned) {
          onTokensEarned(rewardAmount);
        }
      } else {
        Alert.alert('Hata', result.error);
      }
    } catch (error) {
      Alert.alert('Hata', 'Ödül alınırken bir hata oluştu');
    } finally {
      setClaimingReward(null);
    }
  };

  const renderProgressBar = (current, target, level) => {
    const progress = Math.min(current / target, 1);
    const progressWidth = progressAnimation.interpolate({
      inputRange: [0, 1],
      outputRange: [0, progress * 100]
    });

    return (
      <View style={styles.progressContainer}>
        <View style={styles.progressTrack}>
          <Animated.View 
            style={[
              styles.progressFill, 
              { 
                width: progressWidth.interpolate({
                  inputRange: [0, 100],
                  outputRange: ['0%', '100%']
                })
              }
            ]} 
          />
        </View>
        <Text style={styles.progressText}>
          {current}/{target}
        </Text>
      </View>
    );
  };

  const renderTaskLevel = (level, levelData, isCurrentLevel, isCompleted) => {
    const requirements = dailyTaskService.getTaskRequirements();
    const levelInfo = requirements[`level_${level}`];
    
    if (!levelInfo || !levelData) return null;

    const canClaimReward = isCompleted && !levelData.reward_claimed;
    const isLocked = level > taskData.current_level;

    return (
      <View style={[
        styles.taskCard,
        isCurrentLevel && styles.currentTaskCard,
        isLocked && styles.lockedTaskCard
      ]}>
        <LinearGradient
          colors={
            isCompleted 
              ? [colors.success, colors.success + '80']
              : isCurrentLevel
                ? [colors.primary, colors.primaryLight]
                : [colors.card, colors.card + '80']
          }
          style={styles.taskGradient}
        >
          {/* Görev başlığı */}
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <View style={[
                styles.levelBadge,
                { backgroundColor: isCompleted ? colors.success : colors.secondary }
              ]}>
                <Text style={styles.levelBadgeText}>{level}</Text>
              </View>
              <Text style={styles.taskTitle}>{levelInfo.title}</Text>
            </View>
            
            {isLocked && (
              <Ionicons name="lock-closed" size={20} color={colors.text.tertiary} />
            )}
            
            {isCompleted && (
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            )}
          </View>

          {/* Görev detayları */}
          {!isLocked && (
            <>
              <View style={styles.requirementsContainer}>
                {level === 1 && (
                  <>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="casino" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Fal Gönder</Text>
                      {renderProgressBar(levelData.fortunes_sent, 2, level)}
                    </View>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="favorite" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Gönderi Beğen</Text>
                      {renderProgressBar(levelData.posts_liked, 2, level)}
                    </View>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="play-circle-filled" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Reklam İzle</Text>
                      {renderProgressBar(levelData.ads_watched, 3, level)}
                    </View>
                  </>
                )}
                
                {level === 2 && (
                  <>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="casino" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Fal Gönder</Text>
                      {renderProgressBar(levelData.fortunes_sent, 3, level)}
                    </View>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="play-circle-filled" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Reklam İzle</Text>
                      {renderProgressBar(levelData.ads_watched, 5, level)}
                    </View>
                  </>
                )}
                
                {level === 3 && (
                  <>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="casino" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Fal Gönder</Text>
                      {renderProgressBar(levelData.fortunes_sent, 4, level)}
                    </View>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="chat-bubble" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Etkileşim (Beğeni + Yorum)</Text>
                      {renderProgressBar(levelData.interactions, 2, level)}
                    </View>
                    <View style={styles.requirementItem}>
                      <MaterialIcons name="play-circle-filled" size={16} color={colors.text.secondary} />
                      <Text style={styles.requirementText}>Reklam İzle</Text>
                      {renderProgressBar(levelData.ads_watched, 5, level)}
                    </View>
                  </>
                )}
              </View>

              {/* Ödül bölümü */}
              <View style={styles.rewardContainer}>
                <View style={styles.rewardInfo}>
                  <MaterialIcons name="stars" size={20} color={colors.secondary} />
                  <Text style={styles.rewardText}>
                    Ödül: {levelInfo.reward} Jeton
                  </Text>
                </View>
                
                {canClaimReward && (
                  <TouchableOpacity
                    style={styles.claimButton}
                    onPress={() => handleClaimReward(level)}
                    disabled={claimingReward === level}
                  >
                    <LinearGradient
                      colors={[colors.secondary, colors.warning]}
                      style={styles.claimGradient}
                    >
                      <Text style={styles.claimButtonText}>
                        {claimingReward === level ? 'Alınıyor...' : 'Ödülü Al'}
                      </Text>
                      <MaterialIcons name="redeem" size={18} color={colors.text.dark} />
                    </LinearGradient>
                  </TouchableOpacity>
                )}
                
                {levelData.reward_claimed && (
                  <View style={styles.claimedContainer}>
                    <MaterialIcons name="check-circle" size={18} color={colors.success} />
                    <Text style={styles.claimedText}>Ödül Alındı</Text>
                  </View>
                )}
              </View>
            </>
          )}
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Günlük görevler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!taskData) return null;

  return (
    <View style={isModal ? styles.containerModal : styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="assignment" size={24} color={colors.text.light} />
            <Text style={styles.headerTitle}>Günlük Görevler</Text>
          </View>
          <TouchableOpacity onPress={loadTaskData} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={20} color={colors.text.light} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerSubtitle}>
          Görevleri tamamla, jeton kazan! 
          {taskData.all_levels_completed && ' 🎉 Tüm görevler tamamlandı!'}
        </Text>
      </LinearGradient>

      <ScrollView style={styles.tasksContainer} showsVerticalScrollIndicator={false}>
        {renderTaskLevel(1, taskData.level_1_progress, taskData.current_level === 1, taskData.level_1_progress?.completed)}
        {renderTaskLevel(2, taskData.level_2_progress, taskData.current_level === 2, taskData.level_2_progress?.completed)}
        {renderTaskLevel(3, taskData.level_3_progress, taskData.current_level === 3, taskData.level_3_progress?.completed)}
        
        {taskData.all_levels_completed && (
          <View style={styles.completionCard}>
            <LinearGradient
              colors={[colors.success, colors.info]}
              style={styles.completionGradient}
            >
              <MaterialIcons name="emoji-events" size={32} color={colors.text.light} />
              <Text style={styles.completionTitle}>Tebrikler! 🎉</Text>
              <Text style={styles.completionText}>
                Bugünkü tüm görevleri tamamladınız! Yarın yeni görevler sizi bekliyor.
              </Text>
            </LinearGradient>
          </View>
        )}

        {/* Sosyal Medya Görevleri */}
        <SocialTasksCard 
          userId={userId} 
          onTokensEarned={onTokensEarned}
          isModal={true}
        />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 16,
  },
  containerModal: {
    marginVertical: 0,
  },
  headerGradient: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 8,
  },
  headerSubtitle: {
    fontSize: 14,
    color: colors.text.secondary,
    opacity: 0.9,
  },
  refreshButton: {
    padding: 4,
  },
  tasksContainer: {
    backgroundColor: colors.background,
    borderBottomLeftRadius: 16,
    borderBottomRightRadius: 16,
    paddingHorizontal: 16,
    paddingBottom: 16,
    maxHeight: 600,
  },
  taskCard: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  currentTaskCard: {
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  lockedTaskCard: {
    opacity: 0.6,
  },
  taskGradient: {
    padding: 16,
  },
  taskHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  taskTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  levelBadge: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  levelBadgeText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.dark,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  requirementsContainer: {
    marginBottom: 16,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  requirementText: {
    fontSize: 14,
    color: colors.text.secondary,
    marginLeft: 8,
    flex: 1,
  },
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 8,
  },
  progressTrack: {
    width: 60,
    height: 6,
    backgroundColor: colors.border,
    borderRadius: 3,
    marginRight: 6,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 3,
  },
  progressText: {
    fontSize: 12,
    color: colors.text.tertiary,
    minWidth: 30,
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  rewardInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rewardText: {
    fontSize: 14,
    fontWeight: '600',
    color: colors.text.accent,
    marginLeft: 6,
  },
  claimButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  claimButtonText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.dark,
    marginRight: 4,
  },
  claimedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  claimedText: {
    fontSize: 12,
    color: colors.success,
    marginLeft: 4,
  },
  completionCard: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
  },
  completionGradient: {
    padding: 20,
    alignItems: 'center',
  },
  completionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 8,
    marginBottom: 8,
  },
  completionText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingContainer: {
    padding: 32,
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 16,
  },
  loadingText: {
    fontSize: 16,
    color: colors.text.secondary,
  },
});

export default DailyTasksCard; 