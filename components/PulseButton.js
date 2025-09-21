// components/PulseButton.js
import React, { useRef, useEffect } from 'react';
import { Animated } from 'react-native';
import AnimatedButton from './AnimatedButton';

export default function PulseButton({ 
  children, 
  onPress, 
  style, 
  isGenerating = false,
  ...props 
}) {
  const pulseAnim = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    if (isGenerating) {
      // Animazione pulse durante la generazione
      const pulse = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.2,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
      pulse.start();
      
      return () => pulse.stop();
    } else {
      // Reset quando finisce la generazione
      pulseAnim.setValue(1);
    }
  }, [isGenerating]);

  return (
    <Animated.View style={[{ flex: 1 }, { transform: [{ scale: pulseAnim }] }]}>
      <AnimatedButton onPress={onPress} style={style} {...props}>
        {children}
      </AnimatedButton>
    </Animated.View>
  );
}
