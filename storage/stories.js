// storage/stories.js
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system';

// Chiave ORIGINALE del tuo snapshot (IMPORTANTE non cambiarla)
const KEY = '@storieimprobabili/stories';

function nowIso() { return new Date().toISOString(); }
function safeParse(json) { try { return JSON.parse(json); } catch (e) { return null; } }
function genId() { return 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6); }

async function saveAll(list) {
  await AsyncStorage.setItem(KEY, JSON.stringify(list));
}

/**
 * Carica tutto e fa una MIGRAZIONE trasparente:
 * - se trova storie senza id, assegna un id e salva.
 */
async function loadAll() {
  const raw = await AsyncStorage.getItem(KEY);
  const parsed = safeParse(raw);
  let list = Array.isArray(parsed) ? parsed.slice() : [];

  let mutated = false;
  for (let i = 0; i < list.length; i++) {
    const s = list[i] || {};
    // normalizzazione minima
    let id = (s && s.id) ? String(s.id) : '';
    let title = s && s.title ? String(s.title) : '';
    let body = s && s.body ? String(s.body) : '';
    let createdAt = s && s.createdAt ? s.createdAt : nowIso();
    let updatedAt = s && s.updatedAt ? s.updatedAt : (s && s.createdAt) ? s.createdAt : nowIso();

    if (!id) { id = genId(); mutated = true; }

    list[i] = { id, title, body, createdAt, updatedAt };
  }

  if (mutated) {
    // una volta sola: persistiamo gli id generati così in futuro l'update troverà corrispondenza
    await saveAll(list);
  }

  return list;
}

/** Ordina per createdAt desc */
export async function getAllStories() {
  const list = await loadAll();
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

/** update idempotente: se trova l'id aggiorna, altrimenti inserisce (upsert) */
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
    // id presente ma non trovato → upsert con lo stesso id
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
