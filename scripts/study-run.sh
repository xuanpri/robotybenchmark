#!/bin/bash
set -eu
cd "$(dirname "$0")/.."
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:"$PATH"
mkdir -p results/layout-transfer-1
exec flock -n results/layout-transfer-1/study.lock node --import tsx scripts/study-run.ts "$@"
