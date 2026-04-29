/**
 * Shared component kit — mirrors the web app's CSS component classes.
 * Includes smooth animations, proper safe-area handling, and premium UI polish.
 */
import React, { useRef } from 'react';
import {
  View, Text, TouchableOpacity, StyleSheet,
  ActivityIndicator, Animated, Pressable, Platform,
} from 'react-native';
import { colors, radii, spacing, shadows, typography } from '../theme/tokens';

/* ── Pressable with scale animation ──────────────────────────── */
export function AnimatedPressable({ children, onPress, style, disabled, activeOpacity = 0.82 }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, {
      toValue: 0.97,
      useNativeDriver: true,
      speed: 40,
      bounciness: 2,
    }).start();
  };

  const onPressOut = () => {
    Animated.spring(scale, {
      toValue: 1,
      useNativeDriver: true,
      speed: 40,
      bounciness: 4,
    }).start();
  };

  return (
    <Pressable
      onPress={onPress}
      onPressIn={onPressIn}
      onPressOut={onPressOut}
      disabled={disabled}
    >
      <Animated.View style={[style, { transform: [{ scale }] }]}>
        {children}
      </Animated.View>
    </Pressable>
  );
}

/* ── Card ─────────────────────────────────────────────────────── */
export function Card({ children, style, onPress }) {
  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} style={[styles.card, style]}>
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[styles.card, style]}>{children}</View>;
}

/* ── Card Elevated ────────────────────────────────────────────── */
export function CardElevated({ children, style, onPress }) {
  if (onPress) {
    return (
      <AnimatedPressable onPress={onPress} style={[styles.cardElevated, style]}>
        {children}
      </AnimatedPressable>
    );
  }
  return <View style={[styles.cardElevated, style]}>{children}</View>;
}

/* ── Section Header ───────────────────────────────────────────── */
export function SectionHeader({ title, icon, rightComponent, style }) {
  return (
    <View style={[styles.sectionHeader, style]}>
      {icon && <View style={styles.sectionIcon}>{icon}</View>}
      <Text style={styles.sectionTitle}>{title}</Text>
      {rightComponent && <View style={{ marginLeft: 'auto' }}>{rightComponent}</View>}
    </View>
  );
}

/* ── Chip ─────────────────────────────────────────────────────── */
export function Chip({ label, color, textColor, style }) {
  return (
    <View
      style={[
        styles.chip,
        color ? { backgroundColor: color } : null,
        style,
      ]}
    >
      <Text style={[styles.chipText, textColor ? { color: textColor } : null]}>
        {label}
      </Text>
    </View>
  );
}

/* ── MetricPill ───────────────────────────────────────────────── */
export function MetricPill({ value, label, color }) {
  return (
    <View style={styles.metricPill}>
      <Text style={[styles.metricValue, color ? { color } : null]}>{value}</Text>
      <Text style={styles.metricLabel}>{label}</Text>
    </View>
  );
}

/* ── Tag ──────────────────────────────────────────────────────── */
export function Tag({ label, variant = 'default', style }) {
  const bg =
    variant === 'warning'
      ? '#FFF3E0'
      : variant === 'danger'
      ? '#FFEBEE'
      : colors.lightGreen;
  const tc =
    variant === 'warning'
      ? colors.warning
      : variant === 'danger'
      ? colors.danger
      : colors.primaryGreen;
  return (
    <View style={[styles.tag, { backgroundColor: bg }, style]}>
      <Text style={[styles.tagText, { color: tc }]}>{label}</Text>
    </View>
  );
}

/* ── Primary Button ───────────────────────────────────────────── */
export function PrimaryButton({ title, onPress, disabled, loading, style, icon }) {
  const scale = useRef(new Animated.Value(1)).current;

  const onPressIn = () => {
    Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 2 }).start();
  };
  const onPressOut = () => {
    Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();
  };

  return (
    <Pressable onPress={onPress} disabled={disabled || loading} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.btnPrimary, disabled && styles.btnDisabled, style, { transform: [{ scale }] }]}>
        {loading ? (
          <ActivityIndicator color="#fff" size="small" />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            {icon}
            <Text style={styles.btnPrimaryText}>{title}</Text>
          </View>
        )}
      </Animated.View>
    </Pressable>
  );
}

