import 'react-native-url-polyfill/auto';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { createClient } from '@supabase/supabase-js';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '@env';


// Supabase URL ve anahtarı doğrudan tanımla (sorun olursa)
const SUPABASE_URL_DIRECT = 'https://zlvnrpodpccvmvptxumg.supabase.co';
const SUPABASE_ANON_KEY_DIRECT = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsdm5ycG9kcGNjdm12cHR4dW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM1ODQsImV4cCI6MjA2Nzk4OTU4NH0.k-x6WBinSeuEVn8kZH6nrP9W4xuayQy33TvnQ00ClPw';

// Supabase istemcisini oluştur
export const supabase = createClient(
  SUPABASE_URL || SUPABASE_URL_DIRECT, 
  SUPABASE_ANON_KEY || SUPABASE_ANON_KEY_DIRECT, 
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    },
  }
);


// Auth işlemleri için yardımcı fonksiyonlar
export const signUp = async (email, password, firstName, lastName, birthDate) => {
  try {
    // Kullanıcı kaydı - OTP doğrulama ile
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          full_name: `${firstName} ${lastName}`,
        },
        emailRedirectTo: null, // E-posta bağlantısı yerine OTP kodu gönder
      }
    });

    if (authError) throw authError;
    
    // Kayıt başarılı, e-posta doğrulaması bekleniyor
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
    

    if (error) {
      return { data: null, error };
    }
    
    return { data, error: null };
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
      
      try {
        // Kullanıcı profil bilgilerini getir
        const { data: profile, error: profileError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();
        
        if (profileError) {
          
          // Kullanıcı metadata bilgilerini al
          const metadata = user.user_metadata || {};
          const firstName = metadata.first_name || metadata.given_name || '';
          const lastName = metadata.last_name || metadata.family_name || '';
          const fullName = metadata.full_name || `${firstName} ${lastName}`.trim() || user.email.split('@')[0];
          const avatarUrl = metadata.avatar_url || null;
          
          // Database şemasına uygun yeni kullanıcı profili oluştur
          const newUser = {
            id: user.id,
            email: user.email,
            phone: metadata.phone || null,
            first_name: firstName,
            last_name: lastName,
            full_name: fullName,
            birth_date: metadata.birth_date || new Date().toISOString().split('T')[0],
            profile_image: avatarUrl,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            token_balance: 10, // Yeni kullanıcıya 10 jeton hediye
            is_fortune_teller: false,
            is_admin: false
          };
          
          
          // Users tablosuna yeni kullanıcıyı ekle
          const { data: newProfile, error: insertError } = await supabase
            .from('users')
            .insert(newUser)
            .select()
            .single();
            
          if (insertError) {
            return { user: { ...user, profile: null }, error: null };
          }
          
          
          // Hoş geldin jetonlarını kaydet
          if (newProfile) {
            const tokenTransaction = {
              user_id: user.id,
              amount: 10,
              transaction_type: 'welcome_bonus',
              created_at: new Date().toISOString()
            };
            
            const { error: tokenError } = await supabase
              .from('token_transactions')
              .insert(tokenTransaction);
          }
          
          return { user: { ...user, profile: newProfile }, error: null };
        }
        
        return { user: { ...user, profile }, error: null };
      } catch (profileError) {
        return { user: { ...user, profile: null }, error: null };
      }
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
      options: {
        redirectTo: 'faluygulamasi://auth/callback',
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      }
    });
    
    return { data, error };
  } catch (error) {
    return { data: null, error };
  }
}; 