// components/AnimatedElement.js
import React, { useRef, useEffect } from 'react';
import { View, Text, Animated } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import AnimatedButton from './AnimatedButton';

export default function AnimatedElement({ 
  item, 
  value, 
  locked, 
  colors, 
  onToggleLock, 
  styles 
}) {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Animazione di entrata quando l'elemento viene generato
    if (value) {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.spring(scaleAnim, {
          toValue: 1,
          tension: 50,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();
    } else {
      // Reset quando l'elemento viene pulito
      fadeAnim.setValue(0);
      scaleAnim.setValue(0.5);
    }
  }, [value]);

  return (
    <Animated.View 
      style={[
        styles.item, 
        { 
          backgroundColor: colors.card, 
          borderColor: colors.border,
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }]
        }
      ]}
    >
      <Text style={styles.icon}>{item.icon}</Text>
      <View style={styles.content}>
        <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
        <Text style={[styles.value, { color: colors.text }]}>{value || '—'}</Text>
      </View>
      <AnimatedButton
        onPress={() => onToggleLock(item.key)}
        style={[styles.lockBtn, { backgroundColor: locked ? colors.accent : colors.primary }]}
      >
        <Ionicons 
          name={locked ? 'lock-closed' : 'lock-open'} 
          size={18} 
          color={locked ? '#FFFFFF' : colors.text} 
        />
      </AnimatedButton>
    </Animated.View>
  );
}
