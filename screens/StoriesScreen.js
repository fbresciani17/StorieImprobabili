// screens/StoriesScreen.js
import React, { useCallback, useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  RefreshControl,
  TextInput,
  Modal,
  ScrollView,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import { getAllStories, removeStory } from '../storage/stories';
import UsedElementsPanel from '../components/UsedElements'; // elementi creativi in modale
import * as Clipboard from 'expo-clipboard'; // copia negli appunti

// Helper contatore parole (UI-only)
function countWords(s) {
  if (!s) return 0;
  const m = String(s).trim().match(/\S+/g);
  return m ? m.length : 0;
}
const ts = (n) => n;

export default function StoriesScreen() {
  const { colors } = useTheme();
  const navigation = useNavigation();

  const [stories, setStories] = useState([]);
  const [refreshing, setRefreshing] = useState(false);

  // Ricerca (UI-only)
  const [query, setQuery] = useState('');

  // Ordinamento (UI-only)
  // key: 'updatedAt' | 'createdAt' | 'title' ; dir: 'asc' | 'desc'
  const [sort, setSort] = useState({ key: 'updatedAt', dir: 'desc' });

  // Modale di visualizzazione
  const [preview, setPreview] = useState(null); // {id,title,body,createdAt,updatedAt} | null

  const load = useCallback(async () => {
    try {
      const list = await getAllStories();
      setStories(Array.isArray(list) ? list : []);
    } catch {
      setStories([]);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    await load();
    setRefreshing(false);
  }, [load]);

  const formatDate = (iso) => {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleString();
  };

  function confirmDelete(storyId) {
    Alert.alert(
      'Elimina 🗑️',
      'Vuoi davvero eliminare questa storia?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            try {
              await removeStory(storyId);
              setStories((prev) => prev.filter((s) => s.id !== storyId));
              if (preview?.id === storyId) setPreview(null);
            } catch {}
          },
        },
      ]
    );
  }

  function openEditor(story) {
    setPreview(null);
    navigation.navigate('Editor', { story });
  }

  // Filtro ricerca
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return stories;
    return stories.filter((s) => {
      const t = String(s.title || '').toLowerCase();
      const b = String(s.body || '').toLowerCase();
      return t.includes(q) || b.includes(q);
    });
  }, [stories, query]);

  // Ordinamento
  const sorted = useMemo(() => {
    const list = [...filtered];
    list.sort((a, b) => {
      const { key, dir } = sort;
      const av = a?.[key] ?? '';
      const bv = b?.[key] ?? '';
      let cmp = 0;
      if (key === 'title') {
        cmp = String(av).localeCompare(String(bv), 'it', { sensitivity: 'base' });
      } else {
        cmp = String(av).localeCompare(String(bv)); // ISO strings
      }
      return dir === 'asc' ? cmp : -cmp;
    });
    return list;
  }, [filtered, sort]);

  const toggleDir = () => setSort((s) => ({ ...s, dir: s.dir === 'asc' ? 'desc' : 'asc' }));
  const setSortKey = (key) => setSort((s) => (s.key === key ? s : { ...s, key }));

  const SortChip = ({ label, active, onPress }) => (
    <Pressable
      onPress={onPress}
      style={[
        styles.chip,
        {
          backgroundColor: active ? (colors.accent || '#ddd') : 'transparent',
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: colors.text }]}>{label}</Text>
    </Pressable>
  );

  const renderItem = ({ item }) => {
    const body = String(item.body || '');
    return (
      <Pressable
        onPress={() => setPreview(item)} // ⇦ SOLO visualizzazione
        style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
      >
        <View style={styles.itemHeader}>
          <Text style={[styles.itemTitle, { color: colors.text }]} numberOfLines={1}>
            {item.title || 'Senza titolo'}
          </Text>

          <View style={styles.actionsRow}>
            <Pressable
              onPress={() => openEditor(item)}
              style={[styles.iconBtn, { backgroundColor: colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Modifica storia"
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>✏️</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item.id)}
              style={[styles.iconBtn, { backgroundColor: colors.accent2 || colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Elimina storia"
            >
              <Text style={{ color: colors.text, fontWeight: '800' }}>🗑️</Text>
            </Pressable>
          </View>
        </View>

        <Text style={[styles.date, { color: colors.text }]}>{formatDate(item.createdAt)}</Text>

        {/* Contatore parole/caratteri */}
        <Text style={[styles.meta, { color: colors.text }]}>
          {countWords(body)} parole • {body.length} caratteri
        </Text>

        <Text style={[styles.body, { color: colors.text }]} numberOfLines={3}>
          {body}
        </Text>
      </Pressable>
    );
  };

  // --- copia negli appunti (titolo + testo in un colpo solo) ---
  const copyStory = async () => {
    const t = String(preview?.title || '');
    const b = String(preview?.body || '');
    const full = t ? `${t}\n\n${b}` : b;
    await Clipboard.setStringAsync(full);
    Alert.alert('Copiato', 'Racconto (titolo + testo) copiato negli appunti.');
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Header */}
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Storie</Text>
      </View>

      {/* Search + Sort */}
      <View style={{ paddingHorizontal: 16, paddingBottom: 8 }}>
        <TextInput
          value={query}
          onChangeText={setQuery}
          placeholder="Cerca in titolo o testo…"
          placeholderTextColor={colors.text + '88'}
          style={[
            styles.searchInput,
            { color: colors.text, borderColor: colors.border, backgroundColor: colors.card },
          ]}
          autoCorrect={false}
          autoCapitalize="none"
          returnKeyType="search"
          clearButtonMode="while-editing"
        />

        <View style={styles.sortRow}>
          <SortChip label="Aggiornamento" active={sort.key === 'updatedAt'} onPress={() => setSortKey('updatedAt')} />
          <SortChip label="Creazione" active={sort.key === 'createdAt'} onPress={() => setSortKey('createdAt')} />
          <SortChip label="Titolo A→Z" active={sort.key === 'title'} onPress={() => setSortKey('title')} />

          <Pressable
            onPress={toggleDir}
            style={[
              styles.dirBtn,
              { borderColor: colors.border, backgroundColor: colors.secondary || 'transparent' },
            ]}
            accessibilityRole="button"
            accessibilityLabel="Inverti ordinamento"
          >
            <Text style={[styles.dirBtnText, { color: colors.text }]}>
              {sort.dir === 'asc' ? 'ASC ↑' : 'DESC ↓'}
            </Text>
          </Pressable>
        </View>
      </View>

      {/* Lista */}
      <FlatList
        data={sorted}
        keyExtractor={(it) => String(it.id)}
        renderItem={renderItem}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
        ItemSeparatorComponent={() => <View style={{ height: 10 }} />}
        refreshControl={<RefreshControl tintColor={colors.text} refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <Text style={{ color: colors.text, opacity: 0.7, textAlign: 'center', marginTop: 24 }}>
            Nessuna storia trovata.
          </Text>
        }
        keyboardShouldPersistTaps="handled"
      />

      {/* Modale di visualizzazione (read-only) */}
      <Modal visible={!!preview} transparent animationType="slide" onRequestClose={() => setPreview(null)}>
        <View style={[styles.modalWrap, { backgroundColor: colors.background + 'F2' }]}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: colors.text }]} numberOfLines={2}>
                {preview?.title || 'Senza titolo'}
              </Text>
              <Pressable onPress={() => setPreview(null)} style={[styles.closeBtn, { borderColor: colors.border }]}>
                <Text style={{ color: colors.text, fontWeight: '800' }}>✕</Text>
              </Pressable>
            </View>

            <Text style={[styles.modalDate, { color: colors.text }]}>{formatDate(preview?.createdAt)}</Text>
            <Text style={[styles.modalMeta, { color: colors.text }]}>
              {countWords(preview?.body || '')} parole • {String(preview?.body || '').length} caratteri
            </Text>

            {/* Elementi creativi di riferimento (read-only/compatto) */}
            <View style={{ marginTop: 8 }}>
              <UsedElementsPanel compact />
            </View>

            <ScrollView style={{ maxHeight: '50%' }} contentContainerStyle={{ paddingVertical: 8 }}>
              <Text style={[styles.modalBody, { color: colors.text }]}>{preview?.body || ''}</Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable onPress={copyStory} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnText, { color: colors.textOnButton || '#FFFFFF' }]}>
                  Copia racconto 📋
                </Text>
              </Pressable>
              <Pressable onPress={() => openEditor(preview)} style={[styles.modalBtn, { backgroundColor: colors.accent }]}>
                <Text style={[styles.modalBtnText, { color: colors.text }]}>Modifica ✏️</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(preview.id)}
                style={[styles.modalBtnGhost, { borderColor: colors.border }]}
              >
                <Text style={[styles.modalBtnGhostText, { color: colors.text }]}>Elimina 🗑️</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },
  title: { fontSize: ts(22), fontWeight: '800' },

  // Search + sort
  searchInput: {
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: ts(15),
  },
  sortRow: {
    marginTop: 8,
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  chipText: { fontSize: ts(12), fontWeight: '700' },
  dirBtn: {
    marginLeft: 'auto',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  dirBtnText: { fontSize: ts(12), fontWeight: '800' },

  // Card
  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  itemHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  itemTitle: { fontSize: ts(16), fontWeight: '700', flexShrink: 1, marginRight: 12 },

  actionsRow: { flexDirection: 'row', gap: 8 },
  iconBtn: { width: 32, height: 32, borderRadius: 8, alignItems: 'center', justifyContent: 'center' },

  date: { fontSize: ts(12), opacity: 0.8, marginTop: 2 },

  // Contatore
  meta: { fontSize: 12, opacity: 0.8, marginTop: 4 },

  body: { fontSize: ts(14), marginTop: 6 },

  // Modal
  modalWrap: { flex: 1, justifyContent: 'flex-end' },
  modalCard: { borderWidth: 1, borderRadius: 16, padding: 14, margin: 12 },
  modalHeader: { flexDirection: 'row', alignItems: 'center' },
  modalTitle: { flex: 1, fontSize: ts(18), fontWeight: '800', marginRight: 8 },
  closeBtn: { width: 32, height: 32, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  modalDate: { fontSize: ts(12), opacity: 0.8, marginTop: 4 },
  modalMeta: { fontSize: ts(12), opacity: 0.8, marginTop: 2 },
  modalBody: { fontSize: ts(15), lineHeight: 22, marginTop: 8 },
  modalActions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 12 },
  modalBtn: { flex: 1, alignItems: 'center', paddingVertical: 12, borderRadius: 12 },
  modalBtnText: { fontSize: ts(14), fontWeight: '800' },
  modalBtnGhost: { paddingVertical: 12, paddingHorizontal: 16, borderRadius: 12, borderWidth: 1 },
  modalBtnGhostText: { fontSize: ts(14), fontWeight: '700' },
});
