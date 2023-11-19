#!/usr/bin/env bash
rm -rf ./bin
deno compile -A --unstable -c deno.json --output punch --reload ./src/index.ts
