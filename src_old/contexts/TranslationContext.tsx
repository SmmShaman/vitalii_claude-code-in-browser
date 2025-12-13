import { createContext, useContext, useState, type ReactNode } from 'react';
import { translations, type TranslationKey } from '../utils/translations';

export type Language = "NO" | "EN" | "UA";

interface TranslationContextType {
  currentLanguage: Language;
  setCurrentLanguage: (lang: Language) => void;
  t: (key: TranslationKey) => any;
  isLoading: boolean;
}

const TranslationContext = createContext<TranslationContextType | undefined>(undefined);

export const TranslationProvider = ({ children }: { children: ReactNode }) => {
  const [currentLanguage, setCurrentLanguageState] = useState<Language>("EN");
  const [isLoading, setIsLoading] = useState(false);

  const changeLanguage = (lang: Language) => {
    setIsLoading(true);
    setTimeout(() => {
      setCurrentLanguageState(lang);
      setIsLoading(false);
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
