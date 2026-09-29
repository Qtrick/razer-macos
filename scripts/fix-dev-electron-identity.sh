#!/usr/bin/env bash
# yarn install resets Electron's Info.plist to com.github.Electron, which does
# NOT inherit Accessibility / Input Monitoring grants for com.electron.razer-macos.
# Run this after yarn install (and before yarn dev) so ripple can capture keys.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/node_modules/electron/dist/Electron.app"
PLIST="$APP/Contents/Info.plist"

if [[ ! -f "$PLIST" ]]; then
  echo "Electron not installed at $APP"
  exit 1
fi

/usr/libexec/PlistBuddy -c 'Set :CFBundleIdentifier com.electron.razer-macos' "$PLIST"
/usr/libexec/PlistBuddy -c 'Set :CFBundleName Razer macOS' "$PLIST" 2>/dev/null || true
codesign -s - --force --deep "$APP" >/dev/null
echo "Dev Electron identity set to com.electron.razer-macos"
