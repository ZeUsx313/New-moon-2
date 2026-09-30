import React, { createContext, useContext, useEffect, useMemo } from 'react';

/**
 * 🌑 الموقع مظلم إجبارياً — أُلغي الوضع الفاتح تماماً بطلب المالك.
 * أبقينا المزوّد (Provider) حفاظاً على توافق كل المكوّنات التي تقرأ isDark
 * والفئة .dark التي تعتمد عليها متغيرات Tailwind في بعض الشاشات.
 */

type Theme = 'dark';

interface ThemeContextType {
  theme: Theme;
  toggleTheme: () => void;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // فرض المظهر المظلم على مستوى الجذر + تنظيف أي مفتاح قديم من التخزين
  useEffect(() => {
    const root = document.documentElement;
    root.classList.add('dark');
    root.style.colorScheme = 'dark';
    try { localStorage.removeItem('site_theme'); } catch { /* ignore */ }
  }, []);

  const value = useMemo<ThemeContextType>(
    () => ({
      theme: 'dark',
      isDark: true,
      toggleTheme: () => { /* الوضع الفاتح أُلغي — الموقع مظلم دائماً */ },
    }),
    []
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
};

export const useTheme = (): ThemeContextType => {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    // آمن افتراضياً — الموقع مظلم دائماً
    return { theme: 'dark', isDark: true, toggleTheme: () => {} };
  }
  return ctx;
};
