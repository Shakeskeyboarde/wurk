# Wurk Depcheck Command

Check for unused production dependencies.

This is a very simple check that just looks for anything that looks like an import or require statement matching each production dependency. It doesn't use a real parser, but it's fast and good enough for most cases.

This does not detect missing dependencies. ESLint is better at detecting those.

[![npm](https://img.shields.io/npm/v/@wurk/command-depcheck?label=NPM)](https://www.npmjs.com/package/@wurk/command-depcheck)
[![wurk](https://img.shields.io/npm/v/wurk?label=Wurk&color=purple)](https://www.npmjs.com/package/wurk)
