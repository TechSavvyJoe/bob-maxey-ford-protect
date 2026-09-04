import React from 'react';
import ReactDOM from 'react-dom/client';
import '@fontsource-variable/inter/wght.css';
import App from './App';
import RecoveryBoundary from './components/RecoveryBoundary';
import './design-tokens.css';
import './styles.css';
import './quote-studio.css';
import './quote-studio-v5.css';
import './quote-studio-oem.css';
import './quote-professional.css';
import './site-professional.css';
import './proposal-preview-oem.css';
import './recovery.css';

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <RecoveryBoundary><App /></RecoveryBoundary>
  </React.StrictMode>,
);
