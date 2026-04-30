import React, { useState } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchRecentDiagnoses } from '../services/api';
import { Card, CardElevated } from '../components/UIKit';

const STATIC_IRRIGATION_GUIDE = {
  intro: 'Standard irrigation template for daily farm operations. Adjust after field moisture checks.',
  items: [
    { icon: 'water-outline', label: 'Today', text: 'Maintain planned irrigation cycle. Do a morning soil-moisture check before opening full flow.' },
    { icon: 'time-outline', label: 'Timing', text: 'Best window: 5:30 AM – 8:00 AM. Use evening cycle only when needed.' },
    { icon: 'calendar-outline', label: 'Frequency', text: 'Irrigate every 2–3 days for most field crops under normal conditions.' },
    { icon: 'resize-outline', label: 'Water Depth', text: 'Apply about 18–25 mm water per cycle for established crops.' },
    { icon: 'options-outline', label: 'Method', text: 'Prefer root-zone irrigation (drip/furrow) to reduce evaporation and foliage disease.' },
    { icon: 'leaf-outline', label: 'Adjustment', text: 'If top 5 cm soil stays wet, delay next cycle by 12–24 h. If leaves droop before noon, advance next cycle.' },
  ],
  checklist: [
    'Check 5 cm soil depth in 3 field spots before irrigation.',
    'Avoid midday irrigation to reduce evaporation loss.',
    'Inspect channels/emitters weekly for uniform flow.',
    'Prevent standing water in low patches after each cycle.',
    'Keep mulch around root zone to preserve moisture.',
  ],
};

const CARE_ITEMS = [
  { icon: 'water-outline', label: 'Water', text: 'Water every 2–3 days, keep soil moist but not waterlogged.' },
  { icon: 'sunny-outline', label: 'Sunlight', text: '6–8 hours of direct sunlight daily.' },
  { icon: 'flask-outline', label: 'Fertilizer', text: 'Use organic fertilizer every 2 weeks during growing season.' },
  { icon: 'bug-outline', label: 'Pests', text: 'Inspect regularly for aphids and caterpillars. Use neem oil if needed.' },
];

function GuideLine({ icon, label, text }) {
  return (
    <View style={styles.guideLine}>
      <View style={styles.guideIcon}>
        <Ionicons name={icon} size={14} color={colors.primaryGreen} />
      </View>
      <View style={{ flex: 1 }}>
        <Text style={styles.guideLabel}>{label}</Text>
        <Text style={styles.guideText}>{text}</Text>
      </View>
    </View>
  );
}

