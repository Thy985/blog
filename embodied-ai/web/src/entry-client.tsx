import { StrictMode } from 'react';
import { hydrateRoot } from 'react-dom/client';
import { BrowserRouter } from 'react-router';
import { App } from './app';
import { BASENAME } from './lib/basename';
import './styles/global.css';

hydrateRoot(
  document.getElementById('root')!,
  <StrictMode>
    <BrowserRouter basename={BASENAME}>
      <App />
    </BrowserRouter>
  </StrictMode>,
);
