import React from 'react';
import ReactDOM from 'react-dom/client';
import { DashboardApp } from './router.js';
import { ThemeProvider } from './lib/theme.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <ThemeProvider>
      <DashboardApp />
    </ThemeProvider>
  </React.StrictMode>,
);
