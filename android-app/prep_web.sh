#!/usr/bin/env bash
# Copies the web game (../site) into www/ and adds the Android glue:
# back button -> pause / close note / back one screen, pause when the app goes to background,
# and a phone-only "How to play" line.
set -euo pipefail
cd "$(dirname "$0")"
rm -rf www && mkdir www
cp -r ../site/. www/
cp android-glue.js www/android-glue.js
sed -i 's#</body>#<script src="android-glue.js"></script>\n</body>#' www/index.html
(cd www && python3 ../phone_howto.py)
grep -q android-glue www/index.html && echo "www/ ready"
