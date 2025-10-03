import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, FlatList, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';
import { getAllFortuneTellers } from '../services/supabaseService';

const ExplorePopularFortuneTellers = ({ onFortuneTellerPress, onViewAllPress }) => {
  const [fortuneTellers, setFortuneTellers] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFortuneTellers();
  }, []);

  const loadFortuneTellers = async () => {
    try {
      setLoading(true);
      const { data, error } = await getAllFortuneTellers();
      
      if (error) {
        console.error('Falcılar yüklenirken hata:', error);
        return;
      }

      // Ana sayfadaki gibi sadece müsait falcıları al ve popüler olanları önce göster
      const availableTellers = data?.filter(teller => teller.is_available) || [];
      const sortedTellers = availableTellers.sort((a, b) => b.rating - a.rating);
      
      // İlk 3 falcıyı al
      const top3Tellers = sortedTellers.slice(0, 3);

      setFortuneTellers(top3Tellers);
    } catch (error) {
      console.error('Falcılar yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSpecialtyText = (specialties) => {
    if (!specialties || specialties.length === 0) {
      return 'Genel fal danışmanı';
    }
    
    const specialtyTexts = {
      'tarot': 'Tarot ve kart falı uzmanı',
      'kahve': 'Kahve falı ve yorumlama',
      'astroloji': 'Yıldızlar ve burç uzmanı',
      'el': 'El falı ve analiz uzmanı',
      'rüya': 'Rüya yorumu uzmanı',
      'yildizname': 'Yıldızname ve astroloji uzmanı',
      'katina': 'Katina falı uzmanı',
      'yuz': 'Yüz falı uzmanı'
    };
    
    // İlk geçerli uzmanlığı bul
    const firstSpecialty = specialties.find(specialty => 
      specialtyTexts[specialty] || specialty
    );
    
    if (firstSpecialty && specialtyTexts[firstSpecialty]) {
      return specialtyTexts[firstSpecialty];
    } else if (firstSpecialty) {
      // Eğer specialties array'inde tanımlanmamış bir değer varsa, onu kullan
      return `${firstSpecialty} falı uzmanı`;
    }
    
    return 'Genel fal danışmanı';
  };

  const renderFortuneTeller = ({ item }) => (
    <TouchableOpacity
      style={styles.fortuneTellerCard}
      onPress={() => onFortuneTellerPress(item)}
      activeOpacity={0.8}
    >
      <LinearGradient
        colors={[colors.card, colors.primaryLight + '10', colors.secondary + '15']}
        style={styles.cardGradient}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.cardHeader}>
          <View style={styles.avatarContainer}>
            <Image 
              source={{ 
                uri: item.profile_image || 'https://via.placeholder.com/60x60?text=👤' 
              }} 
              style={styles.avatar} 
            />
            {item.is_available && <View style={styles.onlineIndicator} />}
          </View>
          <View style={styles.ratingContainer}>
            <MaterialCommunityIcons name="star" size={16} color={colors.secondary} />
            <Text style={styles.rating}>{item.rating.toFixed(1)}</Text>
          </View>
        </View>
        
        <View style={styles.cardContent}>
          <Text style={styles.fortuneTellerName}>{item.name}</Text>
          <Text style={styles.specialty}>{getSpecialtyText(item.specialties)}</Text>
          
          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="book-open" size={14} color={colors.text.secondary} />
              <Text style={styles.statText}>{item.total_readings || 0} fal</Text>
            </View>
            <View style={styles.statItem}>
              <MaterialCommunityIcons name="clock" size={14} color={colors.text.secondary} />
              <Text style={styles.statText}>{item.experience_years}+ yıl</Text>
            </View>
          </View>
          
          <View style={styles.priceContainer}>
            <MaterialCommunityIcons name="diamond" size={16} color={colors.secondary} />
            <Text style={styles.price}>{item.price_per_fortune} Jeton</Text>
          </View>
        </View>
      </LinearGradient>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <View style={styles.header}>
          <Text style={styles.sectionTitle}>POPÜLER FALCILAR</Text>
          <Text style={styles.sectionSubtitle}>En çok tercih edilen falcılarımız</Text>
        </View>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="small" color={colors.secondary} />
          <Text style={styles.loadingText}>Falcılar yükleniyor...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.sectionTitle}>POPÜLER FALCILAR</Text>
        <Text style={styles.sectionSubtitle}>En çok tercih edilen falcılarımız</Text>
      </View>
      
      <FlatList
        data={fortuneTellers}
        renderItem={renderFortuneTeller}
        numColumns={1}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={styles.listContainer}
        keyExtractor={(item) => item.id.toString()}
        scrollEnabled={false} // Parent scroll'a bırak
      />
      
      <TouchableOpacity 
        style={styles.viewAllButton}
        onPress={onViewAllPress}
      >
        <LinearGradient
          colors={[colors.secondary, colors.primaryLight]}
          style={styles.viewAllGradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <Text style={styles.viewAllText}>Tüm Falcıları Gör</Text>
          <MaterialCommunityIcons name="arrow-right" size={20} color={colors.background} />
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  header: {
    marginBottom: spacing.lg,
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
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.text.secondary,
    marginTop: spacing.sm,
    fontSize: typography.fontSize.sm,
  },
  listContainer: {
    gap: 4,
  },
  fortuneTellerCard: {
    borderRadius: radius.xl,
    overflow: 'hidden',
    marginBottom: spacing.md,
    ...shadows.large,
  },
  cardGradient: {
    padding: spacing.lg,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: spacing.md,
  },
  avatarContainer: {
    position: 'relative',
  },
  avatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: colors.background,
    borderWidth: 2,
    borderColor: colors.secondary + '60',
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 2,
    right: 2,
    width: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    borderWidth: 2,
    borderColor: colors.card,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.warning + '15',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.warning + '30',
  },
  rating: {
    fontSize: typography.fontSize.sm,
    fontWeight: typography.fontWeight.medium,
    color: colors.warning,
    marginLeft: spacing.xs,
  },
  cardContent: {
    marginBottom: spacing.md,
  },
  fortuneTellerName: {
    fontSize: typography.fontSize.lg,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  specialty: {
    fontSize: typography.fontSize.md,
    color: colors.text.secondary,
    marginBottom: spacing.md,
    lineHeight: 20,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.sm,
    backgroundColor: colors.primaryLight + '8',
    padding: spacing.sm,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.primaryLight + '20',
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statText: {
    fontSize: typography.fontSize.xs,
    color: colors.text.tertiary,
    marginLeft: spacing.xs,
  },
  priceContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    backgroundColor: colors.secondary + '12',
    paddingHorizontal: spacing.sm,
    paddingVertical: spacing.xs,
    borderRadius: radius.sm,
    borderWidth: 1,
    borderColor: colors.secondary + '25',
  },
  price: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
  viewAllButton: {
    marginTop: spacing.lg,
    borderRadius: radius.md,
    overflow: 'hidden',
    ...shadows.medium,
  },
  viewAllGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  viewAllText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.medium,
    color: colors.background, // Koyu arka plan üzerinde beyaz metin
    marginRight: spacing.sm,
  },
});

export default ExplorePopularFortuneTellers;