import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { addStory, updateStory } from '../storage/stories';
import { useNavigation, useRoute } from '@react-navigation/native';
import { PageScroll } from '../components/Page';

export default function EditorScreen() {
  const { mode, colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const editingStory = route.params?.story ?? null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  useEffect(() => {
    if (editingStory) {
      setTitle(editingStory.title || '');
      setBody(editingStory.body || '');
    }
  }, [editingStory?.id]);

  const placeholder = mode === 'dark' ? '#B0C4DE' : '#94A3B8';

  async function handleSave() {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      Alert.alert('Ops', 'Aggiungi almeno titolo e testo prima di salvare.');
      return;
    }
    try {
      if (editingStory) {
        await updateStory(editingStory.id, { title: t, body: b });
        Alert.alert('Aggiornata ✨', 'La tua storia è stata aggiornata.');
      } else {
        await addStory({ title: t, body: b });
        Alert.alert('Salvata! 💖', 'La tua storia è stata salvata in locale.');
      }
      setTitle('');
      setBody('');
      navigation.setParams({ story: undefined });
    } catch (e) {
      console.warn(e);
      Alert.alert('Errore', 'Operazione non riuscita. Riprova.');
    }
  }

  function handleNew() {
    if (!title && !body && !editingStory) return;
    setTitle('');
    setBody('');
    navigation.setParams({ story: undefined });
  }

  return (
    <PageScroll>
      <View style={styles.headerRow}>
        <Text style={[styles.title, { color: colors.text }]}>Editor</Text>
        {editingStory ? (
          <View style={[styles.badge, { backgroundColor: colors.accent2 || colors.accent }]}>
            <Text style={[styles.badgeText, { color: colors.text }]}>Modifica ✏️</Text>
          </View>
        ) : null}
      </View>

      <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Text style={[styles.label, { color: colors.text }]}>Titolo</Text>
        <TextInput
          value={title}
          onChangeText={setTitle}
          placeholder="Inserisci il titolo"
          placeholderTextColor={placeholder}
          style={[styles.input, { color: colors.text }]}
          returnKeyType="next"
        />

        <Text style={[styles.label, { color: colors.text, marginTop: 16 }]}>Testo</Text>
        <TextInput
          value={body}
          onChangeText={setBody}
          placeholder="Scrivi qui la tua storia…"
          placeholderTextColor={placeholder}
          style={[styles.textarea, { color: colors.text }]}
          multiline
          textAlignVertical="top"
        />
      </View>

      <View style={styles.actions}>
        <Pressable onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}>
          <Text style={[styles.btnText, { color: colors.textOnButton }]}>
            {editingStory ? 'Aggiorna ✨' : 'Salva 💖'}
          </Text>
        </Pressable>

        <Pressable onPress={handleNew} style={[styles.btnGhost, { borderColor: colors.border }]}>
          <Text style={[styles.btnGhostText, { color: colors.text }]}>
            {editingStory ? 'Annulla modifica' : 'Nuova bozza 🌸'}
          </Text>
        </Pressable>
      </View>
    </PageScroll>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: 22, fontWeight: '800' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: 12, fontWeight: '700' },

  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  label: { fontSize: 13, opacity: 0.9, marginBottom: 6 },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
  },
  textarea: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 200,
    fontSize: 16,
  },

  actions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 12 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: 16, fontWeight: '700' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  btnGhostText: { fontSize: 16, fontWeight: '600' },
});
