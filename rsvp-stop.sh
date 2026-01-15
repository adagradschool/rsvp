#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-5173}"

port_pids=$(lsof -ti tcp:"${PORT}" || true)
if [[ -n "${port_pids}" ]]; then
  echo "Stopping RSVP server on port ${PORT}"
  kill ${port_pids}
else
  echo "No RSVP server running on port ${PORT}"
fi
