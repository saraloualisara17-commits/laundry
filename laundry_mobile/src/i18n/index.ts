import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { I18nManager, DevSettings } from 'react-native';
import { reloadAsync } from 'expo-updates';

import fr from './locales/fr.json';
import ar from './locales/ar.json';

const resources = {
  fr: { translation: fr },
  ar: { translation: ar }
};

const getInitialLanguage = () => {
  try {
    const locales = Localization.getLocales();
    if (locales && locales.length > 0) {
      const code = locales[0].languageCode;
      return code === 'ar' ? 'ar' : 'fr';
    }
  } catch (e) {
    console.warn('Localization failed', e);
  }
  return 'fr';
};

i18n
  .use(initReactI18next)
  .init({
    resources,
    lng: getInitialLanguage(),
    fallbackLng: 'fr',
    compatibilityJSON: 'v3',
    interpolation: {
      escapeValue: false
    }
  });

// Handle RTL
export const changeLanguage = async (lng: string) => {
  await i18n.changeLanguage(lng);
  const isRTL = lng === 'ar';
  
  if (I18nManager.isRTL !== isRTL) {
    // These calls are often the source of "Received 1 arguments" errors in New Arch
    // if the bridge is not perfectly synced.
    try {
      I18nManager.allowRTL(isRTL);
      I18nManager.forceRTL(isRTL);
    } catch (e) {
      console.warn('I18nManager RTL toggle failed', e);
    }
    
    // Use a timeout to allow i18n state to persist before reloading
    setTimeout(async () => {
      try {
        if (__DEV__) {
          // DevSettings.reload() is more stable in Expo Go
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
