/**
 * RTLFormRow
 *
 * Canonical label + input row for every form in this app.
 * Centralizes ALL of these RTL decisions so screens don't repeat them:
 *
 *   ✓ Label aligns to reading-start (right in Arabic, left in French)
 *   ✓ Label uses Arabic typography (Cairo, no letterSpacing, no uppercase)
 *   ✓ Error message aligns to reading-start
 *   ✓ Error uses Cairo font in Arabic
 *   ✓ Hint aligns to reading-start
 *   ✓ Required asterisk (* ) placed at reading-end of label
 *   ✓ Consistent vertical spacing — no margin chaos across screens
 *   ✓ Accepts any child (AppInput, RTLTextarea, RTLNumericInput, custom)
 */

import React from 'react';
import { View, Text, StyleSheet, ViewStyle } from 'react-native';
import { useRTL, textAlign, font, row, textProps } from '../../src/utils/rtl';
import { Colors, Fonts } from '../../constants/theme';

interface RTLFormRowProps {
  /** Label shown above the input */
  label?: string;
  /** Marks the field as required — shows a * indicator */
  required?: boolean;
  /** Validation error — shown below the input in danger color */
  error?: string;
  /** Hint text — shown below the input when no error */
  hint?: string;
  /** Override the outer container style */
  style?: ViewStyle;
  children: React.ReactNode;
}

export function RTLFormRow({
  label,
  required = false,
  error,
  hint,
  style,
  children,
}: RTLFormRowProps) {
  const { isRTL } = useRTL();

  const showError = !!error;
  const showHint  = !!hint && !showError;

  return (
    <View style={[styles.wrapper, style]}>
      {/* Label */}
      {!!label && (
        <View style={[styles.labelRow, row(isRTL)]}>
          <Text
            style={[
              styles.label,
              isRTL ? styles.labelAr : styles.labelFr,
              font.semibold(isRTL),
              textAlign(isRTL),
            ]}
            maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
            numberOfLines={1}
          >
            {label}
          </Text>
          {required && (
            <Text style={[styles.required, isRTL ? styles.requiredAr : styles.requiredFr]}>
              {' '}*
            </Text>
          )}
        </View>
      )}

      {/* Field content */}
      {children}

      {/* Error */}
      {showError && (
        <Text
          style={[
            styles.message,
            styles.errorMessage,
            textAlign(isRTL),
            font.regular(isRTL),
            isRTL && styles.messageRTL,
          ]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {error}
        </Text>
      )}

      {/* Hint */}
      {showHint && (
        <Text
          style={[
            styles.message,
            styles.hintMessage,
            textAlign(isRTL),
            font.regular(isRTL),
            isRTL && styles.messageRTL,
          ]}
          maxFontSizeMultiplier={textProps.maxFontSizeMultiplier}
        >
          {hint}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 16,
  },
  labelRow: {
    alignItems: 'baseline',
    marginBottom: 7,
  },
  label: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  labelFr: {
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    fontWeight: '600',
  },
  labelAr: {
    // uppercase and letterSpacing are intentionally absent for Arabic
    fontSize: 13,
    fontWeight: '600',
    letterSpacing: 0,
  },
  required: {
    fontSize: 13,
    color: Colors.danger,
    fontWeight: '700',
  },
  requiredFr: {
    marginLeft: 2,
  },
  requiredAr: {
    marginRight: 2,
  },
  message: {
    fontSize: 12,
    marginTop: 5,
  },
  messageRTL: {
    // In RTL the leading margin should be on the right side
    marginLeft: 0,
    marginRight: 4,
  },
  errorMessage: {
    color: Colors.danger,
    fontWeight: '500',
    marginLeft: 4,
  },
  hintMessage: {
    color: Colors.textMuted,
    marginLeft: 4,
  },
});
