// components/Generator.js
import React, { useMemo, useState } from 'react';
import { View, Text, StyleSheet, Pressable } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { Ionicons } from '@expo/vector-icons';
import { ELEMENTS, ORDER as ORDER_BASE, META as META_BASE } from '../data/elements_it';
import { setLastElements } from '../storage/lastElements';

function randomPick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

const DEFAULT_META = {
  characters: { icon: '👤', label: 'Personaggi' },
  places:     { icon: '🌍', label: 'Luoghi' },
  objects:    { icon: '🧰', label: 'Oggetti' },
  moods:      { icon: '🌌', label: 'Atmosfere' },
  eras:       { icon: '⏳', label: 'Epoche' },
  genres:     { icon: '📚', label: 'Generi' },
};

export default function Generator({ onGoToEditor }) {
  const { colors } = useTheme();

  // Ordine robusto
  const ORDER = useMemo(() => {
    if (Array.isArray(ORDER_BASE) && ORDER_BASE.length) {
      return ORDER_BASE.filter((k) => ELEMENTS && Array.isArray(ELEMENTS[k]));
    }
    return Object.keys(ELEMENTS || {});
  }, []);

  const categories = ORDER;
  const MAX_COUNT = Math.max(2, Math.min(6, categories.length || 6));
  const choices = Array.from({ length: MAX_COUNT - 2 + 1 }, (_, i) => 2 + i); // [2..MAX_COUNT]

  const [count, setCount] = useState(2);

  const initialValues = useMemo(() => {
    const obj = {}; categories.forEach((k) => (obj[k] = '')); return obj;
  }, [categories]);
  const [values, setValues] = useState(initialValues);

  const initialLocks = useMemo(() => {
    const obj = {}; categories.forEach((k) => (obj[k] = false)); return obj;
  }, [categories]);
  const [locks, setLocks] = useState(initialLocks);

  function buildPayloadFrom(vals) {
    const limit = Math.min(count, categories.length);
    const out = {};
    for (let i = 0; i < limit; i++) {
      const k = categories[i];
      const v = vals[k];
      if (v) out[k] = v;
    }
    return out; // { characters: '...', places: '...', ... }
  }

  async function rollAll() {
    setValues((prev) => {
      const next = { ...prev };
      const limit = Math.min(count, categories.length);
      for (let i = 0; i < limit; i++) {
        const key = categories[i];
        const pool = ELEMENTS[key] || [];
        if (!locks[key] && pool.length) next[key] = randomPick(pool);
      }
      // salva in cache l’ultimo set valido (non blocca l’UI)
      const payload = buildPayloadFrom(next);
      if (Object.keys(payload).length >= 2) setLastElements(payload);
      return next;
    });
  }

  function clearAll() {
    setValues(initialValues);
    setLocks(initialLocks);
    // non tocchiamo la cache: è solo un “ultimo set”
  }

  function toggleLock(key) { setLocks((prev) => ({ ...prev, [key]: !prev[key] })); }

  function metaFor(key) {
    return (META_BASE && META_BASE[key]) || DEFAULT_META[key] || { icon: '🔹', label: key };
  }

  return (
    <View style={styles.wrap}>
      {/* Selettore quantità */}
      <View style={styles.row}>
        <Text style={[styles.label, { color: colors.text }]}>Quanti elementi:</Text>
        <View style={styles.amounts}>
          {choices.map((n) => (
            <Pressable
              key={n}
              onPress={() => setCount(n)}
              style={[
                styles.pill,
                { backgroundColor: count === n ? colors.primary : 'transparent', borderColor: colors.border },
              ]}
            >
              <Text style={[styles.pillText, { color: count === n ? (colors.textOnButton || '#fff') : colors.text }]}>{n}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {/* Lista risultati */}
      <View style={{ gap: 8 }}>
        {categories.slice(0, count).map((key) => {
          const m = metaFor(key);
          return (
            <View key={key} style={[styles.item, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={styles.icon}>{m.icon}</Text>
              <View style={{ flex: 1 }}>
                <Text style={[styles.itemLabel, { color: colors.text }]}>{m.label}</Text>
                <Text style={[styles.itemValue, { color: colors.text }]}>{values[key] || '—'}</Text>
              </View>
              <Pressable
                onPress={() => toggleLock(key)}
                accessibilityRole="button"
                style={[styles.lockBtn, { backgroundColor: locks[key] ? colors.primary : colors.accent, borderColor: colors.border }]}
              >
                <Ionicons name={locks[key] ? 'lock-closed' : 'lock-open'} size={18} color={colors.text} />
              </Pressable>
            </View>
          );
        })}
      </View>

      {/* Azioni */}
      <View style={styles.actions}>
        <Pressable onPress={rollAll} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.btnText, { color: colors.textOnButton || '#fff' }]}>{'Genera 🎲'}</Text>
        </Pressable>

        <Pressable onPress={clearAll} style={[styles.btn, { backgroundColor: colors.accent }]}>
          <Text style={[styles.btnText, { color: '#FFFFFF' }]}>{'Pulisci ✨'}</Text>
        </Pressable>

        {onGoToEditor ? (
          <Pressable
            onPress={async () => {
              // 👇 Salviamo *anche qui* i valori correnti (se validi) e poi navighiamo
              const payload = buildPayloadFrom(values);
              if (Object.keys(payload).length >= 2) await setLastElements(payload);
              onGoToEditor();
            }}
            style={[styles.btn, { backgroundColor: colors.secondary }]}
          >
            <Text style={[styles.btnText, { color: colors.textOnButton || '#fff' }]}>{'Scrivi la tua storia ✏️'}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: { flex: 1, gap: 12 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  label: { fontSize: 14, fontWeight: '700' },
  amounts: { flexDirection: 'row', alignItems: 'center' },
  pill: { paddingVertical: 6, paddingHorizontal: 10, borderRadius: 999, borderWidth: 1, marginLeft: 8 },
  pillText: { fontSize: 14, fontWeight: '700' },
  item: { borderWidth: 1, borderRadius: 14, padding: 12, flexDirection: 'row', alignItems: 'center', gap: 8 },
  icon: { fontSize: 18, width: 24, textAlign: 'center' },
  itemLabel: { fontSize: 14, opacity: 0.9, width: 110 },
  itemValue: { flex: 1, fontSize: 16, fontWeight: '700' },
  lockBtn: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10, borderWidth: 1 },
  actions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 12 },
  btn: { flex: 1, alignItems: 'center', justifyContent: 'center', paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: 16, fontWeight: '700' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  btnGhostText: { fontSize: 16, fontWeight: '600' },
});
