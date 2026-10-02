import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initGoogleAnalytics } from './src/lib/analytics';
import { installCoverFallback } from './src/lib/coverFallback';

// 📊 Google Analytics 4 (اختياري — يعمل فقط عند ضبط VITE_GA_ID)
initGoogleAnalytics();

// 🖼️ رابط غلاف الرواية: أي غلاف يفشل (translate.goog / wfxs.tw بسبب Referer)
// يُستبدل تلقائياً بنسخة بروكسي الخادم في كل الشاشات — بدون تدخل يدوي.
installCoverFallback();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