/* ── Secondary Button ─────────────────────────────────────────── */
export function SecondaryButton({ title, onPress, disabled, style }) {
  const scale = useRef(new Animated.Value(1)).current;
  const onPressIn = () => Animated.spring(scale, { toValue: 0.97, useNativeDriver: true, speed: 40, bounciness: 2 }).start();
  const onPressOut = () => Animated.spring(scale, { toValue: 1, useNativeDriver: true, speed: 40, bounciness: 4 }).start();

  return (
    <Pressable onPress={onPress} disabled={disabled} onPressIn={onPressIn} onPressOut={onPressOut}>
      <Animated.View style={[styles.btnSecondary, disabled && styles.btnDisabled, style, { transform: [{ scale }] }]}>
        <Text style={styles.btnSecondaryText}>{title}</Text>
      </Animated.View>
    </Pressable>
  );
}

/* ── List Row ─────────────────────────────────────────────────── */
export function ListRow({ left, title, subtitle, right, onPress, style }) {
  const Wrapper = onPress ? TouchableOpacity : View;
  return (
    <Wrapper
      style={[styles.listRow, style]}
      onPress={onPress}
      activeOpacity={0.76}
    >
      {left && <View style={styles.listRowLeft}>{left}</View>}
      <View style={styles.listRowBody}>
        <Text style={styles.listRowTitle} numberOfLines={2}>
          {title}
        </Text>
        {subtitle ? (
          <Text style={styles.listRowSubtitle} numberOfLines={1}>
            {subtitle}
          </Text>
        ) : null}
      </View>
      {right && <View style={styles.listRowRight}>{right}</View>}
    </Wrapper>
  );
}

/* ── Empty State ──────────────────────────────────────────────── */
export function EmptyState({ icon, title, body, action }) {
  return (
    <View style={styles.emptyState}>
      {icon && <Text style={styles.emptyIcon}>{icon}</Text>}
      <Text style={styles.emptyTitle}>{title}</Text>
      {body ? <Text style={styles.emptyBody}>{body}</Text> : null}
      {action}
    </View>
  );
}

/* ── Loading State ────────────────────────────────────────────── */
export function LoadingState({ message = 'Loading…' }) {
  return (
    <View style={styles.loadingState}>
      <ActivityIndicator color={colors.accentGreen} size="large" />
      <Text style={styles.loadingText}>{message}</Text>
    </View>
  );
}

/* ── Error State ──────────────────────────────────────────────── */
export function ErrorState({ message, onRetry }) {
  return (
    <View style={styles.emptyState}>
      <Text style={styles.emptyIcon}>⚠️</Text>
      <Text style={styles.emptyTitle}>Something went wrong</Text>
      <Text style={styles.emptyBody}>{message}</Text>
      {onRetry && (
        <PrimaryButton title="Retry" onPress={onRetry} style={{ marginTop: 16, alignSelf: 'center', paddingHorizontal: 28 }} />
      )}
    </View>
  );
}

/* ── Health Bar ───────────────────────────────────────────────── */
export function HealthBar({ value = 0, color, style }) {
  // Logic: 0-40 (Danger/Red), 40-70 (Warning/Orange), 70-100 (Success/Green)
  const barColor = color || (value > 70 ? colors.accentGreen : value > 40 ? colors.warning : colors.danger);
  return (
    <View style={[styles.healthBarTrack, style]}>
      <View style={[styles.healthBarFill, { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: barColor }]} />
    </View>
  );
}

/* ── Divider ──────────────────────────────────────────────────── */
export function Divider({ style }) {
  return <View style={[styles.divider, style]} />;
}

