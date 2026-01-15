#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5173}"

echo "Starting RSVP server on http://localhost:${PORT}"
PORT="${PORT}" node server.js
