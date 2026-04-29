import React, { useEffect, useRef, useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated, Pressable,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import * as Location from 'expo-location';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchHomeData } from '../services/api';
import { CardElevated, SectionHeader, HealthBar, LoadingState, ErrorState } from '../components/UIKit';

function riskColor(v) {
  if (v > 70) return colors.danger;
  if (v > 40) return colors.warning;
  return colors.accentGreen;
}

function weatherEmoji(summary = '') {
  const s = summary.toLowerCase();
  if (s.includes('rain') || s.includes('shower') || s.includes('thunder')) return '🌧️';
  if (s.includes('snow')) return '❄️';
  if (s.includes('cloud') && s.includes('part')) return '⛅';
  if (s.includes('cloud') || s.includes('overcast')) return '☁️';
  if (s.includes('sun') || s.includes('clear') || s.includes('hot')) return '☀️';
  return '🌤️';
}

function parseTemperature(value) {
  const s = value === null || value === undefined ? '' : String(value).trim();
  const m = s.match(/^(-?\d+(?:\.\d+)?)(?:\s*°?\s*([CFcf]))?$/);
  if (m) return { num: m[1], unit: (m[2] || 'C').toUpperCase() };
  return { num: s, unit: 'C' };
}

/* ── Animated Quick Tool Card ─────────────────────────────────── */
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const TOOL_GAP = 12;
const TOOL_WIDTH = (SCREEN_WIDTH - spacing.lg * 2 - TOOL_GAP * 2) / 3;

function QuickToolCard({ tool, delay }) {
  const scale = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(14)).current;
  const navigation = useNavigation();

  useEffect(() => {
    Animated.parallel([
      Animated.timing(opacity, {
        toValue: 1, duration: 380, delay, useNativeDriver: true,
      }),
      Animated.spring(translateY, {
        toValue: 0, delay, useNativeDriver: true, speed: 22, bounciness: 6,
      }),
    ]).start();
  }, []);

  const onPressIn = () => Animated.spring(scale, { toValue: 0.94, useNativeDriver: true, speed: 50, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 30, bounciness: 5 }).start();

  return (
    <Pressable 
      onPress={() => navigation.navigate(tool.route)} 
      onPressIn={onPressIn} 
      onPressOut={onPressOut}
      style={{ width: TOOL_WIDTH }}
    >
      <Animated.View style={[styles.toolCard, { opacity, transform: [{ scale }, { translateY }] }]}>
        <View style={[styles.toolIcon, { backgroundColor: tool.color }]}>
          <Ionicons name={tool.icon} size={22} color={colors.primaryGreen} />
        </View>
        <Text style={styles.toolLabel} numberOfLines={1}>{tool.title}</Text>
      </Animated.View>
    </Pressable>
  );
}

