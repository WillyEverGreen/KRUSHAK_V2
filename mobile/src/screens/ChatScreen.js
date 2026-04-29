import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  FlatList, KeyboardAvoidingView, Platform, ActivityIndicator,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMutation, useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import Markdown from 'react-native-markdown-display';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchChatSuggestions, sendChatMessage } from '../services/api';
import { CardElevated } from '../components/UIKit';

export default function ChatScreen() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState([]);
  const flatRef = useRef(null);
  const insets = useSafeAreaInsets();

  const { data: suggestions = [] } = useQuery({
    queryKey: ['chat-suggestions'],
    queryFn: fetchChatSuggestions,
  });

  const mutation = useMutation({
    mutationFn: sendChatMessage,
    onSuccess: (reply) => {
      setMessages((prev) => [...prev, { role: 'bot', text: reply }]);
    },
    onError: () => {
      setMessages((prev) => [
        ...prev,
        { role: 'bot', text: 'Sorry, I could not process your request. Please try again.' },
      ]);
    },
  });

  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => flatRef.current?.scrollToEnd({ animated: true }), 120);
    }
  }, [messages, mutation.isPending]);

  const canSend = input.trim().length > 0 && !mutation.isPending;

  const handleSend = (text) => {
    const msg = (text || input).trim();
    if (!msg) return;
    const history = messages.slice(-8);
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', text: msg }]);
    mutation.mutate({ message: msg, history });
  };

  const renderMessage = ({ item, index }) => {
    const isUser = item.role === 'user';
    return (
      <View key={index} style={[styles.msgWrap, isUser ? styles.msgWrapUser : styles.msgWrapBot]}>
        {!isUser && (
          <View style={styles.botAvatar}>
            <Text style={{ fontSize: 14 }}>🌱</Text>
          </View>
        )}
        <View style={[styles.msg, isUser ? styles.msgUser : styles.msgBot]}>
          {isUser ? (
            <Text style={styles.msgUserText}>{item.text}</Text>
          ) : (
            <Markdown style={mdStyles}>{item.text}</Markdown>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.chatHeader}>
        <View style={styles.chatHeaderAvatar}>
          <Text style={{ fontSize: 18 }}>🌱</Text>
        </View>
        <View>
          <Text style={styles.chatHeaderTitle}>Farm Assistant</Text>
          <Text style={styles.chatHeaderSub}>AI-powered farming advisor</Text>
        </View>
        <View style={[styles.onlineDot, mutation.isPending && styles.onlineDotLoading]} />
      </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        {/* Messages / Suggestions */}
        {messages.length === 0 ? (
          <FlatList
            ref={flatRef}
            data={suggestions}
            keyExtractor={(item, i) => `sug-${i}`}
            ListHeaderComponent={
              <CardElevated style={{ margin: 16, alignItems: 'center', paddingVertical: 28 }}>
                <Text style={{ fontSize: 40 }}>👨‍🌾</Text>
                <Text style={styles.welcomeTitle}>Hello, Farmer!</Text>
                <Text style={styles.welcomeSub}>Ask anything about crops, disease, irrigation, or market planning.</Text>
              </CardElevated>
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
            <Ionicons name="send" size={18} color="#fff" />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

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
  chatHeaderTitle: { fontSize: typography.md, fontWeight: '800', color: colors.textDark },
  chatHeaderSub: { fontSize: typography.xs, color: colors.textGrey },
  onlineDot: {
    width: 10, height: 10, borderRadius: 5,
    backgroundColor: colors.accentGreen, marginLeft: 'auto',
  },
  onlineDotLoading: { backgroundColor: colors.warning },

  welcomeTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.textDark, marginTop: 12, textAlign: 'center' },
  welcomeSub: { fontSize: typography.sm, color: colors.textGrey, marginTop: 8, textAlign: 'center', lineHeight: 20 },

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
  msgWrapBot: { justifyContent: 'flex-start' },
  botAvatar: {
    width: 30, height: 30, borderRadius: 15,
    backgroundColor: colors.lightGreen,
    alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
  },
  msg: {
    maxWidth: '80%', borderRadius: 18, padding: 12,
    ...shadows.card,
  },
  msgUser: { backgroundColor: colors.primaryGreen, borderBottomRightRadius: 4 },
  msgBot: { backgroundColor: '#fff', borderBottomLeftRadius: 4 },
  msgUserText: { color: '#fff', fontSize: typography.sm, lineHeight: 20 },

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
  body: { color: colors.textDark, fontSize: 14, lineHeight: 20 },
  strong: { fontWeight: '700' },
  bullet_list_icon: { color: colors.accentGreen },
};
