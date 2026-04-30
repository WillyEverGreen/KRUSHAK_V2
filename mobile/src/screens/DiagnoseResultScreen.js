import React, { useRef } from 'react';
import {
  View, Text, ScrollView, Image, StyleSheet,
  TouchableOpacity, Alert, Animated,
} from 'react-native';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { CardElevated, Tag, Chip, SectionBox } from '../components/UIKit';
import { analyzePlantImage, fetchRecentDiagnoses } from '../services/api';
import * as ImagePicker from 'expo-image-picker';

function severityColor(severity) {
  if (!severity) return colors.primaryGreen;
  const s = String(severity).toLowerCase();
  if (s === 'high') return colors.danger;
  if (s === 'medium') return colors.warning;
  return colors.primaryGreen;
}

function DiagnosisListSection({ title, items, accentColor, icon }) {
  const safeItems = Array.isArray(items) ? items.filter(Boolean) : [];

  return (
    <SectionBox
      title={title}
      accent={accentColor}
      icon={<Ionicons name={icon} size={16} color={accentColor} />}
      style={{ marginTop: 10 }}
    >
      {safeItems.length === 0 ? (
        <Text style={{ fontSize: typography.sm, color: colors.textGrey }}>No points detected.</Text>
      ) : (
        safeItems.map((item, index) => (
          <View key={index} style={styles.listItem}>
            <Ionicons name="checkmark-circle" size={14} color={accentColor} style={{ marginTop: 2, flexShrink: 0 }} />
            <Text style={[styles.listItemText, { color: colors.textGrey }]}>{item}</Text>
          </View>
        ))
      )}
    </SectionBox>
  );
}

