#!/usr/bin/env bash
set -euo pipefail

pnpm run typecheck
pnpm test
