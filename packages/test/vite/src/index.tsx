import { createRoot } from 'react-dom/client';
import { Component } from 'test-vite-lib';
import { foo } from 'test-vite-lib-bundle';

createRoot(document.body.appendChild(document.createElement('div'))).render(
  <div>
    <Component />
    {foo}
  </div>,
);
