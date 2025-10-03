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
import socialTaskService from '../services/socialTaskService';

const { width } = Dimensions.get('window');

const SocialTasksCard = ({ userId, onTokensEarned, isModal = false }) => {
  const [taskData, setTaskData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [claimingReward, setClaimingReward] = useState(null);
  const [openingLink, setOpeningLink] = useState(null);
  const [progressAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    loadTaskData();
    
    // Global event listener for social task completion
    global.onSocialTaskCompleted = (taskType) => {
      loadTaskData();
    };

    return () => {
      global.onSocialTaskCompleted = null;
    };
  }, [userId]);

  const loadTaskData = async () => {
    try {
      setLoading(true);
      const result = await socialTaskService.getSocialTaskStatus(userId);
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
      console.error('Sosyal medya görev verileri yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenLink = async (taskType) => {
    try {
      setOpeningLink(taskType);
      const taskDef = socialTaskService.getSocialTaskDefinitions()[taskType];
      const result = await socialTaskService.openSocialMediaLink(userId, taskType, taskDef.url);
      
      if (result.success) {
        // Link açıldıktan sonra kullanıcıya bilgilendirme alert'i göster
        Alert.alert(
          '📱 Görev Kontrol Ediliyor',
          'Görevinizi tamamlayıp tamamlamadığınızı kontrol ediyoruz. Bu işlem 1-2 dakika sürebilir. Lütfen sayfayı kapatmayın.',
          [{ text: 'Anladım', style: 'default' }]
        );
      } else {
        Alert.alert('Hata', result.error);
      }
    } catch (error) {
      Alert.alert('Hata', 'Link açılırken bir hata oluştu');
    } finally {
      setOpeningLink(null);
    }
  };

  const handleClaimReward = async (taskType) => {
    try {
      setClaimingReward(taskType);
      const result = await socialTaskService.claimSocialTaskReward(userId, taskType);
      
      if (result.success) {
        Alert.alert('Tebrikler! 🎉', result.message);
        await loadTaskData(); // Verileri yenile
        
        // Token kazanıldığını parent component'e bildir
        const taskDef = socialTaskService.getSocialTaskDefinitions()[taskType];
        if (onTokensEarned) {
          onTokensEarned(taskDef.reward);
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

  const renderSocialTask = (taskType, taskDefinition) => {
    if (!taskData) return null;

    const isCompleted = taskData[`${taskType}_completed`];
    const isClaimed = taskData[`${taskType}_claimed`];
    const canClaimReward = isCompleted && !isClaimed;
    const statusText = socialTaskService.getTaskStatusText(taskData, taskType);

    return (
      <View key={taskType} style={styles.taskCard}>
        <LinearGradient
          colors={
            isClaimed 
              ? [colors.success, colors.success + '80']
              : isCompleted
                ? [colors.secondary, colors.warning]
                : [colors.primary, colors.primaryLight]
          }
          style={styles.taskGradient}
        >
          {/* Görev başlığı */}
          <View style={styles.taskHeader}>
            <View style={styles.taskTitleContainer}>
              <View style={[
                styles.iconContainer,
                { backgroundColor: taskDefinition.color }
              ]}>
                <Ionicons 
                  name={taskDefinition.icon} 
                  size={20} 
                  color={colors.text.light} 
                />
              </View>
              <View style={styles.taskInfo}>
                <Text style={styles.taskTitle}>{taskDefinition.title}</Text>
                <Text style={styles.taskDescription}>{taskDefinition.description}</Text>
              </View>
            </View>
            
            {isClaimed && (
              <Ionicons name="checkmark-circle" size={24} color={colors.success} />
            )}
          </View>

          {/* Ödül bilgisi */}
          <View style={styles.rewardContainer}>
            <View style={styles.rewardInfo}>
              <MaterialIcons name="stars" size={18} color={colors.secondary} />
              <Text style={styles.rewardText}>
                Ödül: {taskDefinition.reward} Jeton
              </Text>
            </View>
            
            <View style={styles.statusContainer}>
              <Text style={[
                styles.statusText,
                { 
                  color: isClaimed 
                    ? colors.success 
                    : isCompleted 
                      ? colors.warning 
                      : colors.text.accent 
                }
              ]}>
                {statusText}
              </Text>
            </View>
          </View>

          {/* Action buttons */}
          <View style={styles.actionContainer}>
            {!isCompleted && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleOpenLink(taskType)}
                disabled={openingLink === taskType}
              >
                <LinearGradient
                  colors={[taskDefinition.color, taskDefinition.color + '80']}
                  style={styles.actionGradient}
                >
                  <Text style={styles.actionButtonText}>
                    {openingLink === taskType ? 'Açılıyor...' : 'Linke Git'}
                  </Text>
                  <MaterialIcons name="open-in-new" size={16} color={colors.text.light} />
                </LinearGradient>
              </TouchableOpacity>
            )}
            
            {canClaimReward && (
              <TouchableOpacity
                style={styles.claimButton}
                onPress={() => handleClaimReward(taskType)}
                disabled={claimingReward === taskType}
              >
                <LinearGradient
                  colors={[colors.secondary, colors.warning]}
                  style={styles.claimGradient}
                >
                  <Text style={styles.claimButtonText}>
                    {claimingReward === taskType ? 'Alınıyor...' : 'Ödülü Al'}
                  </Text>
                  <MaterialIcons name="redeem" size={16} color={colors.text.dark} />
                </LinearGradient>
              </TouchableOpacity>
            )}
          </View>
        </LinearGradient>
      </View>
    );
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Sosyal medya görevleri yükleniyor...</Text>
        </View>
      </View>
    );
  }

  if (!taskData) return null;

  const totalAvailableRewards = socialTaskService.getTotalAvailableRewards(taskData);
  const allTasksCompleted = socialTaskService.areAllTasksCompleted(taskData);
  const socialTaskDefinitions = socialTaskService.getSocialTaskDefinitions();

  return (
    <View style={styles.socialTasksWrapper}>
      <LinearGradient
        colors={[colors.social.instagram, colors.social.tiktok]}
        style={styles.headerGradient}
      >
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <MaterialIcons name="share" size={24} color={colors.text.light} />
            <Text style={styles.headerTitle}>Sosyal Medya Görevleri</Text>
          </View>
          <TouchableOpacity onPress={loadTaskData} style={styles.refreshButton}>
            <MaterialIcons name="refresh" size={20} color={colors.text.light} />
          </TouchableOpacity>
        </View>
        
        <Text style={styles.headerSubtitle}>
          {allTasksCompleted 
            ? 'Tüm sosyal medya görevlerini tamamladınız! 🎉' 
            : `Sosyal medya hesaplarımızı takip edin ve ${totalAvailableRewards} jeton kazanın!`
          }
        </Text>
      </LinearGradient>

      <View style={styles.tasksContainer}>
        {Object.entries(socialTaskDefinitions).map(([taskType, taskDefinition]) =>
          renderSocialTask(taskType, taskDefinition)
        )}
        
        {allTasksCompleted && (
          <View style={styles.completionCard}>
            <LinearGradient
              colors={[colors.success, colors.info]}
              style={styles.completionGradient}
            >
              <MaterialIcons name="emoji-events" size={32} color={colors.text.light} />
              <Text style={styles.completionTitle}>Harika! 🎉</Text>
              <Text style={styles.completionText}>
                Tüm sosyal medya görevlerini tamamladınız! Toplamda 9 jeton kazandınız.
              </Text>
            </LinearGradient>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  socialTasksWrapper: {
    borderRadius: 16,
    overflow: 'hidden',
    elevation: 5,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  headerGradient: {
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
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  taskCard: {
    marginTop: 12,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
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
    flex: 1,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  taskInfo: {
    flex: 1,
  },
  taskTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  taskDescription: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  rewardContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
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
  statusContainer: {
    backgroundColor: colors.background + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  actionContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  actionButton: {
    flex: 1,
    borderRadius: 20,
    overflow: 'hidden',
    marginRight: 8,
  },
  actionGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  actionButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginRight: 6,
  },
  claimButton: {
    borderRadius: 20,
    overflow: 'hidden',
  },
  claimGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  claimButtonText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.dark,
    marginRight: 6,
  },
  completionCard: {
    marginTop: 16,
    borderRadius: 12,
    overflow: 'hidden',
    elevation: 3,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
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

export default SocialTasksCard; 
