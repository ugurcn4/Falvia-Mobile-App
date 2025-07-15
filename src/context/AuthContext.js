import { createContext, useState, useContext, useEffect } from 'react';
import { supabase, signIn, signUp, signOut, getCurrentUser, signInWithGoogle } from '../../lib/supabase';

// Context oluşturma
const AuthContext = createContext();

// Context provider bileşeni
export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [initializing, setInitializing] = useState(true);

  // Uygulama başladığında oturum durumunu kontrol et
  useEffect(() => {
    checkUserSession();
    
    // Supabase auth değişikliklerini dinle
    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'SIGNED_IN' && session) {
          const { user: currentUser } = await getCurrentUser();
          setUser(currentUser);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
        }
      }
    );

    return () => {
      if (authListener && authListener.subscription) {
        authListener.subscription.unsubscribe();
      }
    };
  }, []);

  // Kullanıcı oturum durumunu kontrol et
  const checkUserSession = async () => {
    try {
      setLoading(true);
      const { user: currentUser, error: userError } = await getCurrentUser();
      
      if (userError) throw userError;
      
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
      setInitializing(false);
    }
  };

  // Giriş işlemi
  const login = async (email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      
      const { data, error: signInError } = await signIn(email, password);
      
      if (signInError) {
        setError(signInError.message);
        return false;
      }
      
      if (data?.user) {
        const { user: currentUser, error: userError } = await getCurrentUser();
        
        if (userError) {
          setError(userError.message);
          return false;
        }
        
        setUser(currentUser);
        return true;
      } else {
        const errorMsg = 'Kullanıcı bilgileri alınamadı';
        setError(errorMsg);
        return false;
      }
    } catch (e) {
      setError(e.message || 'Giriş yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Google ile giriş işlemi
  const loginWithGoogle = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { data, error: googleError } = await signInWithGoogle();
      
      if (googleError) throw googleError;
      
      // Google ile giriş başarılı, ancak yönlendirme gerçekleşeceği için
      // burada kullanıcı bilgilerini ayarlamıyoruz.
      // Oturum değişikliği dinleyicisi bunu otomatik olarak yapacaktır.
      
      return true;
    } catch (e) {
      setError(e.message || 'Google ile giriş yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt işlemi
  const register = async (name, email, password) => {
    setLoading(true);
    setError(null);
    
    try {
      
      // Ad ve soyadı ayır
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      // Şu anki tarih
      const birthDate = new Date().toISOString().split('T')[0]; // Varsayılan değer
      
      
      const { data, error: signUpError } = await signUp(
        email, 
        password, 
        firstName, 
        lastName,
        birthDate
      );
      
      if (signUpError) {
        setError(signUpError.message || 'Kayıt olurken bir hata oluştu');
        return { data: null, error: signUpError };
      }
      
      return { data, error: null };
    } catch (e) {
      error("Register hatası:", e);
      setError(e.message || 'Kayıt olurken bir hata oluştu');
      return { data: null, error: e };
    } finally {
      setLoading(false);
    }
  };

  // Çıkış işlemi
  const logout = async () => {
    setLoading(true);
    
    try {
      const { error: signOutError } = await signOut();
      
      if (signOutError) throw signOutError;
      
      setUser(null);
      return true;
    } catch (e) {
      setError(e.message || 'Çıkış yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Context değerlerini sağla
  const authContext = {
    user,
    loading,
    error,
    initializing,
    login,
    loginWithGoogle,
    register,
    logout,
    setUser, // setUser fonksiyonunu dışa açıyoruz
  };

  return (
    <AuthContext.Provider value={authContext}>
      {children}
    </AuthContext.Provider>
  );
};

// Custom hook
export const useAuth = () => {
  return useContext(AuthContext);
};

export default AuthContext; 