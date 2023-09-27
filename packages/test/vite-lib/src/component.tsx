import TestSvg from './test.svg?react';

export const Component = (): JSX.Element => {
  return (
    <div>
      SVG:
      <TestSvg style={{ height: '2em', verticalAlign: 'middle' }} />
    </div>
  );
};
