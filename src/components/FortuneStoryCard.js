import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity, 
  Dimensions
} from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const { width } = Dimensions.get('window');

const FortuneStoryCard = ({ item, onLike, onComment }) => {
  // item.isLiked değerini kullan, local state yerine
  const liked = item.isLiked || false;
  
  const handleLike = () => {
    if (onLike) onLike(item.id, liked);
  };

  const isFortuneTellerPost = item.type === 'fortune_teller_post';

  return (
    <View style={styles.storyCard}>
      <View style={styles.storyHeader}>
        {/* Avatar */}
        {item.avatar ? (
          <Image 
            source={{ uri: item.avatar }} 
            style={styles.storyAvatar}
          />
        ) : (
          <View style={[styles.storyAvatar, styles.defaultAvatar]}>
            <Ionicons name="person" size={24} color={colors.text.light} />
          </View>
        )}
        <View style={styles.storyHeaderInfo}>
          <View style={styles.nameRow}>
            <Text style={styles.storyUserName}>{item.name}</Text>
            {isFortuneTellerPost && (
              <View style={styles.fortuneTellerBadge}>
                <MaterialCommunityIcons name="crystal-ball" size={12} color={colors.secondary} />
                <Text style={styles.fortuneTellerBadgeText}>Falcı</Text>
              </View>
            )}
          </View>
          <View style={styles.subInfoRow}>
            <Text style={styles.storyTime}>{item.time}</Text>
            {isFortuneTellerPost && item.fortuneTeller && (
              <View style={styles.ratingContainer}>
                <MaterialCommunityIcons name="star" size={12} color={colors.warning} />
                <Text style={styles.ratingText}>{item.fortuneTeller.rating?.toFixed(1) || '0.0'}</Text>
              </View>
            )}
          </View>
        </View>
      </View>
      
      {/* Falcı postları için başlık */}
      {isFortuneTellerPost && item.title && (
        <View style={styles.titleContainer}>
          <Text style={styles.postTitle}>{item.title}</Text>
          {item.category && (
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category}</Text>
            </View>
          )}
        </View>
      )}
      
      {/* Resim varsa göster */}
      {item.imageUrl && (
        <View style={styles.imageContainer}>
          <Image source={{ uri: item.imageUrl }} style={styles.storyImage} />
        </View>
      )}
      
      <View style={styles.storyActions}>
        <TouchableOpacity 
          style={styles.actionButton} 
          onPress={handleLike}
        >
          <Ionicons 
            name={liked ? "heart" : "heart-outline"} 
            size={24} 
            color={liked ? colors.error : colors.secondary} 
          />
          <Text style={styles.actionCount}>{item.likes || 0}</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.actionButton}
          onPress={() => onComment && onComment(item.id)}
        >
          <Ionicons name="chatbubble-ellipses-outline" size={20} color={colors.secondary} />
          <Text style={styles.actionCount}>{item.comments || 0}</Text>
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
  defaultAvatar: {
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.primary,
  },
  storyHeaderInfo: {
    marginLeft: spacing.sm,
    flex: 1,
  },
  nameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  storyUserName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
    marginRight: spacing.xs,
  },
  fortuneTellerBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.secondary + '20',
    paddingHorizontal: spacing.xs,
    paddingVertical: 2,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.secondary + '40',
  },
  fortuneTellerBadgeText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    marginLeft: 2,
  },
  subInfoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  storyTime: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  ratingText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
    marginLeft: 2,
  },
  titleContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  postTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
  },
  imageContainer: {
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.xs,
  },
  storyImage: {
    width: '100%',
    height: width, // Tam karesel görünüm
    resizeMode: 'cover',
    borderRadius: radius.sm,
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
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
  storyContent: {
    padding: spacing.md,
    paddingTop: 0,
  },
  storyDescription: {
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    lineHeight: typography.lineHeight.md,
  },
});

export default FortuneStoryCard; 