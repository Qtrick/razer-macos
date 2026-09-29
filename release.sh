#!/bin/bash

export APPLE_ID=""
export APPLE_ID_PASSWORD=""

yarn clean
rm -rf ./node_modules ./dist

yarn

yarn dist

if [[ -z $APPLE_ID ]]
then
  codesign -s - --deep --force --options runtime \
    --entitlements ./resources/entitlements.mac.plist \
    ./dist/mac-universal/Razer\ macOS.app \
    ./dist/mac-arm64/Razer\ macOS.app \
    ./dist/mac/Razer\ macOS.app 2>/dev/null || true
fi

unset APPLE_ID
unset APPLE_ID_PASSWORD