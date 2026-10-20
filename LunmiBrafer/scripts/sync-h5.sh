#!/bin/sh
set -eu
LUNMI_H5_ROOT="${SRCROOT}/../lunmi_h5"
if [ -d "$LUNMI_H5_ROOT" ]; then
  LUNMI_NODE="${NODE_BINARY:-}"
  if [ -n "$LUNMI_NODE" ]; then
    if [ ! -x "$LUNMI_NODE" ]; then LUNMI_NODE=""; fi
  else
    LUNMI_NODE="$(command -v node || true)"
    if [ -z "$LUNMI_NODE" ]; then
      for LUNMI_CANDIDATE in /opt/homebrew/bin/node /usr/local/bin/node "$HOME/.volta/bin/node"; do
        if [ -x "$LUNMI_CANDIDATE" ]; then LUNMI_NODE="$LUNMI_CANDIDATE"; break; fi
      done
    fi
  fi
  if [ -n "$LUNMI_NODE" ] && [ -f "$LUNMI_H5_ROOT/scripts/sync-ios.mjs" ]; then
    (cd "$LUNMI_H5_ROOT" && "$LUNMI_NODE" scripts/sync-ios.mjs)
  else
    echo 'Node.js is unavailable; checking the bundled H5 resources against the included source.'
  fi
else
  echo 'H5 source is not included; using the verified bundled H5 resources.'
fi

# Compile a macOS build tool with Xcode itself. It reuses the app's actual
# configuration, string decoder and archive validator; no Node modules are needed.
LUNMI_TOOL_ROOT="${DERIVED_FILE_DIR}/LunmiBuildResources"
LUNMI_TOOL="$LUNMI_TOOL_ROOT/prepare-resources"
mkdir -p "$LUNMI_TOOL_ROOT"
set -- "${SRCROOT}/scripts/prepare-resources.swift" \
  "${SRCROOT}/LunmiBrafer/LucentWonderment.swift" \
  "${SRCROOT}/LunmiBrafer/PersistentPivotGlow.swift" \
  "${SRCROOT}/LunmiBrafer/ApogeeAwakenSpark.swift"
LUNMI_COMPILE=0
if [ ! -x "$LUNMI_TOOL" ]; then LUNMI_COMPILE=1; fi
for LUNMI_SOURCE in "$@"; do
  if [ "$LUNMI_SOURCE" -nt "$LUNMI_TOOL" ]; then LUNMI_COMPILE=1; fi
done
if [ "$LUNMI_COMPILE" = 1 ]; then
  LUNMI_MACOS_SDK="$(/usr/bin/xcrun --sdk macosx --show-sdk-path)"
  /usr/bin/xcrun --sdk macosx swiftc -sdk "$LUNMI_MACOS_SDK" \
    -target "$(/usr/bin/uname -m)-apple-macosx12.0" -swift-version 5 \
    -module-cache-path "$LUNMI_TOOL_ROOT/ModuleCache" -parse-as-library \
    "$@" -o "$LUNMI_TOOL"
fi
"$LUNMI_TOOL"
