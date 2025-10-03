import { supabase } from '../../lib/supabase';

class DailyTaskService {
  // Günlük görev durumunu getir
  async getDailyTaskStatus(userId) {
    try {
      const { data, error } = await supabase
        .rpc('get_daily_task_status', { p_user_id: userId });

      if (error) throw error;

      return {
        success: true,
        data: data[0] || {
          current_level: 1,
          level_1_progress: {
            fortunes_sent: 0,
            posts_liked: 0,
            ads_watched: 0,
            completed: false,
            reward_claimed: false
          },
          level_2_progress: {
            fortunes_sent: 0,
            ads_watched: 0,
            completed: false,
            reward_claimed: false
          },
          level_3_progress: {
            fortunes_sent: 0,
            interactions: 0,
            ads_watched: 0,
            completed: false,
            reward_claimed: false
          },
          available_rewards: []
        }
      };
    } catch (error) {
      console.error('Günlük görev durumu getirme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Fal gönderme ilerlemesini güncelle
  async updateFortuneProgress(userId) {
    try {
      const { error } = await supabase
        .rpc('update_daily_task_progress', {
          p_user_id: userId,
          p_task_type: 'fortune_sent',
          p_increment: 1
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Fal ilerleme güncelleme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gönderi beğenme ilerlemesini güncelle
  async updateLikeProgress(userId) {
    try {
      const { error } = await supabase
        .rpc('update_daily_task_progress', {
          p_user_id: userId,
          p_task_type: 'post_liked',
          p_increment: 1
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Beğeni ilerleme güncelleme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Gönderi etkileşimi (beğeni + yorum) ilerlemesini güncelle
  async updateInteractionProgress(userId) {
    try {
      const { error } = await supabase
        .rpc('update_daily_task_progress', {
          p_user_id: userId,
          p_task_type: 'post_interaction',
          p_increment: 1
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Etkileşim ilerleme güncelleme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Reklam izleme ilerlemesini güncelle
  async updateAdProgress(userId) {
    try {
      const { error } = await supabase
        .rpc('update_daily_task_progress', {
          p_user_id: userId,
          p_task_type: 'ad_watched',
          p_increment: 1
        });

      if (error) throw error;

      return { success: true };
    } catch (error) {
      console.error('Reklam ilerleme güncelleme hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Günlük görev ödülünü al
  async claimTaskReward(userId, level) {
    try {
      const { data, error } = await supabase
        .rpc('claim_daily_task_reward', {
          p_user_id: userId,
          p_level: level
        });

      if (error) throw error;

      if (!data) {
        return {
          success: false,
          error: 'Ödül alınamadı. Görev tamamlanmamış veya ödül zaten alınmış.'
        };
      }

      return {
        success: true,
        message: `${level === 1 ? '2' : level === 2 ? '3' : '5'} jeton ödülünüz hesabınıza eklendi!`
      };
    } catch (error) {
      console.error('Ödül alma hatası:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  // Görev gereksinimlerini getir
  getTaskRequirements() {
    return {
      level_1: {
        title: 'Görev 1',
        requirements: [
          { type: 'fortunes_sent', target: 2, description: '2 Fal Gönder' },
          { type: 'posts_liked', target: 2, description: 'Keşfette 2 gönderiyi beğen' },
          { type: 'ads_watched', target: 3, description: 'Herhangi bir 3 reklam izle' }
        ],
        reward: 2,
        description: 'Ödül: 2 jeton'
      },
      level_2: {
        title: 'Görev 2',
        requirements: [
          { type: 'fortunes_sent', target: 3, description: '3 fal gönder' },
          { type: 'ads_watched', target: 5, description: 'Herhangi bir 5 reklam izle' }
        ],
        reward: 3,
        description: 'Ödül: 3 jeton'
      },
      level_3: {
        title: 'Görev 3',
        requirements: [
          { type: 'fortunes_sent', target: 4, description: '4 fal gönder' },
          { type: 'interactions', target: 2, description: 'Keşfette 2 gönderiye yorum yap ve beğen' },
          { type: 'ads_watched', target: 5, description: 'Herhangi bir 5 reklam izle' }
        ],
        reward: 5,
        description: 'Ödül: 5 jeton'
      }
    };
  }

  // Görevin açıklaması ve ilerleme bilgisi
  getTaskProgress(level, progress) {
    const requirements = this.getTaskRequirements();
    const levelData = requirements[`level_${level}`];
    
    if (!levelData) return null;

    const progressData = progress[`level_${level}_progress`];
    
    return {
      ...levelData,
      progress: progressData,
      progressText: this.generateProgressText(level, progressData)
    };
  }

  generateProgressText(level, progress) {
    const texts = [];
    
    switch (level) {
      case 1:
        texts.push(`Fal: ${progress.fortunes_sent}/2`);
        texts.push(`Beğeni: ${progress.posts_liked}/2`);
        texts.push(`Reklam: ${progress.ads_watched}/3`);
        break;
      case 2:
        texts.push(`Fal: ${progress.fortunes_sent}/3`);
        texts.push(`Reklam: ${progress.ads_watched}/5`);
        break;
      case 3:
        texts.push(`Fal: ${progress.fortunes_sent}/4`);
        texts.push(`Etkileşim: ${progress.interactions}/2`);
        texts.push(`Reklam: ${progress.ads_watched}/5`);
        break;
    }
    
    return texts.join(' • ');
  }
}

export default new DailyTaskService(); 