import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { Card } from '../components/UIKit';

const FAQ_DATA = [
  {
    q: 'How do I diagnose a plant disease?',
    a: 'Go to the Diagnose tab, take a clear photo of the affected plant part (leaf, stem, or fruit), and our AI will analyze it and give you a diagnosis with treatment recommendations.',
  },
  {
    q: 'Does the app work offline?',
    a: 'Yes! Most screens show cached data offline. You can view your farm data, past diagnoses, and news without internet. When you reconnect, data syncs automatically.',
  },
  {
    q: 'How accurate is the AI plant diagnosis?',
    a: 'The AI model is trained on thousands of crop disease images. It provides high accuracy but always verify with a local agricultural expert for critical decisions.',
  },
  {
    q: 'How do I add crops to My Farm?',
    a: "Go to the My Farm tab, select the Crops section, then tap the + Add button. Enter the crop name and any other details you'd like to track.",
  },
  {
    q: 'Where does the market price data come from?',
    a: 'Market prices are fetched from government mandi data and agricultural APIs, updated daily.',
  },
  {
    q: 'How do I get local news?',
    a: 'In the News screen, tap the "Local" tab and allow location access. The app will fetch agriculture news relevant to your area.',
  },
  {
    q: 'Is my farm data private?',
    a: 'Yes. All your farm data is stored securely on your device and our servers. We never sell your data to third parties.',
  },
  {
    q: 'How do I change my profile details?',
    a: 'Go to the Profile tab and tap the Edit button to update your name, village, district, and language preference.',
  },
  {
    q: 'What if the AI chat is unavailable?',
    a: 'The AI chat requires an internet connection. If offline, you can still view past chat history but cannot send new messages.',
  },
  {
    q: 'How do I reset my password?',
    a: 'On the login screen, contact support at support@krushak.in to request a password reset.',
  },
];

function FaqItem({ q, a }) {
  const [open, setOpen] = useState(false);
  return (
    <Card style={styles.faqCard}>
      <TouchableOpacity style={styles.faqHeader} onPress={() => setOpen((o) => !o)} activeOpacity={0.8}>
        <Text style={styles.faqQ}>{q}</Text>
        <Ionicons
          name={open ? 'chevron-up-outline' : 'chevron-down-outline'}
          size={18}
          color={colors.primaryGreen}
        />
      </TouchableOpacity>
      {open && <Text style={styles.faqA}>{a}</Text>}
    </Card>
  );
}

export default function FaqScreen() {
  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={styles.pageHeader}>
          <Text style={styles.headerTitle}>Help & FAQ</Text>
          <Text style={styles.headerSub}>Frequently asked questions</Text>
        </View>

        <View style={{ gap: 10, marginTop: 16 }}>
          {FAQ_DATA.map((item, i) => (
            <FaqItem key={i} q={item.q} a={item.a} />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { padding: spacing.lg },
  pageHeader: {
    backgroundColor: colors.accentGreen, borderRadius: 24,
    padding: 20, ...shadows.hero,
  },
  headerTitle: { fontSize: typography.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: typography.sm, color: 'rgba(255,255,255,0.86)', marginTop: 4 },
  faqCard: { padding: 14, ...shadows.card },
  faqHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  faqQ: { flex: 1, fontSize: typography.md, fontWeight: '700', color: colors.textDark, lineHeight: 20 },
  faqA: { fontSize: typography.sm, color: colors.textGrey, lineHeight: 20, marginTop: 10, paddingTop: 10, borderTopWidth: 1, borderTopColor: colors.borderSoft },
});
