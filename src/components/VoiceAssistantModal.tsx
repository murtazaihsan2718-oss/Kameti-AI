import React, { useState } from 'react';
import { View, Text, StyleSheet, TextInput, ScrollView } from 'react-native';
import { ArrowLeft, User, Mic, ArrowUp } from 'lucide-react-native';
import { voiceAssistantService } from '../services/voiceAssistantService';
import { TactilePressable } from './TactilePressable';

interface VoiceAssistantProps {
  visible?: boolean;
  onClose: () => void;
  onOpenProfile?: () => void;
}

export const VoiceAssistantModal: React.FC<VoiceAssistantProps> = ({
  onClose,
  onOpenProfile,
}) => {
  const [messages, setMessages] = useState([
    { sender: 'user', text: 'How much do I have to pay in total this month?' },
    { sender: 'ai', text: 'You have a total of PKR 7,500 due this month across your Family Savings (PKR 5,000) and Office Group (PKR 2,500) committees.' },
  ]);
  const [inputQuery, setInputQuery] = useState('');
  const [isListening, setIsListening] = useState(false);

  const handleSend = () => {
    if (!inputQuery.trim()) {
      return;
    }
    const text = inputQuery.trim();
    const newMessages = [...messages, { sender: 'user', text }];
    const res = voiceAssistantService.processQuery(text);
    newMessages.push({ sender: 'ai', text: res.textResponse });
    setMessages(newMessages);
    setInputQuery('');
  };

  const handleMicPress = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    setIsListening(true);
    setTimeout(() => {
      setMessages((prev) => [
        ...prev,
        { sender: 'user', text: 'When is my next committee payout?' },
        { sender: 'ai', text: 'Your Family Savings committee payout of PKR 60,000 is scheduled for Cycle 3 on September 15th.' },
      ]);
      setIsListening(false);
    }, 2500);
  };

  let inputPlaceholder = 'Message Kameti AI...';
  if (isListening) {
    inputPlaceholder = 'Listening to your voice...';
  }

  let micIconColor = '#71717A';
  if (isListening) {
    micIconColor = '#FFFFFF';
  }

  return (
    <View style={styles.container}>
      
      {/* Top Header Bar - 1:1 Matching with HomeScreen */}
      <View style={styles.header}>
        <TactilePressable
          style={styles.headerBtn}
          haptic="selection"
          scaleTo={0.9}
          onPress={() => {
            onClose();
          }}
        >
          <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
        </TactilePressable>
        <Text style={styles.headerTitle}>Kameti AI</Text>
        <TactilePressable
          style={styles.headerBtn}
          haptic="selection"
          scaleTo={0.9}
          onPress={() => {
            if (onOpenProfile) {
              onOpenProfile();
            } else {
              onClose();
            }
          }}
        >
          <User size={20} color="#000000" strokeWidth={2} />
        </TactilePressable>
      </View>

      {/* Full-Height Chat Messages Area */}
      <ScrollView
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
      >
        {messages.map((msg, idx) => {
          let isUser = false;
          if (msg.sender === 'user') {
            isUser = true;
          }

          if (isUser) {
            return (
              <View key={idx} style={[styles.messageBubble, styles.userBubble]}>
                <Text style={styles.userMessageText}>{msg.text}</Text>
              </View>
            );
          }

          return (
            <View key={idx} style={[styles.messageBubble, styles.aiBubble]}>
              <Text style={styles.aiMessageText}>{msg.text}</Text>
            </View>
          );
        })}
      </ScrollView>

      {/* Integrated Message & Voice-to-Text Bar with Tactile Actions */}
      <View style={styles.inputContainer}>
        <View style={styles.inputPill}>
          <TextInput
            style={styles.textInput}
            placeholder={inputPlaceholder}
            placeholderTextColor="#A1A1AA"
            value={inputQuery}
            onChangeText={setInputQuery}
            onSubmitEditing={handleSend}
          />
          
          {/* Integrated Tactile Mic Button */}
          <TactilePressable
            haptic="medium"
            scaleTo={0.88}
            style={[styles.micBtn, isListening && styles.micBtnActive]}
            onPress={handleMicPress}
          >
            <Mic size={16} color={micIconColor} strokeWidth={2.2} />
          </TactilePressable>

          {/* Tactile Send Arrow Button */}
          <TactilePressable
            haptic="success"
            scaleTo={0.88}
            style={styles.sendBtn}
            onPress={handleSend}
          >
            <ArrowUp size={15} color="#FFFFFF" strokeWidth={2.5} />
          </TactilePressable>
        </View>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 4,
    paddingBottom: 84,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
    backgroundColor: '#FFFFFF',
  },
  headerBtn: {
    width: 38,
    height: 38,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#FFFFFF',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#000000',
    letterSpacing: -0.2,
  },
  chatScroll: {
    flex: 1,
  },
  chatContent: {
    paddingVertical: 10,
    gap: 12,
  },
  messageBubble: {
    maxWidth: '85%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 18,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#F4F4F5',
    borderBottomRightRadius: 4,
  },
  aiBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    borderBottomLeftRadius: 4,
  },
  userMessageText: {
    fontSize: 13.5,
    color: '#000000',
    lineHeight: 19,
    fontWeight: '500',
  },
  aiMessageText: {
    fontSize: 13.5,
    color: '#FFFFFF',
    lineHeight: 19,
    fontWeight: '500',
  },
  inputContainer: {
    paddingTop: 8,
    paddingBottom: 4,
    backgroundColor: '#FFFFFF',
  },
  inputPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#F4F4F5',
    borderRadius: 9999,
    paddingVertical: 6,
    paddingLeft: 16,
    paddingRight: 6,
    borderWidth: 1,
    borderColor: '#E4E4E7',
    gap: 6,
  },
  textInput: {
    flex: 1,
    fontSize: 13.5,
    color: '#000000',
    fontWeight: '500',
    paddingVertical: 4,
  },
  micBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#E4E4E7',
    alignItems: 'center',
    justifyContent: 'center',
  },
  micBtnActive: {
    backgroundColor: '#000000',
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
