import React, { useState, useRef, useEffect } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity, StyleSheet,
  TextInput, RefreshControl, Modal, KeyboardAvoidingView,
  Platform, Animated, Pressable, Dimensions, Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { colors, radii, spacing, typography, shadows } from '../theme/tokens';
import {
  fetchCrops, addCrop, deleteCrop,
  fetchLivestock, addLivestock, deleteLivestock, updateLivestock,
  addReminder, deleteReminder, toggleReminder, fetchHomeData,
  fetchFarmData, addLivestockFeedReminder
} from '../services/api';
import { generateIrrigationGuide } from '../services/aiGuideService';
import { Card, CardElevated, Tag, LoadingState, HealthBar, Divider } from '../components/UIKit';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

const TABS = [
  { label: 'All Crops', icon: 'leaf-outline', activeIcon: 'leaf' },
  { label: 'Reminders', icon: 'alarm-outline', activeIcon: 'alarm' },
  { label: 'Livestock', icon: 'paw-outline', activeIcon: 'paw' },
];

/* ── Generic Bottom Sheet Modal ───────────────────────────────── */
function InputModal({ visible, title, fields, onConfirm, onCancel, confirmLabel = 'Save', icon }) {
  const [values, setValues] = useState({});
  const [errorKeys, setErrorKeys] = useState([]);
  const [openDropdown, setOpenDropdown] = useState(null);
  const slideAnim = useRef(new Animated.Value(600)).current;
  const backdropOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (visible) {
      const initialValues = {};
      fields.forEach(f => {
        if (f.defaultValue !== undefined) initialValues[f.key] = f.defaultValue;
      });
      setValues(initialValues);
      setErrorKeys([]);
      setOpenDropdown(null);
      Animated.parallel([
        Animated.spring(slideAnim, { toValue: 0, useNativeDriver: true, damping: 22, stiffness: 100 }),
        Animated.timing(backdropOpacity, { toValue: 1, duration: 300, useNativeDriver: true }),
      ]).start();
    } else {
      Animated.parallel([
        Animated.timing(slideAnim, { toValue: 800, duration: 250, useNativeDriver: true }),
        Animated.timing(backdropOpacity, { toValue: 0, duration: 250, useNativeDriver: true }),
      ]).start();
    }
  }, [visible, fields]);

  const requiredFields = fields.filter(f => f.required);
  const isComplete = requiredFields.every(f => {
    const v = values[f.key];
    return v !== undefined && v !== null && v.toString().trim() !== '';
  });

  const handleConfirm = () => {
    const missing = requiredFields.filter(f => {
      const v = values[f.key];
      return v === undefined || v === null || v.toString().trim() === '';
    });
    if (missing.length > 0) {
      setErrorKeys(missing.map(f => f.key));
      setOpenDropdown(null);
      return;
    }
    setErrorKeys([]);
    onConfirm(values);
  };

  const updateValue = (key, val) => {
    setValues(prev => ({ ...prev, [key]: val }));
    if (errorKeys.includes(key)) {
      setErrorKeys(prev => prev.filter(k => k !== key));
    }
  };

  const toggleDropdown = (key) => {
    setOpenDropdown(prev => (prev === key ? null : key));
  };

  return (
    <Modal visible={visible} transparent animationType="none" onRequestClose={onCancel}>
      <View style={{ flex: 1 }}>
        <Animated.View style={[styles.modalBackdrop, { opacity: backdropOpacity }]}>
          <TouchableOpacity style={{ flex: 1 }} onPress={onCancel} activeOpacity={1} />
        </Animated.View>
        
        <KeyboardAvoidingView 
          style={{ flex: 1, justifyContent: 'flex-end' }} 
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        >
          <Animated.View style={[styles.modalSheet, { transform: [{ translateY: slideAnim }] }]}>
            <View style={styles.sheetHandle} />
          
            <View style={styles.modalHeader}>
              <Text style={{ fontSize: 24, marginRight: 8 }}>{icon}</Text>
              <Text style={styles.modalTitle}>{title}</Text>
              <TouchableOpacity onPress={onCancel} style={styles.closeBtn}>
                <Ionicons name="close" size={20} color={colors.primaryGreen} />
              </TouchableOpacity>
            </View>

            <ScrollView 
              style={{ maxHeight: SCREEN_WIDTH > 400 ? 520 : 420 }} 
              showsVerticalScrollIndicator={false} 
              contentContainerStyle={{ paddingBottom: 30 }}
              keyboardShouldPersistTaps="handled"
              nestedScrollEnabled
            >
              <View style={styles.fieldGrid}>
                {fields.map((field) => {
                  const hasError = errorKeys.includes(field.key);
                  const isOpen = openDropdown === field.key;
                  const selectedOpt = field.options?.find(o => o.value === values[field.key]);
                  return (
                    <View key={field.key} style={[field.half ? { width: '48%' } : { width: '100%' }]}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 8, marginTop: 16 }}>
                        {field.icon && <Ionicons name={field.icon} size={14} color={hasError ? '#e53935' : colors.textGrey} />}
                        <Text style={[styles.fieldLabel, hasError && { color: '#e53935' }]}>
                          {field.label.toUpperCase()}
                        </Text>
                        {hasError && <Text style={{ fontSize: 10, color: '#e53935', fontWeight: '700' }}>REQUIRED</Text>}
                      </View>

                      {field.type === 'grid' ? (
                        <View style={[styles.optionsGrid, hasError && styles.errorBorderWrap]}>
                          {field.options.map((opt) => {
                            const isActive = values[field.key] === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[styles.gridOption, isActive && styles.gridOptionActive]}
                                onPress={() => updateValue(field.key, opt.value)}
                                activeOpacity={0.7}
                              >
                                <Text style={{ fontSize: 24, marginBottom: 4 }}>{opt.icon}</Text>
                                <Text style={[styles.gridOptionText, isActive && styles.gridOptionTextActive]}>{opt.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : field.type === 'dropdown' ? (
                        <View>
                          <TouchableOpacity
                            style={[styles.inlineDropTrigger, hasError && styles.fieldInputError, isOpen && styles.inlineDropTriggerOpen]}
                            onPress={() => toggleDropdown(field.key)}
                            activeOpacity={0.8}
                          >
                            <View style={{ flexDirection: 'row', alignItems: 'center', flex: 1, gap: 8 }}>
                              {selectedOpt?.icon && <Text style={{ fontSize: 18 }}>{selectedOpt.icon}</Text>}
                              <Text style={[styles.inlineDropValue, !selectedOpt && styles.inlineDropPlaceholder]}>
                                {selectedOpt ? selectedOpt.label : (field.placeholder || 'Select…')}
                              </Text>
                            </View>
                            <Ionicons
                              name={isOpen ? 'chevron-up' : 'chevron-down'}
                              size={16}
                              color={colors.textGrey}
                            />
                          </TouchableOpacity>
                          {/* Inline options list */}
                          {isOpen && (
                            <View style={styles.inlineDropList}>
                              <ScrollView nestedScrollEnabled showsVerticalScrollIndicator={false} style={{ maxHeight: 240 }}>
                                {field.options.map((opt) => {
                                  const isActive = values[field.key] === opt.value;
                                  return (
                                    <TouchableOpacity
                                      key={opt.value}
                                      style={[styles.inlineDropItem, isActive && styles.inlineDropItemActive]}
                                      onPress={() => {
                                        updateValue(field.key, opt.value);
                                        setOpenDropdown(null);
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      {opt.icon && <Text style={{ fontSize: 18, marginRight: 10 }}>{opt.icon}</Text>}
                                      <Text style={[styles.inlineDropItemText, isActive && styles.inlineDropItemTextActive]}>
                                        {opt.label}
                                      </Text>
                                      {isActive && <Ionicons name="checkmark" size={16} color={colors.primaryGreen} style={{ marginLeft: 'auto' }} />}
                                    </TouchableOpacity>
                                  );
                                })}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      ) : field.type === 'select' ? (
                        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
                          {field.options.map(opt => {
                            const isActive = values[field.key] === opt.value;
                            return (
                              <TouchableOpacity
                                key={opt.value}
                                style={[styles.selectOption, isActive && styles.selectOptionActive]}
                                onPress={() => updateValue(field.key, opt.value)}
                                activeOpacity={0.7}
                              >
                                {opt.icon && <Text style={{ marginRight: 4, fontSize: 16 }}>{opt.icon}</Text>}
                                <Text style={[styles.selectOptionText, isActive && styles.selectOptionTextActive]}>{opt.label}</Text>
                              </TouchableOpacity>
                            );
                          })}
                        </ScrollView>
                      ) : (
                        <TextInput
                          style={[
                            styles.fieldInput,
                            field.multiline && { height: 100, textAlignVertical: 'top' },
                            hasError && styles.fieldInputError,
                          ]}
                          placeholder={field.placeholder || ''}
                          placeholderTextColor={hasError ? '#ef9a9a' : colors.textGrey}
                          value={values[field.key] || ''}
                          onChangeText={(v) => updateValue(field.key, v)}
                          keyboardType={field.keyboardType || 'default'}
                          multiline={field.multiline}
                          blurOnSubmit={!field.multiline}
                        />
                      )}
                    </View>
                  );
                })}
              </View>
            </ScrollView>

            <TouchableOpacity
              style={[styles.modalConfirmBtn, isComplete && styles.modalConfirmBtnActive]}
              onPress={handleConfirm}
              activeOpacity={0.85}
            >
              <Text style={{ fontSize: 20, marginRight: 8 }}>{icon}</Text>
              <Text style={styles.modalConfirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </Animated.View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

export default function MyFarmScreen() {
  const [tab, setTab] = useState(0);
  const [showAddCrop, setShowAddCrop] = useState(false);
  const [showAddLivestock, setShowAddLivestock] = useState(false);
  const [showAddReminder, setShowAddReminder] = useState(false);
  const qc = useQueryClient();

  const { data: homeData } = useQuery({ queryKey: ['home'], queryFn: () => fetchHomeData() });
  const { data: cropData, isLoading: cropsLoading, refetch: refetchCrops } = useQuery({ queryKey: ['crops'], queryFn: () => fetchCrops(), staleTime: 0 });
  const { data: farmData, isLoading: farmLoading, refetch: refetchFarm } = useQuery({ queryKey: ['farmData'], queryFn: () => fetchFarmData(), staleTime: 0 });

  const crops = cropData?.crops || [];
  const reminders = farmData?.reminders || [];
  const livestock = farmData?.livestock || [];
  const latestDiagnosis = homeData?.diagnoses?.[0];
  const avgHealthRaw = homeData?.farmHealth || 88;
  const avgHealth = avgHealthRaw <= 1 ? Math.round(avgHealthRaw * 100) : avgHealthRaw;

  // Mutations
  const addCropMut = useMutation({ 
    mutationFn: addCrop, 
    onSuccess: (newCrop) => { 
      qc.invalidateQueries({ queryKey: ['crops'] }); 
      qc.invalidateQueries({ queryKey: ['farmData'] }); 
      setShowAddCrop(false); 
      // Generate AI Irrigation guide in the background
      if (newCrop) {
        generateIrrigationGuide(newCrop).catch(e => console.log('Background AI guide error:', e));
      }
    },
    onError: (err) => Alert.alert('Error', err?.response?.data?.message || 'Could not add crop. Are you logged in?'),
  });
  const deleteCropMut = useMutation({ mutationFn: deleteCrop, onSuccess: () => { qc.invalidateQueries({ queryKey: ['crops'] }); qc.invalidateQueries({ queryKey: ['farmData'] }); } });
  const addLsMut = useMutation({ 
    mutationFn: addLivestock, 
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmData'] }); setShowAddLivestock(false); },
    onError: (err) => Alert.alert('Error', err?.response?.data?.message || 'Could not add livestock. Are you logged in?'),
  });
  const updateLsMut = useMutation({ mutationFn: ({ id, data }) => updateLivestock(id, data), onSuccess: () => qc.invalidateQueries({ queryKey: ['farmData'] }) });
  const deleteLsMut = useMutation({ mutationFn: deleteLivestock, onSuccess: () => qc.invalidateQueries({ queryKey: ['farmData'] }) });
  const feedLsMut = useMutation({ mutationFn: ({ id, payload }) => addLivestockFeedReminder(id, payload), onSuccess: () => qc.invalidateQueries({ queryKey: ['farmData'] }) });
  const addReminderMut = useMutation({ 
    mutationFn: addReminder, 
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['farmData'] }); setShowAddReminder(false); },
    onError: (err) => Alert.alert('Error', err?.response?.data?.message || 'Could not add reminder. Are you logged in?'),
  });
  const toggleReminderMut = useMutation({ mutationFn: toggleReminder, onSuccess: () => qc.invalidateQueries({ queryKey: ['farmData'] }) });
  const deleteReminderMut = useMutation({ mutationFn: deleteReminder, onSuccess: () => qc.invalidateQueries({ queryKey: ['farmData'] }) });

  const onRefresh = () => { refetchCrops(); refetchFarm(); qc.invalidateQueries({ queryKey: ['home'] }); };

  return (
    <SafeAreaView style={styles.root} edges={['top']}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={false} onRefresh={onRefresh} tintColor={colors.accentGreen} />}
      >
        {/* ── Hero Header ── */}
        <CardElevated style={styles.heroCard}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 14 }}>
            <View style={styles.heroIconWrap}>
              <Text style={{ fontSize: 32 }}>🌾</Text>
            </View>
            <View>
              <Text style={styles.heroTitle}>My Farm</Text>
              <Text style={styles.heroSub}>
                {homeData?.weather?.temp || '33'}°C • {homeData?.weather?.desc || 'Hot & sunny'} • 💪 {avgHealth}% avg health
              </Text>
            </View>
          </View>
        </CardElevated>

        {/* ── Latest Diagnosis Bar ── */}
        <TouchableOpacity style={styles.diagnosisBar} activeOpacity={0.8}>
          <Ionicons name="checkmark-circle" size={18} color={colors.accentGreen} />
          <Text style={styles.diagnosisText}>
            Latest: {latestDiagnosis?.diseaseName || 'Black Spot of Rose'} ({latestDiagnosis?.confidence ? Math.round(latestDiagnosis.confidence * 100) : '90'}%)
          </Text>
        </TouchableOpacity>

        {/* ── Tab Switcher ── */}
        <View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.tabStrip}>
            {TABS.map((t, i) => {
              const count = i === 0 ? crops.length : i === 1 ? reminders.length : livestock.length;
              return (
                <TouchableOpacity
                  key={t.label}
                  style={[styles.tabChip, tab === i && styles.tabChipActive]}
                  onPress={() => setTab(i)}
                  activeOpacity={0.8}
                >
                  <Ionicons name={tab === i ? t.activeIcon : t.icon} size={16} color={tab === i ? colors.primaryGreen : colors.textGrey} />
                  <Text style={[styles.tabChipText, tab === i && styles.tabChipTextActive]}>{t.label}</Text>
                  <View style={[styles.tabBadge, tab === i && { backgroundColor: colors.primaryGreen }]}>
                    <Text style={styles.tabBadgeText}>{count}</Text>
                  </View>
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        </View>

        {/* ── Tab Content ── */}
        <View style={{ marginTop: 16 }}>
          {tab === 0 && (
            <View style={{ gap: 14 }}>
              <AddTrigger label="Add Crop" onPress={() => setShowAddCrop(true)} />
              {crops.map((c, i) => (
                <CropCard key={c._id || i} crop={c} onDelete={() => deleteCropMut.mutate(c._id)} />
              ))}
            </View>
          )}

          {tab === 1 && (
            <View>
              <AddTrigger label="Add Reminder" onPress={() => setShowAddReminder(true)} />
              {/* Quick Templates */}
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginVertical: 14 }} contentContainerStyle={{ gap: 8 }}>
                {(farmData?.quickReminderTemplates || []).map((tpl) => (
                  <TouchableOpacity key={tpl.id} style={styles.tplBtn} onPress={() => addReminderMut.mutate({ 
                    task: tpl.task, 
                    dueAtLabel: tpl.dueAtLabel, 
                    category: tpl.category, 
                    priority: tpl.priority 
                  })}>
                    <Ionicons name="flash-outline" size={14} color={colors.primaryGreen} />
                    <Text style={styles.tplBtnText}>{tpl.title}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
              {reminders.map((r, i) => (
                <ReminderCard
                  key={r._id || i}
                  reminder={r}
                  isLast={i === reminders.length - 1}
                  onToggle={() => toggleReminderMut.mutate(r._id)}
                  onDelete={() => deleteReminderMut.mutate(r._id)}
                />
              ))}
            </View>
          )}

          {tab === 2 && (
            <View style={{ gap: 14 }}>
              <AddTrigger label="Add Livestock" onPress={() => setShowAddLivestock(true)} />
              <Card style={styles.lsOverview}>
                <Text style={styles.lsOverviewTitle}>Herd Overview</Text>
                <View style={styles.lsOverviewRow}>
                  <Text style={styles.lsOverviewSub}>
                    {farmLoading ? 'Loading...' : `${livestock.length} animal group${livestock.length !== 1 ? 's' : ''} tracked`}
                  </Text>
                  <Tag label={`${livestock.reduce((s, l) => s + (l.count || 1), 0)} total`} variant="success" />
                </View>
              </Card>
              {farmLoading ? (
                <View style={{ alignItems: 'center', padding: 32 }}>
                  <Text style={{ fontSize: 32, marginBottom: 8 }}>🐾</Text>
                  <Text style={{ color: colors.textGrey, fontWeight: '600' }}>Loading livestock...</Text>
                </View>
              ) : livestock.length === 0 ? (
                <View style={{ alignItems: 'center', padding: 32, backgroundColor: '#fff', borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft }}>
                  <Text style={{ fontSize: 40, marginBottom: 12 }}>🐄</Text>
                  <Text style={{ fontSize: 16, fontWeight: '800', color: colors.textDark, marginBottom: 6 }}>No livestock yet</Text>
                  <Text style={{ fontSize: 13, color: colors.textGrey, textAlign: 'center', marginBottom: 16 }}>
                    Tap "Add Livestock" above to start tracking your animals
                  </Text>
                  <TouchableOpacity style={styles.addTrigger} onPress={() => setShowAddLivestock(true)} activeOpacity={0.7}>
                    <Ionicons name="add" size={18} color={colors.primaryGreen} />
                    <Text style={styles.addTriggerText}>Add First Animal</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                livestock.map((l, i) => (
                  <LivestockCard
                    key={l._id || i}
                    ls={l}
                    onDelete={() => deleteLsMut.mutate(l._id)}
                    onUpdateHealth={(delta) => {
                      const next = Math.max(0, Math.min(1, (l.healthScore || 0.8) + delta / 100));
                      updateLsMut.mutate({ id: l._id, data: { healthScore: next } });
                    }}
                    onFeedReminder={() => {
                      feedLsMut.mutate({ id: l._id, payload: { dueAtLabel: 'Today 7:00 PM' } });
                    }}
                  />
                ))
              )}
            </View>
          )}
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* ── Modals ── */}
      <InputModal
        visible={showAddCrop}
        title="Add New Crop"
        icon="🌱"
        confirmLabel="Add Crop"
        fields={[
          { key: 'name', label: 'CROP NAME *', placeholder: 'e.g. Wheat, Tomato, Rice...', icon: 'leaf-outline', required: true },
          { key: 'variety', label: 'VARIETY / TYPE', placeholder: 'e.g. HD-2967, Cherry, Basmati...', icon: 'pricetag-outline' },
          { 
            key: 'stage', 
            label: 'GROWTH STAGE', 
            icon: 'analytics-outline',
            type: 'grid',
            options: [
              { label: 'Sowing', value: 'sowing', icon: '🌱' },
              { label: 'Germination', value: 'germination', icon: '🌿' },
              { label: 'Vegetative', value: 'vegetative', icon: '🥬' },
              { label: 'Flowering', value: 'flowering', icon: '🌸' },
              { label: 'Fruiting', value: 'fruiting', icon: '🍎' },
              { label: 'Harvest', value: 'harvest', icon: '🌾' },
            ]
          },
          { key: 'sowingDate', label: 'SOWING DATE', placeholder: 'mm/dd/yyyy', icon: 'calendar-outline', half: true },
          { key: 'fieldSizeAcres', label: 'FIELD SIZE (ACRES) *', placeholder: '1', keyboardType: 'numeric', icon: 'grid-outline', half: true, required: true },
          { key: 'notes', label: 'NOTES (OPTIONAL)', placeholder: 'Any observations, soil type, previous yield...', icon: 'document-text-outline', multiline: true },
        ]}
        onConfirm={(v) => addCropMut.mutate({
          ...v,
          fieldSizeAcres: parseFloat(v.fieldSizeAcres) || 1,
        })}
        onCancel={() => setShowAddCrop(false)}
      />

      <InputModal
        visible={showAddLivestock}
        title="Add Livestock"
        icon="🐄"
        confirmLabel="Save Livestock"
        fields={[
          { 
            key: 'type', 
            label: 'LIVESTOCK TYPE *', 
            icon: 'paw-outline', 
            type: 'dropdown',
            placeholder: 'Select animal type',
            required: true,
            options: [
              { label: 'Cow', value: 'Cow', icon: '🐄' },
              { label: 'Buffalo', value: 'Buffalo', icon: '🐃' },
              { label: 'Goat', value: 'Goat', icon: '🐐' },
              { label: 'Sheep', value: 'Sheep', icon: '🐑' },
              { label: 'Chicken', value: 'Chicken', icon: '🐔' },
              { label: 'Duck', value: 'Duck', icon: '🦆' },
              { label: 'Pig', value: 'Pig', icon: '🐖' },
              { label: 'Horse', value: 'Horse', icon: '🐎' },
              { label: 'Rabbit', value: 'Rabbit', icon: '🐇' },
            ]
          },
          { key: 'name', label: 'NICKNAME (OPTIONAL)', placeholder: 'e.g. Amul', icon: 'create-outline', half: true },
          { key: 'count', label: 'COUNT *', placeholder: '1', keyboardType: 'numeric', icon: 'add-outline', half: true, required: true },
          { key: 'healthScore', label: 'HEALTH SCORE (0-1)', placeholder: '0.8', keyboardType: 'numeric', icon: 'medkit-outline', half: true },
          { key: 'feedIntervalHours', label: 'FEED INTERVAL (HOURS) *', placeholder: '12', keyboardType: 'numeric', icon: 'restaurant-outline', half: true, required: true },
          { key: 'lastFedAtLabel', label: 'LAST FED LABEL', placeholder: 'Today 7:00 AM', icon: 'time-outline', half: true },
          { key: 'notes', label: 'NOTES (OPTIONAL)', placeholder: 'Breed, age, etc.', icon: 'document-text-outline', multiline: true },
        ]}
        onConfirm={(v) => addLsMut.mutate({
          ...v,
          count: parseInt(v.count) || 1,
          healthScore: parseFloat(v.healthScore) || 0.8,
          feedIntervalHours: parseInt(v.feedIntervalHours) || 12,
        })}
        onCancel={() => setShowAddLivestock(false)}
      />

      <InputModal
        visible={showAddReminder}
        title="Add Reminder"
        icon="⏰"
        confirmLabel="Save Reminder"
        fields={[
          { key: 'task', label: 'TASK *', placeholder: 'e.g. Spray pest control', icon: 'create-outline', required: true },
          { key: 'dueAtLabel', label: 'DUE LABEL', placeholder: 'Today 6:00 PM', icon: 'calendar-outline', half: true },
          { 
            key: 'priority', 
            label: 'PRIORITY *', 
            icon: 'warning-outline', 
            half: true,
            type: 'dropdown',
            placeholder: 'Priority',
            required: true,
            options: [
              { label: 'High', value: 'high', icon: '🔴' },
              { label: 'Med', value: 'medium', icon: '🟡' },
              { label: 'Low', value: 'low', icon: '🟢' },
            ]
          },
          {
            key: 'category',
            label: 'CATEGORY *',
            icon: 'bookmark-outline',
            type: 'dropdown',
            placeholder: 'Select category',
            required: true,
            options: [
              { label: 'General', value: 'general', icon: '📋' },
              { label: 'Crop', value: 'crop', icon: '🌾' },
              { label: 'Irrigation', value: 'irrigation', icon: '💧' },
              { label: 'Spray', value: 'spray', icon: '🧪' },
              { label: 'Harvest', value: 'harvest', icon: '🚜' },
              { label: 'Livestock Feed', value: 'livestock-feed', icon: '🐄' },
              { label: 'Livestock Health', value: 'livestock-health', icon: '🩺' },
            ]
          },
        ]}
        onConfirm={(v) => addReminderMut.mutate({
          ...v,
          priority: v.priority || 'medium',
          category: (v.category || 'general').toLowerCase(),
        })}
        onCancel={() => setShowAddReminder(false)}
      />
    </SafeAreaView>
  );
}

/* ── UI Components ────────────────────────────────────────────── */

function AddTrigger({ label, onPress }) {
  return (
    <TouchableOpacity style={styles.addTrigger} onPress={onPress} activeOpacity={0.7}>
      <Ionicons name="add" size={20} color={colors.primaryGreen} />
      <Text style={styles.addTriggerText}>{label}</Text>
    </TouchableOpacity>
  );
}

function CropCard({ crop, onDelete }) {
  const displayHealth = crop.health != null ? (crop.health <= 1 ? Math.round(crop.health * 100) : crop.health) : 88;
  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <Text style={{ fontSize: 32, marginRight: 12 }}>🍎</Text>
          <Text style={styles.itemName}>{crop.name}</Text>
        </View>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
          <Tag label={crop.status || 'Fruiting'} variant="warning" />
          <TouchableOpacity onPress={() => confirmDelete('Crop', onDelete)}>
            <Ionicons name="trash-outline" size={18} color={colors.danger} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.healthWrap}>
        <HealthBar value={displayHealth} color={colors.primaryGreen} style={{ flex: 1 }} />
        <Text style={styles.healthText}>
          <Text style={{ fontWeight: '800', color: colors.primaryGreen }}>{displayHealth}%</Text> Healthy
        </Text>
      </View>

      <Divider style={{ marginVertical: 12 }} />

      <View style={{ gap: 8 }}>
        <InfoLine icon="water" text="Check irrigation" />
        <InfoLine icon="flash" text="Monitor for fruit borer; maintain even irrigation." color="#f57c00" />
        <InfoLine icon="grid" text={`${crop.area || 1.5} acres`} />
      </View>
    </Card>
  );
}

const getLivestockEmoji = (type = '') => {
  const t = type.toLowerCase();
  if (t.includes('buffalo')) return '🐃';
  if (t.includes('goat')) return '🐐';
  if (t.includes('sheep')) return '🐑';
  if (t.includes('chicken') || t.includes('poultry')) return '🐔';
  if (t.includes('duck')) return '🦆';
  if (t.includes('pig')) return '🐖';
  if (t.includes('horse')) return '🐎';
  if (t.includes('rabbit')) return '🐇';
  return '🐄';
};

function LivestockCard({ ls, onDelete, onUpdateHealth, onFeedReminder }) {
  const emoji = getLivestockEmoji(ls.type);
  const health = ls.healthScore != null ? Math.round(ls.healthScore * 100) : 80;
  return (
    <Card style={styles.itemCard}>
      <View style={styles.itemHeader}>
        <View style={styles.itemTitleRow}>
          <View style={styles.avatarWrap}><Text style={{ fontSize: 24 }}>{emoji}</Text></View>
          <View>
            <Text style={styles.itemName}>{ls.name || ls.type}</Text>
            <Text style={styles.itemMeta}>{ls.type} • {ls.count || 1} animals</Text>
          </View>
        </View>
        <TouchableOpacity style={styles.lsDelete} onPress={() => confirmDelete('Livestock', onDelete)}>
          <Ionicons name="trash" size={18} color="#ffcdd2" />
        </TouchableOpacity>
      </View>

      <View style={styles.healthWrap}>
        <HealthBar value={health} color={health > 70 ? colors.primaryGreen : colors.warning} style={{ flex: 1 }} />
        <Text style={styles.healthText}>
          <Text style={{ fontWeight: '800' }}>{health}%</Text> {health > 70 ? 'Healthy' : 'Fair'}
        </Text>
      </View>

      <View style={styles.lsInfoGrid}>
        <View style={styles.lsInfoItem}>
          <Ionicons name="restaurant-outline" size={14} color={colors.primaryGreen} />
          <Text style={styles.lsInfoText}>Last fed: {ls.lastFedAtLabel || 'Today 7:00 AM'}</Text>
        </View>
        <View style={styles.lsInfoItem}>
          <Ionicons name="time-outline" size={14} color={colors.primaryGreen} />
          <Text style={styles.lsInfoText}>Feed every {ls.feedIntervalHours || 12} hours</Text>
        </View>
      </View>

      <View style={styles.lsActions}>
        <TouchableOpacity style={styles.lsActionBtnPrimary} onPress={onFeedReminder} activeOpacity={0.7}>
          <Ionicons name="notifications-outline" size={14} color="#fff" />
          <Text style={styles.lsActionTextPrimary}>Feed Reminder</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.lsActionBtnSecondary} onPress={() => onUpdateHealth(-10)} activeOpacity={0.7}>
          <Text style={styles.lsActionTextSecondary}>-10%</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.lsActionBtnSecondary} onPress={() => onUpdateHealth(10)} activeOpacity={0.7}>
          <Text style={styles.lsActionTextSecondary}>+10%</Text>
        </TouchableOpacity>
      </View>
    </Card>
  );
}

function ReminderCard({ reminder, onDelete, onToggle, isLast }) {
  return (
    <View style={styles.remContainer}>
      <View style={styles.timeline}>
        <View style={[styles.timelineDot, reminder.done && { backgroundColor: colors.accentGreen }]}>
          {reminder.done && <Ionicons name="checkmark" size={10} color="#fff" />}
        </View>
        {!isLast && <View style={styles.timelineLine} />}
      </View>

      <Card style={[styles.remCard, reminder.done && { opacity: 0.7 }]}>
        <View style={styles.remHeader}>
          <Text style={styles.remTitle} numberOfLines={1}>{reminder.task}</Text>
          <View style={{ flexDirection: 'row', gap: 8 }}>
            <TouchableOpacity style={styles.doneBtn} onPress={onToggle}>
              <Text style={styles.doneBtnText}>{reminder.done ? 'Undo' : 'Done'}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.trashBtn} onPress={() => confirmDelete('Reminder', onDelete)}>
              <Ionicons name="trash" size={16} color="#ef5350" />
            </TouchableOpacity>
          </View>
        </View>

        <View style={{ flexDirection: 'row', gap: 12, marginTop: 8 }}>
          <View style={styles.remMeta}>
            <Ionicons name="calendar-outline" size={12} color={colors.textGrey} />
            <Text style={styles.remMetaText}>{reminder.dueAtLabel || 'Today 6:00 PM'}</Text>
          </View>
          <Text style={[styles.remPriority, { color: colors.danger }]}>{(reminder.priority || 'medium').toUpperCase()}</Text>
        </View>
        <Text style={styles.remCat}>Category: {reminder.category || 'general'}</Text>
      </Card>
    </View>
  );
}

