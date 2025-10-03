import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TouchableOpacity, 
  Image, 
  Animated, 
  StyleSheet,
  Dimensions 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { getCardBack, getTarotCardBack } from '../services/cardService';

const { width } = Dimensions.get('window');

const CardComponent = ({ 
  card, 
  isFlipped = false, 
  onPress, 
  isSelected = false,
  disabled = false,
  size = 'medium', // 'small', 'medium', 'large'
  showMeaning = false,
  style = {},
  cardType = 'katina', // 'tarot' veya 'katina'
  animationDelay = 0, // Dağıtma animasyonu için gecikme
  isShuffling = false, // Karıştırma animasyonu
  dealAnimation = false // Dağıtma animasyonu
}) => {
  const [flipped, setFlipped] = useState(isFlipped);
  const flipAnim = useRef(new Animated.Value(isFlipped ? 1 : 0)).current;
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const dealAnim = useRef(new Animated.Value(0)).current;
  const shuffleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;

  // Kart boyutları
  const cardSizes = {
    small: { width: 60, height: 84 },
    medium: { width: 80, height: 112 },
    large: { width: 100, height: 140 }
  };

  const cardSize = cardSizes[size];

  // Dağıtma animasyonu
  useEffect(() => {
    if (dealAnimation) {
      dealAnim.setValue(0);
      setTimeout(() => {
        Animated.spring(dealAnim, {
          toValue: 1,
          tension: 100,
          friction: 8,
          useNativeDriver: true
        }).start();
      }, animationDelay);
    } else {
      dealAnim.setValue(1);
    }
  }, [dealAnimation, animationDelay]);

  // Karıştırma animasyonu
  useEffect(() => {
    if (isShuffling) {
      const shuffleLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(shuffleAnim, {
            toValue: 1,
            duration: 150,
            useNativeDriver: true
          }),
          Animated.timing(shuffleAnim, {
            toValue: -1,
            duration: 150,
            useNativeDriver: true
          }),
          Animated.timing(shuffleAnim, {
            toValue: 0,
            duration: 150,
            useNativeDriver: true
          })
        ])
      );
      shuffleLoop.start();
      
      return () => shuffleLoop.stop();
    } else {
      shuffleAnim.setValue(0);
    }
  }, [isShuffling]);

  useEffect(() => {
    setFlipped(isFlipped);
    Animated.timing(flipAnim, {
      toValue: isFlipped ? 1 : 0,
      duration: cardType === 'tarot' ? 800 : 600, // Tarot kartları daha yavaş çevrilir
      useNativeDriver: false
    }).start();
  }, [isFlipped]);

  useEffect(() => {
    if (isSelected) {
      // Seçili kart için glow efekti
      Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: false
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 1000,
            useNativeDriver: false
          })
        ])
      ).start();
      
      // Tarot kartları için ek rotasyon efekti
      if (cardType === 'tarot') {
        Animated.loop(
          Animated.timing(rotateAnim, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: true
          })
        ).start();
      }
    } else {
      glowAnim.setValue(0);
      rotateAnim.setValue(0);
    }
  }, [isSelected]);

  const handlePress = () => {
    if (disabled) return;

    // Basma animasyonu
    Animated.sequence([
      Animated.timing(scaleAnim, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true
      }),
      Animated.timing(scaleAnim, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true
      })
    ]).start();

    if (onPress) {
      onPress(card);
    }
  };

  // Flip animasyonu için interpolation
  const frontInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '180deg']
  });

  const backInterpolate = flipAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['180deg', '360deg']
  });

  const frontOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 0, 0]
  });

  const backOpacity = flipAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0, 1]
  });

  // Glow rengi (tarot için farklı renk)
  const glowColor = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [
      'rgba(255, 215, 0, 0)', 
      cardType === 'tarot' ? 'rgba(138, 43, 226, 0.8)' : 'rgba(255, 215, 0, 0.6)'
    ]
  });
  
  // Karıştırma animasyonu için transform
  const shuffleTransform = shuffleAnim.interpolate({
    inputRange: [-1, 0, 1],
    outputRange: [-10, 0, 10]
  });
  
  // Rotasyon animasyonu (sadece tarot için)
  const rotateInterpolate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg']
  });
  
  // Dağıtma animasyonu
  const dealScale = dealAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 1]
  });
  
  const dealOpacity = dealAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0, 0.5, 1]
  });

  return (
    <View style={[styles.cardContainer, style]}>
      {/* Glow efekti */}
      <Animated.View
        style={[
          styles.glowContainer,
          {
            width: cardSize.width + 10,
            height: cardSize.height + 10,
            shadowColor: glowColor,
            shadowOpacity: isSelected ? 1 : 0,
            shadowRadius: 15,
            elevation: isSelected ? 10 : 0
          }
        ]}
      />

      <TouchableOpacity
        onPress={handlePress}
        disabled={disabled}
        activeOpacity={0.8}
      >
        <Animated.View
          style={[
            styles.card,
            {
              width: cardSize.width,
              height: cardSize.height,
              transform: [
                { scale: Animated.multiply(scaleAnim, dealScale) },
                { translateX: shuffleTransform },
                { rotate: cardType === 'tarot' && isSelected ? rotateInterpolate : '0deg' }
              ],
              opacity: dealOpacity
            }
          ]}
        >
          {/* Kart Arkası */}
          <Animated.View
            style={[
              styles.cardFace,
              cardType === 'tarot' ? styles.tarotCardBack : styles.cardBack,
              {
                width: cardSize.width,
                height: cardSize.height,
                transform: [{ rotateY: frontInterpolate }],
                opacity: frontOpacity
              }
            ]}
          >
            <LinearGradient
              colors={cardType === 'tarot' 
                ? [colors.primaryDark, '#4B0082', colors.primary] 
                : [colors.primaryDark, colors.primary]}
              style={styles.cardBackGradient}
            >
              <Image 
                source={cardType === 'tarot' ? getTarotCardBack() : getCardBack()} 
                style={[styles.cardImage, { width: cardSize.width, height: cardSize.height }]}
                resizeMode="cover"
              />
            </LinearGradient>
          </Animated.View>

          {/* Kart Önü */}
          <Animated.View
            style={[
              styles.cardFace,
              cardType === 'tarot' ? styles.tarotCardFront : styles.cardFront,
              {
                width: cardSize.width,
                height: cardSize.height,
                transform: [{ rotateY: backInterpolate }],
                opacity: backOpacity
              }
            ]}
          >
            <Image 
              source={card?.image || (cardType === 'tarot' ? getTarotCardBack() : getCardBack())} 
              style={[styles.cardImage, { width: cardSize.width, height: cardSize.height }]}
              resizeMode="cover"
            />
            
            {/* Seçim göstergesi */}
            {isSelected && (
              <View style={[
                styles.selectionIndicator,
                cardType === 'tarot' && styles.tarotSelectionIndicator
              ]}>
                <View style={styles.selectionDot} />
              </View>
            )}
            
            {/* Tarot kartları için özel border */}
            {cardType === 'tarot' && (
              <View style={styles.tarotBorder} />
            )}
          </Animated.View>
        </Animated.View>
      </TouchableOpacity>

      {/* Kart anlamı (isteğe bağlı) */}
      {showMeaning && flipped && card?.meaning && (
        <View style={[
          styles.meaningContainer,
          cardType === 'tarot' && styles.tarotMeaningContainer
        ]}>
          <Text style={[
            styles.meaningTitle,
            cardType === 'tarot' && styles.tarotMeaningTitle
          ]}>
            {card.meaning.name || card.turkishName}
          </Text>
          <Text style={styles.meaningText}>{card.meaning.meaning}</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  cardContainer: {
    alignItems: 'center',
    marginVertical: 8,
  },
  glowContainer: {
    position: 'absolute',
    top: -5,
    left: -5,
    borderRadius: 12,
  },
  card: {
    borderRadius: 12,
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  cardFace: {
    position: 'absolute',
    backfaceVisibility: 'hidden',
    borderRadius: 12,
    overflow: 'hidden',
  },
  cardBack: {
    // Arka yüz stilleri
  },
  cardFront: {
    // Ön yüz stilleri
  },
  cardBackGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardImage: {
    borderRadius: 12,
  },
  selectionIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: colors.success,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 5,
  },
  selectionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.text.light,
  },
  meaningContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: width - 40,
  },
  meaningTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.secondary,
    marginBottom: 4,
    textAlign: 'center',
  },
  meaningText: {
    fontSize: 12,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 16,
  },
  tarotCardBack: {
    // Tarot kartları için arka yüz stilleri
  },
  tarotCardFront: {
    // Tarot kartları için ön yüz stilleri
  },
  tarotSelectionIndicator: {
    // Tarot kartları için seçim göstergesi stilleri
  },
  tarotBorder: {
    // Tarot kartları için özel border stilleri
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    borderWidth: 2,
    borderColor: colors.primary,
    borderRadius: 12,
  },
  tarotMeaningContainer: {
    // Tarot kartları için anlam kutusu stilleri
    backgroundColor: colors.card,
    borderWidth: 1,
    borderColor: colors.border,
    maxWidth: width - 40,
  },
  tarotMeaningTitle: {
    // Tarot kartları için anlam başlığı stilleri
    color: colors.primary,
  },
});

export default CardComponent; 