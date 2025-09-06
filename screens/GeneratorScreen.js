import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import KawaiiDice from '../components/KawaiiDice';
import { seeds } from '../data/seeds';

const ORDER = [
  { key: 'characters', icon: '👤', label: 'Personaggi' },
  { key: 'places',     icon: '🌍', label: 'Luoghi' },
  { key: 'objects',    icon: '🧰', label: 'Oggetti' },
  { key: 'moods',      icon: '🌌', label: 'Atmosfere' },
  { key: 'eras',       icon: '⏳', label: 'Epoche' },
  { key: 'genres',     icon: '📚', label: 'Generi' },
];

function randomPick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export default function GeneratorScreen({ navigation }) {
  const { colors } = useTheme();

  // Stato iniziale: tutte le categorie vuote
  const initial = useMemo(() => {
    const s = {};
    ORDER.forEach(({ key }) => { s[key] = ''; });
    return s;
  }, []);

  const [result, setResult] = useState(initial);

  function rollAll() {
    setResult((prev) => {
      const next = { ...prev };
      ORDER.forEach(({ key }) => {
        next[key] = randomPick(seeds[key]);
      });
      return next;
    });
  }

  function clearAll() {
    setResult(initial);
  }

  const renderItem = ({ item }) => {
    const value = result[item.key] || '—';
    return (
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.icon, { color: colors.text }]}>{item.icon}</Text>
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{value}</Text>
        </View>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: colors.primary }]}>Storie Improbabili</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Generatore di elementi narrativi</Text>
      </View>

      <View style={styles.center}>
        <KawaiiDice />
      </View>

      <FlatList
        data={ORDER}
        keyExtractor={(item) => item.key}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
      />

      <View style={styles.actions}>
        <Pressable onPress={rollAll} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Genera 🎲</Text>
        </Pressable>

        <Pressable onPress={clearAll} style={[styles.btnGhost, { borderColor: colors.border }]}>
          <Text style={[styles.btnGhostText, { color: colors.text }]}>Pulisci ✨</Text>
        </Pressable>

        <Pressable onPress={() => navigation.navigate('Editor')} style={[styles.btn, { backgroundColor: colors.secondary }]}>
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Scrivi la tua storia ✏️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { marginBottom: 8 },
  title: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 14, opacity: 0.8 },
  center: { alignItems: 'center', marginBottom: 12 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderRadius: 16,
  },
  icon: { fontSize: 22, marginRight: 12 },
  content: { flex: 1 },
  label: { fontSize: 14, opacity: 0.9 },
  value: { fontSize: 16, fontWeight: '700', marginTop: 4 },
  actions: {
    flexDirection: 'row',
    gap: 10,
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  btn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  btnGhost: {
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
  },
  btnGhostText: { fontSize: 16, fontWeight: '600' },
});
