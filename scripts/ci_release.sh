#!/bin/sh

# args
# x86_64-unknown-linux-gnu, x86_64-pc-windows-msvc
# x86_64-apple-darwin aarach64-apple-darwin

set -e

rm -rf ./bin
deno run -A ./scripts/writeVersion.ts
deno compile -A -c deno.json --output bin/punch-${1} --reload --include ./template --include ./src/lib/dev_watcher.ts --include ./src/utils/workers/image_worker.ts --include ./src/utils/workers/html_worker.ts --target ${1} ./src/index.ts
