#!/bin/sh
set -eu
LUNMI_RESOURCE_ROOT="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}"
mkdir -p "$LUNMI_RESOURCE_ROOT/Web"
/usr/bin/rsync -a --delete --exclude='.DS_Store' "${SRCROOT}/LunmiBrafer/Web/" "$LUNMI_RESOURCE_ROOT/Web/"
/bin/cp "${SRCROOT}/LunmiBrafer/WebBundleManifest.json" "$LUNMI_RESOURCE_ROOT/WebBundleManifest.json"
