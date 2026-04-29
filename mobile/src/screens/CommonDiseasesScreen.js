import React from 'react';
import {
  View, Text, StyleSheet, ScrollView,
  ActivityIndicator, TouchableOpacity
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchDiseaseCatalog, fetchDiseaseAdvisory } from '../services/api';
import { CardElevated, ErrorState, Tag } from '../components/UIKit';

export default function CommonDiseasesScreen() {
  const { data: catalogData, isLoading: catalogLoading, error: catalogError } = useQuery({
    queryKey: ['disease-catalog'],
    queryFn: () => fetchDiseaseCatalog(),
    staleTime: 5 * 60 * 1000,
  });

  const { data: advisoryData, isLoading: advisoryLoading } = useQuery({
    queryKey: ['disease-advisory'],
    queryFn: fetchDiseaseAdvisory,
    staleTime: 5 * 60 * 1000,
  });

  const isLoading = catalogLoading || advisoryLoading;

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.accentGreen} />
      </View>
    );
  }

  if (catalogError) {
    return (
      <View style={styles.centerContainer}>
        <ErrorState title="Failed to load" message="Could not load common diseases." />
      </View>
    );
  }

  const diseases = catalogData?.diseases || [];
  const advisory = advisoryData?.alerts || [];
  const currentSeason = advisoryData?.season || catalogData?.season || 'Current';

  return (
    <SafeAreaView style={styles.root} edges={['bottom']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        {/* Live Advisory Section */}
        {advisory.length > 0 && (
          <View style={styles.advisorySection}>
            <View style={styles.advisoryHeader}>
              <View style={styles.row}>
                <Ionicons name="warning-outline" size={20} color="#b45309" />
                <Text style={styles.sectionTitle}>Live {currentSeason} Advisory</Text>
              </View>
              <View style={styles.liveBadge}>
                <View style={styles.liveDot} />
                <Text style={styles.liveText}>Live</Text>
              </View>
            </View>
            
            <Text style={styles.advisorySubtitle}>{advisoryData?.message}</Text>

            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.advisoryScroll}>
              {advisory.map((alert, idx) => (
                <CardElevated key={idx} style={styles.advisoryCard}>
                  <View style={styles.rowBetween}>
                    <Text style={styles.advisoryCrop}>{alert.crop}</Text>
                    <Tag label={alert.severity} variant="danger" />
                  </View>
                  <Text style={styles.advisoryDisease}>{alert.disease}</Text>
                  <Text style={styles.advisorySymptom} numberOfLines={3}>{alert.symptom}</Text>
                </CardElevated>
              ))}
            </ScrollView>
          </View>
        )}

        {/* Common Diseases List */}
        <View style={styles.listSection}>
          <Text style={styles.sectionTitle}>Common Diseases</Text>
          
          <View style={styles.listContainer}>
            {diseases.map((disease, idx) => (
              <CardElevated key={idx} style={styles.diseaseCard}>
                <View style={styles.rowBetween}>
                  <Text style={styles.diseaseTitle}>{disease.name}</Text>
                  <Tag label={disease.severity} variant={disease.severity === 'High' ? 'danger' : disease.severity === 'Medium' ? 'warning' : 'default'} />
                </View>
                <Text style={styles.diseaseCrop}>Crop: {disease.crop}</Text>
                <Text style={styles.diseaseSymptom}>{disease.symptom}</Text>
              </CardElevated>
            ))}
          </View>
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { flex: 1 },
  scrollContent: { paddingVertical: spacing.md },
  centerContainer: { flex: 1, backgroundColor: colors.backgroundGreen, alignItems: 'center', justifyContent: 'center' },
  
  row: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  rowBetween: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  
  sectionTitle: { fontSize: typography.lg, fontWeight: '800', color: colors.textDark },
  
  advisorySection: { marginBottom: 24 },
  advisoryHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, paddingHorizontal: spacing.md },
  advisorySubtitle: { fontSize: typography.sm, color: colors.textGrey, marginBottom: 12, paddingLeft: spacing.md + 26, paddingRight: spacing.md },
  advisoryScroll: { gap: 12, paddingHorizontal: spacing.md },
  advisoryCard: { width: 260, backgroundColor: '#fffbf2', borderColor: '#fef3c7', borderWidth: 1, padding: 14, ...shadows.card },
  advisoryCrop: { fontSize: typography.xs, fontWeight: '700', color: colors.textGrey },
  advisoryDisease: { fontSize: typography.md, fontWeight: '800', color: '#b45309', marginTop: 2, marginBottom: 6 },
  advisorySymptom: { fontSize: typography.sm, color: colors.textGrey, lineHeight: 20 },

  liveBadge: {
    flexDirection: 'row', alignItems: 'center', gap: 4,
    backgroundColor: '#dcfce7', paddingHorizontal: 8, paddingVertical: 4,
    borderRadius: 12, borderWidth: 1, borderColor: '#bbf7d0'
  },
  liveDot: { width: 6, height: 6, borderRadius: 3, backgroundColor: colors.primaryGreen },
  liveText: { fontSize: 10, fontWeight: '800', color: colors.primaryGreen, textTransform: 'uppercase' },

  listSection: { paddingHorizontal: spacing.md },
  listContainer: { gap: 12, marginTop: 12 },
  diseaseCard: { padding: 16 },
  diseaseTitle: { fontSize: typography.md, fontWeight: '800', color: colors.textDark },
  diseaseCrop: { fontSize: typography.xs, fontWeight: '600', color: colors.textGrey, marginTop: 4, marginBottom: 8 },
  diseaseSymptom: { fontSize: typography.sm, color: colors.textGrey, lineHeight: 20 },
  severityText: { fontSize: typography.xs, fontWeight: '800' },
});
