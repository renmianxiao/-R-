import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.jsx';
import AdminApp from './admin/AdminApp.jsx';
import './styles.css';

const application = window.location.pathname.startsWith('/admin') ? <AdminApp /> : <App />;

createRoot(document.getElementById('root')).render(
  <React.StrictMode>{application}</React.StrictMode>,
);
