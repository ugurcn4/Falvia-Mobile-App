import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';

const ExploreCategoryCards = ({ onCategoryPress }) => {
  const categories = [
    {
      id: 1,
      title: 'Tarot',
      icon: 'cards-outline',
      color: colors.primary,
      gradient: [colors.primary, colors.primaryLight],
      dbCategory: 'tarot'
    },
    {
      id: 2,
      title: 'Kahve',
      icon: 'coffee-outline',
      color: colors.secondary,
      gradient: [colors.secondary, '#D4AF37'],
      dbCategory: 'kahve'
    },
    {
      id: 3,
      title: 'El Falı',
      icon: 'hand-okay',
      color: colors.primaryLight,
      gradient: [colors.primaryLight, colors.primary],
      dbCategory: 'el'
    },
    {
      id: 4,
      title: 'Astroloji',
      icon: 'star-circle-outline',
      color: '#9B59B6',
      gradient: ['#9B59B6', '#8E44AD'],
      dbCategory: 'astroloji'
    }
  ];

  const renderCategory = ({ item }) => (
    <TouchableOpacity
      style={[styles.categoryCard, { backgroundColor: item.color }]}
      onPress={() => onCategoryPress(item)}
      activeOpacity={0.8}
    >
      <MaterialCommunityIcons 
        name={item.icon} 
        size={24} 
        color={colors.background} 
      />
      <Text style={styles.categoryText}>{item.title}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <FlatList
        data={categories}
        renderItem={renderCategory}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item) => item.id.toString()}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingVertical: spacing.lg,
  },
  listContainer: {
    paddingHorizontal: spacing.md,
    alignItems: 'center',
  },
  categoryCard: {
    width: 80,
    height: 40,
    borderRadius: 20, // Oval şekil için
    marginHorizontal: spacing.xs,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
    ...shadows.small,
  },
  categoryText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.medium,
    color: colors.background,
    marginLeft: spacing.xs,
    textAlign: 'center',
  },
});

export default ExploreCategoryCards; 