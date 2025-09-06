import React from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function KawaiiDice({ onPress }) {
  const { colors } = useTheme();
  return (
    <Pressable onPress={onPress} style={({ pressed }) => [{ opacity: pressed ? 0.85 : 1 }]}>
      <View style={[styles.die, { backgroundColor: colors.primary }]}>
        <Text style={[styles.pip, { color: colors.card }]}>★</Text>
      </View>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  die: {
    width: 96,
    height: 96,
    borderRadius: 28,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.15,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 6,
    marginTop: 4,
  },
  pip: { fontSize: 42, fontWeight: '800' },
});
