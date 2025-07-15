import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  TouchableOpacity 
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const SubscriptionInfoBox = ({ onSubscribe }) => {
  return (
    <LinearGradient
      colors={['rgba(74, 0, 128, 0.5)', 'rgba(74, 0, 128, 0.2)']}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 1 }}
      style={styles.gradientContainer}
    >
      <View style={styles.container}>
        <Ionicons name="star" size={24} color={colors.secondary} style={styles.icon} />
        <Text style={styles.title}>Keşfette Yer Almak İster misin?</Text>
        <Text style={styles.description}>
          Abonelik alarak falların keşfet sayfasında yayınlanabilir ve daha fazla içeriğe erişebilirsin.
        </Text>
        <TouchableOpacity 
          style={styles.subscribeButton}
          onPress={onSubscribe}
        >
          <Text style={styles.buttonText}>Abonelik Al</Text>
        </TouchableOpacity>
      </View>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  gradientContainer: {
    borderRadius: radius.lg,
    marginHorizontal: spacing.md,
    marginBottom: spacing.xxl,
    ...shadows.md,
  },
  container: {
    padding: spacing.lg,
    alignItems: 'center',
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  icon: {
    marginBottom: spacing.sm,
  },
  title: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    textAlign: 'center',
    marginBottom: spacing.md,
  },
  description: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.lg,
    lineHeight: typography.lineHeight.md,
  },
  subscribeButton: {
    backgroundColor: colors.primary,
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.xl,
    borderRadius: radius.md,
    ...shadows.colored(colors.primaryLight),
  },
  buttonText: {
    color: colors.text.light,
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
  },
});

export default SubscriptionInfoBox; 