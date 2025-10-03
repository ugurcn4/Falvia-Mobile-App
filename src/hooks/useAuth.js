import { useState, useEffect, createContext, useContext } from 'react';
import { getCurrentUser, signIn, signOut } from '../lib/supabase';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Sayfa yüklendiğinde kullanıcı durumunu kontrol et
    checkUser();
  }, []);

  const checkUser = async () => {
    try {
      const { user: currentUser, error } = await getCurrentUser();
      if (error) {
        console.error('Auth error:', error);
        setUser(null);
      } else {
        setUser(currentUser);
      }
    } catch (error) {
      console.error('Auth check error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    try {
      const { data, error } = await signIn(email, password);
      if (error) {
        return { error };
      }
      
      // Kullanıcı bilgilerini al
      const { user: currentUser } = await getCurrentUser();
      setUser(currentUser);
      
      return { data, error: null };
    } catch (error) {
      return { error };
    }
  };

  const logout = async () => {
    try {
      const { error } = await signOut();
      if (error) {
        return { error };
      }
      setUser(null);
      return { error: null };
    } catch (error) {
      return { error };
    }
  };

  const isAdmin = () => {
    return user?.profile?.is_admin === true;
  };

  const value = {
    user,
    loading,
    login,
    logout,
    isAdmin,
    checkUser
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}; 