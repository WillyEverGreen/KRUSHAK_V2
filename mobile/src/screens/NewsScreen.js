import React, { useState } from 'react';
import {
  View, Text, ScrollView, Image, TouchableOpacity,
  StyleSheet, Linking, RefreshControl,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import * as Location from 'expo-location';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchNews } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/UIKit';

export default function NewsScreen() {
  const insets = useSafeAreaInsets();
  const [scope, setScope] = useState('global');
  const [coords, setCoords] = useState(null);

  const { data, isLoading, error, refetch, isRefetching } = useQuery({
    queryKey: ['news', scope, coords?.latitude ?? 'na', coords?.longitude ?? 'na'],
    queryFn: () => fetchNews({
      scope,
      latitude: coords?.latitude,
      longitude: coords?.longitude,
    }),
    staleTime: 10 * 60 * 1000,
  });

  const getLocalNews = async () => {
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status === 'granted') {
      const loc = await Location.getCurrentPositionAsync({ accuracy: Location.Accuracy.Balanced });
      setCoords({ latitude: loc.coords.latitude, longitude: loc.coords.longitude });
    }
    setScope('local');
  };

  const articles = data?.articles || [];

  return (
    <SafeAreaView style={styles.root} edges={['left', 'right', 'bottom']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 12 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={
          <RefreshControl
            refreshing={isRefetching}
            onRefresh={refetch}
            tintColor={colors.accentGreen}
            colors={[colors.accentGreen]}
          />
        }
      >
        {/* ── Header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.headerTitle}>Agri News</Text>
            <Text style={styles.headerSub}>
              {data?.resolvedLocation || 'Agriculture news for farmers'}
            </Text>
          </View>
          <TouchableOpacity
            style={styles.refreshBtn}
            onPress={() => refetch()}
            disabled={isRefetching}
            activeOpacity={0.82}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Scope Toggle ── */}
        <View style={styles.scopeRow}>
          {[
            { id: 'global', label: '🌍 Global', onPress: () => setScope('global') },
            { id: 'local', label: '📍 Local', onPress: getLocalNews },
          ].map((btn) => (
            <TouchableOpacity
              key={btn.id}
              style={[styles.scopeBtn, scope === btn.id && styles.scopeBtnActive]}
              onPress={btn.onPress}
              activeOpacity={0.82}
            >
              <Text style={[styles.scopeBtnText, scope === btn.id && styles.scopeBtnTextActive]}>
                {btn.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* ── Content ── */}
        {isLoading ? (
          <LoadingState message="Fetching agri news…" />
        ) : error && !data ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : articles.length === 0 ? (
          <EmptyState
            icon="📰"
            title="No news found"
            body="Pull to refresh or switch to global news."
          />
        ) : (
          <View style={{ gap: 14, marginTop: 14 }}>
            {articles.map((article, i) => (
              <NewsCard key={i} article={article} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function NewsCard({ article }) {
  return (
    <TouchableOpacity
      style={styles.newsCard}
      onPress={() => article.url && Linking.openURL(article.url)}
      activeOpacity={0.82}
    >
      {article.urlToImage && (
        <Image
          source={{ uri: article.urlToImage }}
          style={styles.newsImg}
          resizeMode="cover"
        />
      )}
      <View style={styles.newsBody}>
        {article.source?.name && (
          <Text style={styles.newsSource}>{article.source.name.toUpperCase()}</Text>
        )}
        <Text style={styles.newsTitle} numberOfLines={3}>{article.title}</Text>
        {article.description && (
          <Text style={styles.newsDesc} numberOfLines={2}>{article.description}</Text>
        )}
        <View style={styles.newsFooter}>
          <Text style={styles.newsDate}>
            {article.publishedAt ? new Date(article.publishedAt).toLocaleDateString() : ''}
          </Text>
          <View style={styles.readMoreBtn}>
            <Text style={styles.readMoreText}>Read more</Text>
            <Ionicons name="arrow-forward-outline" size={12} color={colors.primaryGreen} />
          </View>
        </View>
      </View>
    </TouchableOpacity>
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
    marginBottom: 14, ...shadows.hero,
  },
  headerTitle: { fontSize: typography.xl, fontWeight: '800', color: '#fff' },
  headerSub: { fontSize: typography.xs, color: 'rgba(255,255,255,0.86)', marginTop: 3 },
  refreshBtn: {
    width: 44, height: 44, borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center', justifyContent: 'center',
  },

  scopeRow: {
    flexDirection: 'row', gap: 4,
    backgroundColor: 'rgba(46,125,50,0.08)',
    borderRadius: 18, padding: 5, marginBottom: 4,
  },
  scopeBtn: { flex: 1, paddingVertical: 10, borderRadius: 14, alignItems: 'center' },
  scopeBtnActive: {
    backgroundColor: '#fff',
    ...shadows.card,
  },
  scopeBtnText: { fontSize: 13, fontWeight: '600', color: colors.textGrey },
  scopeBtnTextActive: { color: colors.primaryGreen, fontWeight: '700' },

  newsCard: {
    backgroundColor: '#fff', borderRadius: 18, overflow: 'hidden',
    ...shadows.card,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  newsImg: { width: '100%', height: 170 },
  newsBody: { padding: 14 },
  newsSource: {
    fontSize: 10, fontWeight: '800',
    color: colors.accentGreen, letterSpacing: 0.8, marginBottom: 5,
  },
  newsTitle: {
    fontSize: 14, fontWeight: '800',
    color: '#1b5e20', lineHeight: 20,
  },
  newsDesc: { fontSize: 12, color: colors.textGrey, lineHeight: 17, marginTop: 5 },
  newsFooter: {
    flexDirection: 'row', justifyContent: 'space-between',
    alignItems: 'center', marginTop: 10,
  },
  newsDate: { fontSize: 11, color: colors.textGrey },
  readMoreBtn: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  readMoreText: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },
});