export default function DiagnoseResultScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const qc = useQueryClient();
  const insets = useSafeAreaInsets();

  const { analysis = null, imageUri, offlineMode = false } = route.params || {};

  const analyzeMut = useMutation({
    mutationFn: analyzePlantImage,
    onSuccess: (result) => {
      qc.invalidateQueries({ queryKey: ['recent-diagnoses'] });
      navigation.replace('DiagnoseResult', {
        analysis: result.analysis,
        imageUri: route.params?.imageUri,
      });
    },
    onError: (err) => {
      Alert.alert('Analysis failed', err.response?.data?.message || err.message || 'Could not analyze. Try again.');
    },
  });

  const scanAgain = async () => {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (perm.status !== 'granted') {
      Alert.alert('Permission needed', 'Gallery permission is required.');
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      quality: 0.8,
      allowsEditing: true,
      aspect: [1, 1],
      base64: true,
    });
    if (!result.canceled && result.assets?.[0]) {
      const asset = result.assets[0];
      const payload = {
        imageBase64: `data:image/jpeg;base64,${asset.base64}`,
        mimeType: 'image/jpeg',
      };
      analyzeMut.mutate(payload);
    }
  };

  const isUnknown = analysis && (analysis.crop === 'Unknown' || analysis.disease === 'Unknown');

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => navigation.goBack()} activeOpacity={0.82}>
          <Ionicons name="arrow-back" size={22} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Diagnosis Report</Text>
        {offlineMode && (
          <View style={[styles.confidenceBadge, { backgroundColor: '#1d4ed820', borderColor: '#1d4ed840' }]}>
            <Ionicons name="flash" size={12} color="#1d4ed8" />
            <Text style={[styles.confidenceText, { color: '#1d4ed8' }]}>Quick</Text>
          </View>
        )}
        {analysis?.confidence && !offlineMode && (
          <View style={[styles.confidenceBadge, { backgroundColor: `${severityColor(analysis.confidence)}20`, borderColor: `${severityColor(analysis.confidence)}40` }]}>
            <Text style={[styles.confidenceText, { color: severityColor(analysis.confidence) }]}>
              {analysis.confidence}
            </Text>
          </View>
        )}
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        {/* Image */}
        {imageUri && (
          <Image source={{ uri: imageUri }} style={styles.image} resizeMode="cover" />
        )}

        {/* No analysis */}
        {!analysis && (
          <CardElevated style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>No Analysis Available</Text>
            <Text style={{ fontSize: typography.sm, color: colors.textGrey, marginTop: 6, lineHeight: 20 }}>
              Upload a plant image from the Diagnose page or scan again below.
            </Text>
            <TouchableOpacity
              style={[styles.actionBtn, { marginTop: 14 }]}
              onPress={() => navigation.navigate('Diagnose')}
              activeOpacity={0.85}
            >
              <Ionicons name="camera-outline" size={18} color={colors.primaryGreen} />
              <Text style={styles.actionBtnText}>Go to Diagnose</Text>
            </TouchableOpacity>
          </CardElevated>
        )}

        {/* Structured Analysis */}
        {analysis && (
          <View style={{ marginTop: 16 }}>
            {/* Crop + Disease Cards */}
            <CardElevated>
              <View style={styles.analysisHeader}>
                <Ionicons name={offlineMode ? 'flash' : 'analytics-outline'} size={20} color={offlineMode ? '#1d4ed8' : colors.primaryGreen} />
                <Text style={styles.cardTitle}>{offlineMode ? '⚡ Quick Scan Result' : 'AI Diagnosis Result'}</Text>
              </View>

              <View style={styles.cropDiseaseGrid}>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Crop</Text>
                  <Text style={styles.infoValue}>{analysis.crop || '—'}</Text>
                </View>
                <View style={styles.infoCard}>
                  <Text style={styles.infoLabel}>Disease</Text>
                  <Text style={[styles.infoValue, { color: colors.danger }]}>{analysis.disease || '—'}</Text>
                </View>
              </View>

              {/* Model Reasoning */}
              {analysis.reasoning && (
                <View style={styles.reasoningBox}>
                  <Text style={styles.reasoningLabel}>Model Reasoning</Text>
                  <Text style={styles.reasoningText}>{analysis.reasoning}</Text>
                </View>
              )}

              {/* Top-3 predictions for Quick Scan */}
              {offlineMode && analysis.allPredictions?.length > 0 && (
                <View style={[styles.reasoningBox, { marginTop: 8, backgroundColor: '#eff6ff', borderColor: '#bfdbfe' }]}>
                  <Text style={[styles.reasoningLabel, { color: '#1d4ed8' }]}>Top Predictions</Text>
                  {analysis.allPredictions.map((p, i) => (
                    <View key={i} style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                      <Text style={{ fontSize: 13, color: colors.textGrey, flex: 1 }}>{p.label}</Text>
                      <View style={{ backgroundColor: '#dbeafe', borderRadius: 8, paddingHorizontal: 8, paddingVertical: 2 }}>
                        <Text style={{ fontSize: 12, fontWeight: '700', color: '#1d4ed8' }}>{p.confidence}%</Text>
                      </View>
                    </View>
                  ))}
                  {analysis.inferenceMs && (
                    <Text style={{ fontSize: 10, color: colors.textGrey, marginTop: 6 }}>Inference: {analysis.inferenceMs}ms on-server MobileNetV2</Text>
                  )}
                </View>
              )}
            </CardElevated>

            {/* Structured Sections */}
            <DiagnosisListSection
              title="Symptoms"
              items={analysis.symptoms}
              accentColor={colors.danger}
              icon="bug-outline"
            />
            <DiagnosisListSection
              title="Causes"
              items={analysis.causes}
              accentColor="#b45309"
              icon="flask-outline"
            />
            <DiagnosisListSection
              title="Treatment"
              items={analysis.treatment}
              accentColor="#2563eb"
              icon="medical-outline"
            />
            <DiagnosisListSection
              title="Prevention"
              items={analysis.prevention}
              accentColor={colors.primaryGreen}
              icon="shield-checkmark-outline"
            />

            {/* Tips for unknown results */}
            {isUnknown && (
              <CardElevated style={{ marginTop: 12 }}>
                <View style={{ flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <Ionicons name="information-circle-outline" size={18} color={colors.warning} />
                  <Text style={{ fontSize: typography.md, fontWeight: '700', color: colors.textDark }}>Improve Scan Accuracy</Text>
                </View>
                {[
                  'Capture one affected leaf in close-up.',
                  'Use daylight and avoid blur or strong shadows.',
                  'Keep symptoms clearly visible in the center.',
                ].map((tip, i) => (
                  <View key={i} style={[styles.listItem, { marginTop: 6 }]}>
                    <Ionicons name="checkmark-circle-outline" size={14} color={colors.warning} />
                    <Text style={{ flex: 1, fontSize: typography.sm, color: colors.textGrey, lineHeight: 19 }}>{tip}</Text>
                  </View>
                ))}
              </CardElevated>
            )}
          </View>
        )}

        {/* Scan Again Button */}
        <TouchableOpacity
          style={[styles.primaryBtn, analyzeMut.isPending && styles.primaryBtnDisabled, { marginTop: 20 }]}
          onPress={scanAgain}
          disabled={analyzeMut.isPending}
          activeOpacity={0.85}
        >
          <Ionicons name="camera-outline" size={20} color="#fff" />
          <Text style={styles.primaryBtnText}>
            {analyzeMut.isPending ? 'Analyzing…' : 'Scan Again'}
          </Text>
        </TouchableOpacity>

        {/* Ask AI Button — pre-fills ChatScreen with disease context */}
        {analysis && analysis.crop && analysis.disease && (
          <TouchableOpacity
            style={[styles.askAiBtn, { marginTop: 10 }]}
            onPress={() => {
              const context = `I have a ${analysis.crop} plant diagnosed with ${analysis.disease}. ` +
                `Confidence: ${analysis.confidence || 'N/A'}. ` +
                `Can you explain the symptoms, treatment, and prevention in detail?`;
              navigation.navigate('Chat', { prefillMessage: context });
            }}
            activeOpacity={0.85}
          >
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#6d28d9" />
            <Text style={styles.askAiBtnText}>Ask AI about this Diagnosis</Text>
            <Ionicons name="chevron-forward-outline" size={16} color="#6d28d9" />
          </TouchableOpacity>
        )}

        <View style={{ height: Math.max(insets.bottom + 16, 32) }} />
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
  confidenceBadge: {
    borderRadius: 20, paddingHorizontal: 10, paddingVertical: 4,
    borderWidth: 1,
  },
  confidenceText: { fontSize: typography.xs, fontWeight: '800' },

  scroll: { padding: spacing.lg },
  image: { width: '100%', height: 220, borderRadius: radii.md, ...shadows.card },

  cardTitle: { fontSize: typography.lg, fontWeight: '800', color: colors.textDark },
  analysisHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 14 },

  cropDiseaseGrid: { gap: 8 },
  infoCard: {
    backgroundColor: '#f7fbf7', borderRadius: radii.sm,
    borderWidth: 1, borderColor: '#d9ead8',
    padding: 12, minHeight: 64, justifyContent: 'center',
  },
  infoLabel: { fontSize: typography.xs, color: colors.textGrey, marginBottom: 4, fontWeight: '600' },
  infoValue: { fontSize: typography.md, fontWeight: '700', color: '#1b5e20' },

  reasoningBox: {
    backgroundColor: '#fbfefb', borderRadius: radii.sm,
    borderWidth: 1, borderColor: '#dfe9de',
    padding: 12, marginTop: 10, minHeight: 80,
  },
  reasoningLabel: { fontSize: typography.xs, fontWeight: '800', color: colors.primaryGreen, marginBottom: 6 },
  reasoningText: { fontSize: typography.sm, color: colors.textGrey, lineHeight: 19 },

  listItem: { flexDirection: 'row', gap: 8, alignItems: 'flex-start', marginTop: 6 },
  listItemText: { flex: 1, fontSize: typography.sm, lineHeight: 19 },

  actionBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, backgroundColor: colors.lightGreen,
    borderRadius: 12, paddingVertical: 12,
  },
  actionBtnText: { fontSize: typography.sm, fontWeight: '700', color: colors.primaryGreen },

  primaryBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accentGreen,
    borderRadius: 14, paddingVertical: 15,
    ...shadows.card,
  },
  primaryBtnDisabled: { opacity: 0.6 },
  primaryBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },

  askAiBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: '#f5f3ff',
    borderRadius: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#ddd6fe',
    ...shadows.card,
  },
  askAiBtnText: { color: '#6d28d9', fontWeight: '800', fontSize: typography.md, flex: 1, textAlign: 'center' },
});
