// components/ResponsiveChip.js
import React, { useRef } from 'react';
import { Pressable, Text, Animated } from 'react-native';

export default function ResponsiveChip({ 
  children, 
  onPress, 
  style, 
  colors,
  ...props 
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.9,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <Animated.View style={[{ transform: [{ scale: scaleAnim }] }, style]}>
      <Pressable
        onPress={onPress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}
        android_ripple={{ color: colors.primary, radius: 20 }}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