function InfoLine({ icon, text, color = colors.textGrey }) {
  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
      <Ionicons name={icon} size={14} color={color} />
      <Text style={{ fontSize: 13, color, fontWeight: '500' }}>{text}</Text>
    </View>
  );
}

function confirmDelete(label, onDelete) {
  Alert.alert('Remove ' + label, `Are you sure you want to remove this ${label.toLowerCase()}?`, [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Remove', style: 'destructive', onPress: onDelete },
  ]);
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.backgroundGreen },
  scroll: { flex: 1 },
  scrollContent: { padding: spacing.lg, paddingTop: 10 },

  heroCard: { backgroundColor: colors.primaryGreen, padding: 20, borderRadius: 32, marginBottom: 12 },
  heroIconWrap: { width: 56, height: 56, borderRadius: 16, backgroundColor: 'rgba(255,255,255,0.2)', alignItems: 'center', justifyContent: 'center' },
  heroTitle: { fontSize: 28, fontWeight: '900', color: '#fff', letterSpacing: -0.5 },
  heroSub: { fontSize: 13, color: 'rgba(255,255,255,0.9)', marginTop: 4, fontWeight: '600' },

  diagnosisBar: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#fff', padding: 12, borderRadius: 18,
    borderWidth: 1, borderColor: colors.borderSoft, marginBottom: 16,
  },
  diagnosisText: { fontSize: 13, fontWeight: '700', color: '#1b5e20' },

  tabStrip: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
  tabChip: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6,
    backgroundColor: 'rgba(46,125,50,0.06)', borderRadius: 14, paddingVertical: 10, paddingHorizontal: 16,
  },
  tabChipActive: { backgroundColor: '#fff', ...shadows.card },
  tabChipText: { fontSize: 12, fontWeight: '700', color: colors.textGrey },
  tabChipTextActive: { color: colors.primaryGreen },
  tabBadge: { backgroundColor: colors.textGrey, borderRadius: 10, paddingHorizontal: 6, paddingVertical: 1 },
  tabBadgeText: { color: '#fff', fontSize: 10, fontWeight: '800' },

  addTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    borderWidth: 1.5, borderColor: colors.accentGreen, borderStyle: 'dashed',
    borderRadius: 16, paddingVertical: 14, backgroundColor: 'rgba(46,125,50,0.02)',
  },
  addTriggerText: { fontSize: 15, fontWeight: '800', color: colors.primaryGreen },

  itemCard: { padding: 18, borderRadius: 24, borderWidth: 1, borderColor: colors.borderSoft, backgroundColor: '#fff' },
  itemHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  itemTitleRow: { flexDirection: 'row', alignItems: 'center' },
  itemName: { fontSize: 20, fontWeight: '900', color: colors.textDark, letterSpacing: -0.3 },
  itemMeta: { fontSize: 12, color: colors.textGrey, marginTop: 2 },
  healthWrap: { flexDirection: 'row', alignItems: 'center', gap: 12, marginTop: 16 },
  healthText: { fontSize: 13, color: colors.textGrey, width: 90, textAlign: 'right' },

  lsOverview: { padding: 16, borderRadius: 20, borderWidth: 1, borderColor: colors.borderSoft },
  lsOverviewTitle: { fontSize: 16, fontWeight: '800', color: colors.textDark },
  lsOverviewRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 8 },
  lsOverviewSub: { fontSize: 14, color: colors.textGrey },

  avatarWrap: { width: 44, height: 44, borderRadius: 14, backgroundColor: colors.lightGreen, alignItems: 'center', justifyContent: 'center', marginRight: 12 },
  lsInfoGrid: { marginTop: 14, gap: 6 },
  lsInfoItem: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  lsInfoText: { fontSize: 13, color: colors.textGrey, fontWeight: '500' },
  lsActions: { flexDirection: 'row', gap: 8, marginTop: 16 },
  lsActionBtnPrimary: { 
    flex: 2, paddingVertical: 10, borderRadius: 12, 
    backgroundColor: colors.primaryGreen, alignItems: 'center', 
    justifyContent: 'center', flexDirection: 'row', gap: 6,
    ...shadows.sm
  },
  lsActionBtnSecondary: { 
    flex: 1, paddingVertical: 10, borderRadius: 12, 
    backgroundColor: '#f1f8e9', borderWidth: 1, borderColor: colors.borderSoft,
    alignItems: 'center', justifyContent: 'center' 
  },
  lsActionTextPrimary: { fontSize: 12, fontWeight: '700', color: '#fff' },
  lsActionTextSecondary: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },
  lsDelete: { padding: 6, backgroundColor: '#fff', borderRadius: 10 },

  remContainer: { flexDirection: 'row', gap: 12 },
  timeline: { alignItems: 'center', width: 24 },
  timelineDot: { width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: colors.accentGreen, backgroundColor: '#fff', zIndex: 2, alignItems: 'center', justifyContent: 'center' },
  timelineLine: { width: 2, flex: 1, backgroundColor: 'rgba(46,125,50,0.1)', marginTop: -2 },
  remCard: { flex: 1, marginBottom: 16, padding: 14, borderRadius: 20 },
  remHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  remTitle: { flex: 1, fontSize: 15, fontWeight: '800', color: '#1b5e20' },
  doneBtn: { backgroundColor: colors.lightGreen, paddingHorizontal: 12, paddingVertical: 5, borderRadius: 8 },
  doneBtnText: { fontSize: 12, fontWeight: '800', color: colors.primaryGreen },
  trashBtn: { padding: 6, backgroundColor: '#ffebee', borderRadius: 8 },
  remMeta: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  remMetaText: { fontSize: 12, color: colors.textGrey, fontWeight: '600' },
  remPriority: { fontSize: 11, fontWeight: '900' },
  remCat: { fontSize: 11, color: colors.textGrey, marginTop: 6, fontWeight: '500' },

  tplBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: 'rgba(46,125,50,0.06)', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, borderColor: colors.borderSoft },
  tplBtnText: { fontSize: 12, fontWeight: '700', color: colors.primaryGreen },

  // Modal refinement
  modalBackdrop: { ...StyleSheet.absoluteFillObject, backgroundColor: 'rgba(0,0,0,0.4)' },
  modalSheet: { backgroundColor: '#fff', borderTopLeftRadius: 24, borderTopRightRadius: 24, padding: 24, paddingTop: 12, paddingBottom: Platform.OS === 'ios' ? 40 : 24, width: '100%', elevation: 10, shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.1, shadowRadius: 10 },
  sheetHandle: { width: 40, height: 4, borderRadius: 2, backgroundColor: '#e0e0e0', alignSelf: 'center', marginBottom: 16 },
  modalHeader: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  modalTitle: { flex: 1, fontSize: 20, fontWeight: '900', color: '#1b5e20' },
  closeBtn: { padding: 6, backgroundColor: '#e8f5e9', borderRadius: 20, width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  fieldGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' },
  fieldLabel: { fontSize: 11, fontWeight: '800', color: colors.textGrey, letterSpacing: 0.5 },
  fieldInput: { backgroundColor: '#fff', borderRadius: 12, padding: 14, fontSize: 14, color: colors.textDark, borderWidth: 1, borderColor: '#e0e0e0' },
  fieldInputError: { borderColor: '#e53935', borderWidth: 2, backgroundColor: '#fff5f5' },
  errorBorderWrap: { borderRadius: 12, borderWidth: 2, borderColor: '#e53935' },
  modalConfirmBtn: { backgroundColor: '#c8e6c9', borderRadius: 16, paddingVertical: 16, alignItems: 'center', justifyContent: 'center', flexDirection: 'row', marginTop: 12 },
  modalConfirmBtnActive: { backgroundColor: colors.primaryGreen, shadowColor: colors.primaryGreen, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.4, shadowRadius: 8, elevation: 6 },
  modalConfirmText: { fontSize: 16, fontWeight: '800', color: '#fff' },

  // Grid options
  optionsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'space-between' },
  gridOption: { width: '31%', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 12, paddingVertical: 12, alignItems: 'center', justifyContent: 'center' },
  gridOptionActive: { borderColor: colors.primaryGreen, backgroundColor: '#e8f5e9' },
  gridOptionText: { fontSize: 11, fontWeight: '700', color: colors.textGrey, textAlign: 'center' },
  gridOptionTextActive: { color: colors.primaryGreen },

  // Select options
  selectOption: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderWidth: 1, borderColor: '#e0e0e0', borderRadius: 20, paddingVertical: 10, paddingHorizontal: 14 },
  selectOptionActive: { borderColor: colors.primaryGreen, backgroundColor: '#e8f5e9' },
  selectOptionText: { fontSize: 13, fontWeight: '700', color: colors.textGrey },
  selectOptionTextActive: { color: colors.primaryGreen },

  // Inline dropdown (no nested Modal)
  inlineDropTrigger: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: '#fff', borderRadius: 12, paddingHorizontal: 14, paddingVertical: 14,
    borderWidth: 1, borderColor: '#e0e0e0', minHeight: 52,
  },
  inlineDropTriggerOpen: {
    borderColor: colors.primaryGreen, borderBottomLeftRadius: 0, borderBottomRightRadius: 0,
    borderBottomWidth: 0,
  },
  inlineDropValue: { fontSize: 14, color: colors.textDark, fontWeight: '500', flex: 1 },
  inlineDropPlaceholder: { color: colors.textGrey },
  inlineDropList: {
    backgroundColor: '#fff', borderWidth: 1, borderTopWidth: 0,
    borderColor: colors.primaryGreen, borderBottomLeftRadius: 12, borderBottomRightRadius: 12,
    overflow: 'hidden', maxHeight: 260,
  },
  inlineDropItem: {
    flexDirection: 'row', alignItems: 'center',
    paddingHorizontal: 14, paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: '#f0f0f0',
  },
  inlineDropItemActive: { backgroundColor: '#f1f8e9' },
  inlineDropItemText: { fontSize: 14, fontWeight: '500', color: '#555', flex: 1 },
  inlineDropItemTextActive: { color: colors.primaryGreen, fontWeight: '700' },
});
