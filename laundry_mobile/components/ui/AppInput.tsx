import React, { forwardRef, useState } from 'react';
import {
  TextInput,
  TextInputProps,
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Platform,
  ViewStyle,
  TextStyle,
} from 'react-native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Fonts, Radius } from '../../constants/theme';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface AppInputProps extends Omit<TextInputProps, 'style'> {
  label?: string;
  error?: string;
  hint?: string;
  /** Explicit language override. Defaults to current app language. */
  lang?: 'ar' | 'fr' | 'en';
  /** Show/hide toggle button for password fields */
  isPassword?: boolean;
  /** Icon name from @expo/vector-icons Ionicons */
  leftIcon?: React.ComponentProps<typeof Ionicons>['name'];
  rightIcon?: React.ComponentProps<typeof Ionicons>['name'];
  onRightIconPress?: () => void;
  containerStyle?: ViewStyle;
  inputStyle?: TextStyle | TextStyle[];
  labelStyle?: TextStyle;
  /** Variant affects background and border rendering */
  variant?: 'filled' | 'outlined' | 'ghost';
  /** Force a specific direction regardless of language */
  forceDir?: 'ltr' | 'rtl';
}

// ─── Helper ───────────────────────────────────────────────────────────────────

function resolveDir(lang: 'ar' | 'fr' | 'en', forceDir?: 'ltr' | 'rtl'): 'ltr' | 'rtl' {
  if (forceDir) return forceDir;
  return lang === 'ar' ? 'rtl' : 'ltr';
}

// ─── Component ────────────────────────────────────────────────────────────────

