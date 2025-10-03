import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const ExploreCallToAction = ({ onActionPress }) => {
  const curiosityTexts = [
    "Merak ettiğin sorular var mı?",
    "Gelecekte neler seni bekliyor?",
    "Aşk hayatında hangi sürprizler var?",
    "Kariyerinde yeni fırsatlar yakında mı?",
    "Bugün senin için hangi mesajlar var?"
  ];

  const randomText = curiosityTexts[Math.floor(Math.random() * curiosityTexts.length)];

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.ctaCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.textContainer}>
          <Text style={styles.mainText}>{randomText}</Text>
          <Text style={styles.subText}>Hemen fal baktır ve merakını gider!</Text>
        </View>
        
        <TouchableOpacity
          style={styles.actionButton}
          onPress={onActionPress}
          activeOpacity={0.8}
        >
          <MaterialCommunityIcons 
            name="crystal-ball" 
            size={24} 
            color={colors.primary} 
          />
          <Text style={styles.buttonText}>FAL BAKTIR</Text>
        </TouchableOpacity>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  ctaCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  mainText: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.sm,
    lineHeight: 28,
  },
  subText: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 22,
  },
  actionButton: {
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    minWidth: 180,
    ...shadows.medium,
  },
  buttonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default ExploreCallToAction; 