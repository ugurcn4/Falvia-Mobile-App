import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';

// Supabase istemcisini oluştur
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Auth işlemleri için yardımcı fonksiyonlar
export const signUp = async (email, password, firstName, lastName, birthDate) => {
  try {
    // Kullanıcı kaydı
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Kullanıcı profil bilgilerini kaydet
    if (authData?.user) {
      const { error: profileError } = await supabase
        .from('users')
        .insert({
          id: authData.user.id,
          email,
          first_name: firstName,
          last_name: lastName,
          birth_date: birthDate,
          token_balance: 0,
          is_fortune_teller: false,
          is_admin: false,
        });

      if (profileError) throw profileError;
    }

    return { data: authData, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

export const signIn = async (email, password) => {
  try {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const signOut = async () => {
  try {
    const { error } = await supabase.auth.signOut();
    return { error };
  } catch (error) {
    return { error };
  }
};

export const resetPassword = async (email) => {
  try {
    const { data, error } = await supabase.auth.resetPasswordForEmail(email);
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user }, error } = await supabase.auth.getUser();
    
    if (error) throw error;
    
    if (user) {
      // Kullanıcı profil bilgilerini getir
      const { data: profile, error: profileError } = await supabase
        .from('users')
        .select('*')
        .eq('id', user.id)
        .single();
      
      if (profileError) throw profileError;
      
      return { user: { ...user, profile }, error: null };
    }
    
    return { user: null, error: null };
  } catch (error) {
    return { user: null, error };
  }
};

// Google ile giriş için
export const signInWithGoogle = async () => {
  try {
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
    });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// ==================== KEŞFET SAYFASI İÇİN FONKSİYONLAR ====================

// Aktif falcıları getir
export const getFortuneTellers = async (limit = 10) => {
  try {
    // Fortune tellers tablosundan falcıları çek
    const { data: fortuneTellers, error: fortuneTellersError } = await supabase
      .from('fortune_tellers')
      .select(`
        *,
        users:user_id (
          id, 
          first_name, 
          last_name, 
          full_name, 
          profile_image
        )
      `)
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (fortuneTellersError) throw fortuneTellersError;
    
    // UI için uygun formata dönüştür
    const formattedTellers = fortuneTellers.map(teller => ({
      id: teller.id,
      userId: teller.user_id,
      name: teller.users?.full_name || `${teller.users?.first_name || ''} ${teller.users?.last_name || ''}`.trim(),
      avatar: teller.users?.profile_image,
      rating: teller.rating,
      experience: teller.experience_years,
      specialty: teller.specialties?.[0] || '',
      price: teller.price_per_fortune,
      available: true // Gerçek duruma göre ayarlanabilir
    }));
    
    return { data: formattedTellers, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Keşfet sayfası için gönderileri getir
export const getPosts = async (limit = 10, page = 0) => {
  const offset = page * limit;
  
  try {
    const { data: posts, error: postsError } = await supabase
      .from('posts')
      .select(`
        *,
        users:user_id (
          id, 
          first_name, 
          last_name, 
          full_name, 
          profile_image
        )
      `)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (postsError) throw postsError;
    
    // UI için uygun formata dönüştür
    const formattedPosts = posts.map(post => ({
      id: post.id,
      name: post.users?.full_name || `${post.users?.first_name || ''} ${post.users?.last_name || ''}`.trim(),
      avatar: post.users?.profile_image,
      time: formatTimeAgo(post.created_at),
      imageUrl: post.image_url,
      description: post.content,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0
    }));
    
    return { data: formattedPosts, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Hikayeleri getir
export const getStories = async (limit = 20) => {
  try {
    const now = new Date().toISOString();
    
    const { data: stories, error: storiesError } = await supabase
      .from('stories')
      .select(`
        *,
        users:user_id (
          id, 
          first_name, 
          last_name, 
          full_name, 
          profile_image
        )
      `)
      .lt('expires_at', now) // Süresi dolmamış hikayeler
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (storiesError) throw storiesError;
    
    // UI için uygun formata dönüştür
    const formattedStories = stories.map(story => ({
      id: story.id,
      name: story.users?.full_name || `${story.users?.first_name || ''} ${story.users?.last_name || ''}`.trim(),
      avatar: story.users?.profile_image,
      time: formatTimeAgo(story.created_at),
      imageUrl: story.media_url,
      mediaType: story.media_type
    }));
    
    return { data: formattedStories, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Gönderi oluştur
export const createPost = async (userId, imageUrl, content, category = 'general') => {
  try {
    const { data, error } = await supabase
      .from('posts')
      .insert({
        user_id: userId,
        image_url: imageUrl,
        content,
        category,
        likes_count: 0,
        comments_count: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Hikaye oluştur
export const createStory = async (userId, mediaUrl, mediaType = 'image') => {
  try {
    const now = new Date();
    const expiresAt = new Date(now.getTime() + 24 * 60 * 60 * 1000); // 24 saat sonra
    
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: userId,
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: now.toISOString(),
        expires_at: expiresAt.toISOString()
      })
      .select();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Gönderi beğen
export const likePost = async (userId, postId) => {
  try {
    // Önce bu kullanıcının bu gönderiyi daha önce beğenip beğenmediğini kontrol et
    const { data: existingLike, error: checkError } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    // Eğer daha önce beğenilmişse, beğeniyi kaldır
    if (existingLike) {
      const { error: unlikeError } = await supabase
        .from('likes')
        .delete()
        .eq('id', existingLike.id);
      
      if (unlikeError) throw unlikeError;
      
      // Gönderi beğeni sayısını azalt
      const { error: updateError } = await supabase.rpc('decrement_post_likes', { post_id: postId });
      if (updateError) throw updateError;
      
      return { liked: false, error: null };
    } 
    // Beğenilmemişse, beğeni ekle
    else {
      const { error: likeError } = await supabase
        .from('likes')
        .insert({
          user_id: userId,
          post_id: postId,
          created_at: new Date().toISOString()
        });
      
      if (likeError) throw likeError;
      
      // Gönderi beğeni sayısını artır
      const { error: updateError } = await supabase.rpc('increment_post_likes', { post_id: postId });
      if (updateError) throw updateError;
      
      return { liked: true, error: null };
    }
  } catch (error) {
    return { liked: null, error };
  }
};

// Kullanıcının gönderiyi beğenip beğenmediğini kontrol et
export const checkIfLiked = async (userId, postId) => {
  try {
    const { data, error } = await supabase
      .from('likes')
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    
    if (error) throw error;
    
    return { liked: !!data, error: null };
  } catch (error) {
    return { liked: false, error };
  }
};

// ===== FALCİ YÖNETİM SERVİSLERİ (BAĞIMSIZ SİSTEM) =====

// Tüm falcıları listele
export const getAllFortuneTellers = async () => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .select('*')
      .order('rating', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Müsait falcıları listele
export const getAvailableFortuneTellers = async () => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .select('*')
      .eq('is_available', true)
      .order('rating', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Kategoriye göre falcıları listele
export const getFortuneTellersByCategory = async (category) => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .select('*')
      .contains('specialties', [category])
      .eq('is_available', true)
      .order('rating', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Admin için yeni falcı oluştur
export const createFortuneTeller = async (fortuneTellerData) => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .insert({
        name: fortuneTellerData.name,
        profile_image: fortuneTellerData.profile_image,
        bio: fortuneTellerData.bio,
        experience_years: fortuneTellerData.experience_years,
        specialties: fortuneTellerData.specialties,
        rating: fortuneTellerData.rating || 5.0,
        price_per_fortune: fortuneTellerData.price_per_fortune,
        rank: fortuneTellerData.rank || 'başlangıç',
        is_available: fortuneTellerData.is_available !== undefined ? fortuneTellerData.is_available : true,
        total_readings: fortuneTellerData.total_readings || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Admin için falcı güncelle
export const updateFortuneTeller = async (id, updateData) => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .update({
        ...updateData,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Admin için falcı sil
export const deleteFortuneTeller = async (id) => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .delete()
      .eq('id', id);
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Falcı müsaitlik durumu değiştir
export const toggleFortuneTellerAvailability = async (id, isAvailable) => {
  try {
    const { data, error } = await supabase
      .from('fortune_tellers')
      .update({ 
        is_available: isAvailable,
        updated_at: new Date().toISOString()
      })
      .eq('id', id)
      .select();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Falcı için hikaye oluştur
export const createFortunetellerStory = async (fortuneTellerId, mediaUrl, mediaType) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .insert({
        user_id: fortuneTellerId, // Falcı ID'sini user_id olarak kullan
        media_url: mediaUrl,
        media_type: mediaType,
        created_at: new Date().toISOString(),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat sonra
      })
      .select();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Falcı hikayelerini getir
export const getFortuneTellerStories = async (fortuneTellerId) => {
  try {
    const { data, error } = await supabase
      .from('stories')
      .select('*')
      .eq('user_id', fortuneTellerId)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Otomatik fal atama sistemi
export const assignFortuneToRandomTeller = async (fortuneId, category) => {
  try {
    // Kategoriye uygun müsait falcıları bul
    const { data: availableTellers, error: tellersError } = await supabase
      .from('fortune_tellers')
      .select('*')
      .contains('specialties', [category])
      .eq('is_available', true)
      .order('total_readings', { ascending: true }); // En az fal bakan önce
    
    if (tellersError) throw tellersError;
    
    if (!availableTellers || availableTellers.length === 0) {
      throw new Error('Bu kategori için müsait falcı bulunamadı');
    }
    
    // En az fal bakan falcıyı seç
    const selectedTeller = availableTellers[0];
    
    // Falı falcıya ata
    const { data: fortuneData, error: fortuneError } = await supabase
      .from('fortunes')
      .update({
        fortune_teller_id: selectedTeller.id,
        status: 'yorumlanıyor',
        updated_at: new Date().toISOString()
      })
      .eq('id', fortuneId)
      .select();
    
    if (fortuneError) throw fortuneError;
    
    // Falcının toplam fal sayısını artır
    await supabase
      .from('fortune_tellers')
      .update({
        total_readings: selectedTeller.total_readings + 1,
        updated_at: new Date().toISOString()
      })
      .eq('id', selectedTeller.id);
    
    return { data: { fortune: fortuneData, teller: selectedTeller }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Yardımcı fonksiyon - zaman formatı
const formatTimeAgo = (dateString) => {
  const now = new Date();
  const date = new Date(dateString);
  const diffInSeconds = Math.floor((now - date) / 1000);
  
  if (diffInSeconds < 60) {
    return 'Az önce';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes} dakika önce`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours} saat önce`;
  } else if (diffInSeconds < 604800) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days} gün önce`;
  } else {
    const day = date.getDate();
    const month = date.getMonth() + 1;
    const year = date.getFullYear();
    return `${day < 10 ? '0' + day : day}.${month < 10 ? '0' + month : month}.${year}`;
  }
}; 