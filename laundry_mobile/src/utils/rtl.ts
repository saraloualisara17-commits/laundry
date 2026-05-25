/**
 * RTL, responsive, and typography utilities for the laundry app.
 *
 * Arabic is the PRIMARY language. Every helper here defaults to
 * Arabic-correct behaviour when isRTL is true.
 *
 * Usage:
 *   import { useRTL, row, border, pos, font, rs, MAX_FONT } from '../utils/rtl';
 *
 *   const { isRTL, t, i18n } = useRTL();
 *   <View style={row(isRTL)} />
 */

import { useTranslation } from 'react-i18next';
import { Dimensions, Platform, TextStyle, ViewStyle } from 'react-native';
import { Fonts, Typography } from '../../constants/theme';

// ─── Screen helpers ───────────────────────────────────────────────────────────

const { width: SCREEN_W, height: SCREEN_H } = Dimensions.get('window');

/** True on phones smaller than 375 px (iPhone SE, Galaxy A01, etc.) */
export const isSmallScreen = SCREEN_W < 375;

/** True on phones 375–413 px (iPhone 14, Pixel 7, etc.) */
export const isMediumScreen = SCREEN_W >= 375 && SCREEN_W < 414;

/** Responsive size: scales linearly between 375 and 428 px reference widths. */
export function rs(size: number): number {
  const scale = SCREEN_W / 375;
  const scaled = size * scale;
  // Cap upscale at 1.2× to prevent oversizing on tablets
  const capped = Math.min(scaled, size * 1.2);
  return Math.round(capped);
}

/** Responsive horizontal padding — tighter on small screens. */
export const HP = isSmallScreen ? 14 : 20;

// ─── RTL hook ─────────────────────────────────────────────────────────────────

/** Drop-in replacement for useTranslation() that also exposes isRTL. */
export function useRTL() {
  const { t, i18n } = useTranslation();
  const isRTL = i18n.language === 'ar';
  return { t, i18n, isRTL };
}

// ─── Layout helpers ───────────────────────────────────────────────────────────

/**
 * Returns a flexDirection style that respects reading direction.
 *   row(true)  → { flexDirection: 'row-reverse' }
 *   row(false) → { flexDirection: 'row' }
 */
export function row(isRTL: boolean): ViewStyle {
  return { flexDirection: isRTL ? 'row-reverse' : 'row' };
}

/**
 * Conditional style helper.
 * Returns `rtlStyle` when isRTL, `ltrStyle` (or {}) when not.
 */
export function ifRTL<T>(isRTL: boolean, rtlStyle: T, ltrStyle: T = {} as T): T {
  return isRTL ? rtlStyle : ltrStyle;
}

// ─── Text alignment ───────────────────────────────────────────────────────────

/** Text alignment style that matches reading direction. */
export function textAlign(isRTL: boolean): TextStyle {
  return { textAlign: isRTL ? 'right' : 'left' };
}

/** Align items to the reading start (right in RTL, left in LTR). */
export function alignStart(isRTL: boolean): ViewStyle {
  return { alignItems: isRTL ? 'flex-end' : 'flex-start' };
}

/** Align items to the reading end (left in RTL, right in LTR). */
export function alignEnd(isRTL: boolean): ViewStyle {
  return { alignItems: isRTL ? 'flex-start' : 'flex-end' };
}

// ─── Border helpers ───────────────────────────────────────────────────────────

/**
 * RTL-aware start border (visual left in LTR, visual right in RTL).
 * Correctly flips the accent bar on cards/buttons.
 */
export function borderStart(isRTL: boolean, width: number, color: string): ViewStyle {
  return isRTL
    ? { borderRightWidth: width, borderRightColor: color, borderLeftWidth: 0 }
    : { borderLeftWidth: width,  borderLeftColor: color,  borderRightWidth: 0 };
}

// ─── Positional helpers ───────────────────────────────────────────────────────

/**
 * Flips an absolute `right` position to `left` in RTL (and clears the opposite).
 *   pos.end(8, isRTL)  → { right: 8 } in LTR, { left: 8, right: undefined } in RTL
 */
export const pos = {
  /** Stick to the reading-END edge (right in LTR, left in RTL). */
  end(value: number, isRTL: boolean): ViewStyle {
    return isRTL
      ? { left: value, right: undefined }
      : { right: value, left: undefined };
  },
  /** Stick to the reading-START edge (left in LTR, right in RTL). */
  start(value: number, isRTL: boolean): ViewStyle {
    return isRTL
      ? { right: value, left: undefined }
      : { left: value, right: undefined };
  },
};

// ─── Chevron icon ─────────────────────────────────────────────────────────────

/**
 * Returns the correct Ionicons chevron name for "forward" in the current direction.
 *   chevronForward(false) → 'chevron-forward'
 *   chevronForward(true)  → 'chevron-back'
 */
export function chevronForward(isRTL: boolean): 'chevron-forward' | 'chevron-back' {
  return isRTL ? 'chevron-back' : 'chevron-forward';
}

// ─── Typography helpers ───────────────────────────────────────────────────────

/**
 * Returns the correct fontFamily for the current language.
 * Always use Cairo for Arabic — system font renders Arabic poorly on Android.
 */
export const font = {
  regular(isRTL: boolean): TextStyle {
    return { fontFamily: isRTL ? Fonts.arabic.regular : undefined };
  },
  medium(isRTL: boolean): TextStyle {
    return { fontFamily: isRTL ? Fonts.arabic.medium : undefined };
  },
  semibold(isRTL: boolean): TextStyle {
    return { fontFamily: isRTL ? Fonts.arabic.semibold : undefined };
  },
  bold(isRTL: boolean): TextStyle {
    return { fontFamily: isRTL ? Fonts.arabic.bold : undefined };
  },
  extrabold(isRTL: boolean): TextStyle {
    return { fontFamily: isRTL ? Fonts.arabic.extrabold : undefined };
  },
};

/**
 * Suppresses typographic styles that break Arabic text:
 * - letterSpacing must be 0 (Arabic letters are connected; spacing destroys ligatures)
 * - textTransform has no meaning in Arabic — set to undefined to avoid no-op processing
 */
export function arabicSafe(isRTL: boolean): TextStyle {
  if (!isRTL) return {};
  return {
    letterSpacing: 0,
    textTransform: undefined,
  };
}

// ─── Accessibility ────────────────────────────────────────────────────────────

/**
 * Prevents system accessibility font scaling from breaking fixed-height containers.
 * Apply to any Text inside a card or chip that has a fixed height.
 */
export const MAX_FONT = 1.3;

/**
 * Standard Text props for body content — prevents runaway scaling.
 */
export const textProps = {
  maxFontSizeMultiplier: MAX_FONT,
} as const;