export default function HomeScreen() {
  const navigation = useNavigation();
  const [coords, setCoords] = useState(undefined);
  const heroAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.timing(heroAnim, {
      toValue: 1, duration: 600, useNativeDriver: true,
    }).start();

    (async () => {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') { setCoords(null); return; }
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    })().catch(() => setCoords(null));
  }, []);

  const geoReady = coords !== undefined;

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['home-data', coords?.latitude ?? null, coords?.longitude ?? null],
    queryFn: () => fetchHomeData({ lat: coords?.latitude, lon: coords?.longitude }),
    enabled: geoReady,
    staleTime: 5 * 60 * 1000,
  });

  const quickTools = [
    { title: 'Plant ID', icon: 'leaf-outline', color: '#D9F2DA', route: 'Diagnose' },
    { title: 'Diagnose', icon: 'search-outline', color: '#E3F2FD', route: 'Diagnose' },
    { title: 'Irrigation', icon: 'water-outline', color: '#E0F7FA', route: 'CareGuides' },
    { title: 'Market', icon: 'trending-up-outline', color: '#FFF3E0', route: 'Market' },
    { title: 'Agri News', icon: 'newspaper-outline', color: '#E8F5E9', route: 'News' },
    { title: 'AI Chat', icon: 'chatbubble-outline', color: '#EDE7F6', route: 'Chat' },
  ];

  if (!geoReady || isLoading) return (
    <SafeAreaView style={styles.root}>
      <LoadingState message="Loading your farm dashboard…" />
    </SafeAreaView>
  );
  if (error && !data) return (
    <SafeAreaView style={styles.root}>
      <ErrorState message={error.message} onRetry={refetch} />
    </SafeAreaView>
  );

  const { num: tempNum, unit: tempUnit } = parseTemperature(data?.weather?.value);

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isRefetching} onRefresh={refetch} tintColor={colors.accentGreen} colors={[colors.accentGreen]} />}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Hero Card ── */}
        <Animated.View
          style={[
            styles.heroCard,
            { opacity: heroAnim, transform: [{ translateY: heroAnim.interpolate({ inputRange: [0, 1], outputRange: [-16, 0] }) }] },
          ]}
        >
          <View style={styles.heroRow}>
            <View style={styles.heroLeft}>
              {/* Logo + Greeting */}
              <View style={styles.heroLogoRow}>
                <View style={styles.heroLogo}>
                  <Text style={{ fontSize: 18 }}>🌱</Text>
                </View>
                <Text style={styles.heroGreeting} numberOfLines={1}>{data?.greeting}</Text>
              </View>
              <Text style={styles.heroTitle} numberOfLines={2}>{data?.dashboardTitle}</Text>
              <View style={styles.heroLocation}>
                <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.86)" />
                <Text style={styles.heroLocationText} numberOfLines={1}>{data?.location}</Text>
              </View>
            </View>

            {/* Weather Chip */}
            <View style={styles.weatherChip}>
              <Text style={{ fontSize: 22 }}>{weatherEmoji(data?.weather?.summary)}</Text>
              <View style={{ flexDirection: 'row', alignItems: 'baseline', gap: 2, marginTop: 4 }}>
                <Text style={styles.weatherTemp}>{tempNum}</Text>
                <Text style={styles.weatherUnit}>°{tempUnit}</Text>
              </View>
              <Text style={styles.weatherDesc} numberOfLines={2}>{data?.weather?.summary}</Text>
              {data?.weather?.precipitation !== undefined && (
                <View style={styles.weatherPrecip}>
                  <Ionicons name="water-outline" size={11} color="rgba(255,255,255,0.75)" />
                  <Text style={styles.weatherPrecipText}>{data.weather.precipitation} mm</Text>
                </View>
              )}
            </View>
          </View>

          {/* CTA Buttons */}
          <View style={styles.heroButtons}>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.navigate('Diagnose')}
              activeOpacity={0.82}
            >
              <Ionicons name="scan-outline" size={16} color="#fff" />
              <Text style={styles.heroBtnText}>Scan Crop</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.heroBtn}
              onPress={() => navigation.navigate('Market')}
              activeOpacity={0.82}
            >
              <Ionicons name="trending-up-outline" size={16} color="#fff" />
              <Text style={styles.heroBtnText}>Market</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>

        {/* ── Today's AI Instructions ── */}
        {data?.instructions?.length > 0 && (
          <CardElevated style={{ marginTop: 16 }}>
            <Text style={styles.cardTitle}>Today's AI Instructions</Text>
            <View style={{ gap: 8, marginTop: 10 }}>
              {data.instructions.map((ins, i) => (
                <View key={i} style={styles.instructionRow}>
                  <Ionicons name="checkmark-circle-outline" size={18} color={colors.primaryGreen} style={{ marginTop: 1, flexShrink: 0 }} />
                  <Text style={styles.instructionText}>{ins}</Text>
                </View>
              ))}
            </View>
          </CardElevated>
        )}

        {/* ── Risk Meters ── */}
        {data?.riskMeters && (
          <>
            <SectionHeader
              title="Risk Meters"
              icon={<Ionicons name="warning-outline" size={16} color={colors.primaryGreen} />}
              style={{ marginTop: 20 }}
            />
            <View style={styles.riskGrid}>
              {[
                { label: 'Water Stress', key: 'waterStress', icon: 'water-outline' },
                { label: 'Pest Alert', key: 'pestAlert', icon: 'bug-outline' },
                { label: 'Weather Risk', key: 'weatherRisk', icon: 'cloud-outline' },
              ].map((item) => {
                const val = data.riskMeters[item.key] ?? 0;
                return (
                  <View key={item.key} style={styles.riskCard}>
                    <View style={styles.riskIconBg}>
                      <Ionicons name={item.icon} size={22} color={colors.primaryGreen} />
                    </View>
                    <HealthBar value={val} color={riskColor(val)} style={{ marginTop: 10, width: '100%' }} />
                    <Text style={styles.riskValue}>{val}%</Text>
                    <Text style={styles.riskLabel}>{item.label}</Text>
                  </View>
                );
              })}
            </View>
          </>
        )}

        {/* ── Quick Tools ── */}
        <SectionHeader
          title="Quick Tools"
          icon={<Ionicons name="construct-outline" size={16} color={colors.primaryGreen} />}
          style={{ marginTop: 20 }}
        />
        <View style={styles.toolGrid}>
          {quickTools.map((tool, i) => (
            <QuickToolCard key={tool.title} tool={tool} delay={i * 50} />
          ))}
        </View>

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  heroCard: {
    borderRadius: 26,
    padding: 20,
    backgroundColor: colors.heroGradientEnd,
    ...shadows.hero,
  },
  heroRow: { flexDirection: 'row', gap: 12, alignItems: 'flex-start' },
  heroLeft: { flex: 1, minWidth: 0 },
  heroLogoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 8 },
  heroLogo: {
    width: 32, height: 32, borderRadius: 16,
    backgroundColor: '#fff', alignItems: 'center', justifyContent: 'center',
  },
  heroGreeting: { fontSize: typography.sm, color: 'rgba(255,255,255,0.86)' },
  heroTitle: {
    fontSize: 23, fontWeight: '800', color: '#fff', lineHeight: 28, marginBottom: 10,
  },
  heroLocation: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  heroLocationText: { fontSize: 12, color: 'rgba(255,255,255,0.86)', flexShrink: 1 },

  weatherChip: {
    flexShrink: 0, minWidth: 96, maxWidth: 116,
    backgroundColor: 'rgba(255,255,255,0.16)',
    borderRadius: 20, padding: 12,
    alignItems: 'flex-end', gap: 3,
  },
  weatherTemp: { fontSize: 22, fontWeight: '800', color: '#fff', lineHeight: 26 },
  weatherUnit: { fontSize: 13, fontWeight: '700', color: 'rgba(255,255,255,0.9)', lineHeight: 26 },
  weatherDesc: { fontSize: 11, color: 'rgba(255,255,255,0.9)', textAlign: 'right', lineHeight: 14, marginTop: 2 },
  weatherPrecip: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 2 },
  weatherPrecipText: { fontSize: 11, color: 'rgba(255,255,255,0.75)' },

  heroButtons: { flexDirection: 'row', gap: 12, marginTop: 18 },
  heroBtn: {
    flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, borderRadius: 14, gap: 6,
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 1, borderColor: 'rgba(255,255,255,0.3)',
  },
  heroBtnText: { color: '#fff', fontWeight: '700', fontSize: typography.sm },

  cardTitle: { fontSize: typography.xl, fontWeight: '800', color: colors.textDark },
  instructionRow: {
    flexDirection: 'row', gap: 10,
    backgroundColor: 'rgba(232,245,233,0.65)',
    borderRadius: 14, padding: 12,
  },
  instructionText: { flex: 1, fontSize: typography.md, color: '#1b5e20', lineHeight: 20 },

  riskGrid: { flexDirection: 'row', gap: TOOL_GAP },
  riskCard: {
    flex: 1, backgroundColor: '#fff', borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radii.md, padding: 12, alignItems: 'center',
    ...shadows.card,
  },
  riskIconBg: {
    width: 38, height: 38, borderRadius: 12,
    backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center',
  },
  riskValue: { fontSize: typography.lg, fontWeight: '800', color: colors.textDark, marginTop: 6 },
  riskLabel: { fontSize: 11, color: colors.textGrey, marginTop: 1, textAlign: 'center' },

  toolGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: TOOL_GAP },
  toolCard: {
    width: '100%',
    minHeight: 94,
    backgroundColor: '#fff',
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radii.md,
    alignItems: 'center', justifyContent: 'center',
    paddingVertical: 12, paddingHorizontal: 4,
    gap: 6,
    ...shadows.card,
  },
  toolIcon: { width: 40, height: 40, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  toolLabel: { fontSize: 11, fontWeight: '700', color: '#1b5e20', textAlign: 'center', lineHeight: 14 },
});
