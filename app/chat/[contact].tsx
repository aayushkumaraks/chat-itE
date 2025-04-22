// File: app/chat/[contact].tsx

import { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  Button,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from 'react-native';
import { useLocalSearchParams } from 'expo-router';
import MessageBubble from '../../components/MessageBubble';
import { P2PConnection } from '../../lib/p2p';
import { SignalingClient } from '../../lib/signaling';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface Message {
  id: string;
  text: string;
  sender: boolean;
  timestamp: string;
}

export default function ChatScreen() {
  const { contact } = useLocalSearchParams();
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [statusText, setStatusText] = useState('Connecting...');
  const connection = useRef<P2PConnection>();
  const signaling = useRef<SignalingClient>();
  const fadeAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    init();
    return () => {
      connection.current?.close();
      signaling.current?.close();
    };
  }, []);

  useEffect(() => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        delay: 3000,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [statusText]);

  const init = async () => {
    const localUsername = await AsyncStorage.getItem('chatit_e_username');
    if (!localUsername || typeof contact !== 'string') return;

    const threadKey = `chatit_e_thread_${contact}`;
    const savedMessages = await AsyncStorage.getItem(threadKey);
    if (savedMessages) {
      setMessages(JSON.parse(savedMessages));
    }

    const peer = new P2PConnection({
      onMessage: (msg) => handleIncoming(msg, false),
      onConnect: () => {
        setIsConnected(true);
        setStatusText('Connected');
      },
      onDisconnect: () => {
        setIsConnected(false);
        setStatusText('Disconnected, retrying...');
        setTimeout(init, 2000);
      },
    });
    connection.current = peer;

    const signal = new SignalingClient('ws://9c0b-106-219-175-127.ngrok-free.app', localUsername);
    signaling.current = signal;

    const localPubKey = await peer.exportPublicKey();
    signal.sendSignal(contact, { type: 'pubKey', pubKey: localPubKey });

    signal.onSignal(async (from, payload) => {
      if (from !== contact) return;

      switch (payload.type) {
        case 'pubKey':
          await peer.importRemoteKey(payload.pubKey);
          break;
        case 'offer':
          await peer.setRemoteDescription(payload.offer);
          const answer = await peer.createAnswer();
          signal.sendSignal(from, { type: 'answer', answer });
          break;
        case 'answer':
          await peer.setRemoteDescription(payload.answer);
          break;
        case 'ice':
          await peer.addIceCandidate(payload.candidate);
          break;
      }
    });

    peer.setOnIceCandidate((e) => {
      if (e.candidate) {
        signal.sendSignal(contact, { type: 'ice', candidate: e.candidate });
      }
    });

    const isInitiator = localUsername.localeCompare(contact) < 0;
    if (isInitiator) {
      peer.createDataChannel('chat');
      const offer = await peer.createOffer();
      signal.sendSignal(contact, { type: 'offer', offer });
    }
  };

  const handleIncoming = (text: string, isLocal: boolean) => {
    const newMsg: Message = {
      id: Date.now().toString(),
      text,
      sender: isLocal,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setMessages((prev) => {
      const updated = [newMsg, ...prev];
      AsyncStorage.setItem(`chatit_e_thread_${contact}`, JSON.stringify(updated));
      return updated;
    });
  };

  const handleSend = () => {
    if (!message.trim() || !connection.current) return;
    connection.current.send(message);
    handleIncoming(message, true);
    setMessage('');
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.select({ ios: 'padding', android: undefined })}
    >
      <Animated.Text style={[styles.status, { opacity: fadeAnim }]}>🔌 {statusText}</Animated.Text>

      <FlatList
        data={messages}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <MessageBubble message={item.text} sender={item.sender} timestamp={item.timestamp} />
        )}
        contentContainerStyle={{ padding: 12 }}
        inverted
      />

      <View style={styles.inputRow}>
        <TextInput
          value={message}
          onChangeText={setMessage}
          placeholder="Type a message"
          placeholderTextColor="#888"
          style={styles.input}
        />
        <Button title="Send" onPress={handleSend} disabled={!isConnected} />
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#121212',
  },
  status: {
    color: '#0a84ff',
    textAlign: 'center',
    marginTop: 10,
    fontSize: 13,
  },
  inputRow: {
    flexDirection: 'row',
    padding: 12,
    backgroundColor: '#1c1c1e',
    alignItems: 'center',
  },
  input: {
    flex: 1,
    backgroundColor: '#2c2c2e',
    color: '#fff',
    padding: 10,
    marginRight: 10,
    borderRadius: 8,
  },
});
