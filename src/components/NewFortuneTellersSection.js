import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';
import { getAllFortuneTellers } from '../services/supabaseService';

const NewFortuneTellersSection = () => {
  const [newFortuneTellers, setNewFortuneTellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadNewFortuneTellers();
  }, []);

  const loadNewFortuneTellers = async () => {
    try {
      setLoading(true);
      const { data, error } = await getAllFortuneTellers();
      
      if (error) {
        console.error('Yeni falcılar yüklenirken hata:', error);
        return;
      }

      if (data && data.length > 0) {
        // En yeni 3 falcıyı al (created_at'e göre sıralı)
        const sortedByDate = [...data].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
        const newTellers = sortedByDate.slice(0, 3);
        
        setNewFortuneTellers(newTellers);
      }
    } catch (error) {
      console.error('Yeni falcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <MaterialCommunityIcons name="account-plus" size={24} color={colors.primaryLight} />
        <View style={styles.headerText}>
          <Text style={styles.title}>YENİ FALCILAR</Text>
          <Text style={styles.subtitle}>Yeni katılan yetenekli falcılarımız</Text>
        </View>
      </View>
      
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.primaryLight} />
          <Text style={styles.loadingText}>Yükleniyor...</Text>
        </View>
      ) : (
        <View style={styles.profilesContainer}>
          {newFortuneTellers.slice(0, 3).map((teller, index) => (
            <View key={teller.id} style={[styles.profileCircle, { marginLeft: index > 0 ? -10 : 0 }]}>
              <Image 
                source={teller.profile_image ? { uri: teller.profile_image } : require('../../assets/görseller/falci.png')} 
                style={styles.profileImage} 
              />
            </View>
          ))}
          {newFortuneTellers.length > 3 && (
            <View style={[styles.profileCircle, styles.moreProfilesCircle, { marginLeft: -10 }]}>
              <Text style={styles.moreProfilesText}>+{newFortuneTellers.length - 3}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: colors.card,
    borderRadius: radius.lg,
    padding: spacing.md,
    marginHorizontal: spacing.md,
    marginBottom: spacing.md,
    ...shadows.medium,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.md,
  },
  headerText: {
    marginLeft: spacing.md,
    flex: 1,
  },
  title: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  subtitle: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
  },
  loadingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
  },
  loadingText: {
    color: colors.text.secondary,
    marginLeft: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
  profilesContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 2,
    borderColor: colors.background,
    overflow: 'hidden',
  },
  profileImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  moreProfilesCircle: {
    backgroundColor: colors.primaryLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  moreProfilesText: {
    fontSize: typography.fontSize.xs,
    fontWeight: typography.fontWeight.bold,
    color: colors.background,
  },
});

export default NewFortuneTellersSection; 