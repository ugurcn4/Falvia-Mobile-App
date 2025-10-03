import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  ScrollView, 
  TouchableOpacity, 
  StatusBar, 
  TextInput,
  Alert,
  ActivityIndicator
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const SupportScreen = ({ navigation }) => {
  const [activeTab, setActiveTab] = useState('faq');
  const [expandedFaq, setExpandedFaq] = useState(null);
  const [supportForm, setSupportForm] = useState({
    subject: '',
    message: '',
    email: '',
  });
  const [loading, setLoading] = useState(false);

  // SSS verileri
  const faqData = [
    {
      id: 1,
      question: 'Falımı nasıl baktırabilirim?',
      answer: 'Ana ekrandan "Fal Baktır" butonuna tıklayarak veya alt menüden "Falınız" sekmesine giderek yeni bir fal talebinde bulunabilirsiniz. Fal türünü seçtikten sonra gerekli bilgileri ve fotoğrafları ekleyerek falınızı gönderebilirsiniz.'
    },
    {
      id: 2,
      question: 'Jeton nasıl satın alabilirim?',
      answer: 'Profil sayfanızdan "Jeton Satın Al" seçeneğine tıklayarak veya alt menüden "Mağaza" sekmesine giderek jeton satın alabilirsiniz. Kredi kartı, banka kartı veya mobil ödeme yöntemlerini kullanarak güvenli bir şekilde ödeme yapabilirsiniz.'
    },
    {
      id: 3,
      question: 'Falımın sonucunu ne zaman görebilirim?',
              answer: 'Falcılarımız gönderdiğiniz falları genellikle 20-30 dakika içerisinde yanıtlar. Falınızın durumunu "Fal Geçmişim" bölümünden takip edebilirsiniz. Falınız yorumlandığında size bildirim gönderilecektir.'
    },
    {
      id: 4,
      question: 'Hesabımı nasıl silebilirim?',
      answer: 'Profil sayfanızdan "Hesap Bilgileri" bölümüne giderek en altta bulunan "Hesabımı Sil" seçeneğini kullanabilirsiniz. Hesabınızı silmeden önce tüm verilerinizin kalıcı olarak silineceğini ve bu işlemin geri alınamayacağını unutmayın.'
    },
    {
      id: 5,
      question: 'Şifremi unuttum, ne yapmalıyım?',
      answer: 'Giriş ekranında "Şifremi Unuttum" seçeneğine tıklayarak e-posta adresinize şifre sıfırlama bağlantısı gönderebilirsiniz. E-postadaki talimatları izleyerek yeni bir şifre oluşturabilirsiniz.'
    },
    {
      id: 6,
      question: 'Falcı ile nasıl iletişime geçebilirim?',
      answer: 'Falınız yorumlandıktan sonra, fal detay sayfasında "Falcıya Mesaj Gönder" seçeneğini kullanarak falcınızla özel olarak mesajlaşabilirsiniz. Bu hizmet için ek jeton ücreti alınabilir.'
    },
  ];

  // İletişim bilgileri
  const contactInfo = [
    {
      id: 1,
      title: 'E-posta',
      value: 'faluygulamasi34@gmail.com',
      icon: 'mail',
      color: '#3498db',
    },
    {
      id: 2,
      title: 'Telefon',
      value: '+90 537 447 71 32',
      icon: 'call',
      color: '#2ecc71',
    },
    {
      id: 3,
      title: 'Whatsapp',
      value: '+90 537 447 71 32',
      icon: 'logo-whatsapp',
      color: '#25D366',
    },
  ];

  // SSS öğesini genişlet/daralt
  const toggleFaq = (id) => {
    if (expandedFaq === id) {
      setExpandedFaq(null);
    } else {
      setExpandedFaq(id);
    }
  };

  // Destek talebi gönderme
  const handleSupportRequest = () => {
    // Form kontrolü
    if (!supportForm.subject.trim()) {
      Alert.alert('Hata', 'Lütfen bir konu başlığı girin.');
      return;
    }
    if (!supportForm.message.trim()) {
      Alert.alert('Hata', 'Lütfen mesajınızı girin.');
      return;
    }
    if (!supportForm.email.trim()) {
      Alert.alert('Hata', 'Lütfen e-posta adresinizi girin.');
      return;
    }

    // Gönderme işlemi
    setLoading(true);
    
    // API çağrısı simülasyonu
    setTimeout(() => {
      setLoading(false);
      Alert.alert(
        'Başarılı',
        'Destek talebiniz başarıyla gönderildi. En kısa sürede size dönüş yapacağız.',
        [
          { 
            text: 'Tamam', 
            onPress: () => {
              // Formu sıfırla
              setSupportForm({
                subject: '',
                message: '',
                email: '',
              });
            } 
          }
        ]
      );
    }, 1500);
  };

  // Tab içeriğini render et
  const renderTabContent = () => {
    switch(activeTab) {
      case 'faq':
        return (
          <View style={styles.tabContent}>
            {faqData.map(item => (
              <TouchableOpacity 
                key={item.id} 
                style={[
                  styles.faqItem, 
                  expandedFaq === item.id && styles.faqItemExpanded
                ]}
                onPress={() => toggleFaq(item.id)}
                activeOpacity={0.8}
              >
                <View style={styles.faqHeader}>
                  <Text style={styles.faqQuestion}>{item.question}</Text>
                  <Ionicons 
                    name={expandedFaq === item.id ? 'chevron-up' : 'chevron-down'} 
                    size={20} 
                    color={colors.text.tertiary} 
                  />
                </View>
                
                {expandedFaq === item.id && (
                  <Text style={styles.faqAnswer}>{item.answer}</Text>
                )}
              </TouchableOpacity>
            ))}
          </View>
        );
      
      case 'contact':
        return (
          <View style={styles.tabContent}>
            {contactInfo.map(item => (
              <View key={item.id} style={styles.contactItem}>
                <View style={[styles.contactIconContainer, { backgroundColor: item.color }]}>
                  <Ionicons name={item.icon} size={22} color="#fff" />
                </View>
                <View style={styles.contactInfo}>
                  <Text style={styles.contactTitle}>{item.title}</Text>
                  <Text style={styles.contactValue}>{item.value}</Text>
                </View>
              </View>
            ))}
            
            <View style={styles.socialContainer}>
              <Text style={styles.socialTitle}>Bizi Takip Edin</Text>
              <View style={styles.socialIcons}>
                <TouchableOpacity style={[styles.socialIcon, { backgroundColor: '#3b5998' }]}>
                  <Ionicons name="logo-facebook" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialIcon, { backgroundColor: '#E1306C' }]}>
                  <Ionicons name="logo-instagram" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialIcon, { backgroundColor: '#1DA1F2' }]}>
                  <Ionicons name="logo-twitter" size={22} color="#fff" />
                </TouchableOpacity>
                <TouchableOpacity style={[styles.socialIcon, { backgroundColor: '#FF0000' }]}>
                  <Ionicons name="logo-youtube" size={22} color="#fff" />
                </TouchableOpacity>
              </View>
            </View>
          </View>
        );
      
      case 'support':
        return (
          <View style={styles.tabContent}>
            <Text style={styles.formTitle}>Destek Talebi Oluştur</Text>
            <Text style={styles.formSubtitle}>
              Sorularınız veya sorunlarınız için aşağıdaki formu doldurarak bize ulaşabilirsiniz.
            </Text>
            
            {/* Konu */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="subject" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="Konu"
                placeholderTextColor={colors.text.tertiary}
                value={supportForm.subject}
                onChangeText={(text) => setSupportForm({...supportForm, subject: text})}
              />
            </View>
            
            {/* Mesaj */}
            <View style={[styles.inputContainer, styles.textAreaContainer]}>
              <MaterialIcons 
                name="message" 
                size={20} 
                color={colors.primary} 
                style={[styles.inputIcon, { alignSelf: 'flex-start', marginTop: spacing.md }]} 
              />
              <TextInput
                style={[styles.input, styles.textArea]}
                placeholder="Mesajınız"
                placeholderTextColor={colors.text.tertiary}
                multiline={true}
                numberOfLines={5}
                textAlignVertical="top"
                value={supportForm.message}
                onChangeText={(text) => setSupportForm({...supportForm, message: text})}
              />
            </View>
            
            {/* E-posta */}
            <View style={styles.inputContainer}>
              <MaterialIcons name="email" size={20} color={colors.primary} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                placeholder="E-posta adresiniz"
                placeholderTextColor={colors.text.tertiary}
                keyboardType="email-address"
                value={supportForm.email}
                onChangeText={(text) => setSupportForm({...supportForm, email: text})}
              />
            </View>
            
            {/* Gönder Butonu */}
            <TouchableOpacity 
              style={styles.submitButton}
              onPress={handleSupportRequest}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator size="small" color="#fff" />
              ) : (
                <>
                  <MaterialIcons name="send" size={18} color="#fff" style={{ marginRight: spacing.sm }} />
                  <Text style={styles.submitButtonText}>Gönder</Text>
                </>
              )}
            </TouchableOpacity>
          </View>
        );
      
      default:
        return null;
    }
  };

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={styles.header}
      >
        <View style={styles.headerContent}>
          <TouchableOpacity 
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Yardım ve Destek</Text>
          <View style={{ width: 24 }} />
        </View>
      </LinearGradient>
      
      {/* Tab Bar */}
      <View style={styles.tabBar}>
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'faq' && styles.activeTab]}
          onPress={() => setActiveTab('faq')}
        >
          <MaterialIcons 
            name="question-answer" 
            size={20} 
            color={activeTab === 'faq' ? colors.secondary : colors.text.tertiary} 
          />
          <Text style={[styles.tabText, activeTab === 'faq' && styles.activeTabText]}>
            Sık Sorulanlar
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'contact' && styles.activeTab]}
          onPress={() => setActiveTab('contact')}
        >
          <Ionicons 
            name="call" 
            size={20} 
            color={activeTab === 'contact' ? colors.secondary : colors.text.tertiary} 
          />
          <Text style={[styles.tabText, activeTab === 'contact' && styles.activeTabText]}>
            İletişim
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.tab, activeTab === 'support' && styles.activeTab]}
          onPress={() => setActiveTab('support')}
        >
          <MaterialCommunityIcons 
            name="ticket-account" 
            size={20} 
            color={activeTab === 'support' ? colors.secondary : colors.text.tertiary} 
          />
          <Text style={[styles.tabText, activeTab === 'support' && styles.activeTabText]}>
            Destek Talebi
          </Text>
        </TouchableOpacity>
      </View>
      
      {/* Content */}
      <ScrollView 
        style={styles.content}
        showsVerticalScrollIndicator={false}
      >
        {renderTabContent()}
        
        {/* Alt Boşluk */}
        <View style={{ height: 40 }} />
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingTop: 50,
    paddingBottom: 15,
    paddingHorizontal: spacing.lg,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(0,0,0,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
  },
  tabBar: {
    flexDirection: 'row',
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    margin: spacing.lg,
    marginTop: -spacing.md,
    ...shadows.lg,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.border,
  },
  tab: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: spacing.sm,
    flexDirection: 'row',
    justifyContent: 'center',
    borderRadius: radius.md,
  },
  activeTab: {
    backgroundColor: 'rgba(74, 0, 128, 0.15)',
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginLeft: 4,
  },
  activeTabText: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.semiBold,
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  tabContent: {
    paddingTop: spacing.sm,
  },
  // SSS stilleri
  faqItem: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  faqItemExpanded: {
    backgroundColor: colors.card,
    borderLeftWidth: 3,
    borderLeftColor: colors.secondary,
  },
  faqHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  faqQuestion: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.primary,
    flex: 1,
    paddingRight: spacing.sm,
  },
  faqAnswer: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: spacing.md,
    lineHeight: typography.lineHeight.md,
    borderTopWidth: 1,
    borderTopColor: colors.border,
    paddingTop: spacing.md,
  },
  // İletişim stilleri
  contactItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  contactIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  contactInfo: {
    flex: 1,
  },
  contactTitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
    marginBottom: 2,
  },
  contactValue: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.medium,
  },
  socialContainer: {
    backgroundColor: colors.card,
    borderRadius: radius.md,
    padding: spacing.lg,
    marginTop: spacing.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  socialTitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    fontWeight: typography.fontWeight.semiBold,
    marginBottom: spacing.md,
  },
  socialIcons: {
    flexDirection: 'row',
    justifyContent: 'center',
  },
  socialIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: spacing.sm,
  },
  // Form stilleri
  formTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  formSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.lg,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: radius.md,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    height: 60,
    borderWidth: 1,
    borderColor: colors.border,
    ...shadows.sm,
  },
  textAreaContainer: {
    height: 150,
    alignItems: 'flex-start',
  },
  inputIcon: {
    marginRight: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: typography.fontSize.md,
    color: colors.text.primary,
    height: '100%',
  },
  textArea: {
    height: '100%',
    paddingTop: spacing.md,
  },
  submitButton: {
    flexDirection: 'row',
    backgroundColor: colors.primary,
    borderRadius: radius.md,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.lg,
    ...shadows.colored(colors.primary),
  },
  submitButtonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
  },
});

export default SupportScreen; 