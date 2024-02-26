import { type FC, type ReactNode } from 'react';
import { createRoot } from 'react-dom/client';

const Component: FC<{ children?: ReactNode }> = ({ children }) => (
  <div>{children}</div>
);

createRoot(document.body.appendChild(document.createElement('div'))).render(
  <Component>Hello, world!</Component>,
);
