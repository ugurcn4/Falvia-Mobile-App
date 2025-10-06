import React, { useRef, useEffect } from 'react';
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Animated,
  ActivityIndicator,
  View,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';

/**
 * Premium Button Component
 * Altın sarısı ve beyaz gradyan ile lüks bir buton tasarımı
 * 
 * @param {Object} props
 * @param {Function} props.onPress - Basma olayı
 * @param {string} props.title - Buton metni
 * @param {boolean} props.loading - Yükleme durumu
 * @param {boolean} props.disabled - Devre dışı durumu
 * @param {string} props.icon - Icon adı (MaterialCommunityIcons)
 * @param {number} props.iconSize - Icon boyutu
 * @param {Object} props.style - Ek stil
 * @param {Object} props.textStyle - Metin stili
 * @param {string} props.variant - Buton varyantı: 'primary', 'secondary', 'outlined'
 */
const PremiumButton = ({
  onPress,
  title,
  loading = false,
  disabled = false,
  icon = null,
  iconSize = 20,
  style,
  textStyle,
  variant = 'primary',
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const shimmerValue = useRef(new Animated.Value(0)).current;

  // Parlama animasyonu - Yavaş ve zarif
  useEffect(() => {
    const shimmerAnimation = Animated.loop(
      Animated.sequence([
        Animated.timing(shimmerValue, {
          toValue: 1,
          duration: 2800, // Daha yavaş ve zarif
          useNativeDriver: true,
        }),
        Animated.timing(shimmerValue, {
          toValue: 0,
          duration: 2800, // Daha yavaş ve zarif
          useNativeDriver: true,
        }),
      ])
    );
    shimmerAnimation.start();
    return () => shimmerAnimation.stop();
  }, []);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.95,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.spring(scaleValue, {
      toValue: 1,
      friction: 3,
      tension: 40,
      useNativeDriver: true,
    }).start();
  };

  const shimmerTranslate = shimmerValue.interpolate({
    inputRange: [0, 1],
    outputRange: [-200, 200], // Daha geniş hareket alanı
  });

  const shimmerOpacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.2, 0.6, 0.2], // Yumuşak parlama
  });

  const getGradientColors = () => {
    if (disabled) {
      return ['#4A4A4A', '#2A2A2A'];
    }
    
    switch (variant) {
      case 'primary':
        return ['#FFD700', '#FFF8DC', '#FFD700']; // Altın sarısı -> Krem beyaz -> Altın sarısı
      case 'secondary':
        return ['#FFFFFF', '#FFD700', '#FFFFFF']; // Beyaz -> Altın -> Beyaz
      case 'outlined':
        return ['transparent', 'transparent'];
      default:
        return ['#FFD700', '#FFF8DC', '#FFD700'];
    }
  };

  const getTextColor = () => {
    if (disabled) {
      return colors.text.tertiary;
    }
    if (variant === 'outlined') {
      return colors.secondary;
    }
    return colors.text.dark;
  };

  const buttonContent = (
    <Animated.View
      style={[
        styles.buttonContainer,
        { transform: [{ scale: scaleValue }] },
        style,
      ]}
    >
      {variant === 'outlined' ? (
        <View style={[styles.outlinedButton, disabled && styles.disabledButton]}>
          {loading ? (
            <ActivityIndicator color={colors.secondary} size="small" />
          ) : (
            <View style={styles.contentContainer}>
              {icon && (
                <MaterialCommunityIcons
                  name={icon}
                  size={iconSize}
                  color={getTextColor()}
                  style={styles.icon}
                />
              )}
              <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                {title}
              </Text>
            </View>
          )}
        </View>
      ) : (
        <LinearGradient
          colors={getGradientColors()}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
          style={[styles.gradient, disabled && styles.disabledButton]}
        >
          {/* Parlama efekti - Daha belirgin */}
          <Animated.View
            style={[
              styles.shimmer,
              {
                transform: [{ translateX: shimmerTranslate }],
                opacity: shimmerOpacity,
              },
            ]}
          >
            {/* Çift katmanlı parlama için ikinci gradient */}
            <Animated.View style={styles.shimmerInner} />
          </Animated.View>

          {loading ? (
            <ActivityIndicator color={colors.text.dark} size="small" />
          ) : (
            <View style={styles.contentContainer}>
              {icon && (
                <MaterialCommunityIcons
                  name={icon}
                  size={iconSize}
                  color={getTextColor()}
                  style={styles.icon}
                />
              )}
              <Text style={[styles.text, { color: getTextColor() }, textStyle]}>
                {title}
              </Text>
            </View>
          )}
        </LinearGradient>
      )}
    </Animated.View>
  );

  return (
    <TouchableOpacity
      onPress={onPress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled || loading}
      activeOpacity={0.9}
    >
      {buttonContent}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  buttonContainer: {
    borderRadius: 16,
    overflow: 'hidden',
    // Premium gölge efekti
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.5,
    shadowRadius: 16,
    elevation: 12,
  },
  gradient: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    overflow: 'hidden',
  },
  outlinedButton: {
    paddingVertical: 16,
    paddingHorizontal: 24,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 56,
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
  },
  disabledButton: {
    opacity: 0.5,
  },
  contentContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  icon: {
    marginRight: 8,
  },
  text: {
    fontSize: 16,
    fontWeight: 'bold',
    letterSpacing: 0.5,
    textShadowColor: 'rgba(0, 0, 0, 0.2)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  shimmer: {
    position: 'absolute',
    top: -20,
    left: -100,
    right: -100,
    bottom: -20,
    width: 120, // Geniş ışık bandı
    backgroundColor: 'rgba(209, 196, 233, 0.5)', // Açık lavanta mor (#D1C4E9)
    transform: [{ skewX: '-20deg' }], // Eğimli yansıma
    shadowColor: '#CE93D8', // Açık mor glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 12,
  },
  shimmerInner: {
    position: 'absolute',
    top: 0,
    left: 20,
    width: 60,
    height: '100%',
    backgroundColor: 'rgba(225, 190, 231, 0.4)', // Çok açık mor (#E1BEE7)
    shadowColor: '#E1BEE7', // Çok açık mor glow
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 10,
  },
});

export default PremiumButton;

