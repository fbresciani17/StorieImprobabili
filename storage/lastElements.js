// storage/lastElements.js
import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = 'lastElements';

/**
 * Salva in AsyncStorage gli ultimi elementi generati.
 * @param {Object} obj - Dizionario { categoryKey: value }
 */
export async function setLastElements(obj) {
  try {
    console.log("Salvataggio lastElements:", obj); // DEBUG
    await AsyncStorage.setItem(KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn("Errore salvataggio lastElements:", e);
  }
}

/**
 * Recupera da AsyncStorage gli ultimi elementi generati.
 * @returns {Promise<Object|null>}
 */
export async function getLastElements() {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  } catch (e) {
    console.warn("Errore lettura lastElements:", e);
    return null;
  }
}

/**
 * Cancella gli ultimi elementi salvati.
 */
export async function clearLastElements() {
  try {
    await AsyncStorage.removeItem(KEY);
  } catch (e) {
    console.warn("Errore clear lastElements:", e);
  }
}
