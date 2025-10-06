import React, { useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Animated,
  TouchableOpacity,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import PremiumButton from './PremiumButton';

/**
 * Premium Package Card Component
 * Abonelik ve jeton paketleri için lüks kart tasarımı
 * 
 * @param {Object} props
 * @param {string} props.type - Kart tipi: 'subscription' veya 'token'
 * @param {string} props.title - Paket başlığı
 * @param {string} props.price - Fiyat bilgisi
 * @param {string} props.priceNote - Fiyat notu (örn: "/ay")
 * @param {string} props.description - Paket açıklaması
 * @param {Array} props.features - Özellikler listesi
 * @param {string} props.icon - Icon adı
 * @param {string} props.iconColor - Icon arka plan rengi
 * @param {string} props.iconLabel - Icon altı etiket
 * @param {number} props.tokenCount - Jeton sayısı (sadece token tipi için)
 * @param {boolean} props.popular - Popüler badge göster
 * @param {string} props.buttonText - Buton metni
 * @param {Function} props.onPress - Buton basma olayı
 * @param {boolean} props.loading - Yükleme durumu
 * @param {boolean} props.disabled - Devre dışı durumu
 * @param {string} props.originalPrice - Orijinal fiyat (indirim için)
 * @param {string} props.discount - İndirim yüzdesi
 */
const PremiumPackageCard = ({
  type = 'subscription',
  title,
  price,
  priceNote,
  description,
  features = [],
  icon,
  iconColor,
  iconLabel,
  tokenCount,
  popular = false,
  buttonText = 'Satın Al',
  onPress,
  loading = false,
  disabled = false,
  originalPrice,
  discount,
}) => {
  const scaleValue = useRef(new Animated.Value(1)).current;
  const shimmerValue = useRef(new Animated.Value(0)).current;

  // Kart hover animasyonu - Yavaş ve zarif
  useEffect(() => {
    if (popular) {
      const shimmerAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(shimmerValue, {
            toValue: 1,
            duration: 3500, // Daha yavaş ve zarif
            useNativeDriver: true,
          }),
          Animated.timing(shimmerValue, {
            toValue: 0,
            duration: 3500, // Daha yavaş ve zarif
            useNativeDriver: true,
          }),
        ])
      );
      shimmerAnimation.start();
      return () => shimmerAnimation.stop();
    }
  }, [popular]);

  const handlePressIn = () => {
    Animated.spring(scaleValue, {
      toValue: 0.98,
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

  const shimmerOpacity = shimmerValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.3, 0.7, 0.3], // Yumuşak parlama
  });

  return (
    <Animated.View
      style={[
        styles.cardWrapper,
        { transform: [{ scale: scaleValue }] },
      ]}
    >
      <TouchableOpacity
        activeOpacity={1}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        disabled={disabled}
      >
        {/* Gradient Border */}
        <LinearGradient
          colors={popular ? ['#FFD700', '#FFFFFF', '#FFD700'] : ['#FFD700', '#FFF8DC']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={[
            styles.gradientBorder,
            popular && styles.popularGradientBorder,
          ]}
        >
          {/* Popular Badge */}
          {popular && (
            <Animated.View style={[styles.popularBadge, { opacity: shimmerOpacity }]}>
              <LinearGradient
                colors={['#FFD700', '#FFF8DC', '#FFD700']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                style={styles.popularBadgeGradient}
              >
                <MaterialCommunityIcons name="star" size={14} color={colors.text.dark} />
                <Text style={styles.popularText}>En Popüler</Text>
              </LinearGradient>
            </Animated.View>
          )}

          {/* Card Content */}
          <View style={styles.cardContent}>
            {/* Icon Section */}
            <View style={styles.iconSection}>
              <LinearGradient
                colors={[iconColor || colors.secondary, iconColor || colors.secondary]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.iconContainer}
              >
                <MaterialCommunityIcons 
                  name={icon || (type === 'subscription' ? 'crown' : 'diamond')} 
                  size={28} 
                  color={colors.text.light} 
                />
                {tokenCount && (
                  <Text style={styles.tokenCount}>{tokenCount}</Text>
                )}
              </LinearGradient>
              {iconLabel && (
                <Text style={styles.iconLabel}>{iconLabel}</Text>
              )}
            </View>

            {/* Info Section */}
            <View style={styles.infoSection}>
              <Text style={styles.packageTitle}>{title}</Text>
              
              {description && (
                <Text style={styles.packageDescription}>{description}</Text>
              )}

              {/* Price Section */}
              <View style={styles.priceContainer}>
                <Text style={styles.packagePrice}>
                  {price}
                  {priceNote && (
                    <Text style={styles.priceNote}>{priceNote}</Text>
                  )}
                </Text>
                
                {originalPrice && (
                  <Text style={styles.originalPrice}>{originalPrice}</Text>
                )}
                
                {discount && discount !== '0%' && (
                  <View style={styles.discountBadge}>
                    <Text style={styles.discountText}>{discount} İndirim</Text>
                  </View>
                )}
              </View>

              {/* Features List */}
              {features.length > 0 && (
                <View style={styles.featuresContainer}>
                  {features.map((feature, index) => (
                    <View key={index} style={styles.featureRow}>
                      <LinearGradient
                        colors={['#FFD700', '#FFF8DC']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 0 }}
                        style={styles.featureIconGradient}
                      >
                        <Ionicons 
                          name="checkmark-circle" 
                          size={16} 
                          color={colors.success} 
                        />
                      </LinearGradient>
                      <Text style={styles.featureText}>{feature}</Text>
                    </View>
                  ))}
                </View>
              )}
            </View>
          </View>

          {/* Action Button */}
          <PremiumButton
            onPress={onPress}
            title={buttonText}
            icon={type === 'subscription' ? 'crown' : 'diamond'}
            iconSize={22}
            loading={loading}
            disabled={disabled}
            variant="primary"
            style={styles.actionButton}
          />
        </LinearGradient>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  cardWrapper: {
    marginBottom: 20,
  },
  gradientBorder: {
    borderRadius: 20,
    padding: 2,
    position: 'relative',
    // Premium gölge efekti
    shadowColor: colors.secondary,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 10,
  },
  popularGradientBorder: {
    padding: 3,
    shadowOpacity: 0.6,
    shadowRadius: 16,
    elevation: 14,
  },
  popularBadge: {
    position: 'absolute',
    top: -12,
    right: 20,
    zIndex: 10,
    borderRadius: 20,
    overflow: 'hidden',
  },
  popularBadgeGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
  },
  popularText: {
    color: colors.text.dark,
    fontSize: 13,
    fontWeight: 'bold',
    letterSpacing: 0.5,
  },
  cardContent: {
    backgroundColor: '#580C8B', // Hafif transparan, mor tonlu koyu
    borderRadius: 18,
    padding: 20,
    flexDirection: 'row',
  },
  iconSection: {
    alignItems: 'center',
    marginRight: 16,
    width: 80,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
    shadowColor: colors.shadow,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  tokenCount: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.light,
    marginTop: 2,
  },
  iconLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: colors.text.tertiary,
    textAlign: 'center',
  },
  infoSection: {
    flex: 1,
  },
  packageTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: colors.text.light,
    marginBottom: 6,
    letterSpacing: 0.3,
  },
  packageDescription: {
    fontSize: 13,
    color: colors.text.tertiary,
    marginBottom: 12,
    lineHeight: 18,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    marginBottom: 12,
    gap: 8,
  },
  packagePrice: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.secondary,
  },
  priceNote: {
    fontSize: 14,
    fontWeight: 'normal',
    color: colors.text.tertiary,
  },
  originalPrice: {
    fontSize: 13,
    color: colors.text.tertiary,
    textDecorationLine: 'line-through',
  },
  discountBadge: {
    backgroundColor: colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
  discountText: {
    fontSize: 11,
    fontWeight: 'bold',
    color: colors.text.light,
  },
  featuresContainer: {
    gap: 10,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  featureIconGradient: {
    width: 20,
    height: 20,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  featureText: {
    flex: 1,
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  actionButton: {
    marginTop: 16,
    marginHorizontal: 2,
  },
});

export default PremiumPackageCard;

