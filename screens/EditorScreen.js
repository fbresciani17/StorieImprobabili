import React, { useEffect, useState, useRef } from 'react';
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
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import { PageScroll } from '../components/Page';
import { ts } from '../theme/typography';

export default function EditorScreen() {
  const { mode, colors } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const editingStory = route.params?.story ?? null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');

  // Snapshot per determinare le modifiche non salvate
  const initialRef = useRef({ title: '', body: '' });

  // Flag: pulire i campi al prossimo focus dell’Editor?
  const clearOnNextFocusRef = useRef(false);

  // Carica eventuale storia da modificare e azzera "dirty"
  useEffect(() => {
    const ti = editingStory?.title ?? '';
    const bo = editingStory?.body ?? '';
    setTitle(ti);
    setBody(bo);
    initialRef.current = { title: ti, body: bo };
  }, [editingStory?.id]);

  const placeholder = mode === 'dark' ? '#B0C4DE' : '#94A3B8';

  // "dirty" = differente dallo snapshot
  const dirty = title !== initialRef.current.title || body !== initialRef.current.body;

  // Salvataggio
  async function saveNow({ silent = false } = {}) {
    const t = title.trim();
    const b = body.trim();
    if (!t || !b) {
      if (!silent) Alert.alert('Ops', 'Aggiungi almeno titolo e testo prima di salvare.');
      return false;
    }
    try {
      if (editingStory) {
        await updateStory(editingStory.id, { title: t, body: b });
        if (!silent) Alert.alert('Aggiornata ✨', 'La tua storia è stata aggiornata.');
      } else {
        await addStory({ title: t, body: b });
        if (!silent) Alert.alert('Salvata! 💖', 'La tua storia è stata salvata in locale.');
      }
      // Aggiorno lo snapshot per non risultare più dirty
      initialRef.current = { title: t, body: b };
      return true;
    } catch (e) {
      console.warn(e);
      if (!silent) Alert.alert('Errore', 'Operazione non riuscita. Riprova.');
      else Alert.alert('Errore', 'Salvataggio non riuscito.');
      return false;
    }
  }

  async function handleSave() {
    const ok = await saveNow({ silent: false });
    if (ok) {
      // dopo salvataggio manuale restiamo su editor, non puliamo subito
    }
  }

  function handleNew() {
    if (!dirty) {
      setTitle('');
      setBody('');
      navigation.setParams({ story: undefined });
      initialRef.current = { title: '', body: '' };
      return;
    }
    Alert.alert(
      'Nuova bozza 🌸',
      'Ci sono modifiche non salvate. Vuoi salvarle prima di creare una nuova bozza?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Esci senza salvare',
          style: 'destructive',
          onPress: () => {
            setTitle('');
            setBody('');
            navigation.setParams({ story: undefined });
            initialRef.current = { title: '', body: '' };
          },
        },
        {
          text: 'Salva e continua',
          onPress: async () => {
            const ok = await saveNow({ silent: true });
            if (ok) {
              setTitle('');
              setBody('');
              navigation.setParams({ story: undefined });
              initialRef.current = { title: '', body: '' };
            }
          },
        },
      ]
    );
  }

  // Alert quando lasci l'Editor (cambio tab/blur)
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      if (!dirty) return;
      const parent = navigation.getParent?.();

      Alert.alert(
        'Uscire senza salvare?',
        'Hai modifiche non salvate. Vuoi salvarle prima di uscire?',
        [
          {
            text: 'Torna all’Editor',
            style: 'cancel',
            onPress: () => {
              // Non pulire al prossimo focus: stai rientrando per continuare
              clearOnNextFocusRef.current = false;
              parent?.navigate('Editor');
            },
          },
          {
            text: 'Esci senza salvare',
            style: 'destructive',
            onPress: () => {
              // Pulire i campi quando si tornerà all’Editor
              clearOnNextFocusRef.current = true;
            },
          },
          {
            text: 'Salva e continua',
            onPress: async () => {
              const ok = await saveNow({ silent: true });
              // In ogni caso, al ritorno vogliamo un Editor vuoto
              clearOnNextFocusRef.current = true;
            },
          },
        ]
      );
    });

    return unsub;
  }, [navigation, dirty, title, body]);

  // Quando l'Editor torna in focus, pulisci se richiesto e se non stai aprendo per modificare una storia
  useFocusEffect(
    React.useCallback(() => {
      if (clearOnNextFocusRef.current && !route.params?.story) {
        setTitle('');
        setBody('');
        navigation.setParams({ story: undefined });
        initialRef.current = { title: '', body: '' };
        clearOnNextFocusRef.current = false;
      }
      return () => {};
    }, [route.params?.story])
  );

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
  title: { fontSize: ts(22), fontWeight: '800' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: ts(12), fontWeight: '700' },

  card: { borderWidth: 1, borderRadius: 16, padding: 12 },
  label: { fontSize: ts(13), opacity: 0.9, marginBottom: 6 },
  input: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: ts(16),
  },
  textarea: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 200,
    fontSize: ts(16),
  },

  actions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 12 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: ts(16), fontWeight: '700' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  btnGhostText: { fontSize: ts(16), fontWeight: '600' },
});
