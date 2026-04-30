import React, { useState } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, Alert, Switch, Modal, TextInput,
  KeyboardAvoidingView, Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { useAuthStore } from '../store/authStore';
import { CardElevated, ListRow, Divider, PrimaryButton } from '../components/UIKit';
import { Dropdown } from '../components/Dropdown';
import { useQuery } from '@tanstack/react-query';
import { fetchFarmData, fetchLivestock } from '../services/api';
import { getCachedScans } from '../services/scanCache';

const LANGUAGES = ['English', 'Hindi', 'Marathi', 'Gujarati', 'Punjabi', 'Telugu', 'Kannada'];
const LANG_FLAGS = ['🇬🇧', '🇮🇳', '🇮🇳', '🇮🇳', '🇮🇳', '🇮🇳', '🇮🇳'];

export default function ProfileScreen() {
  const { user, logout } = useAuthStore();
  const [notifications, setNotifications] = useState(true);
  const [langIdx, setLangIdx] = useState(0);
  const [scanCount, setScanCount] = useState('—');

  // Fetch real farm stats
  const { data: farmData } = useQuery({ queryKey: ['farm'], queryFn: fetchFarmData, staleTime: 5 * 60 * 1000 });
  const { data: livestockList } = useQuery({ queryKey: ['livestock'], queryFn: fetchLivestock, staleTime: 5 * 60 * 1000 });

  React.useEffect(() => {
    getCachedScans().then(scans => setScanCount(scans.length));
  }, []);

  const cropCount = farmData?.crops?.length ?? '—';
  const livestockCount = Array.isArray(livestockList) ? livestockList.length : '—';

  const handleLogout = () => {
    Alert.alert('Logout', 'Are you sure you want to logout?', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Logout', style: 'destructive', onPress: () => logout() },
    ]);
  };

  // Avatar initials
  const initials = user?.fullName
    ? user.fullName.split(' ').map((n) => n[0]).join('').slice(0, 2).toUpperCase()
    : '🌾';

  const menuItems = [
    { icon: 'leaf-outline', title: 'App Version', sub: '1.0.0' },
    { icon: 'shield-checkmark-outline', title: 'Privacy Policy', sub: 'Your data is secure' },
    { icon: 'document-text-outline', title: 'Terms of Service', sub: 'Tap to view' },
    { icon: 'help-circle-outline', title: 'Help & FAQ', sub: 'Get support' },
    { icon: 'mail-outline', title: 'Contact Support', sub: 'support@krushak.in' },
  ];

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* ── Avatar Hero Card ── */}
        <View style={styles.avatarCard}>
          <View style={styles.avatarRing}>
            <View style={styles.avatar}>
              {typeof initials === 'string' && initials.length <= 2 && /^[A-Z]/.test(initials) ? (
                <Text style={styles.avatarText}>{initials}</Text>
              ) : (
                <Text style={{ fontSize: 32 }}>🌾</Text>
              )}
            </View>
          </View>
          <Text style={styles.userName}>{user?.fullName || 'Farmer'}</Text>
          <Text style={styles.userEmail}>{user?.email || ''}</Text>
          {(user?.village || user?.district) && (
            <View style={styles.locationRow}>
              <Ionicons name="location-outline" size={13} color="rgba(255,255,255,0.86)" />
              <Text style={styles.locationText}>
                {[user.village, user.district].filter(Boolean).join(', ')}
              </Text>
            </View>
          )}
        </View>

        {/* ── Farm Stats ── */}
        <CardElevated style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Farm Overview</Text>
          <View style={styles.statsRow}>
            <StatBox
              value={cropCount}
              label="Crops"
              icon="leaf-outline"
              color={colors.accentGreen}
            />
            <View style={styles.statDivider} />
            <StatBox
              value={livestockCount}
              label="Livestock"
              icon="paw-outline"
              color={colors.warning}
            />
            <View style={styles.statDivider} />
            <StatBox
              value={scanCount}
              label="Scans"
              icon="scan-outline"
              color={colors.blueAccent}
            />
          </View>
        </CardElevated>

        {/* ── Settings ── */}
        <CardElevated style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>Settings</Text>

          <ListRow
            left={
              <View style={[styles.settingIconBg, { backgroundColor: '#e8f5e9' }]}>
                <Ionicons name="notifications-outline" size={18} color={colors.primaryGreen} />
              </View>
            }
            title="Push Notifications"
            subtitle="Get reminders and weather alerts"
            right={
              <Switch
                value={notifications}
                onValueChange={setNotifications}
                trackColor={{ false: colors.borderSoft, true: colors.accentGreen }}
                thumbColor="#fff"
              />
            }
            style={{ paddingVertical: 8 }}
          />
          <Divider />

          {/* Language Selector */}
          <View style={{ marginTop: 8 }}>
            <Text style={[styles.sectionTitle, { fontSize: typography.sm, marginBottom: 10 }]}>Language</Text>
            <Dropdown
              label="Select Language"
              value={LANGUAGES[langIdx]}
              options={LANGUAGES.map((lang, i) => ({
                label: lang,
                value: lang,
                icon: LANG_FLAGS[i]
              }))}
              onSelect={(val) => {
                const idx = LANGUAGES.indexOf(val);
                if (idx !== -1) setLangIdx(idx);
              }}
            />
          </View>
        </CardElevated>

        {/* ── About ── */}
        <CardElevated style={{ marginTop: 16 }}>
          <Text style={styles.sectionTitle}>About Krushak</Text>
          {menuItems.map((item, i) => (
            <React.Fragment key={item.title}>
              {i > 0 && <Divider />}
              <ListRow
                left={
                  <View style={[styles.settingIconBg, { backgroundColor: colors.lightGreen }]}>
                    <Ionicons name={item.icon} size={18} color={colors.primaryGreen} />
                  </View>
                }
                title={item.title}
                subtitle={item.sub}
                right={<Ionicons name="chevron-forward-outline" size={16} color={colors.textGrey} />}
                onPress={() => {}}
                style={{ paddingVertical: 8 }}
              />
            </React.Fragment>
          ))}
        </CardElevated>

        {/* ── Logout ── */}
        <TouchableOpacity style={styles.logoutBtn} onPress={handleLogout} activeOpacity={0.85}>
          <Ionicons name="log-out-outline" size={20} color={colors.danger} />
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        <View style={{ height: 32 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

function StatBox({ value, label, icon, color }) {
  return (
    <View style={styles.statBox}>
      <View style={[styles.statIconBg, { backgroundColor: `${color}18` }]}>
        <Ionicons name={icon} size={18} color={color} />
      </View>
      <Text style={[styles.statValue, { color }]}>{value}</Text>
      <Text style={styles.statLabel}>{label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg },

  avatarCard: {
    backgroundColor: colors.primaryGreen, borderRadius: 26,
    padding: 28, alignItems: 'center',
    ...shadows.hero,
  },
  avatarRing: {
    width: 88, height: 88, borderRadius: 44,
    backgroundColor: 'rgba(255,255,255,0.15)',
    alignItems: 'center', justifyContent: 'center', marginBottom: 12,
    borderWidth: 2, borderColor: 'rgba(255,255,255,0.3)',
  },
  avatar: {
    width: 72, height: 72, borderRadius: 36,
    backgroundColor: 'rgba(255,255,255,0.25)',
    alignItems: 'center', justifyContent: 'center',
  },
  avatarText: { fontSize: 28, fontWeight: '800', color: '#fff' },
  userName: { fontSize: typography.xl, fontWeight: '800', color: '#fff', marginTop: 4 },
  userEmail: { fontSize: typography.sm, color: 'rgba(255,255,255,0.8)', marginTop: 4 },
  locationRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 8 },
  locationText: { fontSize: 12, color: 'rgba(255,255,255,0.86)' },

  sectionTitle: { fontSize: typography.lg, fontWeight: '800', color: colors.textDark, marginBottom: 8 },

  statsRow: { flexDirection: 'row', alignItems: 'center', marginTop: 8 },
  statBox: { flex: 1, alignItems: 'center', paddingVertical: 8, gap: 4 },
  statIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center', marginBottom: 2 },
  statValue: { fontSize: typography.xl, fontWeight: '800' },
  statLabel: { fontSize: typography.xs, color: colors.textGrey, marginTop: 1 },
  statDivider: { width: 1, height: 48, backgroundColor: colors.borderSoft },

  settingIconBg: { width: 36, height: 36, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },

  langChip: {
    flexDirection: 'row', alignItems: 'center', gap: 5,
    borderRadius: 999, paddingHorizontal: 14, paddingVertical: 9,
    backgroundColor: colors.backgroundGreen, marginRight: 8,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  langChipActive: { backgroundColor: colors.primaryGreen, borderColor: colors.primaryGreen },
  langChipText: { fontSize: 13, fontWeight: '600', color: colors.textGrey },
  langChipTextActive: { color: '#fff' },

  logoutBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    gap: 8, marginTop: 16, backgroundColor: '#fff',
    borderRadius: 14, paddingVertical: 15,
    borderWidth: 1.5, borderColor: colors.danger,
  },
  logoutText: { fontSize: typography.md, fontWeight: '800', color: colors.danger },
});
