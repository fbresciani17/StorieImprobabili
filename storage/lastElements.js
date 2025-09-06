import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'storie-improbabili@last-elements';

export async function setLastElements(obj) {
  try {
    if (obj && typeof obj === 'object' && Object.keys(obj).length) {
      await AsyncStorage.setItem(KEY, JSON.stringify(obj));
    }
  } catch (e) {
    console.warn('setLastElements error', e);
  }
}

export async function getLastElements() {
  try {
    const s = await AsyncStorage.getItem(KEY);
    return s ? JSON.parse(s) : null;
  } catch (e) {
    console.warn('getLastElements error', e);
    return null;
  }
}

export async function clearLastElements() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn('clearLastElements error', e);
  }
}
