import React, { useEffect, useState } from 'react';
import { View, Text, ScrollView, StyleSheet, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, spacing, typography, radii, shadows } from '../theme/tokens';
import { CardElevated, SectionBox } from '../components/UIKit';
import { getIrrigationGuides } from '../services/aiGuideService';
import { useQuery } from '@tanstack/react-query';

export default function CropIrrigationGuideScreen() {
  const navigation = useNavigation();

  // Poll local storage to see if new guides are generated
  const { data: guides = {} } = useQuery({
    queryKey: ['ai-irrigation-guides'],
    queryFn: getIrrigationGuides,
    refetchInterval: 3000, // check every 3s in case generating in background
  });

  const guideList = Object.entries(guides).map(([cropId, guide]) => ({
    id: cropId,
    ...guide,
  })).sort((a, b) => b.timestamp - a.timestamp);

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>AI Irrigation Guides</Text>
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {guideList.length === 0 ? (
          <View style={{ marginTop: 20, alignItems: 'center' }}>
            <Ionicons name="leaf-outline" size={48} color={colors.borderSoft} />
            <Text style={{ marginTop: 12, color: colors.textGrey, fontSize: typography.sm }}>No AI guides yet.</Text>
            <Text style={{ marginTop: 4, color: colors.textGrey, fontSize: typography.xs }}>Add a crop in My Farm to generate one automatically.</Text>
          </View>
        ) : (
          <View style={{ gap: 16 }}>
            {guideList.map((guide) => (
              <CardElevated key={guide.id}>
                <View style={styles.cardHeader}>
                  <View style={styles.iconWrapper}>
                    <Ionicons name="water" size={18} color="#2563eb" />
                  </View>
                  <Text style={styles.cropName}>{guide.cropName || 'Crop'}</Text>
                  
                  {guide.status === 'generating' && (
                    <View style={[styles.statusBadge, { backgroundColor: '#fef3c7', borderColor: '#fde68a' }]}>
                      <Ionicons name="time-outline" size={12} color="#d97706" />
                      <Text style={[styles.statusText, { color: '#d97706' }]}>Generating</Text>
                    </View>
                  )}
                  {guide.status === 'failed' && (
                    <View style={[styles.statusBadge, { backgroundColor: '#fee2e2', borderColor: '#fecaca' }]}>
                      <Ionicons name="close-circle-outline" size={12} color="#dc2626" />
                      <Text style={[styles.statusText, { color: '#dc2626' }]}>Failed</Text>
                    </View>
                  )}
                </View>
                
                <View style={styles.guideContent}>
                  {guide.status === 'generating' ? (
                    <Text style={styles.generatingText}>Our local AI is writing a guide for this crop...</Text>
                  ) : (
                    <Text style={styles.guideText}>{guide.text}</Text>
                  )}
                </View>
                <Text style={styles.dateText}>Generated {new Date(guide.timestamp).toLocaleDateString()}</Text>
              </CardElevated>
            ))}
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  header: {
    backgroundColor: colors.primaryGreen,
    paddingHorizontal: spacing.lg,
    paddingVertical: 14,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minHeight: 60,
  },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: typography.lg, fontWeight: '800', color: '#fff', flex: 1 },
  scroll: { padding: spacing.lg },
  
  cardHeader: { flexDirection: 'row', alignItems: 'center', gap: 10, marginBottom: 12 },
  iconWrapper: { width: 34, height: 34, borderRadius: 10, backgroundColor: '#eff6ff', alignItems: 'center', justifyContent: 'center' },
  cropName: { fontSize: typography.md, fontWeight: '800', color: colors.textDark, flex: 1 },
  
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, borderWidth: 1 },
  statusText: { fontSize: 10, fontWeight: '700' },
  
  guideContent: { backgroundColor: '#f9fafb', borderRadius: radii.sm, padding: 12, borderWidth: 1, borderColor: '#f3f4f6' },
  guideText: { fontSize: typography.sm, color: '#374151', lineHeight: 22 },
  generatingText: { fontSize: typography.sm, color: colors.textGrey, fontStyle: 'italic' },
  
  dateText: { fontSize: 11, color: colors.textGrey, marginTop: 12, textAlign: 'right' },
});
