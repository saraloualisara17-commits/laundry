/**
 * RTLNumericInput
 *
 * Currency / quantity input for payment amounts, prices, and counts.
 * Solves the hardest RTL numeric problem: numbers are always LTR visually
 * (digits read left-to-right in every language) but the surrounding UI
 * must still feel Arabic-first.
 *
 * Design decisions:
 *   ✓ textAlign: 'center' — numbers look natural centered (no directional bias)
 *   ✓ keyboardType: 'decimal-pad' always (never numeric — decimal-pad shows ".")
 *   ✓ writingDirection: 'ltr' always — prevents cursor jumping to wrong side
 *   ✓ Large font (28px) for the primary amount field
 *   ✓ Optional "All" / shortcut buttons placed at reading-END edge via pos.end()
 *   ✓ Error state changes text color (not border — the input is borderless by design)
 *   ✓ Forward ref for autoFocus management from parent
 *   ✓ Unit label (e.g. "DH") shown inline at reading-end
 */

import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
} from 'react-native';
import * as Haptics from 'expo-haptics';
import { useRTL, pos, font, textProps } from '../../src/utils/rtl';
import { Colors, Fonts, Radius } from '../../constants/theme';

export interface RTLNumericInputProps extends Omit<TextInputProps, 'style' | 'keyboardType' | 'multiline'> {
  /** Current string value (controlled) */
  value: string;
  onChangeText: (v: string) => void;
  /** Currency / unit label shown after the field, e.g. "DH" */
  unit?: string;
  /** Label for the quick-fill button (e.g. "Tout") — set to fill the field */
  quickFillLabel?: string;
  /** Value to set when quick-fill button is pressed */
  quickFillValue?: string;
  /** True when the entered value is invalid (turns number red) */
  hasError?: boolean;
  /** Override outer container style */
  containerStyle?: ViewStyle;
}

const RTLNumericInput = forwardRef<TextInput, RTLNumericInputProps>(function RTLNumericInput(
  {
    value,
    onChangeText,
    unit,
    quickFillLabel,
    quickFillValue,
    hasError = false,
    containerStyle,
    placeholder = '0.00',
    ...rest
  },
  ref
) {
  const { isRTL } = useRTL();

  const handleQuickFill = () => {
    if (quickFillValue !== undefined) {
      onChangeText(quickFillValue);
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    }
  };

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={styles.inputRow}>
        <TextInput
          ref={ref}
          value={value}
          onChangeText={onChangeText}
          keyboardType="decimal-pad"
          // Numbers are ALWAYS visually LTR — digits 0-9 read left-to-right
          textAlign="center"
          // writingDirection ltr prevents cursor jumping in Arabic mode
          style={[
            styles.input,
            { writingDirection: 'ltr' } as any,
            hasError && styles.inputError,
          ]}
          placeholder={placeholder}
          placeholderTextColor={Colors.textMuted}
          {...rest}
        />

        {!!unit && (
          <Text
            style={[styles.unit, font.regular(isRTL)]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
          >
            {unit}
          </Text>
        )}
      </View>

      {/* Quick-fill button — placed at reading-end (right in LTR, left in RTL) */}
      {!!quickFillLabel && quickFillValue !== undefined && (
        <TouchableOpacity
          style={[styles.quickFill, pos.end(0, isRTL), { top: '20%' }]}
          onPress={handleQuickFill}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <Text style={[styles.quickFillText, font.bold(isRTL)]} maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}>
            {quickFillLabel}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
});

export default RTLNumericInput;

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    justifyContent: 'center',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
  },
  input: {
    flex: 1,
    height: 64,
    fontSize: 28,
    fontWeight: '800',
    color: Colors.primary,
    // Prevent Android adding extra padding
    ...(Platform.OS === 'android' && { paddingTop: 0, paddingBottom: 0 }),
  },
  inputError: {
    color: Colors.danger,
  },
  unit: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginLeft: 4,
  },
  quickFill: {
    position: 'absolute',
    backgroundColor: Colors.primary100,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    // top is set inline via pos.end + { top: '20%' }
  },
  quickFillText: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
  },
});
