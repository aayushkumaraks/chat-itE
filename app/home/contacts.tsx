// File: app/home/contacts.tsx

import { useEffect, useState, useRef } from 'react';
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  TouchableOpacity,
  Modal,
  TextInput,
  Pressable,
  ActivityIndicator,
  RefreshControl,
  Alert,
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useRouter } from 'expo-router';
import { FAB } from 'react-native-paper';

const CONTACTS_KEY = 'chatit_e_contacts';

export default function ContactsScreen() {
  const [username, setUsername] = useState('');
  const [contacts, setContacts] = useState<string[]>([]);
  const [statuses, setStatuses] = useState<Record<string, boolean>>({});
  const [modalVisible, setModalVisible] = useState(false);
  const [newContact, setNewContact] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const router = useRouter();
  const wsRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const loadData = async () => {
      const storedUsername = await AsyncStorage.getItem('chatit_e_username');
      const storedContacts = await AsyncStorage.getItem(CONTACTS_KEY);
      if (storedUsername) setUsername(storedUsername);
      if (storedContacts) setContacts(JSON.parse(storedContacts));
    };
    loadData();
  }, []);

  const refreshStatuses = () => {
    if (contacts.length === 0) return;

    setStatuses({});
    setRefreshing(true);

    const ws = new WebSocket('ws://localhost:9000');
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: 'register',
          payload: { username: `status-checker-${Date.now()}` },
        })
      );

      contacts.forEach((contact) => {
        ws.send(
          JSON.stringify({
            type: 'signal',
            to: contact,
            payload: { type: 'ping' },
          })
        );
      });
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.type === 'signal' && data.payload.type === 'pong') {
        setStatuses((prev) => ({ ...prev, [data.from]: true }));
      }
    };

    setTimeout(() => {
      ws.close();
      setRefreshing(false);
    }, 2500);
  };

  const persistContacts = async (updated: string[]) => {
    setContacts(updated);
    await AsyncStorage.setItem(CONTACTS_KEY, JSON.stringify(updated));
  };

  const handleSelectContact = (contact: string) => {
    router.push({
      pathname: '/chat/[contact]' as const,
      params: { contact },
    });
  };

  const validateAndAddContact = async () => {
    const clean = newContact.trim();
    if (!clean || contacts.includes(clean)) return;

    setLoading(true);
    setError('');

    try {
      const ws = new WebSocket('ws://localhost:9000');
      ws.onopen = () => {
        ws.send(
          JSON.stringify({
            type: 'register',
            payload: { username: `temp-${Date.now()}` },
          })
        );

        ws.send(
          JSON.stringify({
            type: 'signal',
            to: clean,
            payload: { type: 'ping' },
          })
        );

        setTimeout(() => {
          ws.close();
          setError('User not found or offline');
          setLoading(false);
        }, 2000);
      };

      ws.onmessage = (event) => {
        const data = JSON.parse(event.data);
        if (data.type === 'signal' && data.payload.type === 'pong') {
          persistContacts([...contacts, clean]);
          setNewContact('');
          setModalVisible(false);
          setLoading(false);
        }
      };
    } catch (err) {
      setError('Connection failed');
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    Alert.alert('Logout', 'This will clear all chats and your username. Continue?', [
      {
        text: 'Cancel',
        style: 'cancel',
      },
      {
        text: 'Yes',
        onPress: async () => {
          const keys = await AsyncStorage.getAllKeys();
          const threadKeys = keys.filter((key) => key.startsWith('chatit_e_thread_'));
          await AsyncStorage.multiRemove([...threadKeys, CONTACTS_KEY, 'chatit_e_username']);
          setContacts([]);
          setUsername('');
          router.replace('/');
        },
      },
    ]);
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Welcome, {username}</Text>
      <Text style={styles.help}>Pull down to refresh contact statuses</Text>

      <FlatList
        data={contacts}
        keyExtractor={(item) => item}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refreshStatuses} />}
        renderItem={({ item }) => (
          <TouchableOpacity
            onPress={() => handleSelectContact(item)}
            style={styles.item}
          >
            <View style={styles.contactRow}>
              <View
                style={[styles.statusDot, { backgroundColor: statuses[item] ? '#0f0' : '#555' }]}
              />
              <Text style={styles.text}>{item}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No contacts yet. Tap + to add one.</Text>}
      />

      <FAB icon="plus" style={styles.fab} onPress={() => setModalVisible(true)} color="white" />
      <FAB icon="logout" style={styles.logoutFab} onPress={handleLogout} color="white" />

      <Modal visible={modalVisible} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Add Contact</Text>
            <TextInput
              style={styles.modalInput}
              placeholder="Enter username"
              placeholderTextColor="#888"
              value={newContact}
              onChangeText={setNewContact}
            />
            {error !== '' && <Text style={styles.error}>{error}</Text>}
            {loading && <ActivityIndicator color="#0a84ff" style={{ marginBottom: 12 }} />}
            <View style={styles.modalButtons}>
              <Pressable onPress={() => setModalVisible(false)} style={styles.btnCancel}>
                <Text style={styles.btnText}>Cancel</Text>
              </Pressable>
              <Pressable onPress={validateAndAddContact} style={styles.btnAdd}>
                <Text style={styles.btnText}>Add</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
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
    color: 'white',
    fontSize: 20,
    marginBottom: 4,
    fontWeight: '600',
  },
  help: {
    color: '#888',
    fontSize: 12,
    marginBottom: 10,
  },
  item: {
    padding: 12,
    backgroundColor: '#1e1e1e',
    marginVertical: 6,
    borderRadius: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  text: {
    color: '#fff',
    fontSize: 16,
  },
  empty: {
    color: '#888',
    marginTop: 20,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 90,
    backgroundColor: '#0a84ff',
  },
  logoutFab: {
    position: 'absolute',
    right: 20,
    bottom: 30,
    backgroundColor: '#ff4d4f',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: '#000000aa',
    justifyContent: 'center',
    padding: 20,
  },
  modalBox: {
    backgroundColor: '#1e1e1e',
    padding: 20,
    borderRadius: 12,
  },
  modalTitle: {
    color: 'white',
    fontSize: 18,
    marginBottom: 12,
  },
  modalInput: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#2a2a2a',
    color: '#fff',
    borderRadius: 8,
    padding: 10,
    marginBottom: 8,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  btnCancel: {
    marginRight: 12,
  },
  btnAdd: {
    backgroundColor: '#0a84ff',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 6,
  },
  btnText: {
    color: 'white',
    fontWeight: '600',
  },
  error: {
    color: '#ff4d4f',
    marginBottom: 8,
    fontSize: 13,
  },
});
