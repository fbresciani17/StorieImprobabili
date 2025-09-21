// components/AnimatedButton.js
import React, { useRef } from 'react';
import { Pressable, Animated } from 'react-native';

export default function AnimatedButton({ 
  children, 
  onPress, 
  style, 
  disabled = false,
  ...props 
}) {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.95,
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
        disabled={disabled}
        style={{ alignItems: 'center', justifyContent: 'center' }}
        {...props}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}
