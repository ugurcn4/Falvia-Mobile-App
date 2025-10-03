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
import { registerStyles } from '../styles/registerStyles';
import { colors } from '../styles/colors';

const RegisterScreen = ({ navigation }) => {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const { register, loginWithGoogle, loading, error } = useAuth();

  const handleRegister = async () => {
    // Basit doğrulama kontrolleri
    if (!name || !email || !password || !confirmPassword) {
      Alert.alert('Hata', 'Lütfen tüm alanları doldurun');
      return;
    }
    
    if (password !== confirmPassword) {
      Alert.alert('Hata', 'Şifreler eşleşmiyor');
      return;
    }
    
    if (password.length < 6) {
      Alert.alert('Hata', 'Şifre en az 6 karakter olmalıdır');
      return;
    }
    
    // Kayıt işlemini gerçekleştir
    const { data, error: signUpError } = await register(name, email, password, null);
    
    
    // Hata varsa göster
    if (signUpError) {
      console.error('RegisterScreen: Kayıt hatası:', signUpError);
      
      let errorMessage = 'Kayıt olurken bir hata oluştu';
      
      // Supabase hata mesajlarını Türkçeleştir
      if (signUpError.message && signUpError.message.includes('already registered')) {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı';
      } else if (signUpError.message && signUpError.message.includes('valid email')) {
        errorMessage = 'Geçerli bir e-posta adresi girin';
      } else if (signUpError.message) {
        errorMessage = signUpError.message;
      }
      Alert.alert('Kayıt Hatası', errorMessage);
    } else {
      // Eğer kullanıcı otomatik olarak giriş yaptıysa (email doğrulama kapalıysa)
      if (data?.user?.email_confirmed_at) {
      } else {
        navigation.navigate('VerifyEmail', { email, password });
      }
    }
  };

  const handleGoogleRegister = async () => {
    try {
      await loginWithGoogle();
    } catch (error) {
      Alert.alert('Google ile Kayıt Hatası', 'Google ile kayıt olurken bir hata oluştu.');
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={registerStyles.container}
    >
      <ScrollView contentContainerStyle={registerStyles.scrollContainer}>
        <View style={registerStyles.headerContainer}>
          <Image 
            source={require('../../assets/görseller/yeni-logo.png')} 
            style={registerStyles.logo}
            resizeMode="contain"
          />
          <Text style={registerStyles.welcomeText}>Hesap Oluştur</Text>
          <Text style={registerStyles.subtitle}>Falınıza hemen başlamak için kayıt olun</Text>
        </View>
        
        <View style={registerStyles.formContainer}>
          <View style={registerStyles.inputContainer}>
            <Ionicons name="person-outline" size={22} color={colors.secondary} style={registerStyles.inputIcon} />
            <TextInput
              style={registerStyles.input}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
            />
          </View>
          
          <View style={registerStyles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={colors.secondary} style={registerStyles.inputIcon} />
            <TextInput
              style={registerStyles.input}
              placeholder="E-posta"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <View style={registerStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.secondary} style={registerStyles.inputIcon} />
            <TextInput
              style={registerStyles.input}
              placeholder="Şifre"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry={!showPassword}
              value={password}
              onChangeText={setPassword}
            />
            <TouchableOpacity 
              style={registerStyles.eyeIcon} 
              onPress={() => setShowPassword(!showPassword)}
            >
              <Ionicons 
                name={showPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={colors.secondary}
              />
            </TouchableOpacity>
          </View>
          
          <View style={registerStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.secondary} style={registerStyles.inputIcon} />
            <TextInput
              style={registerStyles.input}
              placeholder="Şifre Tekrar"
              placeholderTextColor={colors.text.tertiary}
              secureTextEntry={!showConfirmPassword}
              value={confirmPassword}
              onChangeText={setConfirmPassword}
            />
            <TouchableOpacity 
              style={registerStyles.eyeIcon} 
              onPress={() => setShowConfirmPassword(!showConfirmPassword)}
            >
              <Ionicons 
                name={showConfirmPassword ? "eye-off-outline" : "eye-outline"} 
                size={22} 
                color={colors.secondary}
              />
            </TouchableOpacity>
          </View>
          
          <View style={registerStyles.termsContainer}>
            <Text style={registerStyles.termsText}>
              Kayıt olarak, <Text style={registerStyles.termsLink}>Kullanım Koşulları</Text> ve{' '}
              <Text style={registerStyles.termsLink}>Gizlilik Politikası</Text>'nı kabul etmiş olursunuz.
            </Text>
          </View>
          
          <TouchableOpacity 
            style={[registerStyles.registerButton, loading && registerStyles.registerButtonDisabled]}
            onPress={handleRegister}
            disabled={loading}
          >
            {loading ? (
              <View style={registerStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text.light} />
                <Text style={registerStyles.registerButtonText}>Kayıt Yapılıyor...</Text>
              </View>
            ) : (
              <Text style={registerStyles.registerButtonText}>Kayıt Ol</Text>
            )}
          </TouchableOpacity>
          
          <View style={registerStyles.loginContainer}>
            <Text style={registerStyles.loginText}>Zaten hesabınız var mı?</Text>
            <TouchableOpacity 
              onPress={() => navigation.navigate('Login')}
            >
              <Text style={registerStyles.loginLink}>Giriş Yap</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen; 