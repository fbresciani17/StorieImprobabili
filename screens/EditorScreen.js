import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { useTheme } from '../theme/ThemeContext';

export default function EditorScreen() {
  const { colors } = useTheme();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.title, { color: colors.text }]}>
        Editor
      </Text>
      <Text style={[styles.hint, { color: colors.text }]}>
        Qui comparirà l'editor con salvataggio locale.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 24 },
  title: { fontSize: 20, fontWeight: '700', marginBottom: 12 },
  hint: { opacity: 0.8 },
});
