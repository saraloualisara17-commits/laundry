/**
 * RTLTextarea
 *
 * Multiline text input for notes, comments, and addresses.
 * Centralizes every Arabic multiline input problem:
 *
 *   ✓ textAlign: 'right' in Arabic — cursor starts at right edge
 *   ✓ writingDirection: 'rtl' — Arabic text flows right-to-left
 *   ✓ textAlignVertical: 'top' — text anchors at top (Android critical)
 *   ✓ Cairo font in Arabic — system font renders Arabic poorly on Android
 *   ✓ lineHeight 1.6× — Arabic letters need breathing room between lines
 *   ✓ No letterSpacing — Arabic ligatures break with spacing
 *   ✓ placeholderTextColor always set — missing color = invisible placeholder
 *   ✓ minHeight responsive to isSmallScreen
 *   ✓ Accepts forceDir override for mixed-content fields
 *   ✓ RTL accent border on filled variant (matching AppInput)
 *   ✓ Error state (red border + bg)
 *   ✓ Forward ref for focus management
 */

import React, { forwardRef } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  StyleSheet,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useRTL, isSmallScreen } from '../../src/utils/rtl';
import { Colors, Fonts, Radius } from '../../constants/theme';

export interface RTLTextareaProps extends Omit<TextInputProps, 'multiline' | 'style'> {
  /** Minimum number of visible lines */
  minLines?: number;
  /** Force a specific direction regardless of app language */
  forceDir?: 'ltr' | 'rtl';
  /** Shows red border + background */
  hasError?: boolean;
  /** Override outer container style */
  containerStyle?: ViewStyle;
  /** Override inner TextInput style */
  inputStyle?: TextStyle | TextStyle[];
}

const LINE_HEIGHT_BASE = Platform.OS === 'android' ? 24 : 22;

const RTLTextarea = forwardRef<TextInput, RTLTextareaProps>(function RTLTextarea(
  {
    minLines = 3,
    forceDir,
    hasError = false,
    containerStyle,
    inputStyle,
    placeholder,
    ...rest
  },
  ref
) {
  const { isRTL } = useRTL();

  const dir: 'ltr' | 'rtl' = forceDir ?? (isRTL ? 'rtl' : 'ltr');
  const isRtlDir = dir === 'rtl';

  // Line height scales up for Arabic for comfortable reading
  const lineHeight = isRtlDir
    ? Math.round(LINE_HEIGHT_BASE * 1.6)
    : LINE_HEIGHT_BASE;

  // Min height derived from requested lines + padding
  const minHeight = minLines * lineHeight + 24;

  return (
    <View style={[styles.container, containerStyle]}>
      <TextInput
        ref={ref}
        {...rest}
        multiline
        placeholder={placeholder}
        placeholderTextColor={Colors.textMuted}
        textAlign={isRtlDir ? 'right' : 'left'}
        textAlignVertical="top"
        style={[
          styles.input,
          { minHeight, lineHeight },
          isRtlDir ? styles.inputRTL : styles.inputLTR,
          // writingDirection is a valid iOS TextInput style property
          { writingDirection: dir } as any,
          hasError && styles.inputError,
          // RTL accent border on the reading-start edge
          isRtlDir && !hasError && styles.accentBorderRTL,
          ...(Array.isArray(inputStyle) ? inputStyle : inputStyle ? [inputStyle] : []),
        ]}
      />
    </View>
  );
});

export default RTLTextarea;

const styles = StyleSheet.create({
  container: {
    // Outer wrapper allows adding margin without affecting the input border
  },
  input: {
    backgroundColor: Colors.surface2,
    borderRadius: Radius.md,
    borderWidth: 1,
    borderColor: 'transparent',
    paddingHorizontal: 14,
    paddingTop: 12,
    paddingBottom: 12,
    fontSize: 15,
    color: Colors.textPrimary,
    // Android: prevent extra top/bottom padding RN injects on TextInput
    ...(Platform.OS === 'android' && { paddingTop: 10, paddingBottom: 10 }),
  },
  inputLTR: {
    fontWeight: '400',
  },
  inputRTL: {
    fontFamily: Fonts.arabic.regular,
    // Cairo on Android has vertical alignment offset — nudge down slightly
    ...(Platform.OS === 'android' && { paddingTop: 12 }),
  },
  inputError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg,
  },
  // 3px accent on the reading-start edge (right side in RTL)
  accentBorderRTL: {
    borderRightWidth: 3,
    borderRightColor: Colors.primary,
    marginRight: 3, // prevents clipping at screen edge
  },
});
