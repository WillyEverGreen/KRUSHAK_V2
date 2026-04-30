/**
 * LLMDownloadBanner.js
 * Shows a card prompting the user to download the Qwen model.
 * Includes animated progress bar, size info, and error/retry handling.
 */

import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  Animated, Easing, Alert,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, typography, shadows } from '../theme/tokens';
import * as LLM from '../services/llmService';

function formatMB(bytes) {
  return (bytes / (1024 * 1024)).toFixed(0);
}

/**
 * @param {object} props
 * @param {function} props.onDownloadComplete - Called when model is fully downloaded
 * @param {function} props.onDismiss          - Called when user taps "Skip"
 */
export default function LLMDownloadBanner({ onDownloadComplete, onDismiss }) {
  const [phase, setPhase]       = useState('idle');    // idle | downloading | done | error
  const [progress, setProgress] = useState({ percent: 0, bytesDownloaded: 0, totalBytes: 0 });
  const [errorMsg, setErrorMsg] = useState('');
  const barAnim = useRef(new Animated.Value(0)).current;

  const animateBar = (toValue) => {
    Animated.timing(barAnim, {
      toValue,
      duration: 300,
      easing: Easing.out(Easing.quad),
      useNativeDriver: false,
    }).start();
  };

  const startDownload = async () => {
    setPhase('downloading');
    setErrorMsg('');

    const ok = await LLM.downloadModelIfNeeded(
      ({ percent, bytesDownloaded, totalBytes }) => {
        setProgress({ percent, bytesDownloaded, totalBytes });
        animateBar(percent / 100);
      },
      (errMsg) => {
        setPhase('error');
        setErrorMsg(errMsg);
      }
    );

    if (ok) {
      animateBar(1);
      setPhase('done');
      setTimeout(() => onDownloadComplete?.(), 600);
    }
  };

  const handleDismiss = () => {
    if (phase === 'downloading') {
      Alert.alert(
        'Cancel Download?',
        'The offline AI model download will be cancelled. You can restart it later from the chat screen.',
        [
          { text: 'Continue Download', style: 'cancel' },
          { text: 'Cancel', style: 'destructive', onPress: onDismiss },
        ]
      );
    } else {
      onDismiss?.();
    }
  };

  const barWidth = barAnim.interpolate({
    inputRange: [0, 1],
    outputRange: ['0%', '100%'],
  });

  return (
    <View style={styles.wrapper}>
      {/* Header row */}
      <View style={styles.headerRow}>
        <View style={styles.iconBg}>
          <Text style={{ fontSize: 22 }}>🤖</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.title}>Offline AI Assistant</Text>
          <Text style={styles.subtitle}>
            Qwen2.5-1.5B · ~{LLM.MODEL_SIZE_MB} MB · Downloads once
          </Text>
        </View>
        {phase !== 'downloading' && (
          <TouchableOpacity onPress={handleDismiss} hitSlop={{ top: 10, right: 10, bottom: 10, left: 10 }}>
            <Ionicons name="close" size={20} color={colors.textGrey} />
          </TouchableOpacity>
        )}
      </View>

      {/* Feature bullets */}
      {phase === 'idle' && (
        <View style={styles.bullets}>
          {[
            '💬  Chat about crops, pests & diseases',
            '🌿  Works fully offline — no internet needed',
            '🇮🇳  Understands Hindi & English',
          ].map((b, i) => (
            <Text key={i} style={styles.bullet}>{b}</Text>
          ))}
        </View>
      )}

      {/* Progress bar */}
      {(phase === 'downloading' || phase === 'done') && (
        <View style={styles.progressSection}>
          <View style={styles.progressTrack}>
            <Animated.View style={[styles.progressFill, { width: barWidth }]} />
          </View>
          <View style={styles.progressLabels}>
            <Text style={styles.progressText}>
              {phase === 'done'
                ? '✅ Download complete!'
                : `${formatMB(progress.bytesDownloaded)} / ${formatMB(progress.totalBytes || LLM.MODEL_SIZE_MB * 1024 * 1024)} MB`}
            </Text>
            <Text style={styles.progressPct}>{progress.percent}%</Text>
          </View>
        </View>
      )}

      {/* Error message */}
      {phase === 'error' && (
        <View style={styles.errorBox}>
          <Ionicons name="alert-circle-outline" size={16} color={colors.danger} />
          <Text style={styles.errorText}>{errorMsg || 'Download failed. Check your connection.'}</Text>
        </View>
      )}

      {/* Action buttons */}
      <View style={styles.actions}>
        {(phase === 'idle' || phase === 'error') && (
          <TouchableOpacity style={styles.downloadBtn} onPress={startDownload} activeOpacity={0.88}>
            <Ionicons name="cloud-download-outline" size={18} color="#fff" />
            <Text style={styles.downloadBtnText}>
              {phase === 'error' ? 'Retry Download' : 'Download Offline AI'}
            </Text>
          </TouchableOpacity>
        )}

        {phase === 'downloading' && (
          <View style={styles.downloadingRow}>
            <Ionicons name="hourglass-outline" size={16} color={colors.primaryGreen} />
            <Text style={styles.downloadingText}>Downloading… please keep screen on</Text>
          </View>
        )}

        {phase !== 'downloading' && (
          <TouchableOpacity onPress={handleDismiss} style={styles.skipBtn} activeOpacity={0.75}>
            <Text style={styles.skipText}>
              {phase === 'done' ? 'Close' : 'Skip for now'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    margin: 16,
    backgroundColor: '#fff',
    borderRadius: radii.lg,
    padding: 16,
    borderWidth: 1,
    borderColor: '#d1fae5',
    ...shadows.card,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },
  iconBg: {
    width: 48, height: 48, borderRadius: 24,
    backgroundColor: '#ecfdf5',
    alignItems: 'center', justifyContent: 'center',
    borderWidth: 1, borderColor: '#6ee7b7',
  },
  title: {
    fontSize: typography.md, fontWeight: '800', color: colors.textDark,
  },
  subtitle: {
    fontSize: typography.xs, color: colors.textGrey, marginTop: 2,
  },
  bullets: { gap: 6, marginBottom: 14 },
  bullet: {
    fontSize: typography.sm, color: colors.textGrey, lineHeight: 20,
  },
  progressSection: { marginBottom: 12 },
  progressTrack: {
    height: 10, backgroundColor: '#d1fae5',
    borderRadius: 5, overflow: 'hidden',
  },
  progressFill: {
    height: '100%', backgroundColor: colors.accentGreen, borderRadius: 5,
  },
  progressLabels: {
    flexDirection: 'row', justifyContent: 'space-between', marginTop: 6,
  },
  progressText: { fontSize: typography.xs, color: colors.textGrey },
  progressPct: { fontSize: typography.xs, fontWeight: '700', color: colors.primaryGreen },
  errorBox: {
    flexDirection: 'row', alignItems: 'center', gap: 6,
    backgroundColor: '#fef2f2', borderRadius: radii.sm,
    padding: 10, marginBottom: 10,
    borderWidth: 1, borderColor: '#fca5a5',
  },
  errorText: { fontSize: typography.xs, color: colors.danger, flex: 1 },
  actions: { gap: 8 },
  downloadBtn: {
    backgroundColor: colors.accentGreen,
    borderRadius: radii.md, paddingVertical: 13,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8,
  },
  downloadBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.sm },
  downloadingRow: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, paddingVertical: 10,
  },
  downloadingText: { fontSize: typography.sm, color: colors.primaryGreen, fontWeight: '600' },
  skipBtn: {
    alignItems: 'center', paddingVertical: 8,
  },
  skipText: { fontSize: typography.sm, color: colors.textGrey },
});
