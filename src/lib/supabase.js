import { createClient } from '@supabase/supabase-js';

// Supabase bağlantı bilgileri
const supabaseUrl = process.env.REACT_APP_SUPABASE_URL || 'https://zlvnrpodpccvmvptxumg.supabase.co';
const supabaseAnonKey = process.env.REACT_APP_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Inpsdm5ycG9kcGNjdm12cHR4dW1nIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTI0MTM1ODQsImV4cCI6MjA2Nzk4OTU4NH0.k-x6WBinSeuEVn8kZH6nrP9W4xuayQy33TvnQ00ClPw';

// Supabase istemcisini oluştur
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
  },
});

// Auth işlemleri için yardımcı fonksiyonlar
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
          return { user: { ...user, profile: null }, error: null };
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