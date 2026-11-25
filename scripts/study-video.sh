#!/bin/bash
set -eu
cd "$(dirname "$0")/.."
export PATH=/home/jiaxuanren/miniconda3/envs/codex-env/bin:"$PATH"
export NODE_PATH=${NODE_PATH:-/tmp/patrolworld-browser-check/node_modules}
export VIDEO_PYTHON=${VIDEO_PYTHON:-/home/jiaxuanren/miniconda3/envs/opsd/bin/python}
exec "$VIDEO_PYTHON" scripts/study-films.py "$@"
