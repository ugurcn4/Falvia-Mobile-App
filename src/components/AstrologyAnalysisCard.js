import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';

const AstrologyAnalysisCard = ({ onPress, isPremium = false, trialUsed = false }) => {
  return (
    <TouchableOpacity style={styles.container} onPress={onPress} activeOpacity={0.8}>
      <LinearGradient
        colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
        style={styles.gradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        {/* Premium Badge */}
        <View style={styles.premiumBadge}>
          <MaterialCommunityIcons name="crown" size={16} color={colors.secondary} />
          <Text style={styles.premiumText}>SADECE PREMİUM KULLANICILARA ÖZEL</Text>
        </View>

        {/* Main Content */}
        <View style={styles.content}>
          <View style={styles.header}>
            <MaterialCommunityIcons name="zodiac-sagittarius" size={32} color={colors.secondary} />
            <Text style={styles.title}>Detaylı Astroloji Analizi</Text>
          </View>

          <Text style={styles.description}>
            Doğum haritanız, gezegen konumları ve kişisel transit analiziniz
          </Text>

          <View style={styles.features}>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="chart-line" size={16} color={colors.text.light} />
              <Text style={styles.featureText}>Doğum Haritası</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="star-outline" size={16} color={colors.text.light} />
              <Text style={styles.featureText}>Gezegen Analizi</Text>
            </View>
            <View style={styles.featureItem}>
              <MaterialCommunityIcons name="calendar-clock" size={16} color={colors.text.light} />
              <Text style={styles.featureText}>Transit & Öngörüler</Text>
            </View>
          </View>

          {/* Trial Info */}
          {!isPremium && (
            <View style={styles.trialInfo}>
              <MaterialCommunityIcons name="information" size={16} color={colors.warning} />
              <Text style={styles.trialText}>
                {trialUsed 
                  ? "Premium üyelik gerekmektedir" 
                  : "1 hakkınız vardır, daha sonra premium üyelik gerekmektedir"
                }
              </Text>
            </View>
          )}

          {/* Action Button */}
          <View style={styles.actionButton}>
            <Text style={styles.actionText}>
              {isPremium ? "Analizini Gör" : "Hemen Dene"}
            </Text>
            <MaterialCommunityIcons name="arrow-right" size={20} color={colors.text.light} />
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 20,
    marginVertical: 10,
    borderRadius: 20,
    overflow: 'hidden',
    shadowColor: colors.shadow,
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 10,
  },
  gradient: {
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  premiumBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
    marginBottom: 15,
  },
  premiumText: {
    fontSize: 10,
    fontWeight: 'bold',
    color: colors.secondary,
    marginLeft: 6,
    letterSpacing: 0.5,
  },
  content: {
    alignItems: 'center',
  },
  header: {
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 8,
  },
  description: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 15,
    lineHeight: 20,
  },
  features: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 15,
  },
  featureItem: {
    alignItems: 'center',
    flex: 1,
  },
  featureText: {
    fontSize: 11,
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 4,
    fontWeight: '500',
  },
  trialInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 12,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: 'rgba(255, 193, 7, 0.3)',
  },
  trialText: {
    fontSize: 12,
    color: colors.warning,
    marginLeft: 6,
    textAlign: 'center',
    flex: 1,
    fontWeight: '500',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  actionText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: colors.text.light,
    marginRight: 8,
  },
});

export default AstrologyAnalysisCard; 