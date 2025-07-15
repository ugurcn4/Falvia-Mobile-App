import { useState } from 'react';
import { 
  Text, 
  View, 
  TextInput, 
  TouchableOpacity, 
  KeyboardAvoidingView, 
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { supabase } from '../../lib/supabase';
import { useAuth } from '../context/AuthContext';
import colors from '../styles/colors';
import { verifyEmailStyles } from '../styles/verifyEmailStyles';

const VerifyEmailScreen = ({ navigation, route }) => {
  const { email } = route.params || {};
  const [verificationCode, setVerificationCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { setUser, login } = useAuth();

  // Doğrulama kodunu gönder
  const handleResendCode = async () => {
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email,
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Kod Gönderildi',
        'Doğrulama kodu e-posta adresinize tekrar gönderildi.'
      );
    } catch (error) {
      Alert.alert('Hata', 'Doğrulama kodu gönderilirken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  // Doğrulama kodunu kontrol et
  const handleVerifyCode = async () => {
    if (!verificationCode) {
      Alert.alert('Hata', 'Lütfen doğrulama kodunu girin.');
      return;
    }
    
    setLoading(true);
    
    try {
      // Supabase OTP doğrulaması
      const { data, error } = await supabase.auth.verifyOtp({
        email,
        token: verificationCode,
        type: 'signup',
      });
      
      if (error) throw error;
      
      
      if (data?.session) {
        // Kullanıcı oturumu oluşturuldu, AuthContext'i güncelle
        const { data: userData } = await supabase.auth.getUser();
        if (userData?.user) {
          // AuthContext'teki kullanıcı bilgisini güncelle
          setUser(userData.user);
          
          // Başarılı giriş bildirimi
          Alert.alert(
            'Doğrulama Başarılı',
            'Hesabınız doğrulandı ve giriş yapıldı.'
          );
        }
      } else {
        // Oturum oluşturulamadı, normal giriş yap
        const { success } = await login(email, route.params?.password || '');
        
        if (success) {
          Alert.alert('Doğrulama Başarılı', 'Hesabınız doğrulandı ve giriş yapıldı.');
        } else {
          // Giriş başarısız, giriş sayfasına yönlendir
          Alert.alert(
            'Doğrulama Başarılı',
            'Hesabınız doğrulandı. Lütfen giriş yapın.',
            [
              {
                text: 'Tamam',
                onPress: () => navigation.navigate('Login')
              }
            ]
          );
        }
      }
    } catch (error) {
      Alert.alert('Doğrulama Hatası', 'Geçersiz veya süresi dolmuş doğrulama kodu.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={verifyEmailStyles.container}
    >
      <ScrollView contentContainerStyle={verifyEmailStyles.scrollContainer}>
        <View style={verifyEmailStyles.headerContainer}>
          <Text style={verifyEmailStyles.welcomeText}>E-posta Doğrulama</Text>
          <Text style={verifyEmailStyles.subtitle}>
            {email} adresine gönderilen doğrulama kodunu girin
          </Text>
        </View>
        
        <View style={verifyEmailStyles.formContainer}>
          <View style={verifyEmailStyles.inputContainer}>
            <Ionicons name="key-outline" size={22} color={colors.primary} style={verifyEmailStyles.inputIcon} />
            <TextInput
              style={verifyEmailStyles.input}
              placeholder="Doğrulama Kodu"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="number-pad"
              value={verificationCode}
              onChangeText={setVerificationCode}
            />
          </View>
          
          <TouchableOpacity 
            style={[verifyEmailStyles.verifyButton, loading && verifyEmailStyles.verifyButtonDisabled]}
            onPress={handleVerifyCode}
            disabled={loading}
          >
            {loading ? (
              <View style={verifyEmailStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text.light} />
                <Text style={verifyEmailStyles.verifyButtonText}>Doğrulanıyor...</Text>
              </View>
            ) : (
              <Text style={verifyEmailStyles.verifyButtonText}>Doğrula</Text>
            )}
          </TouchableOpacity>
          
          <View style={verifyEmailStyles.resendContainer}>
            <Text style={verifyEmailStyles.resendText}>Kod gelmedi mi?</Text>
            <TouchableOpacity 
              onPress={handleResendCode}
              disabled={loading}
            >
              <Text style={[
                verifyEmailStyles.resendLink,
                loading && verifyEmailStyles.resendLinkDisabled
              ]}>
                Tekrar Gönder
              </Text>
            </TouchableOpacity>
          </View>
        </View>
        
        <TouchableOpacity 
          style={verifyEmailStyles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Text style={verifyEmailStyles.backButtonText}>Geri Dön</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default VerifyEmailScreen; 