declare module '*.svg' {
  import { type ComponentType, type SVGProps } from 'react';
  const value: ComponentType<SVGProps<SVGElement>>;
  export default value;
}
