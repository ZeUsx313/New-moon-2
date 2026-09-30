import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import { initGoogleAnalytics } from './src/lib/analytics';

// 📊 Google Analytics 4 (اختياري — يعمل فقط عند ضبط VITE_GA_ID)
initGoogleAnalytics();

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