/* ── Info Row (label + value) ─────────────────────────────────── */
export function InfoRow({ label, value, valueColor, style }) {
  return (
    <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6 }, style]}>
      <Text style={{ fontSize: typography.sm, color: colors.textGrey }}>{label}</Text>
      <Text style={{ fontSize: typography.sm, fontWeight: '700', color: valueColor || colors.textDark }}>{value}</Text>
    </View>
  );
}

/* ── Section Box ──────────────────────────────────────────────── */
export function SectionBox({ title, accent = colors.primaryGreen, icon, children, style }) {
  return (
    <View style={[{
      borderRadius: radii.sm,
      borderWidth: 1,
      borderColor: `${accent}33`,
      backgroundColor: '#f8fbf8',
      padding: 12,
      marginTop: 10,
    }, style]}>
      {title && (
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          {icon}
          <Text style={{ fontSize: typography.sm, fontWeight: '800', color: accent }}>{title}</Text>
        </View>
      )}
      {children}
    </View>
  );
}

/* ─────────────── styles ──────────────────────────────────────── */
const styles = StyleSheet.create({
  card: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.md,
    padding: 14,
    borderWidth: 1,
    borderColor: colors.borderSoft,
  },
  cardElevated: {
    backgroundColor: colors.cardBackground,
    borderRadius: radii.lg,
    padding: 16,
    ...shadows.card,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 10,
  },
  sectionIcon: {
    width: 28,
    height: 28,
    borderRadius: 8,
    backgroundColor: colors.lightGreen,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sectionTitle: {
    fontSize: typography.xl,
    fontWeight: '800',
    color: colors.textDark,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: radii.pill,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: colors.lightGreen,
  },
  chipText: {
    fontSize: typography.xs,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  metricPill: {
    alignItems: 'center',
  },
  metricValue: {
    fontSize: typography.lg,
    fontWeight: '800',
    color: colors.textDark,
  },
  metricLabel: {
    fontSize: typography.xs,
    color: colors.textGrey,
    marginTop: 2,
  },
  tag: {
    borderRadius: radii.pill,
    paddingHorizontal: 8,
    paddingVertical: 3,
    backgroundColor: colors.lightGreen,
  },
  tagText: {
    fontSize: 11,
    fontWeight: '700',
    color: colors.primaryGreen,
  },
  btnPrimary: {
    backgroundColor: colors.accentGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnPrimaryText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: typography.md,
  },
  btnSecondary: {
    backgroundColor: colors.lightGreen,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 18,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSecondaryText: {
    color: colors.primaryGreen,
    fontWeight: '700',
    fontSize: typography.md,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  listRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 10,
    paddingHorizontal: 4,
  },
  listRowLeft: {
    flexShrink: 0,
  },
  listRowBody: {
    flex: 1,
    gap: 2,
  },
  listRowTitle: {
    fontSize: typography.md,
    fontWeight: '600',
    color: colors.textDark,
  },
  listRowSubtitle: {
    fontSize: typography.xs,
    color: colors.textGrey,
  },
  listRowRight: {
    flexShrink: 0,
  },
  emptyState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 32,
    gap: 8,
    minHeight: 200,
  },
  emptyIcon: {
    fontSize: 48,
    marginBottom: 8,
  },
  emptyTitle: {
    fontSize: typography.lg,
    fontWeight: '800',
    color: colors.textDark,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: typography.sm,
    color: colors.textGrey,
    textAlign: 'center',
    lineHeight: 20,
  },
  loadingState: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    minHeight: 200,
  },
  loadingText: {
    fontSize: typography.sm,
    color: colors.textGrey,
  },
  healthBarTrack: {
    height: 8,
    borderRadius: 999,
    backgroundColor: colors.borderSoft,
    overflow: 'hidden',
    width: '100%',
  },
  healthBarFill: {
    height: '100%',
    borderRadius: 999,
  },
  divider: {
    height: 1,
    backgroundColor: colors.borderSoft,
    marginVertical: 8,
  },
});
