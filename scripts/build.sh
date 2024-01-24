#!/usr/bin/env bash
rm -rf ./bin
deno run -A --unstable -c deno.json ./scripts/writeTemplate.ts
deno install -A --unstable -c deno.json --root . --name punch ./src/index.ts
