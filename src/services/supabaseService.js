import 'react-native-url-polyfill/auto';
import { supabase } from '../../lib/supabase';
import { decode } from 'base64-arraybuffer';

// Fal yorumları servisleri
export const createFortuneReview = async (fortuneId, userId, rating, reviewText = null) => {
  try {
    const { data, error } = await supabase
      .from('fortune_reviews')
      .insert({
        fortune_id: fortuneId,
        user_id: userId,
        rating,
        review_text: reviewText,
      })
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Yorum oluşturma hatası:', error);
    return { data: null, error: error.message };
  }
};

export const updateFortuneReview = async (reviewId, rating, reviewText = null) => {
  try {
    const { data, error } = await supabase
      .from('fortune_reviews')
      .update({
        rating,
        review_text: reviewText,
      })
      .eq('id', reviewId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Yorum güncelleme hatası:', error);
    return { data: null, error: error.message };
  }
};

export const getUserFortuneReview = async (fortuneId, userId) => {
  try {
    const { data, error } = await supabase
      .from('fortune_reviews')
      .select('*')
      .eq('fortune_id', fortuneId)
      .eq('user_id', userId)
      .single();

    return { data, error };
  } catch (error) {
    console.error('Kullanıcı yorumu alma hatası:', error);
    return { data: null, error: error.message };
  }
};

export const getAllFortuneReviews = async (fortuneId) => {
  try {
    const { data, error } = await supabase
      .from('fortune_reviews')
      .select(`
        *,
        user:user_id (
          first_name,
          last_name,
          profile_image
        )
      `)
      .eq('fortune_id', fortuneId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Fal yorumları alma hatası:', error);
    return { data: null, error: error.message };
  }
};

// Admin paneli için tüm yorumları getir
export const getAllReviewsForAdmin = async (page = 0, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('fortune_reviews')
      .select(`
        *,
        user:user_id (
          first_name,
          last_name,
          full_name,
          email
        ),
        fortune:fortune_id (
          category,
          status,
          created_at,
          fortune_teller:fortune_teller_id (
            name
          )
        )
      `)
      .order('created_at', { ascending: false })
      .range(page * limit, (page + 1) * limit - 1);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Admin yorumları alma hatası:', error);
    return { data: null, error: error.message };
  }
};

// Auth işlemleri için yardımcı fonksiyonlar
export const signUp = async (email, password, firstName, lastName, birthDate) => {
  try {
    // Kullanıcı kaydı - sadece Supabase Auth ile
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
    });

    if (authError) throw authError;

    // Kullanıcı profil bilgilerini users tablosunda güncelle
    if (authData?.user) {
      const { error: updateError } = await supabase
        .from('users')
        .update({
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
          birth_date: birthDate,
          token_balance: 0,
          is_admin: false,
        })
        .eq('id', authData.user.id);

      if (updateError) throw updateError;
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
      .select('*')
      .order('rating', { ascending: false })
      .limit(limit);
    
    if (fortuneTellersError) throw fortuneTellersError;
    
    // UI için uygun formata dönüştür
    const formattedTellers = fortuneTellers.map(teller => ({
      id: teller.id,
      name: teller.name,
      avatar: teller.profile_image,
      rating: teller.rating,
      experience: teller.experience_years,
      specialty: teller.specialties?.[0] || '',
      price: teller.price_per_fortune,
      available: teller.is_available
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
        profiles:user_id (
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
      name: post.profiles?.full_name || `${post.profiles?.first_name || ''} ${post.profiles?.last_name || ''}`.trim(),
      avatar: post.profiles?.profile_image,
      time: formatTimeAgo(post.created_at),
      imageUrl: post.image_url,
      description: post.content,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      type: 'user_post'
    }));
    
    return { data: formattedPosts, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Falcı postlarını getir
export const getFortuneTellerPosts = async (limit = 10, page = 0) => {
  const offset = page * limit;
  
  try {
    const { data: posts, error: postsError } = await supabase
      .from('fortune_teller_posts')
      .select(`
        *,
        fortune_tellers!fortune_teller_posts_fortune_teller_id_fkey (
          id,
          name,
          profile_image,
          specialties,
          rating,
          rank
        )
      `)
      .eq('is_published', true)
      .order('created_at', { ascending: false })
      .range(offset, offset + limit - 1);
    
    if (postsError) throw postsError;
    
    // UI için uygun formata dönüştür
    const formattedPosts = posts.map(post => ({
      id: post.id,
      fortuneTellerId: post.fortune_teller_id,
      name: post.fortune_tellers?.name || 'Falcı',
      avatar: post.fortune_tellers?.profile_image,
      time: formatTimeAgo(post.created_at),
      imageUrl: post.image_url,
      title: post.title,
      description: post.content,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      category: post.category || 'general',
      type: 'fortune_teller_post',
      isFeatured: post.is_featured || false,
      fortuneTeller: {
        id: post.fortune_teller_id,
        name: post.fortune_tellers?.name,
        profile_image: post.fortune_tellers?.profile_image,
        specialties: post.fortune_tellers?.specialties,
        rating: post.fortune_tellers?.rating,
        rank: post.fortune_tellers?.rank
      }
    }));
    
    return { data: formattedPosts, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Öne çıkan gönderileri getir
export const getFeaturedPosts = async (limit = 3) => {
  try {
    const { data: posts, error: postsError } = await supabase
      .from('fortune_teller_posts')
      .select(`
        *,
        fortune_tellers!fortune_teller_posts_fortune_teller_id_fkey (
          id,
          name,
          profile_image,
          specialties,
          rating,
          rank
        )
      `)
      .eq('is_published', true)
      .eq('is_featured', true)
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (postsError) throw postsError;
    
    // UI için uygun formata dönüştür
    const formattedPosts = posts.map(post => ({
      id: post.id,
      fortuneTellerId: post.fortune_teller_id,
      name: post.fortune_tellers?.name || 'Falcı',
      avatar: post.fortune_tellers?.profile_image,
      time: formatTimeAgo(post.created_at),
      imageUrl: post.image_url,
      title: post.title,
      description: post.content,
      likes: post.likes_count || 0,
      comments: post.comments_count || 0,
      category: post.category || 'general',
      type: 'fortune_teller_post',
      isFeatured: post.is_featured || false,
      fortuneTeller: {
        id: post.fortune_teller_id,
        name: post.fortune_tellers?.name,
        profile_image: post.fortune_tellers?.profile_image,
        specialties: post.fortune_tellers?.specialties,
        rating: post.fortune_tellers?.rating,
        rank: post.fortune_tellers?.rank
      }
    }));
    
    return { data: formattedPosts, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Tüm postları (kullanıcı + falcı) birleştir
export const getAllPosts = async (limit = 10, page = 0) => {
  try {
    const [userPostsResult, fortuneTellerPostsResult] = await Promise.all([
      getPosts(limit, page),
      getFortuneTellerPosts(limit, page)
    ]);

    if (userPostsResult.error) throw userPostsResult.error;
    if (fortuneTellerPostsResult.error) throw fortuneTellerPostsResult.error;

    // Tüm postları birleştir ve tarihe göre sırala
    const allPosts = [
      ...userPostsResult.data,
      ...fortuneTellerPostsResult.data
    ].sort((a, b) => {
      const dateA = a.created_at || new Date(a.time).getTime();
      const dateB = b.created_at || new Date(b.time).getTime();
      return dateB - dateA;
    });

    return { data: allPosts, error: null };
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
        profiles:user_id (
          id, 
          first_name, 
          last_name, 
          full_name, 
          profile_image
        )
      `)
      .gt('expires_at', now) // Süresi dolmamış hikayeler
      .order('created_at', { ascending: false })
      .limit(limit);
    
    if (storiesError) throw storiesError;
    
    // UI için uygun formata dönüştür
    const formattedStories = stories.map(story => ({
      id: story.id,
      name: story.profiles?.full_name || `${story.profiles?.first_name || ''} ${story.profiles?.last_name || ''}`.trim(),
      avatar: story.profiles?.profile_image,
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

// Gönderi beğen - Post tipine göre doğru tabloyu kullanır
export const likePost = async (userId, postId, postType = 'user_post') => {
  try {
    // Post tipine göre doğru tabloları belirle
    const isUserPost = postType === 'user_post';
    const likesTable = isUserPost ? 'likes' : 'fortune_teller_post_likes';
    const rpcFunction = isUserPost ? 'increment_post_likes' : 'increment_fortune_teller_post_likes';
    const decrementRpcFunction = isUserPost ? 'decrement_post_likes' : 'decrement_fortune_teller_post_likes';
    
    // Önce bu kullanıcının bu gönderiyi daha önce beğenip beğenmediğini kontrol et
    const { data: existingLike, error: checkError } = await supabase
      .from(likesTable)
      .select('*')
      .eq('user_id', userId)
      .eq('post_id', postId)
      .maybeSingle();
    
    if (checkError) throw checkError;
    
    // Eğer daha önce beğenilmişse, beğeniyi kaldır
    if (existingLike) {
      const { error: unlikeError } = await supabase
        .from(likesTable)
        .delete()
        .eq('id', existingLike.id);
      
      if (unlikeError) throw unlikeError;
      
      // Gönderi beğeni sayısını azalt
      const { error: updateError } = await supabase.rpc(decrementRpcFunction, { post_id: postId });
      if (updateError) throw updateError;
      
      return { liked: false, error: null };
    } 
    // Beğenilmemişse, beğeni ekle
    else {
      const { error: likeError } = await supabase
        .from(likesTable)
        .insert({
          user_id: userId,
          post_id: postId,
          created_at: new Date().toISOString()
        });
      
      if (likeError) throw likeError;
      
      // Gönderi beğeni sayısını artır
      const { error: updateError } = await supabase.rpc(rpcFunction, { post_id: postId });
      if (updateError) throw updateError;
      
      // Günlük görev ilerlemesini güncelle
      try {
        await supabase.rpc('update_daily_task_progress', {
          p_user_id: userId,
          p_task_type: 'post_liked',
          p_increment: 1
        });
        
        // Seviye 3 için etkileşim görevini de güncelle
        await supabase.rpc('update_daily_task_progress', {
          p_user_id: userId,
          p_task_type: 'post_interaction',
          p_increment: 1
        });
      } catch (taskError) {
        console.warn('Günlük görev güncellenirken hata:', taskError);
        // Beğeni işlemi başarılıysa görev hatası işlemi durdurmasın
      }
      
      return { liked: true, error: null };
    }
  } catch (error) {
    return { liked: null, error };
  }
};

// Kullanıcının gönderiyi beğenip beğenmediğini kontrol et - Post tipine göre doğru tabloyu kullanır
export const checkIfLiked = async (userId, postId, postType = 'user_post') => {
  try {
    // Post tipine göre doğru tabloyu belirle
    const likesTable = postType === 'user_post' ? 'likes' : 'fortune_teller_post_likes';
    
    const { data, error } = await supabase
      .from(likesTable)
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

// ===== REVENUECAT ENTEGRASYONU VE ABONELIK SERVISLERI =====

// Ürün kimliğini standart forma çevir (mini_monthly, standart_monthly, premium_monthly)
const normalizeSubscriptionType = (productId) => {
  if (!productId || typeof productId !== 'string') return productId;
  const id = productId.toLowerCase();
  if (id.includes('premium')) return 'premium_monthly';
  if (id.includes('standart') || id.includes('standard')) return 'standart_monthly';
  if (id.includes('mini')) return 'mini_monthly';
  // Bazı mağaza kimlikleri paket öneki içerebilir: com.app.premium_monthly
  const last = id.split('.').pop();
  if (last === 'premium_monthly' || last === 'standart_monthly' || last === 'mini_monthly') return last;
  return productId;
};

// Kullanıcının mevcut aktif aboneliğini getir
export const getCurrentSubscription = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Kullanıcının abonelik durumunu kontrol et (güncellenmiş)
export const checkUserSubscription = async (userId) => {
  try {
    // Önce users tablosundan is_premium durumunu kontrol et
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('is_premium, subscription_type, subscription_end_date')
      .eq('id', userId)
      .single();
    
    if (profileError) throw profileError;
    
    // Eğer users tablosunda is_premium true ise, subscription tablosunu da kontrol et
    if (profileData?.is_premium) {
      const { data: subscriptionData, error: subscriptionError } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('user_id', userId)
        .eq('status', 'active')
        .gte('current_period_end', new Date().toISOString())
        .single();
      
      // Subscription tablosunda kayıt yoksa veya hata varsa, users tablosundaki bilgiyi kullan
      if (subscriptionError && subscriptionError.code === 'PGRST116') {
        return { 
          isPremium: true, 
          subscriptionType: normalizeSubscriptionType(profileData.subscription_type), 
          expiresAt: profileData.subscription_end_date, 
          isTrial: false, 
          subscriptionData: null,
          error: null 
        };
      }
      
      if (subscriptionError) throw subscriptionError;
      
      return { 
        isPremium: true, 
        subscriptionType: normalizeSubscriptionType(subscriptionData?.product_id || profileData.subscription_type), 
        expiresAt: subscriptionData?.current_period_end || profileData.subscription_end_date, 
        isTrial: subscriptionData?.is_trial || false, 
        subscriptionData: subscriptionData,
        error: null 
      };
    }
    
    // users tablosunda is_premium false ise, subscription tablosunu da kontrol et
    const { data: subscriptionData, error: subscriptionError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .gte('current_period_end', new Date().toISOString())
      .single();
    
    if (subscriptionError && subscriptionError.code !== 'PGRST116') throw subscriptionError;
    
    const isPremium = !!subscriptionData;
    const subscriptionType = normalizeSubscriptionType(subscriptionData?.product_id || profileData?.subscription_type || null);
    const expiresAt = subscriptionData?.current_period_end || profileData?.subscription_end_date || null;
    const isTrial = subscriptionData?.is_trial || false;
    
    return { 
      isPremium, 
      subscriptionType, 
      expiresAt, 
      isTrial, 
      subscriptionData: subscriptionData,
      error: null 
    };
  } catch (error) {
    return { 
      isPremium: false, 
      subscriptionType: null, 
      expiresAt: null, 
      isTrial: false, 
      subscriptionData: null,
      error 
    };
  }
};

// Abonelik oluştur/güncelle
export const createOrUpdateSubscription = async (subscriptionData) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .upsert({
        user_id: subscriptionData.user_id,
        subscription_id: subscriptionData.subscription_id,
        product_id: subscriptionData.product_id,
        platform: subscriptionData.platform,
        status: subscriptionData.status,
        is_trial: subscriptionData.is_trial,
        trial_end_date: subscriptionData.trial_end_date,
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        cancel_at_period_end: subscriptionData.cancel_at_period_end,
        cancelled_at: subscriptionData.cancelled_at,
        revenuecat_customer_id: subscriptionData.revenuecat_customer_id,
        original_purchase_date: subscriptionData.original_purchase_date,
        auto_renew: subscriptionData.auto_renew,
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    // Kullanıcı tablosunu da güncelle
    if (data) {
      await supabase
        .from('users')
        .update({
          is_premium: subscriptionData.status === 'active',
          subscription_end_date: subscriptionData.current_period_end,
          subscription_type: normalizeSubscriptionType(subscriptionData.product_id),
          subscription_auto_renew: subscriptionData.auto_renew
        })
        .eq('id', subscriptionData.user_id);
    }
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Ödeme işlemi kaydet
export const createPaymentTransaction = async (transactionData) => {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .insert({
        user_id: transactionData.user_id,
        subscription_id: transactionData.subscription_id,
        transaction_id: transactionData.transaction_id,
        original_transaction_id: transactionData.original_transaction_id,
        product_id: transactionData.product_id,
        type: transactionData.type,
        amount: transactionData.amount,
        currency: transactionData.currency,
        platform: transactionData.platform,
        platform_transaction_id: transactionData.platform_transaction_id,
        receipt_data: transactionData.receipt_data,
        status: transactionData.status,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Abonelik iptal et
export const cancelSubscription = async (userId, subscriptionId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        cancel_at_period_end: true,
        cancelled_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionId)
      .select()
      .single();
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Abonelik yenile
export const renewSubscription = async (userId, subscriptionData) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        current_period_start: subscriptionData.current_period_start,
        current_period_end: subscriptionData.current_period_end,
        is_trial: false,
        status: 'active',
        updated_at: new Date().toISOString()
      })
      .eq('user_id', userId)
      .eq('subscription_id', subscriptionData.subscription_id)
      .select()
      .single();
    
    // Kullanıcı tablosunu da güncelle
    if (data) {
      await supabase
        .from('users')
        .update({
          is_premium: true,
          subscription_end_date: subscriptionData.current_period_end,
          subscription_type: normalizeSubscriptionType(subscriptionData.product_id)
        })
        .eq('id', userId);
    }
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Abonelik geçmişini getir
export const getSubscriptionHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Ödeme işlemleri geçmişini getir
export const getPaymentHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('payment_transactions')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Abonelik avantajlarını getir
export const getSubscriptionBenefits = async (subscriptionType) => {
  try {
    const { data, error } = await supabase
      .from('subscription_benefits')
      .select('*')
      .eq('subscription_type', subscriptionType);
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
};

// Jeton bakiyesini güncelle (abonelik bonus jetonları için)
export const updateTokenBalance = async (userId, amount, transactionType, reference) => {
  try {
    // Mevcut bakiyeyi al
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();
    
    if (userError) throw userError;
    
    const newBalance = (userData.token_balance || 0) + amount;
    
    // Bakiyeyi güncelle
    const { error: updateError } = await supabase
      .from('users')
      .update({ token_balance: newBalance })
      .eq('id', userId);
    
    if (updateError) throw updateError;
    
    // İşlemi kaydet
    const { error: transactionError } = await supabase
      .from('token_transactions')
      .insert({
        user_id: userId,
        amount: amount,
        transaction_type: transactionType,
        reference_id: reference,
        created_at: new Date().toISOString()
      });
    
    if (transactionError) throw transactionError;
    
    return { data: { newBalance }, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Abonelik durumuna göre kullanıcı izinlerini kontrol et
export const checkSubscriptionPermissions = async (userId, action) => {
  try {
    const { isPremium, subscriptionType } = await checkUserSubscription(userId);
    
    if (!isPremium) {
      return { hasPermission: false, reason: 'No active subscription' };
    }
    
    switch (action) {
      case 'post_to_explore':
        return { 
          hasPermission: ['standart_monthly', 'premium_monthly'].includes(subscriptionType),
          reason: subscriptionType === 'mini_monthly' ? 'Upgrade to Standard or Premium' : null
        };
      case 'priority_fortune_reading':
        return { 
          hasPermission: subscriptionType === 'premium_monthly',
          reason: subscriptionType !== 'premium_monthly' ? 'Upgrade to Premium' : null
        };
      case 'token_discount':
        return { 
          hasPermission: true,
          discountRate: subscriptionType === 'mini_monthly' ? 10 : 
                       subscriptionType === 'standart_monthly' ? 15 : 20
        };
      default:
        return { hasPermission: isPremium, reason: null };
    }
  } catch (error) {
    return { hasPermission: false, reason: error.message };
  }
};

// Gönderi yorumlarını getir - Post tipine göre doğru tabloyu kullanır
export const getComments = async (postId, postType = 'user_post') => {
  try {
    // Post tipine göre doğru tabloyu belirle
    const commentsTable = postType === 'user_post' ? 'comments' : 'fortune_teller_post_comments';
    
    const { data, error } = await supabase
      .from(commentsTable)
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          full_name,
          profile_image
        )
      `)
      .eq('post_id', postId)
      .order('created_at', { ascending: true });
    
    if (error) throw error;
    
    // UI için uygun formata dönüştür
    const formattedComments = data.map(comment => ({
      id: comment.id,
      content: comment.content,
      createdAt: comment.created_at,
      user: {
        id: comment.profiles.id,
        name: comment.profiles.full_name || `${comment.profiles.first_name || ''} ${comment.profiles.last_name || ''}`.trim(),
        avatar: comment.profiles.profile_image
      }
    }));
    
    return { data: formattedComments, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Yorum ekle - Post tipine göre doğru tabloyu kullanır
export const addComment = async (userId, postId, content, postType = 'user_post') => {
  try {
    // Post tipine göre doğru tabloları belirle
    const isUserPost = postType === 'user_post';
    const commentsTable = isUserPost ? 'comments' : 'fortune_teller_post_comments';
    const rpcFunction = isUserPost ? 'increment_post_comments' : 'increment_fortune_teller_post_comments';
    
    // Yorum ekle
    const { data: commentData, error: commentError } = await supabase
      .from(commentsTable)
      .insert({
        user_id: userId,
        post_id: postId,
        content,
        created_at: new Date().toISOString()
      })
      .select(`
        *,
        profiles:user_id (
          id,
          first_name,
          last_name,
          full_name,
          profile_image
        )
      `)
      .single();
    
    if (commentError) throw commentError;
    
    // Post yorum sayısını artır
    const { error: updateError } = await supabase.rpc(rpcFunction, { post_id: postId });
    if (updateError) throw updateError;
    
    // Günlük görev ilerlemesini güncelle (seviye 3 için etkileşim görevi)
    try {
      await supabase.rpc('update_daily_task_progress', {
        p_user_id: userId,
        p_task_type: 'post_interaction',
        p_increment: 1
      });
    } catch (taskError) {
      console.warn('Günlük görev güncellenirken hata:', taskError);
      // Yorum işlemi başarılıysa görev hatası işlemi durdurmasın
    }
    
    // UI için uygun formata dönüştür
    const formattedComment = {
      id: commentData.id,
      content: commentData.content,
      createdAt: commentData.created_at,
      user: {
        id: commentData.profiles.id,
        name: commentData.profiles.full_name || `${commentData.profiles.first_name || ''} ${commentData.profiles.last_name || ''}`.trim(),
        avatar: commentData.profiles.profile_image
      }
    };
    
    return { data: formattedComment, error: null };
  } catch (error) {
    return { data: null, error };
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
        user_id: fortuneTellerId, // Falcı ID'sini user_id alanında saklıyoruz
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
      .eq('user_id', fortuneTellerId) // Falcı ID'si user_id alanında saklanıyor
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

// ==================== SOHBET SİSTEMİ FONKSİYONLARI ====================

// Kullanıcı arama fonksiyonu
export const searchUsersForChat = async (searchTerm, currentUserId, limit = 10) => {
  try {
    const { data, error } = await supabase.rpc('search_users_for_chat', {
      p_search_term: searchTerm,
      p_current_user_id: currentUserId,
      p_limit: limit
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Mesaj isteği gönderme
export const sendMessageRequest = async (senderId, receiverId, messageContent) => {
  try {
    const { data, error } = await supabase.rpc('send_message_request', {
      p_sender_id: senderId,
      p_receiver_id: receiverId,
      p_message_content: messageContent
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Mesaj isteğini kabul etme
export const acceptMessageRequest = async (requestId, userId) => {
  try {
    const { data, error } = await supabase.rpc('accept_message_request', {
      p_request_id: requestId,
      p_user_id: userId
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Mesaj isteğini reddetme
export const rejectMessageRequest = async (requestId, userId) => {
  try {
    const { data, error } = await supabase.rpc('reject_message_request', {
      p_request_id: requestId,
      p_user_id: userId
    });

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

  // Kullanıcının mesaj isteklerini getir
  export const getMessageRequests = async (userId, status = 'pending') => {
    try {
      const { data, error } = await supabase
        .from('message_requests')
        .select(`
          *,
          sender:users!message_requests_sender_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            profile_image,
            email
          ),
          receiver:users!message_requests_receiver_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            profile_image,
            email
          )
        `)
        .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
        .eq('status', status)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return { data, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // Kullanıcının konuşmalarını getir
  export const getConversations = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('conversations')
        .select(`
          *,
          user1:users!conversations_user1_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            profile_image,
            email,
            online_status,
            last_seen
          ),
          user2:users!conversations_user2_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            profile_image,
            email,
            online_status,
            last_seen
          )
        `)
        .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
        .eq('is_active', true)
        .order('last_message_time', { ascending: false });

      if (error) throw error;

      // Konuşma partnerini belirle
      const formattedConversations = data.map(conv => {
        const partner = conv.user1_id === userId ? conv.user2 : conv.user1;
        return {
          id: conv.id,
          partner,
          lastMessage: conv.last_message,
          lastMessageTime: conv.last_message_time,
          unreadCount: conv.unread_count,
          isActive: conv.is_active
        };
      });

      return { data: formattedConversations, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

  // İki kullanıcı arasındaki mesajları getir
  export const getMessages = async (user1Id, user2Id, limit = 50, offset = 0) => {
    try {
      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:users!messages_sender_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            profile_image
          ),
          receiver:users!messages_receiver_id_fkey (
            id,
            first_name,
            last_name,
            full_name,
            profile_image
          )
        `)
        .or(`and(sender_id.eq.${user1Id},receiver_id.eq.${user2Id}),and(sender_id.eq.${user2Id},receiver_id.eq.${user1Id})`)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false })
        .range(offset, offset + limit - 1);

      if (error) throw error;

      // Mesajları tarih sırasına göre döndür (en eski önce)
      const sortedMessages = data.reverse().map(msg => ({
        id: msg.id,
        content: msg.content,
        imageUrl: msg.image_url,
        videoUrl: msg.video_url,
        sender: msg.sender,
        receiver: msg.receiver,
        isRead: msg.read,
        createdAt: msg.created_at,
        messageType: msg.message_type,
        replyToId: msg.reply_to_id
      }));

      return { data: sortedMessages, error: null };
    } catch (error) {
      return { data: null, error };
    }
  };

// Mesaj gönderme
export const sendMessage = async (senderId, receiverId, content, imageUrl = null, videoUrl = null, replyToId = null) => {
  try {
    // Yeni fonksiyonu kullan
    const { data, error } = await supabase.rpc('send_message_with_conversation', {
      p_sender_id: senderId,
      p_receiver_id: receiverId,
      p_content: content
    });

    if (error) throw error;

    // Mesaj detaylarını getir (foreign key olmadan)
    const { data: message, error: messageError } = await supabase
      .from('messages')
      .select('*')
      .eq('id', data)
      .single();

    if (messageError) throw messageError;

    return { data: message, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Mesajları okundu olarak işaretle
export const markMessagesAsRead = async (userId, otherUserId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ read: true })
      .eq('receiver_id', userId)
      .eq('sender_id', otherUserId)
      .eq('read', false);

    if (error) throw error;

    // Konuşmadaki okunmamış mesaj sayısını sıfırla
    await supabase
      .from('conversations')
      .update({ unread_count: 0 })
      .or(`and(user1_id.eq.${userId},user2_id.eq.${otherUserId}),and(user1_id.eq.${otherUserId},user2_id.eq.${userId})`);

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Kullanıcının online durumunu güncelle
export const updateUserOnlineStatus = async (userId, status = 'online') => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ 
        online_status: status,
        last_seen: new Date().toISOString()
      })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Sohbet ayarlarını güncelle
export const updateChatSettings = async (userId, chatEnabled) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .update({ chat_enabled: chatEnabled })
      .eq('id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Mesaj silme (soft delete)
export const deleteMessage = async (messageId, userId) => {
  try {
    const { data, error } = await supabase
      .from('messages')
      .update({ is_deleted: true })
      .eq('id', messageId)
      .eq('sender_id', userId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Konuşma arşivleme
export const archiveConversation = async (conversationId, userId) => {
  try {
    const { data, error } = await supabase
      .from('conversations')
      .update({ is_active: false })
      .eq('id', conversationId)
      .or(`user1_id.eq.${userId},user2_id.eq.${userId}`)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Real-time mesaj dinleme
export const subscribeToMessages = (userId, callback) => {
  return supabase
    .channel('messages')
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'messages',
      filter: `receiver_id=eq.${userId}`
    }, callback)
    .subscribe();
};

// Real-time konuşma güncellemelerini dinleme
export const subscribeToConversations = (userId, callback) => {
  return supabase
    .channel('conversations')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'conversations',
      filter: `user1_id=eq.${userId} OR user2_id=eq.${userId}`
    }, callback)
    .subscribe();
};

// Real-time mesaj isteklerini dinleme
export const subscribeToMessageRequests = (userId, callback) => {
  return supabase
    .channel('message_requests')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'message_requests',
      filter: `receiver_id=eq.${userId} OR sender_id=eq.${userId}`
    }, callback)
    .subscribe();
};

// Kullanıcı online durumu dinleme
export const subscribeToUserStatus = (userId, callback) => {
  return supabase
    .channel('user_status')
    .on('postgres_changes', {
      event: 'UPDATE',
      schema: 'public',
      table: 'users',
      filter: `id=eq.${userId}`
    }, callback)
    .subscribe();
};

// Tüm real-time abonelikleri kapat
export const unsubscribeFromAll = () => {
  return supabase.removeAllChannels();
}; 

// ==================== FALCI HİKAYELERİ SİSTEMİ ====================

// Tüm aktif falcı hikayelerini getir
export const getAllFortuneTellerStories = async () => {
  try {
    const now = new Date().toISOString();
    
    const { data: stories, error } = await supabase
      .from('fortune_teller_stories')
      .select(`
        *,
        fortune_tellers (
          id,
          name,
          profile_image,
          specialties
        )
      `)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // UI için uygun formata dönüştür
    const formattedStories = stories.map(story => ({
      id: story.id,
      fortuneTellerId: story.fortune_teller_id,
      fortuneTellerName: story.fortune_tellers?.name || 'Falcı',
      fortuneTellerAvatar: story.fortune_tellers?.profile_image,
      fortuneTellerSpecialties: story.fortune_tellers?.specialties || [],
      mediaUrl: story.media_url,
      mediaType: story.media_type,
      duration: story.duration || 15,
      caption: story.caption,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      viewCount: story.view_count || 0
    }));

    return { data: formattedStories, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Belirli bir falcının hikayelerini getir
export const getFortuneTellerStoriesById = async (fortuneTellerId) => {
  try {
    const now = new Date().toISOString();
    
    const { data: stories, error } = await supabase
      .from('fortune_teller_stories')
      .select(`
        *,
        fortune_tellers (
          id,
          name,
          profile_image,
          specialties
        )
      `)
      .eq('fortune_teller_id', fortuneTellerId)
      .eq('is_active', true)
      .gt('expires_at', now)
      .order('created_at', { ascending: false });

    if (error) throw error;

    // UI için uygun formata dönüştür
    const formattedStories = stories.map(story => ({
      id: story.id,
      fortuneTellerId: story.fortune_teller_id,
      fortuneTellerName: story.fortune_tellers?.name || 'Falcı',
      fortuneTellerAvatar: story.fortune_tellers?.profile_image,
      fortuneTellerSpecialties: story.fortune_tellers?.specialties || [],
      mediaUrl: story.media_url,
      mediaType: story.media_type,
      duration: story.duration || 15,
      caption: story.caption,
      createdAt: story.created_at,
      expiresAt: story.expires_at,
      viewCount: story.view_count || 0
    }));

    return { data: formattedStories, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Admin: Falcı hikayesi oluştur
export const createFortuneTellerStory = async (fortuneTellerId, mediaUrl, mediaType, caption = null, duration = 15) => {
  try {
    // Admin kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı girişi gerekli');

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error('Bu işlem için admin yetkisi gerekli');
    }

    const { data, error } = await supabase
      .from('fortune_teller_stories')
      .insert({
        fortune_teller_id: fortuneTellerId,
        media_url: mediaUrl,
        media_type: mediaType,
        caption: caption,
        duration: duration,
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 saat sonra
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Admin: Falcı hikayesi güncelle
export const updateFortuneTellerStory = async (storyId, updateData) => {
  try {
    // Admin kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı girişi gerekli');

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error('Bu işlem için admin yetkisi gerekli');
    }

    const { data, error } = await supabase
      .from('fortune_teller_stories')
      .update(updateData)
      .eq('id', storyId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Admin: Falcı hikayesi sil
export const deleteFortuneTellerStory = async (storyId) => {
  try {
    // Admin kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı girişi gerekli');

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error('Bu işlem için admin yetkisi gerekli');
    }

    const { data, error } = await supabase
      .from('fortune_teller_stories')
      .delete()
      .eq('id', storyId)
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Hikaye görüntüleme kaydı oluştur
export const recordStoryView = async (storyId, userId, viewDuration = 15, completed = false) => {
  try {
    const { data, error } = await supabase
      .from('story_views')
      .upsert({
        story_id: storyId,
        user_id: userId,
        view_duration: viewDuration,
        completed: completed
      }, {
        onConflict: 'story_id,user_id',
        ignoreDuplicates: false
      })
      .select()
      .single();

    if (error) throw error;

    return { data, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Kullanıcının hikaye görüntüleme durumunu kontrol et
export const checkStoryViewStatus = async (storyId, userId) => {
  try {
    const { data, error } = await supabase
      .from('story_views')
      .select('*')
      .eq('story_id', storyId)
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error; // PGRST116 = no rows returned

    return { 
      data: data || null, 
      error: null,
      hasViewed: !!data,
      isCompleted: data?.completed || false
    };
  } catch (error) {
    return { data: null, error, hasViewed: false, isCompleted: false };
  }
};

// Hikaye istatistiklerini getir (admin için)
export const getStoryStatistics = async (storyId) => {
  try {
    // Admin kontrolü
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Kullanıcı girişi gerekli');

    const { data: profile } = await supabase
      .from('users')
      .select('is_admin')
      .eq('id', user.id)
      .single();

    if (!profile?.is_admin) {
      throw new Error('Bu işlem için admin yetkisi gerekli');
    }

    // Hikaye detayları
    const { data: story, error: storyError } = await supabase
      .from('fortune_teller_stories')
      .select('*')
      .eq('id', storyId)
      .single();

    if (storyError) throw storyError;

    // Görüntüleme istatistikleri
    const { data: views, error: viewsError } = await supabase
      .from('story_views')
      .select('*')
      .eq('story_id', storyId);

    if (viewsError) throw viewsError;

    // İstatistikleri hesapla
    const totalViews = views.length;
    const completedViews = views.filter(v => v.completed).length;
    const averageViewDuration = views.length > 0 
      ? views.reduce((sum, v) => sum + v.view_duration, 0) / views.length 
      : 0;

    const statistics = {
      story: story,
      totalViews: totalViews,
      completedViews: completedViews,
      completionRate: totalViews > 0 ? (completedViews / totalViews) * 100 : 0,
      averageViewDuration: Math.round(averageViewDuration),
      views: views
    };

    return { data: statistics, error: null };
  } catch (error) {
    return { data: null, error };
  }
};

// Falcı hikayeleri için real-time dinleme
export const subscribeToFortuneTellerStories = (callback) => {
  return supabase
    .channel('fortune_teller_stories')
    .on('postgres_changes', {
      event: '*',
      schema: 'public',
      table: 'fortune_teller_stories'
    }, callback)
    .subscribe();
};

// Hikaye görüntülemeleri için real-time dinleme
export const subscribeToStoryViews = (storyId, callback) => {
  return supabase
    .channel(`story_views_${storyId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'story_views',
      filter: `story_id=eq.${storyId}`
    }, callback)
    .subscribe();
};

// Storage işlemleri

// Resim upload fonksiyonu
export const uploadPostImage = async (uri, userId) => {
  try {
    
    // Dosya adını oluştur (benzersiz)
    const timestamp = Date.now();
    const fileName = `${userId}/${timestamp}.jpg`;
    
    // React Native'den dosyayı oku
    const response = await fetch(uri);
    const blob = await response.blob();
    
    // ArrayBuffer'a çevir
    const arrayBuffer = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsArrayBuffer(blob);
    });
    
    
    // Supabase Storage'a upload et
    const { data, error } = await supabase.storage
      .from('posts')
      .upload(fileName, arrayBuffer, {
        contentType: 'image/jpeg',
        upsert: false
      });
    
    if (error) {
      console.error('❌ Upload hatası:', error);
      throw error;
    }
    
    // Public URL al
    const { data: publicUrlData } = supabase.storage
      .from('posts')
      .getPublicUrl(fileName);
    
    
    return {
      success: true,
      url: publicUrlData.publicUrl,
      path: fileName,
      error: null
    };
    
  } catch (error) {
    console.error('❌ Upload fonksiyonu hatası:', error);
    return {
      success: false,
      url: null,
      path: null,
      error: error.message
    };
  }
};

// Resim silme fonksiyonu
export const deletePostImage = async (imagePath) => {
  try {
    const { data, error } = await supabase.storage
      .from('posts')
      .remove([imagePath]);
    
    if (error) throw error;
    
    return { success: true, error: null };
  } catch (error) {
    console.error('Resim silme hatası:', error);
    return { success: false, error: error.message };
  }
};

// Storage URL'den path çıkarma
export const getPathFromStorageUrl = (url) => {
  try {
    if (!url || !url.includes('/storage/v1/object/public/posts/')) {
      return null;
    }
    
    const parts = url.split('/storage/v1/object/public/posts/');
    return parts[1] || null;
  } catch (error) {
    console.error('URL parse hatası:', error);
    return null;
  }
}; 

/**
 * Kullanıcı profil bilgilerini alır (AI fal için gerekli bilgiler)
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<Object>} Kullanıcı bilgileri
 */
export const getUserProfileForFortune = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select(`
        first_name,
        last_name,
        birth_date,
        birth_place,
        zodiac_sign,
        rising_sign,
        gender,
        marital_status
      `)
      .eq('id', userId)
      .single();

    if (error) throw error;
    
    return data;
  } catch (error) {
    console.error('Kullanıcı profil bilgileri alınamadı:', error);
    throw error;
  }
}; 

/**
 * Burç yorumları için günlük hak kontrolü
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<Object>} Günlük hak durumu
 */
export const checkHoroscopeDailyLimit = async (userId) => {
  try {
    
    // Kullanıcının günlük burç yorumu sayısını ve son sıfırlama tarihini al
    const { data: userData, error } = await supabase
      .from('users')
      .select('horoscope_daily_count, horoscope_last_reset')
      .eq('id', userId)
      .single();

    if (error) throw error;



    const today = new Date().toISOString().split('T')[0]; // YYYY-MM-DD formatı
    const lastReset = userData.horoscope_last_reset;
    

    
    // Eğer bugün ilk kez kullanılıyorsa veya farklı bir günse sayacı sıfırla
    if (!lastReset || lastReset !== today) {

      await supabase
        .from('users')
        .update({
          horoscope_daily_count: 0,
          horoscope_last_reset: today
        })
        .eq('id', userId);
      
      const result = {
        canUse: true,
        remainingCount: 3,
        totalCount: 3,
        resetDate: today
      };

      return result;
    }

    const currentCount = userData.horoscope_daily_count || 0;
    const remainingCount = Math.max(0, 3 - currentCount);

    const result = {
      canUse: remainingCount > 0,
      remainingCount,
      totalCount: 3,
      resetDate: today
    };
    

    return result;
  } catch (error) {
    console.error('Burç yorumu günlük limit kontrolü hatası:', error);
    throw error;
  }
};

/**
 * Burç yorumu kullanıldığında sayacı artır
 * @param {string} userId - Kullanıcı ID'si
 * @returns {Promise<Object>} Güncellenmiş durum
 */
export const incrementHoroscopeDailyCount = async (userId) => {
  try {
    // Önce mevcut sayıyı al
    const { data: currentData, error: fetchError } = await supabase
      .from('users')
      .select('horoscope_daily_count')
      .eq('id', userId)
      .single();

    if (fetchError) throw fetchError;

    const currentCount = currentData.horoscope_daily_count || 0;
    const newCount = currentCount + 1;

    // Yeni sayıyı güncelle
    const { data, error } = await supabase
      .from('users')
      .update({
        horoscope_daily_count: newCount
      })
      .eq('id', userId)
      .select('horoscope_daily_count')
      .single();

    if (error) throw error;

    return {
      success: true,
      newCount: data.horoscope_daily_count,
      remainingCount: Math.max(0, 3 - data.horoscope_daily_count)
    };
  } catch (error) {
    console.error('Burç yorumu sayacı artırma hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcının burç yorumu geçmişini al
 * @param {string} userId - Kullanıcı ID'si
 * @param {number} limit - Limit sayısı
 * @returns {Promise<Array>} Burç yorumu geçmişi
 */
export const getHoroscopeHistory = async (userId, limit = 10) => {
  try {
    const { data, error } = await supabase
      .from('fortunes')
      .select(`
        id,
        description,
        fortune_text,
        created_at,
        special_data
      `)
      .eq('user_id', userId)
      .eq('category', 'burç yorumları')
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;

    return data.map(fortune => ({
      ...fortune,
      special_data: fortune.special_data ? JSON.parse(fortune.special_data) : {}
    }));
  } catch (error) {
    console.error('Burç yorumu geçmişi alma hatası:', error);
    throw error;
  }
};

// =============================================================================
// 3 GÜNLÜK ÜCRETSİZ DENEME SERVİSLERİ
// =============================================================================

/**
 * Kullanıcının deneme durumunu kontrol eder
 */
export const checkUserTrialStatus = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('check_trial_status', {
      user_id: userId
    });

    if (error) throw error;

    const result = data[0] || {};
    return {
      canStartTrial: result.can_start_trial || false,
      isTrialActive: result.is_trial_active || false,
      trialRemainingDays: result.trial_remaining_days || 0,
      trialEndDate: result.trial_end_date || null
    };
  } catch (error) {
    console.error('Deneme durumu kontrol hatası:', error);
    throw error;
  }
};

/**
 * 3 günlük ücretsiz deneme başlatır
 */
export const startUserFreeTrial = async (userId) => {
  try {
    const { data, error } = await supabase.rpc('start_free_trial', {
      user_id: userId
    });

    if (error) throw error;

    const result = data[0] || {};
    return {
      success: result.success || false,
      message: result.message || '',
      trialEndDate: result.trial_end_date || null
    };
  } catch (error) {
    console.error('Deneme başlatma hatası:', error);
    throw error;
  }
};

/**
 * Deneme süresini sonlandırır
 */
export const endUserTrial = async (userId, reason = 'expired') => {
  try {
    const { data, error } = await supabase.rpc('end_trial', {
      user_id: userId,
      reason: reason
    });

    if (error) throw error;
    return { success: true };
  } catch (error) {
    console.error('Deneme sonlandırma hatası:', error);
    throw error;
  }
};

/**
 * Kullanıcının deneme geçmişini alır
 */
export const getUserTrialHistory = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('user_trials')
      .select('*')
      .eq('user_id', userId)
      .single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  } catch (error) {
    console.error('Deneme geçmişi alma hatası:', error);
    throw error;
  }
};

/**
 * Premium deneme durumunu kontrol eder (checkUserSubscription ile entegreli)
 */
export const checkUserSubscriptionWithTrial = async (userId) => {
  try {
    // Mevcut abonelik kontrolü
    const subscriptionInfo = await checkUserSubscription(userId);
    
    // Deneme durumu kontrolü
    const trialStatus = await checkUserTrialStatus(userId);
    
    // Eğer aktif deneme varsa, premium durumunu güncelle
    if (trialStatus.isTrialActive) {
      return {
        ...subscriptionInfo,
        isPremium: true,
        subscriptionType: 'premium_trial',
        isTrial: true,
        isFreeTrial: true,
        trialEndDate: trialStatus.trialEndDate,
        trialRemainingDays: trialStatus.trialRemainingDays
      };
    }
    
    return {
      ...subscriptionInfo,
      isTrial: false,
      isFreeTrial: false,
      trialEndDate: null,
      trialRemainingDays: 0
    };
  } catch (error) {
    console.error('Premium deneme durumu kontrol hatası:', error);
    throw error;
  }
};

// ==================== FAL EK SORU FONKSİYONLARI ====================

/**
 * Fal için ek soru oluşturur
 * @param {string} fortuneId - Fal ID
 * @param {string} userId - Kullanıcı ID
 * @param {string} questionText - Soru metni
 * @param {boolean} isAdBased - Reklam bazlı soru mu?
 * @returns {Promise<Object>} Oluşturulan soru
 */
export const createFortuneQuestion = async (fortuneId, userId, questionText, isAdBased = false) => {
  try {
    // Önce fal sahibi kontrolü yap
    const { data: fortune, error: fortuneError } = await supabase
      .from('fortunes')
      .select('user_id, status')
      .eq('id', fortuneId)
      .eq('user_id', userId)
      .single();

    if (fortuneError || !fortune) {
      throw new Error('Fal bulunamadı veya erişim yetkisi yok');
    }

    if (fortune.status !== 'tamamlandı') {
      throw new Error('Sadece tamamlanan fallar için ek soru sorabilirsiniz');
    }

    let profile = null;
    
    // Jeton bazlı sorular için jeton kontrolü yap
    if (!isAdBased) {
      // Kullanıcının jeton bakiyesini kontrol et
      const { data: profileData, error: profileError } = await supabase
        .from('users')
        .select('token_balance')
        .eq('id', userId)
        .single();

      if (profileError || !profileData) {
        throw new Error('Kullanıcı profili bulunamadı');
      }

      if (profileData.token_balance < 5) {
        throw new Error('Yetersiz jeton. Ek soru için 5 jeton gereklidir.');
      }
      
      profile = profileData;
    }

    // Soru sırasını hesapla
    const { data: existingQuestions, error: countError } = await supabase
      .from('fortune_questions')
      .select('question_order')
      .eq('fortune_id', fortuneId)
      .order('question_order', { ascending: false })
      .limit(1);

    if (countError) {
      console.error('Soru sayısı alınamadı:', countError);
    }

    const nextOrder = existingQuestions?.length > 0 ? existingQuestions[0].question_order + 1 : 1;

    // 5-10 dakika arası random süre hesapla
    const randomMinutes = Math.floor(Math.random() * 6) + 5; // 5-10 dakika
    const processAfter = new Date(Date.now() + randomMinutes * 60 * 1000);

    // Soruyu oluştur
    const { data: question, error: questionError } = await supabase
      .from('fortune_questions')
      .insert({
        fortune_id: fortuneId,
        user_id: userId,
        question_text: questionText,
        question_order: nextOrder,
        status: 'cevaplanıyor',
        process_after: processAfter.toISOString(),
        ad_based: isAdBased
      })
      .select()
      .single();

    if (questionError) {
      throw questionError;
    }

    // Sadece jeton bazlı sorular için jeton düş
    if (!isAdBased && profile) {
      // Kullanıcının jeton bakiyesinden 5 jeton düş
      const { error: tokenError } = await supabase
        .from('users')
        .update({
          token_balance: profile.token_balance - 5
        })
        .eq('id', userId);

      if (tokenError) {
        // Soru oluşturuldu ama jeton düşürülemedi, soruyu sil
        await supabase
          .from('fortune_questions')
          .delete()
          .eq('id', question.id);
        
        throw new Error('Jeton düşürülemedi, işlem iptal edildi');
      }
    }

    return { data: question, error: null };
  } catch (error) {
    console.error('Fal sorusu oluşturma hatası:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Fal sorularını getirir
 * @param {string} fortuneId - Fal ID
 * @param {string} userId - Kullanıcı ID (güvenlik kontrolü için)
 * @returns {Promise<Object>} Sorular listesi
 */
export const getFortuneQuestions = async (fortuneId, userId) => {
  try {
    const { data, error } = await supabase
      .from('fortune_questions')
      .select('*')
      .eq('fortune_id', fortuneId)
      .eq('user_id', userId)
      .order('question_order', { ascending: true });

    if (error) {
      throw error;
    }

    return { data: data || [], error: null };
  } catch (error) {
    console.error('Fal soruları getirme hatası:', error);
    return { data: [], error: error.message };
  }
};

/**
 * Fal sorusunu günceller (AI cevabı ekler)
 * @param {string} questionId - Soru ID
 * @param {string} answerText - AI cevabı
 * @returns {Promise<Object>} Güncellenen soru
 */
export const updateFortuneQuestionAnswer = async (questionId, answerText) => {
  try {
    const { data, error } = await supabase
      .from('fortune_questions')
      .update({
        answer_text: answerText,
        status: 'tamamlandı',
        answered_at: new Date().toISOString()
      })
      .eq('id', questionId)
      .select()
      .single();

    if (error) {
      throw error;
    }

    return { data, error: null };
  } catch (error) {
    console.error('Fal sorusu cevap güncelleme hatası:', error);
    return { data: null, error: error.message };
  }
};

/**
 * Kullanıcının jeton bakiyesini getirir
 * @param {string} userId - Kullanıcı ID
 * @returns {Promise<number>} Jeton bakiyesi
 */
export const getUserTokenBalance = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('users')
      .select('token_balance')
      .eq('id', userId)
      .single();

    if (error) {
      throw error;
    }

    return data?.token_balance || 0;
  } catch (error) {
    console.error('Jeton bakiyesi getirme hatası:', error);
    return 0;
  }
}; 

// ==================== BİLDİRİM YÖNETİMİ ====================

// Kullanıcının bildirimlerini getir
export const getUserNotifications = async (userId, limit = 50) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Kullanıcı bildirimleri yüklenirken hata:', error);
    return { data: null, error };
  }
};

// Kullanıcının okunmamış bildirim sayısını getir
export const getUnreadNotificationCount = async (userId) => {
  try {
    const { count, error } = await supabase
      .from('notifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('read', false);

    if (error) throw error;
    return { count, error: null };
  } catch (error) {
    console.error('Okunmamış bildirim sayısı alınırken hata:', error);
    return { count: 0, error };
  }
};

// Bildirimi okundu olarak işaretle
export const markNotificationAsRead = async (notificationId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', notificationId)
      .select()
      .single();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Bildirim okundu işaretlenirken hata:', error);
    return { data: null, error };
  }
};

// Tüm bildirimleri okundu olarak işaretle
export const markAllNotificationsAsRead = async (userId) => {
  try {
    const { data, error } = await supabase
      .from('notifications')
      .update({ read: true })
      .eq('user_id', userId)
      .eq('read', false)
      .select();

    if (error) throw error;
    return { data, error: null };
  } catch (error) {
    console.error('Tüm bildirimler okundu işaretlenirken hata:', error);
    return { data: null, error };
  }
};