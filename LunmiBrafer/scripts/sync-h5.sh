#!/bin/sh
set -eu
LUNMI_H5_ROOT="${SRCROOT}/../lunmi_h5"
LUNMI_NODE="${NODE_BINARY:-}"
if [ -z "$LUNMI_NODE" ]; then
  LUNMI_NODE="$(command -v node || true)"
fi
if [ -z "$LUNMI_NODE" ]; then
  for LUNMI_CANDIDATE in /opt/homebrew/bin/node /usr/local/bin/node; do
    if [ -x "$LUNMI_CANDIDATE" ]; then LUNMI_NODE="$LUNMI_CANDIDATE"; break; fi
  done
fi
if [ -z "$LUNMI_NODE" ]; then
  echo 'error: Node.js is required to synchronize the Lunmi H5 resources.' >&2
  exit 1
fi
cd "$LUNMI_H5_ROOT"
"$LUNMI_NODE" scripts/sync-ios.mjs
"$LUNMI_NODE" "${SRCROOT}/scripts/prepare-info.mjs"
