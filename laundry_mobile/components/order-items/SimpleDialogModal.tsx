import React from 'react';
import {
  View, Text, StyleSheet, TouchableOpacity, TextInput,
  Modal, KeyboardAvoidingView, Platform,
} from 'react-native';
import { AdminColors, AdminShadows } from '../../constants/AdminColors';
import { row } from '../../src/utils/rtl';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface SimpleDialogModalProps {
  visible: boolean;
  title: string;
  value: string;
  onChangeText: (v: string) => void;
  onCancel: () => void;
  onConfirm: () => void;
  multiline?: boolean;
  keyboardType?: 'numeric' | 'default';
  placeholder?: string;
  confirmLabel: string;
  cancelLabel: string;
  isArabic: boolean;
}

export default React.memo(function SimpleDialogModal({
  visible, title, value, onChangeText, onCancel, onConfirm,
  multiline, keyboardType = 'default', placeholder,
  confirmLabel, cancelLabel, isArabic,
}: SimpleDialogModalProps) {
  const insets = useSafeAreaInsets();

  return (
    <Modal visible={visible} transparent animationType="fade" statusBarTranslucent onRequestClose={onCancel}>
      <KeyboardAvoidingView
        style={styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={[styles.box, { marginBottom: insets.bottom }]}>
          <Text style={[styles.title, isArabic && { textAlign: 'right' }]}>{title}</Text>
          <TextInput
            style={[
              styles.input,
              multiline && { height: 100, textAlignVertical: 'top' },
              isArabic && { textAlign: 'right' },
            ]}
            keyboardType={keyboardType}
            value={value}
            onChangeText={onChangeText}
            multiline={multiline}
            placeholder={placeholder}
            autoFocus={!multiline}
          />
          <View style={[styles.buttons, row(isArabic)]}>
            <TouchableOpacity style={styles.btn} onPress={onCancel}>
              <Text style={styles.cancelText}>{cancelLabel}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.btn} onPress={onConfirm}>
              <Text style={styles.confirmText}>{confirmLabel}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const styles = StyleSheet.create({
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  box: { backgroundColor: 'white', borderRadius: 24, padding: 24, ...AdminShadows.shadowLarge },
  title: { fontSize: 18, fontWeight: '700', color: AdminColors.textPrimary, marginBottom: 15, textAlign: 'center' },
  input: { borderWidth: 1, borderColor: '#E2E8F0', borderRadius: 14, padding: 14, fontSize: 16, backgroundColor: '#F8FAFC', color: '#1E293B' },
  buttons: { flexDirection: 'row', justifyContent: 'center', marginTop: 20, gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  cancelText: { color: AdminColors.textSecondary, fontWeight: '600', fontSize: 15 },
  confirmText: { color: AdminColors.primary, fontWeight: '700', fontSize: 15 },
});
