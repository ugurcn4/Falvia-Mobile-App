import { GoogleSignin } from '@react-native-google-signin/google-signin';
import { supabase } from '../../lib/supabase';
import { Platform } from 'react-native';

// Google Sign-In konfigürasyonu
export const configureGoogleSignIn = () => {
  const config = {
    webClientId: '741465424937-54n7m9pc6t9kos6mgj7f95j7dv8hm4q6.apps.googleusercontent.com', // Web client ID
    androidClientId: '741465424937-gughbf1br8gt2sblsr3h6v9vi0doffd5.apps.googleusercontent.com', // Android client ID'yi buraya ekleyin
    offlineAccess: true,
    hostedDomain: '',
    forceCodeForRefreshToken: true,
  };
  
  GoogleSignin.configure(config);
};

// Debug bilgileri için Google config durumunu kontrol et
export const checkGoogleSignInConfig = async () => {
  try {
    
    // Play Services kontrolü (sadece Android için)
    if (Platform.OS === 'android') {
      const hasPlayServices = await GoogleSignin.hasPlayServices();
    }
    
    // Mevcut signin durumu
    const isSignedIn = await GoogleSignin.isSignedIn();
    
    if (isSignedIn) {
      const currentUser = await GoogleSignin.getCurrentUser();
    }
    
    return {
      platform: Platform.OS,
      hasPlayServices: Platform.OS === 'android' ? await GoogleSignin.hasPlayServices() : true,
      isSignedIn,
      isConfigured: true
    };
  } catch (error) {
    console.error('🔴 Google config kontrol hatası:', error);
    return {
      platform: Platform.OS,
      hasPlayServices: false,
      isSignedIn: false,
      isConfigured: false,
      error: error.message
    };
  }
};

// Google ile giriş yapma
export const signInWithGoogle = async () => {
  try {
    
    // Google Play Services kontrolü
    await GoogleSignin.hasPlayServices();
    
    // Google Sign-In işlemi
    const userInfo = await GoogleSignin.signIn();
    
    // Response yapısını handle et - yeni yapı: userInfo.data.user
    const actualUser = userInfo?.user || userInfo?.data?.user;
    const actualToken = userInfo?.data?.idToken || userInfo?.idToken;
    
    
    // Kullanıcı iptal ettiyse durumu kontrol et
    if (!userInfo || !actualUser) {
      
      // Eğer userInfo var ama user yok ise, farklı bir sorun
      if (userInfo && !actualUser) {
        
      }
      
      throw new Error('SIGNIN_CANCELLED');
    }

    // Google'dan ID token al - önce response'tan, sonra getTokens'tan
    let idToken = actualToken;
    
    if (!idToken) {
      const tokens = await GoogleSignin.getTokens();
      idToken = tokens.idToken;
    }
    
    if (!idToken) {
      throw new Error('TOKEN_ERROR');
    }
    

    // Supabase ile Google Sign-In
    const { data, error } = await supabase.auth.signInWithIdToken({
      provider: 'google',
      token: idToken,
    });

    if (error) {
      throw error;
    }
    
    // Normalize edilmiş userInfo return et
    const normalizedUserInfo = {
      user: actualUser,
      type: userInfo.type,
      data: userInfo.data
    };
    
    return { data, userInfo: normalizedUserInfo };
    
  } catch (error) {
    
    // Spesifik hata türlerini kontrol et
    if (error.code === 'SIGN_IN_CANCELLED' || error.message === 'SIGNIN_CANCELLED') {
      throw new Error('SIGN_IN_CANCELLED');
    }
    
    if (error.code === 'IN_PROGRESS') {
      throw new Error('SIGN_IN_IN_PROGRESS');
    }
    
    if (error.code === 'PLAY_SERVICES_NOT_AVAILABLE') {
      throw new Error('PLAY_SERVICES_NOT_AVAILABLE');
    }
    
    // Diğer hatalar
    console.error('❌ Bilinmeyen Google Sign-In hatası:', error);
    throw error;
  }
};

// Google ile çıkış yapma
export const signOutFromGoogle = async () => {
  try {
    // Supabase'den çıkış
    await supabase.auth.signOut();
    
    // Google'dan çıkış
    await GoogleSignin.signOut();
  } catch (error) {
    console.error('Google Sign-Out Error:', error);
    throw error;
  }
};

// Kullanıcının Google ile giriş yapıp yapmadığını kontrol etme
export const isSignedIn = async () => {
  try {
    return await GoogleSignin.isSignedIn();
  } catch (error) {
    console.error('Check Sign-In Status Error:', error);
    return false;
  }
};

// Mevcut kullanıcı bilgilerini alma
export const getCurrentUser = async () => {
  try {
    return await GoogleSignin.getCurrentUser();
  } catch (error) {
    console.error('Get Current User Error:', error);
    return null;
  }
}; 

// Google cache'i temizle
export const clearGoogleSignInCache = async () => {
  try {
    const isSignedIn = await GoogleSignin.isSignedIn();
    
    if (isSignedIn) {
      await GoogleSignin.signOut();
    }
    
    return true;
  } catch (error) {
    return false;
  }
}; 