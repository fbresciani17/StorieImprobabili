import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable, FlatList } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { elements } from '../data/elements_it';
import { Ionicons } from '@expo/vector-icons';
import { setLastElements } from '../storage/lastElements';

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

  // Stato iniziale: ogni categoria ha { value, locked }
  const initial = useMemo(() => {
    const s = {};
    ORDER.forEach(({ key }) => { s[key] = { value: '', locked: false }; });
    return s;
  }, []);

  const [state, setState] = useState(initial);

  // Quante categorie mostrare (min 2, max 6)
  const [count, setCount] = useState(6);
  const visibleOrder = useMemo(() => ORDER.slice(0, count), [count]);

  // Rigenera tutte le categorie NON bloccate (solo quelle visibili)
  function rollAll() {
    setState((prev) => {
      const next = { ...prev };
      visibleOrder.forEach(({ key }) => {
        if (!prev[key].locked) {
          next[key] = { ...prev[key], value: randomPick(elements[key]) };
        }
      });

      // Salva in AsyncStorage SOLO se ci sono almeno 2 valori pieni
      const payload = {};
      visibleOrder.forEach(({ key }) => {
        if (next[key].value) payload[key] = next[key].value;
      });
      if (Object.keys(payload).length >= 2) {
        setLastElements(payload).catch((e) => console.warn("Errore salvataggio lastElements:", e));
      }

      return next;
    });
  }

  // Rigenera una singola categoria se NON bloccata
  function rerollOne(key) {
    setState((prev) => {
      if (prev[key].locked) return prev;
      const updated = { ...prev, [key]: { ...prev[key], value: randomPick(elements[key]) } };

      // Aggiorna anche in AsyncStorage se ≥2 categorie valorizzate
      const payload = {};
      ORDER.forEach(({ key }) => {
        if (updated[key].value) payload[key] = updated[key].value;
      });
      if (Object.keys(payload).length >= 2) {
        setLastElements(payload).catch((e) => console.warn("Errore salvataggio lastElements:", e));
      }

      return updated;
    });
  }

  // Pulisci: valori vuoti, sblocca tutto
  function clearAll() {
    setState(initial);
  }

  // Lock/sblocco di una riga
  function toggleLock(key) {
    setState((prev) => ({ ...prev, [key]: { ...prev[key], locked: !prev[key].locked } }));
  }

  // Sblocca tutto
  function unlockAll() {
    setState((prev) => {
      const next = { ...prev };
      ORDER.forEach(({ key }) => { next[key] = { ...prev[key], locked: false }; });
      return next;
    });
  }

  const renderItem = ({ item }) => {
    const { key, icon, label } = item;
    const { value, locked } = state[key];

    return (
      <View style={[styles.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.icon, { color: colors.text }]}>{icon}</Text>

        <Pressable
          style={styles.content}
          onPress={() => rerollOne(key)}
          android_ripple={{ color: '#00000010' }}
        >
          <Text style={[styles.label, { color: colors.text }]}>{label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{value || '—'}</Text>
        </Pressable>

        <Pressable
          accessibilityRole="button"
          onPress={() => toggleLock(key)}
          style={[
            styles.lockBtn,
            { backgroundColor: locked ? colors.primary : colors.accent }
          ]}
        >
          <Ionicons
            name={locked ? 'lock-closed' : 'lock-open'}
            size={18}
            color={locked ? '#FFFFFF' : colors.text}
          />
        </Pressable>
      </View>
    );
  };

  return (
    <View style={[styles.screen, { backgroundColor: colors.background }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: '#6B46C1', textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Storie Improbabili</Text>
        <Text style={[styles.subtitle, { color: colors.text }]}>Generatore di elementi narrativi</Text>
      </View>

      {/* Selettore numero elementi (2..6) */}
      <View style={styles.selector}>
        <Text style={[styles.selectorLabel, { color: colors.text }]}>Quanti elementi?</Text>
        <View style={styles.chips}>
          {[2, 3, 4, 5, 6].map((n) => (
            <Pressable
              key={n}
              onPress={() => setCount(n)}
              style={[
                styles.chip,
                {
                  borderColor: colors.border,
                  backgroundColor: n === count ? colors.accent : 'transparent',
                },
              ]}
            >
              <Text style={[styles.chipText, { color: colors.text }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
        <Text style={[styles.selectorHint, { color: colors.text }]}>
          Minimo 2 (Personaggi, Luoghi) • Massimo 6
        </Text>
      </View>

      <FlatList
        data={visibleOrder}
        keyExtractor={(it) => it.key}
        renderItem={renderItem}
        contentContainerStyle={{ gap: 12, paddingVertical: 8 }}
      />

      <View style={styles.actions}>
        <Pressable onPress={rollAll} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Genera 🎲</Text>
        </Pressable>

        <Pressable onPress={clearAll} style={[styles.btn, { backgroundColor: colors.accent }]}>
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Pulisci ✨</Text>
        </Pressable>

        <Pressable onPress={unlockAll} style={[styles.btn, { backgroundColor: colors.accent2 }]}>
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Sblocca tutto 🔓</Text>
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
  title: { fontSize: 28, fontWeight: '900', marginBottom: 8, fontFamily: 'Georgia', letterSpacing: 0.5 },
  subtitle: { fontSize: 16, opacity: 0.9, fontStyle: 'italic', letterSpacing: 0.3, fontFamily: 'Georgia' },
  selector: { marginTop: 4, marginBottom: 8 },
  selectorLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '700' },
  selectorHint: { fontSize: 12, opacity: 0.7, marginTop: 6 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 4,
    borderWidth: 1,
    borderRadius: 8,
  },
  icon: { fontSize: 14, marginRight: 4 },
  content: { flex: 1 },
  label: { fontSize: 13, opacity: 0.9 },
  value: { fontSize: 13, fontWeight: '700', marginTop: 0 },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
    justifyContent: 'space-between',
    paddingTop: 8,
  },
  btn: {
    flexGrow: 1,
    flexBasis: '48%',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 14,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
  btnGhost: {
    flexGrow: 1,
    flexBasis: '48%',
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 14,
    borderWidth: 1,
  },
  btnGhostText: { fontSize: 16, fontWeight: '600' },
  lockBtn: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
  },
});
