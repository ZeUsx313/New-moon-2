import React, { createContext, useContext, useState, useCallback, useMemo } from 'react';

interface UIContextType {
  /** هل الدرج الجانبي (الخطوط الثلاثة) مفتوح؟ — الشريط السفلي يختبئ حينها */
  isDrawerOpen: boolean;
  setDrawerOpen: (open: boolean) => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

/**
 * حالة واجهة عامة مشتركة بين المكوّنات التي تُركّب في شاشات مختلفة
 * (الدرج في Header ↔ إخفاء الشريط السفلي في BottomNav).
 */
export const UIProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isDrawerOpen, setDrawerOpenState] = useState(false);

  const setDrawerOpen = useCallback((open: boolean) => {
    setDrawerOpenState(open);
  }, []);

  const value = useMemo(() => ({ isDrawerOpen, setDrawerOpen }), [isDrawerOpen, setDrawerOpen]);

  return <UIContext.Provider value={value}>{children}</UIContext.Provider>;
};

export const useUI = (): UIContextType => {
  const ctx = useContext(UIContext);
  if (!ctx) {
    // قيمة آمنة افتراضياً — المكوّنات تعمل حتى لو استُخدمت خارج المزوّد
    return { isDrawerOpen: false, setDrawerOpen: () => {} };
  }
  return ctx;
};
