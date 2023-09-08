import { resolve } from 'node:path';

import { useState } from 'react';
import { createRoot } from 'react-dom/client';

import TestSvg from './test.svg';

export const Component = (): JSX.Element => {
  const [value] = useState(null);

  createRoot(document.getElementById('root')!);
  resolve('.');

  return (
    <div>
      {value}
      <TestSvg />
    </div>
  );
};
