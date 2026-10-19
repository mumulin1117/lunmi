#!/bin/sh
set -eu
LUNMI_RESOURCE_ROOT="${TARGET_BUILD_DIR}/${UNLOCALIZED_RESOURCES_FOLDER_PATH}"
mkdir -p "$LUNMI_RESOURCE_ROOT"
/bin/cp "${SRCROOT}/LunmiBrafer/lunimcenter.bundledata" "$LUNMI_RESOURCE_ROOT/lunimcenter.bundledata"
# Clean incremental build products made before encrypted packaging was enabled.
/bin/rm -rf "$LUNMI_RESOURCE_ROOT/Web"
/bin/rm -f "$LUNMI_RESOURCE_ROOT/WebBundleManifest.json"
/bin/rm -rf "$LUNMI_RESOURCE_ROOT/lunimcenter"
# Remove the retired standalone API configuration from incremental products.
/bin/rm -f "$LUNMI_RESOURCE_ROOT/Configuration.plist"
