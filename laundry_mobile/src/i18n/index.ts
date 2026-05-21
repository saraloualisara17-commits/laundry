import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import * as SecureStore from 'expo-secure-store';
import { I18nManager, DevSettings } from 'react-native';
import { reloadAsync } from 'expo-updates';

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
    console.warn('Localization failed', e);
  }
  return 'fr';
};

// Called once at app startup from _layout.tsx before rendering
export const initI18n = async (): Promise<void> => {
  // Prefer persisted user choice, fall back to device locale
  let lng = 'fr';
  try {
    const stored = await SecureStore.getItemAsync(LANGUAGE_KEY);
    lng = stored ?? getDeviceLanguage();
  } catch (e) {
    lng = getDeviceLanguage();
  }

  // Sync RTL state with the stored language so layout is correct from frame 1
  try {
    const shouldBeRTL = lng === 'ar';
    if (I18nManager.isRTL !== shouldBeRTL) {
      I18nManager.allowRTL(shouldBeRTL);
      I18nManager.forceRTL(shouldBeRTL);
    }
  } catch (e) {
    console.warn('I18nManager RTL sync failed', e);
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

export const changeLanguage = async (lng: string): Promise<void> => {
  // Persist the choice before reloading so initI18n picks it up next time
  try {
    await SecureStore.setItemAsync(LANGUAGE_KEY, lng);
  } catch (e) {
    console.warn('Failed to persist language', e);
  }

  await i18n.changeLanguage(lng);

  const isRTL = lng === 'ar';
  if (I18nManager.isRTL !== isRTL) {
    try {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    } catch (e) {
      console.warn('I18nManager RTL toggle failed', e);
    }

    setTimeout(async () => {
      try {
        if (__DEV__) {
          DevSettings.reload();
        } else {
          await reloadAsync();
        }
      } catch (e) {
        console.error('Reload failed', e);
      }
    }, 100);
  }
};

export default i18n;
