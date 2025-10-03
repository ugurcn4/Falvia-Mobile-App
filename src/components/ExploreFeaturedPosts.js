import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons, Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const { width } = Dimensions.get('window');
const cardWidth = width * 0.85; // Daha büyük kartlar
const cardHeight = 420;

const ExploreFeaturedPosts = ({ featuredPosts = [], onPostPress, onLike, onComment }) => {
  if (!featuredPosts || featuredPosts.length === 0) {
    return null;
  }

  // Kategori ikonları
  const getCategoryIcon = (category) => {
    switch (category?.toLowerCase()) {
      case 'tarot':
        return 'cards';
      case 'burç':
      case 'burc':
        return 'zodiac-libra';
      case 'kahve':
        return 'coffee';
      case 'el':
        return 'hand-front';
      case 'yüz':
      case 'yuz':
        return 'face';
      case 'rüya':
      case 'ruya':
        return 'sleep';
      case 'yıldızname':
      case 'yildizname':
        return 'star';
      default:
        return 'crystal-ball';
    }
  };

  const renderFeaturedPost = (post, index) => {
    return (
      <TouchableOpacity
        key={post.id}
        style={styles.featuredCard}
        onPress={() => onPostPress && onPostPress(post)}
        activeOpacity={0.9}
      >
        <View style={styles.cardContainer}>
          {/* Gönderi görseli */}
          {post.imageUrl && (
            <Image
              source={{ uri: post.imageUrl }}
              style={styles.postImage}
              resizeMode="cover"
            />
          )}

          {/* Görsel üzerindeki overlay */}
          <View style={styles.imageOverlay}>
            {/* Öne çıkan rozeti */}
            <View style={styles.featuredBadge}>
              <MaterialCommunityIcons name="star" size={16} color={colors.warning} />
              <Text style={styles.featuredBadgeText}>Öne Çıkan</Text>
            </View>
          </View>

          {/* Gönderi içeriği - Görselin altında */}
          <View style={styles.cardContent}>
            {/* Kullanıcı bilgisi */}
            <View style={styles.userInfo}>
              <Image
                source={{ 
                  uri: post.avatar || 'https://via.placeholder.com/45x45?text=👤' 
                }}
                style={styles.userAvatar}
              />
              <View style={styles.userDetails}>
                <Text style={styles.userName} numberOfLines={1}>{post.name}</Text>
                <Text style={styles.postTime}>{post.time}</Text>
              </View>
            </View>

            {/* Başlık */}
            <Text style={styles.postTitle} numberOfLines={1}>
              {post.title || 'Fal Yorumu'}
            </Text>

            {/* İçerik */}
            <Text style={styles.postDescription} numberOfLines={4}>
              {post.content || post.description || 'Bu gönderi hakkında detaylı bilgi için tıklayın...'}
            </Text>

            {/* Kategori ve Etkileşim */}
            <View style={styles.bottomSection}>
              {/* Kategori etiketi */}
              {post.category && (
                <View style={styles.categoryBadge}>
                  <MaterialCommunityIcons 
                    name={getCategoryIcon(post.category)} 
                    size={16} 
                    color={colors.primary} 
                  />
                  <Text style={styles.categoryText}>{post.category}</Text>
                </View>
              )}

              {/* Etkileşim butonları */}
              <View style={styles.interactionButtons}>
                <TouchableOpacity
                  style={styles.interactionButton}
                  onPress={() => onLike && onLike(post.id, post.isLiked)}
                >
                  <Ionicons 
                    name={post.isLiked ? "heart" : "heart-outline"} 
                    size={24} 
                    color={post.isLiked ? colors.error : colors.text.secondary} 
                  />
                  <Text style={styles.interactionText}>{post.likes || 0}</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.interactionButton}
                  onPress={() => onComment && onComment(post.id)}
                >
                  <Ionicons name="chatbubble-outline" size={24} color={colors.text.secondary} />
                  <Text style={styles.interactionText}>{post.comments || 0}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View style={styles.titleContainer}>
          <MaterialCommunityIcons name="star-circle" size={24} color={colors.warning} />
          <Text style={styles.sectionTitle}>Öne Çıkan Gönderiler</Text>
        </View>
        <Text style={styles.sectionSubtitle}>
          En popüler ve kaliteli fal yorumları
        </Text>
      </View>

      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
        decelerationRate="fast"
        snapToInterval={cardWidth + spacing.md}
        snapToAlignment="start"
        pagingEnabled={false}
      >
        {featuredPosts.slice(0, 5).map((post, index) => renderFeaturedPost(post, index))}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.xs,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginLeft: spacing.sm,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.xl + spacing.sm,
  },
  scrollContainer: {
    paddingHorizontal: spacing.md,
  },
  featuredCard: {
    width: cardWidth,
    height: cardHeight,
    marginRight: spacing.md,
    borderRadius: radius.xl,
    backgroundColor: colors.card,
    ...shadows.large,
    overflow: 'hidden',
  },
  cardContainer: {
    flex: 1,
    position: 'relative',
  },
  postImage: {
    width: '100%',
    height: 180,
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  imageOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 180,
    backgroundColor: 'rgba(0,0,0,0.2)',
    zIndex: 5,
  },
  featuredBadge: {
    position: 'absolute',
    top: spacing.md,
    right: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.background + 'E0',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.warning + '40',
    zIndex: 10,
    ...shadows.small,
  },
  featuredBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  cardContent: {
    flex: 1,
    padding: spacing.lg,
    backgroundColor: colors.card,
    marginTop: 180, // Görselin altından başla
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  userAvatar: {
    width: 45,
    height: 45,
    borderRadius: 22.5,
    marginRight: spacing.sm,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
  },
  postTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.tertiary,
  },

  postContent: {
    flex: 1,
    marginBottom: spacing.md,
  },
  postTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  postDescription: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    lineHeight: 22,
    marginBottom: spacing.lg,
    flex: 1,
  },
  bottomSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 'auto',
  },
  categoryBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.primary + '20',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.primary + '40',
  },
  categoryText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginLeft: spacing.xs,
    textTransform: 'capitalize',
  },
  interactionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  interactionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: spacing.md,
    paddingVertical: spacing.xs,
    paddingHorizontal: spacing.sm,
    borderRadius: radius.sm,
  },
  interactionText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },

});

export default ExploreFeaturedPosts; 