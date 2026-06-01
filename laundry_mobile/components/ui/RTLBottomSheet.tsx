/**
 * RTLBottomSheet
 *
 * The single canonical bottom-sheet wrapper for ALL modals in this app.
 * Solves every RTL modal problem in one place:
 *
 *   ✓ animationType="slide" (consistent feel on both iOS and Android)
 *   ✓ RTLKeyboardContainer inside — keyboard never covers fields
 *   ✓ Draggable handle bar centered regardless of RTL
 *   ✓ maxHeight capped at 90% to prevent overflow on small phones
 *   ✓ iOS safe-area bottom padding baked in
 *   ✓ Title text aligns to reading-start in RTL
 *   ✓ Dismiss backdrop tap closes the sheet
 *   ✓ Android back-button closes the sheet (onRequestClose)
 *   ✓ No hardcoded left/right — all RTL-aware
 */

import React from 'react';
import {
  Modal,
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ViewStyle,
  Platform,
  Dimensions,
  KeyboardAvoidingView,
  ScrollView,
} from 'react-native';
import { useRTL, font, textAlign as rtlTextAlign, textProps } from '../../src/utils/rtl';
import { Colors, Fonts } from '../../constants/theme';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

interface RTLBottomSheetProps {
  visible: boolean;
  onClose: () => void;
  /** Sheet title — rendered in reading-start aligned text */
  title?: string;
  /** Max height as fraction of screen height, default 0.90 */
  maxHeightFraction?: number;
  /** Extra content below the keyboard-safe scroll area (e.g. sticky action buttons) */
  footer?: React.ReactNode;
  /** Override inner sheet container style */
  sheetStyle?: ViewStyle;
  /** Extra bottom padding inside the scroll area */
  extraBottomPad?: number;
  /** Render as a centered card instead of a bottom sheet */
  centered?: boolean;
  children: React.ReactNode;
}

export function RTLBottomSheet({
  visible,
  onClose,
  title,
  maxHeightFraction = 0.90,
  footer,
  sheetStyle,
  extraBottomPad = 0,
  centered = false,
  children,
}: RTLBottomSheetProps) {
  const { isRTL } = useRTL();
  const insets = useSafeAreaInsets();
  const maxHeight = Dimensions.get('window').height * (centered ? Math.min(maxHeightFraction, 0.70) : maxHeightFraction);
  const bottomPad = footer ? 0 : Math.max(insets.bottom, 16) + extraBottomPad;

  return (
    <Modal
      visible={visible}
      animationType={centered ? 'fade' : 'slide'}
      transparent
      onRequestClose={onClose}
      statusBarTranslucent={Platform.OS === 'android'}
    >
      <KeyboardAvoidingView
        style={centered ? styles.overlayCenter : styles.overlay}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        {/* Tap backdrop to dismiss */}
        <TouchableOpacity
          style={centered ? StyleSheet.absoluteFillObject : styles.backdrop}
          activeOpacity={1}
          onPress={onClose}
        />

        <View
          style={[
            centered ? styles.card : styles.sheet,
            centered ? { maxHeight } : { maxHeight },
            sheetStyle,
          ]}
        >
          {/* Drag handle — bottom sheet only */}
          {!centered && <View style={styles.handle} />}

          {/* Optional title */}
          {!!title && (
            <Text
              style={[styles.title, rtlTextAlign(isRTL), font.bold(isRTL)]}
              maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
            >
              {title}
            </Text>
          )}

          <ScrollView
            style={styles.scrollContainer}
            bounces={false}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            contentContainerStyle={{ paddingBottom: centered ? 0 : bottomPad }}
          >
            {children}
          </ScrollView>

          {/* Sticky footer */}
          {footer && (
            <View style={[styles.footer, { paddingBottom: centered ? 0 : insets.bottom + 12 }]}>
              {footer}
            </View>
          )}
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,18,25,0.55)',
    justifyContent: 'flex-end',
  },
  overlayCenter: {
    flex: 1,
    backgroundColor: 'rgba(0,18,25,0.55)',
    justifyContent: 'center',
    paddingHorizontal: 36,
  },
  backdrop: {
    flex: 1,
  },
  card: {
    backgroundColor: Colors.surface,
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
    elevation: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.18,
    shadowRadius: 24,
  },
  sheet: {
    backgroundColor: Colors.surface,
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 20,
    paddingTop: 12,
    // Sheet sizes to content but never exceeds maxHeight (set inline).
    // No flex needed — the sheet is the last item in the KeyboardAvoidingView
    // flex column, sized by its children (handle + title + scroll + footer).
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: 'rgba(0,0,0,0.12)',
    borderRadius: 2,
    alignSelf: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.textPrimary,
    marginBottom: 16,
  },
  scrollContainer: {
    // ScrollView must NOT have flex:1 here — let it size to content naturally.
    // The maxHeight on the sheet clips it if content is too tall.
    flexShrink: 1,
  },
  footer: {
    paddingHorizontal: 0,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.border,
    gap: 10,
  },
});
