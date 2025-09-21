import React, { useMemo, useState, useEffect } from 'react';
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
  const [count, setCount] = useState(2);
  const [values, setValues] = useState({});
  const [locks, setLocks] = useState({});

  const visibleOrder = useMemo(() => {
    return ORDER.filter(item => elements[item.key] && elements[item.key].length > 0).slice(0, count);
  }, [count]);

  // Pulisci gli elementi quando cambia il numero di elementi selezionati
  useEffect(() => {
    const newValues = {};
    const limit = Math.min(count, visibleOrder.length);
    for (let i = 0; i < limit; i++) {
      const item = visibleOrder[i];
      newValues[item.key] = values[item.key] || '';
    }
    setValues(newValues);
    setLocks({});
  }, [count]);

  async function rollAll() {
    const newValues = {};
    const limit = Math.min(count, visibleOrder.length);
    
    for (let i = 0; i < limit; i++) {
      const item = visibleOrder[i];
      if (!locks[item.key]) {
        newValues[item.key] = randomPick(elements[item.key]);
      } else {
        // Mantieni il valore esistente se è bloccato
        newValues[item.key] = values[item.key] || '';
      }
    }
    
    // Sostituisci completamente i valori con solo quelli visibili
    setValues(newValues);
    
    // Salva solo gli elementi visibili per l'editor
    await setLastElements(newValues);
  }

  async function clearAll() {
    setValues({});
    setLocks({});
    // Pulisce anche gli elementi salvati per l'editor
    await setLastElements({});
  }

  async function unlockAll() {
    setLocks({});
    
    // Rigenera tutti gli elementi visibili
    const newValues = {};
    const limit = Math.min(count, visibleOrder.length);
    
    for (let i = 0; i < limit; i++) {
      const item = visibleOrder[i];
      newValues[item.key] = randomPick(elements[item.key]);
    }
    
    // Sostituisci completamente i valori con solo quelli visibili
    setValues(newValues);
    await setLastElements(newValues);
  }

  async function toggleLock(key) {
    const newLocks = { ...locks, [key]: !locks[key] };
    setLocks(newLocks);
    
    // Se sblocchi un elemento, rigenera e salva solo gli elementi visibili
    if (!newLocks[key] && values[key]) {
      const newValue = randomPick(elements[key]);
      const updatedValues = { ...values, [key]: newValue };
      setValues(updatedValues);
      
      // Salva solo gli elementi visibili
      const visibleValues = {};
      const limit = Math.min(count, visibleOrder.length);
      for (let i = 0; i < limit; i++) {
        const item = visibleOrder[i];
        visibleValues[item.key] = updatedValues[item.key] || '';
      }
      await setLastElements(visibleValues);
    }
  }

  const renderItem = ({ item }) => {
    const locked = locks[item.key];
    const value = values[item.key] || '';
    
    return (
      <View style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={styles.icon}>{item.icon}</Text>
        <View style={styles.content}>
          <Text style={[styles.label, { color: colors.text }]}>{item.label}</Text>
          <Text style={[styles.value, { color: colors.text }]}>{value || '—'}</Text>
        </View>
        <Pressable
          onPress={() => toggleLock(item.key)}
          style={[styles.lockBtn, { backgroundColor: locked ? colors.accent : colors.primary }]}
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
        <Text style={[styles.title, { color: colors.title, textShadowColor: 'rgba(0,0,0,0.1)', textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 2 }]}>Storie Improbabili</Text>
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
        keyExtractor={(item) => item.key}
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

        <Pressable 
          onPress={async () => {
            // Salva solo gli elementi visibili prima di navigare
            const visibleValues = {};
            const limit = Math.min(count, visibleOrder.length);
            for (let i = 0; i < limit; i++) {
              const item = visibleOrder[i];
              visibleValues[item.key] = values[item.key] || '';
            }
            await setLastElements(visibleValues);
            navigation.navigate('Editor');
          }} 
          style={[styles.btn, { backgroundColor: colors.secondary }]}
        >
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Scrivi la tua storia ✏️</Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, padding: 16 },
  header: { marginBottom: 8 },
  title: { 
    fontSize: 28, 
    fontWeight: '900', 
    fontFamily: 'Georgia', 
    letterSpacing: 0.5,
    marginBottom: 8 
  },
  subtitle: { fontSize: 16, opacity: 0.9, fontStyle: 'italic', letterSpacing: 0.3, fontFamily: 'Georgia' },
  selector: { marginTop: 4, marginBottom: 8 },
  selectorLabel: { fontSize: 14, fontWeight: '700', marginBottom: 6 },
  chips: { flexDirection: 'row', gap: 8 },
  chip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 12, borderWidth: 1 },
  chipText: { fontSize: 14, fontWeight: '700' },
  selectorHint: { fontSize: 12, opacity: 0.7, marginTop: 4, fontStyle: 'italic' },
  item: { 
    borderWidth: 1, 
    borderRadius: 6, 
    padding: 5, 
    flexDirection: 'row', 
    alignItems: 'center', 
    gap: 5 
  },
  icon: { fontSize: 13, width: 16, textAlign: 'center' },
  content: { flex: 1 },
  label: { fontSize: 10, fontWeight: '600', marginBottom: 1 },
  value: { fontSize: 12, fontWeight: '700' },
  lockBtn: { 
    paddingVertical: 3, 
    paddingHorizontal: 7, 
    borderRadius: 4, 
    alignItems: 'center',
    justifyContent: 'center'
  },
  actions: { 
    flexDirection: 'row', 
    gap: 10, 
    justifyContent: 'space-between', 
    flexWrap: 'wrap', 
    marginTop: 4 
  },
  btn: { 
    flexGrow: 1, 
    alignItems: 'center', 
    justifyContent: 'center', 
    paddingVertical: 14, 
    borderRadius: 14,
    minWidth: 140,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  btnText: { fontSize: 16, fontWeight: '700' },
});
