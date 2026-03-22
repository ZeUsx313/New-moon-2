import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';

const container = document.getElementById('root');
if (!container) {
  const rootDiv = document.createElement('div');
  rootDiv.id = 'root';
  document.body.appendChild(rootDiv);
  const root = createRoot(rootDiv);
  root.render(<App />);
} else {
  const root = createRoot(container);
  root.render(<App />);
}
