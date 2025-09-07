import React, { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Pressable,
  Alert,
  Platform,
  Keyboard,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { addStory, updateStory, removeStory, getAllStories } from '../storage/stories';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import UsedElementsPanel from '../components/UsedElements';

const ts = (n) => n;

/** Hook: altezza tastiera */
function useKeyboardHeight() {
  const [kh, setKh] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      (e) => setKh((e && e.endCoordinates && e.endCoordinates.height) ? e.endCoordinates.height : 0)
    );
    const hide = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidHide' : 'keyboardWillHide',
      () => setKh(0)
    );
    return () => { show.remove(); hide.remove(); };
  }, []);
  return kh;
}

export default function EditorScreen() {
  const { colors, mode } = useTheme();
  const navigation = useNavigation();
  const route = useRoute();

  const editingStory = (route.params && route.params.story) ? route.params.story : null;

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [bodyFocused, setBodyFocused] = useState(false);

  const initialRef = useRef({ title: '', body: '' });
  const clearOnNextFocusRef = useRef(false);

  const keyboardHeight = useKeyboardHeight();
  const scrollRef = useRef(null);
  const bodyBlockYRef = useRef(0);

  // --- NUOVO: se si entra in modifica ma la storia non ha id (legacy), prova a ri-associare l'id ---
  useEffect(() => {
    let cancelled = false;
    async function reattachIdIfMissing() {
      if (!editingStory) return;
      if (editingStory.id) return; // già ok
      const t = (editingStory.title || '').trim();
      const b = (editingStory.body || '').trim();
      if (!t && !b) return;

      try {
        const all = await getAllStories();
        // trova la prima storia con stesso titolo e testo
        const found = all.find(s => String(s.title || '') === t && String(s.body || '') === b);
        if (found && !cancelled) {
          // aggiorna i params dell'Editor con la storia che ha id
          navigation.setParams({ story: found });
        }
      } catch (e) {
        // silenzioso: in caso di errore lascio com'è, ma l'update farà comunque fallback sicuro
        console.warn('ReattachId error:', e);
      }
    }
    reattachIdIfMissing();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [editingStory && editingStory.title, editingStory && editingStory.body]);

  // Carica eventuale storia in modifica (o reset per nuova)
  useEffect(() => {
    const ti = editingStory && editingStory.title ? editingStory.title : '';
    const bo = editingStory && editingStory.body ? editingStory.body : '';
    setTitle(ti);
    setBody(bo);
    initialRef.current = { title: ti, body: bo };
  }, [editingStory && editingStory.id]);

  const placeholder = mode === 'dark' ? '#B0C4DE' : '#94A3B8';
  const dirty = title !== initialRef.current.title || body !== initialRef.current.body;

  // RESET AUTOMATICO: quando l'Editor torna in focus e NON stai modificando, azzera i campi
  useFocusEffect(
    React.useCallback(() => {
      if (!(route.params && route.params.story)) {
        setTitle('');
        setBody('');
        initialRef.current = { title: '', body: '' };
      }
      return () => {};
    }, [route.params && route.params.story])
  );

  // Salvataggio robusto: update → fallback rimuovendo la vecchia e salvando nuova (no duplicati)
  async function saveNow({ silent = false } = {}) {
    const t = String(title || '').trim();
    const b = String(body  || '').trim();
    if (!t || !b) {
      if (!silent) Alert.alert('Ops', 'Aggiungi almeno titolo e testo prima di salvare.');
      return false;
    }

    const isEditing = !!editingStory;
    const hasId = !!(editingStory && editingStory.id);

    try {
      if (isEditing && hasId) {
        const payload = { ...editingStory, title: t, body: b };
        await updateStory(payload);
        if (!silent) Alert.alert('Aggiornata ✨', 'La storia è stata aggiornata.');
      } else if (isEditing && !hasId) {
        // dopo reattachIdIfMissing è raro arrivare qui, ma gestiamo lo stesso
        await addStory({ title: t, body: b });
        if (!silent) Alert.alert('Salvata come nuova', 'La storia originale non aveva un id valido, ne ho creata una nuova.');
      } else {
        await addStory({ title: t, body: b });
        if (!silent) Alert.alert('Salvata! 💖', 'La tua storia è stata salvata in locale.');
      }

      initialRef.current = { title: t, body: b };
      return true;

    } catch (e) {
      if (isEditing && hasId) {
        try { await removeStory(editingStory.id); } catch {}
      }
      try {
        await addStory({ title: t, body: b });
        if (!silent) {
          Alert.alert(
            'Aggiornamento non riuscito',
            'Ho salvato il contenuto come nuova storia e rimosso la versione precedente.'
          );
        }
        initialRef.current = { title: t, body: b };
        return true;
      } catch (e2) {
        if (!silent) Alert.alert('Errore', 'Operazione non riuscita. Riprova.');
        return false;
      }
    }
  }

  async function handleSave() {
    const ok = await saveNow({ silent: false });
    if (ok) { /* opzionale: navigation.setParams({ story: undefined }); */ }
  }

  function handleNew() {
    if (!dirty) {
      setTitle(''); setBody('');
      navigation.setParams({ story: undefined });
      initialRef.current = { title: '', body: '' };
      return;
    }
    Alert.alert(
      'Nuova bozza 🌸',
      'Hai modifiche non salvate. Vuoi conservarle prima di creare una nuova bozza?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Non salvare', style: 'destructive',
          onPress: () => {
            setTitle(''); setBody('');
            navigation.setParams({ story: undefined });
            initialRef.current = { title: '', body: '' };
          },
        },
        {
          text: 'Salva e continua',
          onPress: async () => {
            const ok = await saveNow({ silent: true });
            if (ok) {
              setTitle(''); setBody('');
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
      const parent = navigation.getParent && navigation.getParent();
      Alert.alert(
        'Uscire senza salvare?',
        'Hai modifiche non salvate. Vuoi salvarle prima di uscire?',
        [
          {
            text: 'Torna all’Editor',
            style: 'cancel',
            onPress: () => { try { parent && parent.navigate && parent.navigate('Editor'); } catch {} },
          },
          {
            text: 'Esci senza salvare',
            style: 'destructive',
            onPress: () => { clearOnNextFocusRef.current = true; },
          },
          {
            text: 'Salva e esci',
            onPress: async () => {
              const ok = await saveNow({ silent: true });
              if (ok) clearOnNextFocusRef.current = false;
            },
          },
        ]
      );
    });
    return unsub;
  }, [dirty, navigation, title, body, editingStory && editingStory.id]);

  // Pulizia campi se scelto "Esci senza salvare"
  useFocusEffect(
    React.useCallback(() => {
      if (clearOnNextFocusRef.current && !(route.params && route.params.story)) {
        setTitle(''); setBody('');
        navigation.setParams({ story: undefined });
        initialRef.current = { title: '', body: '' };
        clearOnNextFocusRef.current = false;
      }
      return () => {};
    }, [navigation, route.params && route.params.story])
  );

  const iosOffset = 0;

  function scrollToBodySoft() {
    const y = Math.max(0, bodyBlockYRef.current - 12);
    setTimeout(() => {
      if (scrollRef.current && scrollRef.current.scrollTo) {
        scrollRef.current.scrollTo({ y, animated: true });
      }
    }, Platform.OS === 'ios' ? 80 : 120);
  }

  function handleBodyContentSizeChange() {
    if (!bodyFocused) return;
    setTimeout(() => {
      if (scrollRef.current && scrollRef.current.scrollTo) {
        scrollRef.current.scrollTo({ y: Math.max(0, bodyBlockYRef.current - 12), animated: true });
      }
    }, 50);
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? iosOffset : 0}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: (keyboardHeight || 0) + 24 }}
        style={{ flex: 1, backgroundColor: colors.background }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
      >
        <View style={styles.headerRow}>
          <Text style={[styles.title, { color: colors.text }]}>Editor</Text>
          {editingStory ? (
            <View style={[styles.badge, { backgroundColor: colors.accent2 || colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>Modifica ✏️</Text>
            </View>
          ) : null}
        </View>

        <UsedElementsPanel
          watchFocus
          compact
          collapsible
          defaultCollapsed
          maxHeight={120}
          title="Elementi usati"
        />

        {/* TITOLO */}
        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Titolo</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Inserisci il titolo"
            placeholderTextColor={placeholder}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            autoCorrect={false}
            autoCapitalize="sentences"
            returnKeyType="next"
            blurOnSubmit={false}
          />
        </View>

        {/* TESTO */}
        <View
          onLayout={(e) => { bodyBlockYRef.current = e.nativeEvent.layout.y; }}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.label, { color: colors.text }]}>Testo</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Scrivi qui la tua storia"
            placeholderTextColor={placeholder}
            multiline
            scrollEnabled
            textAlignVertical="top"
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            onFocus={() => { setBodyFocused(true); scrollToBodySoft(); }}
            onBlur={() => setBodyFocused(false)}
            onContentSizeChange={handleBodyContentSizeChange}
          />
        </View>

        {/* Bottoni */}
        <View style={styles.actions}>
          <Pressable onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.btnText, { color: colors.textOnButton || '#FFFFFF' }]}>
              {editingStory ? 'Aggiorna ✨' : 'Salva 💖'}
            </Text>
          </Pressable>

          <Pressable onPress={handleNew} style={[styles.btnGhost, { borderColor: colors.border }]}>
            <Text style={[styles.btnGhostText, { color: colors.text }]}>
              {editingStory ? 'Annulla modifica' : 'Nuova bozza 🌸'}
            </Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  headerRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  title: { fontSize: ts(22), fontWeight: '800' },
  badge: { paddingVertical: 4, paddingHorizontal: 10, borderRadius: 999 },
  badgeText: { fontSize: ts(12), fontWeight: '700' },

  card: { borderWidth: 1, borderRadius: 16, padding: 12, marginBottom: 12 },
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
  textArea: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'transparent',
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 200,
    fontSize: ts(16),
  },

  actions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 4 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: ts(16), fontWeight: '700' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  btnGhostText: { fontSize: ts(16), fontWeight: '600' },
});
