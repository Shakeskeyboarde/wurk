import { resolve } from 'node:path';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';

export const Component = (): JSX.Element => {
  const [value] = useState(null);

  createRoot(document.getElementById('root')!);
  resolve('.');

  return <div>{value}</div>;
};
