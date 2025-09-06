import React, { useCallback, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  Alert,
} from 'react-native';
import { useTheme } from '../theme/ThemeContext';
import { getAllStories, removeStory } from '../storage/stories';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

function formatDate(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleString('it-IT', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

export default function StoriesScreen() {
  const { colors } = useTheme();
  const [stories, setStories] = useState([]);

  // Ricarica la lista quando la tab diventa visibile
  const load = useCallback(async () => {
    const list = await getAllStories();
    setStories(list);
  }, []);

  useFocusEffect(
    useCallback(() => {
      load();
    }, [load])
  );

  function confirmDelete(storyId) {
    Alert.alert(
      'Elimina 🗑️',
      'Vuoi davvero dire addio a questa storia? 😢',
      [
        { text: 'Annulla', style: 'cancel' },
        {
          text: 'Elimina',
          style: 'destructive',
          onPress: async () => {
            const next = await removeStory(storyId);
            setStories(next);
          },
        },
      ]
    );
  }

  const renderItem = ({ item }) => (
    <View style={[styles.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.cardHeader}>
        <Text style={[styles.title, { color: colors.text }]} numberOfLines={1}>
          {item.title}
        </Text>
        <Pressable
          onPress={() => confirmDelete(item.id)}
          style={[styles.iconBtn, { backgroundColor: colors.accent }]}
          accessibilityRole="button"
          accessibilityLabel="Elimina storia"
        >
          <Ionicons name="trash" size={16} color={colors.text} />
        </Pressable>
      </View>
      <Text style={[styles.date, { color: colors.text }]}>
        {formatDate(item.createdAt)}
      </Text>
      <Text style={[styles.body, { color: colors.text }]} numberOfLines={2}>
        {item.body}
      </Text>
    </View>
  );

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <Text style={[styles.header, { color: colors.text }]}>Le tue storie 📚</Text>

      {stories.length === 0 ? (
        <View style={styles.emptyWrap}>
          <Text style={[styles.empty, { color: colors.text }]}>
            Nessuna storia ancora. Salva una bozza dall'Editor 💖
          </Text>
        </View>
      ) : (
        <FlatList
          data={stories}
          keyExtractor={(it) => it.id}
          renderItem={renderItem}
          contentContainerStyle={{ gap: 12, paddingBottom: 16 }}
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  header: { fontSize: 22, fontWeight: '800', marginBottom: 12 },
  emptyWrap: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  empty: { fontSize: 15, opacity: 0.8, textAlign: 'center' },

  card: {
    borderWidth: 1,
    borderRadius: 16,
    padding: 12,
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: { flex: 1, fontSize: 16, fontWeight: '700' },
  date: { fontSize: 12, opacity: 0.7, marginTop: 2, marginBottom: 6 },
  body: { fontSize: 14, opacity: 0.9 },

  iconBtn: {
    paddingVertical: 6,
    paddingHorizontal: 8,
    borderRadius: 10,
  },
});
