import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import {
  getAllStories,
  removeStory,
  exportStoriesToFile,
  importStoriesFromFile,
} from '../storage/stories';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as Sharing from 'expo-sharing';
import * as DocumentPicker from 'expo-document-picker';
import * as Clipboard from 'expo-clipboard';
import { Page } from '../components/Page';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function StoriesScreen({ navigation }) {
  const { colors } = useTheme();
  const [stories, setStories] = useState([]);

  // Modale di dettaglio
  const [selected, setSelected] = useState(null); // {id,title,body,createdAt,...} | null
  const [modalVisible, setModalVisible] = useState(false);

  const openDetail = (story) => { setSelected(story); setModalVisible(true); };
  const closeDetail = () => { setModalVisible(false); setSelected(null); };

  const load = useCallback(async () => {
    const list = await getAllStories();
    setStories(list);
  }, []);

  useFocusEffect(useCallback(() => { load(); }, [load]));

  async function doDelete(storyId) {
    const next = stories.filter((s) => s.id !== storyId);
    setStories(next);
    try { await removeStory(storyId); } catch {}
    if (selected && selected.id === storyId) closeDetail();
  }

  function confirmDelete(storyId) {
    Alert.alert(
      'Elimina 🗑️',
      'Vuoi davvero dire addio a questa storia? 😢',
      [
        { text: 'Annulla', style: 'cancel' },
        { text: 'Elimina', style: 'destructive', onPress: () => doDelete(storyId) },
      ]
    );
  }

  function editFromList(story) { navigation.navigate('Editor', { story }); }
  function editFromModal() { if (!selected) return; navigation.navigate('Editor', { story: selected }); closeDetail(); }

  // --- EXPORT su file + share ---
  async function handleExportFile() {
    try {
      const { uri, filename, count } = await exportStoriesToFile(true);
      if (!uri || !count) {
        Alert.alert('Nulla da esportare', 'Non ci sono storie salvate.');
        return;
      }
      const canShare = await Sharing.isAvailableAsync();
      if (canShare) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/json',
          dialogTitle: 'Esporta storie (JSON)',
          UTI: 'public.json',
        });
      } else {
        Alert.alert('File creato', `File salvato come:\n${filename}`);
      }
    } catch (e) {
      console.warn(e);
      Alert.alert('Errore', 'Impossibile esportare in questo momento.');
    }
  }

  // --- IMPORT da file ---
  async function handleImportFile() {
    try {
      const res = await DocumentPicker.getDocumentAsync({
        type: ['application/json', 'text/json', 'application/*+json'],
        multiple: false,
        copyToCacheDirectory: true,
      });

      let pickedUri = null;

      if ('canceled' in res) {
        if (res.canceled) return;
        pickedUri = res.assets?.[0]?.uri || null;
      } else {
        if (res.type === 'cancel') return;
        pickedUri = res.uri || null;
      }

      if (!pickedUri) {
        Alert.alert('Import annullato', 'Nessun file selezionato.');
        return;
      }

      const stats = await importStoriesFromFile(pickedUri);

      if (!stats || stats.error) {
        const message = stats?.error || 'Import non riuscito.';
        Alert.alert('Errore import', message);
        return;
      }

      await load();
      Alert.alert(
        'Import completato ✅',
        `Letti: ${stats.imported}\nAggiunti: ${stats.added}\nAggiornati: ${stats.updated}\nSaltati: ${stats.skipped}\nNon validi: ${stats.invalid}`
      );
    } catch (e) {
      console.warn(e);
      Alert.alert('Errore', 'Import non riuscito. Assicurati che il file sia un JSON valido.');
    }
  }

  // --- COPIA titolo+testo dal modale ---
  async function handleCopySelected() {
    if (!selected) return;
    try {
      const title = (selected.title || '').trim();
      const body = (selected.body || '').trim();
      const combined = title ? `${title}\n\n${body}` : body;
      await Clipboard.setStringAsync(combined);
      Alert.alert('Copiato 📋', 'Titolo e testo copiati negli appunti.');
    } catch (e) {
      console.warn(e);
      Alert.alert('Errore', 'Impossibile copiare al momento.');
    }
  }

  const renderItem = ({ item }) => (
    <Pressable
      onPress={() => openDetail(item)}
      style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
    >
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>

        <Pressable
          onPress={() => editFromList(item)}
          style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Modifica storia"
        >
          <Ionicons name="create" size={16} color={colors.text} />
        </Pressable>

        <Pressable
          onPress={() => confirmDelete(item.id)}
          style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Elimina storia"
        >
          <Ionicons name="trash" size={16} color={colors.text} />
        </Pressable>
      </View>
      <Text style={[styles.date, { color: colors.text }]}>{formatDate(item.createdAt)}</Text>
      <Text style={[styles.body, { color: colors.text }]} numberOfLines={2}>
        {item.body}
      </Text>
    </Pressable>
  );

  return (
    <Page>
      <View style={styles.headerRow}>
        <Text style={[styles.header, { color: colors.text }]}>Le tue storie 📚</Text>

        <View style={styles.headerActions}>
          <Pressable
            onPress={handleImportFile}
            style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Importa da file"
          >
            <Ionicons name="cloud-upload" size={16} color={colors.textOnSecondary || colors.text} />
            <Text style={[styles.actionText, { color: colors.textOnSecondary || colors.text }]}>Importa</Text>
          </Pressable>

          <Pressable
            onPress={handleExportFile}
            style={[styles.actionBtn, { backgroundColor: colors.secondary, borderColor: colors.border }]}
            accessibilityRole="button"
            accessibilityLabel="Esporta su file"
          >
            <Ionicons name="download" size={16} color={colors.textOnSecondary || colors.text} />
            <Text style={[styles.actionText, { color: colors.textOnSecondary || colors.text }]}>Esporta</Text>
          </Pressable>
        </View>
      </View>

      {stories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.empty, { color: colors.text }]}>
            Nessuna storia ancora. Salva una bozza dall'Editor 💖
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ paddingBottom: 16 }}
          ItemSeparatorComponent={() => <View style={{ height: 12 }} />}
        />
      )}

      {/* Modale di dettaglio */}
      <Modal visible={modalVisible} transparent animationType="fade" onRequestClose={closeDetail}>
        <View style={styles.modalBackdrop}>
          <View style={[styles.modalCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {selected && (
              <ScrollView contentContainerStyle={{ paddingBottom: 8 }}>
                <View style={styles.modalHeader}>
                  <Text style={[styles.modalTitle, { color: colors.text }]}>{selected.title}</Text>
                </View>
                <Text style={[styles.modalDate, { color: colors.text }]}>{formatDate(selected.createdAt)}</Text>
                <Text style={[styles.modalBody, { color: colors.text }]}>{selected.body}</Text>
              </ScrollView>
            )}

            <View style={styles.modalActions}>
              <Pressable onPress={handleCopySelected} style={[styles.btnGhost, styles.btnAction, { borderColor: colors.border }]}>
                <Text style={[styles.btnGhostText, { color: colors.text }]}>Copia titolo+testo 📋</Text>
              </Pressable>

              <Pressable onPress={editFromModal} style={[styles.btnGhost, styles.btnAction, { borderColor: colors.border }]}>
                <Text style={[styles.btnGhostText, { color: colors.text }]}>Modifica ✏️</Text>
              </Pressable>

              <Pressable onPress={() => selected && confirmDelete(selected.id)} style={[styles.btnGhost, styles.btnAction, { borderColor: colors.border }]}>
                <Text style={[styles.btnGhostText, { color: colors.text }]}>Elimina 🗑️</Text>
              </Pressable>

              <Pressable onPress={closeDetail} style={[styles.btn, styles.btnAction, { backgroundColor: colors.primary }]}>
                <Text style={[styles.btnText, { color: colors.textOnButton }]}>Chiudi</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </Page>
  );
}

