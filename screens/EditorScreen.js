// screens/EditorScreen.js
import React, { useEffect, useRef, useState } from 'react';
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
  BackHandler,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { addStory, updateStory, getAllStories } from '../storage/stories';
import { useNavigation, useRoute, useFocusEffect } from '@react-navigation/native';
import UsedElementsPanel from '../components/UsedElements';

/* =========================
   Helper: conteggio parole
   ========================= */
function countWords(s) {
  if (!s) return 0;
  const m = String(s).trim().match(/\S+/g);
  return m ? m.length : 0;
}
const ts = (n) => n;

/* =========================
   Hook: altezza tastiera
   ========================= */
function useKeyboardHeight() {
  const [kh, setKh] = useState(0);
  useEffect(() => {
    const show = Keyboard.addListener(
      Platform.OS === 'android' ? 'keyboardDidShow' : 'keyboardWillShow',
      (e) => setKh(e?.endCoordinates?.height ?? 0)
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

  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [bodyFocused, setBodyFocused] = useState(false);

  const initialRef = useRef({ title: '', body: '' });
  const scrollRef = useRef(null);
  const bodyBlockYRef = useRef(0);
  const keyboardHeight = useKeyboardHeight();

  const editingStory = route?.params?.story ?? null;

  // Pulizia params in uscita
  useEffect(() => {
    const unsub = navigation.addListener('blur', () => {
      navigation.setParams({ story: undefined });
    });
    return unsub;
  }, [navigation]);

  // Reset quando entri senza story
  useFocusEffect(
    React.useCallback(() => {
      if (!route?.params?.story) {
        setTitle('');
        setBody('');
        initialRef.current = { title: '', body: '' };
        navigation.setParams({ story: undefined });
      }
      return () => {};
    }, [navigation, route?.params?.story])
  );

  // Carica dati quando modifichi
  useEffect(() => {
    if (editingStory) {
      const ti = editingStory.title ?? '';
      const bo = editingStory.body ?? '';
      setTitle(ti);
      setBody(bo);
      initialRef.current = { title: ti, body: bo };
    }
  }, [editingStory?.id]);

  // Reattach ID se manca
  useEffect(() => {
    let cancelled = false;
    async function reattachIdIfMissing() {
      if (!editingStory || editingStory.id) return;
      const t = (editingStory.title || '').trim();
      const b = (editingStory.body || '').trim();
      if (!t && !b) return;
      try {
        const all = await getAllStories();
        const found = all.find((s) => String(s.title || '') === t && String(s.body || '') === b);
        if (found && !cancelled) navigation.setParams({ story: found });
      } catch {}
    }
    reattachIdIfMissing();
    return () => { cancelled = true; };
  }, [editingStory?.title, editingStory?.body, navigation]);

  const placeholder = mode === 'dark' ? '#B0C4DE' : '#94A3B8';
  const dirty = title !== initialRef.current.title || body !== initialRef.current.body;
  const iosOffset = 0;

  function scrollToBodySoft() {
    const y = Math.max(0, bodyBlockYRef.current - 12);
    setTimeout(() => { scrollRef.current?.scrollTo?.({ y, animated: true }); }, Platform.OS === 'ios' ? 80 : 120);
  }
  function handleBodyContentSizeChange() {
    if (!bodyFocused) return;
    setTimeout(() => { scrollRef.current?.scrollTo?.({ y: Math.max(0, bodyBlockYRef.current - 12), animated: true }); }, 50);
  }

  async function saveNow({ silent = false } = {}) {
    const t = String(title || '').trim();
    const b = String(body || '').trim();
    if (!t && !b) {
      if (!silent) Alert.alert('Nulla da salvare', 'Aggiungi almeno titolo o testo.');
      return false;
    }
    try {
      if (editingStory?.id) {
        const item = await updateStory({ id: editingStory.id, title: t, body: b });
        if (item) {
          if (!silent) Alert.alert('Salvato ✨', 'Storia aggiornata con successo.');
          initialRef.current = { title: t, body: b };
          navigation.setParams({ story: { ...editingStory, title: t, body: b } });
        }
        return !!item;
      } else {
        const created = await addStory({ title: t, body: b });
        if (!silent) Alert.alert('Salvato 💖', 'Storia salvata con successo.');
        setTitle(''); setBody('');
        initialRef.current = { title: '', body: '' };
        navigation.setParams({ story: undefined });
        return !!created;
      }
    } catch {
      if (!silent) Alert.alert('Errore', 'Operazione non riuscita. Riprova.');
      return false;
    }
  }

  async function handleSave() { await saveNow({ silent: false }); }

  function handleNew() {
    if (!dirty) {
      setTitle(''); setBody('');
      initialRef.current = { title: '', body: '' };
      navigation.setParams({ story: undefined });
      return;
    }
    Alert.alert(
      'Nuova bozza 🌸',
      'Hai modifiche non salvate. Vuoi conservarle prima di creare una nuova bozza?',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Salva e continua',
          onPress: () =>
            saveNow({ silent: true }).then(() => {
              setTitle(''); setBody('');
              initialRef.current = { title: '', body: '' };
              navigation.setParams({ story: undefined });
            }),
        },
      ]
    );
  }

  // ====== Intercetta back: beforeRemove + hardwareBackPress ======
  const showingAlertRef = useRef(false);
  useFocusEffect(
    React.useCallback(() => {
      const askBeforeLeave = (proceed) => {
        if (!dirty) { proceed(); return; }
        if (showingAlertRef.current) return;
        showingAlertRef.current = true;

        Alert.alert(
          'Uscire senza salvare?',
          'Hai modifiche non salvate.',
          [
            { text: 'Annulla', style: 'cancel', onPress: () => { showingAlertRef.current = false; } },
            {
              text: 'Esci senza salvare',
              style: 'destructive',
              onPress: () => { showingAlertRef.current = false; proceed(); },
            },
            {
              text: 'Salva e esci',
              onPress: async () => {
                await saveNow({ silent: true });
                showingAlertRef.current = false;
                proceed();
              },
            },
          ]
        );
      };

      const unsubBeforeRemove = navigation.addListener('beforeRemove', (e) => {
        if (!dirty) return;
        e.preventDefault();
        askBeforeLeave(() => navigation.dispatch(e.data.action));
      });

      const onHardwareBack = () => {
        if (!dirty) return false;
        askBeforeLeave(() => navigation.goBack());
        return true;
      };
      const backSub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);

      return () => { unsubBeforeRemove(); backSub.remove(); };
    }, [navigation, dirty, title, body])
  );

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

        {/* Piccolo badge “Modifica” (senza titolo ridondante) */}
        {editingStory ? (
          <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <View style={[styles.badge, { backgroundColor: colors.accent2 || colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>Modifica ✏️</Text>
            </View>
          </View>
        ) : null}

        {/* Elementi creativi di riferimento */}
        <UsedElementsPanel watchFocus compact />

        {/* Titolo */}
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

        {/* Testo */}
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

          {/* Contatore parole/caratteri */}
          <View style={[styles.counterBar, { borderColor: colors.border, backgroundColor: colors.secondary || 'transparent' }]}>
            <Text style={[styles.counterText, { color: colors.text }]}>
              {countWords(body)} parole • {body.length} caratteri
            </Text>
          </View>
        </View>

        {/* Azioni */}
        <View style={styles.actions}>
          <Pressable onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.btnText, { color: colors.textOnButton || '#FFFFFF' }]}>
              {editingStory ? 'Aggiorna ✨' : 'Salva 💖'}
            </Text>
          </Pressable>

          <Pressable onPress={handleNew} style={[styles.btnGhost, { borderColor: colors.border }]}>
            <Text style={[styles.btnGhostText, { color: colors.text }]}>Nuova bozza ➕</Text>
          </Pressable>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
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

  // Contatore
  counterBar: { marginTop: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  counterText: { fontSize: ts(12), opacity: 0.8, textAlign: 'right' },

  actions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', marginTop: 4 },
  btn: { flex: 1, alignItems: 'center', paddingVertical: 14, borderRadius: 14 },
  btnText: { fontSize: ts(16), fontWeight: '700' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1 },
  btnGhostText: { fontSize: ts(16), fontWeight: '600' },
});
