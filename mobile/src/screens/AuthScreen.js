import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, TextInput, TouchableOpacity, StyleSheet,
  ScrollView, KeyboardAvoidingView, Platform, Alert,
  ActivityIndicator, Animated, Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import { useAuthStore } from '../store/authStore';
import { login, register } from '../services/api';

const { width } = Dimensions.get('window');

export default function AuthScreen() {
  const [mode, setMode] = useState('login'); // 'login' | 'register'
  const [form, setForm] = useState({ fullName: '', email: '', password: '', village: '', district: '' });
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const loginAction = useAuthStore((s) => s.login);

  // Animations
  const logoScale = useRef(new Animated.Value(0.85)).current;
  const contentOpacity = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.parallel([
      Animated.spring(logoScale, { toValue: 1, useNativeDriver: true, speed: 14, bounciness: 8 }),
      Animated.timing(contentOpacity, { toValue: 1, duration: 600, delay: 200, useNativeDriver: true }),
    ]).start();
  }, []);

  useEffect(() => {
    Animated.timing(slideAnim, {
      toValue: mode === 'login' ? 0 : 1,
      duration: 280,
      useNativeDriver: false,
    }).start();
  }, [mode]);

  const update = (key, val) => setForm((f) => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    if (!form.email || !form.password) {
      Alert.alert('Missing fields', 'Please enter email and password.');
      return;
    }
    setLoading(true);
    try {
      let res;
      if (mode === 'login') {
        res = await login({ email: form.email, password: form.password });
      } else {
        if (!form.fullName) {
          Alert.alert('Missing fields', 'Please enter your full name.');
          setLoading(false);
          return;
        }
        res = await register({
          fullName: form.fullName,
          email: form.email,
          password: form.password,
          village: form.village,
          district: form.district,
        });
      }

      if (res?.token) {
        await loginAction({ token: res.token, user: res.user });
      } else {
        Alert.alert('Error', res?.message || 'Something went wrong. Please try again.');
      }
    } catch (err) {
      let errorMsg = err.response?.data?.message || err.message || 'Network error';
      if (err.message === 'Network Error') {
        errorMsg = 'Cannot connect to server. Check your internet or server is running.';
      }
      Alert.alert('Error', errorMsg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <SafeAreaView style={styles.root} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={styles.scroll}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {/* ── Hero Section ── */}
          <Animated.View style={[styles.hero, { opacity: contentOpacity }]}>
            <Animated.View style={[styles.logoWrap, { transform: [{ scale: logoScale }] }]}>
              <Text style={{ fontSize: 42 }}>🌱</Text>
            </Animated.View>
            <Text style={styles.heroTitle}>Krushak</Text>
            <Text style={styles.heroSub}>Smart Farming for Every Farmer</Text>
          </Animated.View>

          {/* ── Tab Strip ── */}
          <Animated.View style={[styles.tabStrip, { opacity: contentOpacity }]}>
            {['login', 'register'].map((m) => (
              <TouchableOpacity
                key={m}
                style={[styles.tabChip, mode === m && styles.tabChipActive]}
                onPress={() => setMode(m)}
                activeOpacity={0.82}
              >
                <Ionicons
                  name={m === 'login' ? 'log-in-outline' : 'person-add-outline'}
                  size={16}
                  color={mode === m ? colors.primaryGreen : colors.textGrey}
                />
                <Text style={[styles.tabChipText, mode === m && styles.tabChipTextActive]}>
                  {m === 'login' ? 'Sign In' : 'Register'}
                </Text>
              </TouchableOpacity>
            ))}
          </Animated.View>

          {/* ── Form Card ── */}
          <Animated.View style={[styles.formCard, { opacity: contentOpacity }]}>
            {/* Register-only fields */}
            {mode === 'register' && (
              <>
                <FormField
                  label="Full Name"
                  placeholder="e.g. Ramesh Kumar"
                  value={form.fullName}
                  onChangeText={(v) => update('fullName', v)}
                  icon="person-outline"
                  autoCapitalize="words"
                />
                <View style={styles.fieldRow}>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="Village"
                      placeholder="Optional"
                      value={form.village}
                      onChangeText={(v) => update('village', v)}
                      icon="home-outline"
                    />
                  </View>
                  <View style={{ flex: 1 }}>
                    <FormField
                      label="District"
                      placeholder="Optional"
                      value={form.district}
                      onChangeText={(v) => update('district', v)}
                      icon="map-outline"
                    />
                  </View>
                </View>
              </>
            )}

            <FormField
              label="Email"
              placeholder="farmer@example.com"
              value={form.email}
              onChangeText={(v) => update('email', v)}
              keyboardType="email-address"
              autoCapitalize="none"
              icon="mail-outline"
            />

            <FormField
              label="Password"
              placeholder="Enter password"
              value={form.password}
              onChangeText={(v) => update('password', v)}
              secureTextEntry={!showPassword}
              icon="lock-closed-outline"
              rightIcon={
                <TouchableOpacity onPress={() => setShowPassword(!showPassword)} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                  <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={18} color={colors.textGrey} />
                </TouchableOpacity>
              }
            />

            {/* Submit */}
            <TouchableOpacity
              style={[styles.submitBtn, loading && styles.submitBtnDisabled]}
              onPress={handleSubmit}
              disabled={loading}
              activeOpacity={0.87}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <>
                  <Ionicons name={mode === 'login' ? 'log-in-outline' : 'person-add-outline'} size={18} color="#fff" />
                  <Text style={styles.submitBtnText}>
                    {mode === 'login' ? 'Sign In' : 'Create Account'}
                  </Text>
                </>
              )}
            </TouchableOpacity>

            {/* Switch mode */}
            <TouchableOpacity
              style={{ marginTop: 14, alignSelf: 'center' }}
              onPress={() => setMode(mode === 'login' ? 'register' : 'login')}
              activeOpacity={0.82}
            >
              <Text style={styles.switchText}>
                {mode === 'login' ? "Don't have an account? " : 'Already registered? '}
                <Text style={{ fontWeight: '800', textDecorationLine: 'underline' }}>
                  {mode === 'login' ? 'Register' : 'Sign In'}
                </Text>
              </Text>
            </TouchableOpacity>
          </Animated.View>

          {/* Feature bullets */}
          <Animated.View style={[styles.features, { opacity: contentOpacity }]}>
            {['🌾 AI crop disease detection', '📊 Real-time mandi prices', '🌤️ Weather-based farm advice'].map((f) => (
              <View key={f} style={styles.featureRow}>
                <Text style={styles.featureText}>{f}</Text>
              </View>
            ))}
          </Animated.View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

/* ── Reusable form field ──────────────────────────────────────── */
function FormField({ label, icon, rightIcon, ...inputProps }) {
  return (
    <View>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.inputWrap}>
        <Ionicons name={icon} size={18} color={colors.textGrey} style={{ marginRight: 8 }} />
        <TextInput
          style={styles.input}
          placeholderTextColor={colors.textGrey}
          {...inputProps}
        />
        {rightIcon}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { flexGrow: 1, padding: spacing.lg },

  hero: { alignItems: 'center', paddingVertical: 28 },
  logoWrap: {
    width: 88, height: 88, borderRadius: 28,
    backgroundColor: colors.lightGreen,
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 14, ...shadows.card,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  heroTitle: {
    fontSize: 34, fontWeight: '900', color: colors.primaryGreen, letterSpacing: -0.5,
  },
  heroSub: { fontSize: typography.sm, color: colors.textGrey, marginTop: 4 },

  tabStrip: {
    flexDirection: 'row', backgroundColor: '#e3ece6',
    borderRadius: 18, padding: 4, gap: 4, marginBottom: 20,
  },
  tabChip: {
    flex: 1, paddingVertical: 11, borderRadius: 14,
    alignItems: 'center', flexDirection: 'row',
    justifyContent: 'center', gap: 6,
  },
  tabChipActive: { backgroundColor: '#fff', ...shadows.card },
  tabChipText: { fontSize: typography.sm, fontWeight: '700', color: colors.textGrey },
  tabChipTextActive: { color: colors.primaryGreen },

  formCard: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.xl, padding: 20,
    ...shadows.card,
    gap: 2,
  },
  label: {
    fontSize: typography.sm, fontWeight: '600',
    color: colors.textDark, marginBottom: 6, marginTop: 12,
  },
  inputWrap: {
    flexDirection: 'row', alignItems: 'center',
    borderWidth: 1, borderColor: colors.borderSoft,
    borderRadius: radii.sm, paddingHorizontal: 12, paddingVertical: 0,
    backgroundColor: colors.backgroundGreen,
  },
  input: {
    flex: 1, fontSize: typography.md, color: colors.textDark,
    paddingVertical: 12,
  },
  fieldRow: { flexDirection: 'row', gap: 10 },
  submitBtn: {
    backgroundColor: colors.accentGreen, borderRadius: 14,
    paddingVertical: 15, alignItems: 'center',
    marginTop: 24, flexDirection: 'row',
    justifyContent: 'center', gap: 8,
  },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontWeight: '800', fontSize: typography.md },
  switchText: { fontSize: typography.sm, color: colors.textGrey, fontWeight: '500' },

  features: { marginTop: 24, gap: 8 },
  featureRow: {
    backgroundColor: 'rgba(255,255,255,0.6)', borderRadius: 12,
    paddingVertical: 10, paddingHorizontal: 14,
    borderWidth: 1, borderColor: colors.borderSoft,
  },
  featureText: { fontSize: typography.sm, color: colors.textDark, fontWeight: '500' },
});
