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
  Platform,
} from 'react-native';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { useTheme } from '../theme/ThemeContext';
import {
  getAllStories,
  removeStory,
  addStory, // per fallback import
} from '../storage/stories';
import UsedElementsPanel from '../components/UsedElements';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system';
import * as DocumentPicker from 'expo-document-picker';
import * as Sharing from 'expo-sharing';

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
          backgroundColor: active ? (colors.accent2 || '#ddd') : 'transparent',
          borderColor: colors.border,
        },
      ]}
    >
      <Text style={[styles.chipText, { color: active ? '#FFFFFF' : colors.text }]}>{label}</Text>
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
              style={[styles.iconBtn, { backgroundColor: colors.primary }]}
              accessibilityRole="button"
              accessibilityLabel="Modifica storia"
            >
              <Text style={{ color: colors.textOnButton || '#FFFFFF', fontWeight: '800' }}>✏️</Text>
            </Pressable>
            <Pressable
              onPress={() => confirmDelete(item.id)}
              style={[styles.iconBtn, { backgroundColor: colors.accent }]}
              accessibilityRole="button"
              accessibilityLabel="Elimina storia"
            >
              <Text style={{ color: colors.textOnButton || '#FFFFFF', fontWeight: '800' }}>🗑️</Text>
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

  // Copia (titolo + testo) dalla modale
  const copyStory = async () => {
    const t = String(preview?.title || '');
    const b = String(preview?.body || '');
    const full = t ? `${t}\n\n${b}` : b;
    await Clipboard.setStringAsync(full);
    Alert.alert('Copiato', 'Racconto (titolo + testo) copiato negli appunti.');
  };

  // ===== Export su FILE (JSON) =====
  const doExportToFile = async () => {
    try {
      const list = await getAllStories();
      const json = JSON.stringify(list || [], null, 2);

      const date = new Date();
      const stamp = date.toISOString().replace(/[:.]/g, '-');
      const filename = `storie-export-${stamp}.json`;

      const dir = FileSystem.cacheDirectory || FileSystem.documentDirectory;
      const fileUri = (dir.endsWith('/') ? dir : dir + '/') + filename;

      await FileSystem.writeAsStringAsync(fileUri, json, { encoding: FileSystem.EncodingType.UTF8 });

      if (Platform.OS !== 'web' && (await Sharing.isAvailableAsync())) {
        await Sharing.shareAsync(fileUri, { mimeType: 'application/json', dialogTitle: 'Esporta storie' });
      } else {
        Alert.alert('Esportato', `File creato: ${fileUri}`);
      }
    } catch {
      Alert.alert('Errore export', 'Impossibile esportare le storie.');
    }
  };

  // ===== Import da FILE (JSON) =====
  const doImportFromFile = async () => {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'text/plain'],
        multiple: false,
        copyToCacheDirectory: true,
      });
      if (!res || res.canceled) return;

      const asset = res.assets?.[0];
      const uri = asset?.uri;
      if (!uri) { Alert.alert('Errore import', 'File non valido.'); return; }

      const raw = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.UTF8 });
      const parsed = JSON.parse(raw);

      if (!Array.isArray(parsed)) throw new Error('Formato JSON non valido (atteso un array).');
      let added = 0;
      for (const it of parsed) {
        const title = String(it?.title || '').trim();
        const body = String(it?.body || '').trim();
        if (title || body) { await addStory({ title, body }); added += 1; }
      }
      await load();
      Alert.alert('Import riuscito', added ? `Importate ${added} storie.` : 'Nessuna storia valida trovata nel file.');
    } catch {
      Alert.alert('Errore import', 'Controlla che il file JSON sia valido.');
    }
  };

  return (
    <View style={{ flex: 1, backgroundColor: colors.background }}>
      {/* Top tools (solo pulsanti a destra, niente titolo “Storie”) */}
      <View style={styles.topToolsRow}>
        <View style={{ flex: 1 }} />
        <View style={{ flexDirection: 'row', gap: 8 }}>
          <Pressable
            onPress={doImportFromFile}
            style={[styles.toolsBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            accessibilityRole="button"
            accessibilityLabel="Importa da file"
          >
            <Text style={[styles.toolsBtnText, { color: colors.text }]}>📥</Text>
          </Pressable>
          <Pressable
            onPress={doExportToFile}
            style={[styles.toolsBtn, { borderColor: colors.border, backgroundColor: colors.card }]}
            accessibilityRole="button"
            accessibilityLabel="Esporta su file"
          >
            <Text style={[styles.toolsBtnText, { color: colors.text }]}>📤</Text>
          </Pressable>
        </View>
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

      {/* Modale di visualizzazione */}
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
                  Copia 📋
                </Text>
              </Pressable>
              <Pressable onPress={() => openEditor(preview)} style={[styles.modalBtn, { backgroundColor: colors.primary }]}>
                <Text style={[styles.modalBtnText, { color: colors.textOnButton || '#FFFFFF' }]}>Modifica ✏️</Text>
              </Pressable>
              <Pressable
                onPress={() => confirmDelete(preview.id)}
                style={[styles.modalBtnGhost, { backgroundColor: colors.accent, borderColor: colors.accent }]}
              >
                <Text style={[styles.modalBtnGhostText, { color: colors.textOnButton || '#FFFFFF' }]}>Elimina 🗑️</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  topToolsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 4,
  },

  toolsBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 4, paddingHorizontal: 10 },
  toolsBtnText: { fontSize: ts(18), fontWeight: '800' },

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
  modalBtn: { 
    flex: 1, 
    alignItems: 'center', 
    paddingVertical: 12, 
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnText: { fontSize: ts(14), fontWeight: '800' },
  modalBtnGhost: { 
    paddingVertical: 12, 
    paddingHorizontal: 16, 
    borderRadius: 12, 
    borderWidth: 1,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  modalBtnGhostText: { fontSize: ts(14), fontWeight: '700' },
});
