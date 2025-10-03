import { supabase } from '../../lib/supabase';
import { Linking } from 'react-native';

class SocialTaskService {
  // Sosyal medya görev durumunu getir
  async getSocialTaskStatus(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_social_task_status', { p_user_id: userId });

      if (error) throw error;

      return {
        success: true,
        data: data[0] || {
          instagram_follow_completed: false,
          instagram_follow_claimed: false,
          tiktok_follow_completed: false,
          tiktok_follow_claimed: false,
          instagram_story_completed: false,
          instagram_story_claimed: false
        }
      };
    } catch (error) {
      console.error('Sosyal medya görev durumu getirme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sosyal medya görevini tamamla (link tıklandıktan 1 dakika sonra)
  async completeSocialTask(userId, taskType) {
    try {
      // 1 dakika bekle (60000 ms)
      await new Promise(resolve => setTimeout(resolve, 60000));

      const { data, error } = await supabase
        .rpc('complete_social_task', {
          p_user_id: userId,
          p_task_type: taskType
        });

      if (error) throw error;

      return {
        success: true,
        data: data
      };
    } catch (error) {
      console.error('Sosyal medya görev tamamlama hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sosyal medya görev ödülünü al
  async claimSocialTaskReward(userId, taskType) {
    try {
      const { data, error } = await supabase
        .rpc('claim_social_task_reward', {
          p_user_id: userId,
          p_task_type: taskType
        });

      if (error) throw error;

      if (!data) {
        return {
          success: false,
          error: 'Ödül alınamadı. Görev tamamlanmamış veya ödül zaten alınmış.'
        };
      }

      const rewards = {
        'instagram_follow': 2,
        'tiktok_follow': 2,
        'instagram_story': 5
      };

      return {
        success: true,
        message: `${rewards[taskType]} jeton ödülünüz hesabınıza eklendi!`
      };
    } catch (error) {
      console.error('Sosyal medya ödül alma hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Sosyal medya linkini aç ve görev tamamlama sürecini başlat
  async openSocialMediaLink(userId, taskType, url) {
    try {
      const canOpen = await Linking.canOpenURL(url);
      if (!canOpen) {
        return {
          success: false,
          error: 'Bu link açılamıyor. Lütfen manuel olarak ziyaret edin.'
        };
      }

      // Linki aç
      await Linking.openURL(url);

      // Arka planda görev tamamlama sürecini başlat
      this.completeSocialTask(userId, taskType).then(result => {
        if (result.success) {
          // Görev tamamlandığında kullanıcıya bildirim göster
          // Bu global event listener ile yakalanabilir
          if (global.onSocialTaskCompleted) {
            global.onSocialTaskCompleted(taskType);
          }
        }
      }).catch(error => {
        console.error('Sosyal görev arka plan tamamlama hatası:', error);
      });

      return {
        success: true,
        message: 'Link açıldı! Görevinizi tamamlayın, sistem otomatik olarak kontrol edecek.'
      };
    } catch (error) {
      console.error('Link açma hatası:', error);
      return {
        success: false,
        error: 'Link açılırken bir hata oluştu.'
      };
    }
  }

  // Sosyal medya görev tanımlarını getir
  getSocialTaskDefinitions() {
    return {
      instagram_follow: {
        title: 'Instagram\'ı Takip Et',
        description: 'Instagram hesabımızı takip edin',
        reward: 2,
        icon: 'logo-instagram',
        url: 'https://www.instagram.com/falviaapp/',
        color: '#E4405F'
      },
      tiktok_follow: {
        title: 'TikTok\'u Takip Et',
        description: 'TikTok hesabımızı takip edin',
        reward: 2,
        icon: 'logo-tiktok',
        url: 'https://www.tiktok.com/@falvia.app',
        color: '#000000'
      },
      instagram_story: {
        title: 'Story Paylaş',
        description: 'Uygulamamızı Instagram profilinizde story olarak paylaşın',
        reward: 5,
        icon: 'camera',
        url: 'https://www.instagram.com/falviaapp/',
        color: '#E4405F'
      }
    };
  }

  // Görev durumu açıklaması
  getTaskStatusText(taskData, taskType) {
    const task = taskData[`${taskType}_completed`];
    const claimed = taskData[`${taskType}_claimed`];

    if (claimed) {
      return 'Ödül Alındı ✅';
    } else if (task) {
      return 'Tamamlandı - Ödülü Al!';
    } else {
      return 'Tıkla ve Tamamla';
    }
  }

  // Tüm sosyal medya görevlerinin tamamlanıp tamamlanmadığını kontrol et
  areAllTasksCompleted(taskData) {
    return taskData.instagram_follow_claimed && 
           taskData.tiktok_follow_claimed && 
           taskData.instagram_story_claimed;
  }

  // Toplam kazanılabilir jeton miktarını hesapla
  getTotalAvailableRewards(taskData) {
    let totalRewards = 0;
    const definitions = this.getSocialTaskDefinitions();

    Object.keys(definitions).forEach(taskType => {
      const completed = taskData[`${taskType}_completed`];
      const claimed = taskData[`${taskType}_claimed`];
      
      if (!claimed) {
        totalRewards += definitions[taskType].reward;
      }
    });

    return totalRewards;
  }
}

export default new SocialTaskService(); 