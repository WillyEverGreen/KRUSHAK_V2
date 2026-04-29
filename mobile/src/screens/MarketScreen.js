import React, { useState } from 'react';
import {
  View, Text, TextInput, ScrollView, TouchableOpacity,
  StyleSheet, RefreshControl, Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { fetchMarketPrices } from '../services/api';
import { LoadingState, ErrorState, EmptyState } from '../components/UIKit';
import { Dropdown } from '../components/Dropdown';

const STATES = [
  '', 'Maharashtra', 'Gujarat', 'Rajasthan', 'Madhya Pradesh',
  'Uttar Pradesh', 'Punjab', 'Haryana', 'Karnataka', 'Andhra Pradesh',
  'Tamil Nadu', 'West Bengal', 'Bihar',
];

const COMMODITIES = [
  '', 'Wheat', 'Rice', 'Onion', 'Tomato', 'Potato',
  'Cotton', 'Soyabean', 'Maize', 'Groundnut', 'Sugarcane', 'Banana', 'Apple',
];

function PriceChip({ label, value, color }) {
  return (
    <View style={styles.priceChip}>
      <Text style={styles.priceChipLabel}>{label}</Text>
      <Text style={[styles.priceChipValue, { color }]}>₹{value?.toLocaleString?.() ?? value}</Text>
      <Text style={styles.priceChipUnit}>/qtl</Text>
    </View>
  );
}

export default function MarketScreen() {
  const [search, setSearch] = useState('');
  const [stateIdx, setStateIdx] = useState(0);
  const [commIdx, setCommIdx] = useState(0);

  const stateFilter = STATES[stateIdx];
  const commFilter = COMMODITIES[commIdx];

  const { data, isLoading, error, refetch, isFetching, isRefetching } = useQuery({
    queryKey: ['market-prices', stateFilter, commFilter, search],
    queryFn: () => fetchMarketPrices({
      state: stateFilter || undefined,
      commodity: commFilter || undefined,
      q: search || undefined,
    }),
    staleTime: 5 * 60 * 1000,
  });

  const prices = data?.prices || [];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
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
        {/* ── Page Header ── */}
        <View style={styles.pageHeader}>
          <View>
            <Text style={styles.headerTitle}>Mandi Prices</Text>
            {data?.updatedAt && (
              <Text style={styles.headerSub}>
                Updated: {new Date(data.updatedAt).toLocaleDateString()}
              </Text>
            )}
          </View>
          <TouchableOpacity
            style={[styles.refreshBtn, isFetching && { opacity: 0.5 }]}
            onPress={() => refetch()}
            disabled={isFetching}
            activeOpacity={0.82}
          >
            <Ionicons name="refresh-outline" size={20} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* ── Search + Filters Card ── */}
        <View style={styles.filterCard}>
          {/* Search input */}
          <View style={styles.searchRow}>
            <Ionicons name="search-outline" size={18} color={colors.textGrey} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search commodity, market…"
              placeholderTextColor={colors.textGrey}
              value={search}
              onChangeText={setSearch}
              returnKeyType="search"
            />
            {search.length > 0 && (
              <TouchableOpacity onPress={() => setSearch('')} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Ionicons name="close-circle" size={18} color={colors.textGrey} />
              </TouchableOpacity>
            )}
          </View>

          <View style={{ flexDirection: 'row', gap: 10 }}>
            <Dropdown
              style={{ flex: 1 }}
              triggerStyle={styles.dropdownTrigger}
              textStyle={styles.dropdownText}
              iconColor={colors.primaryGreen}
              placeholder="All States"
              value={stateFilter}
              options={STATES.map(s => ({ label: s || 'All States', value: s }))}
              onSelect={(val) => setStateIdx(STATES.indexOf(val))}
            />
            <Dropdown
              style={{ flex: 1 }}
              triggerStyle={styles.dropdownTrigger}
              textStyle={styles.dropdownText}
              iconColor={colors.primaryGreen}
              placeholder="All Commodities"
              value={commFilter}
              options={COMMODITIES.map(c => ({ label: c || 'All Commodities', value: c }))}
              onSelect={(val) => setCommIdx(COMMODITIES.indexOf(val))}
            />
          </View>
        </View>

        {/* ── Results ── */}
        {isLoading ? (
          <LoadingState message="Fetching mandi prices…" />
        ) : error && !data ? (
          <ErrorState message={error.message} onRetry={refetch} />
        ) : prices.length === 0 ? (
          <EmptyState
            icon="📊"
            title="No prices found"
            body="Try adjusting filters or searching a different commodity."
          />
        ) : (
          <View style={{ gap: 12, marginTop: 12 }}>
            {prices.map((price, i) => (
              <PriceCard key={`${price.market}-${price.commodity}-${i}`} price={price} />
            ))}
          </View>
        )}

        <View style={{ height: 24 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function PriceCard({ price }) {
  return (
    <View style={styles.priceCard}>
      <View style={styles.priceCardTop}>
        <Text style={styles.priceCommodity} numberOfLines={2}>{price.commodity}</Text>
        <View style={styles.dateBadge}>
          <Text style={styles.dateBadgeText}>{price.arrivalDate}</Text>
        </View>
      </View>

      {(price.variety || price.grade) && (
        <Text style={styles.priceVariety}>{[price.variety, price.grade].filter(Boolean).join(' • ')}</Text>
      )}
      <Text style={styles.priceMarket} numberOfLines={2}>
        {[price.market, price.district, price.state].filter(Boolean).join(', ')}
      </Text>

      <View style={styles.priceDivider} />

      <View style={styles.priceRow}>
        <PriceChip label="Min" value={price.minPrice} color={colors.danger} />
        <View style={styles.priceSep} />
        <PriceChip label="Modal" value={price.modalPrice} color={colors.primaryGreen} />
        <View style={styles.priceSep} />
        <PriceChip label="Max" value={price.maxPrice} color={colors.blueAccent} />
      </View>
    </View>
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

  filterCard: {
    backgroundColor: '#fff', borderRadius: radii.lg,
    padding: 14, borderWidth: 1, borderColor: colors.borderSoft,
    marginBottom: 4, ...shadows.card,
  },
  searchRow: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: colors.backgroundGreen, borderRadius: 12,
    paddingHorizontal: 12, paddingVertical: 10, marginBottom: 10,
  },
  searchInput: {
    flex: 1, fontSize: typography.md,
    color: colors.textDark, paddingVertical: 0,
  },
  dropdownTrigger: {
    backgroundColor: colors.backgroundGreen,
    borderWidth: 0,
    borderRadius: 12,
    minHeight: 46,
    paddingHorizontal: 12,
    paddingVertical: 10,
  },
  dropdownText: {
    color: colors.primaryGreen,
    fontWeight: '600',
    fontSize: 14,
  },

  priceCard: {
    backgroundColor: '#fff', borderRadius: radii.lg,
    padding: 16, borderWidth: 1, borderColor: colors.borderSoft,
    ...shadows.card,
  },
  priceCardTop: {
    flexDirection: 'row', alignItems: 'flex-start',
    justifyContent: 'space-between', gap: 8,
  },
  priceCommodity: {
    fontSize: typography.lg, fontWeight: '800',
    color: colors.textDark, flex: 1,
  },
  dateBadge: {
    backgroundColor: colors.lightGreen, borderRadius: 8,
    paddingHorizontal: 8, paddingVertical: 4, flexShrink: 0,
  },
  dateBadgeText: { fontSize: 11, fontWeight: '700', color: colors.primaryGreen },
  priceVariety: { fontSize: typography.xs, color: colors.textGrey, marginTop: 4 },
  priceMarket: { fontSize: typography.xs, color: colors.textGrey, marginTop: 3 },
  priceDivider: { height: 1, backgroundColor: colors.borderSoft, marginVertical: 12 },
  priceRow: { flexDirection: 'row', justifyContent: 'space-around', alignItems: 'center' },
  priceSep: { width: 1, height: 40, backgroundColor: colors.borderSoft },

  priceChip: { alignItems: 'center', flex: 1 },
  priceChipLabel: { fontSize: typography.xs, color: colors.textGrey, fontWeight: '600' },
  priceChipValue: { fontSize: typography.lg, fontWeight: '800', marginVertical: 2 },
  priceChipUnit: { fontSize: 10, color: colors.textGrey },
});
