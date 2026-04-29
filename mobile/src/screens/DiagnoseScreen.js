import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet, ScrollView,
  Image, Alert, ActivityIndicator, Animated, Pressable,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import * as ImagePicker from 'expo-image-picker';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { analyzePlantImage, fetchRecentDiagnoses } from '../services/api';
import { CardElevated, SectionHeader, Tag, ErrorState } from '../components/UIKit';

/* ── Animated pick button ─────────────────────────────────────── */
function PickBtn({ icon, label, onPress }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onIn = () => Animated.spring(scale, { toValue: 0.95, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 5 }).start();

  return (
    <Pressable onPress={onPress} onPressIn={onIn} onPressOut={onOut} style={{ flex: 1 }}>
      <Animated.View style={[styles.pickBtn, { transform: [{ scale }] }]}>
        <Ionicons name={icon} size={20} color={colors.primaryGreen} />
        <Text style={styles.pickBtnText}>{label}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function DiagnoseScreen() {
  const navigation = useNavigation();
  const qc = useQueryClient();
  const [image, setImage] = useState(null);
  const [analyzing, setAnalyzing] = useState(false);

  const { data: recentList } = useQuery({
    queryKey: ['recent-diagnoses'],
    queryFn: fetchRecentDiagnoses,
    staleTime: 2 * 60 * 1000,
  });

  const pickImage = async (fromCamera = false) => {
    let result;
    if (fromCamera) {
      const perm = await ImagePicker.requestCameraPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Camera permission is needed to capture images.');
        return;
      }
      result = await ImagePicker.launchCameraAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
    } else {
      const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (perm.status !== 'granted') {
        Alert.alert('Permission required', 'Gallery permission is needed to select images.');
        return;
      }
      result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        quality: 0.85,
        allowsEditing: true,
        aspect: [1, 1],
        base64: true,
      });
    }
    if (!result.canceled && result.assets?.[0]) {
      setImage(result.assets[0]);
    }
  };

  const handleAnalyze = async () => {
    if (!image) {
      Alert.alert('No image', 'Please select or capture an image first.');
      return;
    }
    setAnalyzing(true);
    try {
      const payload = {
        imageBase64: `data:image/jpeg;base64,${image.base64}`,
        mimeType: 'image/jpeg',
      };
      const result = await analyzePlantImage(payload);
      qc.invalidateQueries({ queryKey: ['recent-diagnoses'] });
      navigation.navigate('DiagnoseResult', { analysis: result.analysis, imageUri: image.uri });
    } catch (err) {
      Alert.alert('Analysis failed', err.response?.data?.message || err.message || 'Network error. Try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Page Header */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.headerTitle}>Diagnose Crop</Text>
            <Text style={styles.headerSub}>Upload a photo to detect diseases</Text>
          </View>
          <TouchableOpacity 
            style={styles.headerIconBg} 
            activeOpacity={0.8}
            onPress={() => navigation.navigate('CommonDiseases')}
          >
            <Ionicons name="book-outline" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Image Picker Card */}
        <CardElevated style={{ marginTop: 16 }}>
          {image ? (
            <View style={styles.imageContainer}>
              <Image source={{ uri: image.uri }} style={styles.previewImg} />
              <TouchableOpacity style={styles.removeBtn} onPress={() => setImage(null)} activeOpacity={0.82}>
                <View style={styles.removeBtnInner}>
                  <Ionicons name="close" size={16} color="#fff" />
                </View>
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
            <PickBtn icon="camera-outline" label="Camera" onPress={() => pickImage(true)} />
            <PickBtn icon="images-outline" label="Gallery" onPress={() => pickImage(false)} />
          </View>

          {/* Analyze Button */}
          <TouchableOpacity
            style={[styles.analyzeBtn, (!image || analyzing) && styles.analyzeBtnDisabled]}
            onPress={handleAnalyze}
            disabled={!image || analyzing}
            activeOpacity={0.85}
          >
            {analyzing ? (
              <>
                <ActivityIndicator color="#fff" size="small" />
                <Text style={styles.analyzeBtnText}>Analyzing…</Text>
              </>
            ) : (
              <>
                <Ionicons name="leaf-outline" size={20} color="#fff" />
                <Text style={styles.analyzeBtnText}>Analyze with AI</Text>
              </>
            )}
          </TouchableOpacity>

          {analyzing && (
            <View style={styles.analyzingHintRow}>
              <Ionicons name="time-outline" size={14} color={colors.textGrey} />
              <Text style={styles.analyzeHint}>This may take up to 30 seconds…</Text>
            </View>
          )}
        </CardElevated>

        {/* Tips Card */}
        <CardElevated style={{ marginTop: 14 }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 }}>
            <Ionicons name="bulb-outline" size={18} color={colors.primaryGreen} />
            <Text style={{ fontSize: typography.md, fontWeight: '700', color: colors.textDark }}>Tips for Best Results</Text>
          </View>
          {[
            'Capture one affected leaf in close-up',
            'Use daylight and avoid blur or shadows',
            'Keep symptoms clearly visible in center',
          ].map((tip, i) => (
            <View key={i} style={styles.tipRow}>
              <Ionicons name="checkmark-circle-outline" size={14} color={colors.accentGreen} />
              <Text style={styles.tipText}>{tip}</Text>
            </View>
          ))}
        </CardElevated>

        {/* Recent Diagnoses */}
        {recentList?.length > 0 && (
          <>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 20, marginBottom: 12 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                <Ionicons name="time-outline" size={18} color={colors.primaryGreen} />
                <Text style={{ fontSize: typography.lg, fontWeight: '800', color: colors.textDark }}>Recent Diagnoses</Text>
              </View>
              <TouchableOpacity onPress={() => navigation.navigate('CommonDiseases')}>
                <Text style={{ color: colors.primaryGreen, fontWeight: '700', fontSize: typography.sm }}>View Catalog</Text>
              </TouchableOpacity>
            </View>
            
            <View style={{ gap: 10 }}>
              {recentList.slice(0, 5).map((rec, i) => (
                <View key={i} style={styles.recentCard}>
                  <View style={styles.recentIconBg}>
                    <Text style={{ fontSize: 18 }}>🌿</Text>
                  </View>
                  <View style={styles.recentBody}>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Text style={styles.recentCrop} numberOfLines={1}>{rec.crop || 'Unknown crop'}</Text>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                        {rec.createdAt && (
                          <Text style={styles.recentDate}>{new Date(rec.createdAt).toLocaleDateString()}</Text>
                        )}
                        {(rec.severity || rec.confidence > 0) && (
                          <Tag
                            label={rec.severity || (rec.confidence > 0.8 ? 'High' : rec.confidence > 0.5 ? 'Medium' : 'Low')}
                            variant={(rec.severity === 'High' || rec.confidence > 0.8) ? 'danger' : (rec.severity === 'Medium' || rec.confidence > 0.5) ? 'warning' : 'default'}
                          />
                        )}
                      </View>
                    </View>
                    <Text style={styles.recentDisease} numberOfLines={1}>{rec.diseaseName || rec.disease || 'Unknown Disease'}</Text>
                    {rec.description && (
                      <Text style={styles.recentDesc} numberOfLines={2}>{rec.description}</Text>
                    )}
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
  headerSub: { fontSize: typography.sm, color: 'rgba(255,255,255,0.86)', marginTop: 4 },
  headerIconBg: {
    width: 48, height: 48, borderRadius: 16,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  imageContainer: { position: 'relative', marginBottom: 12 },
  previewImg: { width: '100%', height: 220, borderRadius: radii.md },
  removeBtn: { position: 'absolute', top: 8, right: 8 },
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
  placeholderSub: { fontSize: typography.sm, color: colors.textGrey },

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
  analyzeBtnDisabled: { opacity: 0.5 },
  analyzeBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  analyzingHintRow: { flexDirection: 'row', alignItems: 'center', gap: 6, justifyContent: 'center', marginTop: 8 },
  analyzeHint: { fontSize: typography.xs, color: colors.textGrey, textAlign: 'center' },

  tipRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  tipText: { fontSize: typography.sm, color: colors.textGrey, flex: 1, lineHeight: 19 },

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
  recentBody: { flex: 1 },
  recentCrop: { fontSize: typography.md, fontWeight: '700', color: colors.textDark },
  recentDisease: { fontSize: typography.sm, fontWeight: '700', color: colors.danger, marginTop: 4, lineHeight: 18 },
  recentDesc: { fontSize: typography.xs, color: colors.textGrey, marginTop: 4, lineHeight: 16 },
  recentDate: { fontSize: 10, color: colors.textGrey },
});
