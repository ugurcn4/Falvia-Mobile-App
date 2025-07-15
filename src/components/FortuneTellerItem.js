import React from 'react';
import { 
  View, 
  Text, 
  StyleSheet, 
  Image, 
  TouchableOpacity 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import colors from '../styles/colors';
import { spacing } from '../styles/spacing';
import { typography } from '../styles/typography';

const FortuneTellerItem = ({ item, onPress }) => {
  // Eğer "add" tipindeyse ekleme butonu göster
  if (item.type === 'add') {
    return (
      <TouchableOpacity 
        style={styles.container}
        onPress={() => onPress && onPress(item)}
      >
        <View style={styles.addButton}>
          <Ionicons name="add" size={24} color={colors.secondary} />
        </View>
        <Text style={styles.name}>{item.name}</Text>
      </TouchableOpacity>
    );
  }

  // Yeni falcı sistemi için profile_image kullan
  const imageUri = item.profile_image || item.avatar || 'https://via.placeholder.com/70';

  return (
    <TouchableOpacity 
      style={styles.container}
      onPress={() => onPress && onPress(item)}
    >
      <Image source={{ uri: imageUri }} style={styles.avatar} />
      <Text style={styles.name}>{item.name}</Text>
      {/* Müsaitlik durumu göstergesi */}
      {item.is_available !== undefined && (
        <View style={[styles.statusIndicator, { backgroundColor: item.is_available ? colors.success : colors.error }]} />
      )}
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  container: {
    alignItems: 'center',
    marginHorizontal: spacing.sm,
    width: 80,
  },
  avatar: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.secondary,
  },
  name: {
    color: colors.secondary,
    fontSize: typography.fontSize.sm,
    marginTop: spacing.xs,
    textAlign: 'center',
  },
  addButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    borderWidth: 2,
    borderColor: colors.secondary,
    backgroundColor: 'rgba(10, 10, 26, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  statusIndicator: {
    position: 'absolute',
    top: 5,
    right: 5,
    width: 12,
    height: 12,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: colors.background,
  },
});

export default FortuneTellerItem; 