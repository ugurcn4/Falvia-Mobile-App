import React, { useState } from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const { width } = Dimensions.get('window');

const FortuneStoryCard = ({ item, onLike, onComment }) => {
  const [liked, setLiked] = useState(false);
  
  const handleLike = () => {
    setLiked(!liked);
    if (onLike) onLike(item.id, !liked);
  };

  return (
    <View style={styles.storyCard}>
      <View style={styles.storyHeader}>
        <Image source={{ uri: item.avatar }} style={styles.storyAvatar} />
        <View style={styles.storyHeaderInfo}>
          <Text style={styles.storyUserName}>{item.name}</Text>
          <Text style={styles.storyTime}>{item.time}</Text>
        </View>
      </View>
      
      <Image source={{ uri: item.imageUrl }} style={styles.storyImage} />
      
      <View style={styles.storyActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleLike}
        >
          <Ionicons 
            name={liked ? "heart" : "heart-outline"} 
            size={24} 
            color={liked ? colors.error : colors.text.light} 
          />
          {item.likes > 0 && (
            <Text style={styles.actionCount}>{item.likes}</Text>
          )}
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onComment && onComment(item.id)}
        >
          <Ionicons name="chatbubble-outline" size={22} color={colors.text.light} />
          {item.comments > 0 && (
            <Text style={styles.actionCount}>{item.comments}</Text>
          )}
        </TouchableOpacity>
      </View>
      
      <View style={styles.storyContent}>
        <Text style={styles.storyDescription}>{item.description}</Text>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  storyCard: {
    backgroundColor: 'rgba(18, 18, 37, 0.8)',
    borderRadius: radius.md,
    marginBottom: spacing.lg,
    overflow: 'hidden',
    ...shadows.md,
  },
  storyHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
  },
  storyAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  storyHeaderInfo: {
    marginLeft: spacing.sm,
  },
  storyUserName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  storyTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  storyImage: {
    width: '100%',
    height: width * 0.75, // Ekran genişliğine göre ayarlanabilir oran
    resizeMode: 'cover',
  },
  storyActions: {
    flexDirection: 'row',
    padding: spacing.md,
  },
  actionButton: {
    marginRight: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
  },
  actionCount: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xs,
  },
  storyContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  storyDescription: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    lineHeight: typography.lineHeight.md,
  },
});

export default FortuneStoryCard; 