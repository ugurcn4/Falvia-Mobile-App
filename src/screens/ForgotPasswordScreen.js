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
import { forgotPasswordStyles } from '../styles/forgotPasswordStyles';
import { colors } from '../styles/colors';

const ForgotPasswordScreen = ({ navigation }) => {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const handleResetPassword = async () => {
    // Basit doğrulama
    if (!email) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin');
      return;
    }
    
    setLoading(true);
    
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: 'faluygulamasi://reset-password',
      });
      
      if (error) throw error;
      
      Alert.alert(
        'Başarılı',
        'Şifre sıfırlama bağlantısı e-posta adresinize gönderildi. Lütfen e-postanızı kontrol edin.',
        [
          {
            text: 'Tamam',
            onPress: () => navigation.navigate('Login')
          }
        ]
      );
    } catch (error) {
      let errorMessage = 'Şifre sıfırlama işlemi sırasında bir hata oluştu';
      
      if (error.message.includes('email not found')) {
        errorMessage = 'Bu e-posta adresi sistemde kayıtlı değil';
      }
      
      Alert.alert('Hata', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      behavior={Platform.OS === "ios" ? "padding" : "height"}
      style={forgotPasswordStyles.container}
    >
      <ScrollView contentContainerStyle={forgotPasswordStyles.scrollContainer}>
        <View style={forgotPasswordStyles.headerContainer}>
          <Text style={forgotPasswordStyles.title}>Şifremi Unuttum</Text>
          <Text style={forgotPasswordStyles.subtitle}>
            Şifrenizi sıfırlamak için e-posta adresinizi girin. Size şifre sıfırlama bağlantısı göndereceğiz.
          </Text>
        </View>
        
        <View style={forgotPasswordStyles.formContainer}>
          <View style={forgotPasswordStyles.inputContainer}>
            <Ionicons name="mail-outline" size={22} color={colors.primary} style={forgotPasswordStyles.inputIcon} />
            <TextInput
              style={forgotPasswordStyles.input}
              placeholder="E-posta"
              placeholderTextColor={colors.text.tertiary}
              keyboardType="email-address"
              autoCapitalize="none"
              value={email}
              onChangeText={setEmail}
            />
          </View>
          
          <TouchableOpacity 
            style={[forgotPasswordStyles.resetButton, loading && forgotPasswordStyles.resetButtonDisabled]}
            onPress={handleResetPassword}
            disabled={loading}
          >
            {loading ? (
              <View style={forgotPasswordStyles.loadingContainer}>
                <ActivityIndicator size="small" color={colors.text.light} />
                <Text style={forgotPasswordStyles.resetButtonText}>Gönderiliyor...</Text>
              </View>
            ) : (
              <Text style={forgotPasswordStyles.resetButtonText}>Şifremi Sıfırla</Text>
            )}
          </TouchableOpacity>
        </View>
        
        <View style={forgotPasswordStyles.backContainer}>
          <Text style={forgotPasswordStyles.backText}>Şifrenizi hatırladınız mı?</Text>
          <TouchableOpacity 
            onPress={() => navigation.navigate('Login')}
          >
            <Text style={forgotPasswordStyles.backLink}>Giriş Yap</Text>
          </TouchableOpacity>
        </View>

        {/* Adım adım bilgilendirme bölümü */}
        <View style={forgotPasswordStyles.stepsContainer}>
          
          {/* Adım 1 */}
          <View style={forgotPasswordStyles.stepItem}>
            <View style={forgotPasswordStyles.stepNumberContainer}>
              <Text style={forgotPasswordStyles.stepNumber}>1</Text>
            </View>
            <View style={forgotPasswordStyles.stepContent}>
              <Text style={forgotPasswordStyles.stepTitle}>E-posta Adresinizi Girin</Text>
              <Text style={forgotPasswordStyles.stepDescription}>
                Kayıt olurken kullandığınız e-posta adresini yukarıdaki alana girin ve "Şifremi Sıfırla" butonuna tıklayın.
              </Text>
            </View>
          </View>
          
          {/* Adım 2 */}
          <View style={forgotPasswordStyles.stepItem}>
            <View style={forgotPasswordStyles.stepNumberContainer}>
              <Text style={forgotPasswordStyles.stepNumber}>2</Text>
            </View>
            <View style={forgotPasswordStyles.stepContent}>
              <Text style={forgotPasswordStyles.stepTitle}>E-postanızı Kontrol Edin</Text>
              <Text style={forgotPasswordStyles.stepDescription}>
                E-posta adresinize şifre sıfırlama bağlantısı içeren bir mesaj göndereceğiz. Spam klasörünü de kontrol etmeyi unutmayın.
              </Text>
            </View>
          </View>
          
          {/* Adım 3 */}
          <View style={forgotPasswordStyles.stepItem}>
            <View style={forgotPasswordStyles.stepNumberContainer}>
              <Text style={forgotPasswordStyles.stepNumber}>3</Text>
            </View>
            <View style={forgotPasswordStyles.stepContent}>
              <Text style={forgotPasswordStyles.stepTitle}>Bağlantıya Tıklayın</Text>
              <Text style={forgotPasswordStyles.stepDescription}>
                E-postadaki şifre sıfırlama bağlantısına tıklayın. Bu işlem sizi uygulamamıza yönlendirecektir.
              </Text>
            </View>
          </View>
          
          {/* Adım 4 */}
          <View style={forgotPasswordStyles.stepItem}>
            <View style={forgotPasswordStyles.stepNumberContainer}>
              <Text style={forgotPasswordStyles.stepNumber}>4</Text>
            </View>
            <View style={forgotPasswordStyles.stepContent}>
              <Text style={forgotPasswordStyles.stepTitle}>Yeni Şifrenizi Belirleyin</Text>
              <Text style={forgotPasswordStyles.stepDescription}>
                Açılan ekranda yeni şifrenizi belirleyin. Güvenliğiniz için güçlü bir şifre seçmeyi unutmayın.
              </Text>
            </View>
          </View>
          
          {/* Bilgi kutusu */}
          <View style={forgotPasswordStyles.infoContainer}>
            <Text style={forgotPasswordStyles.infoText}>
              Not: Şifre sıfırlama bağlantısı 24 saat boyunca geçerlidir. Bu süre içinde şifrenizi değiştirmezseniz, işlemi tekrarlamanız gerekecektir.
            </Text>
          </View>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

export default ForgotPasswordScreen; 