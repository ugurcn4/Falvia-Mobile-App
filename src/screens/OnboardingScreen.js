import React, { useState, useRef, useEffect, useLayoutEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  FlatList,
  StatusBar,
  SafeAreaView,
} from 'react-native';
import { Image } from 'expo-image';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const { width, height } = Dimensions.get('window');

const OnboardingScreen = ({ navigation = {}, onComplete }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [imagesLoaded, setImagesLoaded] = useState(false);
  const flatListRef = useRef(null);

  // Navigation prop kontrolü
  if (!navigation) {
    console.warn('OnboardingScreen: navigation prop is undefined');
  }

  // Navigation header'ını gizle
  useLayoutEffect(() => {
    if (navigation && navigation.setOptions) {
      navigation.setOptions({
        headerShown: false,
      });
    }
  }, [navigation]);

  const onboardingData = [
    {
      id: '1',
      title: 'Hoş Geldin!',
      subtitle: 'İlk falın bizden!',
      description: 'Kahve falı dünyasına hoş geldin. Sezgilerinle geleceğini keşfet.',
      image: require('../../assets/görseller/kahve dükkanı kahve ile günaydın instagram  story.gif'),
      icon: 'cafe-outline'
    },
    {
      id: '2',
      subtitle: 'Uzman falcılarımız',
      description: 'Deneyimli falcılarımızla tanış, onların sezgileriyle geleceğini öğren.',
      image: require('../../assets/görseller/Kahve Reels (Labrinth-Formula).png'),
      icon: 'people-outline'
    },
    {
      id: '3',
      title: 'Fal Gönder',
      subtitle: 'Sen de fal gönder!',
      description: 'Kendi falını gönder, diğer kullanıcılarla paylaş ve yorumları gör.',
      image: require('../../assets/görseller/Kahverengi Sade Kahve Zamanı Mobil Video.gif'),
      icon: 'send-outline'
    }
  ];

  // Görselleri önceden yükle
  useEffect(() => {
    preloadImages();
  }, []);

  const preloadImages = () => {
    // Expo Image ile preloading yapmaya gerek yok, direkt true yapıyoruz
    setImagesLoaded(true);
  };

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
    } else {
      completeOnboarding();
    }
  };

  const handleSkip = () => {
    // Eğer profil ekranından açıldıysa geri dön, değilse onboarding'i tamamla
    if (navigation && navigation.canGoBack && navigation.canGoBack()) {
      navigation.goBack();
    } else {
      completeOnboarding();
    }
  };

  const completeOnboarding = async () => {
    try {
      await AsyncStorage.setItem('onboardingCompleted', 'true');
      
      // Eğer profil ekranından açıldıysa geri dön
      if (navigation && navigation.canGoBack && navigation.canGoBack()) {
        navigation.goBack();
      } else if (onComplete) {
        // RootNavigator'dan gelen callback'i çağır
        onComplete();
      }
    } catch (error) {
      console.error('Onboarding tamamlama hatası:', error);
    }
  };

  const renderOnboardingItem = ({ item, index }) => (
    <View style={styles.slide}>
      <View style={styles.imageContainer}>
        <Image 
          source={item.image} 
          style={styles.image} 
          contentFit="cover"
          transition={0}
        />
        <View style={styles.imageOverlay} />
      </View>
      
      <View style={[
        styles.contentContainer,
        index === 1 ? styles.contentContainerBottom : styles.contentContainerTop
      ]}>
        <Text style={styles.title}>{item.title}</Text>
        <Text style={styles.subtitle}>{item.subtitle}</Text>
        <Text style={styles.description}>{item.description}</Text>
      </View>
    </View>
  );

  const renderPagination = () => (
    <View style={styles.paginationContainer}>
      {onboardingData.map((_, index) => (
        <View
          key={index}
          style={[
            styles.paginationDot,
            index === currentIndex && styles.paginationDotActive
          ]}
        />
      ))}
    </View>
  );

  // Yükleniyor durumu
  if (!imagesLoaded) {
    return (
      <View style={styles.container}>
        <StatusBar barStyle="light-content" backgroundColor={colors.background} />
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="light-content" backgroundColor={colors.background} />
      {/* Üstte sabit butonlar */}
      <View style={styles.topButtonContainer}>
        <TouchableOpacity style={styles.skipButtonTop} onPress={handleSkip}>
          <Text style={styles.skipButtonText}>Atla</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.nextButtonTop} onPress={handleNext}>
          <LinearGradient
            colors={[colors.primary, colors.primaryLight]}
            style={styles.nextButtonGradientTop}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Text style={styles.nextButtonText}>
              {currentIndex === onboardingData.length - 1 ? 'Başla' : 'İleri'}
            </Text>
            <Ionicons
              name={currentIndex === onboardingData.length - 1 ? 'checkmark' : 'arrow-forward'}
              size={20}
              color={colors.text.light}
            />
          </LinearGradient>
        </TouchableOpacity>
      </View>
      <FlatList
        ref={flatListRef}
        data={onboardingData}
        renderItem={renderOnboardingItem}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
        removeClippedSubviews={false}
        maxToRenderPerBatch={3}
        windowSize={3}
        initialNumToRender={3}
      />
      <View style={styles.bottomContainer}>
        {renderPagination()}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    paddingTop: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.light,
    fontSize: 18,
    fontWeight: '500',
  },
  slide: {
    width,
    height,
    flex: 1,
  },
  imageContainer: {
    flex: 1,
    position: 'relative',
  },
  image: {
    width: '100%',
    height: '100%',
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(10, 10, 26, 0.4)',
  },
  contentContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  contentContainerTop: {
    justifyContent: 'flex-start',
    paddingTop: height * 0.15,
  },
  contentContainerBottom: {
    justifyContent: 'flex-end',
    paddingBottom: height * 0.25,
  },

  title: {
    ...typography.h1,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.lg,
    fontSize: 42,
    fontWeight: 'bold',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 4,
  },
  subtitle: {
    ...typography.h2,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    fontSize: 24,
    fontWeight: '600',
    textShadowColor: 'rgba(0, 0, 0, 0.8)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  description: {
    ...typography.body,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 28,
    fontSize: 18,
    textShadowColor: 'rgba(0, 0, 0, 0.6)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
    maxWidth: 320,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: spacing.lg,
    paddingBottom: spacing.xl,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  paginationDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: colors.border,
    marginHorizontal: 6,
  },
  paginationDotActive: {
    backgroundColor: colors.secondary,
    width: 30,
  },
  buttonContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: radius.md,
  },
  skipButtonText: {
    ...typography.button,
    color: colors.text.light,
    fontSize: 16,
    fontWeight: '500',
  },
  nextButton: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.large,
  },
  nextButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
  },
  nextButtonText: {
    ...typography.button,
    color: colors.text.light,
    marginRight: spacing.sm,
    fontSize: 18,
    fontWeight: 'bold',
  },
  topButtonContainer: {
    position: 'absolute',
    top: spacing.xl,
    left: 0,
    right: 0,
    zIndex: 10,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
  },
  skipButtonTop: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.lg,
    backgroundColor: 'rgba(255,255,255,0.08)',
    borderRadius: radius.md,
  },
  nextButtonTop: {
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.large,
  },
  nextButtonGradientTop: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
  },
});

export default OnboardingScreen; 