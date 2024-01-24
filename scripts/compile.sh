#!/usr/bin/env bash
rm -rf ./bin
deno run -A --unstable -c deno.json ./scripts/writeTemplate.ts
deno compile -A --unstable -c deno.json --output bin/punch --reload ./src/index.ts
