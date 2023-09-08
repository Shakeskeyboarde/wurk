import { resolve } from 'node:path';

import { useState } from 'react';

export const Component = (): null => {
  const [value] = useState(null);

  resolve('.');

  return value;
};
