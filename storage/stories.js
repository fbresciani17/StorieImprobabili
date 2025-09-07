// storage/stories.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Chiave ufficiale
const KEY = '@storieimprobabili/stories';

// Alcune chiavi legacy note che proviamo per prime
const LEGACY_CANDIDATES_FIRST = [
  'stories',
  '@stories',
  '@storieimprobabili/old',
];

function nowIso() { return new Date().toISOString(); }
function safeParse(json) { try { return JSON.parse(json); } catch (e) { return null; } }
function genId() { return 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 8); }

function normalizeItem(s) {
  const id = s && s.id ? String(s.id) : genId();
  const title = s && s.title ? String(s.title) : '';
  const body = s && s.body ? String(s.body) : '';
  const createdAt = s && s.createdAt ? s.createdAt : nowIso();
  const updatedAt = s && s.updatedAt ? s.updatedAt : createdAt;
  return { id, title, body, createdAt, updatedAt };
}

function looksLikeStoriesArray(arr) {
  if (!Array.isArray(arr) || !arr.length) return false;
  // Consideriamo "storia" un oggetto con almeno title o body (stringhe non-null)
  let score = 0;
  for (let i = 0; i < arr.length && i < 5; i++) {
    const it = arr[i];
    if (it && (typeof it.title === 'string' || typeof it.body === 'string')) score++;
  }
  // Se almeno 3/5 dei primi elementi hanno forma "story-like", la prendiamo buona
  return score >= Math.min(3, arr.length);
}

