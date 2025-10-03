import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  RefreshControl,
  StatusBar,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';
import {
  getAllFortuneTellers,
  deleteFortuneTeller,
  toggleFortuneTellerAvailability,
} from '../services/supabaseService';

const AdminPanelScreen = ({ navigation }) => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [fortuneTellers, setFortuneTellers] = useState([]);

  // Falcıları yükle
  const loadFortuneTellers = async () => {
    try {
      const { data, error } = await getAllFortuneTellers();
      if (error) throw error;
      setFortuneTellers(data || []);
    } catch (error) {
      Alert.alert('Hata', 'Falcılar yüklenirken bir hata oluştu: ' + error.message);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    loadFortuneTellers();
  }, []);

  // Sayfa yenileme
  const onRefresh = () => {
    setRefreshing(true);
    loadFortuneTellers();
  };

  // Falcı silme
  const handleDeleteFortuneTeller = (id, name) => {
    Alert.alert(
      'Falcı Sil',
      `${name} adlı falcıyı silmek istediğinize emin misiniz?`,
      [
        { text: 'İptal', style: 'cancel' },
        {
          text: 'Sil',
          style: 'destructive',
          onPress: async () => {
            try {
              const { error } = await deleteFortuneTeller(id);
              if (error) throw error;
              Alert.alert('Başarılı', 'Falcı başarıyla silindi');
              loadFortuneTellers();
            } catch (error) {
              Alert.alert('Hata', 'Falcı silinirken bir hata oluştu: ' + error.message);
            }
          },
        },
      ]
    );
  };

  // Müsaitlik durumu değiştirme
  const handleToggleAvailability = async (id, currentStatus, name) => {
    try {
      const { error } = await toggleFortuneTellerAvailability(id, !currentStatus);
      if (error) throw error;
      Alert.alert(
        'Başarılı',
        `${name} adlı falcının durumu ${!currentStatus ? 'müsait' : 'müsait değil'} olarak güncellendi`
      );
      loadFortuneTellers();
    } catch (error) {
      Alert.alert('Hata', 'Durum güncellenirken bir hata oluştu: ' + error.message);
    }
  };

  // Falcı kartı
  const renderFortuneTellerCard = (teller) => (
    <View key={teller.id} style={styles.tellerCard}>
      <View style={styles.tellerHeader}>
        <View style={styles.tellerInfo}>
          <Text style={styles.tellerName}>{teller.name}</Text>
          <Text style={styles.tellerRank}>{teller.rank}</Text>
          <Text style={styles.tellerSpecialties}>
            {teller.specialties?.join(', ') || '-'}
          </Text>
        </View>
        <View style={styles.tellerStats}>
          <View style={[styles.statusBadge, { backgroundColor: teller.is_available ? colors.success : colors.error }]}>
            <Text style={styles.statusText}>
              {teller.is_available ? 'Müsait' : 'Müsait Değil'}
            </Text>
          </View>
          <Text style={styles.tellerRating}>⭐ {teller.rating}</Text>
        </View>
      </View>

      <View style={styles.tellerDetails}>
        <Text style={styles.tellerBio} numberOfLines={2}>
          {teller.bio || 'Biyografi bulunmuyor'}
        </Text>
        <View style={styles.tellerMetrics}>
          <Text style={styles.metricText}>
            💰 {teller.price_per_fortune} jeton
          </Text>
          <Text style={styles.metricText}>
            📊 {teller.total_readings} fal
          </Text>
          <Text style={styles.metricText}>
            🗓️ {teller.experience_years} yıl
          </Text>
        </View>
      </View>

      <View style={styles.tellerActions}>
        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.primary }]}
          onPress={() => navigation.navigate('EditFortuneTeller', { teller })}
        >
          <Ionicons name="create" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Düzenle</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: teller.is_available ? colors.warning : colors.success }]}
          onPress={() => handleToggleAvailability(teller.id, teller.is_available, teller.name)}
        >
          <Ionicons name={teller.is_available ? 'pause' : 'play'} size={16} color="#fff" />
          <Text style={styles.actionButtonText}>
            {teller.is_available ? 'Durdur' : 'Aktifleştir'}
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.actionButton, { backgroundColor: colors.error }]}
          onPress={() => handleDeleteFortuneTeller(teller.id, teller.name)}
        >
          <Ionicons name="trash" size={16} color="#fff" />
          <Text style={styles.actionButtonText}>Sil</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Yükleniyor...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar translucent backgroundColor="transparent" barStyle="light-content" />
      
      {/* Header */}
      <LinearGradient
        colors={[colors.primary, colors.primaryDark]}
        style={styles.header}
      >
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => navigation.goBack()}
        >
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Admin Paneli</Text>
        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate('AddFortuneTeller')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </LinearGradient>

      {/* İstatistikler */}
      <View style={styles.statsContainer}>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>{fortuneTellers.length}</Text>
          <Text style={styles.statLabel}>Toplam Falcı</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {fortuneTellers.filter(t => t.is_available).length}
          </Text>
          <Text style={styles.statLabel}>Müsait Falcı</Text>
        </View>
        <View style={styles.statCard}>
          <Text style={styles.statNumber}>
            {fortuneTellers.reduce((sum, t) => sum + (t.total_readings || 0), 0)}
          </Text>
          <Text style={styles.statLabel}>Toplam Fal</Text>
        </View>
      </View>

      {/* Falcı Listesi */}
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor={colors.primary}
          />
        }
      >
        <View style={styles.tellersContainer}>
          <Text style={styles.sectionTitle}>Falcılar ({fortuneTellers.length})</Text>
          {fortuneTellers.length === 0 ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="people" size={48} color={colors.text.secondary} />
              <Text style={styles.emptyText}>Henüz falcı eklenmemiş</Text>
              <TouchableOpacity
                style={styles.addFirstButton}
                onPress={() => navigation.navigate('AddFortuneTeller')}
              >
                <Text style={styles.addFirstButtonText}>İlk Falcıyı Ekle</Text>
              </TouchableOpacity>
            </View>
          ) : (
            fortuneTellers.map(renderFortuneTellerCard)
          )}
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
    marginBottom: 70,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  loadingText: {
    marginTop: 10,
    color: colors.text.secondary,
    fontSize: 16,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 50,
    paddingBottom: 20,
    paddingHorizontal: 20,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  addButton: {
    padding: 8,
  },
  statsContainer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 15,
    backgroundColor: colors.surface,
  },
  statCard: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 15,
    marginHorizontal: 5,
    backgroundColor: colors.background,
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  statNumber: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.primary,
  },
  statLabel: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 5,
  },
  scrollView: {
    flex: 1,
  },
  tellersContainer: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: colors.text.primary,
    marginBottom: 15,
  },
  tellerCard: {
    backgroundColor: colors.surface,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    elevation: 3,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  tellerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  tellerInfo: {
    flex: 1,
  },
  tellerName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: colors.text.primary,
  },
  tellerRank: {
    fontSize: 12,
    color: colors.primary,
    marginTop: 2,
    textTransform: 'capitalize',
  },
  tellerSpecialties: {
    fontSize: 12,
    color: colors.text.secondary,
    marginTop: 2,
  },
  tellerStats: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 10,
    color: '#fff',
    fontWeight: 'bold',
  },
  tellerRating: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  tellerDetails: {
    marginBottom: 12,
  },
  tellerBio: {
    fontSize: 14,
    color: colors.text.secondary,
    lineHeight: 20,
    marginBottom: 8,
  },
  tellerMetrics: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metricText: {
    fontSize: 12,
    color: colors.text.secondary,
  },
  tellerActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    flex: 1,
    marginHorizontal: 2,
    justifyContent: 'center',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyText: {
    fontSize: 16,
    color: colors.text.secondary,
    marginTop: 10,
    marginBottom: 20,
  },
  addFirstButton: {
    backgroundColor: colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  addFirstButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: 'bold',
  },
});

export default AdminPanelScreen; 