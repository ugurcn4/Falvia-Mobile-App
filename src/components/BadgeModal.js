import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  StyleSheet,
  Animated,
  Dimensions
} from 'react-native';
import { Ionicons, MaterialIcons, MaterialCommunityIcons } from '@expo/vector-icons';
import { LinearGradient } from 'expo-linear-gradient';
import colors from '../styles/colors';

const { width, height } = Dimensions.get('window');

/**
 * Rozet Kazanma Modal Komponenti
 * @param {boolean} visible - Modal görünürlüğü
 * @param {Object} badge - Kazanılan rozet bilgisi
 * @param {Function} onClose - Modal kapatma fonksiyonu
 */
const BadgeModal = ({ visible, badge, onClose }) => {
  const scaleAnim = useRef(new Animated.Value(0)).current;
  const rotateAnim = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (visible && badge) {
      // Başlangıç animasyonları
      Animated.sequence([
        // Büyüme animasyonu
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 7,
          useNativeDriver: true,
        }),
        // Dönme animasyonu
        Animated.timing(rotateAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ]).start();

      // Sürekli nabız animasyonu
      Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.1,
            duration: 1000,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1000,
            useNativeDriver: true,
          }),
        ])
      ).start();
    } else {
      // Modal kapandığında animasyonları sıfırla
      scaleAnim.setValue(0);
      rotateAnim.setValue(0);
      pulseAnim.setValue(1);
    }
  }, [visible, badge]);

  const rotate = rotateAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  // İkon render fonksiyonu
  const renderIcon = () => {
    const iconProps = {
      name: badge?.iconName || 'star',
      size: 80,
      color: '#fff'
    };

    switch (badge?.iconType) {
      case 'material':
        return <MaterialIcons {...iconProps} />;
      case 'materialcommunity':
        return <MaterialCommunityIcons {...iconProps} />;
      default:
        return <Ionicons {...iconProps} />;
    }
  };

  if (!badge) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.overlay}>
        {/* Arka plan efekti */}
        <View style={styles.backgroundEffect}>
          {[...Array(20)].map((_, i) => (
            <Animated.View
              key={i}
              style={[
                styles.star,
                {
                  left: Math.random() * width,
                  top: Math.random() * height,
                  opacity: Math.random(),
                }
              ]}
            >
              <Ionicons name="star" size={12} color={badge.color} />
            </Animated.View>
          ))}
        </View>

        {/* Modal içeriği */}
        <Animated.View
          style={[
            styles.modalContainer,
            {
              transform: [{ scale: scaleAnim }]
            }
          ]}
        >
          <LinearGradient
            colors={[colors.primaryDark, colors.primary, colors.primaryLight]}
            style={styles.gradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            {/* Başlık */}
            <View style={styles.header}>
              <Ionicons name="trophy" size={24} color={colors.secondary} />
              <Text style={styles.headerText}>Tebrikler!</Text>
            </View>

            {/* Rozet ikonu */}
            <Animated.View
              style={[
                styles.badgeIconContainer,
                {
                  backgroundColor: badge.color,
                  transform: [
                    { rotate },
                    { scale: pulseAnim }
                  ]
                }
              ]}
            >
              {renderIcon()}
            </Animated.View>

            {/* Rozet adı */}
            <Text style={styles.badgeName}>{badge.name}</Text>

            {/* Rozet açıklaması */}
            <Text style={styles.badgeDescription}>{badge.description}</Text>

            {/* Altın yıldız dekorasyonu */}
            <View style={styles.starDecoration}>
              <Ionicons name="star" size={16} color={colors.secondary} />
              <Ionicons name="star" size={20} color={colors.secondary} style={styles.centerStar} />
              <Ionicons name="star" size={16} color={colors.secondary} />
            </View>

            {/* Kapat butonu */}
            <TouchableOpacity
              style={styles.closeButton}
              onPress={onClose}
              activeOpacity={0.8}
            >
              <LinearGradient
                colors={[colors.secondary, '#FFA500']}
                style={styles.closeButtonGradient}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
              >
                <Text style={styles.closeButtonText}>Harika!</Text>
                <Ionicons name="checkmark-circle" size={20} color="#fff" />
              </LinearGradient>
            </TouchableOpacity>
          </LinearGradient>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.85)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  backgroundEffect: {
    position: 'absolute',
    width: '100%',
    height: '100%',
  },
  star: {
    position: 'absolute',
  },
  modalContainer: {
    width: width * 0.85,
    maxWidth: 400,
    borderRadius: 25,
    overflow: 'hidden',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.5,
    shadowRadius: 20,
  },
  gradient: {
    padding: 30,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  headerText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: colors.text.light,
    marginLeft: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 3,
  },
  badgeIconContainer: {
    width: 140,
    height: 140,
    borderRadius: 70,
    justifyContent: 'center',
    alignItems: 'center',
    marginVertical: 20,
    borderWidth: 4,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  badgeName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: colors.text.light,
    textAlign: 'center',
    marginTop: 15,
    marginBottom: 10,
    textShadowColor: 'rgba(0, 0, 0, 0.3)',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 2,
  },
  badgeDescription: {
    fontSize: 16,
    color: colors.text.secondary,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  starDecoration: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 25,
  },
  centerStar: {
    marginHorizontal: 10,
  },
  closeButton: {
    width: '100%',
    borderRadius: 15,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 5,
  },
  closeButtonGradient: {
    paddingVertical: 15,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  closeButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
    marginRight: 8,
  },
});

export default BadgeModal;

