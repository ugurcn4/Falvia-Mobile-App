import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const ExplorePremiumSection = ({ onPremiumPress, isPremium = false }) => {
  if (isPremium) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.secondary, '#D4AF37']}
          style={styles.premiumCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.premiumContent}>
            <MaterialCommunityIcons name="crown" size={32} color={colors.background} />
            <Text style={styles.premiumTitle}>👑 PREMIUM ÜYESİN!</Text>
            <Text style={styles.premiumSubtitle}>Tüm avantajlardan yararlanıyorsun</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.premiumCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.premiumContent}>
          <MaterialCommunityIcons name="star-circle" size={32} color={colors.secondary} />
          <Text style={styles.premiumTitle}>🌟 PREMIUM ÜYELİK AVANTAJLARI</Text>
          <Text style={styles.premiumSubtitle}>Özel ayrıcalıklardan yararlanın</Text>
          
          <View style={styles.benefitsContainer}>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="percent" size={20} color={colors.secondary} />
              <Text style={styles.benefitText}>%10-20 jeton indirimi</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="share" size={20} color={colors.secondary} />
              <Text style={styles.benefitText}>Keşfet'te paylaşım hakkı</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="clock-fast" size={20} color={colors.secondary} />
              <Text style={styles.benefitText}>Öncelikli fal yorumu</Text>
            </View>
            <View style={styles.benefitItem}>
              <MaterialCommunityIcons name="plus" size={20} color={colors.secondary} />
              <Text style={styles.benefitText}>Çok daha fazlası...</Text>
            </View>
          </View>
          
          <TouchableOpacity
            style={styles.premiumButton}
            onPress={onPremiumPress}
            activeOpacity={0.8}
          >
            <LinearGradient
              colors={[colors.secondary, '#D4AF37']}
              style={styles.premiumButtonGradient}
              start={{ x: 0, y: 0 }}
              end={{ x: 1, y: 1 }}
            >
              <Text style={styles.premiumButtonText}>PREMIUM ÜYE OL</Text>
              <MaterialCommunityIcons name="arrow-right" size={20} color={colors.background} />
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  premiumCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.large,
  },
  premiumContent: {
    alignItems: 'center',
  },
  premiumTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.sm,
  },
  premiumSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  benefitsContainer: {
    width: '100%',
    marginBottom: spacing.lg,
  },
  benefitItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  benefitText: {
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    marginLeft: spacing.sm,
    fontWeight: typography.fontWeight.medium,
  },
  premiumButton: {
    width: '100%',
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  premiumButtonGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  premiumButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
    marginRight: spacing.sm,
  },
});

export default ExplorePremiumSection; 