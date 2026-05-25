import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { I18nManager } from 'react-native';

import fr from './locales/fr.json';
import ar from './locales/ar.json';

const LANGUAGE_KEY = 'app_language';

const resources = {
  fr: { translation: fr },
  ar: { translation: ar }
};

const getDeviceLanguage = (): string => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      return locales[0].languageCode === 'ar' ? 'ar' : 'fr';
    }
  } catch (e) {
    if (__DEV__) console.warn('Localization failed', e);
  }
  return 'fr';
};

// Called once at app startup from _layout.tsx before rendering.
// We manage all directionality ourselves via JS (row(), textAlign(), etc.)
// so the native RTL layout engine must stay off permanently.
export const initI18n = async (): Promise<void> => {
  // Ensure native RTL engine is always disabled — we handle direction in JS
  I18nManager.allowRTL(false);
  I18nManager.forceRTL(false);

  let lng = 'fr';
  try {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    lng = stored ?? getDeviceLanguage();
  } catch (e) {
    lng = getDeviceLanguage();
  }

  if (!i18n.isInitialized) {
    await i18n
      .use(initReactI18next)
      .init({
        resources,
        lng,
        fallbackLng: 'fr',
        compatibilityJSON: 'v3',
        interpolation: { escapeValue: false },
      });
  } else {
    await i18n.changeLanguage(lng);
  }
};

// Instant language switch — no reload needed.
// All layout direction is driven by i18n.language via useRTL() hooks.
export const changeLanguage = async (lng: string): Promise<void> => {
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lng);
  } catch (e) {
    if (__DEV__) console.warn('Failed to persist language', e);
  }
  await i18n.changeLanguage(lng);
};

export default i18n;
