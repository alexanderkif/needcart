import { useEffect, type ReactNode } from 'react';
import i18n from 'i18next';
import { initReactI18next, useTranslation } from 'react-i18next';

import { useAuth } from '@/features/auth/AuthProvider';
import de from '@/i18n/locales/de.json';
import en from '@/i18n/locales/en.json';
import es from '@/i18n/locales/es.json';
import fr from '@/i18n/locales/fr.json';
import it from '@/i18n/locales/it.json';
import ptBR from '@/i18n/locales/pt-BR.json';
import ru from '@/i18n/locales/ru.json';
import srLatn from '@/i18n/locales/sr-Latn.json';
import {
  SUPPORTED_LOCALES,
  getDeviceLocale,
  normalizeLocale,
} from '@/lib/locale';

export { SUPPORTED_LOCALES, getDeviceLocale, normalizeLocale };

export const localeResources = {
  en: { translation: en },
  ru: { translation: ru },
  es: { translation: es },
  de: { translation: de },
  'pt-BR': { translation: ptBR },
  fr: { translation: fr },
  'sr-Latn': { translation: srLatn },
  it: { translation: it },
};

if (!i18n.isInitialized) {
  void i18n.use(initReactI18next).init({
    resources: localeResources,
    lng: getDeviceLocale(),
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LOCALES,
    interpolation: { escapeValue: false },
    react: { useSuspense: false },
  });
}

export { i18n };

export function I18nProvider({ children }: { children: ReactNode }) {
  const { profile } = useAuth();
  const locale = normalizeLocale(profile?.locale ?? getDeviceLocale());

  useEffect(() => {
    if (i18n.language !== locale) {
      void i18n.changeLanguage(locale);
    }
  }, [locale]);

  return <>{children}</>;
}

/** Current UI locale, re-rendering when the language changes. */
export function useLocale(): string {
  const { i18n: instance } = useTranslation();
  return instance.language || 'en';
}
