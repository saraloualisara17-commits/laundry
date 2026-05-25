/**
 * RTLKeyboardContainer
 *
 * A keyboard-safe form wrapper for bottom sheets and full-screen forms.
 * Handles:
 *   - iOS: behavior="padding" pushes content up correctly
 *   - Android: behavior="height" shrinks the view rather than pushing
 *   - Small screens (< 375px): tighter bottom padding
 *   - Safe-area bottom spacing inside sheets
 *   - RTL-aware ScrollView (doesn't flip scroll direction, just sets RTL
 *     content context for child components)
 */

import React from 'react';
import {
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  ViewStyle,
  ScrollViewProps,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { isSmallScreen } from '../../src/utils/rtl';

interface RTLKeyboardContainerProps {
  /** RTL mode — passed from useRTL().isRTL */
  isRTL: boolean;
  /** Extra bottom padding inside the scroll content (added to safe-area) */
  extraBottomPad?: number;
  /** Override the KeyboardAvoidingView container style */
  style?: ViewStyle;
  /** ScrollView content container style override */
  contentContainerStyle?: ViewStyle;
  /** Forward any additional ScrollView props */
  scrollProps?: Omit<ScrollViewProps, 'style' | 'contentContainerStyle'>;
  children: React.ReactNode;
}

export function RTLKeyboardContainer({
  isRTL,
  extraBottomPad = 0,
  style,
  contentContainerStyle,
  scrollProps,
  children,
}: RTLKeyboardContainerProps) {
  const insets = useSafeAreaInsets();

  // Bottom padding: safe area + extra + small-screen adjustment
  const bottomPad = insets.bottom + extraBottomPad + (isSmallScreen ? 8 : 16);

  return (
    <KeyboardAvoidingView
      style={[styles.container, style]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 24}
    >
      <ScrollView
        bounces={false}
        showsVerticalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
        // In RTL mode the ScrollView itself does not need direction flip —
        // only child layout changes. Vertical scroll is direction-agnostic.
        contentContainerStyle={[
          { paddingBottom: bottomPad },
          contentContainerStyle,
        ]}
        {...scrollProps}
      >
        {children}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});
