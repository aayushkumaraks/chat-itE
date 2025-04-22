// File: components/MessageBubble.tsx
import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

interface MessageBubbleProps {
  message: string;
  sender: boolean; // true if the current user sent the message
  timestamp?: string;
}

export default function MessageBubble({ message, sender, timestamp }: MessageBubbleProps) {
  return (
    <View style={[styles.bubbleContainer, sender ? styles.right : styles.left]}>
      <View style={[styles.bubble, sender ? styles.bubbleRight : styles.bubbleLeft]}>
        <Text style={styles.message}>{message}</Text>
        {timestamp && <Text style={styles.timestamp}>{timestamp}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  bubbleContainer: {
    marginVertical: 6,
    maxWidth: '75%',
  },
  left: {
    alignSelf: 'flex-start',
  },
  right: {
    alignSelf: 'flex-end',
  },
  bubble: {
    padding: 10,
    borderRadius: 12,
  },
  bubbleLeft: {
    backgroundColor: '#2c2c2e',
    borderBottomLeftRadius: 0,
  },
  bubbleRight: {
    backgroundColor: '#0a84ff',
    borderBottomRightRadius: 0,
  },
  message: {
    color: '#fff',
    fontSize: 15,
  },
  timestamp: {
    color: '#aaa',
    fontSize: 11,
    textAlign: 'right',
    marginTop: 4,
  },
});