export default function CareGuidesScreen() {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation();
  const { data: recentDiagnoses = [] } = useQuery({
    queryKey: ['care-recent-diagnoses'],
    queryFn: fetchRecentDiagnoses,
  });

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 16 }]} showsVerticalScrollIndicator={false}>
        <Text style={styles.pageTitle}>Care Guides</Text>

      {/* AI Irrigation Guides */}
      <TouchableOpacity onPress={() => navigation.navigate('CropIrrigationGuide')} activeOpacity={0.85}>
        <CardElevated style={{ marginTop: 16, backgroundColor: '#eff6ff', borderColor: '#bfdbfe', borderWidth: 1 }}>
          <View style={[styles.cardHeader, { marginBottom: 4 }]}>
            <View style={[styles.cardHeaderIcon, { backgroundColor: '#dbeafe' }]}>
              <Ionicons name="hardware-chip-outline" size={18} color="#2563eb" />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[styles.cardTitle, { color: '#1d4ed8' }]}>AI Crop Guides</Text>
              <Text style={{ fontSize: typography.sm, color: '#3b82f6', marginTop: 2 }}>Personalized AI irrigation instructions</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#3b82f6" />
          </View>
        </CardElevated>
      </TouchableOpacity>

      {/* Irrigation Guide */}
      <CardElevated style={{ marginTop: 16 }}>
        <View style={styles.cardHeader}>
          <View style={styles.cardHeaderIcon}>
            <Ionicons name="water-outline" size={18} color={colors.primaryGreen} />
          </View>
          <Text style={styles.cardTitle}>Irrigation Guide</Text>
        </View>
        <Text style={styles.intro}>{STATIC_IRRIGATION_GUIDE.intro}</Text>
        {STATIC_IRRIGATION_GUIDE.items.map((item) => (
          <GuideLine key={item.label} icon={item.icon} label={item.label} text={item.text} />
        ))}
        {/* Checklist */}
        <View style={styles.checklist}>
          <View style={styles.checklistHeader}>
            <Ionicons name="checkmark-circle-outline" size={16} color={colors.primaryGreen} />
            <Text style={styles.checklistTitle}>Field Checklist</Text>
          </View>
          {STATIC_IRRIGATION_GUIDE.checklist.map((item, i) => (
            <View key={i} style={styles.checkItem}>
              <Ionicons name="checkmark-circle" size={13} color="#43a047" style={{ marginTop: 2 }} />
              <Text style={styles.checkText}>{item}</Text>
            </View>
          ))}
        </View>
      </CardElevated>

      {/* Care Guide */}
      <CardElevated style={{ marginTop: 16 }}>
        <Text style={styles.cardTitle}>General Care Guide</Text>
        {CARE_ITEMS.map((item) => (
          <GuideLine key={item.label} icon={item.icon} label={item.label} text={item.text} />
        ))}
      </CardElevated>

      {/* Recent Diagnoses */}
      <Text style={[styles.pageTitle, { marginTop: 20 }]}>Diagnosis History</Text>
      {recentDiagnoses.length === 0 ? (
        <Card style={{ marginTop: 10 }}>
          <Text style={{ fontSize: typography.sm, color: colors.textGrey }}>No diagnosis history available yet.</Text>
        </Card>
      ) : (
        <View style={{ gap: 10, marginTop: 10 }}>
          {recentDiagnoses.map((rec, i) => (
            <Card key={rec._id || i}>
              <Text style={styles.diagTitle}>{rec.diseaseName || 'Unknown Disease'}</Text>
              {rec.confidence && (
                <Text style={styles.diagConf}>{Math.round(rec.confidence * 100)}% confidence</Text>
              )}
              {rec.createdAt && (
                <Text style={styles.diagDate}>{new Date(rec.createdAt).toLocaleString()}</Text>
              )}
            </Card>
          ))}
        </View>
      )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { padding: spacing.lg },
  pageTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.textDark },
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 10 },
  cardHeaderIcon: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#e3f5ea', alignItems: 'center', justifyContent: 'center' },
  cardTitle: { fontSize: typography.xl, fontWeight: '700', color: colors.textDark },
  intro: { fontSize: typography.sm, color: '#33513a', lineHeight: 20, marginBottom: 8 },
  guideLine: { flexDirection: 'row', alignItems: 'flex-start', gap: 10, marginTop: 12 },
  guideIcon: { width: 24, height: 24, borderRadius: 8, backgroundColor: '#edf7ef', alignItems: 'center', justifyContent: 'center', marginTop: 1, flexShrink: 0 },
  guideLabel: { fontSize: typography.sm, fontWeight: '700', color: '#1f2937' },
  guideText: { fontSize: typography.sm, color: '#374151', lineHeight: 19 },
  checklist: { backgroundColor: '#f2f9f3', borderWidth: 1, borderColor: '#dbeedc', borderRadius: 12, padding: 12, marginTop: 12 },
  checklistHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  checklistTitle: { fontSize: typography.sm, fontWeight: '700', color: '#1b5e20' },
  checkItem: { flexDirection: 'row', alignItems: 'flex-start', gap: 8, marginTop: 8 },
  checkText: { fontSize: typography.xs, color: '#33513a', lineHeight: 19, flex: 1 },
  diagTitle: { fontSize: typography.md, fontWeight: '700', color: colors.primaryGreen },
  diagConf: { fontSize: typography.xs, color: colors.textGrey, marginTop: 4 },
  diagDate: { fontSize: typography.xs, color: colors.textGrey, marginTop: 2 },
});
