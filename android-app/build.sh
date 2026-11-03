#!/usr/bin/env bash
# Builds the Android APK. Needs Node 18+, JDK 17 and the Android SDK (ANDROID_HOME set).
# Release signing is optional: without android/keystore.properties you get an unsigned release APK.
set -euo pipefail
cd "$(dirname "$0")"
npm ci
./prep_web.sh
npx cap sync android
cd android
[ -f local.properties ] || echo "sdk.dir=${ANDROID_HOME:?set ANDROID_HOME to your Android SDK}" > local.properties
./gradlew --no-daemon assembleRelease
echo "APK: android/app/build/outputs/apk/release/"
