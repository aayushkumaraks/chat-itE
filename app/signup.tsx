import { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  Alert,
  Pressable,
} from 'react-native';
import { useRouter } from 'expo-router';
import AsyncStorage from '@react-native-async-storage/async-storage';

const generateUsername = () => {
  const animals = ['fox', 'lion', 'panda', 'tiger', 'wolf', 'otter', 'koala', 'hawk'];
  const randomAnimal = animals[Math.floor(Math.random() * animals.length)];
  const randomNum = Math.floor(Math.random() * 1000);
  return `chatit_${randomAnimal}${randomNum}`;
};

export default function Signup() {
  const [username, setUsername] = useState('');
  const [suggested, setSuggested] = useState(generateUsername());
  const router = useRouter();
  const socketRef = useRef<WebSocket | null>(null);

  useEffect(() => {
    const socket = new WebSocket('ws://localhost:9000');
    socketRef.current = socket;

    socket.onopen = () => {
      console.log('✅ WebSocket connected');
    };

    socket.onerror = (e) => {
      console.error('❌ WebSocket error:', e);
    };

    return () => {
      socket.close();
    };
  }, []);

  const handleSignup = async () => {
    const name = username.trim().toLowerCase();

    if (!name) {
      return Alert.alert('Username required');
    }

    const socket = socketRef.current;
    if (!socket || socket.readyState !== WebSocket.OPEN) {
      return Alert.alert('WebSocket not connected');
    }

    // Register with the server
    socket.send(
      JSON.stringify({
        type: 'register',
        payload: { username: name },
      })
    );

    await AsyncStorage.setItem('chatit_e_username', name);
    router.replace('/home');
  };

  const applySuggestion = () => {
    setUsername(suggested);
    setSuggested(generateUsername());
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Choose a Username</Text>
      <TextInput
        value={username}
        onChangeText={setUsername}
        placeholder="Enter unique username"
        style={styles.input}
        placeholderTextColor="#888"
        autoCapitalize="none"
      />
      <Button title="Sign Up" onPress={handleSignup} />
      <Pressable onPress={applySuggestion}>
        <Text style={styles.suggest}>Try "{suggested}"</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
    justifyContent: 'center',
    padding: 20,
  },
  title: {
    color: 'white',
    fontSize: 22,
    marginBottom: 16,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#333',
    backgroundColor: '#1e1e1e',
    color: '#fff',
    padding: 10,
    borderRadius: 8,
    marginBottom: 20,
  },
  suggest: {
    color: '#bbb',
    marginTop: 15,
    textAlign: 'center',
    textDecorationLine: 'underline',
  },
});
