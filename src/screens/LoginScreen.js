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
  ActivityIndicator,
  Image
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { loginStyles } from '../styles/loginStyles';
import { colors } from '../styles/colors';

const LoginScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  
  const { login, loading, error, loginWithGoogle } = useAuth();

  const handleGoogleLogin = async () => {
    try {
      const success = await loginWithGoogle();
      
      if (!success && error) {
        // Sadece gerçek hatalar için alert göster, iptal durumunda gösterme
        if (error !== 'SIGN_IN_CANCELLED') {
          Alert.alert('Giriş Hatası', error);
        }
      }
    } catch (e) {
      Alert.alert('Giriş Hatası', 'Google ile giriş yapılırken bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const handleLogin = async () => {
    // Basit doğrulama
    if (!email || !password) {
      Alert.alert('Hata', 'Lütfen e-posta ve şifre alanlarını doldurun');
      return;
    }
    
    
    try {
      // Giriş işlemini gerçekleştir
      const success = await login(email, password);
      
      // Hata varsa göster
      if (!success && error) {
        let errorMessage = 'Giriş yapılırken bir hata oluştu';
        
        // Supabase hata mesajlarını Türkçeleştir
        if (error.includes('Invalid login credentials')) {
          errorMessage = 'Geçersiz e-posta veya şifre';
        } else if (error.includes('Email not confirmed')) {
          errorMessage = 'Lütfen önce e-posta adresinizi doğrulayın';
        }
        
        Alert.alert('Giriş Hatası', errorMessage);
      } else if (success) {
      }
    } catch (e) {
      Alert.alert('Giriş Hatası', 'Beklenmeyen bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };



  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={loginStyles.container}
    >
      <ScrollView contentContainerStyle={loginStyles.scrollContainer}>
        <View style={loginStyles.headerContainer}>
          <Image 
            source={require('../../assets/görseller/yeni-logo.png')} 
            style={loginStyles.logo}
            resizeMode="contain"
          />
          <Text style={loginStyles.welcomeText}>Hoş Geldiniz</Text>
          <Text style={loginStyles.subtitle}>Hesabınıza giriş yapın</Text>
        </View>
        
        <View style={loginStyles.formContainer}>
          <View style={loginStyles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={colors.secondary} style={loginStyles.inputIcon} />
            <TextInput
              style={loginStyles.input}
              placeholder="E-posta"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={loginStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.secondary} style={loginStyles.inputIcon} />
            <TextInput
              style={loginStyles.input}
              placeholder="Şifre"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              style={loginStyles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={colors.secondary}
              />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={loginStyles.forgotPassword}
            onPress={() => navigation.navigate('ForgotPassword')}
          >
            <Text style={loginStyles.forgotPasswordText}>Şifremi Unuttum</Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={[loginStyles.loginButton, loading && loginStyles.loginButtonDisabled]}
            onPress={handleLogin}
            disabled={loading}
          >
            {loading ? (
              <View style={loginStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text.light} />
                <Text style={loginStyles.loginButtonText}>Giriş Yapılıyor...</Text>
              </View>
            ) : (
              <Text style={loginStyles.loginButtonText}>Giriş Yap</Text>
            )}
          </TouchableOpacity>
          
          <View style={loginStyles.separatorContainer}>
            <View style={loginStyles.separatorLine} />
            <Text style={loginStyles.separatorText}>Veya</Text>
            <View style={loginStyles.separatorLine} />
          </View>

          <TouchableOpacity 
            style={[loginStyles.googleButton, loading && loginStyles.loginButtonDisabled]}
            onPress={handleGoogleLogin}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={24} color={colors.text.light} style={loginStyles.googleIcon} />
            <Text style={loginStyles.googleButtonText}>Google ile Giriş Yap</Text>
          </TouchableOpacity>
          
          
        </View>
        
        <View style={loginStyles.registerContainer}>
          <Text style={loginStyles.registerText}>Hesabınız yok mu?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Register')}
          >
            <Text style={loginStyles.registerLink}>Kayıt Ol</Text>
          </TouchableOpacity>
        </View>

        {/* Dairesel Özellik Kartları */}
        <View style={loginStyles.featuresContainer}>
          {/* Fal Çek Özelliği */}
          <View style={loginStyles.featureCard}>
            <View style={loginStyles.featureIconContainer}>
              <Ionicons name="cafe-outline" size={28} style={loginStyles.featureIcon} />
            </View>
            <Text style={loginStyles.featureText}>Fal Çek</Text>
          </View>

          {/* Fal Gönder Özelliği */}
          <View style={loginStyles.featureCard}>
            <View style={loginStyles.featureIconContainer}>
              <Ionicons name="paper-plane-outline" size={28} style={loginStyles.featureIcon} />
            </View>
            <Text style={loginStyles.featureText}>Fal Gönder</Text>
          </View>

          {/* Fal Oku Özelliği */}
          <View style={loginStyles.featureCard}>
            <View style={loginStyles.featureIconContainer}>
              <Ionicons name="book-outline" size={28} style={loginStyles.featureIcon} />
            </View>
            <Text style={loginStyles.featureText}>Fal Oku</Text>
          </View>

          {/* Canlı Fal Özelliği */}
          <View style={loginStyles.featureCard}>
            <View style={loginStyles.featureIconContainer}>
              <Ionicons name="videocam-outline" size={28} style={loginStyles.featureIcon} />
            </View>
            <Text style={loginStyles.featureText}>Canlı Fal</Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default LoginScreen; 