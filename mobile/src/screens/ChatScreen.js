import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect, useRoute } from '@react-navigation/native';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchChatSuggestions, sendChatMessage } from '../services/api';
import { CardElevated } from '../components/UIKit';
import LLMDownloadBanner from '../components/LLMDownloadBanner';
import * as LLM from '../services/llmService';

// ── Offline suggestion chips ─────────────────────────────────────────────────
const OFFLINE_SUGGESTIONS = [
  'How do I treat tomato early blight?',
  'What fertilizer is best for wheat?',
  'How often should I irrigate rice crops?',
  'Signs of nutrient deficiency in plants?',
  'How do I prevent pest infestation?',
];

export default function ChatScreen() {
  const route   = useRoute();
  const [input, setInput]       = useState('');
  const [messages, setMessages] = useState([]);
  const [llmReady, setLlmReady] = useState(false);
  const [llmLoading, setLlmLoading] = useState(false);
  const [showDownload, setShowDownload] = useState(false);
  const [offlineMode, setOfflineMode]   = useState(false);
  const flatRef = useRef(null);
  const insets  = useSafeAreaInsets();

  // Pre-fill input from navigation params (e.g. from DiagnoseResultScreen)
  useEffect(() => {
    const prefill = route.params?.prefillMessage;
    if (prefill) {
      setInput(prefill);
    }
  }, [route.params?.prefillMessage]);

  // ── Online suggestions query ──────────────────────────────────────────────
  const { data: suggestions = OFFLINE_SUGGESTIONS } = useQuery({
    queryKey: ['chat-suggestions'],
    queryFn: fetchChatSuggestions,
    retry: 1,
    staleTime: 10 * 60 * 1000,
  });

  // ── Check LLM status on focus ─────────────────────────────────────────────
  useFocusEffect(
    useCallback(() => {
      checkLLMStatus();
    }, [])
  );

  const checkLLMStatus = async () => {
    const downloaded = await LLM.isModelDownloaded();
    if (downloaded) {
      setLlmReady(LLM.isModelReady());
      // Warm up model in background if downloaded but not yet loaded
      if (!LLM.isModelReady()) {
        setLlmLoading(true);
        LLM.initModel().then(ok => {
          setLlmReady(ok);
          setLlmLoading(false);
        });
      }
    }
  };

  // ── Online mutation (falls back to offline) ───────────────────────────────
  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (reply) => {
      setMessages(prev => [...prev, { role: 'bot', text: reply, source: 'online' }]);
    },
    onError: () => {
      // Server unreachable — fall back to local LLM
      const lastUserMsg = messages[messages.length - 1];
      if (lastUserMsg) runLocalLLM(lastUserMsg.text);
    },
  });

  // ── Scroll helpers ────────────────────────────────────────────────────────
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages]);

  // ── Local LLM streaming ───────────────────────────────────────────────────
  const [streamingIdx, setStreamingIdx] = useState(null); // index of in-progress bot msg

  const runLocalLLM = async (userText) => {
    if (!LLM.isModelReady()) {
      // Model not yet loaded — try init
      setLlmLoading(true);
      const ok = await LLM.initModel();
      setLlmLoading(false);
      if (!ok) {
        setMessages(prev => [
          ...prev,
          {
            role: 'bot',
            text: 'Offline AI is not ready yet. Please download the model from the banner above.',
            source: 'error',
          },
        ]);
        return;
      }
    }

    setOfflineMode(true);

    // Add placeholder bot message that we'll stream into
    const botMsgIdx = messages.length; // position of new bot msg
    setMessages(prev => [
      ...prev,
      { role: 'bot', text: '', source: 'llm', streaming: true },
    ]);
    setStreamingIdx(botMsgIdx);

    // Build history for context (last 6 messages)
    const history = messages
      .slice(-6)
      .map(m => ({ role: m.role === 'user' ? 'user' : 'assistant', content: m.text }));
    history.push({ role: 'user', content: userText });

    try {
      await LLM.chat(
        history,
        (token) => {
          // Append each token to the last bot message
          setMessages(prev => {
            const updated = [...prev];
            const last    = updated[updated.length - 1];
            if (last?.role === 'bot' && last.streaming) {
              updated[updated.length - 1] = { ...last, text: last.text + token };
            }
            return updated;
          });
          setTimeout(() => flatRef.current?.scrollToEnd({ animated: false }), 50);
        }
      );
    } catch (err) {
      console.error('[Chat] LLM error:', err?.message || err);
    } finally {
      // Mark streaming complete
      setMessages(prev => {
        const updated = [...prev];
        const last    = updated[updated.length - 1];
        if (last?.role === 'bot') {
          updated[updated.length - 1] = { ...last, streaming: false };
        }
        return updated;
      });
      setStreamingIdx(null);
    }
  };

  // ── Send handler ──────────────────────────────────────────────────────────
  const isPending = mutation.isPending || streamingIdx !== null || llmLoading;
  const canSend   = input.trim().length > 0 && !isPending;

  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;

    const history  = messages.slice(-8);
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: msg }]);

    // Check if offline LLM is available and should be preferred
    const downloaded = await LLM.isModelDownloaded();
    if (downloaded) {
      // Use local LLM directly
      runLocalLLM(msg);
    } else {
      // Try online first; onError will show download prompt
      mutation.mutate({ message: msg, history });
    }
  };

  // ── Render message ────────────────────────────────────────────────────────
  const renderMessage = ({ item }) => {
    const isUser = item.role === 'user';
    const isLLM  = item.source === 'llm';

    return (
      <View style={[styles.msgWrap, isUser ? styles.msgWrapUser : styles.msgWrapBot]}>
        {!isUser && (
          <View style={[styles.botAvatar, isLLM && styles.botAvatarLLM]}>
            <Text style={{ fontSize: 14 }}>{isLLM ? '🤖' : '🌱'}</Text>
          </View>
        )}
        <View style={[styles.msg, isUser ? styles.msgUser : styles.msgBot]}>
          {isUser ? (
            <Text style={styles.msgUserText}>{item.text}</Text>
          ) : (
            <>
              <Markdown style={mdStyles}>{item.text || ' '}</Markdown>
              {item.streaming && (
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 4 }}>
                  <ActivityIndicator size="small" color={colors.accentGreen} />
                  <Text style={{ fontSize: 10, color: colors.textGrey }}>Generating…</Text>
                </View>
              )}
              {isLLM && !item.streaming && (
                <View style={styles.llmBadge}>
                  <Ionicons name="hardware-chip-outline" size={10} color="#6d28d9" />
                  <Text style={styles.llmBadgeText}>Offline AI</Text>
                </View>
              )}
            </>
          )}
        </View>
      </View>
    );
  };

  // ── JSX ───────────────────────────────────────────────────────────────────
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={[styles.chatHeaderAvatar, offlineMode && styles.chatHeaderAvatarLLM]}>
          <Text style={{ fontSize: 18 }}>{offlineMode ? '🤖' : '🌱'}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.chatHeaderTitle}>Farm Assistant</Text>
          <Text style={styles.chatHeaderSub}>
            {llmLoading
              ? 'Loading offline AI…'
              : offlineMode
              ? '🤖 Qwen2.5 · Offline'
              : 'AI-powered farming advisor'}
          </Text>
        </View>
        {/* Status dot */}
        <View
          style={[
            styles.onlineDot,
            isPending && styles.onlineDotLoading,
            offlineMode && !isPending && styles.onlineDotLLM,
          ]}
        />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        {messages.length === 0 ? (
          <FlatList
            ref={flatRef}
            data={suggestions}
            keyExtractor={(_, i) => `sug-${i}`}
            ListHeaderComponent={
              <>
                <CardElevated style={{ margin: 16, alignItems: 'center', paddingVertical: 28 }}>
                  <Text style={{ fontSize: 40 }}>👨‍🌾</Text>
                  <Text style={styles.welcomeTitle}>Hello, Farmer!</Text>
                  <Text style={styles.welcomeSub}>
                    Ask anything about crops, disease, irrigation, or market planning.
                  </Text>
                  {llmLoading && (
                    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}>
                      <ActivityIndicator size="small" color={colors.accentGreen} />
                      <Text style={{ fontSize: typography.xs, color: colors.textGrey }}>
                        Loading offline AI…
                      </Text>
                    </View>
                  )}
                </CardElevated>

                {/* Download banner — shown only if model not on device */}
                {showDownload && (
                  <LLMDownloadBanner
                    onDownloadComplete={() => {
                      setShowDownload(false);
                      checkLLMStatus();
                    }}
                    onDismiss={() => setShowDownload(false)}
                  />
                )}
                {!showDownload && !llmReady && !llmLoading && (
                  <TouchableOpacity
                    style={styles.downloadHint}
                    onPress={() => setShowDownload(true)}
                    activeOpacity={0.85}
                  >
                    <Ionicons name="cloud-download-outline" size={16} color="#6d28d9" />
                    <Text style={styles.downloadHintText}>
                      Enable Offline AI (Qwen2.5 · ~990 MB)
                    </Text>
                    <Ionicons name="chevron-forward-outline" size={14} color="#6d28d9" />
                  </TouchableOpacity>
                )}
              </>
            }
            renderItem={({ item }) => (
              <TouchableOpacity
                style={styles.sugChip}
                onPress={() => handleSend(item)}
                activeOpacity={0.82}
              >
                <Ionicons name="chatbubble-ellipses-outline" size={16} color={colors.accentGreen} />
                <Text style={styles.sugText}>{item}</Text>
                <Ionicons name="chevron-forward-outline" size={14} color={colors.primaryGreen} />
              </TouchableOpacity>
            )}
            contentContainerStyle={{ paddingBottom: 16 }}
            showsVerticalScrollIndicator={false}
          />
        ) : (
          <FlatList
            ref={flatRef}
            data={messages}
            keyExtractor={(_, i) => `msg-${i}`}
            renderItem={renderMessage}
            contentContainerStyle={{ padding: 16, gap: 12 }}
            showsVerticalScrollIndicator={false}
            ListHeaderComponent={
              showDownload ? (
                <LLMDownloadBanner
                  onDownloadComplete={() => {
                    setShowDownload(false);
                    checkLLMStatus();
                  }}
                  onDismiss={() => setShowDownload(false)}
                />
              ) : null
            }
            ListFooterComponent={
              mutation.isPending ? (
                <View style={[styles.msgWrap, styles.msgWrapBot]}>
                  <View style={styles.botAvatar}>
                    <Text style={{ fontSize: 14 }}>🌱</Text>
                  </View>
                  <View style={[styles.msg, styles.msgBot, { paddingHorizontal: 16, paddingVertical: 12 }]}>
                    <View style={{ flexDirection: 'row', gap: 4, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={colors.accentGreen} />
                      <Text style={{ fontSize: typography.xs, color: colors.textGrey }}>Thinking…</Text>
                    </View>
                  </View>
                </View>
              ) : null
            }
            onContentSizeChange={() => flatRef.current?.scrollToEnd({ animated: true })}
          />
        )}

        {/* ── Input Bar ── */}
        <View style={[styles.inputBar, { paddingBottom: Math.max(insets.bottom, 8) }]}>
          <TextInput
            style={styles.input}
            placeholder="Ask about farming, crops, diseases…"
            placeholderTextColor={colors.textGrey}
            value={input}
            onChangeText={setInput}
            onSubmitEditing={() => handleSend(input)}
            returnKeyType="send"
            multiline
            maxLength={500}
          />
          <TouchableOpacity
            style={[styles.sendBtn, !canSend && styles.sendBtnDisabled]}
            onPress={() => handleSend(input)}
            disabled={!canSend}
            activeOpacity={0.85}
          >
            {isPending
              ? <ActivityIndicator size="small" color="#fff" />
              : <Ionicons name="send" size={18} color="#fff" />
            }
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

// ── Styles ────────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },

  chatHeader: {
    backgroundColor: '#fff', flexDirection: 'row', alignItems: 'center',
    padding: 14, gap: 10, borderBottomWidth: 1, borderBottomColor: colors.borderSoft,
    ...shadows.card,
  },
  chatHeaderAvatar: {
    width: 44, height: 44, borderRadius: 22,
    backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center',
    borderWidth: 2, borderColor: colors.accentGreen,
  },
  chatHeaderAvatarLLM: {
    backgroundColor: '#ede9fe', borderColor: '#7c3aed',
  },
  chatHeaderTitle: { fontSize: typography.md, fontWeight: '800', color: colors.textDark },
  chatHeaderSub:   { fontSize: typography.xs, color: colors.textGrey },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.accentGreen, marginLeft: 'auto',
  },
  onlineDotLoading: { backgroundColor: colors.warning },
  onlineDotLLM: { backgroundColor: '#7c3aed' },

  welcomeTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.textDark, marginTop: 12, textAlign: 'center' },
  welcomeSub:   { fontSize: typography.sm, color: colors.textGrey, marginTop: 8, textAlign: 'center', lineHeight: 20 },

  downloadHint: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#f5f3ff', borderRadius: radii.md, padding: 14,
    marginHorizontal: 16, marginBottom: 12,
    borderWidth: 1, borderColor: '#ddd6fe',
    ...shadows.card,
  },
  downloadHintText: { flex: 1, fontSize: typography.sm, color: '#6d28d9', fontWeight: '600' },

  sugChip: {
    flexDirection: 'row', alignItems: 'center', gap: 10,
    backgroundColor: '#fff', borderRadius: radii.md, padding: 14,
    marginHorizontal: 16, marginBottom: 8,
    borderWidth: 1, borderColor: colors.borderSoft,
    ...shadows.card,
  },
  sugText: { fontSize: typography.sm, color: '#1b5e20', flex: 1, fontWeight: '500', lineHeight: 19 },

  msgWrap: { flexDirection: 'row', gap: 8, alignItems: 'flex-end' },
  msgWrapUser: { justifyContent: 'flex-end' },
  msgWrapBot:  { justifyContent: 'flex-start' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.lightGreen,
    alignItems: 'center', justifyContent: 'center', flexShrink: 0,
  },
  botAvatarLLM: { backgroundColor: '#ede9fe' },
  msg: {
    maxWidth: '80%', borderRadius: 18, padding: 12, ...shadows.card,
  },
  msgUser: { backgroundColor: colors.primaryGreen, borderBottomRightRadius: 4 },
  msgBot:  { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  msgUserText: { color: '#fff', fontSize: typography.sm, lineHeight: 20 },

  llmBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 3,
    marginTop: 6, alignSelf: 'flex-start',
    backgroundColor: '#f5f3ff', borderRadius: 8,
    paddingHorizontal: 6, paddingVertical: 2,
  },
  llmBadgeText: { fontSize: 9, fontWeight: '700', color: '#6d28d9' },

  inputBar: {
    flexDirection: 'row', alignItems: 'flex-end', gap: 8,
    paddingHorizontal: 12, paddingTop: 8,
    backgroundColor: '#fff',
    borderTopWidth: 1, borderTopColor: colors.borderSoft,
  },
  input: {
    flex: 1, backgroundColor: colors.backgroundGreen,
    borderRadius: 20, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: typography.md, color: colors.textDark, maxHeight: 100,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  sendBtn: {
    width: 46, height: 46, borderRadius: 23,
    backgroundColor: colors.accentGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  sendBtnDisabled: { opacity: 0.45 },
});

const mdStyles = {
  body:             { color: colors.textDark, fontSize: 14, lineHeight: 20 },
  strong:           { fontWeight: '700' },
  bullet_list_icon: { color: colors.accentGreen },
};