const AppInput = forwardRef<TextInput, AppInputProps>(function AppInput(
  {
    label,
    error,
    hint,
    lang: langProp,
    isPassword = false,
    leftIcon,
    rightIcon,
    onRightIconPress,
    containerStyle,
    inputStyle,
    labelStyle,
    variant = 'filled',
    forceDir,
    placeholder,
    ...rest
  },
  ref
) {
  const { i18n } = useTranslation();
  const [secureVisible, setSecureVisible] = useState(false);

  const lang = langProp ?? (i18n.language === 'ar' ? 'ar' : 'fr');
  const dir  = resolveDir(lang, forceDir);
  const isRTL = dir === 'rtl';

  // ── Derived booleans ──────────────────────────────────────────────────────
  const hasLeftIcon  = !!leftIcon;
  const hasRightIcon = !!rightIcon || isPassword;
  const showError    = !!error;
  const showHint     = !!hint && !showError;

  // ── Icon placement (flipped in RTL) ───────────────────────────────────────
  //   In RTL: "left" visually = right side of device → we swap icon slots
  const StartIcon = isRTL ? (rightIcon ?? null) : (leftIcon ?? null);
  const EndIcon   = isRTL ? (leftIcon  ?? null) : (rightIcon ?? null);
  const startPress  = isRTL ? onRightIconPress : undefined;
  const endPress    = isRTL ? undefined : onRightIconPress;

  // ── Font selection ────────────────────────────────────────────────────────
  const fontFamily = isRTL ? Fonts.arabic.regular : undefined;
  const fontBold   = isRTL ? Fonts.arabic.bold    : undefined;

  // ── Container border color ────────────────────────────────────────────────
  const borderColor = showError
    ? Colors.danger
    : variant === 'outlined'
    ? Colors.borderMedium
    : 'transparent';

  // ── RTL accent border (only on filled variant, no icon) ──────────────────
  const accentBorder: ViewStyle = isRTL && variant === 'filled' && !hasLeftIcon && !hasRightIcon
    ? {
        borderRightWidth: 3,
        borderRightColor: showError ? Colors.danger : Colors.primary,
      }
    : {};

  return (
    <View style={[styles.wrapper, containerStyle]}>

      {/* Label */}
      {!!label && (
        <Text
          style={[
            styles.label,
            isRTL && styles.labelRTL,
            isRTL && { fontFamily: Fonts.arabic.semibold },
            showError && { color: Colors.danger },
            labelStyle,
          ]}
          numberOfLines={1}
        >
          {label}
        </Text>
      )}

      {/* Input container */}
      <View
        style={[
          styles.inputContainer,
          variant === 'filled'   && styles.variantFilled,
          variant === 'outlined' && styles.variantOutlined,
          variant === 'ghost'    && styles.variantGhost,
          { borderColor },
          showError && styles.inputContainerError,
          accentBorder,
          isRTL && styles.inputContainerRTL,
          { flexDirection: isRTL ? 'row-reverse' : 'row' },
        ]}
      >
        {/* Start icon */}
        {StartIcon && (
          <TouchableOpacity
            onPress={startPress}
            style={[styles.iconSlot, isRTL ? styles.iconSlotEnd : styles.iconSlotStart]}
            disabled={!startPress}
          >
            <Ionicons
              name={StartIcon}
              size={19}
              color={showError ? Colors.danger : Colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* TextInput */}
        {(() => {
          // Numeric keyboards always render LTR regardless of language
          const isNumeric = rest.keyboardType === 'decimal-pad' || rest.keyboardType === 'numeric';
          const resolvedAlign = (isNumeric ? 'left' : isRTL ? 'right' : 'left') as 'left' | 'right';
          const resolvedDir   = (isNumeric ? 'ltr'  : dir) as 'ltr' | 'rtl';
          return (
            <TextInput
              ref={ref}
              {...rest}
              secureTextEntry={isPassword && !secureVisible}
              placeholder={placeholder}
              placeholderTextColor={Colors.textMuted}
              textAlign={resolvedAlign}
              style={[
                styles.input,
                isRTL ? styles.inputRTL : styles.inputLTR,
                // writingDirection lives in style (not a TextInput prop in RN types)
                { writingDirection: resolvedDir } as any,
                fontFamily ? { fontFamily } : undefined,
                hasLeftIcon  && !isRTL ? styles.inputPaddingLeft  : undefined,
                hasRightIcon && !isRTL ? styles.inputPaddingRight : undefined,
                hasLeftIcon  &&  isRTL ? styles.inputPaddingRight : undefined,
                hasRightIcon &&  isRTL ? styles.inputPaddingLeft  : undefined,
                ...(Array.isArray(inputStyle) ? inputStyle : inputStyle ? [inputStyle] : []),
              ]}
            />
          );
        })()}

        {/* Password toggle */}
        {isPassword && (
          <TouchableOpacity
            onPress={() => setSecureVisible(v => !v)}
            style={[styles.iconSlot, isRTL ? styles.iconSlotStart : styles.iconSlotEnd]}
          >
            <Ionicons
              name={secureVisible ? 'eye-off-outline' : 'eye-outline'}
              size={19}
              color={Colors.textMuted}
            />
          </TouchableOpacity>
        )}

        {/* End icon (non-password) */}
        {!isPassword && EndIcon && (
          <TouchableOpacity
            onPress={endPress}
            style={[styles.iconSlot, isRTL ? styles.iconSlotStart : styles.iconSlotEnd]}
            disabled={!endPress}
          >
            <Ionicons
              name={EndIcon}
              size={19}
              color={showError ? Colors.danger : Colors.textMuted}
            />
          </TouchableOpacity>
        )}
      </View>

      {/* Error */}
      {showError && (
        <Text style={[styles.errorText, isRTL && styles.errorTextRTL, isRTL && { fontFamily: Fonts.arabic.regular }]}>
          {error}
        </Text>
      )}

      {/* Hint */}
      {showHint && (
        <Text style={[styles.hintText, isRTL && styles.hintTextRTL]}>
          {hint}
        </Text>
      )}
    </View>
  );
});

export default AppInput;

// ─── Styles ───────────────────────────────────────────────────────────────────

const INPUT_HEIGHT = 52;

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 4,
  },

  // ── Label ────────────────────────────────────────────────────────────────
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textSecondary,
    marginBottom: 7,
    textTransform: 'uppercase',
    letterSpacing: 0.4,
    marginLeft: 2,
  },
  labelRTL: {
    textAlign: 'right',
    textTransform: undefined,
    letterSpacing: 0,
    fontSize: 13,
    marginLeft: 0,
    marginRight: 2,
  },

  // ── Container variants ────────────────────────────────────────────────────
  inputContainer: {
    alignItems: 'center',
    minHeight: INPUT_HEIGHT,
    borderRadius: Radius.md,
    borderWidth: 1,
    overflow: 'hidden',
  },
  inputContainerRTL: {
    marginRight: 3,  // prevent accent border clipping at screen edge
  },
  variantFilled: {
    backgroundColor: Colors.surface2,
    borderColor: 'transparent',
  },
  variantOutlined: {
    backgroundColor: 'transparent',
    borderColor: Colors.borderMedium,
  },
  variantGhost: {
    backgroundColor: 'transparent',
    borderColor: 'transparent',
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    borderRadius: 0,
  },
  inputContainerError: {
    borderColor: Colors.danger,
    backgroundColor: Colors.dangerBg,
  },

  // ── TextInput ─────────────────────────────────────────────────────────────
  input: {
    flex: 1,
    height: INPUT_HEIGHT,
    fontSize: 15,
    color: Colors.textPrimary,
    paddingHorizontal: 14,
    // Prevent RN's default margin quirks
    paddingTop: Platform.OS === 'android' ? 0 : undefined,
    paddingBottom: Platform.OS === 'android' ? 0 : undefined,
  },
  inputLTR: {
    textAlign: 'left',
  },
  inputRTL: {
    textAlign: 'right',
    // Cairo font line-height on Android needs a nudge to vertically center
    lineHeight: Platform.OS === 'android' ? 22 : undefined,
  },
  inputPaddingLeft: {
    paddingLeft: 6,
  },
  inputPaddingRight: {
    paddingRight: 6,
  },

  // ── Icons ─────────────────────────────────────────────────────────────────
  iconSlot: {
    width: 44,
    height: INPUT_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconSlotStart: {
    paddingLeft: 4,
  },
  iconSlotEnd: {
    paddingRight: 4,
  },

  // ── Error / Hint ──────────────────────────────────────────────────────────
  errorText: {
    fontSize: 12,
    color: Colors.danger,
    fontWeight: '500',
    marginTop: 5,
    marginLeft: 4,
  },
  errorTextRTL: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 4,
  },
  hintText: {
    fontSize: 11,
    color: Colors.textMuted,
    marginTop: 5,
    marginLeft: 4,
  },
  hintTextRTL: {
    textAlign: 'right',
    marginLeft: 0,
    marginRight: 4,
  },
});
