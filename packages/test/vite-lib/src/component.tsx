import TestSvg from './test.svg';

export const Component = (): JSX.Element => {
  return (
    <div>
      SVG:
      <TestSvg style={{ height: '2em', verticalAlign: 'middle' }} />
    </div>
  );
};