async function saveAll(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

async function tryMigrateFromKey(candidateKey) {
  try {
    const raw = await AsyncStorage.getItem(candidateKey);
    const parsed = safeParse(raw);
    if (looksLikeStoriesArray(parsed)) {
      const migrated = parsed.map(normalizeItem);
      await saveAll(migrated);
      // opzionale: rimuovi la chiave legacy per evitare future confusioni
      try { await AsyncStorage.removeItem(candidateKey); } catch (e) {}
      console.log('[stories:migration] Migrated', migrated.length, 'stories from key:', candidateKey);
      return migrated;
    }
  } catch (e) {
    // ignora
  }
  return null;
}

/** Migrazione step 1: prova le chiavi legacy note */
async function migrateFromKnownLegacyKeysIfEmpty(currentList) {
  if (Array.isArray(currentList) && currentList.length > 0) return currentList;
  for (let i = 0; i < LEGACY_CANDIDATES_FIRST.length; i++) {
    const migrated = await tryMigrateFromKey(LEGACY_CANDIDATES_FIRST[i]);
    if (migrated && migrated.length) return migrated;
  }
  return currentList;
}

/** Migrazione step 2: scan globale di tutte le chiavi AsyncStorage (ultima spiaggia) */
async function migrateByScanningAllKeysIfEmpty(currentList) {
  if (Array.isArray(currentList) && currentList.length > 0) return currentList;
  try {
    const allKeys = await AsyncStorage.getAllKeys();
    if (!Array.isArray(allKeys) || !allKeys.length) return currentList;

    // Non toccare la chiave ufficiale
    const candidates = allKeys.filter(k => k !== KEY);

    // Carichiamo in batch
    const pairs = await AsyncStorage.multiGet(candidates);
    for (let i = 0; i < pairs.length; i++) {
      const k = pairs[i][0];
      const v = pairs[i][1];
      const parsed = safeParse(v);
      if (looksLikeStoriesArray(parsed)) {
        const migrated = parsed.map(normalizeItem);
        await saveAll(migrated);
        try { await AsyncStorage.removeItem(k); } catch (e) {}
        console.log('[stories:migration] Migrated', migrated.length, 'stories from scanned key:', k);
        return migrated;
      }
    }
  } catch (e) {
    // ignora
  }
  return currentList;
}

/**
 * Carica tutte le storie:
 * 1) legge KEY
 * 2) se vuota → prova le chiavi legacy note
 * 3) se ancora vuota → scan globale di tutte le chiavi (ultima spiaggia)
 * 4) normalizza (assegna id mancanti) e persiste se necessario
 */
async function loadAll() {
  const raw = await AsyncStorage.getItem(KEY);
  let list = safeParse(raw);
  if (!Array.isArray(list)) list = [];

  if (!list.length) {
    list = await migrateFromKnownLegacyKeysIfEmpty(list);
  }
  if (!list.length) {
    list = await migrateByScanningAllKeysIfEmpty(list);
  }

  // Normalizzazione finale (una volta sola)
  let mutated = false;
  for (let i = 0; i < list.length; i++) {
    const n = normalizeItem(list[i]);
    // se è cambiato rispetto all'originale, segna mutated
    if (JSON.stringify(n) !== JSON.stringify(list[i])) mutated = true;
    list[i] = n;
  }
  if (mutated) {
    await saveAll(list);
  }

  return list;
}

/** Pubbliche API */
export async function getAllStories() {
  const list = await loadAll();
  // Ordina dal più recente (createdAt DESC)
  return list.sort(function (a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
}

export async function addStory(payload) {
  const title = payload && payload.title ? String(payload.title).trim() : '';
  const body  = payload && payload.body  ? String(payload.body).trim()  : '';
  const list = await loadAll();
  const ts = nowIso();
  const item = { id: genId(), title, body, createdAt: ts, updatedAt: ts };
  list.unshift(item);
  await saveAll(list);
  return item;
}

/** Update idempotente: se trova l'id aggiorna, altrimenti inserisce (upsert) */
export async function updateStory(updated) {
  const list = await loadAll();
  const hasUpdated = !!updated;
  const id = hasUpdated && updated.id ? String(updated.id) : null;
  const now = nowIso();

  if (id) {
    let idx = -1;
    for (let i = 0; i < list.length; i++) {
      if (list[i].id === id) { idx = i; break; }
    }
    if (idx >= 0) {
      const prev = list[idx];
      const nextTitle = (hasUpdated && typeof updated.title !== 'undefined')
        ? String(updated.title).trim()
        : String(prev.title || '').trim();
      const nextBody  = (hasUpdated && typeof updated.body  !== 'undefined')
        ? String(updated.body).trim()
        : String(prev.body  || '').trim();
      const merged = { id: prev.id, title: nextTitle, body: nextBody, createdAt: prev.createdAt || now, updatedAt: now };
      list[idx] = merged;
      await saveAll(list);
      return merged;
    }
    // id presente ma non trovato → upsert usando lo stesso id
    const itemUpsert = {
      id: id,
      title: hasUpdated && updated.title ? String(updated.title).trim() : '',
      body:  hasUpdated && updated.body  ? String(updated.body).trim()  : '',
      createdAt: (hasUpdated && updated.createdAt) ? updated.createdAt : now,
      updatedAt: now,
    };
    list.unshift(itemUpsert);
    await saveAll(list);
    return itemUpsert;
  }

  // id mancante → nuovo inserimento
  const item = {
    id: genId(),
    title: hasUpdated && updated.title ? String(updated.title).trim() : '',
    body:  hasUpdated && updated.body  ? String(updated.body).trim()  : '',
    createdAt: hasUpdated && updated.createdAt ? updated.createdAt : now,
    updatedAt: now,
  };
  list.unshift(item);
  await saveAll(list);
  return item;
}

export async function removeStory(storyId) {
  const id = String(storyId || '');
  const list = await loadAll();
  const next = list.filter(function (s) { return s.id !== id; });
  await saveAll(next);
  return true;
}

export async function exportStoriesToFile() {
  const list = await loadAll();
  const json = JSON.stringify(list, null, 2);
  const dir = FileSystem.documentDirectory || FileSystem.cacheDirectory;
  const filename = (dir || '') + 'stories_export_' + Date.now() + '.json';
  await FileSystem.writeAsStringAsync(filename, json, { encoding: 'utf8' });
  return filename;
}

export async function importStoriesFromFile(fileUri) {
  if (!fileUri) return 0;
  const json = await FileSystem.readAsStringAsync(fileUri, { encoding: 'utf8' });
  const incoming = safeParse(json);
  if (!Array.isArray(incoming) || !incoming.length) return 0;

  const current = await loadAll();
  const byId = new Map();
  for (let i = 0; i < current.length; i++) { byId.set(current[i].id, current[i]); }

  let imported = 0;
  for (let j = 0; j < incoming.length; j++) {
    const raw = incoming[j]; if (!raw) continue;
    const id = raw.id ? String(raw.id) : genId();
    const prev = byId.get(id) || null;

    const createdAt = raw && raw.createdAt ? raw.createdAt : prev && prev.createdAt ? prev.createdAt : nowIso();
    const updatedAt = raw && raw.updatedAt ? raw.updatedAt : nowIso();

    const item = {
      id,
      title: String(raw && raw.title ? raw.title : prev && prev.title ? prev.title : '').trim(),
      body:  String(raw && raw.body  ? raw.body  : prev && prev.body  ? prev.body  : '').trim(),
      createdAt, updatedAt
    };

    byId.set(id, item);
    imported++;
  }

  const merged = Array.from(byId.values()).sort(function (a, b) {
    return (b.createdAt || '').localeCompare(a.createdAt || '');
  });
  await saveAll(merged);
  return imported;
}

export async function clearStories() {
  await AsyncStorage.removeItem(KEY);
}
