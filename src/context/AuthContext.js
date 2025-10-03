import { createContext, useState, useContext, useEffect } from 'react';
import { supabase, signIn, signUp, signOut, getCurrentUser } from '../../lib/supabase';
import { signInWithGoogle as googleSignIn, configureGoogleSignIn, checkGoogleSignInConfig } from '../services/googleAuthService';

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
    // Google Sign-In konfigürasyonu
    configureGoogleSignIn();
    
    // Debug için Google config durumunu kontrol et (async olarak)
    setTimeout(async () => {
      try {
        await checkGoogleSignInConfig();
      } catch (error) {
      }
    }, 1000);
    
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
      
      // AuthSessionMissingError normal bir durumdur (kullanıcı giriş yapmamış)
      if (userError && userError.message !== 'Auth session missing!') {
        console.error('Auth session check error:', userError);
        setError(userError.message);
      }
      
      if (currentUser) {
        setUser(currentUser);
      }
    } catch (e) {
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
      const { data, userInfo } = await googleSignIn();
      
      if (data?.user) {
        setUser(data.user);
        return true;
      } else {
        setError('Google ile giriş yapılırken bir hata oluştu');
        return false;
      }
    } catch (e) {
      
      // Spesifik hata durumlarını handle et
      if (e.message === 'SIGN_IN_CANCELLED') {
        return false;
      }
      
      if (e.message === 'SIGN_IN_IN_PROGRESS') {
        setError('Google giriş işlemi devam ediyor. Lütfen bekleyin.');
        return false;
      }
      
      if (e.message === 'PLAY_SERVICES_NOT_AVAILABLE') {
        setError('Google Play Services mevcut değil. Lütfen güncelleyin.');
        return false;
      }
      
      // Diğer hatalar için genel mesaj
      setError(e.message || 'Google ile giriş yapılırken bir hata oluştu');
      return false;
    } finally {
      setLoading(false);
    }
  };

  // Kayıt işlemi
  const register = async (name, email, password, birthDate = null) => {
    setLoading(true);
    setError(null);
    
    try {
      
      // Ad ve soyadı ayır
      const nameParts = name.trim().split(' ');
      const firstName = nameParts[0] || '';
      const lastName = nameParts.length > 1 ? nameParts.slice(1).join(' ') : '';
      
      const { data, error: signUpError } = await signUp(
        email, 
        password, 
        firstName, 
        lastName,
        birthDate
      );
      
      if (signUpError) {
        console.error('SignUp hatası:', signUpError);
        setError(signUpError.message || 'Kayıt olurken bir hata oluştu');
        return { data: null, error: signUpError };
      }
      
      // Eğer kullanıcı otomatik olarak giriş yaptıysa, kullanıcı durumunu güncelle
      if (data?.user) {
        const { user: currentUser, error: userError } = await getCurrentUser();
        
        if (!userError && currentUser) {
          setUser(currentUser);
        }
      }
      
      return { data, error: null };
    } catch (e) {
      console.error("Register hatası:", e);
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