const styles = StyleSheet.create({
  // header/lista
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  header: { fontSize: 22, fontWeight: '800' },
  headerActions: { flexDirection: 'row', gap: 8 },

  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, opacity: 0.8, textAlign: 'center' },

  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  date: { fontSize: 12, opacity: 0.7, marginTop: 2, marginBottom: 6 },
  body: { fontSize: 14, opacity: 0.9 },

  iconBtn: { paddingVertical: 6, paddingHorizontal: 8, borderRadius: 10 },

  // modale
  modalBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', padding: 16, justifyContent: 'center' },
  modalCard: { borderWidth: 1, borderRadius: 18, padding: 14, maxHeight: '80%', width: '100%', alignSelf: 'center' },
  modalHeader: { marginBottom: 6 },
  modalTitle: { fontSize: 18, fontWeight: '800' },
  modalDate: { fontSize: 12, opacity: 0.7, marginBottom: 10 },
  modalBody: { fontSize: 15, lineHeight: 22 },

  // azioni nel modale
  modalActions: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'flex-end', marginTop: 12 },
  btnAction: { marginLeft: 8, marginTop: 8 },

  // bottoni
  btn: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12 },
  btnText: { fontSize: 16, fontWeight: '700' },
  btnGhost: { alignItems: 'center', justifyContent: 'center', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, borderWidth: 1 },
  btnGhostText: { fontSize: 16, fontWeight: '600' },
});
