import { foo } from 'test-vite-lib-bundle';

import TestSvg from '../test.svg?react';

export const Component = (): JSX.Element => {
  return (
    <div>
      SVG:
      <TestSvg style={{ height: '2em', verticalAlign: 'middle' }} />
      {foo}
    </div>
  );
};
