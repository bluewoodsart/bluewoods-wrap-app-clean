import React from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import Index from './pages/Index';

// Render the real homepage, not a second copy of marketing text. The existing
// client entry replaces this shell and retains all quote/auth/router behavior.
export function renderHomepage() {
  return renderToString(<StaticRouter location="/"><Index /></StaticRouter>);
}
