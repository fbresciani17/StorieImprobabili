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
  // ultimo salvato in cima
  list.unshift(story);
  await saveAll(list);
  return story;
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
