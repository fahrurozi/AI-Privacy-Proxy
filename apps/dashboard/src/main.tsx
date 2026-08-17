import React from 'react';
import ReactDOM from 'react-dom/client';
import { DashboardApp } from './router.js';
import './index.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <DashboardApp />
  </React.StrictMode>,
);
