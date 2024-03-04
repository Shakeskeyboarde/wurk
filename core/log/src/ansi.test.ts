import { test } from 'vitest';

import { Ansi, getAnsiColorIterator } from './ansi';

test('print 256 colors in order', () => {
  Ansi.color256.forEach((color, i) => {
    console.log(`${color}color ${i}${Ansi.reset}`);
  });
});

test('print 256 color iterator', () => {
  for (
    let i = 0,
      colors = getAnsiColorIterator({ is256Enabled: true }),
      color = colors.next();
    !color.done;
    i++, color = colors.next()
  ) {
    console.log(`${color.value}color ${i}${Ansi.reset}`);
  }

  const color = getAnsiColorIterator({ is256Enabled: true }).next();
  console.log(`${color.value}color 0${Ansi.reset}`);
});
