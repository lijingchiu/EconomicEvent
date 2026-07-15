#!/usr/bin/env bash
set -euo pipefail

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
BUILD_ROOT="${PROJECT_ROOT}/.build/macos"
DIST_DIR="${PROJECT_ROOT}/dist"
APP_NAME="Macro Pulse"
EXECUTABLE_NAME="MacroPulse"
WIDGET_NAME="MacroPulseWidget"
APP_BUNDLE="${BUILD_ROOT}/${APP_NAME}.app"
CONTENTS="${APP_BUNDLE}/Contents"
PLUGINS="${CONTENTS}/PlugIns"
WIDGET_BUNDLE="${PLUGINS}/${WIDGET_NAME}.appex"
WIDGET_CONTENTS="${WIDGET_BUNDLE}/Contents"
DMG_STAGE="${BUILD_ROOT}/dmg"
DMG_PATH="${DIST_DIR}/MacroPulse-macOS-Universal.dmg"
SDK_PATH="$(xcrun --sdk macosx --show-sdk-path)"
BUILD_NUMBER="${GITHUB_RUN_NUMBER:-1}"
APP_VERSION="$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "${PROJECT_ROOT}/macos/MacroPulse/Info.plist")"

rm -rf "${BUILD_ROOT}" "${DIST_DIR}"
mkdir -p   "${CONTENTS}/MacOS"   "${CONTENTS}/Resources"   "${WIDGET_CONTENTS}/MacOS"   "${DIST_DIR}"

xcrun swiftc --version
xcodebuild -version

APP_SOURCES=("${PROJECT_ROOT}/macos/MacroPulse/"*.swift)
for architecture in arm64 x86_64; do
  xcrun swiftc     -O     -target "${architecture}-apple-macos13.0"     -sdk "${SDK_PATH}"     "${APP_SOURCES[@]}"     -framework Cocoa     -framework WebKit     -framework Security     -framework CryptoKit     -o "${BUILD_ROOT}/${EXECUTABLE_NAME}-${architecture}"

  xcrun swiftc     -O     -parse-as-library     -application-extension     -target "${architecture}-apple-macos13.0"     -sdk "${SDK_PATH}"     "${PROJECT_ROOT}/macos/MacroPulseWidget/MacroPulseWidget.swift"     -framework Foundation     -framework SwiftUI     -framework WidgetKit     -o "${BUILD_ROOT}/${WIDGET_NAME}-${architecture}"
done

lipo -create   "${BUILD_ROOT}/${EXECUTABLE_NAME}-arm64"   "${BUILD_ROOT}/${EXECUTABLE_NAME}-x86_64"   -output "${CONTENTS}/MacOS/${EXECUTABLE_NAME}"
chmod 755 "${CONTENTS}/MacOS/${EXECUTABLE_NAME}"

lipo -create   "${BUILD_ROOT}/${WIDGET_NAME}-arm64"   "${BUILD_ROOT}/${WIDGET_NAME}-x86_64"   -output "${WIDGET_CONTENTS}/MacOS/${WIDGET_NAME}"
chmod 755 "${WIDGET_CONTENTS}/MacOS/${WIDGET_NAME}"

cp "${PROJECT_ROOT}/macos/MacroPulse/Info.plist" "${CONTENTS}/Info.plist"
cp "${PROJECT_ROOT}/macos/MacroPulse/liquid-glass.css" "${CONTENTS}/Resources/liquid-glass.css"
cp "${PROJECT_ROOT}/macos/MacroPulseWidget/Info.plist" "${WIDGET_CONTENTS}/Info.plist"

/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "${CONTENTS}/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleVersion ${BUILD_NUMBER}" "${WIDGET_CONTENTS}/Info.plist"
/usr/libexec/PlistBuddy -c "Set :CFBundleShortVersionString ${APP_VERSION}" "${WIDGET_CONTENTS}/Info.plist"
plutil -lint "${CONTENTS}/Info.plist" "${WIDGET_CONTENTS}/Info.plist"

test "$(plutil -extract NSExtension.NSExtensionPointIdentifier raw "${WIDGET_CONTENTS}/Info.plist")" = "com.apple.widgetkit-extension"
test "$(plutil -extract CFBundleURLTypes.0.CFBundleURLSchemes.0 raw "${CONTENTS}/Info.plist")" = "macropulse"

ICONSET="${BUILD_ROOT}/AppIcon.iconset"
xcrun swift "${PROJECT_ROOT}/macos/scripts/generate-icon.swift" "${ICONSET}"
iconutil --convert icns "${ICONSET}" --output "${CONTENTS}/Resources/AppIcon.icns"

codesign   --force   --sign -   --timestamp=none   --entitlements "${PROJECT_ROOT}/macos/MacroPulseWidget/MacroPulseWidget.entitlements"   "${WIDGET_BUNDLE}"
codesign --force --sign - --timestamp=none "${APP_BUNDLE}"
codesign --verify --deep --strict --verbose=2 "${APP_BUNDLE}"

mkdir -p "${DMG_STAGE}"
cp -R "${APP_BUNDLE}" "${DMG_STAGE}/"
ln -s /Applications "${DMG_STAGE}/Applications"

hdiutil create -volname "${APP_NAME}" -srcfolder "${DMG_STAGE}" -ov -format UDZO "${DMG_PATH}"
hdiutil verify "${DMG_PATH}"

(
  cd "${DIST_DIR}"
  shasum -a 256 "$(basename "${DMG_PATH}")" > "$(basename "${DMG_PATH}").sha256"
)

file "${CONTENTS}/MacOS/${EXECUTABLE_NAME}"
file "${WIDGET_CONTENTS}/MacOS/${WIDGET_NAME}"
codesign --display --verbose=2 "${APP_BUNDLE}"
codesign --display --entitlements :- "${WIDGET_BUNDLE}"
find "${PLUGINS}" -maxdepth 4 -type f -print
ls -lh "${DMG_PATH}" "${DMG_PATH}.sha256"
