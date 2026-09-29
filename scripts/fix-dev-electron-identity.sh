#!/usr/bin/env bash
# yarn install resets Electron's Info.plist to com.github.Electron, which does
# NOT inherit Accessibility / Input Monitoring grants for com.electron.razer-macos.
#
# IMPORTANT: only re-sign when the identity actually changes. Re-signing on every
# yarn dev invalidates macOS TCC trust and causes endless permission prompts.
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/node_modules/electron/dist/Electron.app"
PLIST="$APP/Contents/Info.plist"
WANTED_ID="com.electron.razer-macos"

if [[ ! -f "$PLIST" ]]; then
  echo "Electron not installed at $APP"
  exit 1
fi

CURRENT_ID="$(/usr/libexec/PlistBuddy -c 'Print CFBundleIdentifier' "$PLIST" 2>/dev/null || true)"
if [[ "$CURRENT_ID" == "$WANTED_ID" ]]; then
  echo "Dev Electron identity already $WANTED_ID (skipping re-sign)"
  exit 0
fi

/usr/libexec/PlistBuddy -c "Set :CFBundleIdentifier $WANTED_ID" "$PLIST"
/usr/libexec/PlistBuddy -c 'Set :CFBundleName Razer macOS' "$PLIST" 2>/dev/null || true
codesign -s - --force --deep "$APP" >/dev/null
echo "Dev Electron identity set to $WANTED_ID (re-signed once — re-grant Accessibility if prompted)"
