import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import './index.css';

// Polyfill Buffer for browser
import { Buffer } from 'buffer';
window.Buffer = Buffer;

console.log('[main] Application starting...');
console.log('[main] Buffer polyfill loaded:', !!window.Buffer);

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);

console.log('[main] React application mounted');
