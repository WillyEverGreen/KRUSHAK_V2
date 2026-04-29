import React, { useState, useRef } from 'react';
import {
  View, Text, TouchableOpacity, Modal, StyleSheet,
  FlatList, Pressable, Dimensions, Platform
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { colors, shadows } from '../theme/tokens';

const { height: SCREEN_HEIGHT, width: SCREEN_WIDTH } = Dimensions.get('window');

export function Dropdown({ label, value, options, onSelect, placeholder = 'Select option', icon, style, triggerStyle, textStyle, iconColor }) {
  const [visible, setVisible] = useState(false);
  const [dropdownTop, setDropdownTop] = useState(0);
  const [dropdownLeft, setDropdownLeft] = useState(0);
  const [dropdownWidth, setDropdownWidth] = useState(0);
  
  const triggerRef = useRef(null);
  const selectedOption = options.find(opt => opt.value === value);

  const openDropdown = () => {
    if (triggerRef.current) {
      triggerRef.current.measure((fx, fy, w, h, px, py) => {
        // py is the absolute Y position
        // px is the absolute X position
        setDropdownTop(py + h + 4);
        setDropdownLeft(px);
        setDropdownWidth(w);
        setVisible(true);
      });
    } else {
      setVisible(true);
    }
  };

  return (
    <View style={[styles.container, style]}>
      <TouchableOpacity
        ref={triggerRef}
        style={[styles.trigger, triggerStyle]}
        onPress={openDropdown}
        activeOpacity={0.7}
      >
        <View style={styles.triggerContent}>
          {selectedOption?.icon ? (
            <Text style={styles.optionIcon}>{selectedOption.icon}</Text>
          ) : icon ? (
            <Ionicons name={icon} size={18} color={colors.primaryGreen} style={{ marginRight: 8 }} />
          ) : null}
          <Text style={[styles.triggerText, !selectedOption && styles.placeholder, textStyle]}>
            {selectedOption ? selectedOption.label : placeholder}
          </Text>
        </View>
        <Ionicons name="chevron-down" size={16} color={iconColor || colors.textGrey} />
      </TouchableOpacity>

      <Modal
        visible={visible}
        transparent
        animationType="none"
        onRequestClose={() => setVisible(false)}
      >
        <Pressable 
          style={styles.modalBackdrop} 
          onPress={() => setVisible(false)}
        >
          <View 
            style={[
              styles.dropdownList, 
              { 
                top: dropdownTop, 
                left: dropdownLeft, 
                width: dropdownWidth,
                maxHeight: SCREEN_HEIGHT - dropdownTop - 20 
              }
            ]}
          >
            <FlatList
              data={options}
              keyExtractor={(item) => item.value}
              renderItem={({ item }) => {
                const isSelected = item.value === value;
                return (
                  <TouchableOpacity
                    style={[styles.optionItem, isSelected && styles.optionItemActive]}
                    onPress={() => {
                      onSelect(item.value);
                      setVisible(false);
                    }}
                  >
                    <View style={styles.optionRow}>
                      {item.icon && <Text style={styles.itemIcon}>{item.icon}</Text>}
                      <Text style={[styles.optionLabel, isSelected && styles.optionLabelActive]}>
                        {item.label}
                      </Text>
                    </View>
                    {isSelected && (
                      <Ionicons name="checkmark" size={18} color={colors.primaryGreen} />
                    )}
                  </TouchableOpacity>
                );
              }}
            />
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
  trigger: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    minHeight: 52,
  },
  triggerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  triggerText: {
    fontSize: 15,
    color: '#333',
    fontWeight: '500',
  },
  placeholder: {
    color: '#999',
  },
  optionIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'transparent',
  },
  dropdownList: {
    position: 'absolute',
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    ...shadows.card,
    elevation: 5,
    overflow: 'hidden',
  },
  optionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 14,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: '#f0f0f0',
  },
  optionItemActive: {
    backgroundColor: '#f5fdf6',
  },
  optionRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  itemIcon: {
    fontSize: 18,
    marginRight: 10,
  },
  optionLabel: {
    fontSize: 15,
    color: '#555',
    fontWeight: '500',
  },
  optionLabelActive: {
    color: colors.primaryGreen,
    fontWeight: '700',
  },
});
