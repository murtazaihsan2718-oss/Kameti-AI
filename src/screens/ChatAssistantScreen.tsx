import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  ActivityIndicator,
} from 'react-native';
import { ArrowLeft, User, Mic, ArrowUp, Volume2, VolumeX } from 'lucide-react-native';
import { TactilePressable } from '../components/TactilePressable';
import { aiService } from '../services/aiService';
import { audioRecordingService } from '../services/audioRecordingService';
import { speechToTextService } from '../services/speechToTextService';
import { textToSpeechService } from '../services/textToSpeechService';

export interface ChatMessage {
  id: string;
  sender: 'user' | 'assistant';
  text: string;
  timestamp: string;
}

interface ChatAssistantScreenProps {
  onBack: () => void;
  onOpenProfile?: () => void;
}

interface TextSegment {
  text: string;
  isBold?: boolean;
  isItalic?: boolean;
}

/**
 * Parses markdown bullets, bold (**text**), and italic (*text*) cleanly
 * into styled text segments without dropping words or eating characters.
 */
function parseMarkdownToSegments(input: string): TextSegment[] {
  if (!input) return [];

  // 1. Normalize line breaks
  let text = input.replace(/\r\n/g, '\n');

  // 2. Convert markdown bullet points (* text or - text) at line start to bullet unicode (• text)
  text = text.replace(/^(\s*)[*\-]\s+/gm, '$1• ');

  // 3. Strip backticks around codes/terms (`TECH55` -> TECH55)
  text = text.replace(/`/g, '');

  // 4. Tokenize for **bold** and *italic*
  const tokenRegex = /(\*\*[^*\n]+\*\*|\*[^*\n\s][^*\n]*\*)/g;
  const parts = text.split(tokenRegex);
  const segments: TextSegment[] = [];

  for (const part of parts) {
    if (!part) continue;

    if (part.startsWith('**') && part.endsWith('**') && part.length >= 4) {
      segments.push({
        text: part.slice(2, -2),
        isBold: true,
      });
    } else if (part.startsWith('*') && part.endsWith('*') && part.length >= 2 && !part.startsWith('**')) {
      segments.push({
        text: part.slice(1, -1),
        isItalic: true,
      });
    } else {
      const cleaned = part.replace(/\*\*/g, '').replace(/\*/g, '');
      if (cleaned) {
        segments.push({
          text: cleaned,
        });
      }
    }
  }

  return segments;
}

const FormattedMessage: React.FC<{ text: string; isUser: boolean }> = ({ text, isUser }) => {
  const segments = parseMarkdownToSegments(text);

  return (
    <Text
      style={[
        isUser ? styles.userMessageText : styles.assistantMessageText,
        Platform.OS === 'android' ? { includeFontPadding: false } : undefined,
      ]}
    >
      {segments.map((seg, idx) => {
        if (seg.isBold) {
          return (
            <Text
              key={idx}
              style={[
                isUser ? styles.userBoldText : styles.assistantBoldText,
                Platform.OS === 'android' ? { includeFontPadding: false } : undefined,
              ]}
            >
              {seg.text}
            </Text>
          );
        }
        if (seg.isItalic) {
          return (
            <Text
              key={idx}
              style={[
                isUser ? styles.userItalicText : styles.assistantItalicText,
                Platform.OS === 'android' ? { includeFontPadding: false } : undefined,
              ]}
            >
              {seg.text}
            </Text>
          );
        }
        return (
          <Text
            key={idx}
            style={Platform.OS === 'android' ? { includeFontPadding: false } : undefined}
          >
            {seg.text}
          </Text>
        );
      })}
    </Text>
  );
};

const INITIAL_MESSAGES: ChatMessage[] = [
  {
    id: 'msg_welcome_1',
    sender: 'assistant',
    text: 'Hello! I am your Kameti AI Assistant. How can I help you today?',
    timestamp: 'Just now',
  },
];

const SUGGESTED_PROMPTS = [
  'How much do I owe this month?',
  'When is my next payout turn?',
  'Who do I pay this month?',
  'What committees am I enrolled in?',
];

// Floating dock height (54px) + bottom offset (12px) + breathing room (6px) = 72px (Android) / 84px (iOS)
const DOCK_CLEARANCE_HEIGHT = Platform.OS === 'ios' ? 84 : 72;

export const ChatAssistantScreen: React.FC<ChatAssistantScreenProps> = ({
  onBack,
  onOpenProfile,
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>(() => aiService.getSessionMessages());
  const [inputText, setInputText] = useState('');
  const [isAssistantTyping, setIsAssistantTyping] = useState(false);
  const [isKeyboardVisible, setKeyboardVisible] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isTogglingMic, setIsTogglingMic] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [activeSpeakingId, setActiveSpeakingId] = useState<string | null>(null);

  const scrollViewRef = useRef<ScrollView>(null);

  // Clean up any active recording and speech on screen unmount
  useEffect(() => {
    return () => {
      audioRecordingService.cancelRecording();
      textToSpeechService.stopSpeech();
    };
  }, []);

  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';

    const showSub = Keyboard.addListener(showEvent, () => {
      setKeyboardVisible(true);
      setTimeout(() => {
        scrollViewRef.current?.scrollToEnd({ animated: true });
      }, 100);
    });
    const hideSub = Keyboard.addListener(hideEvent, () => {
      setKeyboardVisible(false);
    });

    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const scrollToBottom = (animated = true) => {
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom(true);
  }, [messages, isAssistantTyping]);

  /**
   * Handle microphone press:
   * 1. If idle -> Stop active speech and start audio recording.
   * 2. If recording -> Stop audio recording, transcribe, and automatically send query to Kameti AI.
   */
  const handleMicPress = async () => {
    if (isTogglingMic || isAssistantTyping || isTranscribing) {
      return;
    }

    // Stop active speech playback when user intends to speak
    await textToSpeechService.stopSpeech();
    setIsSpeaking(false);

    setIsTogglingMic(true);
    try {
      if (isRecording) {
        setIsRecording(false);
        const result = await audioRecordingService.stopRecording();
        if (result && result.uri) {
          console.log(`[Voice] Audio recording captured at ${result.uri}. Starting transcription...`);
          setIsTranscribing(true);
          try {
            const sttResult = await speechToTextService.transcribeAudio(result.uri);
            if (sttResult && sttResult.success && sttResult.text && sttResult.text.trim()) {
              const spokenQuery = sttResult.text.trim();
              console.log(`[Voice] Transcribed text: "${spokenQuery}". Auto-dispatching to Kameti AI...`);
              setInputText('');
              // Automatically dispatch spoken question to the existing chatbot pipeline
              await handleSendMessage(spokenQuery);
            } else if (sttResult && !sttResult.success && sttResult.error) {
              console.warn('[Voice] Transcription notice:', sttResult.error);
            }
          } catch (transcribeErr) {
            console.error('[Voice] Transcription request failed:', transcribeErr);
          } finally {
            setIsTranscribing(false);
          }
        }
      } else {
        const started = await audioRecordingService.startRecording();
        if (started) {
          setIsRecording(true);
        }
      }
    } catch (err) {
      console.error('[Voice] Error in handleMicPress:', err);
      setIsRecording(false);
      setIsTranscribing(false);
    } finally {
      setIsTogglingMic(false);
    }
  };

  const handleSendMessage = async (textToSend?: string) => {
    if (isAssistantTyping) {
      return;
    }

    // Stop active speech playback when sending new message
    await textToSpeechService.stopSpeech();
    setIsSpeaking(false);

    const rawText = textToSend !== undefined ? textToSend : inputText;
    const trimmed = (rawText || '').trim();

    if (!trimmed) {
      return;
    }

    if (textToSend === undefined) {
      setInputText('');
    }

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const userMessage: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: 'user',
      text: trimmed,
      timestamp: timeString,
    };

    const updatedHistory = [...messages, userMessage];
    setMessages(updatedHistory);
    aiService.setSessionMessages(updatedHistory);
    setIsAssistantTyping(true);

    try {
      const result = await aiService.sendMessageToAssistant(trimmed, messages);
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

      let assistantText = '';
      if (result.success && result.response) {
        assistantText = result.response;
      } else {
        assistantText =
          result.error || "Sorry, I couldn't connect to the assistant right now. Please try again.";
      }

      const assistantMessage: ChatMessage = {
        id: `asst_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        sender: 'assistant',
        text: assistantText,
        timestamp: replyTime,
      };

      const finalHistory = [...updatedHistory, assistantMessage];
      setMessages(finalHistory);
      aiService.setSessionMessages(finalHistory);

      // Speak assistant response aloud if not muted
      if (!isMuted && assistantText) {
        setIsSpeaking(true);
        setActiveSpeakingId(assistantMessage.id);
        textToSpeechService.speakText(assistantText, {
          onDone: () => {
            setIsSpeaking(false);
            setActiveSpeakingId(null);
          },
          onError: () => {
            setIsSpeaking(false);
            setActiveSpeakingId(null);
          },
        });
      }
    } catch (err: any) {
      const replyTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      const errorMessage: ChatMessage = {
        id: `asst_err_${Date.now()}`,
        sender: 'assistant',
        text: 'Sorry, I encountered a temporary connection issue. Please try again.',
        timestamp: replyTime,
      };
      const finalHistory = [...updatedHistory, errorMessage];
      setMessages(finalHistory);
      aiService.setSessionMessages(finalHistory);
    } finally {
      setIsAssistantTyping(false);
    }
  };

  const hasText = inputText.trim().length > 0;
  const bottomPadding = isKeyboardVisible ? 8 : DOCK_CLEARANCE_HEIGHT;

  // On Android, Android's native adjustResize handles keyboard avoidance smoothly.
  // On iOS, KeyboardAvoidingView ensures seamless transition.
  const Wrapper = Platform.OS === 'ios' ? KeyboardAvoidingView : View;
  const wrapperProps = Platform.OS === 'ios'
    ? { behavior: 'padding' as const, keyboardVerticalOffset: 70 }
    : {};

  return (
    <Wrapper
      style={styles.container}
      {...wrapperProps}
    >
      {/* Top Header Bar */}
      <View style={styles.header}>
        <TactilePressable
          style={styles.headerBtn}
          haptic="selection"
          scaleTo={0.9}
          onPress={() => {
            Keyboard.dismiss();
            textToSpeechService.stopSpeech();
            onBack();
          }}
        >
          <ArrowLeft size={20} color="#000000" strokeWidth={2.5} />
        </TactilePressable>

        <Text style={styles.headerTitle}>Kameti AI</Text>

        <View style={styles.headerRightActions}>
          {/* Speaker / Mute Toggle Button */}
          <TactilePressable
            style={styles.headerBtn}
            haptic="selection"
            scaleTo={0.9}
            onPress={() => {
              if (!isMuted && isSpeaking) {
                textToSpeechService.stopSpeech();
                setIsSpeaking(false);
              }
              setIsMuted(prev => !prev);
            }}
          >
            {isMuted ? (
              <VolumeX size={20} color="#A1A1AA" strokeWidth={2.2} />
            ) : (
              <Volume2 size={20} color={isSpeaking ? '#2563EB' : '#000000'} strokeWidth={2.2} />
            )}
          </TactilePressable>

          <TactilePressable
            style={styles.headerBtn}
            haptic="selection"
            scaleTo={0.9}
            onPress={() => {
              textToSpeechService.stopSpeech();
              if (onOpenProfile) {
                onOpenProfile();
              }
            }}
          >
            <User size={20} color="#000000" strokeWidth={2} />
          </TactilePressable>
        </View>
      </View>

      {/* Chat Messages List */}
      <ScrollView
        ref={scrollViewRef}
        style={styles.chatScroll}
        contentContainerStyle={styles.chatContent}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        onContentSizeChange={() => {
          scrollViewRef.current?.scrollToEnd({ animated: true });
        }}
      >
        {messages.map((msg) => {
          const isUser = msg.sender === 'user';
          if (isUser) {
            return (
              <View key={msg.id} style={[styles.messageBubble, styles.userBubble]}>
                <FormattedMessage text={msg.text} isUser={true} />
              </View>
            );
          }

          const isCurrentMsgPlaying = isSpeaking && activeSpeakingId === msg.id;

          return (
            <View key={msg.id} style={[styles.messageBubble, styles.assistantBubble]}>
              <FormattedMessage text={msg.text} isUser={false} />
              <View style={styles.assistantBubbleFooter}>
                <TactilePressable
                  haptic="light"
                  scaleTo={0.92}
                  style={styles.replaySpeakerBtn}
                  onPress={async () => {
                    if (isCurrentMsgPlaying) {
                      await textToSpeechService.stopSpeech();
                      setIsSpeaking(false);
                      setActiveSpeakingId(null);
                    } else {
                      setActiveSpeakingId(msg.id);
                      setIsSpeaking(true);
                      await textToSpeechService.speakText(msg.text, {
                        onDone: () => {
                          setIsSpeaking(false);
                          setActiveSpeakingId(null);
                        },
                        onError: () => {
                          setIsSpeaking(false);
                          setActiveSpeakingId(null);
                        },
                      });
                    }
                  }}
                >
                  <Volume2
                    size={13}
                    color={isCurrentMsgPlaying ? '#60A5FA' : '#9CA3AF'}
                    strokeWidth={2.2}
                  />
                  <Text style={[styles.replaySpeakerText, isCurrentMsgPlaying && styles.replaySpeakerTextActive]}>
                    {isCurrentMsgPlaying ? 'Playing...' : 'Listen'}
                  </Text>
                </TactilePressable>
              </View>
            </View>
          );
        })}

        {/* Assistant Typing Indicator Bubble */}
        {isAssistantTyping && (
          <View style={[styles.messageBubble, styles.assistantBubble, styles.typingBubble]}>
            <ActivityIndicator size="small" color="#FFFFFF" />
            <Text style={styles.typingText}>Thinking...</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Section: Suggested Questions + Floating Input Bar */}
      <View style={[styles.bottomControlWrapper, { paddingBottom: bottomPadding }]}>
        {/* Suggested Questions Bar (hidden when keyboard is open to maximize chat view) */}
        {!isKeyboardVisible && (
          <View style={styles.suggestedContainer}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.suggestedScrollContent}
              keyboardShouldPersistTaps="handled"
            >
              {SUGGESTED_PROMPTS.map((prompt, index) => (
                <TactilePressable
                  key={`prompt_${index}`}
                  style={styles.promptChip}
                  haptic="selection"
                  scaleTo={0.95}
                  disabled={isAssistantTyping}
                  onPress={() => handleSendMessage(prompt)}
                >
                  <Text style={styles.promptChipText}>{prompt}</Text>
                </TactilePressable>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Floating Input Pill */}
        <View
          style={[
            styles.inputPill,
            isRecording && styles.inputPillRecording,
            isTranscribing && styles.inputPillTranscribing,
          ]}
        >
          {isRecording ? (
            <View style={styles.recordingStatusContainer}>
              <View style={styles.recordingRedDot} />
              <Text style={styles.recordingStatusText}>Recording audio... Tap mic to stop</Text>
            </View>
          ) : isTranscribing ? (
            <View style={styles.transcribingStatusContainer}>
              <ActivityIndicator size="small" color="#000000" />
              <Text style={styles.transcribingStatusText}>Transcribing your voice...</Text>
            </View>
          ) : (
            <TextInput
              style={styles.textInput}
              placeholder="Message Kameti AI..."
              placeholderTextColor="#A1A1AA"
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={() => {
                handleSendMessage();
              }}
              returnKeyType="send"
              blurOnSubmit={false}
              multiline={false}
            />
          )}

          {/* Microphone Button (Toggles Audio Recording with tactile feedback) */}
          <TactilePressable
            haptic={isRecording ? 'impactHeavy' : 'medium'}
            scaleTo={0.88}
            style={[
              styles.micBtn,
              isRecording && styles.micBtnActive,
              isTranscribing && styles.micBtnDisabled,
            ]}
            disabled={isTogglingMic || isAssistantTyping || isTranscribing}
            onPress={handleMicPress}
          >
            {isTranscribing ? (
              <ActivityIndicator size="small" color="#71717A" />
            ) : (
              <Mic size={16} color={isRecording ? '#FFFFFF' : '#71717A'} strokeWidth={2.2} />
            )}
          </TactilePressable>

          {/* Send Arrow Button */}
          <TactilePressable
            haptic="success"
            scaleTo={0.88}
            style={[
              styles.sendBtn,
              (!hasText || isAssistantTyping || isRecording || isTranscribing) && styles.sendBtnDisabled,
            ]}
            disabled={!hasText || isAssistantTyping || isRecording || isTranscribing}
            onPress={() => handleSendMessage()}
          >
            <ArrowUp size={16} color="#FFFFFF" strokeWidth={2.6} />
          </TactilePressable>
        </View>
      </View>
    </Wrapper>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    paddingHorizontal: 18,
    paddingTop: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    backgroundColor: '#FFFFFF',
  },
  headerRightActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
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
    paddingBottom: 16,
    gap: 14,
  },
  messageBubble: {
    maxWidth: '88%',
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: '#F4F4F5',
    borderRadius: 20,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#000000',
    borderRadius: 20,
  },
  assistantBubbleFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'flex-end',
    marginTop: 8,
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.08)',
  },
  replaySpeakerBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingVertical: 2,
    paddingHorizontal: 6,
    borderRadius: 12,
    backgroundColor: 'rgba(255, 255, 255, 0.07)',
  },
  replaySpeakerText: {
    fontSize: 11,
    color: '#9CA3AF',
    fontWeight: '600',
  },
  replaySpeakerTextActive: {
    color: '#60A5FA',
  },
  userMessageText: {
    fontSize: 14,
    color: '#000000',
    lineHeight: 21,
    fontWeight: '400',
  },
  userBoldText: {
    fontWeight: '700',
    color: '#000000',
  },
  userItalicText: {
    fontStyle: 'italic',
    color: '#000000',
  },
  assistantMessageText: {
    fontSize: 14,
    color: '#FFFFFF',
    lineHeight: 22,
    fontWeight: '400',
  },
  assistantBoldText: {
    fontWeight: '700',
    color: '#FFFFFF',
  },
  assistantItalicText: {
    fontStyle: 'italic',
    color: '#E4E4E7',
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  typingText: {
    fontSize: 13,
    color: '#FFFFFF',
    fontWeight: '500',
  },
  bottomControlWrapper: {
    backgroundColor: '#FFFFFF',
    paddingTop: 4,
  },
  suggestedContainer: {
    marginBottom: 10,
  },
  suggestedScrollContent: {
    gap: 8,
    paddingHorizontal: 2,
  },
  promptChip: {
    backgroundColor: '#F4F4F5',
    borderRadius: 9999,
    paddingVertical: 7,
    paddingHorizontal: 13,
    borderWidth: 1,
    borderColor: '#E4E4E7',
  },
  promptChipText: {
    fontSize: 12,
    color: '#3F3F46',
    fontWeight: '600',
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
  inputPillRecording: {
    borderColor: '#DC2626',
    backgroundColor: '#FEF2F2',
  },
  inputPillTranscribing: {
    borderColor: '#D4D4D8',
    backgroundColor: '#F4F4F5',
  },
  recordingStatusContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  recordingRedDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#DC2626',
  },
  recordingStatusText: {
    fontSize: 13,
    color: '#DC2626',
    fontWeight: '600',
  },
  transcribingStatusContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: 4,
  },
  transcribingStatusText: {
    fontSize: 13,
    color: '#52525B',
    fontWeight: '600',
  },
  textInput: {
    flex: 1,
    fontSize: 15,
    color: '#000000',
    fontWeight: '500',
    paddingVertical: Platform.OS === 'ios' ? 6 : 4,
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
    backgroundColor: '#DC2626',
  },
  micBtnDisabled: {
    opacity: 0.5,
  },
  sendBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#000000',
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendBtnDisabled: {
    opacity: 0.35,
  },
});
