import { useEffect, useState } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';

interface ThreadPreview {
  contact: string;
  lastMessage: string;
  timestamp: string;
}

const THREAD_PREFIX = 'chatit_e_thread_';

export default function MessagesScreen() {
  const [username, setUsername] = useState('');
  const [threads, setThreads] = useState<ThreadPreview[]>([]);
  const router = useRouter();

  useEffect(() => {
    const loadThreads = async () => {
      const storedUsername = await AsyncStorage.getItem('chatit_e_username');
      if (storedUsername) setUsername(storedUsername);

      const allKeys = await AsyncStorage.getAllKeys();
      const threadKeys = allKeys.filter((key) => key.startsWith(THREAD_PREFIX));

      const previews: ThreadPreview[] = [];

      for (const key of threadKeys) {
        const raw = await AsyncStorage.getItem(key);
        if (!raw) continue;

        const messages = JSON.parse(raw);
        if (!messages.length) continue;

        const last = messages[0];
        const contact = key.replace(THREAD_PREFIX, '');

        previews.push({
          contact,
          lastMessage: last.text,
          timestamp: last.timestamp,
        });
      }

      // Sort by most recent
      previews.sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1));
      setThreads(previews);
    };

    loadThreads();
  }, []);

  const handleSelectThread = (contact: string) => {
    router.push({
      pathname: '/chat/[contact]' as const,
      params: { contact },
    });
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome, {username}</Text>

      <FlatList
        data={threads}
        keyExtractor={(item) => item.contact}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectThread(item.contact)}
            style={styles.item}
          >
            <View>
              <Text style={styles.contact}>{item.contact}</Text>
              <Text style={styles.message} numberOfLines={1}>
                {item.lastMessage}
              </Text>
            </View>
            <Text style={styles.timestamp}>{item.timestamp}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No message threads yet.</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    padding: 16,
  },
  header: {
    color: '#fff',
    fontSize: 20,
    fontWeight: '600',
    marginBottom: 10,
  },
  item: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
    borderBottomColor: '#333',
    borderBottomWidth: 1,
  },
  contact: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  message: {
    color: '#bbb',
    fontSize: 14,
    marginTop: 4,
    maxWidth: 200,
  },
  timestamp: {
    color: '#888',
    fontSize: 12,
    alignSelf: 'center',
  },
  empty: {
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
});
