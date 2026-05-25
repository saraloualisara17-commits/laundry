import { useTranslation } from 'react-i18next';
import { Fonts } from '../../constants/theme';

export function useFormStyles() {
  const { i18n } = useTranslation();
  const isArabic = i18n.language === 'ar';

  return {
    isArabic,

    /** Form field label */
    label: {
      textAlign: (isArabic ? 'right' : 'left') as 'right' | 'left',
      ...(isArabic
        ? {
            fontSize: 13,
            fontWeight: '600' as const,
            fontFamily: Fonts.arabic.semibold,
            letterSpacing: 0,
            textTransform: undefined as undefined,
          }
        : {
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
          }),
    },

    /** Text input — right-align + Cairo font in Arabic */
    input: {
      textAlign: (isArabic ? 'right' : 'left') as 'right' | 'left',
      ...(isArabic
        ? {
            fontFamily: Fonts.arabic.regular,
            borderRightWidth: 3,
            borderRightColor: '#0D7377',
            borderLeftWidth: 0,
            paddingRight: 14,
            paddingLeft: 12,
            borderRadius: 12,
            marginRight: 3,
          }
        : {}),
    },

    /** Any horizontal row that should flip in RTL */
    row: {
      flexDirection: (isArabic ? 'row-reverse' : 'row') as 'row' | 'row-reverse',
    },

    /** Section header label */
    sectionLabel: {
      textAlign: (isArabic ? 'right' : 'left') as 'right' | 'left',
      ...(isArabic
        ? {
            fontFamily: Fonts.arabic.bold,
            letterSpacing: 0,
            textTransform: undefined as undefined,
          }
        : {
            textTransform: 'uppercase' as const,
            letterSpacing: 1,
          }),
    },

    /** Small chip/badge label */
    chipLabel: {
      textAlign: (isArabic ? 'right' : 'left') as 'right' | 'left',
      ...(isArabic
        ? {
            fontFamily: Fonts.arabic.medium,
            letterSpacing: 0,
            textTransform: undefined as undefined,
          }
        : {
            textTransform: 'uppercase' as const,
            letterSpacing: 0.3,
          }),
    },

    /** Stat/summary label */
    statLabel: {
      ...(isArabic
        ? {
            fontFamily: Fonts.arabic.medium,
            letterSpacing: 0,
            textTransform: undefined as undefined,
          }
        : {
            textTransform: 'uppercase' as const,
            letterSpacing: 0.5,
          }),
    },

    /** Body text — general Arabic prose */
    body: {
      ...(isArabic
        ? { fontFamily: Fonts.arabic.regular, letterSpacing: 0 }
        : {}),
    },
  };
}
