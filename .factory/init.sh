#!/usr/bin/env bash
set -euo pipefail

if [ -f package.json ]; then
  npm install
fi
