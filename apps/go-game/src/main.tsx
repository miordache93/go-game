import { StrictMode } from 'react';
import * as ReactDOM from 'react-dom/client';
import { BrowserRouter } from 'react-router-dom';
import App from './app/app';
import './styles.scss';

// GitHub Pages deployment configuration
const basename =
  process.env.NODE_ENV === 'production' &&
  window.location.hostname === 'miordache93.github.io'
    ? '/go-game'
    : '';

const root = ReactDOM.createRoot(
  document.getElementById('root') as HTMLElement
);
root.render(
  <StrictMode>
    <BrowserRouter basename={basename}>
      <App />
    </BrowserRouter>
  </StrictMode>
);
