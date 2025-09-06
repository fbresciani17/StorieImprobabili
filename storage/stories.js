// storage/stories.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@storieimprobabili/stories';

function genId() {
  return 'sid_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 6);
}

export async function getAllStories() {
  try {
    const json = await AsyncStorage.getItem(KEY);
    return json ? JSON.parse(json) : [];
  } catch (e) {
    console.warn('getAllStories error', e);
    return [];
  }
}

async function saveAll(stories) {
  await AsyncStorage.setItem(KEY, JSON.stringify(stories));
}

export async function addStory({ title, body }) {
  const list = await getAllStories();
  const now = new Date().toISOString();
  const story = { id: genId(), title, body, createdAt: now, updatedAt: now };
  list.unshift(story); // più recente in cima
  await saveAll(list);
  return story;
}

export async function updateStory(id, { title, body }) {
  const list = await getAllStories();
  const idx = list.findIndex((s) => s.id === id);
  if (idx === -1) throw new Error('Story not found: ' + id);
  const now = new Date().toISOString();
  const updated = { ...list[idx], title, body, updatedAt: now };
  list[idx] = updated;
  await saveAll(list);
  return updated;
}

export async function removeStory(id) {
  const list = await getAllStories();
  const next = list.filter((s) => s.id !== id);
  await saveAll(next);
  return next;
}

// Facoltativo per debug/reset manuale
export async function clearStories() {
  await AsyncStorage.removeItem(KEY);
}
