# command-depcheck

Check for unused production dependencies.

This is a very simple check that just looks for anything that looks like an import or require statement matching each production dependency. It doesn't use a real parser, but it's fast and good enough for most cases.

This does not detect missing dependencies. ESLint is better at detecting those.

[![npm](https://img.shields.io/npm/v/@werk/command-depcheck?label=NPM)](https://www.npmjs.com/package/@werk/command-depcheck)
[![werk](https://img.shields.io/npm/v/@werk/cli?label=Werk&color=purple)](https://www.npmjs.com/package/@werk/cli)

## Install

```sh
npm i -D @werk/command-depcheck
```

## Check Dependencies

```sh
werk depcheck
```

## Remove Unused Dependencies

```sh
werk depcheck --fix
```
