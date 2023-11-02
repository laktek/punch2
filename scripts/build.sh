#!/usr/bin/env bash
rm -rf ./bin
deno install -A --unstable -c deno.json --root . --name punch ./src/index.ts
