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
import AnimatedButton from '../components/AnimatedButton';

function countWords(s) {
  if (!s) return 0;
  const m = String(s).trim().match(/\S+/g);
  return m ? m.length : 0;
}
const ts = (n) => n;

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

  // Reattach ID se manca (casi particolari)
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

  // Espone "unsaved" ai params, così App.js lo vede
  useEffect(() => {
    navigation.setParams({ unsaved: dirty });
  }, [navigation, dirty]);

  function scrollToBodySoft() {
    const y = Math.max(0, bodyBlockYRef.current - 12);
    setTimeout(() => { scrollRef.current?.scrollTo?.({ y, animated: true }); }, Platform.OS === 'ios' ? 80 : 120);
  }
  function handleBodyContentSizeChange() {
    if (!bodyFocused) return;
    setTimeout(() => { scrollRef.current?.scrollTo?.({ y: Math.max(0, bodyBlockYRef.current - 12), animated: true }); }, 50);
  }

  // Salvataggio esplicito
  async function saveNow({ silent = false, keepFieldsOnCreate = false } = {}) {
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
        if (silent && keepFieldsOnCreate) {
          initialRef.current = { title: t, body: b };
          if (created?.id) navigation.setParams({ story: created });
        } else {
          setTitle(''); setBody('');
          initialRef.current = { title: '', body: '' };
          navigation.setParams({ story: undefined });
        }
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
            saveNow({ silent: true, keepFieldsOnCreate: true }).then(() => {
              setTitle(''); setBody('');
              initialRef.current = { title: '', body: '' };
              navigation.setParams({ story: undefined });
            }),
        },
      ]
    );
  }

  // Back hardware: alert + "Salva e esci"
  useFocusEffect(
    React.useCallback(() => {
      const onHardwareBack = () => {
        if (!dirty) return false;
        Alert.alert(
          'Ricorda di salvare',
          'Hai modifiche non salvate. Vuoi uscire lo stesso?',
          [
            { text: "Resta nell'editor", style: 'cancel' },
            {
              text: 'Salva e esci',
              onPress: () => {
                saveNow({ silent: true }).then(() => navigation.goBack());
              },
            },
            { text: 'Esci senza salvare', style: 'destructive', onPress: () => navigation.goBack() },
          ]
        );
        return true;
      };
      const sub = BackHandler.addEventListener('hardwareBackPress', onHardwareBack);
      return () => sub.remove();
    }, [dirty, title, body, navigation, editingStory?.id])
  );

  // Blocca uscita con navigate/pop (stack)
  useEffect(() => {
    const sub = navigation.addListener('beforeRemove', (e) => {
      if (!dirty) return;
      e.preventDefault();
      Alert.alert(
        'Ricorda di salvare',
        'Hai modifiche non salvate. Vuoi uscire lo stesso?',
        [
          { text: "Resta nell'editor", style: 'cancel' },
          {
            text: 'Salva e esci',
            onPress: () => {
              saveNow({ silent: true }).then(() => navigation.dispatch(e.data.action));
            },
          },
          { text: 'Esci senza salvare', style: 'destructive', onPress: () => navigation.dispatch(e.data.action) },
        ]
      );
    });
    return sub;
  }, [navigation, dirty, title, body, editingStory?.id]);

  // ✅ Trigger "Salva e vai" inviato dal TabNavigator in App.js
  useEffect(() => {
    const targetTab = route?.params?.__saveThenGoTo;
    const nonce = route?.params?.__nonce;
    if (!targetTab || !nonce) return;

    // pulisci subito il nonce per evitare doppie esecuzioni
    navigation.setParams({ __nonce: undefined });

    // salva e poi vai al tab richiesto
    (async () => {
      await saveNow({ silent: true });
      const tabNav = navigation.getParent?.('MainTabs') || navigation.getParent?.();
      if (tabNav && targetTab) {
        tabNav.navigate(targetTab);
      }
      // pulisci il flag
      navigation.setParams({ __saveThenGoTo: undefined });
    })();
  }, [route?.params?.__nonce]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView
        ref={scrollRef}
        contentContainerStyle={{ padding: 16, paddingBottom: (keyboardHeight || 0) + 24 }}
        style={{ flex: 1, backgroundColor: colors.background }}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === 'ios' ? 'interactive' : 'on-drag'}
        automaticallyAdjustKeyboardInsets
      >
        {editingStory ? (
          <View style={{ alignItems: 'flex-end', marginBottom: 8 }}>
            <View style={[styles.badge, { backgroundColor: colors.accent2 || colors.accent }]}>
              <Text style={[styles.badgeText, { color: colors.text }]}>Modifica ✏️</Text>
            </View>
          </View>
        ) : null}

        <UsedElementsPanel watchFocus compact />

        <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Text style={[styles.label, { color: colors.text }]}>Titolo</Text>
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Inserisci il titolo"
            placeholderTextColor={mode === 'dark' ? '#B0C4DE' : '#94A3B8'}
            style={[styles.input, { color: colors.text, borderColor: colors.border }]}
            autoCorrect={false}
            autoCapitalize="sentences"
            returnKeyType="next"
            blurOnSubmit={false}
          />
        </View>

        <View
          onLayout={(e) => { bodyBlockYRef.current = e.nativeEvent.layout.y; }}
          style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}
        >
          <Text style={[styles.label, { color: colors.text }]}>Testo</Text>
          <TextInput
            value={body}
            onChangeText={setBody}
            placeholder="Scrivi qui la tua storia"
            placeholderTextColor={mode === 'dark' ? '#B0C4DE' : '#94A3B8'}
            multiline
            scrollEnabled
            textAlignVertical="top"
            style={[styles.textArea, { color: colors.text, borderColor: colors.border }]}
            onFocus={() => { setBodyFocused(true); scrollToBodySoft(); }}
            onBlur={() => setBodyFocused(false)}
            onContentSizeChange={handleBodyContentSizeChange}
          />

          <View style={[styles.counterBar, { borderColor: colors.border, backgroundColor: colors.counter || 'transparent' }]}>
            <Text style={[styles.counterText, { color: colors.text }]}>
              {countWords(body)} parole • {body.length} caratteri
            </Text>
          </View>
        </View>

        <View style={styles.actions}>
          <AnimatedButton onPress={handleSave} style={[styles.btn, { backgroundColor: colors.primary }]}>
            <Text style={[styles.btnText, { color: colors.textOnButton || '#FFFFFF' }]}>
              {editingStory ? 'Aggiorna ✨' : 'Salva 💖'}
            </Text>
          </AnimatedButton>

          <AnimatedButton onPress={handleNew} style={[styles.btn, { backgroundColor: colors.accent2 }]}>
            <Text style={[styles.btnText, { color: '#FFFFFF' }]}>Nuova bozza ➕</Text>
          </AnimatedButton>
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

  counterBar: { marginTop: 8, borderWidth: 1, borderRadius: 10, paddingVertical: 8, paddingHorizontal: 12 },
  counterText: { fontSize: ts(12), opacity: 0.8, textAlign: 'right' },

  actions: { flexDirection: 'row', gap: 10, justifyContent: 'space-between', flexWrap: 'wrap', marginTop: 4 },
  btn: { 
    flexGrow: 1, 
    alignItems: 'center', 
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
  btnText: { fontSize: ts(16), fontWeight: '700' },
  btnGhost: { paddingVertical: 14, paddingHorizontal: 16, borderRadius: 14, borderWidth: 1, marginBottom: 8 },
  btnGhostText: { fontSize: ts(16), fontWeight: '600' },
});
