#!/usr/bin/env bash
rm -rf ./bin
deno run -A -c deno.json ./scripts/writeTemplate.ts
deno install -A -c deno.json --root . --name punch ./src/index.ts
