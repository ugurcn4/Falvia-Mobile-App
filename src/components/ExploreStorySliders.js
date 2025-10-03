import React, { useMemo, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const ExploreStorySliders = ({ stories, onStoryPress, loading = false }) => {
  const defaultStories = useMemo(() => [
    {
      id: 1,
      title: 'Günlük Burç Yorumları',
      subtitle: 'Bugün seni neler bekliyor?',
      image: require('../../assets/görseller/günlükburç.png'),
      category: 'astroloji'
    },
    {
      id: 2,
      title: 'Haftalık Fal',
      subtitle: 'Bu haftaki şansın nasıl?',
      image: require('../../assets/görseller/haftalıkburç.png'),
      category: 'tarot'
    },
    {
      id: 3,
      title: 'Aylık Rehber',
      subtitle: 'Ay boyunca dikkat etmen gerekenler',
      image: require('../../assets/görseller/aylıkburç.png'),
      category: 'astroloji'
    }
  ], []);

  // Dosya türünü belirle
  const getMediaType = useCallback((url, mediaType) => {
    // Önce veritabanındaki media_type alanını kontrol et
    if (mediaType) {
      return mediaType;
    }
    
    // URL'den dosya uzantısını kontrol et
    if (!url) return 'image';
    const extension = url.split('.').pop()?.toLowerCase();
    const videoExtensions = ['mp4', 'mov', 'avi', 'mkv', 'webm', 'gif'];
    return videoExtensions.includes(extension) ? 'video' : 'image';
  }, []);

  // Video thumbnail URL'si oluştur - GIF'ler için özel işlem
  const getVideoThumbnail = useCallback((videoUrl, mediaType) => {
    if (!videoUrl) {
      return require('../../assets/görseller/falci.png');
    }
    
    // GIF dosyaları için özel işlem - Slider'da statik görüntü olarak göster
    if (videoUrl.toLowerCase().includes('.gif')) {
      // GIF'ler için placeholder kullan - tam ekranda oynatılacak
      return require('../../assets/görseller/falci.png');
    }
    
    // Diğer video formatları için placeholder
    return require('../../assets/görseller/falci.png');
  }, []);

  // Gerçek hikaye verilerini UI formatına dönüştür
  const transformRealStories = useCallback((realStories) => {
    if (!realStories || realStories.length === 0) return [];
    
    return realStories.map(story => {
      const mediaType = getMediaType(story.mediaUrl, story.mediaType);
      const isVideo = mediaType === 'video';
      
      // Video için thumbnail oluştur
      let imageSource;
      if (story.mediaUrl) {
        if (isVideo) {
          imageSource = getVideoThumbnail(story.mediaUrl, story.mediaType);
        } else {
          imageSource = { uri: story.mediaUrl };
        }
      } else {
        imageSource = require('../../assets/görseller/falci.png');
      }
      
      return {
        id: story.id,
        title: story.fortuneTellerName || 'Falcı Hikayesi',
        subtitle: story.caption || 'Özel içerik',
        image: imageSource,
        category: story.fortuneTellerSpecialties?.[0] || 'genel',
        isRealStory: true,
        originalStory: story,
        mediaType: mediaType,
        isVideo: isVideo
      };
    });
  }, [getMediaType, getVideoThumbnail]);

  // Gerçek hikaye verisi varsa onu kullan, yoksa default hikayeleri göster
  const storyData = useMemo(() => {
    return stories && stories.length > 0 ? transformRealStories(stories) : defaultStories;
  }, [stories, transformRealStories, defaultStories]);
  
  // Gerçek hikaye verisi var mı kontrol et
  const hasRealStories = useMemo(() => {
    return stories && stories.length > 0;
  }, [stories]);

  const renderStory = useCallback(({ item }) => {
    return (
      <TouchableOpacity
        style={styles.storyCard}
        onPress={() => onStoryPress(item.isRealStory ? item.originalStory : item)}
        activeOpacity={0.9}
      >
      <View style={styles.storyBackground}>
        <Image
          source={item.image}
          style={styles.storyImage}
          resizeMode="cover"
        />
        <LinearGradient
          colors={['transparent', 'rgba(0,0,0,0.7)']}
          style={styles.gradient}
        >
          <View style={styles.storyContent}>
            <View style={styles.categoryBadge}>
              <Text style={styles.categoryText}>{item.category?.toUpperCase()}</Text>
            </View>
            <View style={styles.storyInfo}>
              <Text style={styles.storyTitle}>{item.title}</Text>
              <Text style={styles.storySubtitle}>{item.subtitle}</Text>
            </View>
            <View style={styles.playButton}>
              <MaterialCommunityIcons 
                name={item.isVideo ? "play-circle" : "play"} 
                size={item.isVideo ? 28 : 20} 
                color={colors.background} 
              />
            </View>
          </View>
        </LinearGradient>
      </View>
    </TouchableOpacity>
  );
}, [onStoryPress]);

  // Boş durum komponenti
  const renderEmptyState = useCallback(() => (
    <View style={styles.emptyContainer}>
      <LinearGradient
        colors={[colors.card, colors.primaryLight]}
        style={styles.emptyGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.emptyIconContainer}>
          <MaterialCommunityIcons 
            name="book-open-variant" 
            size={48} 
            color={colors.text.secondary} 
          />
        </View>
        <Text style={styles.emptyTitle}>Henüz Hikaye Yok</Text>
        <Text style={styles.emptySubtitle}>
          Falcılarımız yakında harika hikayeler paylaşacak. Beklemede kal!
        </Text>
        <View style={styles.emptyBadge}>
          <MaterialCommunityIcons name="clock-outline" size={16} color={colors.text.secondary} />
          <Text style={styles.emptyBadgeText}>Yakında</Text>
        </View>
      </LinearGradient>
    </View>
  ), []);

  // Loading durumu
  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>HİKAYELER</Text>
          <Text style={styles.sectionSubtitle}>Tam ekran hikayeleri görüntülemek için tıklayın.</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={styles.loadingText}>Hikayeler yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>HİKAYELER</Text>
        <Text style={styles.sectionSubtitle}>
          {hasRealStories 
            ? 'Tam ekran hikayeleri görüntülemek için tıklayın.' 
            : 'Falcılarımızın özel içeriklerini bekleyin.'
          }
        </Text>
      </View>
      
      {hasRealStories ? (
        <FlatList
          data={storyData}
          renderItem={renderStory}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.listContainer}
          keyExtractor={(item) => item.id.toString()}
          snapToInterval={220}
          decelerationRate="fast"
          removeClippedSubviews={true}
          maxToRenderPerBatch={5}
          windowSize={5}
          initialNumToRender={3}
        />
      ) : (
        <View style={styles.emptyListContainer}>
          {renderEmptyState()}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
  },
  header: {
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  sectionSubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
  },
  emptyListContainer: {
    paddingHorizontal: spacing.md,
  },
  storyCard: {
    width: 200,
    height: 280,
    marginRight: spacing.md,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  storyBackground: {
    width: '100%',
    height: '100%',
    position: 'relative',
  },
  storyImage: {
    width: '100%',
    height: '100%',
    borderRadius: radius.lg,
  },
  gradient: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: '100%',
    justifyContent: 'flex-end',
  },
  storyContent: {
    padding: spacing.md,
    height: '100%',
    justifyContent: 'space-between',
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.dark,
  },
  storyInfo: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingBottom: spacing.md,
  },
  storyTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  storySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 18,
  },
  playButton: {
    alignSelf: 'flex-end',
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Boş durum stilleri
  emptyContainer: {
    height: 200,
    borderRadius: radius.lg,
    overflow: 'hidden',
    ...shadows.medium,
  },
  emptyGradient: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
  },
  emptyIconContainer: {
    marginBottom: spacing.md,
  },
  emptyTitle: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.sm,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: spacing.lg,
  },
  emptyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.1)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  emptyBadgeText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
});

export default ExploreStorySliders; 