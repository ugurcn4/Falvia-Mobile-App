import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Alert,
  Platform,
  Modal,
  Dimensions
} from 'react-native';
import { StatusBar } from 'expo-status-bar';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import colors from '../styles/colors';
import AstrologyService from '../services/astrologyService';
import { supabase } from '../../lib/supabase';

const { width } = Dimensions.get('window');

const AstrologyAnalysisScreen = ({ navigation, route }) => {
  const [birthDate, setBirthDate] = useState(new Date(1990, 0, 1));
  const [birthTime, setBirthTime] = useState('12:00');
  const [birthPlace, setBirthPlace] = useState('İstanbul');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [showTimePicker, setShowTimePicker] = useState(false);
  const [loading, setLoading] = useState(false);
  const [analysis, setAnalysis] = useState(null);
  const [userId, setUserId] = useState(null);
  const [premiumStatus, setPremiumStatus] = useState({
    isPremium: false,
    trialUsed: false
  });

  useEffect(() => {
    fetchUserData();
  }, []);

  const fetchUserData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        
        // Premium durumu ve deneme hakkı kontrolü
        const { data: profileData } = await supabase
          .from('users')
          .select('subscription_type, astrology_trial_used')
          .eq('id', user.id)
          .single();

        if (profileData) {
          setPremiumStatus({
            isPremium: profileData.subscription_type === 'premium',
            trialUsed: profileData.astrology_trial_used || false
          });
        }
      }
    } catch (error) {
      console.error('Kullanıcı bilgileri alınırken hata:', error);
    }
  };

  const handleDateChange = (event, selectedDate) => {
    setShowDatePicker(false);
    if (selectedDate) {
      setBirthDate(selectedDate);
    }
  };

  const handleTimeChange = (event, selectedTime) => {
    setShowTimePicker(false);
    if (selectedTime) {
      const hours = selectedTime.getHours().toString().padStart(2, '0');
      const minutes = selectedTime.getMinutes().toString().padStart(2, '0');
      setBirthTime(`${hours}:${minutes}`);
    }
  };

  const handleGenerateAnalysis = async () => {
    // Premium kontrolü
    if (!premiumStatus.isPremium && premiumStatus.trialUsed) {
      Alert.alert(
        'Premium Üyelik Gerekli',
        'Astroloji analizi premium kullanıcılara özeldir. Premium üye olmak ister misiniz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Premium Ol', onPress: () => navigation.navigate('BuyTokens') }
        ]
      );
      return;
    }

    if (!premiumStatus.isPremium && !premiumStatus.trialUsed) {
      Alert.alert(
        'Deneme Hakkınızı Kullanın',
        '1 adet ücretsiz deneme hakkınız var. Daha sonra premium üyelik gerekecek. Devam etmek istiyor musunuz?',
        [
          { text: 'İptal', style: 'cancel' },
          { text: 'Evet, Dene', onPress: generateAnalysisWithTrial }
        ]
      );
      return;
    }

    generateFullAnalysis();
  };

  const generateAnalysisWithTrial = async () => {
    try {
      setLoading(true);
      
      // Deneme hakkını kullanıldı olarak işaretle
      await supabase
        .from('users')
        .update({ astrology_trial_used: true })
        .eq('id', userId);
      
      setPremiumStatus(prev => ({ ...prev, trialUsed: true }));
      
      // Analizi oluştur
      await generateFullAnalysis();
      
    } catch (error) {
      console.error('Deneme hakkı kullanılırken hata:', error);
      Alert.alert('Hata', 'Bir hata oluştu. Lütfen tekrar deneyin.');
    }
  };

  const generateFullAnalysis = async () => {
    try {
      setLoading(true);
      
      // Doğum tarihini string formatına çevir
      const birthDateString = birthDate.toISOString().split('T')[0];
      
      // Analizi oluştur
      const fullAnalysis = await AstrologyService.generateFullAnalysis(
        birthDateString,
        birthTime,
        birthPlace
      );
      
      setAnalysis(fullAnalysis);
      
    } catch (error) {
      console.error('Analiz oluşturulurken hata:', error);
      Alert.alert('Hata', 'Analiz oluşturulurken bir hata oluştu.');
    } finally {
      setLoading(false);
    }
  };

  const renderStars = (rating) => {
    return Array.from({ length: 5 }, (_, index) => (
      <MaterialCommunityIcons
        key={index}
        name={index < rating ? 'star' : 'star-outline'}
        size={16}
        color={colors.warning}
      />
    ));
  };

  const formatDate = (date) => {
    return date.toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.loadingGradient}
        >
          <MaterialCommunityIcons name="loading" size={50} color={colors.secondary} />
          <Text style={styles.loadingText}>Doğum haritanız hazırlanıyor...</Text>
        </LinearGradient>
      </View>
    );
  }

  if (analysis) {
    const birthChart = analysis.birthChart || {};
    const personalityAnalysis = analysis.personalityAnalysis || {};
    const transitsAndPredictions = analysis.transitsAndPredictions || {};
    
    return (
      <View style={styles.container}>
        <StatusBar style="light" />
        
        {/* Header */}
        <LinearGradient
          colors={[colors.primary, colors.primaryDark]}
          style={styles.header}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => navigation.goBack()}
          >
            <Ionicons name="arrow-back" size={24} color={colors.text.light} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Astroloji Analiziniz</Text>
          <TouchableOpacity
            style={styles.newAnalysisButton}
            onPress={() => {
              setAnalysis(null);
              fetchUserData();
            }}
          >
            <MaterialCommunityIcons name="refresh" size={24} color={colors.text.light} />
          </TouchableOpacity>
        </LinearGradient>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Doğum Haritası Bölümü */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🌟 Doğum Haritası Analizi</Text>
            
            {/* Ana Burçlar */}
            <View style={styles.mainSigns}>
              <View style={styles.signCard}>
                <MaterialCommunityIcons name="white-balance-sunny" size={32} color={colors.warning} />
                <Text style={styles.signTitle}>Güneş Burcu</Text>
                <Text style={styles.signValue}>{birthChart.sunSign || 'Yükleniyor...'}</Text>
                <Text style={styles.signDescription}>Kişiliğin ana teması</Text>
              </View>
              
              <View style={styles.signCard}>
                <MaterialCommunityIcons name="moon-waxing-crescent" size={32} color={colors.info} />
                <Text style={styles.signTitle}>Ay Burcu</Text>
                <Text style={styles.signValue}>{birthChart.moonSign || 'Yükleniyor...'}</Text>
                <Text style={styles.signDescription}>Duygusal yapısı</Text>
              </View>
              
              <View style={styles.signCard}>
                <MaterialCommunityIcons name="star-outline" size={32} color={colors.secondary} />
                <Text style={styles.signTitle}>Yükselen Burç</Text>
                <Text style={styles.signValue}>{birthChart.risingSign || 'Yükleniyor...'}</Text>
                <Text style={styles.signDescription}>Dışa yansıyan karakter</Text>
              </View>
            </View>

            {/* Kişilik Analizi */}
            <View style={styles.personalitySection}>
              <Text style={styles.subSectionTitle}>🎭 Kişilik Analizi</Text>
              
              <View style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>☀️ Güneş Burcu - {birthChart.sunSign || 'Analiz ediliyor...'}</Text>
                <Text style={styles.analysisText}>{personalityAnalysis.sunSign || 'Analiz hazırlanıyor...'}</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Etki Gücü:</Text>
                  {renderStars(5)}
                </View>
              </View>

              <View style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>🌙 Ay Burcu - {birthChart.moonSign || 'Analiz ediliyor...'}</Text>
                <Text style={styles.analysisText}>{personalityAnalysis.moonSign || 'Analiz hazırlanıyor...'}</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Etki Gücü:</Text>
                  {renderStars(4)}
                </View>
              </View>

              <View style={styles.analysisCard}>
                <Text style={styles.analysisTitle}>⭐ Yükselen Burç - {birthChart.risingSign || 'Analiz ediliyor...'}</Text>
                <Text style={styles.analysisText}>{personalityAnalysis.risingSign || 'Analiz hazırlanıyor...'}</Text>
                <View style={styles.ratingRow}>
                  <Text style={styles.ratingLabel}>Etki Gücü:</Text>
                  {renderStars(3)}
                </View>
              </View>

              {/* Detaylı Analizler */}
              {personalityAnalysis.mainTraits && personalityAnalysis.mainTraits.length > 10 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>🎯 Ana Karakter Özellikleriniz</Text>
                  <Text style={styles.analysisText}>{personalityAnalysis.mainTraits}</Text>
                </View>
              )}

              {personalityAnalysis.strengths && personalityAnalysis.strengths.length > 10 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>💪 Güçlü Yönleriniz</Text>
                  <Text style={styles.analysisText}>{personalityAnalysis.strengths}</Text>
                </View>
              )}

              {personalityAnalysis.developmentAreas && personalityAnalysis.developmentAreas.length > 10 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>🌱 Gelişim Alanlarınız</Text>
                  <Text style={styles.analysisText}>{personalityAnalysis.developmentAreas}</Text>
                </View>
              )}

              {personalityAnalysis.relationshipStyle && personalityAnalysis.relationshipStyle.length > 10 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>💕 İlişki Tarzınız</Text>
                  <Text style={styles.analysisText}>{personalityAnalysis.relationshipStyle}</Text>
                </View>
              )}
            </View>

            {/* Element Dengesi */}
            <View style={styles.elementSection}>
              <Text style={styles.subSectionTitle}>⚡ Element Dengesi</Text>
              <View style={styles.elementsGrid}>
                <View style={styles.elementCard}>
                  <Text style={styles.elementIcon}>🔥</Text>
                  <Text style={styles.elementName}>Ateş</Text>
                  <View style={styles.elementRating}>
                    {renderStars(Math.min(analysis.elementBalance?.fire || 3, 5))}
                  </View>
                </View>
                <View style={styles.elementCard}>
                  <Text style={styles.elementIcon}>🌍</Text>
                  <Text style={styles.elementName}>Toprak</Text>
                  <View style={styles.elementRating}>
                    {renderStars(Math.min(analysis.elementBalance?.earth || 3, 5))}
                  </View>
                </View>
                <View style={styles.elementCard}>
                  <Text style={styles.elementIcon}>💨</Text>
                  <Text style={styles.elementName}>Hava</Text>
                  <View style={styles.elementRating}>
                    {renderStars(Math.min(analysis.elementBalance?.air || 3, 5))}
                  </View>
                </View>
                <View style={styles.elementCard}>
                  <Text style={styles.elementIcon}>💧</Text>
                  <Text style={styles.elementName}>Su</Text>
                  <View style={styles.elementRating}>
                    {renderStars(Math.min(analysis.elementBalance?.water || 3, 5))}
                  </View>
                </View>
              </View>
              
                             {/* Element Analizi */}
                             {analysis.elementBalance?.analysis && analysis.elementBalance.analysis.length > 10 && (
                <View style={styles.analysisCard}>
                                     <Text style={styles.analysisTitle}>🧙‍♀️ Element Dengesi Yorumu</Text>
                  <Text style={styles.analysisText}>{analysis.elementBalance.analysis}</Text>
                  {analysis.elementBalance.dominantElements?.length > 0 && (
                    <View style={styles.dominantElementsContainer}>
                      <Text style={styles.dominantElementsTitle}>Baskın Elementler:</Text>
                      <View style={styles.dominantElementsRow}>
                        {analysis.elementBalance.dominantElements.map((element, index) => (
                          <View key={index} style={styles.dominantElementTag}>
                            <Text style={styles.dominantElementText}>{element}</Text>
                          </View>
                        ))}
                      </View>
                    </View>
                  )}
                </View>
              )}
            </View>
          </View>

          {/* Kariyer ve Yaşam Yolu Analizi */}
          {(analysis.careerAndLife?.careerSuggestions || analysis.careerAndLife?.naturalTalents) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💼 Kariyer & Yaşam Yolu</Text>
              
              {analysis.careerAndLife.careerSuggestions && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>🎯 Kariyer Önerileri</Text>
                  <Text style={styles.analysisText}>{analysis.careerAndLife.careerSuggestions}</Text>
                </View>
              )}
              
              {analysis.careerAndLife.naturalTalents && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>⭐ Doğal Yetenekleriniz</Text>
                  <Text style={styles.analysisText}>{analysis.careerAndLife.naturalTalents}</Text>
                </View>
              )}
              
              {analysis.careerAndLife.financialApproach && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>💰 Finansal Yaklaşımınız</Text>
                  <Text style={styles.analysisText}>{analysis.careerAndLife.financialApproach}</Text>
                </View>
              )}
            </View>
          )}

          {/* İlişkiler ve Sosyal Yaşam Analizi */}
          {(analysis.relationships?.loveStyle || analysis.relationships?.compatibleSigns) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>💕 İlişkiler & Sosyal Yaşam</Text>
              
              {analysis.relationships.loveStyle && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>💖 Aşk Tarzınız</Text>
                  <Text style={styles.analysisText}>{analysis.relationships.loveStyle}</Text>
                </View>
              )}
              
              {analysis.relationships.compatibleSigns?.length > 0 && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>🔮 Uyumlu Burçlar</Text>
                  <View style={styles.compatibleSignsContainer}>
                    {analysis.relationships.compatibleSigns.map((sign, index) => (
                      <View key={index} style={styles.compatibleSignTag}>
                        <Text style={styles.compatibleSignText}>{sign}</Text>
                      </View>
                    ))}
                  </View>
                </View>
              )}
              
              {analysis.relationships.socialLife && (
                <View style={styles.analysisCard}>
                  <Text style={styles.analysisTitle}>👥 Sosyal Yaşamınız</Text>
                  <Text style={styles.analysisText}>{analysis.relationships.socialLife}</Text>
                </View>
              )}
            </View>
          )}

          {/* Transit & Öngörüler Bölümü */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>🔮 Transit & Öngörüler</Text>
            
            {/* Haftalık Transitler */}
            <View style={styles.transitsSection}>
              <Text style={styles.subSectionTitle}>Bu Hafta</Text>
              {(transitsAndPredictions.weeklyTransits || []).map((transit, index) => (
                <View key={index} style={styles.transitCard}>
                  <View style={styles.transitHeader}>
                    <Text style={styles.transitPlanet}>{transit.planet}</Text>
                    <View style={styles.transitPercentage}>
                      <Text style={styles.percentageText}>{transit.percentage}%</Text>
                    </View>
                  </View>
                  <Text style={styles.transitEffect}>{transit.effect}</Text>
                  <View style={styles.transitRating}>
                    {renderStars(AstrologyService.calculateStarRating(transit.percentage))}
                  </View>
                </View>
              ))}
            </View>

            {/* Aylık Öngörüler */}
            <View style={styles.predictionsSection}>
              <Text style={styles.subSectionTitle}>Bu Ay</Text>
              {(transitsAndPredictions.monthlyPredictions || []).map((prediction, index) => (
                <View key={index} style={styles.predictionCard}>
                  <View style={styles.predictionHeader}>
                    <Text style={styles.predictionArea}>{prediction.area}</Text>
                    <View style={styles.predictionPercentage}>
                      <Text style={styles.percentageText}>{prediction.percentage}%</Text>
                    </View>
                  </View>
                  <Text style={styles.predictionText}>{prediction.prediction}</Text>
                  <Text style={styles.predictionAdvice}>💡 {prediction.advice}</Text>
                  <View style={styles.predictionRating}>
                    {renderStars(AstrologyService.calculateStarRating(prediction.percentage))}
                  </View>
                </View>
              ))}
            </View>
          </View>

          <View style={styles.bottomPadding} />
        </ScrollView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar style="light" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color={colors.text.light} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Detaylı Astroloji Analizi</Text>
        <View style={styles.placeholder} />
      </LinearGradient>

      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Form Bölümü */}
        <View style={styles.formSection}>
          <Text style={styles.formTitle}>Doğum Bilgileriniz</Text>
          <Text style={styles.formSubtitle}>
            Doğum tarih, saat ve yerinizi girerek kişisel astroloji analizinizi alın
          </Text>

          {/* Doğum Tarihi */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Doğum Tarihi</Text>
            <TouchableOpacity
              style={styles.dateInput}
              onPress={() => setShowDatePicker(true)}
            >
              <MaterialCommunityIcons name="calendar" size={20} color={colors.primary} />
              <Text style={styles.dateText}>{formatDate(birthDate)}</Text>
            </TouchableOpacity>
          </View>

          {/* Doğum Saati */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Doğum Saati</Text>
            <TouchableOpacity
              style={styles.timeInput}
              onPress={() => setShowTimePicker(true)}
            >
              <MaterialCommunityIcons name="clock" size={20} color={colors.primary} />
              <Text style={styles.timeText}>{birthTime}</Text>
            </TouchableOpacity>
          </View>

          {/* Doğum Yeri */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Doğum Yeri</Text>
            <View style={styles.placeInput}>
              <MaterialCommunityIcons name="map-marker" size={20} color={colors.primary} />
              <TextInput
                style={styles.placeText}
                value={birthPlace}
                onChangeText={setBirthPlace}
                placeholder="Örn: İstanbul"
                placeholderTextColor={colors.text.tertiary}
              />
            </View>
          </View>

          {/* Premium/Trial Bilgisi */}
          <View style={styles.premiumInfo}>
            <MaterialCommunityIcons 
              name={premiumStatus.isPremium ? "crown" : "information"} 
              size={20} 
              color={premiumStatus.isPremium ? colors.secondary : colors.warning} 
            />
            <Text style={[
              styles.premiumText,
              { color: premiumStatus.isPremium ? colors.secondary : colors.warning }
            ]}>
              {premiumStatus.isPremium
                ? "Premium üye olarak sınırsız analiz hakkınız var"
                : premiumStatus.trialUsed
                ? "Premium üyelik gerekmektedir"
                : "1 adet ücretsiz deneme hakkınız var"
              }
            </Text>
          </View>

          {/* Analiz Butonu */}
          <TouchableOpacity
            style={styles.analyzeButton}
            onPress={handleGenerateAnalysis}
          >
            <LinearGradient
              colors={[colors.primary, colors.primaryLight]}
              style={styles.analyzeGradient}
            >
              <MaterialCommunityIcons name="auto-fix" size={24} color={colors.text.light} />
              <Text style={styles.analyzeText}>
                {premiumStatus.isPremium ? "Analizini Oluştur" : "Hemen Dene"}
              </Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Date Picker Modal */}
      {showDatePicker && (
        <DateTimePicker
          value={birthDate}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleDateChange}
          maximumDate={new Date()}
          minimumDate={new Date(1900, 0, 1)}
        />
      )}

      {/* Time Picker Modal */}
      {showTimePicker && (
        <DateTimePicker
          value={new Date(2000, 0, 1, parseInt(birthTime.split(':')[0]), parseInt(birthTime.split(':')[1]))}
          mode="time"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={handleTimeChange}
        />
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  loadingText: {
    color: colors.text.light,
    fontSize: 18,
    marginTop: 20,
    fontWeight: '500',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    flex: 1,
    textAlign: 'center',
  },
  newAnalysisButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  placeholder: {
    width: 40,
  },
  scrollView: {
    flex: 1,
  },
  formSection: {
    padding: 20,
  },
  formTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: 10,
  },
  formSubtitle: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 30,
    lineHeight: 22,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.light,
    marginBottom: 8,
  },
  dateInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  dateText: {
    fontSize: 16,
    color: colors.text.light,
    marginLeft: 10,
  },
  timeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  timeText: {
    fontSize: 16,
    color: colors.text.light,
    marginLeft: 10,
  },
  placeInput: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  placeText: {
    fontSize: 16,
    color: colors.text.light,
    marginLeft: 10,
    flex: 1,
  },
  premiumInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 30,
    borderWidth: 1,
    borderColor: colors.border,
  },
  premiumText: {
    fontSize: 14,
    marginLeft: 10,
    flex: 1,
    fontWeight: '500',
  },
  analyzeButton: {
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  analyzeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 18,
    paddingHorizontal: 30,
  },
  analyzeText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 10,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 20,
    textAlign: 'center',
  },
  mainSigns: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  signCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 15,
    padding: 15,
    alignItems: 'center',
    marginHorizontal: 5,
    borderWidth: 1,
    borderColor: colors.border,
  },
  signTitle: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 8,
    textAlign: 'center',
  },
  signValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 4,
    textAlign: 'center',
  },
  signDescription: {
    fontSize: 10,
    color: colors.text.tertiary,
    marginTop: 4,
    textAlign: 'center',
  },
  personalitySection: {
    marginBottom: 30,
  },
  subSectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 15,
  },
  analysisCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  analysisTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 8,
  },
  analysisText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 10,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingLabel: {
    fontSize: 12,
    color: colors.text.tertiary,
    marginRight: 8,
  },
  elementSection: {
    marginBottom: 20,
  },
  elementsGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  elementCard: {
    flex: 1,
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    marginHorizontal: 3,
    borderWidth: 1,
    borderColor: colors.border,
  },
  elementIcon: {
    fontSize: 24,
    marginBottom: 8,
  },
  elementName: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 8,
  },
  elementRating: {
    flexDirection: 'row',
  },
  transitsSection: {
    marginBottom: 30,
  },
  transitCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  transitHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  transitPlanet: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  transitPercentage: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  percentageText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  transitEffect: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 10,
  },
  transitRating: {
    flexDirection: 'row',
  },
  predictionsSection: {
    marginBottom: 20,
  },
  predictionCard: {
    backgroundColor: colors.card,
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: colors.border,
  },
  predictionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  predictionArea: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  predictionPercentage: {
    backgroundColor: colors.primary,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  predictionText: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 18,
    marginBottom: 8,
  },
  predictionAdvice: {
    fontSize: 13,
    color: colors.text.tertiary,
    fontStyle: 'italic',
    marginBottom: 10,
  },
  predictionRating: {
    flexDirection: 'row',
  },
  bottomPadding: {
    height: 100,
  },
  // Yeni AI analizi stilleri
  dominantElementsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  dominantElementsTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.secondary,
    marginBottom: 8,
  },
  dominantElementsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  dominantElementTag: {
    backgroundColor: colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    marginRight: 8,
    marginBottom: 6,
  },
  dominantElementText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  compatibleSignsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 8,
  },
  compatibleSignTag: {
    backgroundColor: colors.secondary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    marginRight: 8,
    marginBottom: 6,
  },
  compatibleSignText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: colors.background,
  },
});

export default AstrologyAnalysisScreen; 