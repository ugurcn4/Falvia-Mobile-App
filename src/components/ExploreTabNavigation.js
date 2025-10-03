import React, { useState } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';

const ExploreTabNavigation = ({ activeTab, onTabPress }) => {
  const tabs = [
    { id: 'posts', title: 'GÖNDERİLER' },
    { id: 'stories', title: 'HİKAYELER' },
    { id: 'fortunetellers', title: 'FALCILAR' },
    { id: 'messages', title: 'MESAJLAR' }
  ];

  const [containerWidth, setContainerWidth] = useState(0);
  const [contentWidth, setContentWidth] = useState(0);
  const [scrollX, setScrollX] = useState(0);
  const isScrollable = contentWidth > containerWidth + 1;
  const showLeftFade = isScrollable && scrollX > 2;
  const showRightFade = isScrollable && scrollX < contentWidth - containerWidth - 2;

  return (
    <View style={styles.container} onLayout={(e) => setContainerWidth(e.nativeEvent.layout.width)}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.tabContainer}
        onContentSizeChange={(w) => setContentWidth(w)}
        onScroll={(e) => setScrollX(e.nativeEvent.contentOffset.x)}
        scrollEventThrottle={16}
      >
        {tabs.map((tab, index) => (
          <TouchableOpacity
            key={tab.id}
            style={[
              styles.tab,
              activeTab === tab.id && styles.activeTab,
              index === tabs.length - 1 && { marginRight: 0 }
            ]}
            onPress={() => onTabPress(tab.id)}
            activeOpacity={0.8}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text
              numberOfLines={1}
              ellipsizeMode="clip"
              style={[
              styles.tabText,
              activeTab === tab.id && styles.activeTabText
              ]}
            >
              {tab.title}
            </Text>
            {activeTab === tab.id && <View style={styles.activeIndicator} />}
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Kaydırma ipuçları */}
      {showLeftFade && (
        <LinearGradient
          pointerEvents="none"
          colors={[colors.background, 'transparent']}
          style={[styles.fadeOverlay, styles.fadeLeft]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="chevron-back" size={18} color={colors.text.tertiary} style={styles.fadeIcon} />
        </LinearGradient>
      )}
      {showRightFade && (
        <LinearGradient
          pointerEvents="none"
          colors={['transparent', colors.background]}
          style={[styles.fadeOverlay, styles.fadeRight]}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 0 }}
        >
          <Ionicons name="chevron-forward" size={18} color={colors.text.tertiary} style={styles.fadeIcon} />
        </LinearGradient>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.background,
    paddingTop: spacing.md,
    position: 'relative',
  },
  tabContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.md,
    paddingBottom: 0,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
    columnGap: spacing.lg,
  },
  tab: {
    minWidth: 90,
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    position: 'relative',
    marginRight: spacing.lg,
  },
  activeTab: {
    // Aktif tab için ek stiller
  },
  tabText: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.text.tertiary,
    textAlign: 'center',
    includeFontPadding: false,
  },
  activeTabText: {
    color: colors.secondary,
    fontWeight: typography.fontWeight.bold,
  },
  activeIndicator: {
    position: 'absolute',
    bottom: -1,
    height: 3,
    alignSelf: 'center',
    width: '60%',
    backgroundColor: colors.secondary,
    borderRadius: radius.sm,
  },
  fadeOverlay: {
    position: 'absolute',
    top: 0,
    bottom: 0,
    width: 28,
    justifyContent: 'center',
    alignItems: 'center',
  },
  fadeLeft: {
    left: 0,
  },
  fadeRight: {
    right: 0,
  },
  fadeIcon: {
    opacity: 0.6,
  },
});

export default ExploreTabNavigation; 