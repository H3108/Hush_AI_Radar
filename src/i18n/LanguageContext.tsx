import React, { createContext, useContext, useState, useEffect } from 'react';
import { Language, translations, Translations } from './translations';

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('hush_radar_lang') as Language;
    return saved === 'en' || saved === 'zh-CN' ? saved : 'zh-CN';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('hush_radar_lang', lang);
  };

  useEffect(() => {
    document.documentElement.lang = language === 'zh-CN' ? 'zh-CN' : 'en';
  }, [language]);

  useEffect(() => {
    let cancelled = false;
    const applyServerDefault = async () => {
      try {
        const res = await fetch('/api/settings/public');
        if (!res.ok) return;
        const data = await res.json();
        if (cancelled) return;
        const saved = localStorage.getItem('hush_radar_lang');
        if (!saved && (data?.defaultLanguage === 'zh-CN' || data?.defaultLanguage === 'en')) {
          setLanguageState(data.defaultLanguage);
        }
      } catch {
        // silently fall back to the current language
      }
    };
    applyServerDefault();
    return () => {
      cancelled = true;
    };
  }, []);

  const value = {
    language,
    setLanguage,
    t: translations[language]
  };

  return (
    <LanguageContext.Provider value={value}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
