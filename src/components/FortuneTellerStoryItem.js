import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions
} from 'react-native';
import { Image } from 'expo-image';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const { width: screenWidth } = Dimensions.get('window');

const FortuneTellerStoryItem = ({ 
  fortuneTeller, 
  stories = [], 
  onPress,
  isViewed = false
}) => {
  const handlePress = () => {
    if (onPress) {
      onPress(fortuneTeller, stories);
    }
  };

  const hasStories = stories.length > 0;

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={handlePress}
      activeOpacity={0.8}
      disabled={!hasStories}
    >
      <View
        style={[
          styles.storyRing,
          {
            borderColor: isViewed ? colors.text.tertiary : colors.secondary,
            backgroundColor: isViewed 
              ? 'rgba(255, 255, 255, 0.1)' 
              : 'rgba(255, 215, 0, 0.1)',
          }
        ]}
      >
        <View style={styles.avatarContainer}>
          <Image
            source={{ uri: fortuneTeller.profile_image }}
            style={styles.avatar}
            contentFit="cover"
          />
          

        </View>
      </View>

      {/* Falcı adı */}
      <Text style={[
        styles.fortuneTellerName,
        { color: isViewed ? colors.text.tertiary : colors.text.light }
      ]} numberOfLines={1}>
        {fortuneTeller.name}
      </Text>


    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    width: 80,
  },
  storyRing: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: spacing.xs,
    ...shadows.medium,
  },
  avatarContainer: {
    position: 'relative',
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  avatar: {
    width: '100%',
    height: '100%',
  },

  fortuneTellerName: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    textAlign: 'center',
    marginBottom: spacing.xs,
  },

});

export default FortuneTellerStoryItem; 