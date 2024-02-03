#!/usr/bin/env bash
rm -rf ./bin
deno run -A -c deno.json ./scripts/writeTemplate.ts
deno compile -A -c deno.json --output bin/punch --reload ./src/index.ts
