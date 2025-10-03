import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Image, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing, radius } from '../styles/spacing';
import { typography } from '../styles/typography';
import shadows from '../styles/shadows';
import { getAllFortuneTellers } from '../services/supabaseService';

const ExploreFeaturedFortuneTeller = ({ onFortuneTellerPress, navigation }) => {
  const [featuredFortuneTeller, setFeaturedFortuneTeller] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadFeaturedFortuneTeller();
  }, []);

  const loadFeaturedFortuneTeller = async () => {
    try {
      setLoading(true);
      const { data, error } = await getAllFortuneTellers();
      
      if (error) {
        console.error('Öne çıkan falcı yüklenirken hata:', error);
        return;
      }

      // Ana sayfadaki gibi sadece müsait falcıları al ve en yüksek rated olanı seç
      const availableTellers = data?.filter(teller => teller.is_available) || [];
      const sortedTellers = availableTellers.sort((a, b) => b.rating - a.rating);
      
      if (sortedTellers.length > 0) {
        const teller = sortedTellers[0];
        
        // Database'den gelen veriyi UI formatına çevir
        const formattedTeller = {
          id: teller.id,
          name: teller.name,
          title: 'BU AYIN ÖNE ÇIKAN FALCISI',
          specialty: getSpecialtyDescription(teller.specialties),
          description: generateDescription(teller.name, teller.specialties, teller.experience_years),
          rating: teller.rating,
          totalReadings: teller.total_readings || 0,
          experience: `${teller.experience_years}+ yıl`,
          avatar: teller.profile_image || 'https://via.placeholder.com/80x80?text=👤',
          isOnline: teller.is_available,
          price: `${teller.price_per_fortune} Jeton`,
          specialties: getSpecialtiesArray(teller.specialties),
          stats: {
            completedReadings: formatReadingCount(teller.total_readings || 0),
            satisfaction: `${Math.floor(teller.rating * 20)}%`,
            responseTime: '< 25 dk'
          }
        };

        setFeaturedFortuneTeller(formattedTeller);
      }
    } catch (error) {
      console.error('Öne çıkan falcı yüklenirken hata:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSpecialtyDescription = (specialties) => {
    if (!specialties || specialties.length === 0) {
      return 'Falcının bilgileri baktırdığı fal sayısı vs.';
    }
    
    const descriptions = {
      'tarot': 'Tarot kartları ile geleceğinizi aydınlatır',
      'kahve': 'Kahve telvesi ile kader haritanızı çizer',
      'astroloji': 'Yıldızlar ve gezegenlerle rehberlik eder',
      'el': 'El çizgilerinizden yaşam rotanızı okur',
      'rüya': 'Rüyalarınızın gizli mesajlarını çözer',
      'yildizname': 'Yıldızlar ve doğum haritanızla rehberlik eder',
      'katina': 'Katina kartları ile aşk ve ilişki falınızı açar',
      'yuz': 'Yüz hatlarınızdan karakter ve kaderinizi okur'
    };
    
    // İlk geçerli uzmanlığı bul
    const firstSpecialty = specialties.find(specialty => 
      descriptions[specialty] || specialty
    );
    
    if (firstSpecialty && descriptions[firstSpecialty]) {
      return descriptions[firstSpecialty];
    } else if (firstSpecialty) {
      // Eğer specialties array'inde tanımlanmamış bir değer varsa, onu kullan
      return `${firstSpecialty} falı ile geleceğinizi aydınlatır`;
    }
    
    return 'Falcının bilgileri baktırdığı fal sayısı vs.';
  };

  const generateDescription = (name, specialties, experience) => {
    const specialty = specialties && specialties.length > 0 ? specialties[0] : 'fal';
    
    const templates = [
      `Uzun yıllardır falcılık yapan ${name}, özellikle ${specialty} falı konusunda uzman. Gerçekleri çekinmeden söyler ve çözüm odaklı yaklaşımıyla bilinir.`,
      `${experience}+ yıllık deneyime sahip ${name}, ${specialty} alanında derin bilgi birikimi ile müşterilerine rehberlik eder.`,
      `Alanında uzman ${name}, ${specialty} falı ile binlerce kişiye yol göstermiş deneyimli bir falcıdır.`
    ];
    
    return templates[Math.floor(Math.random() * templates.length)];
  };

  const getSpecialtiesArray = (specialties) => {
    if (!specialties || specialties.length === 0) {
      return ['Genel Fal', 'Danışmanlık', 'Rehberlik'];
    }
    
    const allSpecialties = {
      'tarot': ['Tarot', 'Kart Falı', 'Gelecek Okuma'],
      'kahve': ['Kahve Falı', 'Telve Okuma', 'Sembol Yorumu'],
      'astroloji': ['Astroloji', 'Burç Yorumu', 'Gezegen Analizi'],
      'el': ['El Falı', 'Çizgi Okuma', 'Palmistry'],
      'rüya': ['Rüya Yorumu', 'Sembol Analizi', 'Bilinçaltı'],
      'yildizname': ['Yıldızname', 'Astroloji', 'Doğum Haritası'],
      'katina': ['Katina', 'Aşk Falı', 'İlişki Analizi'],
      'yuz': ['Yüz Falı', 'Karakter Analizi', 'Fizyonomi']
    };
    
    // İlk geçerli uzmanlığı bul
    const firstSpecialty = specialties.find(specialty => 
      allSpecialties[specialty] || specialty
    );
    
    if (firstSpecialty && allSpecialties[firstSpecialty]) {
      return allSpecialties[firstSpecialty];
    } else if (firstSpecialty) {
      // Eğer specialties array'inde tanımlanmamış bir değer varsa, onu kullan
      return [firstSpecialty, 'Fal Uzmanı', 'Danışmanlık'];
    }
    
    return ['Genel Fal', 'Danışmanlık', 'Rehberlik'];
  };

  const formatReadingCount = (count) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1)}K+`;
    }
    return count.toString();
  };

  const handleConsultPress = () => {
    if (navigation) {
      navigation.navigate('FalScreen');
    } else if (onFortuneTellerPress) {
      onFortuneTellerPress(featuredFortuneTeller);
    }
  };

  if (loading) {
    return (
      <View style={styles.container}>
        <LinearGradient
          colors={[colors.primaryLight, colors.primary]}
          style={styles.featuredCard}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
        >
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color={colors.background} />
            <Text style={styles.loadingText}>Öne çıkan falcı yükleniyor...</Text>
          </View>
        </LinearGradient>
      </View>
    );
  }

  if (!featuredFortuneTeller) {
    return null;
  }

  const featured = featuredFortuneTeller;

  return (
    <View style={styles.container}>
      <LinearGradient
        colors={[colors.primaryLight, colors.primary]}
        style={styles.featuredCard}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
      >
        <View style={styles.header}>
          <MaterialCommunityIcons name="star-circle" size={24} color={colors.secondary} />
          <Text style={styles.featuredTitle}>{featured.title}</Text>
        </View>

        <View style={styles.content}>
          <View style={styles.leftSection}>
            <View style={styles.avatarContainer}>
              <Image 
                source={typeof featured.avatar === 'string' ? { uri: featured.avatar } : featured.avatar} 
                style={styles.avatar} 
              />
              {featured.isOnline && <View style={styles.onlineIndicator} />}
              <View style={styles.crownBadge}>
                <MaterialCommunityIcons name="crown" size={16} color={colors.background} />
              </View>
            </View>
          </View>

          <View style={styles.rightSection}>
            <Text style={styles.fortuneTellerName}>{featured.name}</Text>
            <Text style={styles.specialty}>{featured.specialty}</Text>
            
            <View style={styles.statsContainer}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{featured.stats.completedReadings}</Text>
                <Text style={styles.statLabel}>Fal</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{featured.stats.satisfaction}</Text>
                <Text style={styles.statLabel}>Memnuniyet</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{featured.stats.responseTime}</Text>
                <Text style={styles.statLabel}>Yanıt</Text>
              </View>
            </View>

            <View style={styles.ratingContainer}>
              <MaterialCommunityIcons name="star" size={18} color={colors.secondary} />
              <Text style={styles.rating}>{featured.rating}</Text>
              <Text style={styles.experience}>• {featured.experience} deneyim</Text>
            </View>
          </View>
        </View>

        <View style={styles.description}>
          <Text style={styles.descriptionText}>{featured.description}</Text>
        </View>

        <View style={styles.specialtiesContainer}>
          {featured.specialties.map((specialty, index) => (
            <View key={index} style={styles.specialtyTag}>
              <Text style={styles.specialtyText}>{specialty}</Text>
            </View>
          ))}
        </View>

        <View style={styles.footer}>
          <View style={styles.priceContainer}>
            <Text style={styles.price}>{featured.price}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.consultButton}
            onPress={handleConsultPress}
            activeOpacity={0.8}
          >
            <MaterialCommunityIcons name="message-text" size={20} color={colors.primary} />
            <Text style={styles.consultButtonText}>Hemen Danış</Text>
          </TouchableOpacity>
        </View>
      </LinearGradient>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.lg,
  },
  featuredCard: {
    borderRadius: radius.xl,
    padding: spacing.lg,
    ...shadows.large,
  },
  loadingContainer: {
    padding: spacing.xl,
    alignItems: 'center',
  },
  loadingText: {
    color: colors.background,
    marginTop: spacing.md,
    fontSize: typography.fontSize.md,
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.lg,
  },
  featuredTitle: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginLeft: spacing.sm,
    textAlign: 'center',
  },
  content: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  leftSection: {
    marginRight: spacing.lg,
  },
  avatarContainer: {
    position: 'relative',
    alignItems: 'center',
  },
  avatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    borderWidth: 3,
    borderColor: colors.secondary,
  },
  onlineIndicator: {
    position: 'absolute',
    bottom: 5,
    right: 5,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: '#4CAF50',
    borderWidth: 3,
    borderColor: colors.background,
  },
  crownBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: colors.secondary,
    borderRadius: 12,
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    ...shadows.small,
  },
  rightSection: {
    flex: 1,
    justifyContent: 'space-between',
  },
  fortuneTellerName: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.text.light,
    marginBottom: spacing.xs,
  },
  specialty: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginBottom: spacing.md,
  },
  statsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 215, 0, 0.15)',
    borderRadius: radius.md,
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    marginBottom: spacing.md,
    borderWidth: 1,
    borderColor: 'rgba(255, 215, 0, 0.3)',
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  statLabel: {
    fontSize: typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 30,
    backgroundColor: 'rgba(255, 215, 0, 0.3)',
    marginHorizontal: spacing.sm,
  },
  ratingContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  rating: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
    marginLeft: spacing.xs,
  },
  experience: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  description: {
    marginBottom: spacing.lg,
  },
  descriptionText: {
    fontSize: typography.fontSize.sm,
    color: colors.text.secondary,
    lineHeight: 20,
    textAlign: 'center',
  },
  specialtiesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginBottom: spacing.lg,
    gap: spacing.xs,
  },
  specialtyTag: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: radius.md,
    borderWidth: 1,
    borderColor: colors.secondary,
  },
  specialtyText: {
    fontSize: typography.fontSize.xs,
    color: colors.secondary,
    fontWeight: typography.fontWeight.medium,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  priceContainer: {
    alignItems: 'center',
  },
  price: {
    fontSize: typography.fontSize.xl,
    fontWeight: typography.fontWeight.bold,
    color: colors.secondary,
  },
  consultButton: {
    backgroundColor: colors.background,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: radius.md,
    ...shadows.medium,
  },
  consultButtonText: {
    fontSize: typography.fontSize.md,
    fontWeight: typography.fontWeight.bold,
    color: colors.primary,
    marginLeft: spacing.sm,
  },
});

export default ExploreFeaturedFortuneTeller; 