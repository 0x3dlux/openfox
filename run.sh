#!/usr/bin/env bash
# Update OpenFox from git and (re)start it in a detached screen session.
set -euo pipefail
cd "$(dirname "$0")"

PORT=10369
SCREEN_NAME=openfox

BRANCH=$(git rev-parse --abbrev-ref HEAD)
if git remote | grep -qx upstream; then
  REMOTE=upstream
else
  REMOTE=origin
fi

# --- Update ---------------------------------------------------------------
BEFORE=$(git rev-parse HEAD)
OUT=$(git pull --ff-only --autostash "$REMOTE" "$BRANCH" 2>&1)
echo "$OUT"
AFTER=$(git rev-parse HEAD)

if [ "$BEFORE" != "$AFTER" ]; then
  echo "Updated $BEFORE -> $AFTER"
  if [ -n "$(git diff --name-only "$BEFORE" "$AFTER" -- package-lock.json)" ]; then
    npm install
  fi
  npm run build
else
  echo "Already up to date ($AFTER) - skipping build"
fi

# --- Restart in screen ----------------------------------------------------
screen -S "$SCREEN_NAME" -X quit 2>/dev/null || true

# Free the port in case an older instance lingers outside the named screen.
OLD_PID=$(ss -tlnp 2>/dev/null | grep ":$PORT " | grep -o "pid=[0-9]*" | head -1 | cut -d= -f2 || true)
if [ -n "${OLD_PID:-}" ] && ss -tln | grep -q ":$PORT "; then
  kill "$OLD_PID" 2>/dev/null || true
  for _ in $(seq 1 20); do
    ss -tln | grep -q ":$PORT " || break
    sleep 0.5
  done
fi

mkdir -p logs
screen -L -Logfile logs/openfox.log -dmS "$SCREEN_NAME" \
  node --max-old-space-size=8192 dist/cli/index.js

# --- Readiness ------------------------------------------------------------
for _ in $(seq 1 60); do
  if curl -sf -o /dev/null "http://127.0.0.1:$PORT"; then
    echo "OpenFox running on :$PORT (screen: $SCREEN_NAME)"
    exit 0
  fi
  sleep 0.5
done

echo "ERROR: OpenFox not answering on :$PORT - see logs/openfox.log" >&2
exit 1
