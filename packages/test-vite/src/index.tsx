import { createRoot } from 'react-dom/client';
import { Component } from 'test-vite-lib';

createRoot(document.body.appendChild(document.createElement('div'))).render(
  <div>
    <Component />
  </div>,
);
