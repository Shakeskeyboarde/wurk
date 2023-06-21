# Werk Run Command

Run package scripts.

[![npm version](https://badge.fury.io/js/@werk%2Fcommand-run.svg)](https://badge.fury.io/js/@werk%2Fcommand-run)

## Install

```sh
npm i -D @werk/command-run
```

## Run Script

```sh
# werk run <script> [args...]
werk run test --pass-with-no-tests
```

You can also run multiple scripts by passing a CSV of script names. Any additional arguments will be passed to the last script only. The scripts are run in parallel if global options allow, and the `--sequential` flag is not set.

```sh
werk run lint,test --pass-with-no-tests
```
