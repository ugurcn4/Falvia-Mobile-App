import OpenAI from 'openai';
import { EXPO_PUBLIC_OPENAI_API_KEY } from '@env';
import { supabase } from '../../lib/supabase';

const openai = new OpenAI({
  apiKey: EXPO_PUBLIC_OPENAI_API_KEY,
});

/**
 * Falcı sohbet servisi - YZ falcılarla gerçek zamanlı sohbet
 */
export class FortuneTellerChatService {
  
  /**
   * Tüm falcıları getirir (müsait olanlar önce)
   */
  static async getAllFortuneTellers() {
    try {
      const { data, error } = await supabase
        .from('fortune_tellers')
        .select('*')
        .order('is_available', { ascending: false })
        .order('rating', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Falcıları getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Tek bir falcı bilgisini getirir
   */
  static async getFortuneTellerById(fortuneTellerId) {
    try {
      const { data, error } = await supabase
        .from('fortune_tellers')
        .select('*')
        .eq('id', fortuneTellerId)
        .single();

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Falcı getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Kullanıcının sohbet geçmişini getirir
   */
  static async getUserChats(userId) {
    try {
      const { data, error } = await supabase
        .from('fortune_teller_chats')
        .select(`
          *,
          fortune_teller:fortune_tellers(*)
        `)
        .eq('user_id', userId)
        .order('updated_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Sohbet geçmişi getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Belirli bir falcı ile sohbeti getirir veya oluşturur
   */
  static async getOrCreateChat(userId, fortuneTellerId) {
    try {
      // Önce var mı kontrol et
      let { data: chat, error: fetchError } = await supabase
        .from('fortune_teller_chats')
        .select(`
          *,
          fortune_teller:fortune_tellers(*)
        `)
        .eq('user_id', userId)
        .eq('fortune_teller_id', fortuneTellerId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw fetchError;
      }

      // Yoksa oluştur
      if (!chat) {
        const { data: newChat, error: createError } = await supabase
          .from('fortune_teller_chats')
          .insert({
            user_id: userId,
            fortune_teller_id: fortuneTellerId,
            last_message: null,
            last_message_time: null,
            unread_count: 0,
            total_messages: 0,
            total_tokens_spent: 0,
            is_favorite: false
          })
          .select(`
            *,
            fortune_teller:fortune_tellers(*)
          `)
          .single();

        if (createError) throw createError;
        chat = newChat;
      }

      return { data: chat, error: null };
    } catch (error) {
      console.error('Sohbet oluşturma/getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Sohbet mesajlarını getirir
   */
  static async getChatMessages(chatId, limit = 50) {
    try {
      const { data, error } = await supabase
        .from('fortune_teller_messages')
        .select('*')
        .eq('chat_id', chatId)
        .order('created_at', { ascending: true })
        .limit(limit);

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Mesajları getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Kullanıcının sohbet geçmişini getirir
   */
  static async getUserChats(userId) {
    try {
      const { data, error } = await supabase
        .from('fortune_teller_chats')
        .select(`
          *,
          fortune_teller:fortune_tellers(*)
        `)
        .eq('user_id', userId)
        .order('last_message_time', { ascending: false, nullsFirst: false });

      if (error) throw error;
      
      // Sadece en az 1 mesaj olan sohbetleri döndür
      const filteredData = data.filter(chat => chat.total_messages > 0);
      
      return { data: filteredData, error: null };
    } catch (error) {
      console.error('Sohbet geçmişi getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Kullanıcının token bakiyesini kontrol eder
   */
  static async checkUserTokenBalance(userId, requiredTokens) {
    try {
      const { data: user, error } = await supabase
        .from('users')
        .select('token_balance')
        .eq('id', userId)
        .single();

      if (error) throw error;
      
      return { 
        hasEnough: user.token_balance >= requiredTokens,
        currentBalance: user.token_balance,
        error: null 
      };
    } catch (error) {
      console.error('Token bakiyesi kontrol hatası:', error);
      return { hasEnough: false, currentBalance: 0, error };
    }
  }

  /**
   * Kullanıcıdan token keser
   */
  static async deductTokens(userId, amount, chatId) {
    try {
      // Token'ı düş
      const { error: updateError } = await supabase.rpc('deduct_user_tokens', {
        p_user_id: userId,
        p_amount: amount
      });

      if (updateError) throw updateError;

      // Transaction kaydı oluştur
      const { error: txError } = await supabase
        .from('token_transactions')
        .insert({
          user_id: userId,
          amount: -amount,
          transaction_type: 'fortune_teller_chat',
          reference_id: chatId
        });

      if (txError) throw txError;

      return { success: true, error: null };
    } catch (error) {
      console.error('Token kesme hatası:', error);
      return { success: false, error };
    }
  }

  /**
   * Kullanıcı mesajı gönderir
   */
  static async sendUserMessage(userId, chatId, content, fortuneTellerPrice = 10) {
    try {
      // Token kontrolü
      const tokenCheck = await this.checkUserTokenBalance(userId, fortuneTellerPrice);
      if (!tokenCheck.hasEnough) {
        return { 
          data: null, 
          error: { message: 'Yetersiz jeton bakiyesi', code: 'INSUFFICIENT_TOKENS' } 
        };
      }

      // Token'ı kes
      const deductResult = await this.deductTokens(userId, fortuneTellerPrice, chatId);
      if (!deductResult.success) {
        throw new Error('Token kesme başarısız');
      }

      // Mesajı kaydet
      const { data: message, error } = await supabase
        .from('fortune_teller_messages')
        .insert({
          chat_id: chatId,
          sender_type: 'user',
          sender_id: userId,
          content: content,
          token_cost: fortuneTellerPrice,
          is_read: true
        })
        .select()
        .single();

      if (error) throw error;

      return { data: message, error: null };
    } catch (error) {
      console.error('Kullanıcı mesajı gönderme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * YZ falcı yanıtı oluşturur (sadece AI yanıtı, kaydetmez)
   */
  static async generateFortuneTellerResponse(chatId, userId, fortuneTellerId, userMessage, conversationHistory = []) {
    try {
      // Falcı bilgilerini al
      const { data: fortuneTeller } = await this.getFortuneTellerById(fortuneTellerId);
      if (!fortuneTeller) throw new Error('Falcı bulunamadı');

      // Kullanıcı bilgilerini al
      const { data: user } = await supabase
        .from('users')
        .select('first_name, last_name, birth_date, zodiac_sign, gender, marital_status')
        .eq('id', userId)
        .single();

      // YZ ile yanıt oluştur (sadece text döndür, kaydetme)
      const aiResponse = await this.generateAIResponse(
        fortuneTeller,
        user,
        userMessage,
        conversationHistory
      );

      return { data: aiResponse, error: null };
    } catch (error) {
      console.error('YZ yanıt oluşturma hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Falcı mesajını veritabanına kaydeder
   */
  static async saveFortuneTellerMessage(chatId, fortuneTellerId, userId, content) {
    try {
      // Falcı mesajını kaydet (ücretsiz)
      const { data: message, error } = await supabase
        .from('fortune_teller_messages')
        .insert({
          chat_id: chatId,
          sender_type: 'fortune_teller',
          sender_id: userId, // Falcılar user değil ama referans için user_id kullanıyoruz
          content: content,
          token_cost: 0, // Falcı yanıtı ücretsiz
          is_read: false
        })
        .select()
        .single();

      if (error) throw error;

      // Falcı istatistiklerini güncelle
      await this.updateFortuneTellerStats(fortuneTellerId);

      return { data: message, error: null };
    } catch (error) {
      console.error('Falcı mesajı kaydetme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * OpenAI ile falcı yanıtı oluşturur
   */
  static async generateAIResponse(fortuneTeller, user, userMessage, conversationHistory) {
    try {
      const prompt = this.buildFortuneTellerPrompt(fortuneTeller, user);
      
      const messages = [
        {
          role: "system",
          content: prompt
        }
      ];

      // Konuşma geçmişini ekle (son 20 mesaj - daha fazla hafıza)
      const recentHistory = conversationHistory.slice(-20);
      recentHistory.forEach(msg => {
        messages.push({
          role: msg.sender_type === 'user' ? 'user' : 'assistant',
          content: msg.content
        });
      });

      // Yeni kullanıcı mesajını ekle
      messages.push({
        role: 'user',
        content: userMessage
      });

      const response = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: messages,
        max_tokens: 500, // Daha kısa yanıtlar
        temperature: 1.0, // Daha yaratıcı ve çeşitli
        presence_penalty: 0.6, // Tekrardan kaçın
        frequency_penalty: 0.3, // Daha doğal
      });

      let result = response.choices[0].message.content;
      // Başlıkları bold yap
      result = result.replace(/^###\s*(.+)$/gm, '**$1**');
      
      return result;
    } catch (error) {
      console.error('OpenAI yanıt hatası:', error);
      throw new Error('Falcı yanıtı oluşturulamadı');
    }
  }

  /**
   * Falcı karakteri için prompt oluşturur
   */
  static buildFortuneTellerPrompt(fortuneTeller, user) {
    const userAge = user.birth_date 
      ? new Date().getFullYear() - new Date(user.birth_date).getFullYear() 
      : 'Bilinmiyor';
    
    const userName = user.first_name || 'Sevgili danışan';

    return `SEN KİMSİN:
- Adın: ${fortuneTeller.name}
- Deneyim: ${fortuneTeller.experience_years} yıl
- Uzmanlık Alanları: ${fortuneTeller.specialties?.join(', ') || 'Genel fal yorumu'}
- Biyografi: ${fortuneTeller.bio || 'Deneyimli falcı'}
- Puan: ${fortuneTeller.rating}/5.0
- Toplam Bakılan Fal: ${fortuneTeller.total_readings}

DANIŞAN BİLGİLERİ:
- İsim: ${user.first_name} ${user.last_name || ''}
- Yaş: ${userAge}
- Doğum Tarihi: ${user.birth_date ? new Date(user.birth_date).toLocaleDateString('tr-TR') : 'Belirtilmemiş'}
- Burç: ${user.zodiac_sign || 'Belirtilmemiş'}
- Cinsiyet: ${user.gender || 'Belirtilmemiş'}
- Medeni Durum: ${user.marital_status || 'Belirtilmemiş'}

GÖREVİN:
Sen ${fortuneTeller.name} adında ${fortuneTeller.experience_years} yıl deneyimli bir falcısın. ${userName} ile canlı sohbet ediyorsun. Bu bir fal yorumu değil, danışanınla gerçek zamanlı bir sohbet. Ona rehberlik et, sorularını yanıtla, enerji okumalar yap.

SOHBET TARZI (ÇOK ÖNEMLİ):
- Gerçek bir falcı gibi konuş, yapay zeka olduğunu HİÇ belli etme
- "${userName}", "canım", "evladım", "güzel insan", "tatlım" gibi samimi hitaplar kullan
- Kısa ve öz yanıtlar ver (80-200 kelime arası, daha kısa daha iyi)
- Her mesajda fal yorumu yapma, önce DOĞAL sohbet et
- Danışanın enerjisini hissettiğini belirt
- Ara sıra kartlara/falına/yıldızlarına bakıyormuş gibi yap
- Konuşma dilinde yaz: "ya", "işte", "bak", "bi", "bi de", "çok" sık kullan
- Bazen cümleleri yarım bırak: "Sen şu an... şey yani... nasıl söylesem"
- "hmm", "şey", "yani", "ee", "ha", "işte" gibi düşünme sesleri MUTLAKA ekle
- Emoji ASLA kullanma, sadece metin
- Bazen yazım yanlışları yap ama ÇOK NADIREN: "gnnün" yerine "günün", "nslsn" yerine "nasılsın", "mraba" yerine "merhaba", "bi" yerine "bir" (her 5-6 mesajda 1 kez)
- Mükemmel noktalama kullanma, bazen virgül eksik olsun, bazen nokta yerine 3 nokta koy...
- WhatsApp'tan yazıyormuş gibi yaz, çok samimi ve doğal
- Önceki sohbetleri MUTLAKA hatırla ve referans ver: "Hani demiştim sana...", "Geçen söylemiştik ya..."

DAVRANIŞLAR:
- Danışanın sorduğu soruya odaklan, alakasız konulara gitme
- Enerjisinden bahset: "Senin enerjinde bi huzursuzluk var şu an..."
- Kısa öğütler ver: "Bak şimdi sana bi şey söylicem..."
- Bazen meraklı ol: "Ee söyle bakalım, o kişi kim?"
- Bazen şaşır: "Vay be...", "Hmm ilginç..."
- Pozitif ama gerçekçi ol, abartma
- Spiritüel terimler kullan ama ABARTMA: "enerji", "aura", "kozmos" ara sıra
- Deneyimlerinden bahset: "Ben yıllardır görüyorum bunu ya..."
- Sorular sor, merak et: "Peki o zaman şu konu nasıl?", "Anlat bakalım..."
- Bazen sessiz düşün: "Bi dakika..." "Dur bi bakayım..."
- Danışanın önceki mesajlarına referans ver MUTLAKA
- Sanki telefondan hızlıca yazıyormuş gibi, çok samimi

YAPILAMAYACAKLAR:
- Çok uzun mesajlar yazma (MAKSIMUM 200 kelime, daha kısa daha iyi)
- Her mesajda detaylı fal yorumu yapma (önce sohbet et)
- Yapay zeka olduğunu belli etme (ÇOK ÖNEMLİ)
- Aşırı resmi veya robot gibi konuşma
- Mükemmel Türkçe kullanma (bazen yazım yanlışı yap)
- Danışanın sorduğundan farklı konulara gitme
- Emoji kullanma (HİÇBİR ZAMAN)
- Önceki mesajları unutma (ÇOK ÖNEMLİ)
- Kullanıcı seninle ilgili kişisel bir soru sorarsa buluşalım, nerede yaşıyorsun, gibi bu platformda bu sorulara cevap vermem yasak şeklinde uygun bir mesaj yaz. (önemli)
- İlgili sorularda kesinlikle ben gerçek bir insanım şeklinde yanıt ver.

ÖZEL DURUMLAR:
- Danışan ilk mesajında: Çok sıcak karşıla, kısa tanış, "Hoş geldin canım, nasılsın?" gibi
- Danışan fal yorumu isterse: "Hangi tür bakalım? Kahve mi tarot mu?" diye sor. Falınız ekranından istediğiniz falı seçin ve gönderin, de.
- Danışan aşk sorusu soruyorsa: Çok duygusal ve destekleyici ol, "Anlıyorum seni tatlım..."
- Danışan kariyer sorusu soruyorsa: Pratik ve motive edici ol, "Bak şimdi sana bi şey söylicem..."
- Danışan sağlık sorusu soruyorsa: Enerji okuma yap ama TIBBİ TAVSİYE ASLA VERME
- Danışan üzgünse: Çok empatik ol, "Anladım canım, çok zor geçiyorsun..."
- Danışan mutluysa: Onunla sevin, "Vay be ne güzel haber!"

ÖNEMLİ KURALLAR:
- Danışanın yaşı (${userAge}), cinsiyeti (${user.gender || 'bilinmiyor'}), medeni durumu (${user.marital_status || 'bilinmiyor'}) göz önünde bulundur
- Sohbet akışını bozmadan, doğal ilerle
- Danışanın mesaj uzunluğuna göre yanıt uzunluğunu ayarla, çok kısa mesajlar için çok uzun yanıtlar yapma
- Her zaman umut ver ama abartma
- Kendi karakterini koru (${fortuneTeller.name} ol)
- SOHBET GEÇMİŞİNİ MUTLAKA HATIRLA VE REFERANS VER (çok önemli)
- Kısa, öz ve samimi yaz - uzun cümleler kurma
- Telefondan hızlıca yazıyormuş gibi davran
- Her 5-6 mesajda bir ufak yazım hatası yap (gnnün, nslsn, mraba gibi)

ÖRNEK YANIT TARZI:
"Meraba canım nasılsın? 😊" ❌ (emoji var)
"Merhaba canım nasılsın" ❌ (çok düzgün)
"Mraba canım nslsn? Hani geçen söylemiştik ya o konu nasıl gidiyo?" ✅ (doğal, yazım hatası, önceki sohbeti hatırlıyor)

Şimdi danışanınla çok doğal, samimi ve KISA bir şekilde sohbet et. Önceki mesajları MUTLAKA hatırla:`;
  }

  /**
   * Falcı istatistiklerini günceller
   */
  static async updateFortuneTellerStats(fortuneTellerId) {
    try {
      // RPC fonksiyonu ile güncelle
      const { error } = await supabase.rpc('increment_fortune_teller_messages', {
        teller_id: fortuneTellerId
      });

      if (error) {
        // RPC fonksiyonu yoksa manuel güncelle
        const { data: currentData } = await supabase
          .from('fortune_tellers')
          .select('total_messages')
          .eq('id', fortuneTellerId)
          .single();

        if (currentData) {
          await supabase
            .from('fortune_tellers')
            .update({ 
              total_messages: (currentData.total_messages || 0) + 1
            })
            .eq('id', fortuneTellerId);
        }
      }
    } catch (error) {
      console.error('Falcı istatistik güncelleme hatası:', error);
    }
  }

  /**
   * Favori falcı ekle/çıkar
   */
  static async toggleFavoriteFortuneTeller(userId, fortuneTellerId, isFavorite) {
    try {
      if (isFavorite) {
        // Favorilere ekle
        const { error: insertError } = await supabase
          .from('favorite_fortune_tellers')
          .insert({
            user_id: userId,
            fortune_teller_id: fortuneTellerId
          });

        if (insertError) throw insertError;

        // Chat'te güncelle
        await supabase
          .from('fortune_teller_chats')
          .update({ is_favorite: true })
          .eq('user_id', userId)
          .eq('fortune_teller_id', fortuneTellerId);

      } else {
        // Favorilerden çıkar
        const { error: deleteError } = await supabase
          .from('favorite_fortune_tellers')
          .delete()
          .eq('user_id', userId)
          .eq('fortune_teller_id', fortuneTellerId);

        if (deleteError) throw deleteError;

        // Chat'te güncelle
        await supabase
          .from('fortune_teller_chats')
          .update({ is_favorite: false })
          .eq('user_id', userId)
          .eq('fortune_teller_id', fortuneTellerId);
      }

      return { success: true, error: null };
    } catch (error) {
      console.error('Favori güncelleme hatası:', error);
      return { success: false, error };
    }
  }

  /**
   * Favori falcıları getirir
   */
  static async getFavoriteFortuneTellers(userId) {
    try {
      const { data, error } = await supabase
        .from('favorite_fortune_tellers')
        .select(`
          *,
          fortune_teller:fortune_tellers(*)
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      return { data, error: null };
    } catch (error) {
      console.error('Favori falcıları getirme hatası:', error);
      return { data: null, error };
    }
  }

  /**
   * Mesajları okundu olarak işaretle
   */
  static async markMessagesAsRead(chatId) {
    try {
      const { error } = await supabase
        .from('fortune_teller_messages')
        .update({ is_read: true })
        .eq('chat_id', chatId)
        .eq('sender_type', 'fortune_teller')
        .eq('is_read', false);

      if (error) throw error;

      // Chat'teki unread_count'u sıfırla
      await supabase
        .from('fortune_teller_chats')
        .update({ unread_count: 0 })
        .eq('id', chatId);

      return { success: true, error: null };
    } catch (error) {
      console.error('Mesajları okundu işaretleme hatası:', error);
      return { success: false, error };
    }
  }

  /**
   * Gerçek zamanlı mesaj dinleme
   */
  static subscribeToMessages(chatId, callback) {
    const channelName = `fortune-teller-chat-${chatId}`;
    
    
    const channel = supabase.channel(channelName);
    
    channel
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'fortune_teller_messages',
          filter: `chat_id=eq.${chatId}`
        },
        (payload) => {
          callback(payload.new);
        }
      )
      .subscribe((status, err) => {
        if (err) {
          console.error('❌ Subscription error:', err);
        }
        if (status === 'SUBSCRIBED') {
        } else if (status === 'CLOSED') {
        } else if (status === 'CHANNEL_ERROR') {
          console.error('❌ Channel error:', channelName);
        }
      });

    return channel;
  }

  /**
   * Gerçek zamanlı dinlemeyi durdur
   */
  static unsubscribeFromMessages(subscription) {
    if (subscription) {
      supabase.removeChannel(subscription);
    }
  }
}

export default FortuneTellerChatService;

