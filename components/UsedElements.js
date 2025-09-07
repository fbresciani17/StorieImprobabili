// components/UsedElements.js
import React, { useEffect, useMemo, useState, useCallback } from 'react';
import { View, Text, StyleSheet, Pressable, ScrollView } from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getLastElements } from '../storage/lastElements';
import { elements as ELEMENTS, ORDER as ORDER_BASE, META as META_BASE } from '../data/elements_it';
import { useIsFocused } from '@react-navigation/native';

const DEFAULT_META = {
  characters: { icon: '👤', label: 'Personaggi' },
  places:     { icon: '🌍', label: 'Luoghi' },
  objects:    { icon: '🧰', label: 'Oggetti' },
  moods:      { icon: '🌌', label: 'Atmosfere' },
  eras:       { icon: '⏳', label: 'Epoche' },
  genres:     { icon: '📚', label: 'Generi' },
};

function metaFor(key) {
  return (META_BASE && META_BASE[key]) || DEFAULT_META[key] || { icon: '🔹', label: key };
}

/**
 * Pannello read-only degli ultimi elementi usati.
 *
 * Props:
 * - compact?: UI più densa (font e paddings ridotti)
 * - title?: string (default: 'Elementi usati (solo lettura)')
 * - watchFocus?: se true ricarica i dati quando la screen torna in focus
 * - collapsible?: se true mostra header cliccabile per espandere/chiudere
 * - defaultCollapsed?: boolean (default: false)
 * - maxHeight?: altezza max dell’area scrollabile quando espanso (default: 140)
 */
export default function UsedElementsPanel({
  compact = false,
  title,
  watchFocus = false,
  collapsible = false,
  defaultCollapsed = false,
  maxHeight = 140,
}) {
  const { colors } = useTheme();
  const [last, setLast] = useState(null);
  const isFocused = useIsFocused();
  const [collapsed, setCollapsed] = useState(!!defaultCollapsed);

  const ORDER = useMemo(() => {
    if (Array.isArray(ORDER_BASE) && ORDER_BASE.length) {
      return ORDER_BASE.filter((k) => ELEMENTS && Array.isArray(ELEMENTS[k]));
    }
    return Object.keys(ELEMENTS || {});
  }, []);

  const load = useCallback(async () => {
    try {
      const data = await getLastElements();
      setLast(data && typeof data === 'object' ? data : null);
    } catch {
      setLast(null);
    }
  }, []);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { if (watchFocus && isFocused) load(); }, [watchFocus, isFocused, load]);

  const headerTitle = title || 'Elementi usati (solo lettura)';

  if (!last || !Object.keys(last).length) {
    return (
      <View style={[styles.card, styles.emptyCard, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Text style={[compact ? styles.titleSm : styles.title, { color: colors.text }]}>{headerTitle}</Text>
        <Text style={[compact ? styles.emptyTextSm : styles.emptyText, { color: colors.text }]}>
          Nessun dato disponibile: genera prima dal tab "Genera".
        </Text>
      </View>
    );
  }

  const keys = ORDER.filter((k) => last[k]);

  // Render riga singola (compatto)
  const Row = ({ k }) => {
    const m = metaFor(k);
    return (
      <View key={k} style={[styles.row, { borderColor: colors.border }]}>
        <Text style={styles.icon}>{m.icon}</Text>
        <Text style={[compact ? styles.keySm : styles.key, { color: colors.text }]}>{m.label}</Text>
        <Text style={[compact ? styles.valSm : styles.val, { color: colors.text }]} numberOfLines={2}>
          {String(last[k])}
        </Text>
      </View>
    );
  };

  // Se collapsible, header cliccabile con mostrina
  if (collapsible) {
    return (
      <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
        <Pressable onPress={() => setCollapsed((v) => !v)} style={styles.headerRow} android_ripple={{ color: '#00000010' }}>
          <Text style={[compact ? styles.titleSm : styles.title, { color: colors.text }]} numberOfLines={1}>
            {headerTitle}
          </Text>
          <Text style={{ color: colors.text, opacity: 0.7 }}>{collapsed ? '▼' : '▲'}</Text>
        </Pressable>

        {!collapsed && (
          <View style={{ maxHeight }}>
            <ScrollView
              style={{}}
              contentContainerStyle={{ gap: compact ? 6 : 8, paddingTop: 4 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              {keys.map((k) => <Row key={k} k={k} />)}
            </ScrollView>
          </View>
        )}
      </View>
    );
  }

  // Variante non-collapsible (con lista intera)
  return (
    <View style={[styles.card, { borderColor: colors.border, backgroundColor: colors.card }]}>
      <Text style={[compact ? styles.titleSm : styles.title, { color: colors.text }]}>{headerTitle}</Text>
      <View style={{ gap: compact ? 6 : 8 }}>
        {keys.map((k) => <Row key={k} k={k} />)}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderWidth: 1, borderRadius: 14, padding: 10, marginTop: 8 },
  emptyCard: { borderStyle: 'dashed' },
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },

  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, paddingVertical: 2 },
  icon: { width: 20, fontSize: 16, textAlign: 'center' },

  title: { fontSize: 15, fontWeight: '800' },
  titleSm: { fontSize: 13, fontWeight: '800' },

  key: { width: 100, fontSize: 13, fontWeight: '700' },
  keySm: { width: 96, fontSize: 12, fontWeight: '700' },

  val: { flex: 1, fontSize: 13, opacity: 0.9 },
  valSm: { flex: 1, fontSize: 12, opacity: 0.9 },

  emptyText: { fontSize: 12, opacity: 0.8, marginTop: 4 },
  emptyTextSm: { fontSize: 11, opacity: 0.8, marginTop: 4 },
});
