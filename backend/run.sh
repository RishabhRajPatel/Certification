#!/usr/bin/env bash
# Convenience dev runner: sets up venv, installs deps, seeds, and serves.
set -euo pipefail
cd "$(dirname "$0")"

if [ ! -d ".venv" ]; then
  python3 -m venv .venv
fi
# shellcheck disable=SC1091
source .venv/bin/activate

pip install --quiet --upgrade pip
pip install --quiet -r requirements.txt

python -m app.db.seed
exec uvicorn app.main:app --reload --host 0.0.0.0 --port 8000
