// @ts-nocheck
/* global console, process */
try {
  console.log(import.meta.resolve(process.argv[1]));
} catch {
  // ignore
}
