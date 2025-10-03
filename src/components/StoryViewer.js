import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Animated,
  StatusBar,
  Alert,
  Platform
} from 'react-native';
import { Video, ResizeMode } from 'expo-av';
import { Image as ExpoImage } from 'expo-image';
import { Image as RNImage } from 'react-native';
import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const StoryViewer = ({ 
  stories, 
  initialIndex = 0, 
  onClose, 
  onStoryComplete,
  onNavigation,
  fortuneTellerName,
  fortuneTellerAvatar,
  currentStoryIndex,
  totalStories
}) => {
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const [isPlaying, setIsPlaying] = useState(true);
  const [progress, setProgress] = useState(0);
  const [videoDuration, setVideoDuration] = useState(15);
  const [isVideoLoaded, setIsVideoLoaded] = useState(false);
  const IMAGE_GIF_DURATION_SECONDS = 15;
  
  // initialIndex değiştiğinde currentIndex'i güncelle
  useEffect(() => {
    setCurrentIndex(initialIndex);
  }, [initialIndex]);
  
  const progressAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const videoRef = useRef(null);
  
  const currentStory = stories[currentIndex] || stories[currentStoryIndex];
  const mediaUrl = currentStory?.mediaUrl || currentStory?.media_url;
  const mediaType = currentStory?.mediaType || currentStory?.media_type;
  
  const isVideo = mediaType === 'video' || 
                  (mediaUrl && mediaUrl.toLowerCase().includes('.mp4')) ||
                  (mediaUrl && mediaUrl.toLowerCase().includes('.mov')) ||
                  (mediaUrl && mediaUrl.toLowerCase().includes('.avi')) ||
                  (mediaUrl && mediaUrl.toLowerCase().includes('.webm')) ||
                  (mediaUrl && mediaUrl.toLowerCase().includes('.m4v'));
  
  const isGif = mediaUrl && mediaUrl.toLowerCase().includes('.gif');
  
  // Mevcut falcının hikayelerini filtrele
  const currentFortuneTellerId = currentStory?.fortuneTeller?.id;
  const currentFortuneTellerStories = useMemo(() => {
    return stories.filter(story => 
      story.fortuneTeller?.id === currentFortuneTellerId
    );
  }, [stories, currentFortuneTellerId]);
  
  const currentFortuneTellerStoryIndex = useMemo(() => {
    return currentFortuneTellerStories.findIndex(story => 
      story.id === currentStory?.id
    );
  }, [currentFortuneTellerStories, currentStory?.id]);

  // Progress bar animasyonu (resimler ve GIF'ler için zamanlayıcı)
  useEffect(() => {
    if (!isPlaying || isVideo) return;

    const duration = IMAGE_GIF_DURATION_SECONDS;
    
    Animated.timing(progressAnim, {
      toValue: 1,
      duration: duration * 1000,
      useNativeDriver: false,
    }).start(({ finished }) => {
      if (finished) {
        handleNext();
      }
    });

    return () => progressAnim.stopAnimation();
  }, [currentIndex, isPlaying, isVideo]);

  // Progress değerini takip et
  useEffect(() => {
    const listener = progressAnim.addListener(({ value }) => {
      setProgress(value);
    });

    return () => progressAnim.removeListener(listener);
  }, [progressAnim]);

  // Video değiştiğinde state'leri sıfırla
  useEffect(() => {
    setIsVideoLoaded(false);
    setProgress(0);
    progressAnim.setValue(0);
    
    if (isVideo || isGif) {
      setIsPlaying(true);
    }
  }, [currentStory?.id, currentIndex, isVideo, isGif]);

  const handleNext = useCallback(() => {
    // Hikaye tamamlandı olarak işaretle
    if (onStoryComplete) {
      onStoryComplete(currentStory.id, true);
    }
    
    // Eğer son hikayede değilse, sonraki hikayeye geç
    if (currentFortuneTellerStoryIndex < currentFortuneTellerStories.length - 1) {
      const nextIndex = currentFortuneTellerStoryIndex + 1;
      setCurrentIndex(nextIndex);
    } else {
      // Navigasyon callback'ini çağır
      if (onNavigation) {
        onNavigation('next');
      }
    }
  }, [onStoryComplete, onNavigation, currentStory?.id, currentFortuneTellerStoryIndex, currentFortuneTellerStories.length]);

  const handlePrevious = useCallback(() => {
    // Eğer ilk hikayede değilse, önceki hikayeye geç
    if (currentFortuneTellerStoryIndex > 0) {
      const prevIndex = currentFortuneTellerStoryIndex - 1;
      setCurrentIndex(prevIndex);
    } else {
      // Navigasyon callback'ini çağır
      if (onNavigation) {
        onNavigation('prev');
      }
    }
  }, [onNavigation, currentFortuneTellerStoryIndex]);

  const handleClose = useCallback(() => {
    Animated.timing(fadeAnim, {
      toValue: 0,
      duration: 200,
      useNativeDriver: true,
    }).start(() => {
      onClose();
    });
  }, [onClose]);

  const handlePause = useCallback(() => {
    setIsPlaying(!isPlaying);
    
    if ((isVideo || isGif) && videoRef.current) {
      if (isPlaying) {
        videoRef.current.pauseAsync();
      } else {
        videoRef.current.playAsync();
      }
    } else if (!isVideo && !isGif) {
    if (isPlaying) {
      progressAnim.stopAnimation();
    } else {
      // Kaldığı yerden devam et
        const remainingTime = (1 - progress) * 15 * 1000;
      Animated.timing(progressAnim, {
        toValue: 1,
        duration: remainingTime,
        useNativeDriver: false,
      }).start(({ finished }) => {
        if (finished) {
          handleNext();
        }
      });
    }
    }
  }, [isPlaying, isVideo, isGif, progress, handleNext]);

  const handleVideoLoad = useCallback((data) => {
    const millis = data?.durationMillis;
    setVideoDuration(millis ? millis / 1000 : IMAGE_GIF_DURATION_SECONDS);
    setIsVideoLoaded(true);
    // Video yüklendiğinde progress'i sıfırla
    progressAnim.setValue(0);
  }, []);

  const handleVideoError = useCallback((error) => {
    console.error('Video yükleme hatası:', error);
    Alert.alert('Hata', 'Video yüklenirken bir hata oluştu.');
    // Hata alındığında bu hikayeyi atla
    handleNext();
  }, [handleNext]);

  const handlePlaybackStatusUpdate = useCallback((status) => {
    if (!status?.isLoaded) return;
    // Sadece videolarda AV status'a göre progress güncelle
    if (isVideo) {
      const durationMs = status.durationMillis || (videoDuration * 1000) || (IMAGE_GIF_DURATION_SECONDS * 1000);
      const ratioRaw = durationMs > 0 ? status.positionMillis / durationMs : 0;
      const ratio = Math.max(0, Math.min(1, ratioRaw));
      setProgress(ratio);
      progressAnim.setValue(ratio);
      if (status.didJustFinish) {
        handleNext();
      }
    }
  }, [handleNext, isVideo, videoDuration]);

  // Prefetch: sonraki 2 hikayeyi önden hazırla (görseller için prefetch, videolar için görünmez preload)
  const [preloadVideoUris, setPreloadVideoUris] = useState([]);
  const prefetchedImagesRef = useRef(new Set());

  useEffect(() => {
    const startIndex = Math.max(0, currentFortuneTellerStoryIndex + 1);
    const nextStories = currentFortuneTellerStories.slice(startIndex, startIndex + 2);

    const nextVideoUris = [];
    nextStories.forEach((s) => {
      const url = s.mediaUrl || s.media_url;
      if (!url) return;
      const lower = url.toLowerCase();
      const isVid = s.mediaType === 'video' || s.media_type === 'video' || lower.includes('.mp4') || lower.includes('.mov') || lower.includes('.m4v') || lower.includes('.avi') || lower.includes('.webm');
      if (isVid) {
        nextVideoUris.push(url);
      } else {
        // Görsel/GIF prefetch
        if (!prefetchedImagesRef.current.has(url)) {
          prefetchedImagesRef.current.add(url);
          try {
            if (RNImage && RNImage.prefetch) {
              RNImage.prefetch(url);
            } else if (ExpoImage && ExpoImage.prefetch) {
              ExpoImage.prefetch(url);
            }
          } catch (e) {
            // Sessizce geç
          }
        }
      }
    });
    setPreloadVideoUris(nextVideoUris);
  }, [currentFortuneTellerStoryIndex, currentFortuneTellerStories]);

  if (!currentStory || !mediaUrl) {
    return null;
  }

  return (
    <Animated.View style={[styles.container, { opacity: fadeAnim }]}>
      <StatusBar hidden />
      
      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        {currentFortuneTellerStories.map((_, index) => (
          <View key={index} style={styles.progressBarContainer}>
            <View style={styles.progressBarBackground}>
              <Animated.View
                style={[
                  styles.progressBarFill,
                  {
                    width: index === currentFortuneTellerStoryIndex 
                      ? progressAnim.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['0%', '100%'],
                        })
                      : index < currentFortuneTellerStoryIndex 
                        ? '100%' 
                        : '0%'
                  }
                ]}
              />
            </View>
          </View>
        ))}
      </View>

      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <ExpoImage
            source={{ uri: fortuneTellerAvatar }}
            style={styles.avatar}
            contentFit="cover"
          />
          <View style={styles.headerInfo}>
            <Text style={styles.fortuneTellerName}>{fortuneTellerName}</Text>
            <Text style={styles.storyTime}>
              {new Date(currentStory.createdAt).toLocaleTimeString('tr-TR', {
                hour: '2-digit',
                minute: '2-digit'
              })}
            </Text>
          </View>
        </View>
        
        <TouchableOpacity onPress={handleClose} style={styles.closeButton}>
          <Ionicons name="close" size={28} color={colors.text.light} />
        </TouchableOpacity>
      </View>

      {/* Story Content */}
      <View style={styles.contentContainer}>
        <TouchableOpacity 
          style={styles.contentArea} 
          onPress={handlePause}
          activeOpacity={1}
        >
          {isVideo ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isPlaying && isVideoLoaded}
              isLooping={false}
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              useNativeControls={false}
              isMuted={false}
            />
          ) : isGif ? (
            <Video
              ref={videoRef}
              source={{ uri: mediaUrl }}
              style={styles.media}
              resizeMode={ResizeMode.COVER}
              shouldPlay={isPlaying}
              isLooping={true}
              onLoad={handleVideoLoad}
              onError={handleVideoError}
              onPlaybackStatusUpdate={handlePlaybackStatusUpdate}
              useNativeControls={false}
              isMuted={true}
            />
          ) : (
            <ExpoImage
              source={{ uri: mediaUrl }}
              style={styles.media}
              contentFit="cover"
              transition={200}
              placeholder={null}
            />
          )}

          {/* Pause Indicator */}
          {!isPlaying && (
            <View style={styles.pauseIndicator}>
              <MaterialCommunityIcons 
                name="pause-circle" 
                size={60} 
                color={colors.text.light} 
              />
            </View>
          )}
          
          {/* GIF Indicator */}
          {isGif && (
            <View style={styles.gifIndicator}>
              <Text style={styles.gifIndicatorText}>GIF</Text>
            </View>
          )}
        </TouchableOpacity>

        {/* Prefetch videolar - görünmez */}
        {preloadVideoUris.map((uri) => (
          <Video
            key={uri}
            source={{ uri }}
            style={styles.preloadVideo}
            resizeMode={ResizeMode.COVER}
            shouldPlay={false}
            isLooping={false}
            useNativeControls={false}
            isMuted={true}
            onError={() => {}}
          />
        ))}

        {/* Navigation Buttons */}
        <TouchableOpacity 
          style={[styles.navButton, styles.prevButton]} 
          onPress={handlePrevious}
          disabled={currentFortuneTellerStoryIndex === 0}
        >
          <View style={styles.navButtonInner} />
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={[styles.navButton, styles.nextButton]} 
          onPress={handleNext}
          disabled={currentFortuneTellerStoryIndex === currentFortuneTellerStories.length - 1}
        >
          <View style={styles.navButtonInner} />
        </TouchableOpacity>
      </View>

      {/* Caption */}
      {(currentStory.caption || currentStory.description) && (
        <View style={styles.captionContainer}>
          <Text style={styles.captionText}>{currentStory.caption || currentStory.description}</Text>
        </View>
      )}

      {/* Story Counter */}
      <View style={styles.counterContainer}>
        <Text style={styles.counterText}>
          {currentFortuneTellerStoryIndex + 1} / {currentFortuneTellerStories.length}
        </Text>
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  progressContainer: {
    flexDirection: 'row',
    paddingHorizontal: spacing.md,
    paddingTop: spacing.lg,
    paddingBottom: spacing.sm,
    gap: spacing.xs,
  },
  progressBarContainer: {
    flex: 1,
  },
  progressBarBackground: {
    height: 2,
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
    borderRadius: 1,
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: colors.secondary,
    borderRadius: 1,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingVertical: spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
    marginRight: spacing.sm,
  },
  headerInfo: {
    flex: 1,
  },
  fortuneTellerName: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.semiBold,
    color: colors.text.light,
  },
  storyTime: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginTop: 2,
  },
  closeButton: {
    padding: spacing.sm,
    marginRight: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: radius.round,
  },
  contentContainer: {
    flex: 1,
    position: 'relative',
  },
  contentArea: {
    flex: 1,
    position: 'relative',
  },
  media: {
    width: '100%',
    height: '100%',
  },
  preloadVideo: {
    position: 'absolute',
    width: 1,
    height: 1,
    opacity: 0,
  },
  pauseIndicator: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -30 }, { translateY: -30 }],
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    borderRadius: 30,
  },
  navButton: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: screenWidth * 0.3,
    justifyContent: 'center',
    alignItems: 'center',
  },
  prevButton: {
    left: 0,
  },
  nextButton: {
    right: 0,
  },
  navButtonInner: {
    width: '100%',
    height: '100%',
  },
  captionContainer: {
    position: 'absolute',
    bottom: spacing.xl,
    left: spacing.md,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: spacing.md,
    borderRadius: radius.md,
  },
  captionText: {
    fontSize: typography.fontSize.md,
    color: colors.text.light,
    textAlign: 'center',
    lineHeight: 20,
  },
  counterContainer: {
    position: 'absolute',
    top: spacing.xl,
    right: spacing.md,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  counterText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.light,
    fontWeight: typography.fontWeight.medium,
  },
  gifIndicator: {
    position: 'absolute',
    top: spacing.md,
    left: spacing.md,
    backgroundColor: 'rgba(255, 215, 0, 0.9)',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
  },
  gifIndicatorText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.dark,
  },
});

export default StoryViewer; 