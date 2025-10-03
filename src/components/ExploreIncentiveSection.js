import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, AntDesign } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const ExploreIncentiveSection = ({ 
  onSendFortunePress, 
  onWatchAdPress, 
  onFirstFortunePress,
  isNewUser = false 
}) => {

  return (
    <View style={styles.container}>
      {/* İlk Yükleme Fal Hediyesi */}
      {isNewUser && (
        <LinearGradient
          colors={[colors.secondary, '#D4AF37']}
          style={styles.welcomeCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.welcomeContent}>
            <MaterialCommunityIcons name="gift" size={32} color={colors.background} />
            <Text style={styles.welcomeTitle}>🎁 İlk Falın Hediye!</Text>
            <Text style={styles.welcomeSubtitle}>Hoş geldin! İlk falını ücretsiz baktır</Text>
            <Text style={styles.welcomeSubtitle}>Ayrıca ilk satın alımında 1 fal da bizden hediye ediyoruz!</Text>
            <TouchableOpacity
              style={styles.welcomeButton}
              onPress={onFirstFortunePress}
              activeOpacity={0.8}
            >
              <Text style={styles.welcomeButtonText}>Hediyemi Al</Text>
            </TouchableOpacity>
          </View>
        </LinearGradient>
      )}



      {/* Reklam İzle Jeton Kazan */}
      <View style={styles.adRewardCard}>
        <View style={styles.adRewardContent}>
          <View style={styles.adRewardLeft}>
            <MaterialCommunityIcons name="play-circle" size={40} color={colors.primary} />
            <View style={styles.adRewardText}>
              <Text style={styles.adRewardTitle}>📺 Reklam İzle Jeton Kazan</Text>
              <Text style={styles.adRewardSubtitle}>30 saniye reklam izle, 1 jeton kazan</Text>
            </View>
          </View>
          <TouchableOpacity
            style={styles.adRewardButton}
            onPress={onWatchAdPress}
            activeOpacity={0.8}
          >
            <AntDesign name="play" size={20} color={colors.background} />
            <Text style={styles.adRewardButtonText}>İZLE</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Ana Fal Gönder Butonu */}
      <LinearGradient
        colors={[colors.primary, colors.primaryLight]}
        style={styles.mainActionCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.mainActionContent}>
          <Text style={styles.mainActionTitle}>🔮 Fal Gönder</Text>
          <Text style={styles.mainActionSubtitle}>Merakındaki her şeyi öğren, uzman falcılarımızla konuş</Text>
          
          <TouchableOpacity
            style={styles.mainActionButton}
            onPress={onSendFortunePress}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="send" size={24} color={colors.primary} />
            <Text style={styles.mainActionButtonText}>Fal Gönder</Text>
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
  
  // Welcome Card (Yeni kullanıcı hediyesi)
  welcomeCard: {
    borderRadius: radius.lg,
    padding: spacing.lg,
    marginBottom: spacing.lg,
    alignItems: 'center',
    ...shadows.large,
  },
  welcomeContent: {
    alignItems: 'center',
  },
  welcomeTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
    textAlign: 'center',
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  welcomeSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.background,
    textAlign: 'center',
    marginBottom: spacing.lg,
    opacity: 0.9,
  },
  welcomeButton: {
    backgroundColor: colors.background,
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadows.medium,
  },
  welcomeButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },



  // Ad Reward Card (Reklam izle kartı)
  adRewardCard: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginBottom: spacing.lg,
    borderWidth: 1,
    borderColor: colors.primary,
    ...shadows.medium,
  },
  adRewardContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  adRewardLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  adRewardText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  adRewardTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  adRewardSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  adRewardButton: {
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
  },
  adRewardButtonText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
    marginLeft: spacing.xs,
  },

  // Main Action Card (Ana fal gönder)
  mainActionCard: {
    borderRadius: radius.xl,
    padding: spacing.xl,
    alignItems: 'center',
    ...shadows.large,
  },
  mainActionContent: {
    alignItems: 'center',
  },
  mainActionTitle: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    textAlign: 'center',
    marginBottom: spacing.sm,
  },
  mainActionSubtitle: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: spacing.xl,
    lineHeight: 22,
  },
  mainActionButton: {
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.xl,
    paddingVertical: spacing.lg,
    borderRadius: radius.lg,
    minWidth: 200,
    justifyContent: 'center',
    ...shadows.large,
  },
  mainActionButtonText: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default ExploreIncentiveSection; 