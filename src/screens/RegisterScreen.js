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
    const { data, error: signUpError } = await register(name, email, password);
    
    
    // Hata varsa göster
    if (signUpError) {
      let errorMessage = 'Kayıt olurken bir hata oluştu';
      
      
      // Supabase hata mesajlarını Türkçeleştir
      if (signUpError.message && signUpError.message.includes('already registered')) {
        errorMessage = 'Bu e-posta adresi zaten kayıtlı';
      } else if (signUpError.message && signUpError.message.includes('valid email')) {
        errorMessage = 'Geçerli bir e-posta adresi girin';
      }
      
      Alert.alert('Kayıt Hatası', errorMessage);
    } else {
      // Başarılı kayıt sonrası doğrulama ekranına yönlendir
      navigation.navigate('VerifyEmail', { email, password });
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
          <Text style={registerStyles.welcomeText}>Hesap Oluştur</Text>
          <Text style={registerStyles.subtitle}>Falınıza hemen başlamak için kayıt olun</Text>
        </View>
        
        <View style={registerStyles.formContainer}>
          <View style={registerStyles.inputContainer}>
            <Ionicons name="person-outline" size={22} color={colors.primary} style={registerStyles.inputIcon} />
            <TextInput
              style={registerStyles.input}
              placeholder="Ad Soyad"
              placeholderTextColor={colors.text.tertiary}
              value={name}
              onChangeText={setName}
            />
          </View>
          
          <View style={registerStyles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} style={registerStyles.inputIcon} />
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
            <Ionicons name="lock-closed-outline" size={22} color={colors.primary} style={registerStyles.inputIcon} />
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
                color={colors.primary}
              />
            </TouchableOpacity>
          </View>
          
          <View style={registerStyles.inputContainer}>
            <Ionicons name="lock-closed-outline" size={22} color={colors.primary} style={registerStyles.inputIcon} />
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
                color={colors.primary}
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
          
          <View style={registerStyles.orContainer}>
            <View style={registerStyles.divider} />
            <Text style={registerStyles.orText}>VEYA</Text>
            <View style={registerStyles.divider} />
          </View>
          
          <TouchableOpacity 
            style={registerStyles.googleButton}
            onPress={handleGoogleRegister}
            disabled={loading}
          >
            <Ionicons name="logo-google" size={24} color={colors.social.google} style={registerStyles.googleIcon} />
            <Text style={registerStyles.googleButtonText}>Google ile Kayıt Ol</Text>
          </TouchableOpacity>
        </View>
        
        <View style={registerStyles.loginContainer}>
          <Text style={registerStyles.loginText}>Zaten hesabınız var mı?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={registerStyles.loginLink}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default RegisterScreen; 