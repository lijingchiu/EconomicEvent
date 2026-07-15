#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_ROOT="${PROJECT_ROOT}/.build/macos"
DIST_DIR="${PROJECT_ROOT}/dist"
APP_NAME="Macro Pulse"
EXECUTABLE_NAME="MacroPulse"
APP_BUNDLE="${BUILD_ROOT}/${APP_NAME}.app"
CONTENTS="${APP_BUNDLE}/Contents"
DMG_STAGE="${BUILD_ROOT}/dmg"
DMG_PATH="${DIST_DIR}/MacroPulse-macOS-Universal.dmg"
SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"
BUILD_NUMBER="${GITHUB_RUN_NUMBER:-1}"

rm -rf "${BUILD_ROOT}" "${DIST_DIR}"
mkdir -p "${CONTENTS}/MacOS" "${CONTENTS}/Resources" "${DIST_DIR}"

for architecture in arm64 x86_64; do
  xcrun swiftc     -O     -target "${architecture}-apple-macos13.0"     -sdk "${SDK_PATH}"     "${PROJECT_ROOT}/macos/MacroPulse/main.swift"     -framework Cocoa     -framework WebKit     -framework Security     -o "${BUILD_ROOT}/${EXECUTABLE_NAME}-${architecture}"
done

lipo -create   "${BUILD_ROOT}/${EXECUTABLE_NAME}-arm64"   "${BUILD_ROOT}/${EXECUTABLE_NAME}-x86_64"   -output "${CONTENTS}/MacOS/${EXECUTABLE_NAME}"
chmod 755 "${CONTENTS}/MacOS/${EXECUTABLE_NAME}"

cp "${PROJECT_ROOT}/macos/MacroPulse/Info.plist" "${CONTENTS}/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "${CONTENTS}/Info.plist"
plutil -lint "${CONTENTS}/Info.plist"

ICONSET="${BUILD_ROOT}/AppIcon.iconset"
xcrun swift "${PROJECT_ROOT}/macos/scripts/generate-icon.swift" "${ICONSET}"
iconutil --convert icns "${ICONSET}" --output "${CONTENTS}/Resources/AppIcon.icns"

codesign --force --deep --sign - --timestamp=none "${APP_BUNDLE}"
codesign --verify --deep --strict --verbose=2 "${APP_BUNDLE}"

mkdir -p "${DMG_STAGE}"
cp -R "${APP_BUNDLE}" "${DMG_STAGE}/"
ln -s /Applications "${DMG_STAGE}/Applications"

hdiutil create   -volname "${APP_NAME}"   -srcfolder "${DMG_STAGE}"   -ov   -format UDZO   "${DMG_PATH}"

shasum -a 256 "${DMG_PATH}" > "${DMG_PATH}.sha256"
file "${CONTENTS}/MacOS/${EXECUTABLE_NAME}"
ls -lh "${DMG_PATH}" "${DMG_PATH}.sha256"
