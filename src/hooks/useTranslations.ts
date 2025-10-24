import { useState } from 'react';
import { translations, type TranslationKey } from '../utils/translations';

export type Language = "NO" | "EN" | "UA";

export const useTranslations = () => {
  const [currentLanguage, setCurrentLanguage] = useState<Language>("EN");
  const [isLoading, setIsLoading] = useState(false);

  const changeLanguage = (lang: Language) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentLanguage(lang);
      setIsLoading(false);
    }, 300);
  };

  const t = (key: TranslationKey): string => {
    const lang = currentLanguage.toLowerCase() as keyof typeof translations;
    return translations[lang][key] || translations.en[key];
  };

  return {
    t,
    currentLanguage,
    setCurrentLanguage: changeLanguage,
    isLoading
  };
};
