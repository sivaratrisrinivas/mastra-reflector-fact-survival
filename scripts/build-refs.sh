#!/usr/bin/env bash
# Builds a standalone ESM bundle of Mastra's Reflector prompt code for each ref.
# The bundle is Mastra's own source (packages/memory, Apache-2.0), compiled with esbuild.
# Nothing is edited. Usage: bash scripts/build-refs.sh
set -euo pipefail
cd "$(dirname "$0")/.."
REPO=https://github.com/mastra-ai/mastra.git
# name=sha. main = main at the time of the run, pr26465 = head of PR #26465.
REFS=(
  "main=faf79ea0d1aa7b2265b070f5323339fa275ebb49"
  "pr26465=3781dc946a8545cd3548887496d54beb0f64c67d"
)
WORK=$(mktemp -d)
mkdir -p vendor
for pair in "${REFS[@]}"; do
  name=${pair%%=*}; sha=${pair#*=}
  dir=$WORK/$name
  git init -q "$dir"
  git -C "$dir" remote add origin "$REPO"
  git -C "$dir" config core.sparseCheckout true
  echo "packages/memory/" > "$dir/.git/info/sparse-checkout"
  git -C "$dir" fetch -q --depth 1 origin "$sha"
  git -C "$dir" checkout -q FETCH_HEAD
  om=$dir/packages/memory/src/processors/observational-memory
  cat > "$WORK/entry-$name.ts" <<TS
export * from '$om/reflector-agent';
export { composeReflectionExtractors } from '$om/built-in-extractors';
export { OBSERVATIONAL_MEMORY_DEFAULTS } from '$om/constants';
TS
  npx esbuild "$WORK/entry-$name.ts" --bundle --platform=node --format=esm --packages=external \
    --legal-comments=inline \
    --banner:js="// Bundled from mastra-ai/mastra@$sha packages/memory (Apache-2.0, Copyright (c) 2025 Kepler Software, Inc.). Unmodified source, compiled by esbuild. See LICENSE-MASTRA." \
    --outfile="vendor/reflector-$name.mjs" --log-level=warning
  echo "built vendor/reflector-$name.mjs from $sha"
done
rm -rf "$WORK"
