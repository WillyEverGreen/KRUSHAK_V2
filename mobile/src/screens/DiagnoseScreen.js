import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation, useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { analyzePlantImage, pingServer, fetchRecentDiagnoses } from '../services/api';
import { cacheScanResult, getCachedScans } from '../services/scanCache';
import { initOfflineModel, runInference, buildAnalysisPayload } from '../services/onnxModel';
import { CardElevated, Tag } from '../components/UIKit';

/* ── Scan mode constants ─────────────────────────────────────── */
const MODE_AI     = 'ai';       // Gemini AI (slow, thorough)
const MODE_QUICK  = 'quick';    // TFLite on-server (fast, ~1-2s)

/* ── Animated pick button ─────────────────────────────────────── */
function PickBtn({ icon, label, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn  = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1,    useNativeDriver: true, speed: 30, bounciness: 5 }).start();
  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={{ flex: 1 }}>
      <Animated.View style={[styles.pickBtn, { transform: [{ scale }] }]}>
        <Ionicons name={icon} size={20} color={colors.primaryGreen} />
        <Text style={styles.pickBtnText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── Mode pill toggle ─────────────────────────────────────────── */
function ModePill({ mode, onChange, serverReachable, checking }) {
  return (
    <View style={styles.modePillRow}>
      <TouchableOpacity
        style={[styles.modePill, mode === MODE_AI && styles.modePillActive]}
        onPress={() => onChange(MODE_AI)}
        activeOpacity={0.8}
      >
        <Ionicons name="cloud-outline" size={14} color={mode === MODE_AI ? '#fff' : colors.textGrey} />
        <Text style={[styles.modePillText, mode === MODE_AI && styles.modePillTextActive]}>AI Scan</Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={[styles.modePill, mode === MODE_QUICK && styles.modePillQuickActive]}
        onPress={() => onChange(MODE_QUICK)}
        activeOpacity={0.8}
      >
        <Ionicons name="flash-outline" size={14} color={mode === MODE_QUICK ? '#fff' : colors.textGrey} />
        <Text style={[styles.modePillText, mode === MODE_QUICK && styles.modePillTextActive]}>Quick Scan</Text>
      </TouchableOpacity>
      {checking && (
        <ActivityIndicator size="small" color={colors.textGrey} style={{ marginLeft: 6 }} />
      )}
    </View>
  );
}

/* ── Main screen ──────────────────────────────────────────────── */
export default function DiagnoseScreen() {
  const navigation  = useNavigation();
  const qc          = useQueryClient();
  const [image, setImage]               = useState(null);
  const [analyzing, setAnalyzing]       = useState(false);
  const [mode, setMode]                 = useState(MODE_AI);
  const [serverOk, setServerOk]         = useState(true);
  const [checkingNet, setCheckingNet]   = useState(false);
  const insets = useSafeAreaInsets();
  const [cachedScans, setCachedScans]   = useState([]);

  const { data: recentList } = useQuery({
    queryKey: ['recent-diagnoses'],
    queryFn: fetchRecentDiagnoses,
    staleTime: 2 * 60 * 1000,
  });

  /* ── Network detection — auto-switch mode ─────────────────── */
  const checkServer = useCallback(async () => {
    setCheckingNet(true);
    const ok = await pingServer();
    setServerOk(ok);
    if (!ok) {
      // Auto-switch to quick mode (still needs server, but faster fallback)
      setMode(MODE_QUICK);
    }
    setCheckingNet(false);
  }, []);

  // Check on screen focus
  useFocusEffect(useCallback(() => {
    checkServer();
    getCachedScans().then(setCachedScans);
    initOfflineModel(); // Pre-warm the ONNX model
  }, []));

  /* ── Image picker ─────────────────────────────────────────── */
  const pickImage = async (fromCamera = false) => {
    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission required', 'Camera permission is needed.'); return; }
      result = await ImagePicker.launchCameraAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1], base64: true });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') { Alert.alert('Permission required', 'Gallery permission is needed.'); return; }
      result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: ['images'], quality: 0.85, allowsEditing: true, aspect: [1, 1], base64: true });
    }
    if (!result.canceled && result.assets?.[0]) setImage(result.assets[0]);
  };

  /* ── Analyze handler ──────────────────────────────────────── */
  const handleAnalyze = async () => {
    if (!image) { Alert.alert('No image', 'Please select or capture an image first.'); return; }
    setAnalyzing(true);
    try {
      const payload = { imageBase64: `data:image/jpeg;base64,${image.base64}`, mimeType: 'image/jpeg' };
      let result;

      if (mode === MODE_QUICK) {
        // Run inference completely locally on the device via ONNX Runtime
        const onnxResult = await runInference(image.uri);
        const analysis = buildAnalysisPayload(onnxResult);
        result = { analysis };
      } else {
        result = await analyzePlantImage(payload);
      }

      // Cache the result for offline access
      await cacheScanResult({
        imageUri: image.uri,
        analysis: result.analysis,
        mode,
        timestamp: Date.now(),
      });
      getCachedScans().then(setCachedScans);
      qc.invalidateQueries({ queryKey: ['recent-diagnoses'] });

      navigation.navigate('DiagnoseResult', {
        analysis: result.analysis,
        imageUri: image.uri,
        offlineMode: mode === MODE_QUICK,
      });
    } catch (err) {
      if (mode === MODE_QUICK) {
        // For offline quick scan, never show a connectivity error
        Alert.alert(
          '⚡ Scan Failed',
          err.message || 'The offline model encountered an error. Please try again with a clearer photo.',
          [{ text: 'OK' }]
        );
      } else if (!serverOk) {
        Alert.alert(
          '📵 No Connection',
          'Could not reach the server. Switch to Quick Scan for offline analysis.',
          [{ text: 'Cancel' }, { text: '⚡ Use Quick Scan', onPress: () => setMode(MODE_QUICK) }]
        );
      } else {
        Alert.alert('Analysis failed', err.response?.data?.message || err.message || 'Try again.');
      }
    } finally {
      setAnalyzing(false);
    }
  };

  const btnLabel = analyzing
    ? (mode === MODE_QUICK ? 'Running Model…' : 'Analyzing…')
    : (mode === MODE_QUICK ? '⚡ Quick Scan' : '🌐 Analyze with AI');

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right']}>
      <ScrollView style={styles.scroll} contentContainerStyle={[styles.scrollContent, { paddingTop: Math.max(insets.top + 10, 20) }]} showsVerticalScrollIndicator={false}>

        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.headerTitle}>Diagnose Crop</Text>
            <Text style={styles.headerSub}>Upload a photo to detect diseases</Text>
          </View>
          <TouchableOpacity style={styles.headerIconBg} activeOpacity={0.8} onPress={() => navigation.navigate('CommonDiseases')}>
            <Ionicons name="book-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Offline/Online Banner */}
        {!serverOk && (
          <View style={styles.offlineBanner}>
            <Ionicons name="wifi-outline" size={16} color="#b45309" />
            <Text style={styles.offlineBannerText}>Server unreachable — view past scans below</Text>
            <TouchableOpacity onPress={checkServer} activeOpacity={0.7}>
              <Text style={styles.retryText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}
        {serverOk && mode === MODE_QUICK && (
          <View style={[styles.offlineBanner, styles.quickBanner]}>
            <Ionicons name="flash" size={16} color="#1d4ed8" />
            <Text style={[styles.offlineBannerText, { color: '#1d4ed8' }]}>Quick Scan active — results in ~2s using on-device AI model</Text>
          </View>
        )}

        {/* Image Picker Card */}
        <CardElevated style={{ marginTop: 12 }}>
          {/* Mode toggle */}
          <ModePill mode={mode} onChange={setMode} serverReachable={serverOk} checking={checkingNet} />

          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImg} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)} activeOpacity={0.82}>
                <View style={styles.removeBtnInner}><Ionicons name="close" size={16} color="#fff" /></View>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity style={styles.placeholderBox} onPress={() => pickImage(false)} activeOpacity={0.8}>
              <View style={styles.placeholderIconBg}>
                <Ionicons name="image-outline" size={36} color={colors.primaryGreen} />
              </View>
              <Text style={styles.placeholderTitle}>Select Plant Image</Text>
              <Text style={styles.placeholderSub}>Tap to browse gallery or use camera</Text>
            </TouchableOpacity>
          )}

          {/* Camera / Gallery Buttons */}
          <View style={styles.btnRow}>
            <PickBtn icon="camera-outline" label="Camera"  onPress={() => pickImage(true)}  />
            <PickBtn icon="images-outline" label="Gallery" onPress={() => pickImage(false)} />
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[
              styles.analyzeBtn,
              mode === MODE_QUICK && styles.analyzeBtnQuick,
              (!image || analyzing) && styles.analyzeBtnDisabled,
            ]}
            onPress={handleAnalyze}
            disabled={!image || analyzing}
            activeOpacity={0.85}
          >
            {analyzing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeBtnText}>{btnLabel}</Text>
              </>
            ) : (
              <Text style={styles.analyzeBtnText}>{btnLabel}</Text>
            )}
          </TouchableOpacity>

          {analyzing && (
            <View style={styles.analyzingHintRow}>
              <Ionicons name="time-outline" size={14} color={colors.textGrey} />
              <Text style={styles.analyzeHint}>
                {mode === MODE_QUICK ? 'Running local ONNX ViT model… (~2s)' : 'Analyzing with Gemini AI… (up to 30s)'}
              </Text>
            </View>
          )}
        </CardElevated>

        {/* Mode info card */}
        <CardElevated style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="information-circle-outline" size={18} color={colors.primaryGreen} />
            <Text style={{ fontSize: typography.md, fontWeight: '700', color: colors.textDark }}>Scan Modes</Text>
          </View>
          <View style={styles.modeInfoRow}>
            <View style={styles.modeInfoCard}>
              <Text style={styles.modeInfoIcon}>🌐</Text>
              <Text style={styles.modeInfoTitle}>AI Scan</Text>
              <Text style={styles.modeInfoDesc}>Gemini AI — deep analysis, treatment plans. Needs internet. 10-30s.</Text>
            </View>
            <View style={[styles.modeInfoCard, styles.modeInfoCardQuick]}>
              <Text style={styles.modeInfoIcon}>⚡</Text>
              <Text style={styles.modeInfoTitle}>Quick Scan</Text>
              <Text style={styles.modeInfoDesc}>ONNX ViT model — fast local results. 38 disease classes. Works completely offline.</Text>
            </View>
          </View>
        </CardElevated>

        {/* Tips */}
        <CardElevated style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="bulb-outline" size={18} color={colors.primaryGreen} />
            <Text style={{ fontSize: typography.md, fontWeight: '700', color: colors.textDark }}>Tips for Best Results</Text>
          </View>
          {['Capture one affected leaf in close-up', 'Use daylight and avoid blur or shadows', 'Keep symptoms clearly visible in center'].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.accentGreen} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </CardElevated>

        {/* Cached Scans (offline history) */}
        {cachedScans.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={18} color={colors.primaryGreen} />
                <Text style={{ fontSize: typography.lg, fontWeight: '800', color: colors.textDark }}>Past Scans</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CommonDiseases')}>
                <Text style={{ color: colors.primaryGreen, fontWeight: '700', fontSize: typography.sm }}>View Catalog</Text>
              </TouchableOpacity>
            </View>
            <View style={{ gap: 10 }}>
              {cachedScans.slice(0, 5).map((scan, i) => (
                <TouchableOpacity
                  key={i}
                  style={styles.recentCard}
                  activeOpacity={0.85}
                  onPress={() => navigation.navigate('DiagnoseResult', {
                    analysis: scan.analysis,
                    imageUri: scan.imageUri,
                    offlineMode: scan.mode === MODE_QUICK,
                  })}
                >
                  <View style={styles.recentIconBg}>
                    <Text style={{ fontSize: 18 }}>{scan.mode === MODE_QUICK ? '⚡' : '🌿'}</Text>
                  </View>
                  <View style={styles.recentBody}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.recentCrop} numberOfLines={1}>{scan.analysis?.crop || 'Unknown crop'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        {scan.timestamp && (
                          <Text style={styles.recentDate}>{new Date(scan.timestamp).toLocaleDateString()}</Text>
                        )}
                        <Tag
                          label={scan.mode === MODE_QUICK ? 'Quick' : 'AI'}
                          variant={scan.mode === MODE_QUICK ? 'default' : 'success'}
                        />
                      </View>
                    </View>
                    <Text style={styles.recentDisease} numberOfLines={1}>
                      {scan.analysis?.disease || 'Unknown Disease'}
                    </Text>
                    {scan.analysis?.reasoning && (
                      <Text style={styles.recentDesc} numberOfLines={2}>{scan.analysis.reasoning}</Text>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {/* Online recent diagnoses from server */}
        {serverOk && recentList?.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, marginBottom: 10 }}>
              <Ionicons name="cloud-done-outline" size={18} color={colors.primaryGreen} />
              <Text style={{ fontSize: typography.lg, fontWeight: '800', color: colors.textDark }}>Recent (Server)</Text>
            </View>
            <View style={{ gap: 10 }}>
              {recentList.slice(0, 3).map((rec, i) => (
                <View key={i} style={styles.recentCard}>
                  <View style={styles.recentIconBg}><Text style={{ fontSize: 18 }}>🌿</Text></View>
                  <View style={styles.recentBody}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.recentCrop} numberOfLines={1}>{rec.crop || 'Unknown crop'}</Text>
                      {rec.createdAt && <Text style={styles.recentDate}>{new Date(rec.createdAt).toLocaleDateString()}</Text>}
                    </View>
                    <Text style={styles.recentDisease} numberOfLines={1}>{rec.diseaseName || rec.disease || 'Unknown Disease'}</Text>
                    {rec.description && <Text style={styles.recentDesc} numberOfLines={2}>{rec.description}</Text>}
                  </View>
                </View>
              ))}
            </View>
          </>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  pageHeader: {
    backgroundColor: colors.accentGreen, borderRadius: 24,
    padding: 20, flexDirection: 'row',
    alignItems: 'center', justifyContent: 'space-between',
    ...shadows.hero,
  },
  headerTitle: { fontSize: typography.xl, fontWeight: '800', color: '#fff' },
  headerSub:   { fontSize: typography.sm, color: 'rgba(255,255,255,0.86)', marginTop: 4 },
  headerIconBg: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  offlineBanner: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fffbeb', borderRadius: 12,
    paddingHorizontal: 14, paddingVertical: 10,
    marginTop: 10, borderWidth: 1, borderColor: '#fde68a',
  },
  quickBanner: { backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  offlineBannerText: { flex: 1, fontSize: 12, fontWeight: '600', color: '#92400e' },
  retryText: { fontSize: 12, fontWeight: '800', color: colors.primaryGreen },

  /* Mode pills */
  modePillRow: { flexDirection: 'row', gap: 8, marginBottom: 14, alignItems: 'center' },
  modePill: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    paddingHorizontal: 14, paddingVertical: 8,
    borderRadius: 20, borderWidth: 1.5, borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  modePillActive:      { backgroundColor: colors.primaryGreen,  borderColor: colors.primaryGreen },
  modePillQuickActive: { backgroundColor: '#1d4ed8',            borderColor: '#1d4ed8' },
  modePillText:        { fontSize: 13, fontWeight: '700', color: colors.textGrey },
  modePillTextActive:  { color: '#fff' },

  imageContainer: { position: 'relative', marginBottom: 12 },
  previewImg:     { width: '100%', height: 220, borderRadius: radii.md },
  removeBtn:      { position: 'absolute', top: 8, right: 8 },
  removeBtnInner: {
    width: 28, height: 28, borderRadius: 14,
    backgroundColor: colors.danger,
    alignItems: 'center', justifyContent: 'center',
  },

  placeholderBox: {
    height: 180, backgroundColor: colors.backgroundGreen,
    borderRadius: radii.md, alignItems: 'center', justifyContent: 'center',
    gap: 8, marginBottom: 12, borderWidth: 2,
    borderColor: colors.borderSoft, borderStyle: 'dashed',
  },
  placeholderIconBg: {
    width: 64, height: 64, borderRadius: 20,
    backgroundColor: colors.lightGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  placeholderTitle: { fontSize: typography.md, fontWeight: '700', color: colors.textDark },
  placeholderSub:   { fontSize: typography.sm, color: colors.textGrey },

  btnRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  pickBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 6, paddingVertical: 13, backgroundColor: colors.lightGreen,
    borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft,
  },
  pickBtnText: { fontWeight: '700', color: colors.primaryGreen, fontSize: typography.sm },

  analyzeBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, backgroundColor: colors.accentGreen,
    borderRadius: 14, paddingVertical: 15,
  },
  analyzeBtnQuick:    { backgroundColor: '#1d4ed8' },
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText:     { color: '#fff', fontWeight: '800', fontSize: typography.md },
  analyzingHintRow:   { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 },
  analyzeHint:        { fontSize: typography.xs, color: colors.textGrey, textAlign: 'center' },

  /* Mode info */
  modeInfoRow:      { flexDirection: 'row', gap: 10 },
  modeInfoCard:     { flex: 1, backgroundColor: '#f0fdf4', borderRadius: 12, padding: 12, borderWidth: 1, borderColor: '#bbf7d0' },
  modeInfoCardQuick:{ backgroundColor: '#eff6ff', borderColor: '#bfdbfe' },
  modeInfoIcon:     { fontSize: 22, marginBottom: 4 },
  modeInfoTitle:    { fontSize: 13, fontWeight: '800', color: colors.textDark, marginBottom: 4 },
  modeInfoDesc:     { fontSize: 11, color: colors.textGrey, lineHeight: 16 },

  tipRow:   { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tipText:  { fontSize: typography.sm, color: colors.textGrey, flex: 1, lineHeight: 19 },

  recentCard: {
    backgroundColor: '#fff', borderRadius: radii.md,
    padding: 14, flexDirection: 'row', alignItems: 'center',
    gap: 12, borderWidth: 1, borderColor: colors.borderSoft,
    ...shadows.card,
  },
  recentIconBg: {
    width: 40, height: 40, borderRadius: 12,
    backgroundColor: colors.lightGreen,
    alignItems: 'center', justifyContent: 'center',
  },
  recentBody:    { flex: 1 },
  recentCrop:    { fontSize: typography.md, fontWeight: '700', color: colors.textDark },
  recentDisease: { fontSize: typography.sm, fontWeight: '700', color: colors.danger, marginTop: 4, lineHeight: 18 },
  recentDesc:    { fontSize: typography.xs, color: colors.textGrey, marginTop: 4, lineHeight: 16 },
  recentDate:    { fontSize: 10, color: colors.textGrey },
});
