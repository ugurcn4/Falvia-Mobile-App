import React, { useRef } from 'react';
import { Animated, Pressable, Text, ActivityIndicator } from 'react-native';
import colors from '../styles/colors';

const AnimatedButton = ({ 
  onPress, 
  title, 
  loading = false, 
  disabled = false,
  style, 
  textStyle,
  loadingText = 'Yükleniyor...',
  androidRipple = { color: 'rgba(0,0,0,0.1)', borderless: false }
}) => {
  const buttonScale = useRef(new Animated.Value(1)).current;

  const animateButton = (scale) => {
    Animated.spring(buttonScale, {
      toValue: scale,
      friction: 5,
      tension: 200,
      useNativeDriver: true
    }).start();
  };

  return (
    <Animated.View style={{
      transform: [{ scale: buttonScale }],
      width: '100%'
    }}>
      <Pressable 
        style={style}
        onPress={onPress}
        android_ripple={androidRipple}
        disabled={disabled || loading}
        onPressIn={() => animateButton(0.95)}
        onPressOut={() => animateButton(1)}
      >
        {loading ? (
          <ActivityIndicator size="small" color={colors.text.dark} />
        ) : (
          <Text style={textStyle}>{title}</Text>
        )}
      </Pressable>
    </Animated.View>
  );
};

export default AnimatedButton; 