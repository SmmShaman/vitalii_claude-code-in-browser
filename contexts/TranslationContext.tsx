'use client'

import { createContext, useContext, useState, useRef, type ReactNode } from 'react';
import { translations, type TranslationKey } from '@/utils/translations';
import { trackLanguageChange } from '@/utils/gtm';

export type Language = "NO" | "EN" | "UA";

interface TranslationContextType {
  currentLanguage: Language;
  setCurrentLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => any; // Returns string | array depending on key (e.g. projects_list)
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<Language>("EN");
  const [isLoading, setIsLoading] = useState(false);
  const previousLanguageRef = useRef<Language>("EN");

  const changeLanguage = (lang: Language) => {
    const previousLang = currentLanguage;
    setIsLoading(true);
    setTimeout(() => {
      setCurrentLanguageState(lang);
      setIsLoading(false);
      // Track language change after the state has been updated
      if (previousLang !== lang) {
        trackLanguageChange(lang, previousLang);
        previousLanguageRef.current = lang;
      }
    }, 300);
  };

  const t = (key: TranslationKey): any => {
    const lang = currentLanguage.toLowerCase() as keyof typeof translations;
    return translations[lang][key] || translations.en[key];
  };

  return (
    <TranslationContext.Provider
      value={{
        currentLanguage,
        setCurrentLanguage: changeLanguage,
        t,
        isLoading,
      }}
    >
      {children}
    </TranslationContext.Provider>
  );
};

export const useTranslations = () => {
  const context = useContext(TranslationContext);
  if (context === undefined) {
    throw new Error('useTranslations must be used within a TranslationProvider');
  }
  return context;
};
